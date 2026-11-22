import express, { type Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import ExcelJS from 'exceljs';
import {
  appendAuditLog,
  generateId,
  generateShortCode,
  mutateDb,
  pushNotification,
  readDb,
  UPLOAD_DIR,
} from './db.ts';
import {
  hashPassword,
  isEnvBootstrapPasscodeConfigured,
  rateLimit,
  requireAuth,
  requireRoles,
  signSessionToken,
  verifyEnvBootstrapPasscode,
  verifyPassword,
  type AuthenticatedRequest,
} from './auth.ts';
import {
  APPLICATION_CATEGORIES,
  type ApplicationCategory,
  type EventSettings,
  type SubmissionSnapshot,
  type UserRole,
} from '../src/types/appthon.ts';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isSafeHttpUrl(url: string | undefined | null): boolean {
  if (!url || !url.trim()) return true; // optional empty handled separately
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeSpreadsheetCell(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function computeRankings(db: ReturnType<typeof readDb>) {
  const approvedTeams = db.teams.filter((t) => {
    const reg = db.registrations.find((r) => r.teamId === t.id);
    return reg?.status === 'Approved';
  });

  const rows = approvedTeams.map((team) => {
    const idea = db.project_ideas.find((i) => i.teamId === team.id);
    const submission = db.project_submissions.find((s) => s.teamId === team.id);
    const submittedScores = db.evaluation_scores.filter(
      (e) => e.teamId === team.id && e.status === 'Submitted'
    );
    const allAssignments = db.judge_assignments.filter((a) => a.teamId === team.id);
    const count = submittedScores.length;

    const avg = (getter: (s: (typeof submittedScores)[number]) => number) =>
      count > 0 ? Number((submittedScores.reduce((acc, s) => acc + getter(s), 0) / count).toFixed(2)) : 0;

    return {
      teamId: team.id,
      teamCode: team.teamCode,
      teamName: team.name,
      category: team.category,
      applicationName: submission?.applicationName || idea?.title || 'Untitled Project',
      assignedJudges: allAssignments.length,
      completedEvaluations: count,
      averageTotal: avg((s) => s.totalScore),
      avgInnovation: avg((s) => s.innovationScore),
      avgProblemSolving: avg((s) => s.problemSolvingScore),
      avgFunctionalApp: avg((s) => s.functionalAppScore),
      avgUiUx: avg((s) => s.uiuxScore),
      avgTechnical: avg((s) => s.technicalScore),
      avgPresentation: avg((s) => s.presentationScore),
      feedbackList: submittedScores.map((s) => s.overallFeedback).filter(Boolean),
      submittedAt: submission?.submittedAt || null,
    };
  });

  rows.sort((a, b) => {
    if (b.averageTotal !== a.averageTotal) return b.averageTotal - a.averageTotal;
    if (b.avgFunctionalApp !== a.avgFunctionalApp) return b.avgFunctionalApp - a.avgFunctionalApp;
    if (b.avgProblemSolving !== a.avgProblemSolving) return b.avgProblemSolving - a.avgProblemSolving;
    if (b.avgInnovation !== a.avgInnovation) return b.avgInnovation - a.avgInnovation;
    if (b.avgTechnical !== a.avgTechnical) return b.avgTechnical - a.avgTechnical;
    if (a.submittedAt && b.submittedAt) return a.submittedAt.localeCompare(b.submittedAt);
    return a.teamName.localeCompare(b.teamName);
  });

  return rows.map((row, idx) => ({
    ...row,
    rank: row.completedEvaluations > 0 ? idx + 1 : null,
  }));
}

const uploadStorage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB hard cap
  },
});

export function createApiRouter() {
  const router = express.Router();
  const authRateLimiter = rateLimit(30, 60 * 1000);

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'appthon-api' });
  });

  // ─── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────

  router.get('/public/settings', (_req, res) => {
    const db = readDb();
    const announcements = db.announcements
      .filter((a) => a.isPublished)
      .slice(0, 20);
    const rankings = db.event_settings.resultsPublished ? computeRankings(db) : [];
    res.json({
      settings: db.event_settings,
      announcements,
      publishedResults: rankings,
    });
  });

  router.get('/public/certificates/:code', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const db = readDb();
    const cert = db.certificates.find((c) => c.certificateCode.toUpperCase() === code);
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found.' });
    }
    return res.json({
      certificate: {
        certificateCode: cert.certificateCode,
        recipientName: cert.recipientName,
        teamName: cert.teamName,
        title: cert.title,
        rankLabel: cert.rankLabel,
        issuedAt: cert.issuedAt,
        isRevoked: cert.isRevoked,
      },
    });
  });

  // ─── AUTH & ADMIN BOOTSTRAP ────────────────────────────────────────────────

  router.get('/auth/admin-bootstrap-status', (_req, res) => {
    const db = readDb();
    const superAdminExists = db.users.some((u) => u.role === 'Super Admin');
    res.json({
      superAdminExists,
      envPasscodeRequired: isEnvBootstrapPasscodeConfigured(),
    });
  });

  router.post('/auth/claim-admin', authRateLimiter, async (req, res) => {
    const { email, fullName, password, passcode } = req.body as {
      email?: string;
      fullName?: string;
      password?: string;
      passcode?: string;
    };

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || 'APPTHON Super Admin').trim();

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const db = readDb();
    const superAdminExists = db.users.some((u) => u.role === 'Super Admin');
    const envConfigured = isEnvBootstrapPasscodeConfigured();

    if (envConfigured) {
      if (!passcode || !verifyEnvBootstrapPasscode(passcode)) {
        return res.status(403).json({ error: 'Invalid organizer bootstrap passcode.' });
      }
    } else if (superAdminExists) {
      return res.status(403).json({
        error: 'Super Admin access has already been claimed. Please sign in normally.',
      });
    }

    const result = await mutateDb((state) => {
      const existing = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
      const now = new Date().toISOString();
      if (existing) {
        existing.role = 'Super Admin';
        existing.passwordHash = hashPassword(password);
        existing.emailVerified = true;
        existing.isActive = true;
        existing.updatedAt = now;
        appendAuditLog(state, {
          actorUserId: existing.id,
          actorEmail: existing.email,
          actorRole: 'Super Admin',
          action: 'ADMIN_BOOTSTRAP_CLAIM',
          targetType: 'user',
          targetId: existing.id,
          details: 'Super Admin access claimed/updated via bootstrap flow.',
        });
        return existing;
      }

      const newUser = {
        id: generateId(),
        email: cleanEmail,
        passwordHash: hashPassword(password),
        role: 'Super Admin' as UserRole,
        emailVerified: true,
        verificationCode: null,
        verificationExpiresAt: null,
        resetCode: null,
        resetExpiresAt: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      state.users.push(newUser);
      state.participants.push({
        id: generateId(),
        userId: newUser.id,
        fullName: cleanName,
        email: cleanEmail,
        mobileNumber: 'Organizer',
        college: 'Skill AI',
        courseDepartment: 'Administration',
        academicYear: 'Staff',
        studentId: '',
        createdAt: now,
        updatedAt: now,
      });
      appendAuditLog(state, {
        actorUserId: newUser.id,
        actorEmail: newUser.email,
        actorRole: 'Super Admin',
        action: 'ADMIN_BOOTSTRAP_CLAIM',
        targetType: 'user',
        targetId: newUser.id,
        details: 'Initial Super Admin account claimed.',
      });
      return newUser;
    });

    const token = signSessionToken(result);
    return res.status(201).json({
      token,
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
        emailVerified: result.emailVerified,
        isActive: result.isActive,
        fullName: cleanName,
      },
    });
  });

  router.post('/auth/register', authRateLimiter, async (req, res) => {
    const {
      fullName,
      email,
      mobileNumber,
      college,
      courseDepartment,
      academicYear,
      studentId,
      password,
    } = req.body as Record<string, string | undefined>;

    const cleanName = (fullName || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanMobile = (mobileNumber || '').trim();
    const cleanCollege = (college || '').trim();
    const cleanCourse = (courseDepartment || '').trim();
    const cleanYear = (academicYear || '').trim();
    const cleanStudentId = (studentId || '').trim();

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!/^[+\d][\d\s-]{7,18}$/.test(cleanMobile)) {
      return res.status(400).json({ error: 'Valid mobile number is required.' });
    }
    if (!cleanCollege) {
      return res.status(400).json({ error: 'College / institution is required.' });
    }
    if (!cleanCourse) {
      return res.status(400).json({ error: 'Course / department is required.' });
    }
    if (!cleanYear) {
      return res.status(400).json({ error: 'Academic year is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const currentDb = readDb();
    if (currentDb.event_settings.studentIdRequired && !cleanStudentId) {
      return res.status(400).json({ error: 'Student ID is required by organizer policy.' });
    }
    if (currentDb.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({
        error: 'An account with this email address already exists. Please log in instead.',
      });
    }
    if (
      currentDb.participants.some(
        (p) => p.mobileNumber.replace(/\D/g, '') === cleanMobile.replace(/\D/g, '')
      )
    ) {
      return res.status(409).json({
        error: 'Duplicate registration detected: this mobile number is already linked to an account.',
      });
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const user = await mutateDb((db) => {
      const now = new Date().toISOString();
      const newUser = {
        id: generateId(),
        email: cleanEmail,
        passwordHash: hashPassword(password),
        role: 'Student' as UserRole,
        emailVerified: false,
        verificationCode,
        verificationExpiresAt: expiresAt,
        resetCode: null,
        resetExpiresAt: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      db.users.push(newUser);
      db.participants.push({
        id: generateId(),
        userId: newUser.id,
        fullName: cleanName,
        email: cleanEmail,
        mobileNumber: cleanMobile,
        college: cleanCollege,
        courseDepartment: cleanCourse,
        academicYear: cleanYear,
        studentId: cleanStudentId,
        createdAt: now,
        updatedAt: now,
      });

      // Check for any pending team invitations for this email and notify student
      const pendingInvites = db.team_invitations.filter(
        (inv) => inv.invitedEmail.toLowerCase() === cleanEmail && inv.status === 'pending'
      );
      for (const inv of pendingInvites) {
        const team = db.teams.find((t) => t.id === inv.teamId);
        pushNotification(db, {
          userId: newUser.id,
          title: 'Team Invitation Received',
          message: `You have been invited to join team "${team?.name || 'APPTHON Team'}". Verify your email and open My Team to respond.`,
          type: 'invitation',
          link: '/dashboard?tab=team',
        });
      }

      appendAuditLog(db, {
        actorUserId: newUser.id,
        actorEmail: newUser.email,
        actorRole: 'Student',
        action: 'STUDENT_REGISTERED',
        targetType: 'user',
        targetId: newUser.id,
        details: `Student registered from ${cleanCollege}.`,
      });
      return newUser;
    });

    const token = signSessionToken(user);
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        fullName: cleanName,
      },
      // Provided in-app when SMTP relay is not configured so students can verify cleanly
      verificationCodeHint: verificationCode,
    });
  });

  router.post('/auth/verify-email', authRateLimiter, async (req, res) => {
    const { email, code } = req.body as { email?: string; code?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();
    if (!isValidEmail(cleanEmail) || !cleanCode) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const updated = await mutateDb((db) => {
      const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) return { ok: false as const, error: 'Account not found.' };
      if (user.emailVerified) return { ok: true as const, user };
      if (!user.verificationCode || user.verificationCode !== cleanCode) {
        return { ok: false as const, error: 'Invalid verification code.' };
      }
      if (
        user.verificationExpiresAt &&
        new Date(user.verificationExpiresAt).getTime() < Date.now()
      ) {
        return { ok: false as const, error: 'Verification code has expired. Please request a new one.' };
      }
      user.emailVerified = true;
      user.verificationCode = null;
      user.verificationExpiresAt = null;
      user.updatedAt = new Date().toISOString();
      appendAuditLog(db, {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'EMAIL_VERIFIED',
        targetType: 'user',
        targetId: user.id,
        details: 'Email verification completed.',
      });
      return { ok: true as const, user };
    });

    if (!updated.ok) {
      return res.status(400).json({ error: updated.error });
    }
    const participant = readDb().participants.find((p) => p.userId === updated.user.id);
    const token = signSessionToken(updated.user);
    return res.json({
      token,
      user: {
        id: updated.user.id,
        email: updated.user.email,
        role: updated.user.role,
        emailVerified: updated.user.emailVerified,
        isActive: updated.user.isActive,
        fullName: participant?.fullName || updated.user.email,
      },
    });
  });

  router.post('/auth/resend-verification', authRateLimiter, async (req, res) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const resState = await mutateDb((db) => {
      const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) return null;
      if (user.emailVerified) return 'already_verified' as const;
      user.verificationCode = code;
      user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      user.updatedAt = new Date().toISOString();
      return code;
    });

    if (!resState) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    if (resState === 'already_verified') {
      return res.json({ message: 'Email is already verified.' });
    }
    return res.json({
      message: 'A fresh verification code has been generated.',
      verificationCodeHint: resState,
    });
  });

  router.post('/auth/login', authRateLimiter, (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail) || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been deactivated by an administrator.' });
    }

    const participant = db.participants.find((p) => p.userId === user.id);
    const judge = db.judges.find((j) => j.userId === user.id);
    const token = signSessionToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        fullName: participant?.fullName || judge?.fullName || user.email,
      },
    });
  });

  router.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    return res.json({ ok: true });
  });

  router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const db = readDb();
    const participant = db.participants.find((p) => p.userId === user.id);
    const judge = db.judges.find((j) => j.userId === user.id);
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        fullName: participant?.fullName || judge?.fullName || user.email,
      },
      participant: participant || null,
      judge: judge || null,
    });
  });

  router.post('/auth/forgot-password', authRateLimiter, async (req, res) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const found = await mutateDb((db) => {
      const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) return false;
      user.resetCode = resetCode;
      user.resetExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      user.updatedAt = new Date().toISOString();
      return true;
    });
    return res.json({
      message: 'If an account matches that email, a password recovery code has been issued.',
      resetCodeHint: found ? resetCode : undefined,
    });
  });

  router.post('/auth/reset-password', authRateLimiter, async (req, res) => {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();
    if (!isValidEmail(cleanEmail) || !cleanCode) {
      return res.status(400).json({ error: 'Email and recovery code are required.' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const result = await mutateDb((db) => {
      const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user || !user.resetCode || user.resetCode !== cleanCode) {
        return { ok: false as const, error: 'Invalid recovery code.' };
      }
      if (user.resetExpiresAt && new Date(user.resetExpiresAt).getTime() < Date.now()) {
        return { ok: false as const, error: 'Recovery code has expired.' };
      }
      user.passwordHash = hashPassword(newPassword);
      user.resetCode = null;
      user.resetExpiresAt = null;
      user.updatedAt = new Date().toISOString();
      appendAuditLog(db, {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'PASSWORD_RESET',
        targetType: 'user',
        targetId: user.id,
        details: 'Password updated via recovery flow.',
      });
      return { ok: true as const };
    });

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    return res.json({ message: 'Password updated successfully. You may now log in.' });
  });

  router.post('/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Valid current and new password (min 8 chars) required.' });
    }
    const userId = req.authUser!.id;
    const result = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === userId);
      if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
        return { ok: false as const, error: 'Current password is incorrect.' };
      }
      user.passwordHash = hashPassword(newPassword);
      user.updatedAt = new Date().toISOString();
      return { ok: true as const };
    });
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    return res.json({ message: 'Password changed successfully.' });
  });

  // ─── STUDENT DASHBOARD, TEAM, IDEA & SUBMISSION ROUTES ─────────────────────

  router.get('/student/overview', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const db = readDb();
    const participant = db.participants.find((p) => p.userId === user.id) || null;
    const membership = db.team_members.find((m) => m.userId === user.id);
    const team = membership ? db.teams.find((t) => t.id === membership.teamId) || null : null;
    const registration = team
      ? db.registrations.find((r) => r.teamId === team.id) || null
      : null;
    const members = team
      ? db.team_members
          .filter((m) => m.teamId === team.id)
          .map((m) => {
            const p = db.participants.find((part) => part.userId === m.userId);
            const u = db.users.find((usr) => usr.id === m.userId);
            return {
              ...m,
              fullName: p?.fullName || u?.email || 'Participant',
              email: u?.email || '',
              mobileNumber: p?.mobileNumber || '',
              college: p?.college || '',
              courseDepartment: p?.courseDepartment || '',
              academicYear: p?.academicYear || '',
              studentId: p?.studentId || '',
              emailVerified: u?.emailVerified || false,
            };
          })
      : [];
    const invitations = team
      ? db.team_invitations.filter((inv) => inv.teamId === team.id)
      : [];
    const incomingInvitations = db.team_invitations
      .filter(
        (inv) =>
          inv.invitedEmail.toLowerCase() === user.email.toLowerCase() &&
          inv.status === 'pending'
      )
      .map((inv) => {
        const invTeam = db.teams.find((t) => t.id === inv.teamId);
        const leader = invTeam
          ? db.participants.find((p) => p.userId === invTeam.leaderUserId)
          : null;
        return {
          ...inv,
          teamName: invTeam?.name || 'Team',
          category: invTeam?.category || '',
          leaderName: leader?.fullName || 'Team Leader',
        };
      });
    const idea = team ? db.project_ideas.find((i) => i.teamId === team.id) || null : null;
    const submission = team
      ? db.project_submissions.find((s) => s.teamId === team.id) || null
      : null;
    const submissionVersions = submission
      ? db.submission_versions.filter((v) => v.submissionId === submission.id)
      : [];
    const uploadedFiles = team
      ? db.uploaded_files.filter((f) => f.teamId === team.id)
      : [];
    const notifications = db.notifications.filter((n) => n.userId === user.id);
    const announcements = db.announcements.filter((a) => a.isPublished);
    const certificates = db.certificates.filter(
      (c) => c.participantUserId === user.id && !c.isRevoked
    );

    let publishedTeamResult: ReturnType<typeof computeRankings>[number] | null = null;
    let allPublishedResults: ReturnType<typeof computeRankings> = [];
    if (db.event_settings.resultsPublished) {
      allPublishedResults = computeRankings(db);
      if (team) {
        publishedTeamResult = allPublishedResults.find((r) => r.teamId === team.id) || null;
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      participant,
      team,
      registration,
      members,
      invitations,
      incomingInvitations,
      idea,
      submission,
      submissionVersions,
      uploadedFiles,
      notifications,
      announcements,
      certificates,
      publishedTeamResult,
      allPublishedResults,
      eventSettings: db.event_settings,
    });
  });

  router.put('/student/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const { fullName, mobileNumber, college, courseDepartment, academicYear, studentId } =
      req.body as Record<string, string | undefined>;

    const cleanName = (fullName || '').trim();
    const cleanMobile = (mobileNumber || '').trim();
    const cleanCollege = (college || '').trim();
    const cleanCourse = (courseDepartment || '').trim();
    const cleanYear = (academicYear || '').trim();
    const cleanStudentId = (studentId || '').trim();

    if (!cleanName || !cleanMobile || !cleanCollege || !cleanCourse || !cleanYear) {
      return res.status(400).json({ error: 'All required profile fields must be completed.' });
    }

    const db = readDb();
    if (db.event_settings.studentIdRequired && !cleanStudentId) {
      return res.status(400).json({ error: 'Student ID is required by organizer settings.' });
    }

    const duplicateMobile = db.participants.some(
      (p) =>
        p.userId !== user.id &&
        p.mobileNumber.replace(/\D/g, '') === cleanMobile.replace(/\D/g, '')
    );
    if (duplicateMobile) {
      return res.status(409).json({ error: 'This mobile number is already registered to another participant.' });
    }

    const updated = await mutateDb((state) => {
      const now = new Date().toISOString();
      let participant = state.participants.find((p) => p.userId === user.id);
      if (!participant) {
        participant = {
          id: generateId(),
          userId: user.id,
          fullName: cleanName,
          email: user.email,
          mobileNumber: cleanMobile,
          college: cleanCollege,
          courseDepartment: cleanCourse,
          academicYear: cleanYear,
          studentId: cleanStudentId,
          createdAt: now,
          updatedAt: now,
        };
        state.participants.push(participant);
      } else {
        participant.fullName = cleanName;
        participant.mobileNumber = cleanMobile;
        participant.college = cleanCollege;
        participant.courseDepartment = cleanCourse;
        participant.academicYear = cleanYear;
        participant.studentId = cleanStudentId;
        participant.updatedAt = now;
      }
      return participant;
    });

    return res.json({ participant: updated });
  });

  router.post('/student/teams', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email address before creating a team.',
      });
    }

    const { name, category, initialIdea } = req.body as {
      name?: string;
      category?: ApplicationCategory;
      initialIdea?: string;
    };
    const cleanName = (name || '').trim();
    const cleanIdea = (initialIdea || '').trim();

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Team name must be at least 2 characters.' });
    }
    if (!category || !APPLICATION_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Please select a valid application category.' });
    }
    if (!cleanIdea || cleanIdea.length < 15) {
      return res.status(400).json({ error: 'Please enter a concise initial project idea (at least 15 characters).' });
    }

    const db = readDb();
    const existingMembership = db.team_members.find((m) => {
      if (m.userId !== user.id) return false;
      const t = db.teams.find((team) => team.id === m.teamId);
      const reg = db.registrations.find((r) => r.teamId === m.teamId);
      return t && reg?.status !== 'Rejected';
    });
    if (existingMembership) {
      return res.status(409).json({
        error: 'You already belong to an active team. Participants may only join one active team.',
      });
    }
    if (db.teams.some((t) => t.name.toLowerCase() === cleanName.toLowerCase())) {
      return res.status(409).json({ error: 'A team with this name already exists.' });
    }

    const created = await mutateDb((state) => {
      const now = new Date().toISOString();
      const teamId = generateId();
      const teamCode = generateShortCode(
        'TEAM',
        state.teams.map((t) => t.teamCode)
      );
      const registrationCode = generateShortCode(
        'APP',
        state.registrations.map((r) => r.registrationCode)
      );

      const team = {
        id: teamId,
        teamCode,
        name: cleanName,
        leaderUserId: user.id,
        category,
        initialIdea: cleanIdea,
        status: 'Draft' as const,
        changeRequestPending: false,
        changeRequestNote: '',
        createdAt: now,
        updatedAt: now,
      };
      state.teams.push(team);
      state.team_members.push({
        id: generateId(),
        teamId,
        userId: user.id,
        roleInTeam: 'leader',
        joinedAt: now,
      });
      const registration = {
        id: generateId(),
        registrationCode,
        teamId,
        status: 'Draft' as const,
        consentAccepted: false,
        adminNotes: '',
        reviewedByUserId: null,
        reviewedAt: null,
        submittedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      state.registrations.push(registration);
      state.project_ideas.push({
        id: generateId(),
        teamId,
        title: `${cleanName} Project`,
        problemStatement: cleanIdea,
        proposedSolution: '',
        category,
        description: cleanIdea,
        status: 'Draft',
        shortlisted: false,
        adminFeedback: '',
        reviewedByUserId: null,
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      appendAuditLog(state, {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'TEAM_CREATED',
        targetType: 'team',
        targetId: teamId,
        details: `Created team "${cleanName}" (${registrationCode}).`,
      });
      return { team, registration };
    });

    return res.status(201).json(created);
  });

  router.post('/student/teams/invite', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const { invitedEmail } = req.body as { invitedEmail?: string };
    const cleanEmail = (invitedEmail || '').trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Valid member email address is required.' });
    }
    if (cleanEmail === user.email.toLowerCase()) {
      return res.status(400).json({ error: 'You are already the team leader.' });
    }

    const db = readDb();
    const team = db.teams.find((t) => t.leaderUserId === user.id);
    if (!team) {
      return res.status(403).json({ error: 'Only a designated team leader can send invitations.' });
    }
    const reg = db.registrations.find((r) => r.teamId === team.id);
    if (reg?.status === 'Approved') {
      return res.status(403).json({
        error: 'Approved teams cannot modify members without organizer authorization.',
      });
    }

    const currentMembers = db.team_members.filter((m) => m.teamId === team.id);
    const pendingInvites = db.team_invitations.filter(
      (i) => i.teamId === team.id && i.status === 'pending'
    );
    if (currentMembers.length + pendingInvites.length >= 5) {
      return res.status(400).json({
        error: 'Team limit reached: maximum 5 members (including pending invitations).',
      });
    }
    if (pendingInvites.some((i) => i.invitedEmail.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ error: 'An active invitation has already been sent to this email.' });
    }

    const existingUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      const inActiveTeam = db.team_members.some((m) => {
        if (m.userId !== existingUser.id) return false;
        const r = db.registrations.find((regItem) => regItem.teamId === m.teamId);
        return r?.status !== 'Rejected';
      });
      if (inActiveTeam) {
        return res.status(409).json({
          error: 'This participant already belongs to an active APPTHON team.',
        });
      }
    }

    const invite = await mutateDb((state) => {
      const now = new Date().toISOString();
      const inv = {
        id: generateId(),
        teamId: team.id,
        invitedEmail: cleanEmail,
        invitedByUserId: user.id,
        token: crypto.randomBytes(16).toString('hex'),
        status: 'pending' as const,
        createdAt: now,
        respondedAt: null,
      };
      state.team_invitations.push(inv);
      if (existingUser) {
        pushNotification(state, {
          userId: existingUser.id,
          title: 'Team Invitation Received',
          message: `You were invited to join team "${team.name}". Accept or decline in My Team.`,
          type: 'invitation',
          link: '/dashboard?tab=team',
        });
      }
      appendAuditLog(state, {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'TEAM_INVITE_SENT',
        targetType: 'team_invitation',
        targetId: inv.id,
        details: `Invited ${cleanEmail} to team "${team.name}".`,
      });
      return inv;
    });

    return res.status(201).json({ invitation: invite });
  });

  router.delete('/student/invitations/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const inviteId = String(req.params.id);
    const result = await mutateDb((db) => {
      const inv = db.team_invitations.find((i) => i.id === inviteId);
      if (!inv) return { ok: false as const, code: 404, error: 'Invitation not found.' };
      const team = db.teams.find((t) => t.id === inv.teamId);
      if (!team || team.leaderUserId !== user.id) {
        return { ok: false as const, code: 403, error: 'Only the team leader can revoke invitations.' };
      }
      const reg = db.registrations.find((r) => r.teamId === team.id);
      if (reg?.status === 'Approved') {
        return { ok: false as const, code: 403, error: 'Cannot alter approved team invitations.' };
      }
      inv.status = 'revoked';
      inv.respondedAt = new Date().toISOString();
      return { ok: true as const };
    });
    if (!result.ok) return res.status(result.code).json({ error: result.error });
    return res.json({ ok: true });
  });

  router.post(
    '/student/invitations/:token/respond',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const user = req.authUser!;
      const token = String(req.params.token);
      const { action } = req.body as { action?: 'accept' | 'decline' };
      if (action !== 'accept' && action !== 'decline') {
        return res.status(400).json({ error: 'Action must be accept or decline.' });
      }
      if (action === 'accept' && !user.emailVerified) {
        return res.status(403).json({
          error: 'Please verify your email address before accepting a team invitation.',
        });
      }

      const result = await mutateDb((db) => {
        const inv = db.team_invitations.find((i) => i.token === token && i.status === 'pending');
        if (!inv) {
          return { ok: false as const, code: 404, error: 'Invitation not found or already handled.' };
        }
        if (inv.invitedEmail.toLowerCase() !== user.email.toLowerCase()) {
          return { ok: false as const, code: 403, error: 'This invitation was sent to another email address.' };
        }
        const team = db.teams.find((t) => t.id === inv.teamId);
        if (!team) {
          return { ok: false as const, code: 404, error: 'Team no longer exists.' };
        }
        const reg = db.registrations.find((r) => r.teamId === team.id);
        if (reg?.status === 'Approved') {
          return {
            ok: false as const,
            code: 403,
            error: 'This team registration is already approved; changes require organizer authorization.',
          };
        }

        const now = new Date().toISOString();
        if (action === 'decline') {
          inv.status = 'declined';
          inv.respondedAt = now;
          pushNotification(db, {
            userId: team.leaderUserId,
            title: 'Invitation Declined',
            message: `${user.email} declined the invitation to join "${team.name}".`,
            type: 'invitation',
            link: '/dashboard?tab=team',
          });
          return { ok: true as const, status: 'declined' };
        }

        const alreadyInActiveTeam = db.team_members.some((m) => {
          if (m.userId !== user.id) return false;
          const r = db.registrations.find((regItem) => regItem.teamId === m.teamId);
          return r?.status !== 'Rejected';
        });
        if (alreadyInActiveTeam) {
          return {
            ok: false as const,
            code: 409,
            error: 'You already belong to an active APPTHON team.',
          };
        }
        const memberCount = db.team_members.filter((m) => m.teamId === team.id).length;
        if (memberCount >= 5) {
          return { ok: false as const, code: 400, error: 'This team already has 5 members.' };
        }

        const participant = db.participants.find((p) => p.userId === user.id);
        if (
          !participant ||
          !participant.fullName ||
          !participant.mobileNumber ||
          !participant.college ||
          !participant.courseDepartment ||
          !participant.academicYear
        ) {
          return {
            ok: false as const,
            code: 400,
            error: 'Please complete all required fields in My Profile before joining a team.',
          };
        }

        inv.status = 'accepted';
        inv.respondedAt = now;
        stateAddMember(db, team.id, user.id, now);

        pushNotification(db, {
          userId: team.leaderUserId,
          title: 'Team Member Joined',
          message: `${participant.fullName} accepted your invitation and joined "${team.name}".`,
          type: 'invitation',
          link: '/dashboard?tab=team',
        });
        appendAuditLog(db, {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'TEAM_INVITE_ACCEPTED',
          targetType: 'team',
          targetId: team.id,
          details: `${user.email} joined team "${team.name}".`,
        });

        return { ok: true as const, status: 'accepted' };
      });

      if (!result.ok) return res.status(result.code).json({ error: result.error });
      return res.json(result);
    }
  );

  router.post(
    '/student/teams/submit-registration',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const user = req.authUser!;
      const { consentAccepted } = req.body as { consentAccepted?: boolean };
      if (!consentAccepted) {
        return res.status(400).json({
          error: 'You must accept the Terms and Conditions and Privacy Policy to submit registration.',
        });
      }

      const result = await mutateDb((db) => {
        const team = db.teams.find((t) => t.leaderUserId === user.id);
        if (!team) {
          return { ok: false as const, code: 403, error: 'Only the team leader can submit registration.' };
        }
        const reg = db.registrations.find((r) => r.teamId === team.id);
        if (!reg) {
          return { ok: false as const, code: 404, error: 'Registration record not found.' };
        }
        if (reg.status === 'Approved') {
          return { ok: false as const, code: 400, error: 'Registration is already approved.' };
        }

        const members = db.team_members.filter((m) => m.teamId === team.id);
        if (members.length < 2 || members.length > 5) {
          return {
            ok: false as const,
            code: 400,
            error: `Teams must have between 2 and 5 accepted members (currently ${members.length}).`,
          };
        }

        for (const m of members) {
          const u = db.users.find((usr) => usr.id === m.userId);
          const p = db.participants.find((part) => part.userId === m.userId);
          if (!u?.emailVerified) {
            return {
              ok: false as const,
              code: 400,
              error: `Member ${u?.email || ''} has not completed email verification yet.`,
            };
          }
          if (
            !p ||
            !p.fullName ||
            !p.mobileNumber ||
            !p.college ||
            !p.courseDepartment ||
            !p.academicYear ||
            (db.event_settings.studentIdRequired && !p.studentId)
          ) {
            return {
              ok: false as const,
              code: 400,
              error: `Member ${p?.fullName || u.email} must complete their profile before registration submission.`,
            };
          }
        }

        const now = new Date().toISOString();
        reg.consentAccepted = true;
        reg.status = 'Pending Approval';
        reg.submittedAt = now;
        reg.updatedAt = now;
        team.status = 'Pending Approval';
        team.updatedAt = now;

        for (const m of members) {
          pushNotification(db, {
            userId: m.userId,
            title: 'Registration Submitted',
            message: `Team "${team.name}" (${reg.registrationCode}) has been submitted for organizer eligibility review.`,
            type: 'registration',
            link: '/dashboard',
          });
        }
        appendAuditLog(db, {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'REGISTRATION_SUBMITTED',
          targetType: 'registration',
          targetId: reg.id,
          details: `Team "${team.name}" (${reg.registrationCode}) submitted with ${members.length} members.`,
        });
        return { ok: true as const, registration: reg };
      });

      if (!result.ok) return res.status(result.code).json({ error: result.error });
      return res.json(result);
    }
  );

  router.post(
    '/student/teams/request-change',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const user = req.authUser!;
      const { note } = req.body as { note?: string };
      const cleanNote = (note || '').trim();
      if (!cleanNote || cleanNote.length < 10) {
        return res.status(400).json({ error: 'Please explain the requested team change (at least 10 characters).' });
      }
      const result = await mutateDb((db) => {
        const team = db.teams.find((t) => t.leaderUserId === user.id);
        if (!team) return { ok: false as const, code: 403, error: 'Only the team leader can request changes.' };
        team.changeRequestPending = true;
        team.changeRequestNote = cleanNote;
        team.updatedAt = new Date().toISOString();
        appendAuditLog(db, {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'TEAM_CHANGE_REQUESTED',
          targetType: 'team',
          targetId: team.id,
          details: cleanNote,
        });
        return { ok: true as const, team };
      });
      if (!result.ok) return res.status(result.code).json({ error: result.error });
      return res.json(result);
    }
  );

  router.put('/student/idea', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const { title, problemStatement, proposedSolution, category, description, submit } =
      req.body as {
        title?: string;
        problemStatement?: string;
        proposedSolution?: string;
        category?: ApplicationCategory;
        description?: string;
        submit?: boolean;
      };

    const cleanTitle = (title || '').trim();
    const cleanProblem = (problemStatement || '').trim();
    const cleanSolution = (proposedSolution || '').trim();
    const cleanDesc = (description || '').trim();

    if (!cleanTitle) {
      return res.status(400).json({ error: 'Project title is required.' });
    }
    if (category && !APPLICATION_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid application category.' });
    }
    if (submit && (!cleanProblem || !cleanSolution || !cleanDesc)) {
      return res.status(400).json({
        error: 'Problem statement, proposed solution, and description are required to submit your idea.',
      });
    }

    const result = await mutateDb((db) => {
      const membership = db.team_members.find((m) => m.userId === user.id);
      if (!membership) return { ok: false as const, code: 404, error: 'Join or create a team first.' };
      const team = db.teams.find((t) => t.id === membership.teamId);
      if (!team) return { ok: false as const, code: 404, error: 'Team not found.' };

      const now = new Date().toISOString();
      let idea = db.project_ideas.find((i) => i.teamId === team.id);
      if (!idea) {
        idea = {
          id: generateId(),
          teamId: team.id,
          title: cleanTitle,
          problemStatement: cleanProblem,
          proposedSolution: cleanSolution,
          category: category || team.category,
          description: cleanDesc,
          status: submit ? 'Submitted' : 'Draft',
          shortlisted: false,
          adminFeedback: '',
          reviewedByUserId: null,
          reviewedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        db.project_ideas.push(idea);
      } else {
        if (idea.status === 'Approved' && submit) {
          return {
            ok: false as const,
            code: 403,
            error: 'Approved project ideas are locked unless revision is requested.',
          };
        }
        idea.title = cleanTitle;
        idea.problemStatement = cleanProblem;
        idea.proposedSolution = cleanSolution;
        if (category) idea.category = category;
        idea.description = cleanDesc;
        if (submit) idea.status = 'Submitted';
        idea.updatedAt = now;
      }

      if (submit) {
        appendAuditLog(db, {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'IDEA_SUBMITTED',
          targetType: 'project_idea',
          targetId: idea.id,
          details: `Submitted idea "${idea.title}" for team "${team.name}".`,
        });
      }
      return { ok: true as const, idea };
    });

    if (!result.ok) return res.status(result.code).json({ error: result.error });
    return res.json(result);
  });

  router.post(
    '/student/upload',
    requireAuth,
    uploadMiddleware.single('file'),
    async (req: AuthenticatedRequest, res) => {
      const user = req.authUser!;
      const category: 'screenshot' | 'demo_video' =
        req.body?.category === 'demo_video' ? 'demo_video' : 'screenshot';
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const allowedImages = ['image/png', 'image/jpeg', 'image/webp'];
      const allowedVideos = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (category === 'screenshot') {
        if (!allowedImages.includes(file.mimetype)) {
          return res.status(400).json({ error: 'Screenshots must be PNG, JPEG, or WebP images.' });
        }
        if (file.size > 5 * 1024 * 1024) {
          return res.status(400).json({ error: 'Screenshot exceeds 5 MB size limit.' });
        }
      } else {
        if (!allowedVideos.includes(file.mimetype)) {
          return res.status(400).json({ error: 'Demo videos must be MP4, WebM, or QuickTime (.mov).' });
        }
        if (file.size > 50 * 1024 * 1024) {
          return res.status(400).json({ error: 'Demo video exceeds 50 MB size limit.' });
        }
      }

      const db = readDb();
      const membership = db.team_members.find((m) => m.userId === user.id);
      if (!membership) {
        return res.status(403).json({ error: 'You must belong to a team to upload submission files.' });
      }
      const reg = db.registrations.find((r) => r.teamId === membership.teamId);
      if (reg?.status !== 'Approved') {
        return res.status(403).json({
          error: 'Files can be uploaded once your team registration is Approved.',
        });
      }

      const extMap: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/quicktime': '.mov',
      };
      const ext = extMap[file.mimetype] || '';
      const storedFilename = `${crypto.randomUUID()}${ext}`;
      const targetPath = path.resolve(UPLOAD_DIR, storedFilename);
      if (!targetPath.startsWith(UPLOAD_DIR + path.sep)) {
        return res.status(400).json({ error: 'Invalid upload path.' });
      }
      fs.writeFileSync(targetPath, file.buffer);

      const record = await mutateDb((state) => {
        const rec = {
          id: generateId(),
          storedFilename,
          originalName: path.basename(file.originalname || storedFilename),
          mimeType: file.mimetype,
          sizeBytes: file.size,
          category,
          teamId: membership.teamId,
          uploadedByUserId: user.id,
          createdAt: new Date().toISOString(),
        };
        state.uploaded_files.push(rec);
        return rec;
      });

      return res.status(201).json({ file: record });
    }
  );

  router.get('/files/:fileId', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const fileId = String(req.params.fileId);
    const db = readDb();
    const file = db.uploaded_files.find((f) => f.id === fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const isTeamMember = db.team_members.some(
      (m) => m.teamId === file.teamId && m.userId === user.id
    );
    const isStaff = ['Super Admin', 'Event Manager', 'Registration Manager', 'Read-only Staff'].includes(
      user.role
    );
    const isAssignedJudge =
      user.role === 'Judge' &&
      db.judge_assignments.some(
        (a) => a.judgeUserId === user.id && a.teamId === file.teamId
      );

    if (!isTeamMember && !isStaff && !isAssignedJudge) {
      return res.status(403).json({ error: 'Access denied to this private submission file.' });
    }

    const filePath = path.resolve(UPLOAD_DIR, file.storedFilename);
    if (!filePath.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File binary unavailable.' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath);
  });

  router.put('/student/submission', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const payload = req.body as Partial<SubmissionSnapshot> & { submitFinal?: boolean };
    const submitFinal = Boolean(payload.submitFinal);

    const snapshot: SubmissionSnapshot = {
      applicationName: (payload.applicationName || '').trim(),
      problemStatement: (payload.problemStatement || '').trim(),
      proposedSolution: (payload.proposedSolution || '').trim(),
      description: (payload.description || '').trim(),
      liveUrl: (payload.liveUrl || '').trim(),
      sourceCodeUrl: (payload.sourceCodeUrl || '').trim(),
      demoVideoUrl: (payload.demoVideoUrl || '').trim(),
      demoVideoFileId: payload.demoVideoFileId || null,
      screenshotFileIds: Array.isArray(payload.screenshotFileIds)
        ? payload.screenshotFileIds.slice(0, 8)
        : [],
      techStack: (payload.techStack || '').trim(),
      teamContributions: (payload.teamContributions || '').trim(),
    };

    if (!isSafeHttpUrl(snapshot.liveUrl) || !isSafeHttpUrl(snapshot.sourceCodeUrl) || !isSafeHttpUrl(snapshot.demoVideoUrl)) {
      return res.status(400).json({ error: 'URLs must use valid http:// or https:// addresses.' });
    }

    if (submitFinal) {
      if (
        !snapshot.applicationName ||
        !snapshot.problemStatement ||
        !snapshot.proposedSolution ||
        !snapshot.description ||
        !snapshot.liveUrl ||
        !snapshot.sourceCodeUrl ||
        !snapshot.techStack ||
        !snapshot.teamContributions
      ) {
        return res.status(400).json({
          error: 'All required application submission fields must be completed before final submission.',
        });
      }
      if (!snapshot.demoVideoFileId && !snapshot.demoVideoUrl) {
        return res.status(400).json({ error: 'Please upload a demo video or provide a valid demo video URL.' });
      }
      if (snapshot.screenshotFileIds.length === 0) {
        return res.status(400).json({ error: 'Please upload at least one application screenshot.' });
      }
    }

    const db = readDb();
    const membership = db.team_members.find((m) => m.userId === user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Create or join a team before submitting an application.' });
    }
    const reg = db.registrations.find((r) => r.teamId === membership.teamId);
    if (reg?.status !== 'Approved') {
      return res.status(403).json({
        error: 'Project submissions open once your team registration is Approved.',
      });
    }

    const result = await mutateDb((state) => {
      const existing = state.project_submissions.find((s) => s.teamId === membership.teamId);
      const deadlineIso = state.event_settings.submissionDeadlineIso;
      const deadlinePassed =
        deadlineIso && !Number.isNaN(Date.parse(deadlineIso)) && Date.now() > Date.parse(deadlineIso);

      if (deadlinePassed && !existing?.reopenedByAdmin) {
        return {
          ok: false as const,
          code: 403,
          error: 'The submission deadline has passed. Submissions are locked unless reopened by an administrator.',
        };
      }

      const participant = state.participants.find((p) => p.userId === user.id);
      const actorName = participant?.fullName || user.email;
      const now = new Date().toISOString();

      let submission = existing;
      if (!submission) {
        submission = {
          id: generateId(),
          teamId: membership.teamId,
          ...snapshot,
          status: submitFinal ? 'Submitted' : 'Draft',
          currentVersion: 1,
          submittedByUserId: submitFinal ? user.id : null,
          submittedAt: submitFinal ? now : null,
          reopenedByAdmin: false,
          createdAt: now,
          updatedAt: now,
        };
        state.project_submissions.push(submission);
      } else {
        submission.applicationName = snapshot.applicationName;
        submission.problemStatement = snapshot.problemStatement;
        submission.proposedSolution = snapshot.proposedSolution;
        submission.description = snapshot.description;
        submission.liveUrl = snapshot.liveUrl;
        submission.sourceCodeUrl = snapshot.sourceCodeUrl;
        submission.demoVideoUrl = snapshot.demoVideoUrl;
        submission.demoVideoFileId = snapshot.demoVideoFileId;
        submission.screenshotFileIds = snapshot.screenshotFileIds;
        submission.techStack = snapshot.techStack;
        submission.teamContributions = snapshot.teamContributions;
        submission.currentVersion += 1;
        submission.status = submitFinal ? 'Submitted' : 'Draft';
        if (submitFinal) {
          submission.submittedByUserId = user.id;
          submission.submittedAt = now;
          submission.reopenedByAdmin = false;
        }
        submission.updatedAt = now;
      }

      const version = {
        id: generateId(),
        submissionId: submission.id,
        teamId: membership.teamId,
        versionNumber: submission.currentVersion,
        snapshot,
        submittedByUserId: user.id,
        submittedByName: actorName,
        actionType: submitFinal ? ('final_submitted' as const) : ('draft_saved' as const),
        createdAt: now,
      };
      state.submission_versions.unshift(version);

      const team = state.teams.find((t) => t.id === membership.teamId);
      if (submitFinal && team) {
        const members = state.team_members.filter((m) => m.teamId === team.id);
        for (const m of members) {
          pushNotification(state, {
            userId: m.userId,
            title: 'Final Application Submitted',
            message: `${actorName} submitted v${submission.currentVersion} of "${submission.applicationName}".`,
            type: 'submission',
            link: '/dashboard?tab=submissions',
          });
        }
      }
      appendAuditLog(state, {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: submitFinal ? 'SUBMISSION_FINALIZED' : 'SUBMISSION_DRAFT_SAVED',
        targetType: 'project_submission',
        targetId: submission.id,
        details: `Version ${submission.currentVersion} saved by ${actorName}.`,
      });

      return { ok: true as const, submission, version };
    });

    if (!result.ok) return res.status(result.code).json({ error: result.error });
    return res.json(result);
  });

  router.post(
    '/student/notifications/read',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const user = req.authUser!;
      const { id } = req.body as { id?: string };
      await mutateDb((db) => {
        for (const n of db.notifications) {
          if (n.userId === user.id && (!id || n.id === id)) {
            n.isRead = true;
          }
        }
      });
      return res.json({ ok: true });
    }
  );

  // ─── JUDGE PORTAL ROUTES ───────────────────────────────────────────────────

  router.get(
    '/judge/assignments',
    requireAuth,
    requireRoles('Judge'),
    (req: AuthenticatedRequest, res) => {
      const judgeId = req.authUser!.id;
      const db = readDb();
      const assignments = db.judge_assignments
        .filter((a) => a.judgeUserId === judgeId)
        .map((a) => {
          const team = db.teams.find((t) => t.id === a.teamId);
          const submission = db.project_submissions.find((s) => s.teamId === a.teamId);
          const idea = db.project_ideas.find((i) => i.teamId === a.teamId);
          const myScore = db.evaluation_scores.find(
            (e) => e.assignmentId === a.id && e.judgeUserId === judgeId
          );
          return {
            ...a,
            teamName: team?.name || 'Team',
            teamCode: team?.teamCode || '',
            category: team?.category || '',
            applicationName: submission?.applicationName || idea?.title || 'Untitled Project',
            hasSubmission: Boolean(submission && submission.status !== 'Draft'),
            scoreStatus: myScore?.status || 'Pending',
            totalScore: myScore?.totalScore ?? null,
          };
        });

      res.json({ assignments });
    }
  );

  router.get(
    '/judge/assignments/:id',
    requireAuth,
    requireRoles('Judge'),
    (req: AuthenticatedRequest, res) => {
      const judgeId = req.authUser!.id;
      const assignmentId = String(req.params.id);
      const db = readDb();
      const assignment = db.judge_assignments.find((a) => a.id === assignmentId);
      if (!assignment || assignment.judgeUserId !== judgeId) {
        return res.status(403).json({ error: 'Access denied: project is not assigned to you.' });
      }
      const team = db.teams.find((t) => t.id === assignment.teamId) || null;
      const idea = db.project_ideas.find((i) => i.teamId === assignment.teamId) || null;
      const submission = db.project_submissions.find((s) => s.teamId === assignment.teamId) || null;
      const files = db.uploaded_files.filter((f) => f.teamId === assignment.teamId);
      const myScore =
        db.evaluation_scores.find(
          (e) => e.assignmentId === assignment.id && e.judgeUserId === judgeId
        ) || null;

      return res.json({
        assignment,
        team,
        idea,
        submission,
        files,
        evaluation: myScore,
      });
    }
  );

  router.put(
    '/judge/assignments/:id/score',
    requireAuth,
    requireRoles('Judge'),
    async (req: AuthenticatedRequest, res) => {
      const judgeId = req.authUser!.id;
      const assignmentId = String(req.params.id);
      const {
        innovationScore,
        problemSolvingScore,
        functionalAppScore,
        uiuxScore,
        technicalScore,
        presentationScore,
        criterionComments,
        overallFeedback,
        submitFinal,
      } = req.body as {
        innovationScore?: number;
        problemSolvingScore?: number;
        functionalAppScore?: number;
        uiuxScore?: number;
        technicalScore?: number;
        presentationScore?: number;
        criterionComments?: Record<string, string>;
        overallFeedback?: string;
        submitFinal?: boolean;
      };

      const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : Number(v || 0));
      const inn = num(innovationScore);
      const prob = num(problemSolvingScore);
      const func = num(functionalAppScore);
      const uiux = num(uiuxScore);
      const tech = num(technicalScore);
      const pres = num(presentationScore);

      if (
        inn < 0 || inn > 20 ||
        prob < 0 || prob > 20 ||
        func < 0 || func > 20 ||
        uiux < 0 || uiux > 15 ||
        tech < 0 || tech > 15 ||
        pres < 0 || pres > 10
      ) {
        return res.status(400).json({ error: 'Scores must be within each criterion maximum limit.' });
      }
      const totalScore = Number((inn + prob + func + uiux + tech + pres).toFixed(2));
      if (submitFinal && !(overallFeedback || '').trim()) {
        return res.status(400).json({ error: 'Overall feedback is required for final evaluation.' });
      }

      const result = await mutateDb((db) => {
        const assignment = db.judge_assignments.find((a) => a.id === assignmentId);
        if (!assignment || assignment.judgeUserId !== judgeId) {
          return { ok: false as const, code: 403, error: 'Not authorized for this project assignment.' };
        }
        const existing = db.evaluation_scores.find(
          (e) => e.assignmentId === assignment.id && e.judgeUserId === judgeId
        );
        if (existing?.status === 'Submitted') {
          return {
            ok: false as const,
            code: 403,
            error: 'Final evaluation is locked. Contact an administrator to reopen it.',
          };
        }

        const now = new Date().toISOString();
        let score = existing;
        if (!score) {
          score = {
            id: generateId(),
            assignmentId: assignment.id,
            judgeUserId: judgeId,
            teamId: assignment.teamId,
            innovationScore: inn,
            problemSolvingScore: prob,
            functionalAppScore: func,
            uiuxScore: uiux,
            technicalScore: tech,
            presentationScore: pres,
            totalScore,
            criterionComments: criterionComments || {},
            overallFeedback: (overallFeedback || '').trim(),
            status: submitFinal ? 'Submitted' : 'Draft',
            submittedAt: submitFinal ? now : null,
            createdAt: now,
            updatedAt: now,
          };
          db.evaluation_scores.push(score);
        } else {
          score.innovationScore = inn;
          score.problemSolvingScore = prob;
          score.functionalAppScore = func;
          score.uiuxScore = uiux;
          score.technicalScore = tech;
          score.presentationScore = pres;
          score.totalScore = totalScore;
          score.criterionComments = criterionComments || {};
          score.overallFeedback = (overallFeedback || '').trim();
          score.status = submitFinal ? 'Submitted' : 'Draft';
          score.submittedAt = submitFinal ? now : null;
          score.updatedAt = now;
        }

        assignment.status = submitFinal ? 'completed' : 'in_progress';
        assignment.updatedAt = now;

        appendAuditLog(db, {
          actorUserId: judgeId,
          actorEmail: req.authUser!.email,
          actorRole: 'Judge',
          action: submitFinal ? 'EVALUATION_SUBMITTED' : 'EVALUATION_DRAFT_SAVED',
          targetType: 'evaluation_score',
          targetId: score.id,
          details: `Score ${totalScore}/100 for team ${assignment.teamId}.`,
        });

        return { ok: true as const, evaluation: score };
      });

      if (!result.ok) return res.status(result.code).json({ error: result.error });
      return res.json(result);
    }
  );

  // ─── ADMIN PORTAL ROUTES ───────────────────────────────────────────────────

  const staffReadRoles: UserRole[] = [
    'Super Admin',
    'Event Manager',
    'Registration Manager',
    'Read-only Staff',
  ];

  router.get('/admin/overview', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    const totalParticipants = db.users.filter((u) => u.role === 'Student').length;
    const totalTeams = db.teams.length;
    const totalRegistrations = db.registrations.length;
    const approvedRegistrations = db.registrations.filter((r) => r.status === 'Approved').length;
    const ideasSubmitted = db.project_ideas.filter((i) => i.status !== 'Draft').length;
    const finalSubmissions = db.project_submissions.filter((s) => s.status === 'Submitted' || s.status === 'Locked').length;
    const totalAssignments = db.judge_assignments.length;
    const completedEvaluations = db.judge_assignments.filter((a) => a.status === 'completed').length;

    res.json({
      metrics: {
        totalParticipants,
        totalTeams,
        totalRegistrations,
        approvedRegistrations,
        ideasSubmitted,
        finalSubmissions,
        totalAssignments,
        completedEvaluations,
        evaluationProgressPct:
          totalAssignments > 0 ? Math.round((completedEvaluations / totalAssignments) * 100) : 0,
      },
      settings: db.event_settings,
    });
  });

  router.get('/admin/participants', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    const list = db.users
      .filter((u) => u.role === 'Student')
      .map((u) => {
        const p = db.participants.find((part) => part.userId === u.id);
        const mem = db.team_members.find((m) => m.userId === u.id);
        const team = mem ? db.teams.find((t) => t.id === mem.teamId) : null;
        return {
          userId: u.id,
          email: u.email,
          emailVerified: u.emailVerified,
          isActive: u.isActive,
          createdAt: u.createdAt,
          fullName: p?.fullName || '',
          mobileNumber: p?.mobileNumber || '',
          college: p?.college || '',
          courseDepartment: p?.courseDepartment || '',
          academicYear: p?.academicYear || '',
          studentId: p?.studentId || '',
          teamName: team?.name || null,
          roleInTeam: mem?.roleInTeam || null,
        };
      });
    res.json({ participants: list });
  });

  router.get('/admin/registrations', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    const list = db.registrations.map((reg) => {
      const team = db.teams.find((t) => t.id === reg.teamId);
      const members = db.team_members
        .filter((m) => m.teamId === reg.teamId)
        .map((m) => {
          const p = db.participants.find((part) => part.userId === m.userId);
          const u = db.users.find((usr) => usr.id === m.userId);
          return {
            userId: m.userId,
            roleInTeam: m.roleInTeam,
            fullName: p?.fullName || u?.email || '',
            email: u?.email || '',
            college: p?.college || '',
            mobileNumber: p?.mobileNumber || '',
            emailVerified: u?.emailVerified || false,
          };
        });
      return {
        ...reg,
        teamName: team?.name || '',
        teamCode: team?.teamCode || '',
        category: team?.category || '',
        initialIdea: team?.initialIdea || '',
        members,
      };
    });
    res.json({ registrations: list });
  });

  router.post(
    '/admin/registrations/:id/review',
    requireAuth,
    requireRoles('Super Admin', 'Registration Manager', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const regId = String(req.params.id);
      const { decision, adminNotes } = req.body as {
        decision?: 'Approved' | 'Correction Requested' | 'Rejected';
        adminNotes?: string;
      };
      if (!decision || !['Approved', 'Correction Requested', 'Rejected'].includes(decision)) {
        return res.status(400).json({ error: 'Invalid review decision.' });
      }

      const result = await mutateDb((db) => {
        const reg = db.registrations.find((r) => r.id === regId);
        if (!reg) return { ok: false as const, error: 'Registration not found.' };
        const team = db.teams.find((t) => t.id === reg.teamId);
        const now = new Date().toISOString();
        reg.status = decision;
        reg.adminNotes = (adminNotes || '').trim();
        reg.reviewedByUserId = req.authUser!.id;
        reg.reviewedAt = now;
        reg.updatedAt = now;
        if (team) {
          team.status = decision;
          team.updatedAt = now;
          const members = db.team_members.filter((m) => m.teamId === team.id);
          for (const m of members) {
            pushNotification(db, {
              userId: m.userId,
              title: `Registration ${decision}`,
              message: `Team "${team.name}" (${reg.registrationCode}) status is now ${decision}.${
                reg.adminNotes ? ` Note: ${reg.adminNotes}` : ''
              }`,
              type: 'registration',
              link: '/dashboard',
            });
          }
        }
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: `REGISTRATION_${decision.toUpperCase().replace(/\s+/g, '_')}`,
          targetType: 'registration',
          targetId: reg.id,
          details: reg.adminNotes || `Registration ${reg.registrationCode} marked ${decision}.`,
        });
        return { ok: true as const, registration: reg };
      });

      if (!result.ok) return res.status(404).json({ error: result.error });
      return res.json(result);
    }
  );

  router.get('/admin/teams', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    const list = db.teams.map((team) => {
      const reg = db.registrations.find((r) => r.teamId === team.id);
      const members = db.team_members
        .filter((m) => m.teamId === team.id)
        .map((m) => {
          const p = db.participants.find((part) => part.userId === m.userId);
          const u = db.users.find((usr) => usr.id === m.userId);
          return {
            ...m,
            fullName: p?.fullName || u?.email || '',
            email: u?.email || '',
            college: p?.college || '',
          };
        });
      const invitations = db.team_invitations.filter((i) => i.teamId === team.id);
      return {
        ...team,
        registrationCode: reg?.registrationCode || '',
        registrationStatus: reg?.status || team.status,
        members,
        invitations,
      };
    });
    res.json({ teams: list });
  });

  router.post(
    '/admin/teams/:id/authorize-change',
    requireAuth,
    requireRoles('Super Admin', 'Registration Manager', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const teamId = String(req.params.id);
      const { authorize } = req.body as { authorize?: boolean };
      const result = await mutateDb((db) => {
        const team = db.teams.find((t) => t.id === teamId);
        if (!team) return { ok: false as const, error: 'Team not found.' };
        const reg = db.registrations.find((r) => r.teamId === team.id);
        const now = new Date().toISOString();
        team.changeRequestPending = false;
        if (authorize && reg) {
          reg.status = 'Correction Requested';
          reg.adminNotes = 'Organizer authorized team membership modification.';
          reg.updatedAt = now;
          team.status = 'Correction Requested';
        }
        team.updatedAt = now;
        pushNotification(db, {
          userId: team.leaderUserId,
          title: authorize ? 'Team Change Authorized' : 'Team Change Request Closed',
          message: authorize
            ? `Organizer unlocked team "${team.name}" for authorized updates. Please resubmit once updated.`
            : `Your change request for team "${team.name}" was reviewed and closed.`,
          type: 'team',
          link: '/dashboard?tab=team',
        });
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: authorize ? 'TEAM_CHANGE_AUTHORIZED' : 'TEAM_CHANGE_DENIED',
          targetType: 'team',
          targetId: team.id,
          details: `Team "${team.name}" change request ${authorize ? 'approved' : 'declined'}.`,
        });
        return { ok: true as const, team };
      });
      if (!result.ok) return res.status(404).json({ error: result.error });
      return res.json(result);
    }
  );

  router.get('/admin/ideas', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    const list = db.project_ideas.map((idea) => {
      const team = db.teams.find((t) => t.id === idea.teamId);
      return {
        ...idea,
        teamName: team?.name || '',
        teamCode: team?.teamCode || '',
      };
    });
    res.json({ ideas: list });
  });

  router.post(
    '/admin/ideas/:id/review',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const ideaId = String(req.params.id);
      const { status, shortlisted, adminFeedback } = req.body as {
        status?: 'Under Review' | 'Approved' | 'Revision Requested' | 'Rejected';
        shortlisted?: boolean;
        adminFeedback?: string;
      };
      const result = await mutateDb((db) => {
        const idea = db.project_ideas.find((i) => i.id === ideaId);
        if (!idea) return { ok: false as const, error: 'Project idea not found.' };
        const now = new Date().toISOString();
        if (status) idea.status = status;
        if (typeof shortlisted === 'boolean') idea.shortlisted = shortlisted;
        if (adminFeedback !== undefined) idea.adminFeedback = adminFeedback.trim();
        idea.reviewedByUserId = req.authUser!.id;
        idea.reviewedAt = now;
        idea.updatedAt = now;
        const members = db.team_members.filter((m) => m.teamId === idea.teamId);
        for (const m of members) {
          pushNotification(db, {
            userId: m.userId,
            title: `Project Idea ${idea.status}`,
            message: `Your project idea "${idea.title}" was updated to ${idea.status}${
              idea.shortlisted ? ' (Shortlisted)' : ''
            }.`,
            type: 'idea',
            link: '/dashboard?tab=idea',
          });
        }
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'IDEA_REVIEWED',
          targetType: 'project_idea',
          targetId: idea.id,
          details: `Idea "${idea.title}" -> ${idea.status}, shortlisted=${idea.shortlisted}.`,
        });
        return { ok: true as const, idea };
      });
      if (!result.ok) return res.status(404).json({ error: result.error });
      return res.json(result);
    }
  );

  router.get('/admin/submissions', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    const list = db.project_submissions.map((sub) => {
      const team = db.teams.find((t) => t.id === sub.teamId);
      const versions = db.submission_versions.filter((v) => v.submissionId === sub.id);
      const files = db.uploaded_files.filter((f) => f.teamId === sub.teamId);
      return {
        ...sub,
        teamName: team?.name || '',
        teamCode: team?.teamCode || '',
        category: team?.category || '',
        versions,
        files,
      };
    });
    res.json({ submissions: list });
  });

  router.post(
    '/admin/submissions/:id/reopen',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const subId = String(req.params.id);
      const result = await mutateDb((db) => {
        const sub = db.project_submissions.find((s) => s.id === subId);
        if (!sub) return { ok: false as const, error: 'Submission not found.' };
        const now = new Date().toISOString();
        sub.status = 'Reopened';
        sub.reopenedByAdmin = true;
        sub.updatedAt = now;
        const members = db.team_members.filter((m) => m.teamId === sub.teamId);
        for (const m of members) {
          pushNotification(db, {
            userId: m.userId,
            title: 'Submission Reopened',
            message: `An organizer reopened "${sub.applicationName}" for updates.`,
            type: 'submission',
            link: '/dashboard?tab=submissions',
          });
        }
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'SUBMISSION_REOPENED',
          targetType: 'project_submission',
          targetId: sub.id,
          details: `Submission "${sub.applicationName}" reopened by administrator.`,
        });
        return { ok: true as const, submission: sub };
      });
      if (!result.ok) return res.status(404).json({ error: result.error });
      return res.json(result);
    }
  );

  router.get('/admin/judges', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    const judges = db.judges.map((j) => {
      const assignments = db.judge_assignments.filter((a) => a.judgeUserId === j.userId);
      const completed = assignments.filter((a) => a.status === 'completed').length;
      return {
        ...j,
        assignedCount: assignments.length,
        completedCount: completed,
      };
    });
    const staff = db.users
      .filter((u) => ['Super Admin', 'Event Manager', 'Registration Manager', 'Read-only Staff'].includes(u.role))
      .map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      }));
    res.json({ judges, staff });
  });

  router.post(
    '/admin/judges',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const { fullName, email, password, affiliation, expertise } = req.body as {
        fullName?: string;
        email?: string;
        password?: string;
        affiliation?: string;
        expertise?: string;
      };
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (fullName || '').trim();
      if (!cleanName || !isValidEmail(cleanEmail) || !password || password.length < 8) {
        return res.status(400).json({ error: 'Name, valid email, and password (min 8 chars) are required.' });
      }
      const db = readDb();
      if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const judge = await mutateDb((state) => {
        const now = new Date().toISOString();
        const userId = generateId();
        state.users.push({
          id: userId,
          email: cleanEmail,
          passwordHash: hashPassword(password),
          role: 'Judge',
          emailVerified: true,
          verificationCode: null,
          verificationExpiresAt: null,
          resetCode: null,
          resetExpiresAt: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        const profile = {
          id: generateId(),
          userId,
          fullName: cleanName,
          email: cleanEmail,
          affiliation: (affiliation || '').trim(),
          expertise: (expertise || '').trim(),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
        state.judges.push(profile);
        appendAuditLog(state, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'JUDGE_CREATED',
          targetType: 'judge',
          targetId: userId,
          details: `Created judge account for ${cleanName} (${cleanEmail}).`,
        });
        return profile;
      });
      return res.status(201).json({ judge });
    }
  );

  router.post(
    '/admin/staff',
    requireAuth,
    requireRoles('Super Admin'),
    async (req: AuthenticatedRequest, res) => {
      const { email, password, role, fullName } = req.body as {
        email?: string;
        password?: string;
        role?: UserRole;
        fullName?: string;
      };
      const allowedRoles: UserRole[] = [
        'Super Admin',
        'Event Manager',
        'Registration Manager',
        'Read-only Staff',
      ];
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!isValidEmail(cleanEmail) || !password || password.length < 8 || !role || !allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Valid email, password (8+ chars), and staff role are required.' });
      }
      if (readDb().users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return res.status(409).json({ error: 'Email already exists.' });
      }

      const staffUser = await mutateDb((state) => {
        const now = new Date().toISOString();
        const user = {
          id: generateId(),
          email: cleanEmail,
          passwordHash: hashPassword(password),
          role,
          emailVerified: true,
          verificationCode: null,
          verificationExpiresAt: null,
          resetCode: null,
          resetExpiresAt: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
        state.users.push(user);
        state.participants.push({
          id: generateId(),
          userId: user.id,
          fullName: (fullName || cleanEmail).trim(),
          email: cleanEmail,
          mobileNumber: 'Staff',
          college: 'Skill AI',
          courseDepartment: role,
          academicYear: 'Staff',
          studentId: '',
          createdAt: now,
          updatedAt: now,
        });
        appendAuditLog(state, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'STAFF_CREATED',
          targetType: 'user',
          targetId: user.id,
          details: `Created ${role} account for ${cleanEmail}.`,
        });
        return { id: user.id, email: user.email, role: user.role, isActive: user.isActive };
      });

      return res.status(201).json({ staff: staffUser });
    }
  );

  router.get('/admin/assignments', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    const assignments = db.judge_assignments.map((a) => {
      const judge = db.judges.find((j) => j.userId === a.judgeUserId);
      const team = db.teams.find((t) => t.id === a.teamId);
      const sub = db.project_submissions.find((s) => s.teamId === a.teamId);
      const score = db.evaluation_scores.find((e) => e.assignmentId === a.id);
      return {
        ...a,
        judgeName: judge?.fullName || '',
        judgeEmail: judge?.email || '',
        teamName: team?.name || '',
        teamCode: team?.teamCode || '',
        applicationName: sub?.applicationName || team?.name || '',
        scoreStatus: score?.status || 'Pending',
        totalScore: score?.totalScore ?? null,
        evaluationId: score?.id || null,
      };
    });
    res.json({ assignments });
  });

  router.post(
    '/admin/assignments',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const { judgeUserId, teamId } = req.body as { judgeUserId?: string; teamId?: string };
      if (!judgeUserId || !teamId) {
        return res.status(400).json({ error: 'Judge and team are required.' });
      }
      const db = readDb();
      const judge = db.judges.find((j) => j.userId === judgeUserId);
      const team = db.teams.find((t) => t.id === teamId);
      if (!judge || !team) {
        return res.status(404).json({ error: 'Judge or team not found.' });
      }
      if (
        db.judge_assignments.some(
          (a) => a.judgeUserId === judgeUserId && a.teamId === teamId
        )
      ) {
        return res.status(409).json({ error: 'This judge is already assigned to this project.' });
      }

      const assignment = await mutateDb((state) => {
        const now = new Date().toISOString();
        const item = {
          id: generateId(),
          judgeUserId,
          teamId,
          assignedByUserId: req.authUser!.id,
          status: 'assigned' as const,
          assignedAt: now,
          updatedAt: now,
        };
        state.judge_assignments.push(item);
        pushNotification(state, {
          userId: judgeUserId,
          title: 'Project Assigned for Evaluation',
          message: `You have been assigned to evaluate team "${team.name}".`,
          type: 'evaluation',
          link: '/judge',
        });
        appendAuditLog(state, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'JUDGE_ASSIGNED',
          targetType: 'judge_assignment',
          targetId: item.id,
          details: `Assigned ${judge.fullName} to "${team.name}".`,
        });
        return item;
      });

      return res.status(201).json({ assignment });
    }
  );

  router.delete(
    '/admin/assignments/:id',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const id = String(req.params.id);
      const ok = await mutateDb((db) => {
        const idx = db.judge_assignments.findIndex((a) => a.id === id);
        if (idx === -1) return false;
        db.judge_assignments.splice(idx, 1);
        db.evaluation_scores = db.evaluation_scores.filter((e) => e.assignmentId !== id);
        return true;
      });
      if (!ok) return res.status(404).json({ error: 'Assignment not found.' });
      return res.json({ ok: true });
    }
  );

  router.post(
    '/admin/evaluations/:id/reopen',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const evalId = String(req.params.id);
      const result = await mutateDb((db) => {
        const score = db.evaluation_scores.find((e) => e.id === evalId);
        if (!score) return false;
        score.status = 'Reopened';
        score.updatedAt = new Date().toISOString();
        const assignment = db.judge_assignments.find((a) => a.id === score.assignmentId);
        if (assignment) assignment.status = 'in_progress';
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'EVALUATION_REOPENED',
          targetType: 'evaluation_score',
          targetId: score.id,
          details: `Evaluation reopened for judge ${score.judgeUserId}.`,
        });
        return true;
      });
      if (!result) return res.status(404).json({ error: 'Evaluation not found.' });
      return res.json({ ok: true });
    }
  );

  router.get('/admin/results', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    const rankings = computeRankings(db);
    res.json({
      rankings,
      resultsApproved: db.event_settings.resultsApproved,
      resultsPublished: db.event_settings.resultsPublished,
      resultsPublishedAt: db.event_settings.resultsPublishedAt,
      tieBreakRules: db.event_settings.tieBreakRules,
    });
  });

  router.post(
    '/admin/results/approve',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      await mutateDb((db) => {
        db.event_settings.resultsApproved = true;
        db.event_settings.resultsApprovedByUserId = req.authUser!.id;
        db.event_settings.updatedAt = new Date().toISOString();
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'RESULTS_APPROVED',
          targetType: 'event_settings',
          targetId: 'default',
          details: 'Competition results approved for publication.',
        });
      });
      return res.json({ ok: true });
    }
  );

  router.post(
    '/admin/results/publish',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const { publish } = req.body as { publish?: boolean };
      const shouldPublish = publish !== false;
      const result = await mutateDb((db) => {
        if (shouldPublish && !db.event_settings.resultsApproved) {
          return { ok: false as const, error: 'Results must be approved before publishing.' };
        }
        const now = new Date().toISOString();
        db.event_settings.resultsPublished = shouldPublish;
        db.event_settings.resultsPublishedAt = shouldPublish ? now : null;
        db.event_settings.updatedAt = now;
        if (shouldPublish) {
          for (const u of db.users.filter((usr) => usr.role === 'Student')) {
            pushNotification(db, {
              userId: u.id,
              title: 'Official Results Published',
              message: 'APPTHON evaluation results have been published. View Results in your dashboard.',
              type: 'results',
              link: '/dashboard?tab=results',
            });
          }
        }
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: shouldPublish ? 'RESULTS_PUBLISHED' : 'RESULTS_UNPUBLISHED',
          targetType: 'event_settings',
          targetId: 'default',
          details: shouldPublish ? 'Results published to portal.' : 'Results unpublished.',
        });
        return { ok: true as const };
      });
      if (!result.ok) return res.status(400).json({ error: result.error });
      return res.json({ ok: true });
    }
  );

  router.get('/admin/certificates', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    res.json({ certificates: db.certificates });
  });

  router.post(
    '/admin/certificates/issue',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const { teamId, title, rankLabel } = req.body as {
        teamId?: string;
        title?: string;
        rankLabel?: string;
      };
      if (!teamId || !title?.trim()) {
        return res.status(400).json({ error: 'Team and certificate title are required.' });
      }
      const result = await mutateDb((db) => {
        const team = db.teams.find((t) => t.id === teamId);
        if (!team) return { ok: false as const, error: 'Team not found.' };
        const members = db.team_members.filter((m) => m.teamId === team.id);
        const now = new Date().toISOString();
        const issued = members.map((m) => {
          const p = db.participants.find((part) => part.userId === m.userId);
          const u = db.users.find((usr) => usr.id === m.userId);
          const recipientName = p?.fullName || u?.email || 'Participant';
          const code = generateShortCode(
            'CERT-APPTHON',
            db.certificates.map((c) => c.certificateCode)
          );
          const cert = {
            id: generateId(),
            certificateCode: code,
            participantUserId: m.userId,
            teamId: team.id,
            recipientName,
            teamName: team.name,
            title: title.trim(),
            rankLabel: (rankLabel || 'Participant').trim(),
            issuedByUserId: req.authUser!.id,
            issuedAt: now,
            isRevoked: false,
          };
          db.certificates.unshift(cert);
          pushNotification(db, {
            userId: m.userId,
            title: 'Certificate Issued',
            message: `Your certificate "${cert.title}" (${cert.certificateCode}) is ready for download.`,
            type: 'certificate',
            link: '/dashboard?tab=certificates',
          });
          return cert;
        });

        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'CERTIFICATES_ISSUED',
          targetType: 'team',
          targetId: team.id,
          details: `Issued ${issued.length} certificates ("${title.trim()}") for "${team.name}".`,
        });
        return { ok: true as const, certificates: issued };
      });
      if (!result.ok) return res.status(404).json({ error: result.error });
      return res.status(201).json(result);
    }
  );

  router.post(
    '/admin/certificates/:id/revoke',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const certId = String(req.params.id);
      const ok = await mutateDb((db) => {
        const cert = db.certificates.find((c) => c.id === certId);
        if (!cert) return false;
        cert.isRevoked = !cert.isRevoked;
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: cert.isRevoked ? 'CERTIFICATE_REVOKED' : 'CERTIFICATE_RESTORED',
          targetType: 'certificate',
          targetId: cert.id,
          details: `${cert.certificateCode} (${cert.recipientName})`,
        });
        return true;
      });
      if (!ok) return res.status(404).json({ error: 'Certificate not found.' });
      return res.json({ ok: true });
    }
  );

  router.get('/admin/announcements', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    res.json({ announcements: db.announcements });
  });

  router.post(
    '/admin/announcements',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const { title, body, category } = req.body as {
        title?: string;
        body?: string;
        category?:
          | 'Event Notice'
          | 'Registration Update'
          | 'Deadline Change'
          | 'Competition Announcement'
          | 'Results Announcement';
      };
      if (!title?.trim() || !body?.trim()) {
        return res.status(400).json({ error: 'Announcement title and body are required.' });
      }
      const created = await mutateDb((db) => {
        const now = new Date().toISOString();
        const ann = {
          id: generateId(),
          title: title.trim(),
          body: body.trim(),
          category: category || 'Competition Announcement',
          publishedByUserId: req.authUser!.id,
          isPublished: true,
          createdAt: now,
          updatedAt: now,
        };
        db.announcements.unshift(ann);
        for (const u of db.users.filter((usr) => usr.role === 'Student')) {
          pushNotification(db, {
            userId: u.id,
            title: ann.title,
            message: `${ann.category}: ${ann.body.slice(0, 120)}`,
            type: 'announcement',
            link: '/dashboard?tab=announcements',
          });
        }
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'ANNOUNCEMENT_PUBLISHED',
          targetType: 'announcement',
          targetId: ann.id,
          details: ann.title,
        });
        return ann;
      });
      return res.status(201).json({ announcement: created });
    }
  );

  router.put(
    '/admin/settings',
    requireAuth,
    requireRoles('Super Admin', 'Event Manager'),
    async (req: AuthenticatedRequest, res) => {
      const updates = req.body as Partial<EventSettings>;
      const saved = await mutateDb((db) => {
        const s = db.event_settings;
        if (updates.eventStartDate !== undefined) s.eventStartDate = String(updates.eventStartDate);
        if (updates.registrationDeadline !== undefined)
          s.registrationDeadline = String(updates.registrationDeadline);
        if (updates.submissionDeadline !== undefined)
          s.submissionDeadline = String(updates.submissionDeadline);
        if (updates.submissionDeadlineIso !== undefined)
          s.submissionDeadlineIso = updates.submissionDeadlineIso || null;
        if (updates.finalPresentationDate !== undefined)
          s.finalPresentationDate = String(updates.finalPresentationDate);
        if (updates.venueName !== undefined) s.venueName = String(updates.venueName);
        if (updates.venueAddress !== undefined) s.venueAddress = String(updates.venueAddress);
        if (updates.prizeInfo !== undefined) s.prizeInfo = String(updates.prizeInfo);
        if (updates.eligibilityInfo !== undefined) s.eligibilityInfo = String(updates.eligibilityInfo);
        if (updates.officialEmail !== undefined) s.officialEmail = String(updates.officialEmail);
        if (updates.officialPhone !== undefined) s.officialPhone = String(updates.officialPhone);
        if (typeof updates.studentIdRequired === 'boolean')
          s.studentIdRequired = updates.studentIdRequired;
        if (updates.tieBreakRules !== undefined) s.tieBreakRules = String(updates.tieBreakRules);
        if (updates.heroEyebrow !== undefined) s.heroEyebrow = String(updates.heroEyebrow);
        if (updates.heroSupportingHeading !== undefined)
          s.heroSupportingHeading = String(updates.heroSupportingHeading);
        if (updates.heroDescription !== undefined) s.heroDescription = String(updates.heroDescription);
        if (Array.isArray(updates.roadmapMilestones))
          s.roadmapMilestones = updates.roadmapMilestones;
        s.updatedAt = new Date().toISOString();

        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorEmail: req.authUser!.email,
          actorRole: req.authUser!.role,
          action: 'EVENT_SETTINGS_UPDATED',
          targetType: 'event_settings',
          targetId: 'default',
          details: 'Updated competition configuration and public content.',
        });
        return s;
      });
      return res.json({ settings: saved });
    }
  );

  router.get('/admin/audit-logs', requireAuth, requireRoles(...staffReadRoles), (_req, res) => {
    const db = readDb();
    res.json({ auditLogs: db.audit_logs.slice(0, 500) });
  });

  router.get(
    '/admin/export/:reportType',
    requireAuth,
    requireRoles(...staffReadRoles),
    async (req: AuthenticatedRequest, res: Response) => {
      const reportType = String(req.params.reportType);
      const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
      const db = readDb();
      let rows: Record<string, string | number | boolean>[] = [];

      if (reportType === 'registrations') {
        rows = db.registrations.map((r) => {
          const t = db.teams.find((tm) => tm.id === r.teamId);
          const count = db.team_members.filter((m) => m.teamId === r.teamId).length;
          return {
            RegistrationID: sanitizeSpreadsheetCell(r.registrationCode),
            TeamName: sanitizeSpreadsheetCell(t?.name || ''),
            Category: sanitizeSpreadsheetCell(t?.category || ''),
            MembersCount: count,
            Status: sanitizeSpreadsheetCell(r.status),
            SubmittedAt: sanitizeSpreadsheetCell(r.submittedAt || ''),
            ReviewedAt: sanitizeSpreadsheetCell(r.reviewedAt || ''),
            AdminNotes: sanitizeSpreadsheetCell(r.adminNotes),
          };
        });
      } else if (reportType === 'teams') {
        rows = db.team_members.map((m) => {
          const t = db.teams.find((tm) => tm.id === m.teamId);
          const p = db.participants.find((part) => part.userId === m.userId);
          const u = db.users.find((usr) => usr.id === m.userId);
          return {
            TeamCode: sanitizeSpreadsheetCell(t?.teamCode || ''),
            TeamName: sanitizeSpreadsheetCell(t?.name || ''),
            Category: sanitizeSpreadsheetCell(t?.category || ''),
            MemberName: sanitizeSpreadsheetCell(p?.fullName || ''),
            Email: sanitizeSpreadsheetCell(u?.email || ''),
            Mobile: sanitizeSpreadsheetCell(p?.mobileNumber || ''),
            College: sanitizeSpreadsheetCell(p?.college || ''),
            Department: sanitizeSpreadsheetCell(p?.courseDepartment || ''),
            Year: sanitizeSpreadsheetCell(p?.academicYear || ''),
            RoleInTeam: sanitizeSpreadsheetCell(m.roleInTeam),
          };
        });
      } else if (reportType === 'submissions') {
        rows = db.project_submissions.map((s) => {
          const t = db.teams.find((tm) => tm.id === s.teamId);
          return {
            TeamName: sanitizeSpreadsheetCell(t?.name || ''),
            ApplicationName: sanitizeSpreadsheetCell(s.applicationName),
            Status: sanitizeSpreadsheetCell(s.status),
            Version: s.currentVersion,
            LiveURL: sanitizeSpreadsheetCell(s.liveUrl),
            SourceCodeURL: sanitizeSpreadsheetCell(s.sourceCodeUrl),
            TechStack: sanitizeSpreadsheetCell(s.techStack),
            SubmittedAt: sanitizeSpreadsheetCell(s.submittedAt || ''),
          };
        });
      } else if (reportType === 'evaluations') {
        rows = computeRankings(db).map((r) => ({
          Rank: r.rank ?? 'Pending',
          TeamCode: sanitizeSpreadsheetCell(r.teamCode),
          TeamName: sanitizeSpreadsheetCell(r.teamName),
          ApplicationName: sanitizeSpreadsheetCell(r.applicationName),
          Category: sanitizeSpreadsheetCell(r.category),
          CompletedEvaluations: r.completedEvaluations,
          AverageTotalOutOf100: r.averageTotal,
          Innovation20: r.avgInnovation,
          ProblemSolving20: r.avgProblemSolving,
          FunctionalApp20: r.avgFunctionalApp,
          UIUX15: r.avgUiUx,
          Technical15: r.avgTechnical,
          Presentation10: r.avgPresentation,
        }));
      } else if (reportType === 'audit_logs') {
        rows = db.audit_logs.map((l) => ({
          Timestamp: sanitizeSpreadsheetCell(l.createdAt),
          ActorEmail: sanitizeSpreadsheetCell(l.actorEmail),
          ActorRole: sanitizeSpreadsheetCell(l.actorRole),
          Action: sanitizeSpreadsheetCell(l.action),
          TargetType: sanitizeSpreadsheetCell(l.targetType),
          TargetId: sanitizeSpreadsheetCell(l.targetId),
          Details: sanitizeSpreadsheetCell(l.details),
        }));
      } else {
        return res.status(400).json({ error: 'Unknown report type.' });
      }

      if (rows.length === 0) {
        rows = [{ Notice: 'No records available for this report yet.' }];
      }

      const headers = Object.keys(rows[0]);
      if (format === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(reportType.slice(0, 31));
        sheet.columns = headers.map((h) => ({ header: h, key: h, width: 22 }));
        for (const r of rows) {
          sheet.addRow(r);
        }
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="appthon-${reportType}-report.xlsx"`
        );
        return res.send(Buffer.from(buffer));
      }

      const escapeCsv = (val: unknown) => {
        const s = String(val ?? '');
        if (/[",\n\r]/.test(s)) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const csvLines = [
        headers.map(escapeCsv).join(','),
        ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(',')),
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="appthon-${reportType}-report.csv"`
      );
      return res.send(csvLines.join('\r\n'));
    }
  );

  return router;
}

function stateAddMember(
  db: ReturnType<typeof readDb>,
  teamId: string,
  userId: string,
  joinedAt: string
) {
  db.team_members.push({
    id: generateId(),
    teamId,
    userId,
    roleInTeam: 'member',
    joinedAt,
  });
}

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award,
  Bell,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileCode2,
  History,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Settings,
  Trophy,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { PortalLayout, type SidebarNavItem } from '../components/PortalLayout';
import {
  FormField,
  PrimaryButton,
  StatusText,
  SurfaceCard,
  inputClass,
} from '../components/ui/Primitives';
import { PrivateImage, PrivateVideo } from '../components/PrivateMedia';
import { apiFetch, getMemoryToken } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  APPLICATION_CATEGORIES,
  type Announcement,
  type ApplicationCategory,
  type CertificateRecord,
  type EventSettings,
  type NotificationItem,
  type Participant,
  type ProjectIdea,
  type ProjectSubmission,
  type RegistrationRecord,
  type SubmissionVersion,
  type Team,
  type TeamInvitation,
  type UploadedFileRecord,
} from '../types/appthon';

interface StudentOverviewResponse {
  user: { id: string; email: string; role: string; emailVerified: boolean };
  participant: Participant | null;
  team: Team | null;
  registration: RegistrationRecord | null;
  members: Array<{
    id: string;
    userId: string;
    roleInTeam: 'leader' | 'member';
    fullName: string;
    email: string;
    mobileNumber: string;
    college: string;
    courseDepartment: string;
    academicYear: string;
    emailVerified: boolean;
  }>;
  invitations: TeamInvitation[];
  incomingInvitations: Array<
    TeamInvitation & { teamName: string; category: string; leaderName: string }
  >;
  idea: ProjectIdea | null;
  submission: ProjectSubmission | null;
  submissionVersions: SubmissionVersion[];
  uploadedFiles: UploadedFileRecord[];
  notifications: NotificationItem[];
  announcements: Announcement[];
  certificates: CertificateRecord[];
  publishedTeamResult: {
    rank: number | null;
    teamName: string;
    applicationName: string;
    averageTotal: number;
    feedbackList: string[];
  } | null;
  allPublishedResults: Array<{
    rank: number | null;
    teamId: string;
    teamName: string;
    applicationName: string;
    category: string;
    averageTotal: number;
  }>;
  eventSettings: EventSettings;
}

export function StudentDashboard() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (id: string) => setSearchParams({ tab: id });

  const [data, setData] = useState<StudentOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    mobileNumber: '',
    college: '',
    courseDepartment: '',
    academicYear: '',
    studentId: '',
  });

  // Team forms
  const [teamName, setTeamName] = useState('');
  const [teamCategory, setTeamCategory] = useState<ApplicationCategory>(APPLICATION_CATEGORIES[0]);
  const [initialIdea, setInitialIdea] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [changeNote, setChangeNote] = useState('');

  // Project Idea form
  const [ideaForm, setIdeaForm] = useState({
    title: '',
    problemStatement: '',
    proposedSolution: '',
    category: APPLICATION_CATEGORIES[0] as ApplicationCategory,
    description: '',
  });

  // Submission form
  const [subForm, setSubForm] = useState({
    applicationName: '',
    problemStatement: '',
    proposedSolution: '',
    description: '',
    liveUrl: '',
    sourceCodeUrl: '',
    demoVideoUrl: '',
    demoVideoFileId: null as string | null,
    screenshotFileIds: [] as string[],
    techStack: '',
    teamContributions: '',
  });
  const [uploading, setUploading] = useState(false);

  // Settings password change
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyHint, setVerifyHint] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<StudentOverviewResponse>('/student/overview');
      setData(res);
      if (res.participant) {
        setProfileForm({
          fullName: res.participant.fullName || '',
          mobileNumber: res.participant.mobileNumber || '',
          college: res.participant.college || '',
          courseDepartment: res.participant.courseDepartment || '',
          academicYear: res.participant.academicYear || '',
          studentId: res.participant.studentId || '',
        });
      }
      if (res.idea) {
        setIdeaForm({
          title: res.idea.title || '',
          problemStatement: res.idea.problemStatement || '',
          proposedSolution: res.idea.proposedSolution || '',
          category: res.idea.category || APPLICATION_CATEGORIES[0],
          description: res.idea.description || '',
        });
      }
      if (res.submission) {
        setSubForm({
          applicationName: res.submission.applicationName || '',
          problemStatement: res.submission.problemStatement || '',
          proposedSolution: res.submission.proposedSolution || '',
          description: res.submission.description || '',
          liveUrl: res.submission.liveUrl || '',
          sourceCodeUrl: res.submission.sourceCodeUrl || '',
          demoVideoUrl: res.submission.demoVideoUrl || '',
          demoVideoFileId: res.submission.demoVideoFileId || null,
          screenshotFileIds: res.submission.screenshotFileIds || [],
          techStack: res.submission.techStack || '',
          teamContributions: res.submission.teamContributions || '',
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showMessage = (msg: string) => {
    setBanner(msg);
    setError('');
  };

  const unreadCount = data?.notifications.filter((n) => !n.isRead).length || 0;

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'team', label: 'My Team', icon: Users, badge: data?.incomingInvitations.length },
    { id: 'idea', label: 'Project Idea', icon: Lightbulb },
    { id: 'roadmap', label: 'Competition Roadmap', icon: Compass },
    { id: 'submissions', label: 'Submissions', icon: FileCode2 },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'results', label: 'Results', icon: Trophy },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Computed current milestone & next required action from real DB state
  const getProgressSummary = () => {
    if (!data) return { milestone: 'Loading...', nextAction: '' };
    if (!data.user.emailVerified) {
      return {
        milestone: 'Account Verification',
        nextAction: 'Verify your email address in Settings to unlock team registration.',
      };
    }
    if (!data.team) {
      return {
        milestone: 'Week 01 — Team Formation',
        nextAction: 'Create a team or accept a pending team invitation in My Team.',
      };
    }
    if (data.registration?.status !== 'Approved') {
      if (data.members.length < 2) {
        return {
          milestone: 'Week 01 — Team Formation',
          nextAction: 'Invite and confirm at least 1 more member (minimum 2 members required).',
        };
      }
      if (data.registration?.status === 'Pending Approval') {
        return {
          milestone: 'Week 01 — Eligibility Review',
          nextAction: 'Await organizer approval of your team registration.',
        };
      }
      return {
        milestone: 'Week 01 — Registration Submission',
        nextAction: 'Submit your team registration for organizer approval in My Team.',
      };
    }
    if (!data.idea || data.idea.status === 'Draft' || data.idea.status === 'Revision Requested') {
      return {
        milestone: 'Week 01–02 — Idea Discovery & Planning',
        nextAction: 'Complete and submit your Project Idea for organizer screening.',
      };
    }
    if (!data.submission || data.submission.status === 'Draft' || data.submission.status === 'Reopened') {
      return {
        milestone: 'Week 03–04 — Application Development',
        nextAction: 'Build your application, upload screenshots & demo video, and submit final build.',
      };
    }
    return {
      milestone: 'Week 04 — Final Evaluation',
      nextAction: data.eventSettings.resultsPublished
        ? 'Official results have been published. View Results & Certificates.'
        : 'Final application submitted. Present to the judging panel as scheduled.',
    };
  };

  const progress = getProgressSummary();
  const isLeader = Boolean(data?.team && data.team.leaderUserId === user?.id);

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/student/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      showMessage('Profile updated successfully.');
      await refreshUser();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/student/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: teamName,
          category: teamCategory,
          initialIdea,
        }),
      });
      setTeamName('');
      setInitialIdea('');
      showMessage('Team created! Invite 1 to 4 members to meet the 2–5 member requirement.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create team.');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/student/teams/invite', {
        method: 'POST',
        body: JSON.stringify({ invitedEmail: inviteEmail }),
      });
      setInviteEmail('');
      showMessage('Invitation sent.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send invitation.');
    }
  };

  const handleRespondInvite = async (token: string, action: 'accept' | 'decline') => {
    try {
      await apiFetch(`/student/invitations/${encodeURIComponent(token)}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      showMessage(action === 'accept' ? 'You have joined the team!' : 'Invitation declined.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to process invitation.');
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      await apiFetch(`/student/invitations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      showMessage('Invitation revoked.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to revoke invitation.');
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/student/teams/submit-registration', {
        method: 'POST',
        body: JSON.stringify({ consentAccepted }),
      });
      showMessage('Team registration submitted for organizer review!');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit registration.');
    }
  };

  const handleRequestTeamChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/student/teams/request-change', {
        method: 'POST',
        body: JSON.stringify({ note: changeNote }),
      });
      setChangeNote('');
      showMessage('Team change request submitted to organizers.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to request change.');
    }
  };

  const handleSaveIdea = async (submit: boolean) => {
    try {
      await apiFetch('/student/idea', {
        method: 'PUT',
        body: JSON.stringify({ ...ideaForm, submit }),
      });
      showMessage(submit ? 'Project idea submitted for screening.' : 'Project idea draft saved.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save project idea.');
    }
  };

  const handleUploadFile = async (
    file: File,
    category: 'screenshot' | 'demo_video'
  ) => {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', category);
      const token = getMemoryToken();
      const res = await fetch('/api/student/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed.');
      if (category === 'demo_video') {
        setSubForm((prev) => ({ ...prev, demoVideoFileId: json.file.id }));
      } else {
        setSubForm((prev) => ({
          ...prev,
          screenshotFileIds: [...prev.screenshotFileIds, json.file.id],
        }));
      }
      showMessage(`${category === 'demo_video' ? 'Demo video' : 'Screenshot'} uploaded.`);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSubmission = async (submitFinal: boolean) => {
    try {
      await apiFetch('/student/submission', {
        method: 'PUT',
        body: JSON.stringify({ ...subForm, submitFinal }),
      });
      showMessage(
        submitFinal
          ? 'Final application submitted and version recorded!'
          : 'Submission draft saved to version history.'
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save submission.');
    }
  };

  const handleDownloadCertificate = (cert: CertificateRecord) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
      <rect width="1200" height="850" fill="#080810"/>
      <rect x="36" y="36" width="1128" height="778" rx="24" fill="#0F0F1C" stroke="#7024D8" stroke-width="3"/>
      <text x="600" y="130" fill="#A64AFF" font-family="sans-serif" font-size="22" letter-spacing="6" text-anchor="middle">SKILL AI · MANGALURU, KARNATAKA</text>
      <text x="600" y="210" fill="#FFFFFF" font-family="serif" font-size="64" text-anchor="middle">APPTHON CERTIFICATE</text>
      <text x="600" y="290" fill="#C4C4D4" font-family="sans-serif" font-size="24" text-anchor="middle">${cert.title}</text>
      <text x="600" y="405" fill="#FFFFFF" font-family="serif" font-size="56" text-anchor="middle">${cert.recipientName}</text>
      <text x="600" y="475" fill="#A64AFF" font-family="sans-serif" font-size="26" text-anchor="middle">Team: ${cert.teamName} · ${cert.rankLabel}</text>
      <text x="600" y="560" fill="#A0A0B8" font-family="sans-serif" font-size="20" text-anchor="middle">Issued on ${new Date(cert.issuedAt).toLocaleDateString('en-IN')}</text>
      <text x="600" y="720" fill="#FFFFFF" font-family="monospace" font-size="20" text-anchor="middle">Certificate ID: ${cert.certificateCode}</text>
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cert.certificateCode}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <PortalLayout
      title="Student Portal"
      subtitle="APPTHON · Skill AI Participant Workspace"
      items={navItems}
      activeId={activeTab}
      onSelect={setActiveTab}
    >
      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}
      {banner && (
        <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {banner}
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : data ? (
        <>
          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {!data.user.emailVerified && (
                <SurfaceCard className="border-amber-400/40 bg-amber-500/5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-amber-300">
                        Email Verification Required
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        Verify your email in Settings before creating or joining a team.
                      </p>
                    </div>
                    <PrimaryButton onClick={() => setActiveTab('settings')}>
                      Verify Email
                    </PrimaryButton>
                  </div>
                </SurfaceCard>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SurfaceCard>
                  <p className="text-xs text-white/50 uppercase">Registration ID</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-white tabular-nums">
                    {data.registration?.registrationCode || 'Not Created'}
                  </p>
                </SurfaceCard>
                <SurfaceCard>
                  <p className="text-xs text-white/50 uppercase">Team Name</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {data.team?.name || 'No Team Yet'}
                  </p>
                </SurfaceCard>
                <SurfaceCard>
                  <p className="text-xs text-white/50 uppercase">Registration Status</p>
                  <div className="mt-2">
                    <StatusText status={data.registration?.status || 'Not Started'} />
                  </div>
                </SurfaceCard>
                <SurfaceCard>
                  <p className="text-xs text-white/50 uppercase">Project Status</p>
                  <div className="mt-2">
                    <StatusText status={data.submission?.status || data.idea?.status || 'Not Started'} />
                  </div>
                </SurfaceCard>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <SurfaceCard>
                  <p className="text-xs font-medium tracking-wider text-[#A64AFF] uppercase">
                    Competition Progress
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-white">{progress.milestone}</h2>
                  <p className="mt-2 text-sm text-white/75">{progress.nextAction}</p>
                  <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm">
                    <div>
                      <p className="text-xs text-white/50">Category</p>
                      <p className="mt-1 font-medium text-white">
                        {data.team?.category || 'Unassigned'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Team Size</p>
                      <p className="mt-1 font-mono font-medium text-white tabular-nums">
                        {data.members.length} / 5 Members
                      </p>
                    </div>
                  </div>
                </SurfaceCard>

                <SurfaceCard>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Team Roster</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('team')}
                      className="text-xs text-[#A64AFF] hover:underline cursor-pointer"
                    >
                      Manage Team
                    </button>
                  </div>
                  {data.members.length === 0 ? (
                    <p className="mt-4 text-sm text-white/60">
                      You are not in a team yet. Create a team or respond to an invitation in My Team.
                    </p>
                  ) : (
                    <ul className="mt-4 divide-y divide-white/10 text-sm">
                      {data.members.map((m) => (
                        <li key={m.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="font-medium text-white">{m.fullName}</p>
                            <p className="text-xs text-white/55">{m.college}</p>
                          </div>
                          <span className="text-xs uppercase text-[#A64AFF]">{m.roleInTeam}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </SurfaceCard>
              </div>
            </div>
          )}

          {/* 2. MY PROFILE */}
          {activeTab === 'profile' && (
            <SurfaceCard>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full Name" required>
                    <input
                      type="text"
                      required
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="Email Address" hint="Account email (read-only)">
                    <input
                      type="email"
                      disabled
                      value={data.user.email}
                      className={`${inputClass} opacity-60`}
                    />
                  </FormField>
                  <FormField label="Mobile Number" required>
                    <input
                      type="tel"
                      required
                      value={profileForm.mobileNumber}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, mobileNumber: e.target.value })
                      }
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="College / Institution" required>
                    <input
                      type="text"
                      required
                      value={profileForm.college}
                      onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="Course / Department" required>
                    <input
                      type="text"
                      required
                      value={profileForm.courseDepartment}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, courseDepartment: e.target.value })
                      }
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="Academic Year" required>
                    <input
                      type="text"
                      required
                      value={profileForm.academicYear}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, academicYear: e.target.value })
                      }
                      className={inputClass}
                    />
                  </FormField>
                  <FormField
                    label="Student ID"
                    required={data.eventSettings.studentIdRequired}
                  >
                    <input
                      type="text"
                      required={data.eventSettings.studentIdRequired}
                      value={profileForm.studentId}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, studentId: e.target.value })
                      }
                      className={inputClass}
                    />
                  </FormField>
                </div>
                <PrimaryButton type="submit">Save Profile Changes</PrimaryButton>
              </form>
            </SurfaceCard>
          )}

          {/* 3. MY TEAM */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              {data.incomingInvitations.length > 0 && (
                <SurfaceCard className="border-[#7024D8]/50">
                  <h2 className="text-base font-semibold text-white">Pending Team Invitations</h2>
                  <div className="mt-4 space-y-3">
                    {data.incomingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#080810] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-white">{inv.teamName}</p>
                          <p className="text-xs text-white/60">
                            Category: {inv.category} · Leader: {inv.leaderName}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <PrimaryButton
                            type="button"
                            onClick={() => handleRespondInvite(inv.token, 'accept')}
                          >
                            Accept
                          </PrimaryButton>
                          <button
                            type="button"
                            onClick={() => handleRespondInvite(inv.token, 'decline')}
                            className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/75 hover:text-white cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              )}

              {!data.team ? (
                <SurfaceCard>
                  <h2 className="text-lg font-semibold text-white">Create a New Team</h2>
                  <p className="mt-1 text-sm text-white/65">
                    Teams require 2 to 5 members and one designated team leader. Registration is free.
                  </p>
                  <form onSubmit={handleCreateTeam} className="mt-6 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Team Name" required>
                        <input
                          type="text"
                          required
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="Enter unique team name"
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Application Category" required>
                        <select
                          value={teamCategory}
                          onChange={(e) => setTeamCategory(e.target.value as ApplicationCategory)}
                          className={inputClass}
                        >
                          {APPLICATION_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                    <FormField label="Initial Project Idea" required>
                      <textarea
                        required
                        rows={3}
                        value={initialIdea}
                        onChange={(e) => setInitialIdea(e.target.value)}
                        placeholder="Briefly describe the problem and application idea..."
                        className={inputClass}
                      />
                    </FormField>
                    <PrimaryButton type="submit">Create Team as Leader</PrimaryButton>
                  </form>
                </SurfaceCard>
              ) : (
                <>
                  <SurfaceCard>
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                      <div>
                        <p className="font-mono text-xs text-[#A64AFF]">
                          {data.team.teamCode} · {data.registration?.registrationCode}
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold text-white">{data.team.name}</h2>
                        <p className="mt-1 text-sm text-white/60">Category: {data.team.category}</p>
                      </div>
                      <div className="text-right">
                        <StatusText status={data.registration?.status || data.team.status} />
                        <p className="mt-1 font-mono text-xs text-white/60 tabular-nums">
                          {data.members.length} / 5 Members (Min 2)
                        </p>
                      </div>
                    </div>

                    {data.registration?.adminNotes && (
                      <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3.5 text-sm text-amber-200">
                        Organizer Note: {data.registration.adminNotes}
                      </div>
                    )}

                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-white">Confirmed Members</h3>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-white/10 text-xs text-white/50 uppercase">
                            <tr>
                              <th className="py-2.5 pr-4">Name</th>
                              <th className="py-2.5 pr-4">Email</th>
                              <th className="py-2.5 pr-4">College</th>
                              <th className="py-2.5 pr-4">Role</th>
                              <th className="py-2.5">Verified</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {data.members.map((m) => (
                              <tr key={m.id}>
                                <td className="py-3 pr-4 font-medium text-white">{m.fullName}</td>
                                <td className="py-3 pr-4 text-white/75">{m.email}</td>
                                <td className="py-3 pr-4 text-white/70">{m.college}</td>
                                <td className="py-3 pr-4 text-xs uppercase text-[#A64AFF]">
                                  {m.roleInTeam}
                                </td>
                                <td className="py-3">
                                  <StatusText status={m.emailVerified ? 'Verified' : 'Pending'} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {data.invitations.length > 0 && (
                      <div className="mt-6 border-t border-white/10 pt-5">
                        <h3 className="text-sm font-semibold text-white">Team Invitations</h3>
                        <ul className="mt-3 divide-y divide-white/10 text-sm">
                          {data.invitations.map((inv) => (
                            <li
                              key={inv.id}
                              className="flex items-center justify-between py-2.5"
                            >
                              <span className="text-white/80">{inv.invitedEmail}</span>
                              <div className="flex items-center gap-4">
                                <StatusText status={inv.status} />
                                {isLeader &&
                                  inv.status === 'pending' &&
                                  data.registration?.status !== 'Approved' && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeInvite(inv.id)}
                                      className="text-xs text-rose-400 hover:underline cursor-pointer"
                                    >
                                      Revoke
                                    </button>
                                  )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </SurfaceCard>

                  {isLeader && data.registration?.status !== 'Approved' && (
                    <div className="grid gap-6 lg:grid-cols-2">
                      <SurfaceCard>
                        <h3 className="text-base font-semibold text-white">Invite Team Members</h3>
                        <p className="mt-1 text-xs text-white/60">
                          Invite 1–4 members by email. They must register, verify email, and accept.
                        </p>
                        <form onSubmit={handleSendInvite} className="mt-4 flex gap-3">
                          <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="teammate@college.edu"
                            className={inputClass}
                          />
                          <PrimaryButton type="submit">Invite</PrimaryButton>
                        </form>
                      </SurfaceCard>

                      <SurfaceCard>
                        <h3 className="text-base font-semibold text-white">
                          Submit Team Registration
                        </h3>
                        <p className="mt-1 text-xs text-white/60">
                          Requires 2–5 verified members with complete profiles.
                        </p>
                        <form onSubmit={handleSubmitRegistration} className="mt-4 space-y-4">
                          <label className="flex items-start gap-2.5 text-xs text-white/75">
                            <input
                              type="checkbox"
                              checked={consentAccepted}
                              onChange={(e) => setConsentAccepted(e.target.checked)}
                              className="mt-0.5 accent-[#7024D8]"
                            />
                            <span>
                              All members agree to the{' '}
                              <Link to="/terms" className="text-[#A64AFF] underline">
                                Terms and Conditions
                              </Link>{' '}
                              and{' '}
                              <Link to="/privacy" className="text-[#A64AFF] underline">
                                Privacy Policy
                              </Link>
                              .
                            </span>
                          </label>
                          <PrimaryButton type="submit">
                            Submit Registration for Approval
                          </PrimaryButton>
                        </form>
                      </SurfaceCard>
                    </div>
                  )}

                  {isLeader && data.registration?.status === 'Approved' && (
                    <SurfaceCard>
                      <h3 className="text-base font-semibold text-white">
                        Request Organizer Authorization for Team Changes
                      </h3>
                      <p className="mt-1 text-xs text-white/60">
                        Approved teams are locked. Submit a request if membership changes are needed.
                      </p>
                      {data.team.changeRequestPending ? (
                        <p className="mt-3 text-sm text-amber-300">
                          Change request pending organizer review: {data.team.changeRequestNote}
                        </p>
                      ) : (
                        <form onSubmit={handleRequestTeamChange} className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <input
                            type="text"
                            required
                            value={changeNote}
                            onChange={(e) => setChangeNote(e.target.value)}
                            placeholder="Describe the requested change..."
                            className={inputClass}
                          />
                          <PrimaryButton type="submit">Request Change</PrimaryButton>
                        </form>
                      )}
                    </SurfaceCard>
                  )}
                </>
              )}
            </div>
          )}

          {/* 4. PROJECT IDEA */}
          {activeTab === 'idea' && (
            <SurfaceCard>
              {!data.team ? (
                <p className="text-sm text-white/65">Create or join a team first to submit a project idea.</p>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Project Idea Proposal</h2>
                      <p className="text-xs text-white/60">
                        Team: {data.team.name}
                      </p>
                    </div>
                    <StatusText status={data.idea?.status || 'Draft'} />
                  </div>

                  {data.idea?.adminFeedback && (
                    <div className="rounded-xl border border-[#7024D8]/40 bg-[#7024D8]/10 p-4 text-sm">
                      <span className="text-xs font-semibold text-[#A64AFF] uppercase">
                        Organizer Feedback:
                      </span>
                      <p className="mt-1 text-white/85">{data.idea.adminFeedback}</p>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Project Title" required>
                      <input
                        type="text"
                        value={ideaForm.title}
                        onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Application Category" required>
                      <select
                        value={ideaForm.category}
                        onChange={(e) =>
                          setIdeaForm({ ...ideaForm, category: e.target.value as ApplicationCategory })
                        }
                        className={inputClass}
                      >
                        {APPLICATION_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <FormField label="Problem Statement" required>
                    <textarea
                      rows={3}
                      value={ideaForm.problemStatement}
                      onChange={(e) => setIdeaForm({ ...ideaForm, problemStatement: e.target.value })}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Proposed Solution" required>
                    <textarea
                      rows={3}
                      value={ideaForm.proposedSolution}
                      onChange={(e) => setIdeaForm({ ...ideaForm, proposedSolution: e.target.value })}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Detailed Description" required>
                    <textarea
                      rows={4}
                      value={ideaForm.description}
                      onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                      className={inputClass}
                    />
                  </FormField>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveIdea(false)}
                      className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white hover:border-white/40 cursor-pointer"
                    >
                      Save Draft
                    </button>
                    <PrimaryButton type="button" onClick={() => handleSaveIdea(true)}>
                      Submit Idea for Screening
                    </PrimaryButton>
                  </div>
                </div>
              )}
            </SurfaceCard>
          )}

          {/* 5. COMPETITION ROADMAP */}
          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              {data.eventSettings.roadmapMilestones.map((m, idx) => {
                const completed =
                  (idx === 0 && data.registration?.status === 'Approved' && Boolean(data.idea)) ||
                  (idx === 1 && data.idea?.status === 'Approved') ||
                  (idx === 2 && Boolean(data.submission)) ||
                  (idx === 3 && data.submission?.status === 'Submitted');
                return (
                  <SurfaceCard key={m.week} className={completed ? 'border-emerald-500/40' : ''}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold text-[#A64AFF] uppercase">
                          {m.week} · Schedule: {m.targetDate}
                        </span>
                        <h3 className="mt-1 text-lg font-semibold text-white">{m.title}</h3>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase ${
                          completed ? 'text-emerald-400' : 'text-white/50'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {completed ? 'Completed' : 'In Progress / Upcoming'}
                      </span>
                    </div>
                    <ul className="mt-4 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
                      {m.activities.map((a) => (
                        <li key={a} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#A64AFF]" />
                          {a}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 border-t border-white/10 pt-3 text-xs text-white/60">
                      Expected output: <span className="text-white">{m.expectedOutput}</span>
                    </p>
                  </SurfaceCard>
                );
              })}
            </div>
          )}

          {/* 6. SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div className="space-y-6">
              {data.registration?.status !== 'Approved' ? (
                <SurfaceCard>
                  <ClipboardList className="h-6 w-6 text-[#A64AFF]" />
                  <h2 className="mt-3 text-lg font-semibold text-white">
                    Submissions Unlock After Registration Approval
                  </h2>
                  <p className="mt-1 text-sm text-white/65">
                    Current registration status: {data.registration?.status || 'No Team Created'}.
                  </p>
                </SurfaceCard>
              ) : (
                <>
                  <SurfaceCard>
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          Application Submission Workspace
                        </h2>
                        <p className="text-xs text-white/55">
                          Deadline: {data.eventSettings.submissionDeadline}
                        </p>
                      </div>
                      <StatusText status={data.submission?.status || 'Draft'} />
                    </div>

                    <div className="mt-6 space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="1. Application Name" required>
                          <input
                            type="text"
                            value={subForm.applicationName}
                            onChange={(e) =>
                              setSubForm({ ...subForm, applicationName: e.target.value })
                            }
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="9. Technology Stack" required>
                          <input
                            type="text"
                            value={subForm.techStack}
                            onChange={(e) => setSubForm({ ...subForm, techStack: e.target.value })}
                            placeholder="React, TypeScript, Node.js, PostgreSQL..."
                            className={inputClass}
                          />
                        </FormField>
                      </div>

                      <FormField label="2. Problem Statement" required>
                        <textarea
                          rows={2}
                          value={subForm.problemStatement}
                          onChange={(e) =>
                            setSubForm({ ...subForm, problemStatement: e.target.value })
                          }
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="3. Proposed Solution" required>
                        <textarea
                          rows={2}
                          value={subForm.proposedSolution}
                          onChange={(e) =>
                            setSubForm({ ...subForm, proposedSolution: e.target.value })
                          }
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="4. Application Description" required>
                        <textarea
                          rows={3}
                          value={subForm.description}
                          onChange={(e) => setSubForm({ ...subForm, description: e.target.value })}
                          className={inputClass}
                        />
                      </FormField>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="5. Live Application URL" required>
                          <input
                            type="url"
                            value={subForm.liveUrl}
                            onChange={(e) => setSubForm({ ...subForm, liveUrl: e.target.value })}
                            placeholder="https://..."
                            className={inputClass}
                          />
                        </FormField>
                        <FormField label="8. Source-Code Repository URL" required>
                          <input
                            type="url"
                            value={subForm.sourceCodeUrl}
                            onChange={(e) =>
                              setSubForm({ ...subForm, sourceCodeUrl: e.target.value })
                            }
                            placeholder="https://github.com/..."
                            className={inputClass}
                          />
                        </FormField>
                      </div>

                      {/* 6. Demo Video */}
                      <div className="rounded-xl border border-white/10 bg-[#080810] p-4 space-y-3">
                        <p className="text-xs font-medium text-white/80">
                          6. Demo Video (Upload MP4/WebM up to 50 MB or provide URL)
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 px-4 py-3 text-xs text-white/75 hover:border-[#A64AFF]">
                            <Upload className="h-4 w-4 text-[#A64AFF]" />
                            {uploading ? 'Uploading...' : 'Upload Private Demo Video'}
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              className="hidden"
                              disabled={uploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadFile(file, 'demo_video');
                              }}
                            />
                          </label>
                          <input
                            type="url"
                            value={subForm.demoVideoUrl}
                            onChange={(e) =>
                              setSubForm({ ...subForm, demoVideoUrl: e.target.value })
                            }
                            placeholder="Or Demo Video URL (https://...)"
                            className={inputClass}
                          />
                        </div>
                        {subForm.demoVideoFileId && (
                          <div className="pt-2">
                            <PrivateVideo
                              fileId={subForm.demoVideoFileId}
                              className="max-h-64 w-full rounded-xl border border-white/10"
                            />
                          </div>
                        )}
                      </div>

                      {/* 7. Screenshots */}
                      <div className="rounded-xl border border-white/10 bg-[#080810] p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-white/80">
                            7. Application Screenshots (PNG, JPEG, WebP · max 5 MB each)
                          </p>
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#7024D8]/25 px-4 py-1.5 text-xs font-medium text-white hover:bg-[#7024D8]/40">
                            <Upload className="h-3.5 w-3.5" />
                            Add Screenshot
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              disabled={uploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadFile(file, 'screenshot');
                              }}
                            />
                          </label>
                        </div>
                        {subForm.screenshotFileIds.length === 0 ? (
                          <p className="text-xs text-white/45">No screenshots uploaded yet.</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-3">
                            {subForm.screenshotFileIds.map((fid, i) => (
                              <div key={fid} className="relative space-y-1">
                                <PrivateImage
                                  fileId={fid}
                                  alt={`Screenshot ${i + 1}`}
                                  className="h-32 w-full rounded-xl border border-white/10 object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSubForm((prev) => ({
                                      ...prev,
                                      screenshotFileIds: prev.screenshotFileIds.filter(
                                        (id) => id !== fid
                                      ),
                                    }))
                                  }
                                  className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <FormField label="10. Team Contributions and Individual Responsibilities" required>
                        <textarea
                          rows={3}
                          value={subForm.teamContributions}
                          onChange={(e) =>
                            setSubForm({ ...subForm, teamContributions: e.target.value })
                          }
                          placeholder="List each team member and their contributions..."
                          className={inputClass}
                        />
                      </FormField>

                      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
                        <button
                          type="button"
                          onClick={() => handleSaveSubmission(false)}
                          className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white hover:border-white/40 cursor-pointer"
                        >
                          Save Draft
                        </button>
                        <PrimaryButton
                          type="button"
                          onClick={() => handleSaveSubmission(true)}
                        >
                          Submit Final Application
                        </PrimaryButton>
                      </div>
                    </div>
                  </SurfaceCard>

                  {/* Version History */}
                  <SurfaceCard>
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-[#A64AFF]" />
                      <h3 className="text-base font-semibold text-white">Submission Version History</h3>
                    </div>
                    {data.submissionVersions.length === 0 ? (
                      <p className="mt-3 text-sm text-white/55">No saved versions yet.</p>
                    ) : (
                      <ul className="mt-4 divide-y divide-white/10 text-sm">
                        {data.submissionVersions.map((v) => (
                          <li
                            key={v.id}
                            className="flex flex-wrap items-center justify-between gap-2 py-3"
                          >
                            <div>
                              <span className="font-mono text-xs text-[#A64AFF]">
                                v{v.versionNumber}
                              </span>{' '}
                              <span className="font-medium text-white">
                                {v.snapshot.applicationName || 'Draft'}
                              </span>
                              <span className="ml-2 text-xs text-white/55">
                                by {v.submittedByName}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-white/55">
                              <StatusText
                                status={
                                  v.actionType === 'final_submitted' ? 'Final Submitted' : 'Draft Saved'
                                }
                              />
                              <span className="tabular-nums">{formatDateTime(v.createdAt)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SurfaceCard>
                </>
              )}
            </div>
          )}

          {/* 7. ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-4">
              {data.announcements.length === 0 ? (
                <SurfaceCard>
                  <p className="text-sm text-white/60">No announcements published yet.</p>
                </SurfaceCard>
              ) : (
                data.announcements.map((a) => (
                  <SurfaceCard key={a.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-[#A64AFF] uppercase">
                        {a.category}
                      </span>
                      <span className="text-xs text-white/45 tabular-nums">
                        {formatDateTime(a.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-white">{a.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/75">{a.body}</p>
                  </SurfaceCard>
                ))
              )}
            </div>
          )}

          {/* 8. NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <SurfaceCard>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-base font-semibold text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      apiFetch('/student/notifications/read', {
                        method: 'POST',
                        body: JSON.stringify({}),
                      }).then(loadData)
                    }
                    className="text-xs text-[#A64AFF] hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              {data.notifications.length === 0 ? (
                <p className="mt-4 text-sm text-white/60">No notifications yet.</p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {data.notifications.map((n) => (
                    <li key={n.id} className="py-4 flex items-start justify-between gap-4">
                      <div>
                        <p className={`text-sm font-medium ${n.isRead ? 'text-white/70' : 'text-white'}`}>
                          {n.title}
                        </p>
                        <p className="mt-1 text-xs text-white/60">{n.message}</p>
                      </div>
                      <span className="text-[11px] text-white/40 shrink-0 tabular-nums">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SurfaceCard>
          )}

          {/* 9. RESULTS */}
          {activeTab === 'results' && (
            <SurfaceCard>
              {!data.eventSettings.resultsPublished ? (
                <div className="py-8 text-center">
                  <Trophy className="mx-auto h-8 w-8 text-white/30" />
                  <h2 className="mt-3 text-lg font-semibold text-white">Results Not Yet Published</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Rankings and judge feedback appear here once authorized and published by Skill AI.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {data.publishedTeamResult && (
                    <div className="rounded-xl border border-[#7024D8]/40 bg-[#7024D8]/10 p-5">
                      <p className="text-xs font-semibold text-[#A64AFF] uppercase">
                        Your Team Result
                      </p>
                      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
                        <h3 className="text-xl font-semibold text-white">
                          Rank #{data.publishedTeamResult.rank ?? '—'} ·{' '}
                          {data.publishedTeamResult.applicationName}
                        </h3>
                        <span className="font-mono text-2xl font-semibold text-white tabular-nums">
                          {data.publishedTeamResult.averageTotal} / 100
                        </span>
                      </div>
                      {data.publishedTeamResult.feedbackList.length > 0 && (
                        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
                          <p className="text-xs text-white/55 uppercase">Judge Feedback</p>
                          {data.publishedTeamResult.feedbackList.map((fb, idx) => (
                            <p key={idx} className="text-sm text-white/80">
                              • {fb}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-semibold text-white">Published Leaderboard</h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/10 text-xs text-white/50 uppercase">
                          <tr>
                            <th className="py-2.5 pr-4">Rank</th>
                            <th className="py-2.5 pr-4">Team</th>
                            <th className="py-2.5 pr-4">Application</th>
                            <th className="py-2.5 pr-4">Category</th>
                            <th className="py-2.5 text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.allPublishedResults.map((r) => (
                            <tr key={r.teamId}>
                              <td className="py-3 pr-4 font-mono text-[#A64AFF] tabular-nums">
                                #{r.rank ?? '—'}
                              </td>
                              <td className="py-3 pr-4 font-medium text-white">{r.teamName}</td>
                              <td className="py-3 pr-4 text-white/80">{r.applicationName}</td>
                              <td className="py-3 pr-4 text-xs text-white/60">{r.category}</td>
                              <td className="py-3 text-right font-mono text-white tabular-nums">
                                {r.averageTotal}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </SurfaceCard>
          )}

          {/* 10. CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div className="space-y-4">
              {data.certificates.length === 0 ? (
                <SurfaceCard>
                  <p className="text-sm text-white/60">
                    No certificates have been issued to your account yet.
                  </p>
                </SurfaceCard>
              ) : (
                data.certificates.map((cert) => (
                  <SurfaceCard key={cert.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-xs text-[#A64AFF]">{cert.certificateCode}</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{cert.title}</h3>
                      <p className="mt-1 text-xs text-white/65">
                        {cert.recipientName} · Team {cert.teamName} · {cert.rankLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/verify/${encodeURIComponent(cert.certificateCode)}`}
                        className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:border-white/40"
                      >
                        Verify Link
                      </Link>
                      <PrimaryButton
                        type="button"
                        onClick={() => handleDownloadCertificate(cert)}
                      >
                        Download Certificate
                      </PrimaryButton>
                    </div>
                  </SurfaceCard>
                ))
              )}
            </div>
          )}

          {/* 11. SETTINGS */}
          {activeTab === 'settings' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <SurfaceCard>
                <h2 className="text-base font-semibold text-white">Email Verification</h2>
                <p className="mt-1 text-xs text-white/60">
                  Status: {data.user.emailVerified ? 'Verified' : 'Pending Verification'}
                </p>
                {!data.user.emailVerified && (
                  <div className="mt-4 space-y-3">
                    {verifyHint && (
                      <p className="font-mono text-xs text-[#A64AFF]">
                        Preview Code: <strong className="text-white">{verifyHint}</strong>
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        placeholder="6-digit code"
                        className={inputClass}
                      />
                      <PrimaryButton
                        type="button"
                        onClick={async () => {
                          try {
                            await apiFetch('/auth/verify-email', {
                              method: 'POST',
                              body: JSON.stringify({ email: data.user.email, code: verifyCode }),
                            });
                            showMessage('Email verified!');
                            await refreshUser();
                            await loadData();
                          } catch (err: unknown) {
                            setError(err instanceof Error ? err.message : 'Invalid code.');
                          }
                        }}
                      >
                        Verify
                      </PrimaryButton>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await apiFetch<{ verificationCodeHint?: string }>(
                          '/auth/resend-verification',
                          {
                            method: 'POST',
                            body: JSON.stringify({ email: data.user.email }),
                          }
                        );
                        setVerifyHint(res.verificationCodeHint || null);
                        showMessage('Verification code regenerated.');
                      }}
                      className="text-xs text-[#A64AFF] hover:underline cursor-pointer"
                    >
                      Send / Resend Verification Code
                    </button>
                  </div>
                )}
              </SurfaceCard>

              <SurfaceCard>
                <h2 className="text-base font-semibold text-white">Change Password</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await apiFetch('/auth/change-password', {
                        method: 'POST',
                        body: JSON.stringify(pwdForm),
                      });
                      setPwdForm({ currentPassword: '', newPassword: '' });
                      showMessage('Password updated.');
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Unable to change password.');
                    }
                  }}
                  className="mt-4 space-y-3"
                >
                  <FormField label="Current Password" required>
                    <input
                      type="password"
                      required
                      value={pwdForm.currentPassword}
                      onChange={(e) =>
                        setPwdForm({ ...pwdForm, currentPassword: e.target.value })
                      }
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="New Password (min 8 chars)" required>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={pwdForm.newPassword}
                      onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                      className={inputClass}
                    />
                  </FormField>
                  <PrimaryButton type="submit">Update Password</PrimaryButton>
                </form>
              </SurfaceCard>
            </div>
          )}
        </>
      ) : null}
    </PortalLayout>
  );
}

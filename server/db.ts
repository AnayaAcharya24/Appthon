import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Announcement,
  AuditLog,
  CertificateRecord,
  EvaluationScore,
  EventSettings,
  JudgeAssignment,
  JudgeProfile,
  NotificationItem,
  Participant,
  ProjectIdea,
  ProjectSubmission,
  RegistrationRecord,
  SubmissionVersion,
  Team,
  TeamInvitation,
  TeamMember,
  UploadedFileRecord,
  UserRole,
} from '../src/types/appthon.ts';

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  emailVerified: boolean;
  verificationCode: string | null;
  verificationExpiresAt: string | null;
  resetCode: string | null;
  resetExpiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppthonDatabase {
  users: DbUser[];
  participants: Participant[];
  teams: Team[];
  team_members: TeamMember[];
  team_invitations: TeamInvitation[];
  registrations: RegistrationRecord[];
  project_ideas: ProjectIdea[];
  project_submissions: ProjectSubmission[];
  submission_versions: SubmissionVersion[];
  uploaded_files: UploadedFileRecord[];
  judges: JudgeProfile[];
  judge_assignments: JudgeAssignment[];
  evaluation_scores: EvaluationScore[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  certificates: CertificateRecord[];
  event_settings: EventSettings;
  audit_logs: AuditLog[];
}

export const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOAD_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'appthon-db.json');

function createDefaultEventSettings(): EventSettings {
  const now = new Date().toISOString();
  return {
    id: 'default',
    eventStartDate: 'To be announced',
    registrationDeadline: 'To be announced',
    submissionDeadline: 'To be announced',
    submissionDeadlineIso: null,
    finalPresentationDate: 'To be announced',
    venueName: 'To be announced',
    venueAddress: 'To be announced',
    prizeInfo: 'PRIZES TO BE ANNOUNCED.',
    eligibilityInfo:
      'College and university students from different academic backgrounds interested in technology, AI, entrepreneurship, design and problem-solving. Teams of 2–5 members. Cross-disciplinary teams are encouraged, subject to final rules.',
    officialEmail: 'TO BE ANNOUNCED',
    officialPhone: 'TO BE ANNOUNCED',
    studentIdRequired: false,
    tieBreakRules: 'To be announced prior to competition start.',
    heroEyebrow: 'SKILL AI PRESENTS',
    heroSupportingHeading: 'WELCOME TO APPTHON.',
    heroDescription:
      'A one-month application-building challenge where students turn imagination into functional technology products.',
    roadmapMilestones: [
      {
        week: 'WEEK 01',
        title: 'REGISTRATION & IDEA DISCOVERY',
        activities: [
          'Register participants.',
          'Create teams.',
          'Identify a problem.',
          'Submit an idea proposal.',
        ],
        expectedOutput: 'Approved team and project concept.',
        targetDate: 'To be announced',
      },
      {
        week: 'WEEK 02',
        title: 'PLANNING & PROTOTYPING',
        activities: [
          'Define features.',
          'Create user flows.',
          'Design wireframes.',
          'Plan UI/UX.',
          'Plan architecture and technology stack.',
        ],
        expectedOutput: 'Prototype and development plan.',
        targetDate: 'To be announced',
      },
      {
        week: 'WEEK 03',
        title: 'APPLICATION DEVELOPMENT',
        activities: [
          'Build frontend and backend.',
          'Connect database.',
          'Implement features.',
          'Test and debug.',
        ],
        expectedOutput: 'Working application build.',
        targetDate: 'To be announced',
      },
      {
        week: 'WEEK 04',
        title: 'FINAL SUBMISSION & PRESENTATION',
        activities: [
          'Submit application.',
          'Upload demo video.',
          'Upload screenshots.',
          'Submit project details.',
          'Present to judges.',
        ],
        expectedOutput: 'Final demo, evaluation and results.',
        targetDate: 'To be announced',
      },
    ],
    resultsApproved: false,
    resultsPublished: false,
    resultsApprovedByUserId: null,
    resultsPublishedAt: null,
    updatedAt: now,
  };
}

function createInitialDb(): AppthonDatabase {
  return {
    users: [],
    participants: [],
    teams: [],
    team_members: [],
    team_invitations: [],
    registrations: [],
    project_ideas: [],
    project_submissions: [],
    submission_versions: [],
    uploaded_files: [],
    judges: [],
    judge_assignments: [],
    evaluation_scores: [],
    announcements: [],
    notifications: [],
    certificates: [],
    event_settings: createDefaultEventSettings(),
    audit_logs: [],
  };
}

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

let cachedDb: AppthonDatabase | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export function readDb(): AppthonDatabase {
  if (cachedDb) return cachedDb;
  ensureDirectories();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    cachedDb = initial;
    return cachedDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppthonDatabase>;
    const defaults = createInitialDb();
    cachedDb = {
      ...defaults,
      ...parsed,
      event_settings: {
        ...defaults.event_settings,
        ...(parsed.event_settings || {}),
      },
    };
    return cachedDb;
  } catch {
    const fallback = createInitialDb();
    cachedDb = fallback;
    return cachedDb;
  }
}

export async function mutateDb<T>(mutator: (db: AppthonDatabase) => T | Promise<T>): Promise<T> {
  const operation = writeQueue.then(async () => {
    const db = readDb();
    const result = await mutator(db);
    ensureDirectories();
    const tempFile = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    return result;
  });
  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );
  return operation;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateShortCode(prefix: string, existingCodes: string[]): string {
  for (let i = 0; i < 20; i += 1) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidate = `${prefix}-${suffix}`;
    if (!existingCodes.includes(candidate)) {
      return candidate;
    }
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export function appendAuditLog(
  db: AppthonDatabase,
  params: {
    actorUserId: string | null;
    actorEmail: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    details: string;
  }
) {
  db.audit_logs.unshift({
    id: generateId(),
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    details: params.details,
    createdAt: new Date().toISOString(),
  });
}

export function pushNotification(
  db: AppthonDatabase,
  params: {
    userId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
  }
) {
  db.notifications.unshift({
    id: generateId(),
    userId: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    isRead: false,
    link: params.link || '/dashboard',
    createdAt: new Date().toISOString(),
  });
}

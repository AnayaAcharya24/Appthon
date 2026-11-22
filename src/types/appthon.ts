export type UserRole =
  | 'Super Admin'
  | 'Event Manager'
  | 'Registration Manager'
  | 'Judge'
  | 'Read-only Staff'
  | 'Student';

export type RegistrationStatus =
  | 'Draft'
  | 'Pending Verification'
  | 'Pending Approval'
  | 'Approved'
  | 'Correction Requested'
  | 'Rejected';

export type IdeaStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Revision Requested'
  | 'Rejected';

export type SubmissionStatus = 'Draft' | 'Submitted' | 'Locked' | 'Reopened';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export const APPLICATION_CATEGORIES = [
  'ARTIFICIAL INTELLIGENCE',
  'FINTECH',
  'EDTECH',
  'HEALTHTECH',
  'AGRITECH',
  'BUSINESS & PRODUCTIVITY',
  'SOCIAL IMPACT',
] as const;

export type ApplicationCategory = (typeof APPLICATION_CATEGORIES)[number];

export interface RubricCriterion {
  key:
    | 'innovationScore'
    | 'problemSolvingScore'
    | 'functionalAppScore'
    | 'uiuxScore'
    | 'technicalScore'
    | 'presentationScore';
  label: string;
  maxPoints: number;
  description: string;
}

export const JUDGING_RUBRIC: RubricCriterion[] = [
  {
    key: 'innovationScore',
    label: 'Innovation and originality',
    maxPoints: 20,
    description: 'Novelty of the concept, creative approach, and differentiation.',
  },
  {
    key: 'problemSolvingScore',
    label: 'Problem-solving effectiveness',
    maxPoints: 20,
    description: 'Clarity of the real-world problem and how effectively the solution addresses it.',
  },
  {
    key: 'functionalAppScore',
    label: 'Functional application',
    maxPoints: 20,
    description: 'Working product quality, completeness of core flows, and reliability.',
  },
  {
    key: 'uiuxScore',
    label: 'UI/UX and user experience',
    maxPoints: 15,
    description: 'Usability, visual polish, accessibility, and intuitive user journeys.',
  },
  {
    key: 'technicalScore',
    label: 'Technical implementation',
    maxPoints: 15,
    description: 'Code quality, architecture, data persistence, and engineering execution.',
  },
  {
    key: 'presentationScore',
    label: 'Presentation and scalability',
    maxPoints: 10,
    description: 'Clarity of demo, pitch communication, and potential for real-world adoption.',
  },
];

export interface PublicRoadmapMilestone {
  week: string;
  title: string;
  activities: string[];
  expectedOutput: string;
  targetDate: string;
}

export interface EventSettings {
  id: string;
  eventStartDate: string;
  registrationDeadline: string;
  submissionDeadline: string;
  submissionDeadlineIso: string | null;
  finalPresentationDate: string;
  venueName: string;
  venueAddress: string;
  prizeInfo: string;
  eligibilityInfo: string;
  officialEmail: string;
  officialPhone: string;
  studentIdRequired: boolean;
  tieBreakRules: string;
  heroEyebrow: string;
  heroSupportingHeading: string;
  heroDescription: string;
  roadmapMilestones: PublicRoadmapMilestone[];
  resultsApproved: boolean;
  resultsPublished: boolean;
  resultsApprovedByUserId: string | null;
  resultsPublishedAt: string | null;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  isActive: boolean;
  fullName?: string;
}

export interface Participant {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  college: string;
  courseDepartment: string;
  academicYear: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  teamCode: string;
  name: string;
  leaderUserId: string;
  category: ApplicationCategory;
  initialIdea: string;
  status: RegistrationStatus;
  changeRequestPending: boolean;
  changeRequestNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  roleInTeam: 'leader' | 'member';
  joinedAt: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  invitedEmail: string;
  invitedByUserId: string;
  token: string;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface RegistrationRecord {
  id: string;
  registrationCode: string;
  teamId: string;
  status: RegistrationStatus;
  consentAccepted: boolean;
  adminNotes: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectIdea {
  id: string;
  teamId: string;
  title: string;
  problemStatement: string;
  proposedSolution: string;
  category: ApplicationCategory;
  description: string;
  status: IdeaStatus;
  shortlisted: boolean;
  adminFeedback: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionSnapshot {
  applicationName: string;
  problemStatement: string;
  proposedSolution: string;
  description: string;
  liveUrl: string;
  sourceCodeUrl: string;
  demoVideoUrl: string;
  demoVideoFileId: string | null;
  screenshotFileIds: string[];
  techStack: string;
  teamContributions: string;
}

export interface ProjectSubmission extends SubmissionSnapshot {
  id: string;
  teamId: string;
  status: SubmissionStatus;
  currentVersion: number;
  submittedByUserId: string | null;
  submittedAt: string | null;
  reopenedByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionVersion {
  id: string;
  submissionId: string;
  teamId: string;
  versionNumber: number;
  snapshot: SubmissionSnapshot;
  submittedByUserId: string;
  submittedByName: string;
  actionType: 'draft_saved' | 'final_submitted' | 'admin_reopened';
  createdAt: string;
}

export interface UploadedFileRecord {
  id: string;
  storedFilename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: 'screenshot' | 'demo_video';
  teamId: string;
  uploadedByUserId: string;
  createdAt: string;
}

export interface JudgeProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  affiliation: string;
  expertise: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JudgeAssignment {
  id: string;
  judgeUserId: string;
  teamId: string;
  assignedByUserId: string;
  status: 'assigned' | 'in_progress' | 'completed';
  assignedAt: string;
  updatedAt: string;
}

export interface EvaluationScore {
  id: string;
  assignmentId: string;
  judgeUserId: string;
  teamId: string;
  innovationScore: number;
  problemSolvingScore: number;
  functionalAppScore: number;
  uiuxScore: number;
  technicalScore: number;
  presentationScore: number;
  totalScore: number;
  criterionComments: Record<string, string>;
  overallFeedback: string;
  status: 'Draft' | 'Submitted' | 'Reopened';
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category:
    | 'Event Notice'
    | 'Registration Update'
    | 'Deadline Change'
    | 'Competition Announcement'
    | 'Results Announcement';
  publishedByUserId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}

export interface CertificateRecord {
  id: string;
  certificateCode: string;
  participantUserId: string;
  teamId: string;
  recipientName: string;
  teamName: string;
  title: string;
  rankLabel: string;
  issuedByUserId: string;
  issuedAt: string;
  isRevoked: boolean;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

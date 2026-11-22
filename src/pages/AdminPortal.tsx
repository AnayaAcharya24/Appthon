import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Gavel,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  ScrollText,
  Settings,
  Shield,
  Trophy,
  UserCheck,
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
import { apiFetch, downloadProtectedFile } from '../lib/api';
import { formatDateTime, isSafeHttpUrl } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import type {
  Announcement,
  AuditLog,
  CertificateRecord,
  EventSettings,
  JudgeProfile,
  ProjectIdea,
  ProjectSubmission,
  SubmissionVersion,
  UserRole,
} from '../types/appthon';

export function AdminPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');

  // State per module
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [participants, setParticipants] = useState<Array<Record<string, string | boolean | null>>>([]);
  const [registrations, setRegistrations] = useState<Array<Record<string, unknown>>>([]);
  const [teams, setTeams] = useState<Array<Record<string, unknown>>>([]);
  const [ideas, setIdeas] = useState<Array<ProjectIdea & { teamName: string; teamCode: string }>>([]);
  const [submissions, setSubmissions] = useState<
    Array<
      ProjectSubmission & {
        teamName: string;
        teamCode: string;
        category: string;
        versions: SubmissionVersion[];
      }
    >
  >([]);
  const [judges, setJudges] = useState<Array<JudgeProfile & { assignedCount: number; completedCount: number }>>([]);
  const [staff, setStaff] = useState<Array<{ id: string; email: string; role: string; isActive: boolean }>>([]);
  const [assignments, setAssignments] = useState<Array<Record<string, unknown>>>([]);
  const [rankings, setRankings] = useState<Array<Record<string, unknown>>>([]);
  const [resultsMeta, setResultsMeta] = useState({
    resultsApproved: false,
    resultsPublished: false,
    tieBreakRules: '',
  });
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Forms
  const [judgeForm, setJudgeForm] = useState({
    fullName: '',
    email: '',
    password: '',
    affiliation: '',
    expertise: '',
  });
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Event Manager' as UserRole,
  });
  const [assignForm, setAssignForm] = useState({ judgeUserId: '', teamId: '' });
  const [certForm, setCertForm] = useState({
    teamId: '',
    title: 'Certificate of Participation — APPTHON',
    rankLabel: 'Participant',
  });
  const [annForm, setAnnForm] = useState({
    title: '',
    body: '',
    category: 'Competition Announcement' as Announcement['category'],
  });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [ov, part, reg, tm, idList, subList, jg, asg, resData, certData, annData, logData] =
        await Promise.all([
          apiFetch<{ metrics: Record<string, number>; settings: EventSettings }>('/admin/overview'),
          apiFetch<{ participants: Array<Record<string, string | boolean | null>> }>('/admin/participants'),
          apiFetch<{ registrations: Array<Record<string, unknown>> }>('/admin/registrations'),
          apiFetch<{ teams: Array<Record<string, unknown>> }>('/admin/teams'),
          apiFetch<{ ideas: Array<ProjectIdea & { teamName: string; teamCode: string }> }>('/admin/ideas'),
          apiFetch<{
            submissions: Array<
              ProjectSubmission & {
                teamName: string;
                teamCode: string;
                category: string;
                versions: SubmissionVersion[];
              }
            >;
          }>('/admin/submissions'),
          apiFetch<{
            judges: Array<JudgeProfile & { assignedCount: number; completedCount: number }>;
            staff: Array<{ id: string; email: string; role: string; isActive: boolean }>;
          }>('/admin/judges'),
          apiFetch<{ assignments: Array<Record<string, unknown>> }>('/admin/assignments'),
          apiFetch<{
            rankings: Array<Record<string, unknown>>;
            resultsApproved: boolean;
            resultsPublished: boolean;
            tieBreakRules: string;
          }>('/admin/results'),
          apiFetch<{ certificates: CertificateRecord[] }>('/admin/certificates'),
          apiFetch<{ announcements: Announcement[] }>('/admin/announcements'),
          apiFetch<{ auditLogs: AuditLog[] }>('/admin/audit-logs'),
        ]);
      setMetrics(ov.metrics);
      setSettings(ov.settings);
      setParticipants(part.participants);
      setRegistrations(reg.registrations);
      setTeams(tm.teams);
      setIdeas(idList.ideas);
      setSubmissions(subList.submissions);
      setJudges(jg.judges);
      setStaff(jg.staff);
      setAssignments(asg.assignments);
      setRankings(resData.rankings);
      setResultsMeta({
        resultsApproved: resData.resultsApproved,
        resultsPublished: resData.resultsPublished,
        tieBreakRules: resData.tieBreakRules,
      });
      setCertificates(certData.certificates);
      setAnnouncements(annData.announcements);
      setAuditLogs(logData.auditLogs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load admin records.');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const notifyOk = (msg: string) => {
    setBanner(msg);
    setError('');
  };

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'registrations', label: 'Registrations', icon: UserCheck },
    { id: 'teams', label: 'Teams', icon: Shield },
    { id: 'ideas', label: 'Idea Screening', icon: Lightbulb },
    { id: 'submissions', label: 'Project Submissions', icon: FileCheck2 },
    { id: 'judges', label: 'Judges & Staff', icon: Gavel },
    { id: 'assignments', label: 'Judge Assignments', icon: ClipboardCheck },
    { id: 'evaluation', label: 'Evaluation', icon: BarChart3 },
    { id: 'results', label: 'Results', icon: Trophy },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Event Settings', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: ScrollText },
  ];

  const isReadOnly = user?.role === 'Read-only Staff';

  return (
    <PortalLayout
      title="Admin Portal"
      subtitle={`APPTHON Operations · Role: ${user?.role || ''}`}
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

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Participants', val: metrics.totalParticipants ?? 0 },
            { label: 'Total Teams', val: metrics.totalTeams ?? 0 },
            { label: 'Total Registrations', val: metrics.totalRegistrations ?? 0 },
            { label: 'Approved Registrations', val: metrics.approvedRegistrations ?? 0 },
            { label: 'Ideas Submitted', val: metrics.ideasSubmitted ?? 0 },
            { label: 'Final Submissions', val: metrics.finalSubmissions ?? 0 },
            { label: 'Completed Evaluations', val: `${metrics.completedEvaluations ?? 0} / ${metrics.totalAssignments ?? 0}` },
            { label: 'Evaluation Progress', val: `${metrics.evaluationProgressPct ?? 0}%` },
          ].map((m) => (
            <SurfaceCard key={m.label}>
              <p className="text-xs text-white/50 uppercase">{m.label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
                {m.val}
              </p>
            </SurfaceCard>
          ))}
        </div>
      )}

      {/* 2. PARTICIPANTS */}
      {activeTab === 'participants' && (
        <SurfaceCard>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <h2 className="text-base font-semibold text-white">Registered Participants</h2>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, college..."
              className="w-full sm:w-72 rounded-xl border border-white/15 bg-[#080810] px-3.5 py-2 text-sm text-white"
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs text-white/50 uppercase">
                <tr>
                  <th className="py-2.5 pr-4">Name</th>
                  <th className="py-2.5 pr-4">Email</th>
                  <th className="py-2.5 pr-4">Mobile</th>
                  <th className="py-2.5 pr-4">College</th>
                  <th className="py-2.5 pr-4">Team</th>
                  <th className="py-2.5">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {participants
                  .filter((p) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      !q ||
                      String(p.fullName || '').toLowerCase().includes(q) ||
                      String(p.email || '').toLowerCase().includes(q) ||
                      String(p.college || '').toLowerCase().includes(q)
                    );
                  })
                  .map((p) => (
                    <tr key={String(p.userId)}>
                      <td className="py-3 pr-4 font-medium text-white">{String(p.fullName || '')}</td>
                      <td className="py-3 pr-4 text-white/75">{String(p.email || '')}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-white/70">
                        {String(p.mobileNumber || '')}
                      </td>
                      <td className="py-3 pr-4 text-white/70">{String(p.college || '')}</td>
                      <td className="py-3 pr-4 text-white/80">{String(p.teamName || '—')}</td>
                      <td className="py-3">
                        <StatusText status={p.emailVerified ? 'Verified' : 'Pending'} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

      {/* 3. REGISTRATIONS */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => downloadProtectedFile('/admin/export/registrations?format=csv', 'appthon-registrations.csv')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:border-white/40 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => downloadProtectedFile('/admin/export/registrations?format=xlsx', 'appthon-registrations.xlsx')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:border-white/40 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export XLSX
            </button>
          </div>
          {registrations.length === 0 ? (
            <SurfaceCard>
              <p className="text-sm text-white/60">No team registrations yet.</p>
            </SurfaceCard>
          ) : (
            registrations.map((reg) => {
              const id = String(reg.id);
              const members = (reg.members as Array<Record<string, unknown>>) || [];
              return (
                <SurfaceCard key={id}>
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <p className="font-mono text-xs text-[#A64AFF]">
                        {String(reg.registrationCode)} · {String(reg.teamCode)}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        {String(reg.teamName)}
                      </h3>
                      <p className="text-xs text-white/60">
                        Category: {String(reg.category)} · {members.length} Members
                      </p>
                    </div>
                    <StatusText status={String(reg.status)} />
                  </div>
                  <p className="mt-3 text-sm text-white/80">
                    Initial Idea: {String(reg.initialIdea || '')}
                  </p>
                  <div className="mt-3 text-xs text-white/65">
                    Members:{' '}
                    {members.map((m) => `${String(m.fullName)} (${String(m.college)})`).join(', ')}
                  </div>
                  {!isReadOnly && (
                    <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={reviewNotes[id] ?? String(reg.adminNotes || '')}
                        onChange={(e) => setReviewNotes({ ...reviewNotes, [id]: e.target.value })}
                        placeholder="Reviewer notes or correction instructions..."
                        className={inputClass}
                      />
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <PrimaryButton
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/admin/registrations/${encodeURIComponent(id)}/review`, {
                              method: 'POST',
                              body: JSON.stringify({
                                decision: 'Approved',
                                adminNotes: reviewNotes[id] || '',
                              }),
                            });
                            notifyOk('Registration approved.');
                            loadAll();
                          }}
                        >
                          Approve
                        </PrimaryButton>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/admin/registrations/${encodeURIComponent(id)}/review`, {
                              method: 'POST',
                              body: JSON.stringify({
                                decision: 'Correction Requested',
                                adminNotes: reviewNotes[id] || '',
                              }),
                            });
                            notifyOk('Correction requested.');
                            loadAll();
                          }}
                          className="rounded-full border border-amber-400/40 px-4 py-2 text-xs text-amber-300 cursor-pointer"
                        >
                          Request Correction
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/admin/registrations/${encodeURIComponent(id)}/review`, {
                              method: 'POST',
                              body: JSON.stringify({
                                decision: 'Rejected',
                                adminNotes: reviewNotes[id] || '',
                              }),
                            });
                            notifyOk('Registration rejected.');
                            loadAll();
                          }}
                          className="rounded-full border border-rose-400/40 px-4 py-2 text-xs text-rose-300 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </SurfaceCard>
              );
            })
          )}
        </div>
      )}

      {/* 4. TEAMS */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          {teams.length === 0 ? (
            <SurfaceCard>
              <p className="text-sm text-white/60">No teams created yet.</p>
            </SurfaceCard>
          ) : (
            teams.map((t) => {
              const id = String(t.id);
              const members = (t.members as Array<Record<string, unknown>>) || [];
              const invites = (t.invitations as Array<Record<string, unknown>>) || [];
              return (
                <SurfaceCard key={id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-[#A64AFF]">
                        {String(t.teamCode)} · {String(t.registrationCode)}
                      </p>
                      <h3 className="text-lg font-semibold text-white">{String(t.name)}</h3>
                    </div>
                    <StatusText status={String(t.registrationStatus)} />
                  </div>
                  <div className="mt-3 text-sm text-white/80">
                    Members ({members.length}):{' '}
                    {members
                      .map((m) => `${String(m.fullName)} [${String(m.roleInTeam)}]`)
                      .join(', ')}
                  </div>
                  {invites.length > 0 && (
                    <div className="mt-2 text-xs text-white/55">
                      Invitations:{' '}
                      {invites
                        .map((i) => `${String(i.invitedEmail)} (${String(i.status)})`)
                        .join(', ')}
                    </div>
                  )}
                  {Boolean(t.changeRequestPending) && !isReadOnly && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
                      <p className="text-xs text-amber-200">
                        Change Request: {String(t.changeRequestNote || '')}
                      </p>
                      <div className="flex gap-2">
                        <PrimaryButton
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/admin/teams/${encodeURIComponent(id)}/authorize-change`, {
                              method: 'POST',
                              body: JSON.stringify({ authorize: true }),
                            });
                            notifyOk('Team change authorized and unlocked.');
                            loadAll();
                          }}
                        >
                          Authorize Change
                        </PrimaryButton>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/admin/teams/${encodeURIComponent(id)}/authorize-change`, {
                              method: 'POST',
                              body: JSON.stringify({ authorize: false }),
                            });
                            notifyOk('Change request closed.');
                            loadAll();
                          }}
                          className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/75 cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}
                </SurfaceCard>
              );
            })
          )}
        </div>
      )}

      {/* 5. IDEA SCREENING */}
      {activeTab === 'ideas' && (
        <div className="space-y-4">
          {ideas.length === 0 ? (
            <SurfaceCard>
              <p className="text-sm text-white/60">No project ideas recorded yet.</p>
            </SurfaceCard>
          ) : (
            ideas.map((idea) => (
              <SurfaceCard key={idea.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="font-mono text-xs text-[#A64AFF]">
                      {idea.teamCode} · {idea.teamName} · {idea.category}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      {idea.title} {idea.shortlisted && '· ★ Shortlisted'}
                    </h3>
                  </div>
                  <StatusText status={idea.status} />
                </div>
                <p className="mt-3 text-sm text-white/80">
                  <strong>Problem:</strong> {idea.problemStatement}
                </p>
                <p className="mt-2 text-sm text-white/80">
                  <strong>Solution:</strong> {idea.proposedSolution || idea.description}
                </p>
                {!isReadOnly && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={reviewNotes[idea.id] ?? idea.adminFeedback}
                      onChange={(e) => setReviewNotes({ ...reviewNotes, [idea.id]: e.target.value })}
                      placeholder="Screening feedback..."
                      className={inputClass}
                    />
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <PrimaryButton
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/admin/ideas/${encodeURIComponent(idea.id)}/review`, {
                            method: 'POST',
                            body: JSON.stringify({
                              status: 'Approved',
                              shortlisted: true,
                              adminFeedback: reviewNotes[idea.id] || '',
                            }),
                          });
                          notifyOk('Idea approved & shortlisted.');
                          loadAll();
                        }}
                      >
                        Approve &amp; Shortlist
                      </PrimaryButton>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/admin/ideas/${encodeURIComponent(idea.id)}/review`, {
                            method: 'POST',
                            body: JSON.stringify({
                              status: 'Revision Requested',
                              adminFeedback: reviewNotes[idea.id] || '',
                            }),
                          });
                          notifyOk('Revision requested.');
                          loadAll();
                        }}
                        className="rounded-full border border-amber-400/40 px-4 py-2 text-xs text-amber-300 cursor-pointer"
                      >
                        Request Revision
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/admin/ideas/${encodeURIComponent(idea.id)}/review`, {
                            method: 'POST',
                            body: JSON.stringify({
                              status: 'Rejected',
                              adminFeedback: reviewNotes[idea.id] || '',
                            }),
                          });
                          notifyOk('Idea rejected.');
                          loadAll();
                        }}
                        className="rounded-full border border-rose-400/40 px-4 py-2 text-xs text-rose-300 cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </SurfaceCard>
            ))
          )}
        </div>
      )}

      {/* 6. PROJECT SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <SurfaceCard>
              <p className="text-sm text-white/60">No project submissions yet.</p>
            </SurfaceCard>
          ) : (
            submissions.map((sub) => (
              <SurfaceCard key={sub.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="font-mono text-xs text-[#A64AFF]">
                      {sub.teamCode} · {sub.teamName} · v{sub.currentVersion}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      {sub.applicationName || 'Untitled Draft'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusText status={sub.status} />
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/admin/submissions/${encodeURIComponent(sub.id)}/reopen`, {
                            method: 'POST',
                          });
                          notifyOk('Submission reopened for team editing.');
                          loadAll();
                        }}
                        className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white hover:border-white/40 cursor-pointer"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-white/80">{sub.description}</p>
                <div className="flex flex-wrap gap-5 text-xs text-[#A64AFF]">
                  {isSafeHttpUrl(sub.liveUrl) && sub.liveUrl && (
                    <a href={sub.liveUrl} target="_blank" rel="noreferrer" className="hover:underline">
                      Live App URL ↗
                    </a>
                  )}
                  {isSafeHttpUrl(sub.sourceCodeUrl) && sub.sourceCodeUrl && (
                    <a href={sub.sourceCodeUrl} target="_blank" rel="noreferrer" className="hover:underline">
                      Source Code URL ↗
                    </a>
                  )}
                  <span className="text-white/55">Tech: {sub.techStack}</span>
                </div>
                {sub.demoVideoFileId && (
                  <PrivateVideo
                    fileId={sub.demoVideoFileId}
                    className="max-h-56 w-full rounded-xl border border-white/10"
                  />
                )}
                {sub.screenshotFileIds.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-4">
                    {sub.screenshotFileIds.map((fid, i) => (
                      <PrivateImage
                        key={fid}
                        fileId={fid}
                        alt={`Screenshot ${i + 1}`}
                        className="h-24 w-full rounded-xl border border-white/10 object-cover"
                      />
                    ))}
                  </div>
                )}
                <p className="text-xs text-white/45">
                  Versions recorded: {sub.versions.length} · Last updated:{' '}
                  {formatDateTime(sub.updatedAt)}
                </p>
              </SurfaceCard>
            ))
          )}
        </div>
      )}

      {/* 7. JUDGES & STAFF */}
      {activeTab === 'judges' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SurfaceCard>
            <h2 className="text-base font-semibold text-white">Judging Panel</h2>
            {!isReadOnly && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await apiFetch('/admin/judges', {
                      method: 'POST',
                      body: JSON.stringify(judgeForm),
                    });
                    setJudgeForm({ fullName: '', email: '', password: '', affiliation: '', expertise: '' });
                    notifyOk('Judge account created.');
                    loadAll();
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Unable to create judge.');
                  }
                }}
                className="mt-4 space-y-3 border-b border-white/10 pb-5"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Judge full name"
                    value={judgeForm.fullName}
                    onChange={(e) => setJudgeForm({ ...judgeForm, fullName: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="email"
                    required
                    placeholder="judge@domain.com"
                    value={judgeForm.email}
                    onChange={(e) => setJudgeForm({ ...judgeForm, email: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Password (8+ chars)"
                    value={judgeForm.password}
                    onChange={(e) => setJudgeForm({ ...judgeForm, password: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Organization / Expertise"
                    value={judgeForm.affiliation}
                    onChange={(e) => setJudgeForm({ ...judgeForm, affiliation: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <PrimaryButton type="submit">Create Judge Account</PrimaryButton>
              </form>
            )}
            <ul className="mt-4 divide-y divide-white/10 text-sm">
              {judges.map((j) => (
                <li key={j.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-white">{j.fullName}</p>
                    <p className="text-xs text-white/55">
                      {j.email} · {j.affiliation || 'Panel Judge'}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#A64AFF] tabular-nums">
                    {j.completedCount}/{j.assignedCount} Done
                  </span>
                </li>
              ))}
            </ul>
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="text-base font-semibold text-white">Organizer Staff Roles</h2>
            {user?.role === 'Super Admin' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await apiFetch('/admin/staff', {
                      method: 'POST',
                      body: JSON.stringify(staffForm),
                    });
                    setStaffForm({ fullName: '', email: '', password: '', role: 'Event Manager' });
                    notifyOk('Staff account created.');
                    loadAll();
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Unable to create staff.');
                  }
                }}
                className="mt-4 space-y-3 border-b border-white/10 pb-5"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Staff full name"
                    value={staffForm.fullName}
                    onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="email"
                    required
                    placeholder="staff@skillai.in"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Password (8+ chars)"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className={inputClass}
                  />
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as UserRole })}
                    className={inputClass}
                  >
                    <option value="Event Manager">Event Manager</option>
                    <option value="Registration Manager">Registration Manager</option>
                    <option value="Read-only Staff">Read-only Staff</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
                <PrimaryButton type="submit">Add Staff Account</PrimaryButton>
              </form>
            )}
            <ul className="mt-4 divide-y divide-white/10 text-sm">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <span className="text-white">{s.email}</span>
                  <span className="text-xs text-[#A64AFF]">{s.role}</span>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        </div>
      )}

      {/* 8. JUDGE ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {!isReadOnly && (
            <SurfaceCard>
              <h2 className="text-base font-semibold text-white">Assign Project to Judge</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await apiFetch('/admin/assignments', {
                      method: 'POST',
                      body: JSON.stringify(assignForm),
                    });
                    notifyOk('Judge assigned to project.');
                    loadAll();
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Unable to assign.');
                  }
                }}
                className="mt-4 flex flex-col gap-3 sm:flex-row"
              >
                <select
                  required
                  value={assignForm.judgeUserId}
                  onChange={(e) => setAssignForm({ ...assignForm, judgeUserId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select Judge</option>
                  {judges.map((j) => (
                    <option key={j.userId} value={j.userId}>
                      {j.fullName} ({j.email})
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={assignForm.teamId}
                  onChange={(e) => setAssignForm({ ...assignForm, teamId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select Team</option>
                  {teams.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {String(t.name)} ({String(t.teamCode)})
                    </option>
                  ))}
                </select>
                <PrimaryButton type="submit">Assign</PrimaryButton>
              </form>
            </SurfaceCard>
          )}

          <SurfaceCard>
            <h2 className="text-base font-semibold text-white">Active Judge Assignments</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-white/50 uppercase">
                  <tr>
                    <th className="py-2.5 pr-4">Judge</th>
                    <th className="py-2.5 pr-4">Team</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 pr-4 text-right">Score</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {assignments.map((a) => (
                    <tr key={String(a.id)}>
                      <td className="py-3 pr-4 text-white">{String(a.judgeName)}</td>
                      <td className="py-3 pr-4 text-white/80">{String(a.teamName)}</td>
                      <td className="py-3 pr-4">
                        <StatusText status={String(a.scoreStatus)} />
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-white tabular-nums">
                        {a.totalScore !== null ? `${a.totalScore}/100` : '—'}
                      </td>
                      <td className="py-3 text-right">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/admin/assignments/${encodeURIComponent(String(a.id))}`, {
                                method: 'DELETE',
                              });
                              notifyOk('Assignment removed.');
                              loadAll();
                            }}
                            className="text-xs text-rose-400 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </div>
      )}

      {/* 9. EVALUATION PROGRESS */}
      {activeTab === 'evaluation' && (
        <SurfaceCard>
          <h2 className="text-base font-semibold text-white">Evaluation Progress</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs text-white/50 uppercase">
                <tr>
                  <th className="py-2.5 pr-4">Judge</th>
                  <th className="py-2.5 pr-4">Project</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4 text-right">Score</th>
                  <th className="py-2.5 text-right">Reopen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {assignments.map((a) => (
                  <tr key={String(a.id)}>
                    <td className="py-3 pr-4 text-white">{String(a.judgeName)}</td>
                    <td className="py-3 pr-4 text-white/80">{String(a.applicationName)}</td>
                    <td className="py-3 pr-4">
                      <StatusText status={String(a.scoreStatus)} />
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-white tabular-nums">
                      {a.totalScore !== null ? `${a.totalScore}/100` : '—'}
                    </td>
                    <td className="py-3 text-right">
                      {a.evaluationId && a.scoreStatus === 'Submitted' && !isReadOnly ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(
                              `/admin/evaluations/${encodeURIComponent(String(a.evaluationId))}/reopen`,
                              { method: 'POST' }
                            );
                            notifyOk('Evaluation reopened.');
                            loadAll();
                          }}
                          className="text-xs text-[#A64AFF] hover:underline cursor-pointer"
                        >
                          Reopen
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

      {/* 10. RESULTS */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">Results Governance</h2>
                <p className="mt-1 text-xs text-white/60">
                  Tie-Break Rule: {resultsMeta.tieBreakRules}
                </p>
              </div>
              {!isReadOnly && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch('/admin/results/approve', { method: 'POST' });
                      notifyOk('Results approved.');
                      loadAll();
                    }}
                    className="rounded-full border border-white/20 px-5 py-2 text-xs text-white hover:border-white/40 cursor-pointer"
                  >
                    {resultsMeta.resultsApproved ? '✓ Approved' : 'Approve Results'}
                  </button>
                  <PrimaryButton
                    type="button"
                    onClick={async () => {
                      try {
                        await apiFetch('/admin/results/publish', {
                          method: 'POST',
                          body: JSON.stringify({ publish: !resultsMeta.resultsPublished }),
                        });
                        notifyOk(
                          resultsMeta.resultsPublished ? 'Results unpublished.' : 'Results published!'
                        );
                        loadAll();
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : 'Unable to publish.');
                      }
                    }}
                  >
                    {resultsMeta.resultsPublished ? 'Unpublish Results' : 'Publish Results'}
                  </PrimaryButton>
                </div>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-white/50 uppercase">
                  <tr>
                    <th className="py-2.5 pr-4">Rank</th>
                    <th className="py-2.5 pr-4">Team</th>
                    <th className="py-2.5 pr-4">Application</th>
                    <th className="py-2.5 pr-4 text-right">Evals</th>
                    <th className="py-2.5 text-right">Average Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rankings.map((r) => (
                    <tr key={String(r.teamId)}>
                      <td className="py-3 pr-4 font-mono text-[#A64AFF] tabular-nums">
                        {r.rank !== null ? `#${String(r.rank)}` : 'Pending'}
                      </td>
                      <td className="py-3 pr-4 font-medium text-white">{String(r.teamName)}</td>
                      <td className="py-3 pr-4 text-white/80">{String(r.applicationName)}</td>
                      <td className="py-3 pr-4 text-right font-mono text-white/70 tabular-nums">
                        {String(r.completedEvaluations)}/{String(r.assignedJudges)}
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-white tabular-nums">
                        {String(r.averageTotal)} / 100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </div>
      )}

      {/* 11. CERTIFICATES */}
      {activeTab === 'certificates' && (
        <div className="space-y-6">
          {!isReadOnly && (
            <SurfaceCard>
              <h2 className="text-base font-semibold text-white">Issue Certificates to Team</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await apiFetch('/admin/certificates/issue', {
                      method: 'POST',
                      body: JSON.stringify(certForm),
                    });
                    notifyOk('Certificates generated and issued to team members.');
                    loadAll();
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Unable to issue certificates.');
                  }
                }}
                className="mt-4 grid gap-3 sm:grid-cols-4"
              >
                <select
                  required
                  value={certForm.teamId}
                  onChange={(e) => setCertForm({ ...certForm, teamId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select Team</option>
                  {teams.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {String(t.name)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={certForm.title}
                  onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                  placeholder="Certificate Title"
                  className={inputClass}
                />
                <input
                  type="text"
                  required
                  value={certForm.rankLabel}
                  onChange={(e) => setCertForm({ ...certForm, rankLabel: e.target.value })}
                  placeholder="Rank / Recognition Label"
                  className={inputClass}
                />
                <PrimaryButton type="submit">Issue Certificates</PrimaryButton>
              </form>
            </SurfaceCard>
          )}

          <SurfaceCard>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-white/50 uppercase">
                  <tr>
                    <th className="py-2.5 pr-4">Certificate ID</th>
                    <th className="py-2.5 pr-4">Recipient</th>
                    <th className="py-2.5 pr-4">Team</th>
                    <th className="py-2.5 pr-4">Recognition</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {certificates.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-4 font-mono text-xs text-[#A64AFF]">
                        {c.certificateCode}
                      </td>
                      <td className="py-3 pr-4 text-white">{c.recipientName}</td>
                      <td className="py-3 pr-4 text-white/75">{c.teamName}</td>
                      <td className="py-3 pr-4 text-white/75">{c.rankLabel}</td>
                      <td className="py-3 text-right">
                        {!isReadOnly ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/admin/certificates/${encodeURIComponent(c.id)}/revoke`, {
                                method: 'POST',
                              });
                              loadAll();
                            }}
                            className="text-xs text-white/70 hover:text-white cursor-pointer"
                          >
                            {c.isRevoked ? 'Revoked (Restore)' : 'Active (Revoke)'}
                          </button>
                        ) : (
                          <StatusText status={c.isRevoked ? 'Revoked' : 'Active'} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </div>
      )}

      {/* 12. ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {!isReadOnly && (
            <SurfaceCard>
              <h2 className="text-base font-semibold text-white">Publish Official Announcement</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/admin/announcements', {
                    method: 'POST',
                    body: JSON.stringify(annForm),
                  });
                  setAnnForm({ title: '', body: '', category: 'Competition Announcement' });
                  notifyOk('Announcement published and participants notified.');
                  loadAll();
                }}
                className="mt-4 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Announcement Title" required>
                    <input
                      type="text"
                      required
                      value={annForm.title}
                      onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="Category" required>
                    <select
                      value={annForm.category}
                      onChange={(e) =>
                        setAnnForm({
                          ...annForm,
                          category: e.target.value as Announcement['category'],
                        })
                      }
                      className={inputClass}
                    >
                      <option value="Event Notice">Event Notice</option>
                      <option value="Registration Update">Registration Update</option>
                      <option value="Deadline Change">Deadline Change</option>
                      <option value="Competition Announcement">Competition Announcement</option>
                      <option value="Results Announcement">Results Announcement</option>
                    </select>
                  </FormField>
                </div>
                <FormField label="Message" required>
                  <textarea
                    rows={3}
                    required
                    value={annForm.body}
                    onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                    className={inputClass}
                  />
                </FormField>
                <PrimaryButton type="submit">Publish Announcement</PrimaryButton>
              </form>
            </SurfaceCard>
          )}
          <div className="space-y-3">
            {announcements.map((a) => (
              <SurfaceCard key={a.id}>
                <div className="flex justify-between text-xs text-[#A64AFF]">
                  <span>{a.category}</span>
                  <span className="text-white/45">{formatDateTime(a.createdAt)}</span>
                </div>
                <h3 className="mt-1 text-base font-semibold text-white">{a.title}</h3>
                <p className="mt-1 text-sm text-white/75">{a.body}</p>
              </SurfaceCard>
            ))}
          </div>
        </div>
      )}

      {/* 13. REPORTS */}
      {activeTab === 'reports' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: 'registrations', label: 'Registration Report' },
            { key: 'teams', label: 'Team & Member Report' },
            { key: 'submissions', label: 'Project Submission Report' },
            { key: 'evaluations', label: 'Evaluation & Rankings Report' },
            { key: 'audit_logs', label: 'Audit Trail Report' },
          ].map((rep) => (
            <SurfaceCard key={rep.key} className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">{rep.label}</h3>
                <p className="text-xs text-white/55">Export live database records</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadProtectedFile(
                      `/admin/export/${rep.key}?format=csv`,
                      `appthon-${rep.key}.csv`
                    )
                  }
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:border-white/40 cursor-pointer"
                >
                  CSV
                </button>
                <PrimaryButton
                  type="button"
                  onClick={() =>
                    downloadProtectedFile(
                      `/admin/export/${rep.key}?format=xlsx`,
                      `appthon-${rep.key}.xlsx`
                    )
                  }
                >
                  XLSX
                </PrimaryButton>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}

      {/* 14. EVENT SETTINGS */}
      {activeTab === 'settings' && settings && (
        <SurfaceCard>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiFetch('/admin/settings', {
                method: 'PUT',
                body: JSON.stringify(settings),
              });
              notifyOk('Event settings saved and reflected on the public website.');
              loadAll();
            }}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Event Start Date">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={settings.eventStartDate}
                  onChange={(e) => setSettings({ ...settings, eventStartDate: e.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Registration Deadline">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={settings.registrationDeadline}
                  onChange={(e) =>
                    setSettings({ ...settings, registrationDeadline: e.target.value })
                  }
                  className={inputClass}
                />
              </FormField>
              <FormField label="Submission Deadline (Display)">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={settings.submissionDeadline}
                  onChange={(e) =>
                    setSettings({ ...settings, submissionDeadline: e.target.value })
                  }
                  className={inputClass}
                />
              </FormField>
              <FormField label="Submission Hard Lock Timestamp (ISO, optional)">
                <input
                  type="datetime-local"
                  disabled={isReadOnly}
                  value={
                    settings.submissionDeadlineIso
                      ? settings.submissionDeadlineIso.slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      submissionDeadlineIso: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    })
                  }
                  className={inputClass}
                />
              </FormField>
              <FormField label="Final Presentation Date">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={settings.finalPresentationDate}
                  onChange={(e) =>
                    setSettings({ ...settings, finalPresentationDate: e.target.value })
                  }
                  className={inputClass}
                />
              </FormField>
              <FormField label="Venue Name">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={settings.venueName}
                  onChange={(e) => setSettings({ ...settings, venueName: e.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Venue Address">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={settings.venueAddress}
                  onChange={(e) => setSettings({ ...settings, venueAddress: e.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Prize Information">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={settings.prizeInfo}
                  onChange={(e) => setSettings({ ...settings, prizeInfo: e.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Official Email">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={settings.officialEmail}
                  onChange={(e) => setSettings({ ...settings, officialEmail: e.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Official Telephone">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={settings.officialPhone}
                  onChange={(e) => setSettings({ ...settings, officialPhone: e.target.value })}
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Tie-Break Rules">
              <textarea
                rows={2}
                disabled={isReadOnly}
                value={settings.tieBreakRules}
                onChange={(e) => setSettings({ ...settings, tieBreakRules: e.target.value })}
                className={inputClass}
              />
            </FormField>

            <FormField label="Eligibility Policy Copy">
              <textarea
                rows={2}
                disabled={isReadOnly}
                value={settings.eligibilityInfo}
                onChange={(e) => setSettings({ ...settings, eligibilityInfo: e.target.value })}
                className={inputClass}
              />
            </FormField>

            <label className="flex items-center gap-2.5 text-sm text-white/80">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={settings.studentIdRequired}
                onChange={(e) =>
                  setSettings({ ...settings, studentIdRequired: e.target.checked })
                }
                className="accent-[#7024D8]"
              />
              Require Student ID during participant registration
            </label>

            {!isReadOnly && <PrimaryButton type="submit">Save Event Settings</PrimaryButton>}
          </form>
        </SurfaceCard>
      )}

      {/* 15. AUDIT LOGS */}
      {activeTab === 'audit' && (
        <SurfaceCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-white/50 uppercase">
                <tr>
                  <th className="py-2.5 pr-4">Time</th>
                  <th className="py-2.5 pr-4">Actor</th>
                  <th className="py-2.5 pr-4">Action</th>
                  <th className="py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 pr-4 text-white/55 tabular-nums whitespace-nowrap">
                      {formatDateTime(l.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4 text-white/80">
                      {l.actorEmail} ({l.actorRole})
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[#A64AFF]">{l.action}</td>
                    <td className="py-2.5 text-white/70">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}
    </PortalLayout>
  );
}

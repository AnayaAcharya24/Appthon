import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FolderKanban,
  Lock,
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
import { apiFetch } from '../lib/api';
import { isSafeHttpUrl } from '../lib/utils';
import {
  JUDGING_RUBRIC,
  type EvaluationScore,
  type JudgeAssignment,
  type ProjectIdea,
  type ProjectSubmission,
  type Team,
  type UploadedFileRecord,
} from '../types/appthon';

interface JudgeAssignmentSummary extends JudgeAssignment {
  teamName: string;
  teamCode: string;
  category: string;
  applicationName: string;
  hasSubmission: boolean;
  scoreStatus: string;
  totalScore: number | null;
}

interface JudgeDetailResponse {
  assignment: JudgeAssignment;
  team: Team;
  idea: ProjectIdea | null;
  submission: ProjectSubmission | null;
  files: UploadedFileRecord[];
  evaluation: EvaluationScore | null;
}

export function JudgePortal() {
  const [activeTab, setActiveTab] = useState('assigned');
  const [assignments, setAssignments] = useState<JudgeAssignmentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JudgeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');

  const [scores, setScores] = useState<Record<string, number>>({
    innovationScore: 0,
    problemSolvingScore: 0,
    functionalAppScore: 0,
    uiuxScore: 0,
    technicalScore: 0,
    presentationScore: 0,
  });
  const [criterionComments, setCriterionComments] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ assignments: JudgeAssignmentSummary[] }>('/judge/assignments');
      setAssignments(res.assignments);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load assignments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const openAssignment = async (id: string) => {
    setSelectedId(id);
    setActiveTab('review');
    setError('');
    setBanner('');
    try {
      const res = await apiFetch<JudgeDetailResponse>(`/judge/assignments/${encodeURIComponent(id)}`);
      setDetail(res);
      if (res.evaluation) {
        setScores({
          innovationScore: res.evaluation.innovationScore,
          problemSolvingScore: res.evaluation.problemSolvingScore,
          functionalAppScore: res.evaluation.functionalAppScore,
          uiuxScore: res.evaluation.uiuxScore,
          technicalScore: res.evaluation.technicalScore,
          presentationScore: res.evaluation.presentationScore,
        });
        setCriterionComments(res.evaluation.criterionComments || {});
        setOverallFeedback(res.evaluation.overallFeedback || '');
      } else {
        setScores({
          innovationScore: 0,
          problemSolvingScore: 0,
          functionalAppScore: 0,
          uiuxScore: 0,
          technicalScore: 0,
          presentationScore: 0,
        });
        setCriterionComments({});
        setOverallFeedback('');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to open project.');
    }
  };

  const totalScore =
    Number(scores.innovationScore || 0) +
    Number(scores.problemSolvingScore || 0) +
    Number(scores.functionalAppScore || 0) +
    Number(scores.uiuxScore || 0) +
    Number(scores.technicalScore || 0) +
    Number(scores.presentationScore || 0);

  const handleSaveScore = async (submitFinal: boolean) => {
    if (!selectedId) return;
    setError('');
    setBanner('');
    try {
      const res = await apiFetch<{ evaluation: EvaluationScore }>(
        `/judge/assignments/${encodeURIComponent(selectedId)}/score`,
        {
          method: 'PUT',
          body: JSON.stringify({
            ...scores,
            criterionComments,
            overallFeedback,
            submitFinal,
          }),
        }
      );
      setDetail((prev) => (prev ? { ...prev, evaluation: res.evaluation } : prev));
      setBanner(
        submitFinal
          ? 'Final evaluation submitted and locked.'
          : 'Evaluation draft saved.'
      );
      await loadAssignments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save evaluation.');
    }
  };

  const pendingCount = assignments.filter((a) => a.scoreStatus !== 'Submitted').length;
  const completedCount = assignments.filter((a) => a.scoreStatus === 'Submitted').length;

  const navItems: SidebarNavItem[] = [
    { id: 'assigned', label: 'Assigned Projects', icon: FolderKanban, badge: pendingCount },
    { id: 'review', label: 'Evaluation Scorecard', icon: ClipboardCheck },
  ];

  const isLocked = detail?.evaluation?.status === 'Submitted';

  return (
    <PortalLayout
      title="Judge Portal"
      subtitle="APPTHON · Confidential Judging & 100-Point Evaluation"
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

      {activeTab === 'assigned' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <SurfaceCard>
              <p className="text-xs text-white/50 uppercase">Assigned Projects</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
                {assignments.length}
              </p>
            </SurfaceCard>
            <SurfaceCard>
              <p className="text-xs text-white/50 uppercase">Pending Evaluations</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-amber-300 tabular-nums">
                {pendingCount}
              </p>
            </SurfaceCard>
            <SurfaceCard>
              <p className="text-xs text-white/50 uppercase">Completed Evaluations</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-emerald-400 tabular-nums">
                {completedCount}
              </p>
            </SurfaceCard>
          </div>

          <SurfaceCard>
            <h2 className="text-base font-semibold text-white">Your Assigned Projects</h2>
            {loading ? (
              <div className="mt-4 h-32 animate-pulse rounded-xl bg-white/5" />
            ) : assignments.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">
                No projects have been assigned to you yet by the organizers.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs text-white/50 uppercase">
                    <tr>
                      <th className="py-2.5 pr-4">Team</th>
                      <th className="py-2.5 pr-4">Application</th>
                      <th className="py-2.5 pr-4">Category</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5 pr-4 text-right">Score</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-3 pr-4 font-medium text-white">
                          {a.teamName}
                          <span className="ml-2 font-mono text-xs text-white/45">{a.teamCode}</span>
                        </td>
                        <td className="py-3 pr-4 text-white/80">{a.applicationName}</td>
                        <td className="py-3 pr-4 text-xs text-white/60">{a.category}</td>
                        <td className="py-3 pr-4">
                          <StatusText status={a.scoreStatus} />
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-white tabular-nums">
                          {a.totalScore !== null ? `${a.totalScore}/100` : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <PrimaryButton type="button" onClick={() => openAssignment(a.id)}>
                            {a.scoreStatus === 'Submitted' ? 'View' : 'Evaluate'}
                          </PrimaryButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SurfaceCard>
        </div>
      )}

      {activeTab === 'review' && (
        <div className="space-y-6">
          {!detail ? (
            <SurfaceCard>
              <p className="text-sm text-white/60">
                Select an assigned project from Assigned Projects to review and score it.
              </p>
            </SurfaceCard>
          ) : (
            <>
              <SurfaceCard>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <p className="font-mono text-xs text-[#A64AFF]">
                      {detail.team.teamCode} · {detail.team.category}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">
                      {detail.submission?.applicationName || detail.idea?.title || detail.team.name}
                    </h2>
                    <p className="text-xs text-white/60">Team: {detail.team.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('assigned')}
                    className="text-xs text-[#A64AFF] hover:underline cursor-pointer"
                  >
                    ← Back to Assigned Projects
                  </button>
                </div>

                {!detail.submission ? (
                  <p className="mt-4 text-sm text-amber-300">
                    This team has not submitted a final application yet. Idea details are shown below.
                  </p>
                ) : (
                  <div className="mt-5 space-y-5 text-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-white/50 uppercase">Problem Statement</p>
                        <p className="mt-1 text-white/85">{detail.submission.problemStatement}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/50 uppercase">Proposed Solution</p>
                        <p className="mt-1 text-white/85">{detail.submission.proposedSolution}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-white/50 uppercase">Application Description</p>
                      <p className="mt-1 text-white/85">{detail.submission.description}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-white/50 uppercase">Technology Stack</p>
                        <p className="mt-1 text-white/85">{detail.submission.techStack}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/50 uppercase">Live Application URL</p>
                        {isSafeHttpUrl(detail.submission.liveUrl) && detail.submission.liveUrl ? (
                          <a
                            href={detail.submission.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[#A64AFF] hover:underline"
                          >
                            Open App <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <p className="mt-1 text-white/45">Not provided</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-white/50 uppercase">Source Code URL</p>
                        {isSafeHttpUrl(detail.submission.sourceCodeUrl) &&
                        detail.submission.sourceCodeUrl ? (
                          <a
                            href={detail.submission.sourceCodeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[#A64AFF] hover:underline"
                          >
                            Open Repo <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <p className="mt-1 text-white/45">Not provided</p>
                        )}
                      </div>
                    </div>

                    {detail.submission.demoVideoFileId && (
                      <div>
                        <p className="text-xs text-white/50 uppercase mb-2">Demo Video</p>
                        <PrivateVideo
                          fileId={detail.submission.demoVideoFileId}
                          className="max-h-72 w-full rounded-xl border border-white/10"
                        />
                      </div>
                    )}

                    {detail.submission.demoVideoUrl &&
                      isSafeHttpUrl(detail.submission.demoVideoUrl) && (
                        <p>
                          <a
                            href={detail.submission.demoVideoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#A64AFF] hover:underline"
                          >
                            External Demo Video Link <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </p>
                      )}

                    {detail.submission.screenshotFileIds.length > 0 && (
                      <div>
                        <p className="text-xs text-white/50 uppercase mb-2">Screenshots</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {detail.submission.screenshotFileIds.map((fid, i) => (
                            <PrivateImage
                              key={fid}
                              fileId={fid}
                              alt={`Submission screenshot ${i + 1}`}
                              className="h-36 w-full rounded-xl border border-white/10 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </SurfaceCard>

              {/* Official 100-point scorecard */}
              <SurfaceCard>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Official 100-Point Evaluation Scorecard
                    </h3>
                    <p className="text-xs text-white/60">
                      Private evaluation — hidden from other judges prior to results approval.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 uppercase">
                        <Lock className="h-3.5 w-3.5" /> Locked
                      </span>
                    )}
                    <span className="font-mono text-2xl font-semibold text-[#A64AFF] tabular-nums">
                      {totalScore} / 100
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {JUDGING_RUBRIC.map((c) => (
                    <div
                      key={c.key}
                      className="rounded-xl border border-white/10 bg-[#080810] p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{c.label}</p>
                          <p className="text-xs text-white/55">{c.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={c.maxPoints}
                            step="0.5"
                            disabled={isLocked}
                            value={scores[c.key] ?? 0}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const clamped = Math.max(0, Math.min(c.maxPoints, Number.isNaN(raw) ? 0 : raw));
                              setScores((prev) => ({ ...prev, [c.key]: clamped }));
                            }}
                            className="w-24 rounded-lg border border-white/20 bg-[#0F0F1C] px-3 py-1.5 text-right font-mono text-sm text-white tabular-nums"
                          />
                          <span className="font-mono text-xs text-white/55 tabular-nums">
                            / {c.maxPoints}
                          </span>
                        </div>
                      </div>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={criterionComments[c.key] || ''}
                        onChange={(e) =>
                          setCriterionComments((prev) => ({ ...prev, [c.key]: e.target.value }))
                        }
                        placeholder="Criterion-specific remarks (optional)..."
                        className={inputClass}
                      />
                    </div>
                  ))}

                  <FormField label="Overall Judge Feedback" required>
                    <textarea
                      rows={3}
                      disabled={isLocked}
                      value={overallFeedback}
                      onChange={(e) => setOverallFeedback(e.target.value)}
                      placeholder="Summarize strengths, constructive suggestions, and overall evaluation..."
                      className={inputClass}
                    />
                  </FormField>

                  {!isLocked && (
                    <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={() => handleSaveScore(false)}
                        className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white hover:border-white/40 cursor-pointer"
                      >
                        Save Draft
                      </button>
                      <PrimaryButton type="button" onClick={() => handleSaveScore(true)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Submit Final Evaluation
                      </PrimaryButton>
                    </div>
                  )}
                </div>
              </SurfaceCard>
            </>
          )}
        </div>
      )}
    </PortalLayout>
  );
}

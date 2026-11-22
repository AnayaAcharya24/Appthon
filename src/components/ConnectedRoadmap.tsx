import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Compass,
  Layers,
  Presentation,
  type LucideIcon,
} from 'lucide-react';
import type { PublicRoadmapMilestone } from '../types/appthon';

export interface ConnectedRoadmapStage {
  number: string;
  week: string;
  shortTitle: string;
  fullTitle: string;
  schedule: string;
  activities: string[];
  expectedOutput: string;
  icon: LucideIcon;
}

export const OFFICIAL_ROADMAP_STAGES: ConnectedRoadmapStage[] = [
  {
    number: '01',
    week: 'WEEK 01',
    shortTitle: 'DISCOVER',
    fullTitle: 'REGISTRATION & IDEA DISCOVERY',
    schedule: 'To be announced',
    activities: [
      'Register participants',
      'Create teams',
      'Identify a problem',
      'Submit an idea proposal',
    ],
    expectedOutput: 'Approved team and project concept.',
    icon: Compass,
  },
  {
    number: '02',
    week: 'WEEK 02',
    shortTitle: 'PLAN',
    fullTitle: 'PLANNING & PROTOTYPING',
    schedule: 'To be announced',
    activities: [
      'Define features',
      'Create user flows',
      'Design wireframes',
      'Plan UI/UX',
      'Plan architecture and technology stack',
    ],
    expectedOutput: 'Prototype and development plan.',
    icon: Layers,
  },
  {
    number: '03',
    week: 'WEEK 03',
    shortTitle: 'BUILD',
    fullTitle: 'APPLICATION DEVELOPMENT',
    schedule: 'To be announced',
    activities: [
      'Build frontend and backend',
      'Connect database',
      'Implement features',
      'Test and debug',
    ],
    expectedOutput: 'Working application build.',
    icon: Code2,
  },
  {
    number: '04',
    week: 'WEEK 04',
    shortTitle: 'PRESENT',
    fullTitle: 'FINAL SUBMISSION & PRESENTATION',
    schedule: 'To be announced',
    activities: [
      'Submit application',
      'Upload demo video',
      'Upload screenshots',
      'Submit project details',
      'Present to judges',
    ],
    expectedOutput: 'Final demo, evaluation and results.',
    icon: Presentation,
  },
];

interface ConnectedRoadmapProps {
  milestones?: PublicRoadmapMilestone[];
}

const DESKTOP_CURVE_PATH =
  'M 125 60 C 212 50, 288 50, 375 60 C 462 70, 538 70, 625 60 C 712 50, 788 50, 875 60';

function cleanActivityText(text: string): string {
  return text.trim().replace(/\.+$/, '');
}

export function ConnectedRoadmap({ milestones }: ConnectedRoadmapProps) {
  const stages = useMemo<ConnectedRoadmapStage[]>(() => {
    if (!milestones || milestones.length === 0) {
      return OFFICIAL_ROADMAP_STAGES;
    }
    return OFFICIAL_ROADMAP_STAGES.map((base, idx) => {
      const override = milestones[idx];
      if (!override) return base;
      return {
        ...base,
        week: override.week || base.week,
        fullTitle: override.title || base.fullTitle,
        schedule: override.targetDate || base.schedule,
        activities:
          override.activities && override.activities.length > 0
            ? override.activities.map(cleanActivityText)
            : base.activities,
        expectedOutput: override.expectedOutput || base.expectedOutput,
      };
    });
  }, [milestones]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [desktopRevealed, setDesktopRevealed] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const [mobileRevealed, setMobileRevealed] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);

  const desktopTrackRef = useRef<HTMLDivElement | null>(null);
  const mobileItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setPrefersReducedMotion(mq.matches);
      if (mq.matches) {
        setScrollProgress(1);
        setDesktopRevealed([true, true, true, true]);
        setMobileRevealed([true, true, true, true]);
      }
    };
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  // Scroll-progress listener + IntersectionObserver for Desktop Connected Path
  useEffect(() => {
    if (prefersReducedMotion) return;

    let rafId = 0;

    const updateFromScroll = () => {
      rafId = 0;
      const el = desktopTrackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;

      // Progress 0 when track top reaches 88% of viewport height; 1 when top reaches 38%
      const startY = vh * 0.88;
      const endY = vh * 0.38;
      const raw = (startY - rect.top) / Math.max(1, startY - endY);
      const clamped = Math.max(0, Math.min(1, raw));

      setScrollProgress(clamped);
      setDesktopRevealed((prev) => [
        prev[0] || clamped >= 0.06,
        prev[1] || clamped >= 0.32,
        prev[2] || clamped >= 0.58,
        prev[3] || clamped >= 0.82,
      ]);
    };

    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateFromScroll);
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && desktopTrackRef.current) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            onScrollOrResize();
          }
        },
        { threshold: [0, 0.15, 0.35, 0.65, 1] },
      );
      io.observe(desktopTrackRef.current);
    }

    updateFromScroll();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      io?.disconnect();
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [prefersReducedMotion]);

  // IntersectionObserver for Mobile Vertical Timeline milestones
  useEffect(() => {
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') return;

    const observers: IntersectionObserver[] = [];
    mobileItemRefs.current.forEach((node, idx) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setMobileRevealed((prev) => {
              if (prev[idx]) return prev;
              const next = [...prev];
              next[idx] = true;
              return next;
            });
            observer.disconnect();
          }
        },
        { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
      );
      observer.observe(node);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [prefersReducedMotion, stages.length]);

  const activeStage = stages[activeIndex] || stages[0];
  const scrollPathPercent = Math.round(scrollProgress * 1000) / 10;
  const selectedSegmentPercent = (activeIndex / Math.max(1, stages.length - 1)) * 100;

  const highestMobileVisible = mobileRevealed.reduce(
    (highest, isVis, idx) => (isVis ? idx : highest),
    -1,
  );
  const mobileProgressPercent =
    highestMobileVisible <= 0
      ? highestMobileVisible === 0
        ? 12
        : 0
      : (highestMobileVisible / (stages.length - 1)) * 100;

  const handleSelectStage = (idx: number) => {
    setActiveIndex(idx);
    setDesktopRevealed((prev) => {
      if (prev[idx]) return prev;
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  };

  return (
    <section
      id="roadmap"
      aria-labelledby="roadmap-heading"
      className="relative scroll-mt-24 overflow-hidden px-5 py-24 sm:scroll-mt-28 sm:px-10 sm:py-32"
    >
      {/* Subtle static ambient violet lighting behind the roadmap */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 72% 46% at 50% 42%, rgba(50, 16, 92, 0.26) 0%, rgba(33, 16, 57, 0.14) 45%, rgba(8, 8, 18, 0) 78%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px]">
        {/* Section Introduction — compact, elegant, centre-aligned */}
        <div className="mx-auto max-w-[760px] text-center">
          <p className="font-body text-[11px] font-medium tracking-[0.26em] text-[#C4A1FF] uppercase sm:text-xs">
            THE APPTHON ROADMAP
          </p>
          <h2
            id="roadmap-heading"
            className="mt-3 font-display text-3xl tracking-tight text-white sm:text-5xl text-balance"
          >
            YOUR JOURNEY. YOUR FOUR WEEKS. YOUR CREATION.
          </h2>
          <p className="mx-auto mt-4 max-w-[640px] font-body text-sm leading-relaxed text-[#B8B4C7] sm:text-base">
            From your first idea to your final application, follow the four-week journey that turns
            imagination into innovation.
          </p>
        </div>

        {/* DESKTOP & TABLET: Horizontal Connected Path */}
        <div ref={desktopTrackRef} className="hidden md:block mt-14">
          <div className="relative mx-auto max-w-[1120px]">
            {/* Continuous Gently Curved Connecting Path */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[120px]"
            >
              <svg
                viewBox="0 0 1000 120"
                preserveAspectRatio="none"
                className="h-full w-full overflow-visible"
              >
                <defs>
                  <linearGradient id="appthon-path-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#C4A1FF" />
                    <stop offset="52%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#9333EA" />
                  </linearGradient>
                  <linearGradient id="appthon-active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E9C6FF" />
                    <stop offset="55%" stopColor="#C4A1FF" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                </defs>

                {/* Base remaining portion (subtle, low-opacity track) */}
                <path
                  d={DESKTOP_CURVE_PATH}
                  fill="none"
                  stroke="rgba(196, 161, 255, 0.16)"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Softly illuminated scroll-triggered path from left to right */}
                <path
                  d={DESKTOP_CURVE_PATH}
                  fill="none"
                  stroke="url(#appthon-path-grad)"
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={100}
                  strokeDasharray="100"
                  strokeDashoffset={Math.max(0, 100 - scrollPathPercent)}
                  style={{
                    opacity: activeIndex > 0 ? 0.55 : 0.92,
                    filter: 'drop-shadow(0 0 7px rgba(168, 85, 247, 0.42))',
                    transition: prefersReducedMotion
                      ? 'none'
                      : 'stroke-dashoffset 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease',
                  }}
                />

                {/* Completed / active portion up to the selected milestone */}
                {activeIndex > 0 && (
                  <path
                    d={DESKTOP_CURVE_PATH}
                    fill="none"
                    stroke="url(#appthon-active-grad)"
                    strokeWidth={2.75}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    pathLength={100}
                    strokeDasharray="100"
                    strokeDashoffset={Math.max(0, 100 - selectedSegmentPercent)}
                    style={{
                      filter: 'drop-shadow(0 0 10px rgba(196, 161, 255, 0.55))',
                      transition: prefersReducedMotion
                        ? 'none'
                        : 'stroke-dashoffset 450ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                )}
              </svg>
            </div>

            {/* Four Evenly Spaced Milestones Along the Path */}
            <div
              role="tablist"
              aria-label="Four-week APPTHON roadmap milestones"
              className="relative z-10 grid grid-cols-4"
            >
              {stages.map((stage, idx) => {
                const Icon = stage.icon;
                const isSelected = activeIndex === idx;
                const isRevealed = desktopRevealed[idx] || prefersReducedMotion;
                const isLitByScroll = scrollProgress >= idx * 0.27;
                const isActiveVisual = isSelected || isLitByScroll;

                return (
                  <button
                    key={stage.week}
                    type="button"
                    role="tab"
                    id={`roadmap-tab-${stage.number}`}
                    aria-selected={isSelected}
                    aria-controls="roadmap-detail-panel"
                    onClick={() => handleSelectStage(idx)}
                    style={{
                      opacity: isRevealed ? 1 : 0,
                      transform: isRevealed ? 'translateY(0)' : 'translateY(18px)',
                      transition: prefersReducedMotion
                        ? 'none'
                        : `opacity 550ms cubic-bezier(0.16, 1, 0.3, 1) ${idx * 70}ms, transform 550ms cubic-bezier(0.16, 1, 0.3, 1) ${idx * 70}ms`,
                    }}
                    className="group flex flex-col items-center px-2.5 text-center focus:outline-none cursor-pointer lg:px-4"
                  >
                    {/* Milestone Circle Track (120px tall to align precisely with SVG y=60) */}
                    <div className="flex h-[120px] w-full items-center justify-center">
                      <span
                        className={`relative flex h-[74px] w-[74px] items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 lg:h-[82px] lg:w-[82px] group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-[#C4A1FF] group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-[#080812] ${
                          isSelected
                            ? 'border-[#C4A1FF] bg-gradient-to-br from-[#32105C]/92 via-[#211039]/92 to-[#101329]/95 text-white shadow-[0_0_0_4px_rgba(196,161,255,0.12),0_0_32px_rgba(147,51,234,0.5)]'
                            : isActiveVisual
                              ? 'border-[#C4A1FF]/60 bg-[#0D1024]/82 text-white shadow-[0_0_22px_rgba(168,85,247,0.22)] group-hover:border-[#C4A1FF]/90 group-hover:shadow-[0_0_26px_rgba(196,161,255,0.3)]'
                              : 'border-[#C4A1FF]/35 bg-[#0A0C1B]/82 text-white/90 group-hover:border-[#C4A1FF]/75'
                        }`}
                      >
                        <span className="font-mono text-lg font-semibold tracking-wider text-white tabular-nums lg:text-xl">
                          {stage.number}
                        </span>
                      </span>
                    </div>

                    {/* Stage Identifier + Icon + Short Title (refined visual hierarchy) */}
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-[0.22em] text-[#C4A1FF] uppercase">
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{stage.week}</span>
                    </div>

                    <h3
                      className={`mt-2 font-body text-lg font-semibold tracking-wide transition-colors duration-200 lg:text-xl ${
                        isSelected ? 'text-white' : 'text-white/90 group-hover:text-white'
                      }`}
                    >
                      {stage.shortTitle}
                    </h3>

                    <p className="mt-2 max-w-[235px] font-body text-[11px] font-medium tracking-[0.12em] leading-snug text-[#DDD8EE] uppercase">
                      {stage.fullTitle}
                    </p>

                    <p className="mt-2 max-w-[235px] font-body text-xs leading-relaxed text-[#B8B4C7]/85">
                      {stage.expectedOutput}
                    </p>

                    {/* Active underline indicator */}
                    <span
                      aria-hidden="true"
                      className={`mt-3.5 h-0.5 rounded-full transition-all duration-300 ${
                        isSelected
                          ? 'w-12 bg-gradient-to-r from-[#C4A1FF] to-[#9333EA]'
                          : 'w-4 bg-[#C4A1FF]/15 group-hover:w-8 group-hover:bg-[#C4A1FF]/50'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expandable Stage Details Panel Beneath the Path */}
          <div
            id="roadmap-detail-panel"
            role="tabpanel"
            aria-labelledby={`roadmap-tab-${activeStage.number}`}
            className="mx-auto mt-12 max-w-[1120px] rounded-2xl border border-[#C4A1FF]/20 bg-[#101329]/70 p-7 backdrop-blur-md shadow-[inset_0_1px_0_rgba(196,161,255,0.12),0_20px_50px_rgba(8,8,18,0.5)] transition-all duration-300 lg:p-9"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold tracking-[0.2em] text-[#C4A1FF] uppercase">
                  <span>{activeStage.week}</span>
                  <span aria-hidden="true" className="text-[#C4A1FF]/40">
                    —
                  </span>
                  <span>{activeStage.shortTitle}</span>
                </div>
                <h4 className="mt-2 font-body text-xl font-semibold text-white lg:text-2xl">
                  {activeStage.fullTitle}
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#C4A1FF]/25 bg-[#151226] px-3.5 py-1.5 text-xs text-[#B8B4C7]">
                  Schedule: <span className="font-medium text-white">{activeStage.schedule}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllDetails((prev) => !prev)}
                  className="rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-[#C4A1FF] transition-colors hover:border-[#C4A1FF]/50 hover:bg-white/[0.07] cursor-pointer"
                >
                  {showAllDetails ? 'Focused View' : 'View All Four Weeks'}
                </button>
              </div>
            </div>

            {!showAllDetails ? (
              <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-7">
                  <p className="text-xs font-semibold tracking-[0.18em] text-[#C4A1FF] uppercase">
                    Activities
                  </p>
                  <ul className="mt-3.5 space-y-2.5 text-sm text-white/90 lg:text-base">
                    {activeStage.activities.map((activity) => (
                      <li key={activity} className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A855F7]"
                        />
                        <span>{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col justify-between gap-6 rounded-xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-5 lg:p-6">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-[#C4A1FF] uppercase">
                      Expected Output
                    </p>
                    <p className="mt-2.5 text-base font-medium leading-relaxed text-white">
                      {activeStage.expectedOutput}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="font-mono text-xs text-[#B8B4C7] tabular-nums">
                      Stage {activeStage.number} of 0{stages.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Previous roadmap week"
                        disabled={activeIndex === 0}
                        onClick={() => handleSelectStage(Math.max(0, activeIndex - 1))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-[#C4A1FF]/60 hover:text-white disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next roadmap week"
                        disabled={activeIndex === stages.length - 1}
                        onClick={() =>
                          handleSelectStage(Math.min(stages.length - 1, activeIndex + 1))
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-[#C4A1FF]/60 hover:text-white disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {stages.map((stage, idx) => (
                  <div
                    key={stage.week}
                    onClick={() => handleSelectStage(idx)}
                    className={`rounded-xl border p-5 transition-colors cursor-pointer ${
                      idx === activeIndex
                        ? 'border-[#C4A1FF]/45 bg-[#16132B]/70'
                        : 'border-white/10 bg-white/[0.02] hover:border-[#C4A1FF]/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <span className="text-xs font-semibold tracking-[0.18em] text-[#C4A1FF] uppercase">
                        {stage.week} — {stage.shortTitle}
                      </span>
                      <span className="text-xs text-[#B8B4C7]">Schedule: {stage.schedule}</span>
                    </div>
                    <h5 className="mt-3 text-base font-semibold text-white">{stage.fullTitle}</h5>
                    <ul className="mt-3 space-y-1.5 text-sm text-white/85">
                      {stage.activities.map((activity) => (
                        <li key={activity} className="flex items-start gap-2.5">
                          <span
                            aria-hidden="true"
                            className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#A855F7]"
                          />
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 border-t border-white/10 pt-3 text-xs text-[#B8B4C7]">
                      <span className="font-semibold text-[#C4A1FF] uppercase">
                        Expected Output:{' '}
                      </span>
                      <span className="text-white/90">{stage.expectedOutput}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MOBILE: Vertical Connected Timeline */}
        <div className="md:hidden relative mt-12">
          {/* Continuous Vertical Connecting Line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[25px] top-6 bottom-6 w-[2px] rounded-full bg-[#C4A1FF]/15"
          >
            <div
              className="w-full rounded-full bg-gradient-to-b from-[#C4A1FF] via-[#A855F7] to-[#9333EA]"
              style={{
                height: `${mobileProgressPercent}%`,
                boxShadow: '0 0 10px rgba(168, 85, 247, 0.45)',
                transition: prefersReducedMotion
                  ? 'none'
                  : 'height 550ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>

          <div className="space-y-9">
            {stages.map((stage, idx) => {
              const Icon = stage.icon;
              const isSelected = activeIndex === idx;
              const isRevealed = mobileRevealed[idx] || prefersReducedMotion;

              return (
                <div
                  key={stage.week}
                  ref={(el) => {
                    mobileItemRefs.current[idx] = el;
                  }}
                  style={{
                    opacity: isRevealed ? 1 : 0,
                    transform: isRevealed ? 'translateY(0)' : 'translateY(18px)',
                    transition: prefersReducedMotion
                      ? 'none'
                      : 'opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="relative flex items-start gap-5"
                >
                  {/* Numbered Marker on Left */}
                  <button
                    type="button"
                    aria-label={`${stage.week} — ${stage.shortTitle}: ${stage.fullTitle}`}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectStage(idx)}
                    className={`relative z-10 flex h-13 w-13 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'border-[#C4A1FF] bg-gradient-to-br from-[#32105C]/92 via-[#211039]/92 to-[#101329]/95 text-white shadow-[0_0_0_3px_rgba(196,161,255,0.12),0_0_24px_rgba(147,51,234,0.48)]'
                        : isRevealed
                          ? 'border-[#C4A1FF]/60 bg-[#0D1024]/85 text-white shadow-[0_0_16px_rgba(168,85,247,0.22)]'
                          : 'border-[#C4A1FF]/35 bg-[#0A0C1B]/85 text-white/90'
                    }`}
                  >
                    <span className="font-mono text-sm font-semibold text-white tabular-nums">
                      {stage.number}
                    </span>
                  </button>

                  {/* Milestone Details on Right */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleSelectStage(idx)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-[#C4A1FF] uppercase">
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{stage.week}</span>
                        <span aria-hidden="true" className="text-[#C4A1FF]/40">
                          —
                        </span>
                        <span>{stage.shortTitle}</span>
                      </div>

                      <h3 className="mt-1.5 font-body text-base font-semibold text-white">
                        {stage.fullTitle}
                      </h3>
                      <p className="mt-1 text-xs text-[#B8B4C7]">
                        Schedule: <span className="text-white/90">{stage.schedule}</span>
                      </p>
                    </button>

                    <div
                      className={`mt-3 rounded-xl border p-4 backdrop-blur-sm transition-colors duration-200 ${
                        isSelected
                          ? 'border-[#C4A1FF]/35 bg-[#101329]/75'
                          : 'border-[#C4A1FF]/15 bg-[#0D0F22]/65'
                      }`}
                    >
                      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C4A1FF] uppercase">
                        Activities
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm text-white/85">
                        {stage.activities.map((activity) => (
                          <li key={activity} className="flex items-start gap-2.5">
                            <span
                              aria-hidden="true"
                              className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#A855F7]"
                            />
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-[#B8B4C7]">
                        <span className="font-semibold text-[#C4A1FF] uppercase">
                          Expected Output:{' '}
                        </span>
                        <span className="text-white/95">{stage.expectedOutput}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

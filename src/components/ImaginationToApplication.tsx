import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

const CYCLE_SECONDS = 18;

const STAGES = [
  { id: 0, code: '01', label: 'IDEA', targetProgress: 0.11, range: [0.0, 0.25] },
  { id: 1, code: '02', label: 'BLUEPRINT', targetProgress: 0.37, range: [0.25, 0.5] },
  { id: 2, code: '03', label: 'DEVELOPMENT', targetProgress: 0.63, range: [0.5, 0.74] },
  { id: 3, code: '04', label: 'APPLICATION', targetProgress: 0.84, range: [0.74, 1.0] },
] as const;

const ORBIT_PARTICLES = [
  { rx: 132, ry: 48, tilt: -18, speed: 0.85, phase: 0.0, size: 4.5, tone: '#FFFFFF' },
  { rx: 132, ry: 48, tilt: -18, speed: 0.85, phase: 2.1, size: 3.6, tone: '#38BDF8' },
  { rx: 132, ry: 48, tilt: -18, speed: 0.85, phase: 4.2, size: 4.0, tone: '#E879F9' },
  { rx: 98, ry: 38, tilt: 28, speed: -1.15, phase: 0.8, size: 4.2, tone: '#FFFFFF' },
  { rx: 98, ry: 38, tilt: 28, speed: -1.15, phase: 3.0, size: 3.3, tone: '#C4A1FF' },
  { rx: 98, ry: 38, tilt: 28, speed: -1.15, phase: 5.1, size: 3.7, tone: '#22D3EE' },
  { rx: 158, ry: 60, tilt: 8, speed: 0.62, phase: 1.4, size: 3.5, tone: '#FFFFFF' },
  { rx: 158, ry: 60, tilt: 8, speed: 0.62, phase: 3.8, size: 3.1, tone: '#A855F7' },
  { rx: 72, ry: 28, tilt: -42, speed: 1.38, phase: 2.5, size: 3.4, tone: '#E9C6FF' },
  { rx: 72, ry: 28, tilt: -42, speed: 1.38, phase: 5.5, size: 2.9, tone: '#38BDF8' },
] as const;

const CONNECTOR_RAYS = [
  { x2: 52, y2: 44, d: 'M 210 160 L 52 44', phase: 0.0 },
  { x2: 368, y2: 44, d: 'M 210 160 L 368 44', phase: 0.25 },
  { x2: 52, y2: 276, d: 'M 210 160 L 52 276', phase: 0.5 },
  { x2: 368, y2: 276, d: 'M 210 160 L 368 276', phase: 0.75 },
] as const;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(x: number): number {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function windowEnvelope(
  t: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
): number {
  return smoothstep(inStart, inEnd, t) * (1 - smoothstep(outStart, outEnd, t));
}

export function ImaginationToApplication() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<number>(0.08);
  const seekTargetRef = useRef<number | null>(null);
  const clockRef = useRef<number>(0);

  const [inView, setInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [frame, setFrame] = useState({ progress: 0.08, time: 0 });

  // Gentle scroll-linked parallax for floating ambient lavender halo
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const ambientGlowY = useTransform(scrollYProgress, [0, 1], [-24, 24]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setPrefersReducedMotion(mq.matches);
      if (mq.matches) {
        progressRef.current = 0.84;
        seekTargetRef.current = null;
        setFrame({ progress: 0.84, time: 0 });
      }
    };
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries.some((e) => e.isIntersecting));
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || prefersReducedMotion) return;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastTs) / 1000));
      lastTs = now;
      clockRef.current += dt;

      if (seekTargetRef.current !== null) {
        const diff = seekTargetRef.current - progressRef.current;
        if (Math.abs(diff) < 0.0025) {
          progressRef.current = seekTargetRef.current;
          seekTargetRef.current = null;
        } else {
          // Smooth exponential glide toward clicked stage without abrupt snapping
          progressRef.current += diff * (1 - Math.exp(-dt * 8.5));
        }
      } else {
        progressRef.current = (progressRef.current + dt / CYCLE_SECONDS) % 1;
      }

      setFrame({
        progress: progressRef.current,
        time: clockRef.current,
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [inView, prefersReducedMotion]);

  const t = frame.progress;
  const elapsed = frame.time;

  // Seamless continuous stage envelopes across all four stages
  const ideaMain = 1 - smoothstep(0.22, 0.4, t);
  const ideaReturn = smoothstep(0.9, 0.99, t);
  const ideaStrength = clamp01(Math.max(ideaMain, ideaReturn));

  const blueprintStrength = windowEnvelope(t, 0.14, 0.3, 0.56, 0.74);
  const devStrength = windowEnvelope(t, 0.4, 0.56, 0.78, 0.9);
  const appStrength = windowEnvelope(t, 0.66, 0.79, 0.91, 0.99);

  const activeStageIndex = t < 0.25 ? 0 : t < 0.5 ? 1 : t < 0.74 ? 2 : 3;

  // Subtle fluid floating & 3D spatial tilt
  const floatY = prefersReducedMotion ? 0 : Math.sin(elapsed * 1.15) * 7;
  const tiltX = prefersReducedMotion ? 2.5 : 3.2 * Math.sin(elapsed * 0.58) + appStrength * 1.8;
  const tiltY = prefersReducedMotion ? -3.5 : -4.8 * Math.cos(elapsed * 0.46);

  const blueprintDraw = clamp01(
    t < 0.5 ? easeInOutCubic((t - 0.14) / 0.28) : 1 - easeInOutCubic((t - 0.6) / 0.16),
  );

  // 0 = exploded floating UI panels (Development), 1 = assembled unified holographic window (Application)
  const rawAssemble = clamp01((t - 0.56) / 0.22);
  const rawDisassemble = 1 - clamp01((t - 0.91) / 0.08);
  const assembleFactor = easeInOutCubic(rawAssemble) * smoothstep(0.0, 1.0, rawDisassemble);
  const modulePresence = clamp01(Math.max(devStrength, appStrength));

  // Subtle independent component hover during Stage 03 before locking into Stage 04
  const looseFloat = 1 - assembleFactor * 0.8;
  const comp1FloatY = prefersReducedMotion ? 0 : Math.sin(elapsed * 1.45) * 4 * looseFloat;
  const comp2FloatY = prefersReducedMotion ? 0 : Math.sin(elapsed * 1.3 + 1.4) * 5 * looseFloat;
  const comp3FloatY = prefersReducedMotion ? 0 : Math.cos(elapsed * 1.5 + 0.7) * 4.5 * looseFloat;
  const comp4FloatY = prefersReducedMotion ? 0 : Math.sin(elapsed * 1.35 + 2.5) * 4.5 * looseFloat;

  // Animated chart bars during Development & Application
  const bar1 = prefersReducedMotion ? 48 : 42 + Math.sin(elapsed * 1.8) * 10;
  const bar2 = prefersReducedMotion ? 72 : 68 + Math.sin(elapsed * 1.8 + 1.1) * 13;
  const bar3 = prefersReducedMotion ? 60 : 58 + Math.cos(elapsed * 1.65 + 0.6) * 11;
  const bar4 = prefersReducedMotion ? 94 : 88 + Math.sin(elapsed * 2.05 + 2.0) * 9;

  // Controlled specular sheen across Stage 04 finished window (glides cleanly once per window hold)
  const sheenPhase = clamp01((t - 0.72) / 0.2);
  const sheenOffset = prefersReducedMotion ? 35 : -55 + easeInOutCubic(sheenPhase) * 210;

  // Smooth dissolve fade on global progress track at loop boundaries so wraparound is imperceptible
  const trackCycleFade = smoothstep(0.0, 0.035, t) * (1 - smoothstep(0.955, 0.995, t));
  const normalizedTrackPct = Math.min(100, (t / 0.955) * 100);

  const handleStageClick = (targetProgress: number) => {
    if (prefersReducedMotion) {
      progressRef.current = targetProgress;
      setFrame((prev) => ({ ...prev, progress: targetProgress }));
      return;
    }
    seekTargetRef.current = targetProgress;
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Continuous four-stage holographic animation showing an idea becoming a blueprint, floating interface panels, and a complete application"
      className="relative flex w-full flex-col justify-between"
    >
      {/* Organic floating ambient lavender/violet radial halo fading softly into white (no rectangular card) */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-8 inset-y-0"
        style={{
          y: prefersReducedMotion ? 0 : ambientGlowY,
          background:
            'radial-gradient(ellipse 68% 58% at 50% 48%, rgba(168, 85, 247, 0.22) 0%, rgba(196, 161, 255, 0.26) 32%, rgba(233, 213, 255, 0.14) 56%, rgba(255, 255, 255, 0) 76%)',
        }}
      />

      {/* Unboxed Header integrated naturally into the floating composition */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-1">
        <span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-[#7024D8] uppercase sm:text-[11px]">
          From Imagination to Application
        </span>
        <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#101329] uppercase">
          <span className="text-[#7024D8]">{STAGES[activeStageIndex].code}</span>
          <span aria-hidden="true" className="mx-1.5 text-[#7024D8]/40">
            ·
          </span>
          <span>{STAGES[activeStageIndex].label}</span>
        </span>
      </div>

      {/* Freely Floating Holographic 3D/2D Stage */}
      <div
        className="relative z-10 my-4 flex h-[320px] w-full items-center justify-center sm:h-[370px] lg:h-[405px]"
        style={{ perspective: '1150px' }}
      >
        {/* Organic circular electric-purple holographic nebula orb strictly behind core/blueprint for rich contrast over white */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl sm:h-[310px] sm:w-[310px]"
          style={{
            background:
              'radial-gradient(circle, rgba(28, 12, 64, 0.88) 0%, rgba(76, 22, 154, 0.62) 40%, rgba(168, 85, 247, 0.22) 66%, rgba(255, 255, 255, 0) 84%)',
            opacity: 0.72 + ideaStrength * 0.24 + blueprintStrength * 0.22,
            transform: `scale(${0.92 + (ideaStrength + blueprintStrength) * 0.12})`,
          }}
        />

        {/* Soft ambient shadow on white floor underneath levitating hologram */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1/2 h-8 w-[68%] -translate-x-1/2 rounded-full blur-xl sm:bottom-2"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(22, 12, 48, 0.34) 0%, rgba(112, 36, 216, 0.16) 50%, rgba(255, 255, 255, 0) 80%)',
            transform: `scale(${0.86 + modulePresence * 0.18}, ${1 - (floatY / 60)})`,
          }}
        />

        <div
          className="relative flex h-full w-full items-center justify-center"
          style={{
            transform: `translate3d(0, ${floatY}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* SVG LAYER: Luminous Electric-Violet/Magenta/Cyan Idea Core + Rings + Wireframe Blueprint */}
          <svg
            viewBox="0 0 420 320"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="idea-core-bloom" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="18%" stopColor="#F5D0FE" stopOpacity="0.96" />
                <stop offset="38%" stopColor="#C026D3" stopOpacity="0.72" />
                <stop offset="62%" stopColor="#7024D8" stopOpacity="0.42" />
                <stop offset="82%" stopColor="#38BDF8" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#1E103D" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="blueprint-luminous" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.96" />
                <stop offset="45%" stopColor="#E9C6FF" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#D946EF" stopOpacity="0.92" />
              </linearGradient>
              <linearGradient id="blueprint-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E103D" stopOpacity="0.88" />
                <stop offset="55%" stopColor="#2B1258" stopOpacity="0.82" />
                <stop offset="100%" stopColor="#121432" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* STAGE 2: Rich Electric Blueprint Wireframes & Energy Pulses */}
            <g style={{ opacity: blueprintStrength }}>
              <circle
                cx="210"
                cy="160"
                r="138"
                fill="none"
                stroke="rgba(56, 189, 248, 0.45)"
                strokeWidth="1.1"
                strokeDasharray="3 5"
                pathLength={100}
                strokeDashoffset={100 * (1 - blueprintDraw)}
              />
              <circle
                cx="210"
                cy="160"
                r="92"
                fill="none"
                stroke="rgba(232, 121, 249, 0.55)"
                strokeWidth="1.2"
                pathLength={100}
                strokeDashoffset={100 * (1 - blueprintDraw)}
              />

              {['M 210 22 L 210 298', 'M 28 160 L 392 160'].map((d) => (
                <path
                  key={d}
                  d={d}
                  fill="none"
                  stroke="rgba(196, 161, 255, 0.46)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  pathLength={100}
                  strokeDashoffset={100 * (1 - blueprintDraw)}
                />
              ))}

              {CONNECTOR_RAYS.map((ray, idx) => {
                const pulsePos = (elapsed * 0.52 + ray.phase) % 1;
                const px = 210 + (ray.x2 - 210) * pulsePos;
                const py = 160 + (ray.y2 - 160) * pulsePos;
                const pulseColor = idx % 2 === 0 ? '#38BDF8' : '#E879F9';
                return (
                  <g key={ray.d}>
                    <path
                      d={ray.d}
                      fill="none"
                      stroke="rgba(233, 198, 255, 0.58)"
                      strokeWidth="1.25"
                      strokeDasharray="4 4"
                      pathLength={100}
                      strokeDashoffset={100 * (1 - blueprintDraw)}
                    />
                    <circle
                      cx={px}
                      cy={py}
                      r="6.5"
                      fill={pulseColor}
                      opacity={0.38 * blueprintDraw}
                    />
                    <circle cx={px} cy={py} r="2.6" fill="#FFFFFF" opacity={blueprintDraw} />
                  </g>
                );
              })}

              {/* Rich Dark-Purple Wireframe Shell contrasting sharply against white */}
              <rect
                x="52"
                y="44"
                width="316"
                height="232"
                rx="18"
                fill="url(#blueprint-fill)"
                stroke="url(#blueprint-luminous)"
                strokeWidth="1.75"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={100 * (1 - blueprintDraw)}
                style={{
                  filter: 'drop-shadow(0 18px 34px rgba(33, 16, 57, 0.34))',
                }}
              />

              <line
                x1="52"
                y1="84"
                x2="368"
                y2="84"
                stroke="rgba(233, 198, 255, 0.72)"
                strokeWidth="1.2"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={100 * (1 - blueprintDraw)}
              />
              <rect
                x="68"
                y="100"
                width="118"
                height="158"
                rx="11"
                fill="rgba(112, 36, 216, 0.26)"
                stroke="rgba(232, 121, 249, 0.76)"
                strokeWidth="1.25"
                strokeDasharray="4 3"
                pathLength={100}
                strokeDashoffset={100 * (1 - blueprintDraw)}
              />
              <rect
                x="200"
                y="100"
                width="152"
                height="74"
                rx="11"
                fill="rgba(56, 189, 248, 0.14)"
                stroke="rgba(56, 189, 248, 0.78)"
                strokeWidth="1.25"
                pathLength={100}
                strokeDashoffset={100 * (1 - blueprintDraw)}
              />
              <rect
                x="200"
                y="186"
                width="152"
                height="72"
                rx="11"
                fill="rgba(168, 85, 247, 0.22)"
                stroke="rgba(233, 198, 255, 0.78)"
                strokeWidth="1.25"
                pathLength={100}
                strokeDashoffset={100 * (1 - blueprintDraw)}
              />

              {[
                [52, 44],
                [368, 44],
                [52, 276],
                [368, 276],
                [210, 160],
              ].map(([cx, cy], idx) => (
                <g key={`${cx}-${cy}`} opacity={blueprintDraw}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="6.5"
                    fill={idx % 2 === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(232, 121, 249, 0.45)'}
                  />
                  <circle cx={cx} cy={cy} r="3.2" fill="#FFFFFF" />
                </g>
              ))}
            </g>

            {/* STAGE 1: Vibrant Holographic Idea Core + Energy Rings + Orbiting Particles */}
            <g
              style={{
                opacity: clamp01(ideaStrength + blueprintStrength * 0.55),
              }}
            >
              <circle
                cx="210"
                cy="160"
                r={96 + ideaStrength * 34}
                fill="url(#idea-core-bloom)"
              />

              {/* Layered orbiting electric-violet, magenta, and cyan-blue energy rings */}
              {[-18, 28, 8].map((deg, idx) => (
                <ellipse
                  key={deg}
                  cx="210"
                  cy="160"
                  rx={idx === 0 ? 132 : idx === 1 ? 98 : 158}
                  ry={idx === 0 ? 48 : idx === 1 ? 38 : 60}
                  transform={`rotate(${deg + (elapsed * (idx % 2 === 0 ? 5.5 : -7.5)) % 360} 210 160)`}
                  fill="none"
                  stroke={
                    idx === 1
                      ? 'rgba(56, 189, 248, 0.65)'
                      : idx === 0
                        ? 'rgba(232, 121, 249, 0.6)'
                        : 'rgba(168, 85, 247, 0.45)'
                  }
                  strokeWidth={idx === 1 ? '1.35' : '1.15'}
                  strokeDasharray={idx === 2 ? '8 6' : undefined}
                  style={{ opacity: clamp01(ideaStrength + blueprintStrength * 0.25) }}
                />
              ))}

              {/* Multi-layered luminous central idea prism */}
              <g
                transform={`translate(210, 160) rotate(${(elapsed * 18) % 360}) scale(${0.92 + ideaStrength * 0.44})`}
              >
                <polygon
                  points="0,-42 35,0 0,42 -35,0"
                  fill="rgba(168, 85, 247, 0.45)"
                  stroke="#FFFFFF"
                  strokeWidth="1.85"
                  style={{ filter: 'drop-shadow(0 0 14px rgba(217, 70, 239, 0.85))' }}
                />
                <polygon
                  points="0,-28 23,0 0,28 -23,0"
                  fill="rgba(232, 121, 249, 0.7)"
                  stroke="#38BDF8"
                  strokeWidth="1.35"
                />
                <polygon points="0,-15 13,0 0,15 -13,0" fill="#FFFFFF" />
                <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
              </g>

              {/* Orbiting luminous particles */}
              {ORBIT_PARTICLES.map((p, idx) => {
                const angle = elapsed * p.speed + p.phase;
                const lx = p.rx * Math.cos(angle);
                const ly = p.ry * Math.sin(angle);
                const rad = (p.tilt * Math.PI) / 180;
                const px = 210 + lx * Math.cos(rad) - ly * Math.sin(rad);
                const py = 160 + lx * Math.sin(rad) + ly * Math.cos(rad);
                const depthScale = 0.82 + 0.42 * ((Math.sin(angle) + 1) / 2);

                return (
                  <g key={idx} style={{ opacity: clamp01(ideaStrength + blueprintStrength * 0.42) }}>
                    <circle
                      cx={px}
                      cy={py}
                      r={p.size * 2.6 * depthScale}
                      fill={p.tone}
                      opacity="0.34"
                    />
                    <circle cx={px} cy={py} r={p.size * depthScale} fill={p.tone} />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* STAGE 3 & 4: Freely Floating Rich Dark-Purple Holographic UI -> Complete Application Window */}
          <div
            className="relative h-[246px] w-full max-w-[336px] sm:h-[282px] sm:max-w-[400px]"
            style={{
              opacity: modulePresence,
              transform: `scale(${0.92 + modulePresence * 0.08})`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Unified Application Holographic Shell */}
            <div
              className="absolute inset-0 overflow-hidden rounded-2xl border bg-gradient-to-br from-[#23124A] via-[#17113A] to-[#0E0F29]"
              style={{
                opacity: assembleFactor,
                borderColor: `rgba(233, 198, 255, ${0.42 + appStrength * 0.36})`,
                boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.48), 0 28px 56px rgba(16, 12, 42, 0.36), 0 0 ${28 + appStrength * 26}px rgba(168, 85, 247, ${0.32 + appStrength * 0.24})`,
              }}
            >
              {/* Luminous cyan-violet-magenta edge glow inside shell */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full opacity-55 blur-2xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(217, 70, 239, 0.32) 55%, transparent 100%)',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-44 -skew-x-12"
                style={{
                  left: `${sheenOffset}%`,
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
                  opacity: appStrength,
                }}
              />
            </div>

            {/* Component 1: Top Window Bar */}
            <div
              className="absolute inset-x-3.5 top-3.5 flex h-10 items-center justify-between rounded-xl border border-[#E9C6FF]/45 bg-gradient-to-r from-[#2D1660]/95 via-[#21134A]/95 to-[#17204D]/95 px-3.5"
              style={{
                transform: `translate3d(0, ${(1 - assembleFactor) * -26 + comp1FloatY}px, ${(1 - assembleFactor) * 34}px)`,
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.42), 0 14px 28px rgba(16,12,42,0.3)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E879F9] shadow-[0_0_8px_rgba(232,121,249,0.75)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#C4A1FF]" />
                <span className="ml-2 h-1.5 w-16 rounded-full bg-white/95" />
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block h-1.5 w-9 rounded-full bg-[#38BDF8]/70" />
                <span className="rounded-md bg-gradient-to-r from-[#A855F7] to-[#D946EF] px-2.5 py-0.5 font-mono text-[8px] font-bold tracking-wider text-white uppercase shadow-[0_0_12px_rgba(217,70,239,0.55)]">
                  LIVE
                </span>
              </div>
            </div>

            {/* Component 2: Left Analytics & UI Core Module */}
            <div
              className="absolute left-3.5 top-[64px] bottom-3.5 flex w-[38%] flex-col justify-between rounded-xl border border-[#C4A1FF]/50 bg-gradient-to-b from-[#2E1563] via-[#1C1242] to-[#121232] p-3.5"
              style={{
                transform: `translate3d(${(1 - assembleFactor) * -32}px, ${(1 - assembleFactor) * 14 + comp2FloatY}px, ${(1 - assembleFactor) * 50}px)`,
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.38), 0 18px 34px rgba(16,12,42,0.32)',
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
                  <span className="font-mono text-[9px] font-semibold tracking-wider text-[#E9C6FF]">
                    METRICS
                  </span>
                </div>
                <div className="h-2 w-4/5 rounded-full bg-white" />
                <div className="h-1.5 w-3/5 rounded-full bg-[#C4A1FF]/85" />
              </div>

              <div className="my-2 flex h-14 items-end gap-1.5 rounded-lg border border-white/20 bg-[#0A0A1E]/70 px-2.5 py-2">
                <span
                  className="w-1/4 rounded-t bg-gradient-to-t from-[#7024D8] to-[#C4A1FF]"
                  style={{ height: `${bar1}%` }}
                />
                <span
                  className="w-1/4 rounded-t bg-gradient-to-t from-[#9333EA] to-[#E879F9]"
                  style={{ height: `${bar2}%` }}
                />
                <span
                  className="w-1/4 rounded-t bg-gradient-to-t from-[#0284C7] to-[#38BDF8]"
                  style={{ height: `${bar3}%` }}
                />
                <span
                  className="w-1/4 rounded-t bg-gradient-to-t from-[#E9C6FF] to-white shadow-[0_0_10px_rgba(255,255,255,0.65)]"
                  style={{ height: `${bar4}%` }}
                />
              </div>

              <div className="flex items-center justify-between border-t border-white/20 pt-2">
                <span className="h-1.5 w-10 rounded-full bg-white/85" />
                <span className="h-3.5 w-3.5 rounded-full border border-white bg-gradient-to-br from-[#38BDF8] to-[#9333EA]" />
              </div>
            </div>

            {/* Component 3: Top-Right Electric Violet-Cyan Growth Chart Card */}
            <div
              className="absolute right-3.5 top-[64px] h-[86px] w-[52%] rounded-xl border border-[#38BDF8]/45 bg-gradient-to-br from-[#341369] via-[#1C1445] to-[#12163B] p-3.5 sm:h-[98px]"
              style={{
                transform: `translate3d(${(1 - assembleFactor) * 30}px, ${(1 - assembleFactor) * -10 + comp3FloatY}px, ${(1 - assembleFactor) * 58}px)`,
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.4), 0 18px 34px rgba(16,12,42,0.32)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="h-1.5 w-16 rounded-full bg-white" />
                <span className="font-mono text-[8px] font-semibold tracking-wider text-[#38BDF8]">
                  APPTHON
                </span>
              </div>
              <svg viewBox="0 0 160 44" className="mt-2 h-10 w-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id="mini-app-area-rich" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.46" />
                    <stop offset="52%" stopColor="#D946EF" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#32105C" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="mini-app-line-rich" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E879F9" />
                    <stop offset="55%" stopColor="#E9C6FF" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                <path
                  d="M 4 36 C 28 32, 42 16, 68 20 C 92 24, 114 8, 154 6 L 154 42 L 4 42 Z"
                  fill="url(#mini-app-area-rich)"
                />
                <path
                  d="M 4 36 C 28 32, 42 16, 68 20 C 92 24, 114 8, 154 6"
                  fill="none"
                  stroke="url(#mini-app-line-rich)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.75))' }}
                />
                <circle cx="154" cy="6" r="7.5" fill="rgba(56, 189, 248, 0.36)" />
                <circle cx="154" cy="6" r="3.2" fill="#FFFFFF" />
              </svg>
            </div>

            {/* Component 4: Bottom-Right Magenta-Violet Action Card */}
            <div
              className="absolute right-3.5 bottom-3.5 flex h-[84px] w-[52%] flex-col justify-between rounded-xl border border-[#E879F9]/45 bg-gradient-to-br from-[#2B145B] via-[#1C1240] to-[#131434] p-3.5 sm:h-[98px]"
              style={{
                transform: `translate3d(${(1 - assembleFactor) * 24}px, ${(1 - assembleFactor) * 24 + comp4FloatY}px, ${(1 - assembleFactor) * 38}px)`,
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.4), 0 18px 34px rgba(16,12,42,0.32)',
              }}
            >
              <div className="space-y-1.5">
                <div className="h-2 w-4/5 rounded-full bg-white" />
                <div className="h-1.5 w-3/5 rounded-full bg-[#E9C6FF]/85" />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex -space-x-1.5">
                  <span className="h-4 w-4 rounded-full border border-[#101329] bg-[#38BDF8]" />
                  <span className="h-4 w-4 rounded-full border border-[#101329] bg-[#E879F9]" />
                  <span className="h-4 w-4 rounded-full border border-[#101329] bg-white" />
                </div>
                <span className="rounded-md border border-white/55 bg-gradient-to-r from-[#7024D8] via-[#A855F7] to-[#D946EF] px-2.5 py-1 font-mono text-[8px] font-bold tracking-wider text-white uppercase shadow-[0_0_14px_rgba(217,70,239,0.5)]">
                  LAUNCH
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Interactive 4-Stage Progress Indicator (integrated naturally over white background) */}
      <div className="relative z-10 px-1 pt-2">
        {/* Continuous gradient progress line */}
        <div className="mb-3 h-[2px] w-full overflow-hidden rounded-full bg-[#101329]/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7024D8] via-[#A855F7] to-[#38BDF8] shadow-[0_0_10px_rgba(112,36,216,0.45)] transition-opacity duration-300"
            style={{
              width: `${Math.max(4, Math.round(normalizedTrackPct * 10) / 10)}%`,
              opacity: trackCycleFade,
            }}
          />
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {STAGES.map((stage, idx) => {
            const isCurrent = activeStageIndex === idx;
            return (
              <button
                key={stage.code}
                type="button"
                onClick={() => handleStageClick(stage.targetProgress)}
                className="group flex flex-col items-start text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7024D8] rounded-sm cursor-pointer"
              >
                <span
                  className={`h-[3px] w-full rounded-full transition-all duration-500 ease-out ${
                    isCurrent
                      ? 'bg-gradient-to-r from-[#7024D8] via-[#A855F7] to-[#D946EF] shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                      : 'bg-[#101329]/16 group-hover:bg-[#7024D8]/45'
                  }`}
                />
                <span
                  className={`mt-2 font-mono text-[9px] tracking-[0.12em] uppercase transition-colors duration-500 sm:text-[10px] ${
                    isCurrent
                      ? 'font-bold text-[#101329]'
                      : 'font-medium text-[#4E516F] group-hover:text-[#7024D8]'
                  }`}
                >
                  <span className={isCurrent ? 'text-[#7024D8]' : undefined}>{stage.code}</span>{' '}
                  {stage.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

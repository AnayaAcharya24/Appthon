import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, MotionConfig, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  Brain,
  Briefcase,
  ChevronDown,
  Globe,
  GraduationCap,
  HeartPulse,
  MapPin,
  Sprout,
  Trophy,
  Wallet,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ConnectedRoadmap } from '../components/ConnectedRoadmap';
import { ImaginationToApplication } from '../components/ImaginationToApplication';
import { apiFetch } from '../lib/api';
import { JUDGING_RUBRIC, type Announcement, type EventSettings } from '../types/appthon';

const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4';

const CATEGORIES = [
  {
    title: 'ARTIFICIAL INTELLIGENCE',
    description: 'AI-powered tools, assistants and automation.',
    icon: Brain,
  },
  {
    title: 'FINTECH',
    description: 'Financial tools, budgeting and payments.',
    icon: Wallet,
  },
  {
    title: 'EDTECH',
    description: 'Learning, student productivity and education access.',
    icon: GraduationCap,
  },
  {
    title: 'HEALTHTECH',
    description: 'Wellness, healthcare access and health administration.',
    icon: HeartPulse,
  },
  {
    title: 'AGRITECH',
    description: 'Agriculture, supply chains and rural innovation.',
    icon: Sprout,
  },
  {
    title: 'BUSINESS & PRODUCTIVITY',
    description: 'CRM, workflow, inventory and business operations.',
    icon: Briefcase,
  },
  {
    title: 'SOCIAL IMPACT',
    description: 'Community services and accessibility.',
    icon: Globe,
  },
];

const REVEAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const VIEWPORT_CONFIG = { once: true, amount: 0.16 } as const;

export function LandingPage() {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const heroAboutRef = useRef<HTMLDivElement | null>(null);
  const aboutSectionRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress: heroOverlapProgress } = useScroll({
    target: heroAboutRef,
    offset: ['start start', 'end start'],
  });

  const { scrollYProgress: aboutParallaxProgress } = useScroll({
    target: aboutSectionRef,
    offset: ['start end', 'end start'],
  });

  const heroContentOpacity = useTransform(heroOverlapProgress, [0, 0.42], [1, 0.28]);
  const heroContentScale = useTransform(heroOverlapProgress, [0, 0.48], [1, 0.965]);
  const heroContentY = useTransform(heroOverlapProgress, [0, 0.48], [0, -26]);
  const aboutAmbientY = useTransform(aboutParallaxProgress, [0, 1], [-28, 28]);

  useEffect(() => {
    apiFetch<{ settings: EventSettings; announcements: Announcement[] }>('/public/settings')
      .then((data) => {
        setSettings(data.settings);
        setAnnouncements(data.announcements || []);
      })
      .catch(() => {
        // Keep confirmed default content if settings cannot be reached
      });
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [location.hash]);

  const faqs = [
    {
      q: 'What is APPTHON?',
      a: 'APPTHON is a student-focused application-building competition organized by Skill AI in Mangaluru, Karnataka, India. Teams of 2–5 students transform innovative ideas into functional digital products over one month and present them to an expert judging panel.',
    },
    {
      q: 'Who can participate?',
      a:
        settings?.eligibilityInfo ||
        'College and university students from different academic backgrounds interested in technology, AI, entrepreneurship, design and problem-solving may participate in teams of 2–5 members. Cross-disciplinary teams are encouraged, subject to final rules.',
    },
    {
      q: 'How many members can a team have?',
      a: 'Each team must have a minimum of 2 members and a maximum of 5 members, with exactly one designated team leader.',
    },
    {
      q: 'Is registration free?',
      a: 'Yes. Registration for APPTHON is completely free.',
    },
    {
      q: 'What are the application categories?',
      a: 'Teams can build across seven categories: Artificial Intelligence, FinTech, EdTech, HealthTech, AgriTech, Business & Productivity, and Social Impact.',
    },
    {
      q: 'How long does the competition last?',
      a: 'The competition lasts one month across four structured weekly phases: Registration & Idea Discovery, Planning & Prototyping, Application Development, and Final Submission & Presentation.',
    },
    {
      q: 'How does judging work?',
      a: 'Projects are evaluated on a 100-point rubric: Innovation and originality (20), Problem-solving effectiveness (20), Functional application (20), UI/UX and user experience (15), Technical implementation (15), and Presentation and scalability (10).',
    },
    {
      q: 'What must teams submit?',
      a: 'Teams submit their project idea during registration/discovery and, for final evaluation, submit their application name, problem statement, proposed solution, description, live application URL, demo video, screenshots, source-code URL, technology stack, and team member contributions.',
    },
    {
      q: 'When will event dates be announced?',
      a:
        settings?.eventStartDate && settings.eventStartDate !== 'To be announced'
          ? `Event start date: ${settings.eventStartDate}. Registration deadline: ${settings.registrationDeadline}. Final presentation: ${settings.finalPresentationDate}.`
          : 'Exact competition dates, deadlines, and venue address are currently To be announced and will be published here and in the participant portal.',
    },
    {
      q: 'When will prizes be announced?',
      a:
        settings?.prizeInfo && settings.prizeInfo !== 'PRIZES TO BE ANNOUNCED.'
          ? settings.prizeInfo
          : 'Prizes are To be announced. Official prize details will be published once confirmed by Skill AI.',
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-atmosphere min-h-screen text-white overflow-x-clip">
        <Navbar />

        {/* Sticky Hero -> Overlapping About Transition Wrapper */}
        <div ref={heroAboutRef} className="relative">
          {/* 1. HERO SECTION — Temporarily pinned while About slides up over it */}
          <section
            id="home"
            className="sticky top-0 z-0 flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-24 text-center sm:px-8 sm:pt-28 sm:pb-28 lg:pb-32"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="animate-hero-video pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
              src={HERO_VIDEO_URL}
            />

            {/* Subtle navy readability tint + ambient violet glow preserving original video colors */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                background:
                  'radial-gradient(ellipse 70% 50% at 50% 34%, rgba(50, 16, 92, 0.22) 0%, rgba(16, 19, 41, 0.2) 55%, rgba(8, 8, 18, 0.24) 100%)',
              }}
            />

            {/* Whisper-thin bottom edge seam into #080812 without covering foreground flowers */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-14 bg-gradient-to-t from-[#080812] to-transparent"
            />

            <motion.div
              style={
                shouldReduceMotion
                  ? undefined
                  : {
                      opacity: heroContentOpacity,
                      scale: heroContentScale,
                      y: heroContentY,
                    }
              }
              className="relative z-10 mx-auto flex w-full max-w-[1250px] flex-col items-center"
            >
              {/* Existing Brand Label */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.32, ease: REVEAL_EASE }}
                className="hero-text-shadow mt-2 text-center font-body text-[12px] font-semibold tracking-[2.2px] text-white/75 uppercase sm:mt-2.5 sm:text-[13px] sm:tracking-[3.4px]"
              >
                {settings?.heroSupportingHeading || 'WELCOME TO APPTHON.'}
              </motion.p>

            {/* 3. Main Headline — Two visual lines on desktop/wider tablet, natural wrap on mobile */}
            <h1
              className="mt-5 w-full max-w-[1250px] text-center font-display leading-[0.98] tracking-[-0.025em] text-white sm:mt-6"
              style={{ fontSize: 'clamp(2.45rem, 5.9vw, 6.1rem)' }}
            >
              <motion.span
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.44, ease: REVEAL_EASE }}
                className="inline md:block"
              >
                <span className="hero-text-shadow">Your idea.</span>{' '}
                <span className="gradient-text">Your application.</span>
              </motion.span>{' '}
              <motion.span
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.58, ease: REVEAL_EASE }}
                className="inline md:mt-1 md:block"
              >
                <span className="hero-text-shadow">Your chance </span>
                <span className="gradient-text">to win.</span>
              </motion.span>
            </h1>

            {/* 4. Supporting Description */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.74, ease: REVEAL_EASE }}
              className="hero-text-shadow mt-5 max-w-[650px] text-center font-body text-[15px] leading-relaxed text-white/85 sm:mt-6 sm:text-[17px]"
            >
              {settings?.heroDescription ||
                'A one-month application-building challenge where students turn imagination into functional technology products.'}
            </motion.p>

            {/* 5. Competition Indicators */}
            <div className="hero-text-shadow mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-medium tracking-[0.16em] text-white/75 uppercase sm:mt-6 sm:gap-x-4 sm:text-xs sm:tracking-[0.2em]">
              {['ONE MONTH', 'TEAMS OF 2–5', 'FREE REGISTRATION'].map((fact, idx) => (
                <motion.span
                  key={fact}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.88 + idx * 0.07,
                    ease: REVEAL_EASE,
                  }}
                  className="inline-flex items-center whitespace-nowrap"
                >
                  <span>{fact}</span>
                  {idx < 2 && (
                    <span aria-hidden="true" className="ml-3 text-white/35 sm:ml-4">
                      ·
                    </span>
                  )}
                </motion.span>
              ))}
            </div>

            {/* 6. Call-To-Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 1.12, ease: REVEAL_EASE }}
              className="mt-7 flex flex-col items-center justify-center gap-3.5 sm:mt-8 sm:flex-row sm:gap-4"
            >
              <Link
                to="/register"
                className="hero-btn-primary group inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.14em] text-white uppercase whitespace-nowrap shrink-0"
              >
                <span>REGISTER YOUR TEAM</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a
                href="#roadmap"
                className="hero-btn-secondary inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.14em] text-white uppercase whitespace-nowrap shrink-0"
              >
                EXPLORE THE ROADMAP
              </a>
            </motion.div>
            </motion.div>

            {/* Subtle animated scroll indicator */}
            <motion.a
              href="#about"
              aria-label="Scroll to competition details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.28, ease: REVEAL_EASE }}
              className="hero-text-shadow absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-white/75 transition-colors hover:text-white"
            >
              <span className="text-[10px] font-medium tracking-[0.26em] uppercase">Scroll</span>
              <ChevronDown className="animate-scroll-cue h-4 w-4" />
            </motion.a>
          </section>

          {/* 2. WHAT IS APPTHON? — White-to-lavender illuminated foreground layer overlapping pinned dark Hero */}
          <section
            ref={aboutSectionRef}
            id="about"
            className="relative z-20 scroll-mt-24 overflow-hidden rounded-t-[28px] border-t border-[#C4A1FF]/70 px-5 py-20 text-[#101329] sm:scroll-mt-28 sm:rounded-t-[40px] sm:px-10 sm:py-28"
            style={{
              background:
                'linear-gradient(132deg, #FFFFFF 0%, #FAF7FF 24%, #EFE3FF 58%, #E4CEFF 88%, #EDE0FF 100%)',
              boxShadow:
                '0 -26px 76px rgba(8, 8, 18, 0.72), 0 -10px 48px rgba(147, 51, 234, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.92)',
            }}
          >
            {/* Subtle flowing diagonal lavender-to-violet light wash across the entire section */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  'radial-gradient(ellipse 68% 44% at 14% 12%, rgba(233, 213, 255, 0.56) 0%, rgba(245, 238, 255, 0.22) 48%, rgba(255, 255, 255, 0) 76%), radial-gradient(ellipse 64% 46% at 88% 88%, rgba(168, 85, 247, 0.2) 0%, rgba(196, 161, 255, 0.24) 42%, rgba(255, 255, 255, 0) 78%), linear-gradient(115deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.24) 44%, rgba(196, 161, 255, 0.16) 72%, rgba(147, 51, 234, 0.14) 100%)',
              }}
            />

            {/* Soft violet & purple parallax radial bloom behind right-side illustration */}
            <motion.div
              aria-hidden="true"
              style={{
                y: shouldReduceMotion ? 0 : aboutAmbientY,
                background:
                  'radial-gradient(ellipse 50% 54% at 74% 52%, rgba(147, 51, 234, 0.22) 0%, rgba(168, 85, 247, 0.22) 30%, rgba(196, 161, 255, 0.26) 56%, rgba(255, 255, 255, 0) 80%), radial-gradient(ellipse 58% 30% at 50% 0%, rgba(196, 161, 255, 0.34) 0%, rgba(255, 255, 255, 0) 74%)',
              }}
              className="pointer-events-none absolute -inset-12 z-0"
            />

            <div className="relative z-10 mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
              <div className="lg:col-span-6">
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.22 }}
                  transition={{ duration: 0.55, delay: 0.05, ease: REVEAL_EASE }}
                  className="text-xs font-semibold tracking-[0.2em] text-[#7024D8] uppercase"
                >
                  About the Challenge
                </motion.p>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.22 }}
                  transition={{ duration: 0.65, delay: 0.16, ease: REVEAL_EASE }}
                  className="about-heading-serif mt-3 text-[2.75rem] leading-[1.06] sm:text-[3.6rem] lg:text-[4rem] text-balance"
                >
                  <span className="about-heading-solid">What is </span>
                  <span className="about-appthon-gradient">APPTHON</span>
                  <span className="about-heading-solid">?</span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.22 }}
                  transition={{ duration: 0.55, delay: 0.28, ease: REVEAL_EASE }}
                  className="mt-4 text-xs font-semibold tracking-[0.16em] text-[#4C4F6D] uppercase sm:text-sm"
                >
                  BUILD YOUR IDEA. LAUNCH YOUR APPLICATION.
                </motion.p>

                <div className="mt-7 space-y-5 text-[15.5px] font-medium leading-[1.72] text-[#1F233A] sm:text-[16.5px]">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.22 }}
                    transition={{ duration: 0.6, delay: 0.38, ease: REVEAL_EASE }}
                    className="flex items-start gap-3.5"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.46em] h-5 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-[#7024D8] to-[#C4A1FF]"
                    />
                    <p>
                      APPTHON is a{' '}
                      <strong className="font-bold text-[#5B21B6]">
                        student-focused application-building competition
                      </strong>{' '}
                      that challenges participants to transform innovative ideas into functional
                      digital products.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.22 }}
                    transition={{ duration: 0.6, delay: 0.48, ease: REVEAL_EASE }}
                    className="flex items-start gap-3.5"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.46em] h-5 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-[#9333EA] to-[#C4A1FF]"
                    />
                    <p>
                      Working in{' '}
                      <strong className="font-bold text-[#101329]">teams of 2–5, students</strong>{' '}
                      identify{' '}
                      <strong className="font-bold text-[#5B21B6]">real-world problems</strong>,
                      design and develop{' '}
                      <strong className="font-bold text-[#101329]">
                        technology-driven solutions
                      </strong>
                      , and present their applications to an expert judging panel.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.22 }}
                    transition={{ duration: 0.6, delay: 0.58, ease: REVEAL_EASE }}
                    className="flex items-start gap-3.5"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.46em] h-5 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-[#7024D8] to-[#A855F7]"
                    />
                    <p>
                      The competition encourages{' '}
                      <strong className="font-bold text-[#101329]">
                        innovation, entrepreneurship, collaboration
                      </strong>
                      , <strong className="font-bold text-[#5B21B6]">technical creativity</strong>,
                      product thinking and practical application development.
                    </p>
                  </motion.div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <ImaginationToApplication />
              </div>
            </div>
          </section>
        </div>

        {/* Lower page wrapper sits at z-20 over sticky Hero on tall viewports */}
        <div className="app-atmosphere relative z-20 border-t border-[#C4A1FF]/25">
          {/* Live Announcements Strip (only when published by Admin) */}
          {announcements.length > 0 && (
            <section className="border-y border-[#C4A1FF]/15 bg-[#101329]/75 backdrop-blur-sm px-5 py-4 sm:px-10">
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-semibold tracking-wider text-[#A64AFF] uppercase">
                  {announcements[0].category}
                </span>
                <span aria-hidden="true" className="text-white/30">·</span>
                <span className="font-medium text-white">{announcements[0].title}</span>
                <span className="hidden md:inline text-white/65">
                  — {announcements[0].body}
                </span>
              </div>
              <Link to="/login" className="text-xs font-medium text-[#A64AFF] hover:underline whitespace-nowrap">
                View in Portal
              </Link>
            </div>
          </section>
        )}

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 3. WHY APPTHON? */}
        <section className="px-5 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_CONFIG}
              transition={{ duration: 0.7, ease: REVEAL_EASE }}
              className="max-w-3xl"
            >
              <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
                Purpose &amp; Vision
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl text-balance">
                Why APPTHON?
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-white/85">
                Technology is changing the world. APPTHON invites students to move beyond simply
                using technology and become creators of it.
              </p>
              <p className="mt-4 text-base leading-relaxed text-white/70">
                Participants get a structured opportunity to develop ideas, collaborate with peers,
                build practical applications and showcase their work.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  title: 'Innovation',
                  desc: 'Turn original concepts into real technology products.',
                },
                {
                  title: 'Entrepreneurship',
                  desc: 'Develop problem-first product thinking with real-world value.',
                },
                {
                  title: 'Collaboration',
                  desc: 'Work across disciplines in focused teams of 2–5.',
                },
                {
                  title: 'Technical Creativity',
                  desc: 'Design thoughtful architectures, workflows, and interfaces.',
                },
                {
                  title: 'Practical Development',
                  desc: 'Ship working applications ready for live presentation.',
                },
              ].map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_CONFIG}
                  transition={{
                    duration: 0.55,
                    delay: idx * 0.07,
                    ease: REVEAL_EASE,
                  }}
                  className="rounded-2xl border border-[#C4A1FF]/14 bg-[#101329]/60 p-6 backdrop-blur-sm transition-colors duration-200 hover:border-[#C4A1FF]/45 hover:bg-[#191334]/75"
                >
                  <span className="text-xs font-mono text-[#A64AFF] tabular-nums">
                    0{idx + 1}.
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 4. WHO CAN PARTICIPATE? */}
        <section className="px-5 py-20 sm:px-10 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_CONFIG}
            transition={{ duration: 0.7, ease: REVEAL_EASE }}
            className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-12 lg:gap-12"
          >
            <div className="lg:col-span-5">
              <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
                Eligibility
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl text-balance">
                Who Can Participate?
              </h2>
            </div>
            <div className="lg:col-span-7">
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {[
                  'College and university students from different academic backgrounds.',
                  'Students interested in technology, AI, entrepreneurship, design and problem-solving.',
                  'Teams of 2–5 members.',
                  'Cross-disciplinary teams are encouraged, subject to final rules.',
                ].map((line, idx) => (
                  <motion.li
                    key={line}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={VIEWPORT_CONFIG}
                    transition={{ duration: 0.45, delay: idx * 0.08, ease: REVEAL_EASE }}
                    className="flex items-start gap-4 py-5 text-base text-white/85"
                  >
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A64AFF]" />
                    <span>{line}</span>
                  </motion.li>
                ))}
              </ul>
              {settings?.eligibilityInfo && (
                <p className="mt-5 text-sm leading-relaxed text-white/55">
                  {settings.eligibilityInfo}
                </p>
              )}
            </div>
          </motion.div>
        </section>

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 5. APPLICATION CATEGORIES */}
        <section id="categories" className="scroll-mt-24 px-5 py-20 sm:scroll-mt-28 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_CONFIG}
              transition={{ duration: 0.65, ease: REVEAL_EASE }}
              className="max-w-2xl"
            >
              <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
                Competition Tracks
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl text-balance">
                Application Categories
              </h2>
            </motion.div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((cat, index) => {
                const Icon = cat.icon;
                return (
                  <motion.div
                    key={cat.title}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_CONFIG}
                    transition={{
                      duration: 0.55,
                      delay: index * 0.06,
                      ease: REVEAL_EASE,
                    }}
                    className={`group rounded-2xl border border-[#C4A1FF]/14 bg-[#101329]/60 p-7 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C4A1FF]/45 hover:bg-[#191334]/75 ${
                      index === 6 ? 'sm:col-span-2 lg:col-span-3' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#7024D8]/15 text-[#A64AFF] transition-colors duration-200 group-hover:bg-[#7024D8]/35 group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-mono text-white/40 tabular-nums">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-6 text-base font-semibold tracking-wide text-white">
                      {cat.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/65">
                      {cat.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 6. FOUR-WEEK COMPETITION ROADMAP — THE CONNECTED PATH */}
        <ConnectedRoadmap milestones={settings?.roadmapMilestones} />

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 7. PRIZES */}
        <section id="prizes" className="scroll-mt-24 px-5 py-20 sm:scroll-mt-28 sm:px-10 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_CONFIG}
            transition={{ duration: 0.7, ease: REVEAL_EASE }}
            className="mx-auto max-w-[1200px]"
          >
            <div className="rounded-3xl border border-[#C4A1FF]/25 bg-gradient-to-b from-[#211039]/60 via-[#101329]/75 to-[#0B0C1C]/85 px-6 py-14 text-center backdrop-blur-md sm:px-14 sm:py-20">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-[#7024D8]/25 text-[#A64AFF]">
                <Trophy className="h-6 w-6" />
              </div>
              <p className="mt-6 text-xs font-medium tracking-[0.24em] text-[#A64AFF] uppercase">
                Awards &amp; Recognition
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl">
                Prizes
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-xl font-medium tracking-wide text-white/95 sm:text-2xl">
                {settings?.prizeInfo || 'PRIZES TO BE ANNOUNCED.'}
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
                Official prize structure and recognition details will be updated by authorized Skill AI administrators once finalized.
              </p>
            </div>
          </motion.div>
        </section>

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 8. JUDGING CRITERIA */}
        <section id="judging" className="scroll-mt-24 px-5 py-20 sm:scroll-mt-28 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_CONFIG}
              transition={{ duration: 0.65, ease: REVEAL_EASE }}
              className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            >
              <div>
                <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
                  Evaluation Rubric
                </p>
                <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl text-balance">
                  Judging Criteria
                </h2>
              </div>
              <div className="sm:text-right">
                <span className="font-mono text-3xl font-semibold text-white tabular-nums">
                  100
                </span>
                <span className="ml-2 text-sm text-white/60">Points Total</span>
              </div>
            </motion.div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {JUDGING_RUBRIC.map((item, idx) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_CONFIG}
                  transition={{ duration: 0.5, delay: idx * 0.06, ease: REVEAL_EASE }}
                  className="rounded-2xl border border-[#C4A1FF]/14 bg-[#101329]/60 p-6 backdrop-blur-sm"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-base font-semibold text-white">{item.label}</h3>
                    <span className="font-mono text-sm font-semibold text-[#A64AFF] tabular-nums shrink-0">
                      {item.maxPoints} pts
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/60">{item.description}</p>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={VIEWPORT_CONFIG}
                      transition={{ duration: 0.75, delay: 0.12 + idx * 0.05, ease: REVEAL_EASE }}
                      className="h-full origin-left rounded-full bg-gradient-to-r from-[#7024D8] to-[#A64AFF]"
                      style={{ width: `${(item.maxPoints / 20) * 100}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 9. EVENT SCHEDULE AND VENUE */}
        <section id="schedule" className="scroll-mt-24 px-5 py-20 sm:scroll-mt-28 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_CONFIG}
              transition={{ duration: 0.65, ease: REVEAL_EASE }}
            >
              <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
                Logistics
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl text-balance">
                Event Schedule &amp; Venue
              </h2>
            </motion.div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Duration', value: 'One month' },
                { label: 'Format', value: 'In-person / Offline' },
                { label: 'Location', value: 'Mangaluru, Karnataka, India' },
                {
                  label: 'Exact Event Date',
                  value: settings?.eventStartDate || 'To be announced',
                },
                {
                  label: 'Registration Deadline',
                  value: settings?.registrationDeadline || 'To be announced',
                },
                {
                  label: 'Final Presentation Date',
                  value: settings?.finalPresentationDate || 'To be announced',
                },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_CONFIG}
                  transition={{ duration: 0.5, delay: idx * 0.05, ease: REVEAL_EASE }}
                  className="rounded-2xl border border-[#C4A1FF]/14 bg-[#101329]/60 p-6 backdrop-blur-sm"
                >
                  <p className="text-xs font-medium tracking-wider text-white/50 uppercase">
                    {item.label}
                  </p>
                  <p className="mt-2.5 text-lg font-medium text-white">{item.value}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_CONFIG}
              transition={{ duration: 0.55, ease: REVEAL_EASE }}
              className="mt-6 rounded-2xl border border-[#C4A1FF]/14 bg-[#101329]/60 p-6 backdrop-blur-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#A64AFF]" />
                <div>
                  <p className="text-xs font-medium tracking-wider text-white/50 uppercase">
                    Venue Address
                  </p>
                  <p className="mt-1 text-base font-medium text-white">
                    {settings?.venueName && settings.venueName !== 'To be announced'
                      ? `${settings.venueName} — ${settings.venueAddress}`
                      : settings?.venueAddress || 'To be announced'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-white/45">
                Submission deadline: {settings?.submissionDeadline || 'To be announced'}
              </span>
            </motion.div>
          </div>
        </section>

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 10. FAQ SECTION */}
        <section id="faq" className="scroll-mt-24 px-5 py-20 sm:scroll-mt-28 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[900px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_CONFIG}
              transition={{ duration: 0.65, ease: REVEAL_EASE }}
              className="text-center"
            >
              <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
                Questions &amp; Answers
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tight text-white sm:text-5xl">
                Frequently Asked Questions
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_CONFIG}
              transition={{ duration: 0.65, delay: 0.1, ease: REVEAL_EASE }}
              className="mt-12 divide-y divide-white/10 border-y border-white/10"
            >
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={faq.q}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium text-white transition-colors hover:text-[#A64AFF] cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-white/60 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#A64AFF]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="pb-5 pr-4 text-sm leading-relaxed text-white/75 sm:pr-8">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 11. CONTACT SECTION */}
        <section id="contact" className="scroll-mt-24 px-5 py-20 sm:scroll-mt-28 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_CONFIG}
            transition={{ duration: 0.65, ease: REVEAL_EASE }}
            className="mx-auto max-w-[1200px]"
          >
            <div className="grid gap-8 rounded-2xl border border-[#C4A1FF]/14 bg-[#101329]/60 p-7 backdrop-blur-sm sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium tracking-wider text-white/50 uppercase">
                  Organizer
                </p>
                <p className="mt-2 text-lg font-semibold text-white">Skill AI</p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wider text-white/50 uppercase">
                  Location
                </p>
                <p className="mt-2 text-base font-medium text-white">Mangaluru, Karnataka</p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wider text-white/50 uppercase">
                  Official Email
                </p>
                <p className="mt-2 text-base font-medium text-white/85 break-words">
                  {settings?.officialEmail || 'TO BE ANNOUNCED'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wider text-white/50 uppercase">
                  Official Telephone
                </p>
                <p className="mt-2 text-base font-medium text-white/85">
                  {settings?.officialPhone || 'TO BE ANNOUNCED'}
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <div className="section-divider mx-auto max-w-[1200px]" />

        {/* 12. FINAL CTA */}
        <section className="px-5 py-24 text-center sm:px-10 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_CONFIG}
            transition={{ duration: 0.7, ease: REVEAL_EASE }}
            className="mx-auto max-w-3xl"
          >
            <h2 className="font-display text-4xl tracking-tight text-white sm:text-6xl text-balance">
              Your idea deserves to be built.
            </h2>
            <p className="mt-5 text-base text-white/75 sm:text-lg">
              Bring your ideas to life. Collaborate with innovators. Build something meaningful.
            </p>
            <div className="mt-9 flex justify-center">
              <Link
                to="/register"
                className="hero-btn-primary group inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-xs font-medium tracking-[0.14em] text-white uppercase whitespace-nowrap shrink-0"
              >
                <span>REGISTER YOUR TEAM</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </section>

          {/* 13. FOOTER */}
          <Footer />
        </div>
      </div>
    </MotionConfig>
  );
}

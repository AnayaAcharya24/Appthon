import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
          Legal &amp; Governance
        </p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-white/55">
          APPTHON · Organized by Skill AI, Mangaluru, Karnataka, India
        </p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-white/80">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">1. Information Collected</h2>
            <p>
              APPTHON collects only the participant and team information needed to administer the
              competition: full name, email address, mobile number, college or institution,
              course/department, academic year, optional student ID (when configured), team
              membership records, project ideas, and application submissions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">2. How Information Is Used</h2>
            <p>
              Data is used strictly for participant verification, team formation, eligibility
              review, project evaluation by assigned judges, official competition notifications,
              results publication, and certificate issuance and verification.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">3. Private File Storage &amp; Access Control</h2>
            <p>
              Uploaded screenshots and demo videos are stored privately on the server and are
              accessible only to authorized team members, assigned judges, and authorized Skill AI
              competition staff.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">4. No Payment Processing</h2>
            <p>
              Registration for APPTHON is completely free. This platform does not collect,
              process, or store any payment card or financial checkout information.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">5. Organizer Contact</h2>
            <p>
              Privacy inquiries may be directed to Skill AI (Mangaluru, Karnataka, India) via the
              official contact channels published on the APPTHON website once announced.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
          Competition Governance
        </p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Terms and Conditions</h1>
        <p className="mt-3 text-sm text-white/55">
          APPTHON · Organized by Skill AI, Mangaluru, Karnataka, India
        </p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-white/80">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">1. Participation &amp; Team Composition</h2>
            <p>
              APPTHON is open to college and university students from different academic
              backgrounds in teams of 2 to 5 members, with one designated team leader. Each
              participant may belong to only one active team unless explicitly permitted by final
              organizer rules.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">2. Free Registration &amp; Verification</h2>
            <p>
              Registration is free of charge. All team members must complete email verification and
              accurate profile registration before the team submission is reviewed for approval.
              Team modifications after approval require organizer authorization.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">3. Submissions &amp; Deadlines</h2>
            <p>
              Teams must submit functional application builds, supporting screenshots, demo videos,
              source-code links, and team contribution details prior to the administrator-configured
              submission deadline. Submissions lock automatically at the deadline unless reopened by
              an authorized administrator.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">4. Policies Pending Final Publication</h2>
            <p>
              Specific terms covering cross-college team eligibility, intellectual property
              ownership, AI tool usage, plagiarism and disqualification rules, tie-break rules,
              exact schedule dates, venue address, and prize allocations are subject to official
              publication by Skill AI prior to competition start (currently marked as To be
              announced where not yet configured).
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

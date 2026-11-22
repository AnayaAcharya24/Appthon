import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, MailCheck, ShieldCheck } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { FormField, PrimaryButton, SurfaceCard, inputClass } from '../components/ui/Primitives';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { AuthUser, EventSettings } from '../types/appthon';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [studentIdRequired, setStudentIdRequired] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [college, setCollege] = useState('');
  const [courseDepartment, setCourseDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');

  const [verificationCode, setVerificationCode] = useState('');
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ settings: EventSettings }>('/public/settings')
      .then((d) => setStudentIdRequired(Boolean(d.settings?.studentIdRequired)))
      .catch(() => {});
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{
        token: string;
        user: AuthUser;
        verificationCodeHint?: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          mobileNumber,
          college,
          courseDepartment,
          academicYear,
          studentId,
          password,
        }),
      });
      await setSession(res.token, res.user);
      setCodeHint(res.verificationCodeHint || null);
      setStep('verify');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: AuthUser }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code: verificationCode }),
      });
      await setSession(res.token, res.user);
      navigate('/dashboard?tab=team');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pt-32 pb-24">
        <div className="mb-8">
          <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
            Free Student Registration · Teams of 2–5
          </p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            {step === 'form' ? 'Create Your APPTHON Account' : 'Verify Your Email Address'}
          </h1>
          <div className="mt-5 flex items-center gap-3 text-xs text-white/60">
            <span className={step === 'form' ? 'font-semibold text-[#A64AFF]' : 'text-emerald-400'}>
              1. Student Profile
            </span>
            <span aria-hidden="true">/</span>
            <span className={step === 'verify' ? 'font-semibold text-[#A64AFF]' : ''}>
              2. Email Verification
            </span>
            <span aria-hidden="true">/</span>
            <span>3. Team Creation &amp; Invitations</span>
          </div>
        </div>

        {step === 'form' ? (
          <SurfaceCard>
            <form onSubmit={handleRegister} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Full Name" required>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Email Address" required>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Mobile Number" required>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="College / Institution" required>
                  <input
                    type="text"
                    required
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="Your college or university"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Course / Department" required>
                  <input
                    type="text"
                    required
                    value={courseDepartment}
                    onChange={(e) => setCourseDepartment(e.target.value)}
                    placeholder="e.g. B.E. Computer Science"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Academic Year" required>
                  <select
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Other">Other</option>
                  </select>
                </FormField>

                <FormField
                  label="Student ID"
                  required={studentIdRequired}
                  hint={studentIdRequired ? 'Required by organizer policy' : 'Optional'}
                >
                  <input
                    type="text"
                    required={studentIdRequired}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Roll / USN / ID number"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Password" required hint="Minimum 8 characters">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className={inputClass}
                  />
                </FormField>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/55">
                  Already have an account?{' '}
                  <Link to="/login" className="text-[#A64AFF] hover:underline">
                    Log in here
                  </Link>
                </p>
                <PrimaryButton type="submit" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Student Account'}
                  <ArrowRight className="h-4 w-4" />
                </PrimaryButton>
              </div>
            </form>
          </SurfaceCard>
        ) : (
          <SurfaceCard>
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-[#7024D8]/40 bg-[#7024D8]/10 p-4 text-sm">
                <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#A64AFF]" />
                <div>
                  <p className="font-medium text-white">Verification code generated for {email}</p>
                  <p className="mt-1 text-white/70">
                    Enter your 6-digit verification code below to unlock team creation and
                    invitations.
                  </p>
                  {codeHint && (
                    <p className="mt-2 font-mono text-xs text-[#A64AFF]">
                      Preview Verification Code: <strong className="text-white">{codeHint}</strong>
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <FormField label="6-Digit Verification Code" required>
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className={inputClass}
                />
              </FormField>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="text-xs text-white/60 hover:text-white cursor-pointer"
                >
                  Continue to dashboard (verify later)
                </button>
                <PrimaryButton type="submit" disabled={loading}>
                  <CheckCircle2 className="h-4 w-4" />
                  {loading ? 'Verifying...' : 'Verify Email & Continue'}
                </PrimaryButton>
              </div>
            </form>
          </SurfaceCard>
        )}
      </main>
      <Footer />
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // First-run Super Admin claim panel
  const [bootstrapStatus, setBootstrapStatus] = useState<{
    superAdminExists: boolean;
    envPasscodeRequired: boolean;
  } | null>(null);
  const [showAdminClaim, setShowAdminClaim] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [claimError, setClaimError] = useState('');

  useEffect(() => {
    apiFetch<{ superAdminExists: boolean; envPasscodeRequired: boolean }>(
      '/auth/admin-bootstrap-status'
    )
      .then(setBootstrapStatus)
      .catch(() => {});
  }, []);

  const redirectByRole = (role: AuthUser['role']) => {
    if (role === 'Judge') navigate('/judge');
    else if (
      ['Super Admin', 'Event Manager', 'Registration Manager', 'Read-only Staff'].includes(role)
    ) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await setSession(res.token, res.user);
      redirectByRole(res.user.role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: AuthUser }>('/auth/claim-admin', {
        method: 'POST',
        body: JSON.stringify({
          fullName: adminName,
          email: adminEmail,
          password: adminPassword,
          passcode: adminPasscode,
        }),
      });
      await setSession(res.token, res.user);
      navigate('/admin');
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : 'Unable to claim Super Admin access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <Navbar />
      <main className="mx-auto max-w-md px-6 pt-32 pb-24">
        <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
          Participant, Judge &amp; Organizer Portal
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Sign In to APPTHON</h1>

        <SurfaceCard className="mt-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <FormField label="Email Address" required>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </FormField>

            <FormField label="Password" required>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={inputClass}
              />
            </FormField>

            <div className="flex items-center justify-between text-xs">
              <Link to="/reset-password" className="text-white/60 hover:text-white">
                Forgot password?
              </Link>
              <Link to="/verify-email" className="text-white/60 hover:text-white">
                Verify email
              </Link>
            </div>

            <PrimaryButton type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing In...' : 'Sign In'}
            </PrimaryButton>
          </form>

          <p className="mt-5 border-t border-white/10 pt-4 text-center text-xs text-white/60">
            New student participant?{' '}
            <Link to="/register" className="text-[#A64AFF] hover:underline">
              Register your account
            </Link>
          </p>
        </SurfaceCard>

        {bootstrapStatus &&
          (!bootstrapStatus.superAdminExists || bootstrapStatus.envPasscodeRequired) && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAdminClaim((v) => !v)}
                className="flex w-full items-center justify-center gap-2 text-xs text-white/55 hover:text-white cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-[#A64AFF]" />
                {bootstrapStatus.superAdminExists
                  ? 'Organizer Admin Bootstrap'
                  : 'First-Run Organizer Setup: Claim Super Admin'}
              </button>

              {showAdminClaim && (
                <SurfaceCard className="mt-3 border-[#7024D8]/40">
                  <form onSubmit={handleClaimAdmin} className="space-y-3.5">
                    <p className="text-xs text-white/70">
                      {bootstrapStatus.envPasscodeRequired
                        ? 'Enter the configured organizer passcode to claim or restore Super Admin access.'
                        : 'No Super Admin has been configured yet. Create the initial Super Admin account below.'}
                    </p>
                    {claimError && (
                      <p className="text-xs text-rose-300">{claimError}</p>
                    )}
                    <FormField label="Organizer Full Name" required>
                      <input
                        type="text"
                        required
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Skill AI Organizer"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Organizer Email" required>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="organizer@skillai.in"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Password (min 8 chars)" required>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className={inputClass}
                      />
                    </FormField>
                    {bootstrapStatus.envPasscodeRequired && (
                      <FormField label="Organizer Bootstrap Passcode" required>
                        <input
                          type="password"
                          required
                          value={adminPasscode}
                          onChange={(e) => setAdminPasscode(e.target.value)}
                          className={inputClass}
                        />
                      </FormField>
                    )}
                    <PrimaryButton type="submit" disabled={loading} className="w-full">
                      Claim Super Admin Access
                    </PrimaryButton>
                  </form>
                </SurfaceCard>
              )}
            </div>
          )}
      </main>
      <Footer />
    </div>
  );
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setError('');
    setMessage('');
    try {
      const res = await apiFetch<{ message: string; verificationCodeHint?: string }>(
        '/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setMessage(res.message);
      if (res.verificationCodeHint) setHint(res.verificationCodeHint);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to resend code.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: AuthUser }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      await setSession(res.token, res.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <Navbar />
      <main className="mx-auto max-w-md px-6 pt-32 pb-24">
        <h1 className="font-display text-4xl">Verify Email</h1>
        <SurfaceCard className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-rose-300">{error}</p>}
            {message && <p className="text-sm text-emerald-300">{message}</p>}
            {hint && (
              <p className="font-mono text-xs text-[#A64AFF]">
                Preview Verification Code: <strong className="text-white">{hint}</strong>
              </p>
            )}
            <FormField label="Registered Email" required>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Verification Code" required>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass}
              />
            </FormField>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleResend}
                className="text-xs text-[#A64AFF] hover:underline cursor-pointer"
              >
                Resend code
              </button>
              <PrimaryButton type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </PrimaryButton>
            </div>
          </form>
        </SurfaceCard>
      </main>
      <Footer />
    </div>
  );
}

export function ResetPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string; resetCodeHint?: string }>(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setHint(res.resetCodeHint || null);
      setStep('reset');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      });
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <Navbar />
      <main className="mx-auto max-w-md px-6 pt-32 pb-24">
        <div className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
          <KeyRound className="h-4 w-4" />
          Account Recovery
        </div>
        <h1 className="mt-2 font-display text-4xl">Reset Password</h1>

        <SurfaceCard className="mt-6">
          {step === 'request' && (
            <form onSubmit={handleRequest} className="space-y-4">
              {error && <p className="text-sm text-rose-300">{error}</p>}
              <FormField label="Registered Email Address" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <PrimaryButton type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Request Recovery Code'}
              </PrimaryButton>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              {error && <p className="text-sm text-rose-300">{error}</p>}
              {hint && (
                <p className="font-mono text-xs text-[#A64AFF]">
                  Preview Recovery Code: <strong className="text-white">{hint}</strong>
                </p>
              )}
              <FormField label="Recovery Code" required>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="New Password (min 8 chars)" required>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <PrimaryButton type="submit" disabled={loading} className="w-full">
                {loading ? 'Updating...' : 'Update Password'}
              </PrimaryButton>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="text-sm text-white/85">
                Your password has been updated successfully.
              </p>
              <Link
                to="/login"
                className="inline-block rounded-full bg-[#7024D8] px-6 py-2.5 text-sm font-medium text-white"
              >
                Return to Sign In
              </Link>
            </div>
          )}
        </SurfaceCard>
      </main>
      <Footer />
    </div>
  );
}

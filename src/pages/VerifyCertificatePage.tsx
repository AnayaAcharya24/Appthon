import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Award, CheckCircle2, Search, XCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PrimaryButton, SurfaceCard, inputClass } from '../components/ui/Primitives';
import { apiFetch } from '../lib/api';
import { formatDateTime } from '../lib/utils';

interface VerifiedCertificate {
  certificateCode: string;
  recipientName: string;
  teamName: string;
  title: string;
  rankLabel: string;
  issuedAt: string;
  isRevoked: boolean;
}

export function VerifyCertificatePage() {
  const { certificateId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(certificateId || '');
  const [loading, setLoading] = useState(false);
  const [cert, setCert] = useState<VerifiedCertificate | null>(null);
  const [error, setError] = useState('');

  const lookup = async (codeToLookup: string) => {
    const clean = codeToLookup.trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    setCert(null);
    try {
      const data = await apiFetch<{ certificate: VerifiedCertificate }>(
        `/public/certificates/${encodeURIComponent(clean)}`
      );
      setCert(data.certificate);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Certificate not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certificateId) {
      setQuery(certificateId);
      lookup(certificateId);
    }
  }, [certificateId]);

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pt-32 pb-24">
        <p className="text-xs font-medium tracking-[0.2em] text-[#A64AFF] uppercase">
          Official Registry
        </p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Certificate Verification</h1>
        <p className="mt-3 text-sm text-white/70">
          Enter an official APPTHON certificate ID (e.g. CERT-APPTHON-XXXXXX) to verify its
          authenticity.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) {
              navigate(`/verify/${encodeURIComponent(query.trim())}`);
              lookup(query.trim());
            }
          }}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="CERT-APPTHON-..."
            className={inputClass}
          />
          <PrimaryButton type="submit" disabled={loading || !query.trim()}>
            <Search className="h-4 w-4" />
            {loading ? 'Verifying...' : 'Verify'}
          </PrimaryButton>
        </form>

        {error && (
          <SurfaceCard className="mt-8 border-rose-500/30 bg-rose-500/5">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <p className="text-sm font-semibold text-rose-300">Verification Failed</p>
                <p className="mt-1 text-sm text-white/70">{error}</p>
              </div>
            </div>
          </SurfaceCard>
        )}

        {cert && (
          <SurfaceCard className="mt-8 border-[#7024D8]/40">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 text-[#A64AFF]" />
                <div>
                  <p className="font-mono text-xs text-[#A64AFF]">{cert.certificateCode}</p>
                  <h2 className="text-lg font-semibold text-white">{cert.title}</h2>
                </div>
              </div>
              {cert.isRevoked ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 uppercase">
                  <XCircle className="h-4 w-4" /> Revoked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase">
                  <CheckCircle2 className="h-4 w-4" /> Authentic
                </span>
              )}
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-white/50">Recipient</dt>
                <dd className="mt-1 font-medium text-white">{cert.recipientName}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Team</dt>
                <dd className="mt-1 font-medium text-white">{cert.teamName}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Recognition</dt>
                <dd className="mt-1 font-medium text-white">{cert.rankLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Issued At</dt>
                <dd className="mt-1 font-medium text-white">{formatDateTime(cert.issuedAt)}</dd>
              </div>
            </dl>
          </SurfaceCard>
        )}
      </main>
      <Footer />
    </div>
  );
}

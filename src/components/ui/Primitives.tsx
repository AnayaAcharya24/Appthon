import React from 'react';
import { cn } from '../../lib/utils';

export function SurfaceCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-[#0F0F1C]/80 p-6 transition-colors duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-[#7024D8] px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#8233ED] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A64AFF] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer',
        className
      )}
    >
      {children}
    </button>
  );
}

export function GlassButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'liquid-glass inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A64AFF] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer',
        className
      )}
    >
      {children}
    </button>
  );
}

export function StatusText({ status }: { status: string }) {
  const s = status.toLowerCase();
  let color = 'text-white/75';
  if (s.includes('approved') || s.includes('submitted') || s.includes('completed') || s.includes('accepted')) {
    color = 'text-emerald-400';
  } else if (s.includes('pending') || s.includes('review') || s.includes('progress') || s.includes('reopened')) {
    color = 'text-amber-300';
  } else if (s.includes('reject') || s.includes('declined') || s.includes('revoked') || s.includes('correction') || s.includes('revision')) {
    color = 'text-rose-400';
  }
  return <span className={cn('text-xs font-medium tracking-wide uppercase', color)}>{status}</span>;
}

export function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-white/80">
        {label}
        {required && <span className="ml-1 text-[#A64AFF]">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-white/50">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-white/15 bg-[#080810] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#A64AFF] focus:outline-none focus:ring-1 focus:ring-[#A64AFF] transition-colors';

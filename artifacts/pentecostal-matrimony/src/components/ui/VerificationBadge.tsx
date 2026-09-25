import { Check, ShieldCheck } from 'lucide-react';

interface VerificationBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function VerificationBadge({ className = '', size = 'sm' }: VerificationBadgeProps) {
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500 bg-emerald-600 font-bold text-white shadow-sm ${
        isSm ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      } ${className}`}
      title="Verified by Community Stewards"
    >
      <ShieldCheck size={isSm ? 12 : 15} strokeWidth={2.5} className="text-emerald-100" />
      <span className="tracking-wide">Verified</span>
    </span>
  );
}

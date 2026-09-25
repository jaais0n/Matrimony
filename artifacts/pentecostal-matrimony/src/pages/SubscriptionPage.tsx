import { useState } from 'react';
import { Check, ShieldCheck, Zap } from 'lucide-react';

export function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('free');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelect = (plan: 'free' | 'premium') => {
    setSelectedPlan(plan);
    showToast(
      plan === 'premium'
        ? 'Premium membership selected. Architecture ready for billing integration.'
        : 'Active on Standard Free Tier.'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12 text-slate-900">
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg animate-in fade-in">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-rose-100 bg-white p-6 sm:p-10 text-center shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-700" />
          <span className="inline-block rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2 border border-rose-200">
            Membership Architecture
          </span>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-slate-900">
            Community Membership Tiers
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-xs text-slate-600 leading-relaxed">
            Our platform operates with high editorial standards and manual verification.
            Upgrade options provide serious members with extended visibility and direct contact facilitation.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 text-left">
            {/* Standard / Free Tier */}
            <div className={`rounded-2xl border-2 p-6 sm:p-8 flex flex-col justify-between transition ${
              selectedPlan === 'free'
                ? 'border-slate-300 bg-slate-50/70 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Standard Tier</span>
                  {selectedPlan === 'free' && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                      Current Plan
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-2xl font-extrabold text-slate-900">Free Fellowship</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Essential tools to discover and connect with verified Pentecostal profiles.
                </p>
                <div className="mt-4 text-3xl font-extrabold text-slate-900">₹0</div>

                <ul className="mt-6 space-y-3 text-xs border-t border-slate-200/80 pt-6">
                  <li className="flex items-center gap-2 text-slate-700">
                    <Check size={16} className="text-emerald-600 stroke-[2.5]" /> 10 Express Interests per month
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <Check size={16} className="text-emerald-600 stroke-[2.5]" /> Verified member profile badge
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <Check size={16} className="text-emerald-600 stroke-[2.5]" /> Access to full public directory
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <Check size={16} className="text-emerald-600 stroke-[2.5]" /> Private chat upon mutual connection
                  </li>
                  <li className="flex items-center gap-2 text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-slate-300" /> Standard discovery ranking
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => handleSelect('free')}
                  disabled={selectedPlan === 'free'}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-50 transition disabled:opacity-50"
                >
                  {selectedPlan === 'free' ? 'Active Plan' : 'Select Standard'}
                </button>
              </div>
            </div>

            {/* Premium Tier */}
            <div className={`rounded-2xl border-2 p-6 sm:p-8 flex flex-col justify-between relative transition shadow-md ${
              selectedPlan === 'premium'
                ? 'border-rose-500 bg-gradient-to-b from-rose-50/50 to-white ring-2 ring-rose-500/20'
                : 'border-rose-300 bg-white hover:border-rose-400'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-rose-700">Premium Partner</span>
                  <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-600 px-3 py-1 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-xs">
                    ★ Recommended
                  </span>
                </div>
                <h3 className="mt-3 text-2xl font-extrabold text-slate-900">Premium Stewardship</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Advanced search filters, priority pastoral verification, and unmetered communication.
                </p>
                <div className="mt-4 text-3xl font-extrabold text-slate-900">
                  ₹1,999 <span className="text-xs font-normal text-slate-500">/ 6 Months</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs border-t border-rose-100 pt-6">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-emerald-600 stroke-[3]" /> Unlimited Express Interests
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-emerald-600 stroke-[3]" /> Priority pastoral verification review
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-emerald-600 stroke-[3]" /> Verified contact request facilitation
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-emerald-600 stroke-[3]" /> Advanced search filters & NRI filters
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-emerald-600 stroke-[3]" /> Top placement in directory discovery
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => handleSelect('premium')}
                  className="w-full rounded-xl bg-rose-700 py-3 text-xs font-bold text-white uppercase tracking-wider shadow-md hover:bg-rose-800 transition"
                >
                  {selectedPlan === 'premium' ? 'Selected Plan' : 'Upgrade to Premium'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

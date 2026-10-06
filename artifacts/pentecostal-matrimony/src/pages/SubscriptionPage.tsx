import { useState, useEffect } from 'react';
import { Check, ShieldCheck, Zap, Sparkles, Award, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth, useUser } from '../auth';
import { PaymentModal, INDIAN_RUPEE_PLANS } from '../components/ui/PaymentModal';

export function SubscriptionPage() {
  const { user } = useUser();
  const { userId } = useAuth();
  const currentUserId = user?.id || userId || '';
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress || '';

  const [activeUserPlan, setActiveUserPlan] = useState<'free' | 'premium' | 'elite'>('free');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<'free' | 'premium' | 'elite'>('premium');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Read current active membership from session
  useEffect(() => {
    const updateActivePlan = () => {
      try {
        const rawAuth = localStorage.getItem('pm_auth_user');
        if (rawAuth) {
          const authUser = JSON.parse(rawAuth);
          if (authUser.planTier === 'elite' || authUser.plan?.toLowerCase().includes('elite')) {
            setActiveUserPlan('elite');
            return;
          }
          if (authUser.planTier === 'premium' || authUser.plan?.toLowerCase().includes('premium') || authUser.isVip) {
            setActiveUserPlan('premium');
            return;
          }
        }

        const rawAccounts = localStorage.getItem('pm_registered_accounts');
        if (rawAccounts && (currentUserId || currentUserEmail)) {
          const accounts = JSON.parse(rawAccounts);
          const matched = accounts.find(
            (a: any) =>
              (currentUserId && a.id === currentUserId) ||
              (currentUserEmail && a.email?.toLowerCase() === currentUserEmail.toLowerCase())
          );
          if (matched) {
            if (matched.planTier === 'elite' || matched.plan?.toLowerCase().includes('elite')) {
              setActiveUserPlan('elite');
              return;
            }
            if (matched.planTier === 'premium' || matched.plan?.toLowerCase().includes('premium') || matched.isVip) {
              setActiveUserPlan('premium');
              return;
            }
          }
        }
        setActiveUserPlan('free');
      } catch {
        setActiveUserPlan('free');
      }
    };

    updateActivePlan();
    window.addEventListener('pm:sync', updateActivePlan);
    return () => window.removeEventListener('pm:sync', updateActivePlan);
  }, [currentUserId, currentUserEmail]);

  const handleOpenPlanModal = (planId: 'free' | 'premium' | 'elite') => {
    setSelectedPlanForModal(planId);
    setPaymentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-16 text-slate-900">
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 rounded-xl border border-emerald-300 bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-700 transition"
          >
            <ArrowLeft size={14} /> Back to Directory
          </Link>
          <span className="text-xs text-slate-500 font-medium">
            Active Plan: <strong className="text-rose-700 capitalize">{INDIAN_RUPEE_PLANS[activeUserPlan].name}</strong>
          </span>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-white p-6 sm:p-10 text-center shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-700" />
          
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2 border border-rose-200">
            <Sparkles size={12} /> Indian Rupee Membership Plans
          </span>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-slate-900 font-serif-fancy">
            Find the Fellowship Plan That Fits You
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-slate-600 leading-relaxed">
            Transparent, honest plans in Indian Rupees (₹) designed to support serious Christian believers and family stewards with manual pastoral verification and direct contact facilitation.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 text-left items-stretch">
            {/* 1. Free Tier */}
            <div className={`rounded-3xl border-2 p-6 sm:p-8 flex flex-col justify-between transition ${
              activeUserPlan === 'free'
                ? 'border-slate-300 bg-slate-50/70 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Standard Tier</span>
                  {activeUserPlan === 'free' && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                      Current Plan
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-2xl font-extrabold text-slate-900 font-serif-fancy">Free Fellowship</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Essential tools to discover and connect with verified Pentecostal profiles.
                </p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">₹0</span>
                  <span className="text-xs text-slate-500 ml-1">/forever</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                  Standard Believer Fellowship
                </div>

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
                  onClick={() => handleOpenPlanModal('free')}
                  disabled={activeUserPlan === 'free'}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-default"
                >
                  {activeUserPlan === 'free' ? 'Active Standard Tier' : 'Select Free Plan'}
                </button>
              </div>
            </div>

            {/* 2. Premium Tier (Featured) */}
            <div className={`rounded-3xl border-2 p-6 sm:p-8 flex flex-col justify-between relative transition shadow-md ${
              activeUserPlan === 'premium'
                ? 'border-rose-600 bg-gradient-to-b from-rose-50/70 to-white ring-2 ring-rose-500/20'
                : 'border-rose-400/80 bg-gradient-to-b from-white via-[#fff9f6] to-[#fff2ec]'
            }`}>
              <div className="absolute -top-3.5 right-6 rounded-full bg-rose-700 px-3.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                Popular Choice
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-rose-700">Premium Partner</span>
                  {activeUserPlan === 'premium' && (
                    <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 uppercase">
                      Active Plan
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-2xl font-extrabold text-slate-900 font-serif-fancy">Premium Membership</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Unmetered connections, direct contact sharing, and pastoral verification priority.
                </p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-rose-600">₹1,499</span>
                  <span className="text-xs text-slate-500 ml-1">/ 3 Months</span>
                </div>
                <div className="text-[11px] text-rose-700 font-semibold mt-1">
                  ₹499 / mo equivalent • Save 50%
                </div>

                <ul className="mt-6 space-y-3 text-xs border-t border-rose-100 pt-6">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-rose-600 stroke-[3]" /> Unlimited Express Interests
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-rose-600 stroke-[3]" /> View verified contact phone & email
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-rose-600 stroke-[3]" /> Priority pastoral verification review
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-rose-600 stroke-[3]" /> Advanced search & NRI diocese filters
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={16} className="text-rose-600 stroke-[3]" /> Highlighted placement in directory
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => handleOpenPlanModal('premium')}
                  className="w-full rounded-xl bg-rose-700 py-3 text-xs font-bold text-white uppercase tracking-wider shadow-md hover:bg-rose-800 transition cursor-pointer"
                >
                  {activeUserPlan === 'premium' ? 'Renew / Extend Premium' : 'Upgrade to Premium (₹1,499)'}
                </button>
              </div>
            </div>

            {/* 3. Elite Tier */}
            <div className={`rounded-3xl border-2 p-6 sm:p-8 flex flex-col justify-between transition ${
              activeUserPlan === 'elite'
                ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                : 'border-[#ebdcd0] bg-white hover:border-amber-400'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-800">VIP Steward</span>
                  {activeUserPlan === 'elite' && (
                    <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                      Active VIP
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-2xl font-extrabold text-slate-900 font-serif-fancy">Elite VIP Plan</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Full dedicated pastoral family steward concierge & personalized matchmaking.
                </p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">₹2,999</span>
                  <span className="text-xs text-slate-500 ml-1">/ 6 Months</span>
                </div>
                <div className="text-[11px] text-amber-800 font-semibold mt-1">
                  ₹499 / mo equivalent • Full Pastoral Concierge
                </div>

                <ul className="mt-6 space-y-3 text-xs border-t border-slate-200/80 pt-6">
                  <li className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Check size={16} className="text-amber-600 stroke-[3]" /> Everything in Premium included
                  </li>
                  <li className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Check size={16} className="text-amber-600 stroke-[3]" /> Dedicated family steward assistance
                  </li>
                  <li className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Check size={16} className="text-amber-600 stroke-[3]" /> Pastoral reference check concierge
                  </li>
                  <li className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Check size={16} className="text-amber-600 stroke-[3]" /> Exclusive VIP candidate spotlight badge
                  </li>
                  <li className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Check size={16} className="text-amber-600 stroke-[3]" /> Personalized introduction assistance
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => handleOpenPlanModal('elite')}
                  className="w-full rounded-xl border border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 py-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  {activeUserPlan === 'elite' ? 'Renew / Extend Elite' : 'Select Elite VIP (₹2,999)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Indian Rupee Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        defaultPlanId={selectedPlanForModal}
        onSuccess={(plan) => {
          setActiveUserPlan(plan.id);
          showToast(`Successfully upgraded to ${plan.name} (₹${plan.priceInr.toLocaleString('en-IN')})!`);
        }}
      />
    </div>
  );
}

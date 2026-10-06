import { useState, useEffect } from 'react';
import { Check, ShieldCheck, Zap, Sparkles, Award, ArrowLeft, Crown, User, Star, X } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth, useUser } from '../auth';
import { PaymentModal, INDIAN_RUPEE_PLANS, PlanId } from '../components/ui/PaymentModal';

export function SubscriptionPage() {
  const { user } = useUser();
  const { userId } = useAuth();
  const currentUserId = user?.id || userId || '';
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress || '';

  const [activeUserPlan, setActiveUserPlan] = useState<PlanId>('free');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<PlanId>('premium');
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
          if (authUser.planTier === 'elite' || authUser.plan?.toLowerCase().includes('elite') || authUser.planTier === 'year1') {
            setActiveUserPlan('elite');
            return;
          }
          if (authUser.planTier === 'premium' || authUser.plan?.toLowerCase().includes('premium') || authUser.planTier === 'month3') {
            setActiveUserPlan('premium');
            return;
          }
          if (authUser.planTier === 'starter' || authUser.plan?.toLowerCase().includes('starter') || authUser.planTier === 'month1' || authUser.isVip) {
            setActiveUserPlan('starter');
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
            if (matched.planTier === 'elite' || matched.plan?.toLowerCase().includes('elite') || matched.planTier === 'year1') {
              setActiveUserPlan('elite');
              return;
            }
            if (matched.planTier === 'premium' || matched.plan?.toLowerCase().includes('premium') || matched.planTier === 'month3') {
              setActiveUserPlan('premium');
              return;
            }
            if (matched.planTier === 'starter' || matched.plan?.toLowerCase().includes('starter') || matched.planTier === 'month1' || matched.isVip) {
              setActiveUserPlan('starter');
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

  const handleOpenPlanModal = (planId: PlanId) => {
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
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-700" />
          
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2 border border-rose-200">
            <Sparkles size={12} /> Indian Rupee Membership Plans
          </span>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-slate-900 font-serif-fancy">
            Find the Fellowship Plan That Fits You
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-slate-600 leading-relaxed">
            Transparent, honest plans in Indian Rupees (₹) designed to support serious Christian believers and family stewards with manual pastoral verification and direct contact facilitation.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left items-stretch">
            {/* Card 1: BASIC */}
            <div className={`flex flex-col justify-between rounded-3xl border p-6 sm:p-7 transition-all duration-300 ${
              activeUserPlan === 'free'
                ? 'border-slate-400 bg-white shadow-md'
                : 'border-slate-200/90 bg-white shadow-sm hover:shadow-md hover:border-slate-300'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <User size={18} />
                  </div>
                  {activeUserPlan === 'free' && (
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                      <Check size={10} className="stroke-[3]" /> Active Plan
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">BASIC</h3>
                
                <div className="mt-2 flex items-baseline">
                  <span className="text-3xl font-black text-slate-900">₹0</span>
                  <span className="text-xs text-slate-500 ml-1">/ forever</span>
                </div>
                
                <p className="mt-2 text-xs text-slate-500 leading-relaxed min-h-[36px]">
                  Auto-activated after profile completion. Limited daily access.
                </p>

                <div className="my-5 border-t border-slate-100" />

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>20 profile views per day</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>2 interests per day</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-slate-400 flex-shrink-0">
                      <X size={11} className="stroke-[2.5]" />
                    </span>
                    <span>No messaging</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-slate-400 flex-shrink-0">
                      <X size={11} className="stroke-[2.5]" />
                    </span>
                    <span>No contact details</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-slate-400 flex-shrink-0">
                      <X size={11} className="stroke-[2.5]" />
                    </span>
                    <span>No WhatsApp access</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-2">
                {activeUserPlan === 'free' ? (
                  <div className="w-full text-center rounded-xl border border-slate-300 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 shadow-xs">
                    <Check size={13} className="stroke-[2.5]" /> Current Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPlanModal('free')}
                    className="w-full text-center rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                  >
                    Select Free Plan
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: 1 MONTH */}
            <div className={`flex flex-col justify-between rounded-3xl border p-6 sm:p-7 transition-all duration-300 ${
              activeUserPlan === 'starter'
                ? 'border-rose-400 bg-white shadow-md'
                : 'border-slate-200/90 bg-white shadow-sm hover:shadow-xl hover:border-slate-300'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700">
                    <Star size={18} className="fill-rose-700 text-rose-700" />
                  </div>
                  {activeUserPlan === 'starter' && (
                    <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                      <Check size={10} className="stroke-[3]" /> Active Plan
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">1 MONTH</h3>
                
                <div className="mt-2 flex items-baseline">
                  <span className="text-3xl font-black text-slate-900">₹799</span>
                  <span className="text-xs text-slate-500 ml-1">/ 1 month</span>
                </div>
                
                <p className="mt-2 text-xs text-slate-500 leading-relaxed min-h-[36px]">
                  One month of full communication access at our low introductory trial rate.
                </p>

                <div className="my-5 border-t border-slate-100" />

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Unlimited profile views</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Send up to 100 interests</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Unlimited messaging</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>View 50 contact details</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-slate-400 flex-shrink-0">
                      <X size={11} className="stroke-[2.5]" />
                    </span>
                    <span>No WhatsApp concierge</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-2">
                {activeUserPlan === 'starter' ? (
                  <div className="w-full text-center rounded-xl border border-slate-300 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 shadow-xs">
                    <Check size={13} className="stroke-[2.5]" /> Current Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPlanModal('starter')}
                    className="w-full text-center rounded-xl bg-rose-800 hover:bg-rose-900 text-white py-2.5 text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    Choose 1 Month
                  </button>
                )}
              </div>
            </div>

            {/* Card 3: 3 MONTHS (MOST POPULAR) */}
            <div className={`relative flex flex-col justify-between rounded-3xl border-2 p-6 sm:p-7 transition-all duration-300 transform lg:-translate-y-2 ${
              activeUserPlan === 'premium'
                ? 'border-rose-600 bg-white shadow-xl'
                : 'border-rose-500 bg-white shadow-lg hover:border-rose-600'
            }`}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-rose-700 px-4 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm whitespace-nowrap">
                MOST POPULAR
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-800">
                    <Star size={18} className="fill-rose-800 text-rose-800" />
                  </div>
                  {activeUserPlan === 'premium' && (
                    <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1">
                      <Check size={10} className="stroke-[3]" /> Active Plan
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">3 MONTHS</h3>
                
                <div className="mt-2 flex items-baseline">
                  <span className="text-3xl font-black text-slate-900">₹2,999</span>
                  <span className="text-xs text-slate-500 ml-1">/ 3 months</span>
                </div>
                
                <p className="mt-2 text-xs text-slate-500 leading-relaxed min-h-[36px]">
                  Three months — our recommended plan. Full matchmaking and pastor verification.
                </p>

                <div className="my-5 border-t border-slate-100" />

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Unlimited profile views</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Send up to 300 interests</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Unlimited messaging</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>View 150 contact details</span>
                  </li>
                  <li className="flex items-center gap-2.5 font-medium text-slate-800">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Pastoral badge priority</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-2">
                {activeUserPlan === 'premium' ? (
                  <div className="w-full text-center rounded-xl border border-slate-300 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 shadow-xs">
                    <Check size={13} className="stroke-[2.5]" /> Current Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPlanModal('premium')}
                    className="w-full text-center rounded-xl bg-rose-700 hover:bg-rose-800 text-white py-2.5 text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    Choose 3 Months
                  </button>
                )}
              </div>
            </div>

            {/* Card 4: 1 YEAR */}
            <div className={`flex flex-col justify-between rounded-3xl border p-6 sm:p-7 transition-all duration-300 ${
              activeUserPlan === 'elite'
                ? 'border-amber-400 bg-white shadow-md'
                : 'border-slate-200/90 bg-white shadow-sm hover:shadow-xl hover:border-slate-300'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                    <Crown size={18} className="fill-amber-600 text-amber-700" />
                  </div>
                  {activeUserPlan === 'elite' && (
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                      <Check size={10} className="stroke-[3]" /> Active Plan
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">1 YEAR</h3>
                
                <div className="mt-2 flex items-baseline">
                  <span className="text-3xl font-black text-slate-900">₹9,999</span>
                  <span className="text-xs text-slate-500 ml-1">/ 1 year</span>
                </div>
                
                <p className="mt-2 text-xs text-slate-500 leading-relaxed min-h-[36px]">
                  Full year of unlimited matchmaking, VIP concierge & dedicated pastoral facilitation.
                </p>

                <div className="my-5 border-t border-slate-100" />

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Unlimited profile views</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Unlimited interests</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>Unlimited messaging</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <Check size={11} className="stroke-[3]" />
                    </span>
                    <span>View 400 contact details</span>
                  </li>
                  <li className="flex items-center gap-2.5 font-medium text-slate-800">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-amber-50 text-amber-700 flex-shrink-0">
                      <Crown size={11} className="fill-amber-600" />
                    </span>
                    <span>Direct WhatsApp & VIP support</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-2">
                {activeUserPlan === 'elite' ? (
                  <div className="w-full text-center rounded-xl border border-slate-300 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 shadow-xs">
                    <Check size={13} className="stroke-[2.5]" /> Current Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPlanModal('elite')}
                    className="w-full text-center rounded-xl bg-slate-900 hover:bg-black text-white py-2.5 text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Crown size={14} className="fill-amber-400 text-amber-400" /> Choose 1 Year
                  </button>
                )}
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

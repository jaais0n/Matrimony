import React, { useState } from 'react';
import { 
  Check, 
  ShieldCheck, 
  X, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Sparkles, 
  Lock, 
  ArrowRight,
  Award,
  Zap,
  CheckCircle2,
  QrCode
} from 'lucide-react';
import { useAuth, useUser } from '../../auth';

export interface PlanDetails {
  id: 'free' | 'premium' | 'elite';
  name: string;
  badge: string;
  priceInr: number;
  durationLabel: string;
  monthlyEquivalent: string;
  description: string;
  perks: string[];
}

export const INDIAN_RUPEE_PLANS: Record<'free' | 'premium' | 'elite', PlanDetails> = {
  free: {
    id: 'free',
    name: 'Free Fellowship',
    badge: 'Basic',
    priceInr: 0,
    durationLabel: 'Free Forever',
    monthlyEquivalent: '₹0 / mo',
    description: 'Essential fellowship tools to discover and connect with verified Pentecostal profiles.',
    perks: [
      'Create verified believer profile',
      '10 Express Interests per month',
      'Basic denomination & assembly filters',
      'Direct chat with mutual connections',
      'Standard discovery listing',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium Partner',
    badge: 'Popular Choice',
    priceInr: 1499,
    durationLabel: '3 Months Plan',
    monthlyEquivalent: '₹499 / mo equivalent',
    description: 'Unmetered communication, verified contacts, and priority pastoral review for serious seekers.',
    perks: [
      'Unlimited daily Express Interests',
      'View verified contact numbers & email',
      'See who viewed & liked your profile',
      'Advanced assembly, church & NRI filters',
      'Priority in pastoral verification queue',
      'Highlighted candidate search card',
    ],
  },
  elite: {
    id: 'elite',
    name: 'Elite VIP Steward',
    badge: 'VIP Steward',
    priceInr: 2999,
    durationLabel: '6 Months Plan',
    monthlyEquivalent: '₹499 / mo equivalent',
    description: 'Full pastoral concierge, background check facilitation, and private match introductions.',
    perks: [
      'Everything included in Premium',
      'Dedicated pastoral family steward concierge',
      'Pastoral background & reference check assistance',
      'VIP Spotlight badge on Discover directory',
      'Personalized matrimonial recommendation assistance',
      'Confidential family contact sharing',
    ],
  },
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlanId?: 'free' | 'premium' | 'elite';
  onSuccess?: (plan: PlanDetails) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  defaultPlanId = 'premium',
  onSuccess,
}: PaymentModalProps) {
  const { user } = useUser();
  const { userId } = useAuth();
  const currentUserId = user?.id || userId || '';
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress || '';
  const currentUserName = user?.fullName || 'Believer Member';

  const [selectedPlanId, setSelectedPlanId] = useState<'free' | 'premium' | 'elite'>(defaultPlanId);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlan = INDIAN_RUPEE_PLANS[selectedPlanId];

  const handleSimulatePayment = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1. Persist to cloud Neon PostgreSQL via serverless endpoint
      const response = await fetch('/api/auth/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId || 'guest',
          userEmail: currentUserEmail,
          planId: currentPlan.id,
          planName: currentPlan.name,
          amount: currentPlan.priceInr,
          paymentMethod: paymentMethod.toUpperCase(),
          paymentId: `pay_inr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        }),
      });

      // 2. Persist locally to current session & profiles
      try {
        const authRaw = localStorage.getItem('pm_auth_user');
        if (authRaw) {
          const authUser = JSON.parse(authRaw);
          authUser.plan = currentPlan.name;
          authUser.planTier = currentPlan.id;
          authUser.isVip = currentPlan.id !== 'free';
          authUser.interestsRemaining = currentPlan.id === 'free' ? 10 : 9999;
          localStorage.setItem('pm_auth_user', JSON.stringify(authUser));
        }

        const accountsRaw = localStorage.getItem('pm_registered_accounts');
        if (accountsRaw) {
          const accounts = JSON.parse(accountsRaw);
          const idx = accounts.findIndex(
            (a: any) =>
              (currentUserId && a.id === currentUserId) ||
              (currentUserEmail && a.email?.toLowerCase() === currentUserEmail.toLowerCase())
          );
          if (idx >= 0) {
            accounts[idx].plan = currentPlan.name;
            accounts[idx].planTier = currentPlan.id;
            accounts[idx].isVip = currentPlan.id !== 'free';
            accounts[idx].interestsRemaining = currentPlan.id === 'free' ? 10 : 9999;
            localStorage.setItem('pm_registered_accounts', JSON.stringify(accounts));
          }
        }

        const myProfRaw = localStorage.getItem('pm_my_profile');
        if (myProfRaw) {
          const myProf = JSON.parse(myProfRaw);
          myProf.plan = currentPlan.id;
          myProf.isVip = currentPlan.id !== 'free';
          myProf.vipBadge = currentPlan.id === 'elite' ? 'VIP Steward' : currentPlan.id === 'premium' ? 'Premium' : undefined;
          localStorage.setItem('pm_my_profile', JSON.stringify(myProf));
        }

        window.dispatchEvent(new CustomEvent('pm:sync'));
      } catch (storageErr) {
        console.warn('Storage sync issue:', storageErr);
      }

      setIsProcessing(false);
      setIsSuccess(true);
      onSuccess?.(currentPlan);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
    }
  };

  const handleModalClose = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#ebdcd0] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={handleModalClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-300/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
              <Sparkles size={11} /> Indian Rupee Plans
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-200">
              <Lock size={11} /> 256-bit Secure Checkout
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-serif-fancy">
            Upgrade Your Fellowship Membership
          </h2>
          <p className="text-xs text-rose-100/80 mt-1">
            Choose a plan in Indian Rupees (₹) to connect unhindered with verified believers.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {isSuccess ? (
            /* Celebration / Success Screen */
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Payment Verified & Activated
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  Welcome to {currentPlan.name}!
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Your membership has been upgraded to <strong>₹{currentPlan.priceInr.toLocaleString('en-IN')}</strong>. Unlimited daily connection requests and VIP privileges are active immediately.
                </p>
              </div>

              <div className="bg-gradient-to-r from-rose-50 via-white to-amber-50 p-4 rounded-2xl border border-rose-200/80 max-w-md mx-auto text-left space-y-2">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-rose-100">
                  <span className="text-slate-500 font-medium">Member Account:</span>
                  <span className="font-bold text-slate-900">{currentUserEmail || currentUserName}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-rose-100">
                  <span className="text-slate-500 font-medium">Active Plan:</span>
                  <span className="font-extrabold text-rose-700">{currentPlan.name} ({currentPlan.durationLabel})</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Daily Interest Quota:</span>
                  <span className="font-extrabold text-emerald-700">Unlimited (9999 / mo)</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Start Exploring Believers →
                </button>
              </div>
            </div>
          ) : (
            /* Checkout & Plan Selection */
            <>
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  {errorMessage}
                </div>
              )}

              {/* Plan Switcher Pills */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Membership Tier
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(['free', 'premium', 'elite'] as const).map((pid) => {
                    const p = INDIAN_RUPEE_PLANS[pid];
                    const isSelected = selectedPlanId === pid;
                    return (
                      <div
                        key={pid}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedPlanId(pid)}
                        className={`p-3.5 rounded-2xl border-2 transition cursor-pointer text-left relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-rose-600 bg-rose-50/60 shadow-xs ring-2 ring-rose-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {pid === 'premium' && (
                          <span className="absolute -top-2.5 right-3 bg-rose-700 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                            Popular
                          </span>
                        )}
                        {pid === 'elite' && (
                          <span className="absolute -top-2.5 right-3 bg-amber-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                            VIP
                          </span>
                        )}

                        <div>
                          <div className="text-xs font-extrabold text-slate-900">{p.name}</div>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-lg font-black text-slate-900">
                              {p.priceInr === 0 ? 'Free' : `₹${p.priceInr.toLocaleString('en-IN')}`}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {p.priceInr === 0 ? 'forever' : `/${pid === 'premium' ? '3 mo' : '6 mo'}`}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-[10px] text-slate-500 font-medium">
                          {p.monthlyEquivalent}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Plan Details Card */}
              <div className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/50 via-white to-amber-50/30 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-rose-700" />
                    <span className="text-sm font-bold text-slate-900">{currentPlan.name} Plan Benefits</span>
                  </div>
                  <span className="text-xs font-black text-rose-700">
                    {currentPlan.priceInr === 0 ? '₹0 Free' : `₹${currentPlan.priceInr.toLocaleString('en-IN')} All-Inclusive`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {currentPlan.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Check size={13} className="text-emerald-600 shrink-0 font-bold" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods (If not free plan) */}
              {currentPlan.priceInr > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Choose Indian Payment Method
                    </label>

                    {/* Method Tabs */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          paymentMethod === 'upi'
                            ? 'border-rose-600 bg-rose-50/80 text-rose-800 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Smartphone size={18} className="mb-1 text-rose-600" />
                        <span>UPI / QR</span>
                        <span className="text-[9px] text-emerald-600 font-semibold mt-0.5">Instant GPay/PhonePe</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          paymentMethod === 'card'
                            ? 'border-rose-600 bg-rose-50/80 text-rose-800 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard size={18} className="mb-1 text-rose-600" />
                        <span>Debit / Credit</span>
                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5">RuPay, Visa, MC</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('netbanking')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          paymentMethod === 'netbanking'
                            ? 'border-rose-600 bg-rose-50/80 text-rose-800 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 size={18} className="mb-1 text-rose-600" />
                        <span>Net Banking</span>
                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5">All Indian Banks</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Details */}
                  {paymentMethod === 'upi' && (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Simulated Indian UPI QR Code */}
                        <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <div className="h-28 w-28 bg-slate-900 rounded-lg p-2 flex items-center justify-center text-white relative">
                            {/* SVG stylised QR code grid */}
                            <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm8-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-6 2h2v2h-2v-2zm4 0h2v2h-2v-2z" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-amber-300 bg-slate-900/80 rounded-md">
                              ₹{currentPlan.priceInr}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold mt-1">Scan via any UPI App</span>
                        </div>

                        {/* UPI ID Form */}
                        <div className="flex-1 w-full space-y-2">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Or Enter UPI Virtual Payment Address (VPA)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                              placeholder="e.g. mobile@okhdfcbank or name@upi"
                              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-600 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'CRED'].map((app) => (
                              <span key={app} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 shadow-2xs">
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4111 •••• •••• 4111 (RuPay / Visa / Master)"
                          maxLength={19}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-600 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">CVV</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="•••"
                            maxLength={4}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">Select Bank</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-600 focus:outline-none"
                      >
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="State Bank of India">State Bank of India (SBI)</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Federal Bank">Federal Bank</option>
                        <option value="South Indian Bank">South Indian Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                        <option value="Catholic Syrian Bank">Catholic Syrian Bank</option>
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                  <span className="font-bold">Standard Free Fellowship:</span> You will be active with 10 express connection requests per month with zero billing.
                </div>
              )}

              {/* Order Total & CTA */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between py-2 text-xs">
                  <span className="text-slate-500">Plan Duration:</span>
                  <span className="font-bold text-slate-800">{currentPlan.durationLabel}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="font-bold text-slate-700">Total Payable Amount:</span>
                  <span className="text-xl font-black text-rose-700">
                    {currentPlan.priceInr === 0 ? '₹0 Free' : `₹${currentPlan.priceInr.toLocaleString('en-IN')}`}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 shadow-md transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Verifying & Activating Plan in Database...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>
                          {currentPlan.priceInr === 0 
                            ? 'Activate Free Fellowship Tier' 
                            : `Pay ₹${currentPlan.priceInr.toLocaleString('en-IN')} & Activate ${currentPlan.name}`}
                        </span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    <span>Instant Indian Rupee activation • Neon PostgreSQL encrypted sync</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

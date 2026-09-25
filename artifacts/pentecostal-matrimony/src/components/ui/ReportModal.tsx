import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
  profileName: string;
}

const REPORT_REASONS = [
  { id: 'fake_profile', label: 'Fake Profile or Impersonation' },
  { id: 'spam', label: 'Spam, Commercial Promotion or Solicitation' },
  { id: 'harassment', label: 'Harassment, Disrespect or Pressure' },
  { id: 'inappropriate_content', label: 'Inappropriate Content or Photography' },
  { id: 'misrepresentation', label: 'Misrepresentation of Church or Faith Details' },
  { id: 'other', label: 'Other Concerns' },
];

export function ReportModal({ isOpen, onClose, onSubmit, profileName }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('fake_profile');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedReason, details);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setDetails('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md border border-black bg-white p-6 shadow-none">
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} strokeWidth={2} />
            <h3 className="text-base font-bold">Report Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <p className="text-sm font-bold">Report Received</p>
            <p className="mt-2 text-xs text-[#555555]">
              Thank you for keeping our community safe. Our pastoral stewards will review this profile.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <p className="text-xs text-[#555555]">
              Reporting profile for <strong className="text-black">{profileName}</strong>. Select the primary issue:
            </p>

            <div className="space-y-2 border border-black/15 p-3">
              {REPORT_REASONS.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-start gap-2.5 py-1 text-xs">
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.id}
                    checked={selectedReason === r.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-0.5 accent-black"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#555555]">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide any relevant context for the stewards..."
                className="mt-1.5 min-h-[70px] w-full border border-black/20 p-2.5 text-xs focus:border-black focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-black/30 bg-white px-4 py-2 text-xs font-semibold hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="border border-black bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

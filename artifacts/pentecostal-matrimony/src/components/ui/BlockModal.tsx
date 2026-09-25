import { Ban, X } from 'lucide-react';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  profileName: string;
}

export function BlockModal({ isOpen, onClose, onConfirm, profileName }: BlockModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm border border-black bg-white p-6 shadow-none">
        <div className="flex items-center justify-between border-b border-black/10 pb-3">
          <div className="flex items-center gap-2">
            <Ban size={18} strokeWidth={2} />
            <h3 className="text-base font-bold">Block Profile</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="py-4 text-xs text-[#555555] leading-relaxed">
          Are you sure you want to block <strong>{profileName}</strong>?
          <p className="mt-2">
            They will no longer be able to view your profile, express interest, or send you private messages.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10">
          <button
            type="button"
            onClick={onClose}
            className="border border-black/30 bg-white px-4 py-2 text-xs font-semibold hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="border border-black bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90"
          >
            Block Profile
          </button>
        </div>
      </div>
    </div>
  );
}

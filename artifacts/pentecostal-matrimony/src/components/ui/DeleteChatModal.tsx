import { Trash2, X } from 'lucide-react';

interface DeleteChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  participantName: string;
}

export function DeleteChatModal({ isOpen, onClose, onConfirm, participantName }: DeleteChatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Conversation</h3>
              <p className="text-xs text-slate-500">Remove chat thread from your inbox</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="py-4 text-xs text-slate-600 leading-relaxed space-y-2">
          <p>
            Are you sure you want to delete your conversation with{' '}
            <strong className="text-slate-900">{participantName}</strong>?
          </p>
          <p className="text-[11px] text-slate-500 bg-rose-50/60 p-3 rounded-xl border border-rose-100 text-rose-800">
            This will permanently remove this chat history and remove the thread from your active conversations list.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="rounded-xl bg-rose-700 hover:bg-rose-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Delete Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}

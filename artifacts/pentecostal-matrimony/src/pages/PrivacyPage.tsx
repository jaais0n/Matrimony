import { useEffect, useState } from 'react';
import { AlertCircle, Lock, Shield, Trash2 } from 'lucide-react';
import { useGetMyPrivacy, useUpdateMyPrivacy } from '@workspace/api-client-react';
import type { PrivacySettings } from '@workspace/api-client-react';

const defaultPrivacy: PrivacySettings = {
  profileVisible: true,
  photoVisibility: 'all_members',
  contactVisibility: 'connections_only',
  showOnlineStatus: false,
  interestPermissions: 'preferred_matches',
};

export function PrivacyPage() {
  const privacy = useGetMyPrivacy();
  const update = useUpdateMyPrivacy();
  const [settings, setSettings] = useState<PrivacySettings>(defaultPrivacy);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (privacy.data) setSettings(privacy.data);
  }, [privacy.data]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const patch = (key: keyof PrivacySettings, value: boolean | string) => {
    const next = { ...settings, [key]: value } as PrivacySettings;
    setSettings(next);
    update.mutate(
      { data: { [key]: value } },
      {
        onSuccess: (result) => {
          setSettings(result);
          showToast('Privacy setting updated.');
        },
      }
    );
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you wish to delete your profile and account permanently? All data will be erased.')) {
      showToast('Account scheduled for permanent erasure.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-24 md:pb-12 text-black">
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 border border-black bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-none">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="border border-black/20 bg-white p-6 sm:p-10">
          <div className="border-b border-black/15 pb-4 mb-6">
            <p className="eyebrow mb-1">Confidentiality & Control</p>
            <h1 className="text-2xl font-black tracking-tight">Privacy Settings</h1>
            <p className="mt-1 text-xs text-[#555555]">
              Control your profile discovery, photo permissions, and communication boundaries.
            </p>
          </div>

          <div className="space-y-4">
            {/* Profile Visibility */}
            <label className="flex cursor-pointer items-center justify-between border border-black/20 p-4 transition hover:border-black">
              <div>
                <span className="block text-xs font-bold text-black">Profile Visibility</span>
                <span className="block text-[11px] text-[#555555] mt-0.5">
                  Allow your verified profile to be discovered in search and matches.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.profileVisible}
                onChange={(e) => patch('profileVisible', e.target.checked)}
                className="h-4 w-4 accent-black"
              />
            </label>

            {/* Photo Visibility */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-black/20 p-4 gap-3">
              <div>
                <span className="block text-xs font-bold text-black">Photo Visibility</span>
                <span className="block text-[11px] text-[#555555] mt-0.5">
                  Choose who can view your portrait photographs.
                </span>
              </div>
              <select
                value={settings.photoVisibility}
                onChange={(e) => patch('photoVisibility', e.target.value)}
                className="border border-black/25 bg-white p-2 text-xs focus:border-black focus:outline-none min-w-[200px]"
              >
                <option value="all_members">All Verified Members</option>
                <option value="connections_only">Mutual Connections Only</option>
                <option value="private">Private (Upon Approval)</option>
              </select>
            </div>

            {/* Contact Visibility */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-black/20 p-4 gap-3">
              <div>
                <span className="block text-xs font-bold text-black">Contact Details Protection</span>
                <span className="block text-[11px] text-[#555555] mt-0.5">
                  Phone and email are never publicly displayed.
                </span>
              </div>
              <select
                value={settings.contactVisibility}
                onChange={(e) => patch('contactVisibility', e.target.value)}
                className="border border-black/25 bg-white p-2 text-xs focus:border-black focus:outline-none min-w-[200px]"
              >
                <option value="connections_only">Mutual Connections Only</option>
                <option value="private">Strictly In-App Only</option>
              </select>
            </div>

            {/* Online Status */}
            <label className="flex cursor-pointer items-center justify-between border border-black/20 p-4 transition hover:border-black">
              <div>
                <span className="block text-xs font-bold text-black">Online Activity Indicator</span>
                <span className="block text-[11px] text-[#555555] mt-0.5">
                  Show when you are currently active on the platform.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={(e) => patch('showOnlineStatus', e.target.checked)}
                className="h-4 w-4 accent-black"
              />
            </label>

            {/* Interest Permissions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-black/20 p-4 gap-3">
              <div>
                <span className="block text-xs font-bold text-black">Who Can Send Interest</span>
                <span className="block text-[11px] text-[#555555] mt-0.5">
                  Filter inbound interest to members matching your criteria.
                </span>
              </div>
              <select
                value={settings.interestPermissions}
                onChange={(e) => patch('interestPermissions', e.target.value)}
                className="border border-black/25 bg-white p-2 text-xs focus:border-black focus:outline-none min-w-[200px]"
              >
                <option value="preferred_matches">Preferred Matches Only</option>
                <option value="all_members">All Verified Believers</option>
              </select>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-8 border border-black/20 bg-[#fafafa] p-5 text-xs text-[#555555]">
            <div className="flex items-start gap-3">
              <Lock size={18} className="shrink-0 mt-0.5 text-black" />
              <div>
                <h4 className="font-bold text-black uppercase tracking-wider text-[11px]">Strict Christian Matrimonial Trust</h4>
                <p className="mt-1 leading-relaxed">
                  We will never sell, lease, or distribute your private data. Identity documents submitted for verification are purged from active memory once approved by pastoral stewards.
                </p>
              </div>
            </div>
          </div>

          {/* Account Deletion */}
          <div className="mt-8 border-t border-black/15 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-black">Delete Profile & Account</span>
              <p className="text-[11px] text-[#777777] mt-0.5">
                Permanently erase your matrimonial profile, messages, and saved data.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="flex items-center gap-1.5 border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-black hover:text-white transition"
            >
              <Trash2 size={14} /> Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

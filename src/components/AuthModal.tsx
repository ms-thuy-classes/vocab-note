import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Cloud,
  Laptop,
  Loader2,
  LogIn,
  LogOut,
  Smartphone,
  X,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  user: User | null;
  isSyncing: boolean;
  syncError: string | null;
  wordCount: number;
  folderCount: number;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  user,
  isSyncing,
  syncError,
  wordCount,
  folderCount,
  onSignInWithGoogle,
  onSignOut,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      await onSignInWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await onSignOut();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2438]/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-[#FFFDF9] rounded-2xl border border-[#D5CEF5] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[#E6E6FA]/80 via-[#FFE4E1]/65 to-[#E0F2F1]/80 border-b border-[#867C96]/15 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/85 flex items-center justify-center text-[#4D3B73]">
              <Cloud className="w-5 h-5" />
            </span>
            <div>
              <h3 id="auth-modal-title" className="text-base font-bold text-[#2B2438]">
                Student Account & Cloud Sync
              </h3>
              <p className="text-xs text-[#5E556E]">
                Đăng nhập để lưu bài học & mở trên mọi thiết bị
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="p-2 rounded-xl bg-white/80 text-[#5E556E] hover:text-[#2B2438] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {syncError && (
            <div className="p-3 rounded-xl bg-[#FFF2F0] border border-[#F7CBC6] text-xs font-semibold text-[#632F2D]">
              {syncError}
            </div>
          )}

          {!user ? (
            <>
              <div className="space-y-3 text-sm text-[#2B2438]">
                <p className="font-semibold leading-relaxed">
                  Sign in with your Google account to save all folders, vocabulary, images, XP points, and study reminders directly to cloud hosting.
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-xs text-[#5E556E]">
                  <div className="p-3 rounded-xl bg-[#F3F0FC]/70 border border-[#D5CEF5] flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-[#4D3B73] shrink-0" />
                    <span>Laptop & Tablet</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#EEF9F8]/80 border border-[#BFE3E0] flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#1F4F4B] shrink-0" />
                    <span>Any Mobile Phone</span>
                  </div>
                </div>
                <p className="text-xs text-[#5E556E]">
                  Hiện đang có <strong className="text-[#2B2438]">{folderCount}</strong> thư mục và{' '}
                  <strong className="text-[#2B2438]">{wordCount}</strong> từ vựng trên máy này — khi đăng nhập lần đầu, hệ thống sẽ tự động lưu toàn bộ lên tài khoản của bạn.
                </p>
              </div>

              <button
                type="button"
                disabled={busy || isSyncing}
                onClick={handleGoogleSignIn}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-[#6F5C96] to-[#B55F78] text-white text-sm font-bold hover:opacity-95 disabled:opacity-60 shadow-sm cursor-pointer"
              >
                {busy || isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>
                  {busy || isSyncing
                    ? 'Đang kết nối Google...'
                    : 'Sign in with Google (Đăng nhập Google)'}
                </span>
              </button>
            </>
          ) : (
            <>
              <div className="p-4 rounded-2xl bg-[#F3F0FC]/75 border border-[#D5CEF5] flex items-center gap-3.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Student avatar'}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover border border-white shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#E6E6FA] flex items-center justify-center text-lg font-bold text-[#3F3163] shrink-0">
                    {(user.displayName || user.email || 'S').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#2B2438] truncate">
                    {user.displayName || 'Student'}
                  </p>
                  <p className="text-xs text-[#5E556E] truncate">{user.email}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#E0F2F1]/80 border border-[#9ADCD5] text-xs font-semibold text-[#1F4F4B] flex items-start gap-2.5">
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {isSyncing ? 'Syncing with Cloud Firestore...' : 'Cloud Sync Active'}
                  </p>
                  <p className="mt-0.5 opacity-90">
                    {folderCount} folders · {wordCount} words saved safely. Open this link on any device and sign in with {user.email} to continue learning.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleSignOut}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#F29C94] text-[#9B4848] hover:bg-[#FFF2F0] text-sm font-bold cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out (Đăng xuất)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

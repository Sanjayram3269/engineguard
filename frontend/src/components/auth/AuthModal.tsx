import React from 'react';
import { User } from 'firebase/auth';
import {
  X,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  LogOut,
  Sparkles
} from 'lucide-react';
import { isFirebaseConfigured, signOutUser } from '../../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  authError: string | null;
  isAuthenticating: boolean;
  onTriggerSignIn: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  authError,
  isAuthenticating,
  onTriggerSignIn
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const envTemplate = `# EnginePulse AI .env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=enginepulse.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=enginepulse-ai
VITE_FIREBASE_STORAGE_BUCKET=enginepulse.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:...`;

  const copyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0e1218] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 text-left text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          /* Authenticated State */
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-14 h-14 rounded-full border-2 border-[#ff5e1e] object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#ff5e1e]/20 border border-[#ff5e1e]/40 flex items-center justify-center text-[#ff7733] font-bold text-xl">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-lg">
                    {currentUser.displayName || 'Authenticated User'}
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <div className="bg-[#141922] p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Sparkles className="w-4 h-4 text-[#ff5e1e]" />
                <span>Google Sign-In Active</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your session is authenticated with Google via Firebase. All public engine exploration features and visual architectures are active.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[11px] font-mono text-slate-500">
                UID: {currentUser.uid.slice(0, 10)}...
              </span>
              <button
                onClick={async () => {
                  await signOutUser();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-mono transition flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        ) : !isFirebaseConfigured() ? (
          /* Firebase Setup / Missing Config Guidance */
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff5e1e]/15 border border-[#ff5e1e]/30 flex items-center justify-center text-[#ff7733]">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Google Authentication Setup
                </h3>
                <p className="text-xs text-slate-400">
                  Firebase project credentials needed to trigger Google Sign-In
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To connect genuine Google OAuth, create a Firebase project with the Google Sign-in provider enabled, then populate the variables in your local <code className="text-[#ff7733] bg-black/40 px-1 py-0.5 rounded font-mono">.env</code> file:
            </p>

            <div className="relative">
              <pre className="bg-[#080a0d] p-3.5 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300 overflow-x-auto">
                {envTemplate}
              </pre>
              <button
                onClick={copyEnv}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-mono flex items-center gap-1.5 transition text-slate-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[#ff7733] hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                Open Firebase Console <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          /* Firebase Configured - Direct Google Sign-In */
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-bold text-xl tracking-tight">
                Sign in to EnginePulse AI
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Authenticate with your Google account to access all engine intelligence features.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={onTriggerSignIn}
              disabled={isAuthenticating}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm transition flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
            >
              {isAuthenticating ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isAuthenticating ? 'Connecting...' : 'Continue with Google'}</span>
            </button>

            <p className="text-[11px] text-slate-500 text-center">
              Genuine Firebase OAuth • No external tracking or telemetry storage
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

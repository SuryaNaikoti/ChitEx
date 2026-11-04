import React, { useState } from 'react';
import { UserRole, LanguageCode } from '../types';
import { Coins, MoreHorizontal, Sparkles, Shield, User, BarChart2 } from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  coinBalance: number;
  onOpenWallet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  currentLanguage,
  onLanguageChange,
  coinBalance,
  onOpenWallet,
}) => {
  const [showRoleDrawer, setShowRoleDrawer] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0c0c0e]/80 backdrop-blur-xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Minimalist Logo */}
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              nectar
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />
          </div>

          {/* Right minimal actions */}
          <div className="flex items-center gap-2.5">
            {/* Minimal Language Toggle */}
            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-full px-2.5 py-1 text-[11px] font-medium text-zinc-300">
              <select
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                aria-label="Language"
                className="bg-transparent focus:outline-none cursor-pointer text-zinc-200 uppercase font-semibold"
              >
                <option value="te" className="bg-[#141416] text-white">TE</option>
                <option value="hi" className="bg-[#141416] text-white">HI</option>
                <option value="en" className="bg-[#141416] text-white">EN</option>
              </select>
            </div>

            {/* Subtle Coin Wallet Pill */}
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-1.5 bg-amber-400/10 hover:bg-amber-400/15 border border-amber-400/20 rounded-full px-3 py-1 transition-all active:scale-95 cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">{coinBalance}</span>
            </button>

            {/* Discreet Switcher Trigger (Dots) */}
            <button
              onClick={() => setShowRoleDrawer(!showRoleDrawer)}
              className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Switch Space"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Discreet Space Switcher Sheet */}
      {showRoleDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-end p-4 animate-in fade-in"
          onClick={() => setShowRoleDrawer(false)}
        >
          <div
            className="w-56 mt-12 bg-[#16161a] border border-white/10 rounded-2xl p-2 shadow-2xl text-xs space-y-1 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
              Switch View
            </div>

            <button
              onClick={() => {
                onRoleChange('user');
                setShowRoleDrawer(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                currentRole === 'user'
                  ? 'bg-amber-400/15 text-amber-300 font-semibold'
                  : 'text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Dating / Discovery</span>
            </button>

            <button
              onClick={() => {
                onRoleChange('creator');
                setShowRoleDrawer(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                currentRole === 'creator'
                  ? 'bg-amber-400/15 text-amber-300 font-semibold'
                  : 'text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Host Earnings</span>
            </button>

            <button
              onClick={() => {
                onRoleChange('moderator');
                setShowRoleDrawer(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                currentRole === 'moderator'
                  ? 'bg-amber-400/15 text-amber-300 font-semibold'
                  : 'text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Safety & Moderation</span>
            </button>

            <button
              onClick={() => {
                onRoleChange('admin');
                setShowRoleDrawer(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                currentRole === 'admin'
                  ? 'bg-amber-400/15 text-amber-300 font-semibold'
                  : 'text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Platform Metrics</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

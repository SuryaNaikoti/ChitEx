import React from 'react';
import { UserProfile } from '../types';
import { Phone, Check, X } from 'lucide-react';

interface PreCallPricingModalProps {
  partner: UserProfile;
  coinBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
  onOpenWallet: () => void;
}

export const PreCallPricingModal: React.FC<PreCallPricingModalProps> = ({
  partner,
  coinBalance,
  onConfirm,
  onCancel,
  onOpenWallet,
}) => {
  const hasSufficientCoins = coinBalance >= partner.callRatePerMin;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#141416] border border-white/10 rounded-[32px] w-full max-w-xs p-6 text-white shadow-2xl space-y-5 text-center">
        {/* Partner Avatar */}
        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto ring-2 ring-white/10">
          <img
            src={partner.avatarUrl}
            alt={partner.displayName}
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">{partner.displayName}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{partner.location}</p>
        </div>

        {/* Minimal Rate */}
        <div className="py-3 border-y border-white/[0.06] flex items-center justify-between text-xs px-2">
          <span className="text-zinc-400">Rate</span>
          <span className="font-bold text-amber-300">{partner.callRatePerMin} Coins / min</span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onCancel}
            className="w-12 h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {hasSufficientCoins ? (
            <button
              onClick={onConfirm}
              className="flex-1 h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Start Voice Call</span>
            </button>
          ) : (
            <button
              onClick={onOpenWallet}
              className="flex-1 h-12 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Add Coins (₹49)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface CallSummaryModalProps {
  summary: {
    durationSeconds: number;
    coinsBilled: number;
    partner: UserProfile;
  };
  onClose: () => void;
}

export const CallSummaryModal: React.FC<CallSummaryModalProps> = ({
  summary,
  onClose,
}) => {
  const mins = Math.floor(summary.durationSeconds / 60);
  const secs = summary.durationSeconds % 60;
  const durationStr = `${mins}m ${secs}s`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95">
      <div className="bg-[#141416] border border-white/10 rounded-[32px] w-full max-w-xs p-6 text-white shadow-2xl space-y-5 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
          <Check className="w-6 h-6 stroke-[2.5]" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">Call Ended</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{summary.partner.displayName}</p>
        </div>

        <div className="py-2 border-y border-white/[0.06] text-xs space-y-1.5">
          <div className="flex justify-between text-zinc-400">
            <span>Duration</span>
            <span className="text-white font-mono">{durationStr}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Coins Billed</span>
            <span className="text-amber-300 font-bold">{summary.coinsBilled} 🪙</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full h-12 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};

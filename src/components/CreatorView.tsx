import React, { useState } from 'react';
import { CreatorEarnings } from '../types';
import { Sparkles, IndianRupee, ArrowDownToLine, Clock, Gift, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';

interface CreatorViewProps {
  earnings: CreatorEarnings;
  onRequestPayout: (amountInr: number, destination: string) => void;
}

export const CreatorView: React.FC<CreatorViewProps> = ({
  earnings,
  onRequestPayout,
}) => {
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('1000');
  const [upiId, setUpiId] = useState('creator@okhdfcbank');
  const [errorMsg, setErrorMsg] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  const handleSubmitPayout = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    if (isNaN(amountNum) || amountNum < 500) {
      setErrorMsg('Minimum withdrawal threshold is ₹500.00');
      return;
    }
    if (amountNum > earnings.withdrawableInr) {
      setErrorMsg('Requested amount exceeds your available withdrawable balance');
      return;
    }
    if (!upiId.includes('@')) {
      setErrorMsg('Please provide a valid Indian UPI ID (e.g., name@okaxis, handle@paytm)');
      return;
    }

    onRequestPayout(amountNum, upiId);
    soundEngine.playConnectChime();
    setPayoutSuccess(true);
    setTimeout(() => {
      setPayoutSuccess(false);
      setShowPayoutModal(false);
    }, 1500);
  };

  return (
    <div className="pb-24 pt-2 px-3 sm:px-4 max-w-md mx-auto space-y-4">
      {/* Creator Header Status */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-black text-white">Creator Earnings Hub</h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              Approved Host
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Real-time gift earnings statements & automated UPI payouts
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>
      </div>

      {/* Withdrawable Earnings Card */}
      <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 border border-amber-500/40 p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Withdrawable Balance (INR)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-emerald-400">
                ₹{earnings.withdrawableInr.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Platform Revenue Share: <strong className="text-amber-300">{earnings.revenueSharePercent}% Creator / 40% Platform</strong>
            </p>
          </div>

          <button
            onClick={() => setShowPayoutModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
            Request Payout
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-800 text-xs">
          <div>
            <span className="text-zinc-500 text-[10px] block">Lifetime Earned</span>
            <span className="font-extrabold text-zinc-200">₹{earnings.lifetimeInrEarned.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">Total Virtual Gifts</span>
            <span className="font-extrabold text-amber-300">{earnings.totalGiftsReceived} Received</span>
          </div>
        </div>
      </div>

      {/* Host Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Hosted Minutes</span>
            <p className="text-base font-extrabold text-white">1,850 Mins</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Avg Gift Value</span>
            <p className="text-base font-extrabold text-emerald-400">₹82.50</p>
          </div>
        </div>
      </div>

      {/* Payout History Ledger */}
      <div className="space-y-2">
        <h3 className="font-bold text-xs text-white px-1 uppercase tracking-wider">
          Creator Payout Ledger
        </h3>

        <div className="space-y-1.5">
          {earnings.payoutHistory.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-bold text-white">₹{p.amountInr.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">UPI: {p.destinationUpiOrBank} • {p.requestedAt}</p>
              </div>

              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  p.status === 'processed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in">
          <div className="bg-[#12141e] border border-emerald-500/40 rounded-3xl w-full max-w-sm p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ArrowDownToLine className="w-4 h-4" />
                <span>Request UPI Withdrawal</span>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {payoutSuccess ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-bold text-sm text-white">Payout Request Submitted!</h4>
                <p className="text-xs text-zinc-400">
                  Transferred via Razorpay instant UPI to {upiId}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayout} className="space-y-3">
                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                    Withdrawal Amount (₹) — Min ₹500
                  </label>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    min="500"
                    max={earnings.withdrawableInr}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500/60"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Available: ₹{earnings.withdrawableInr.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                    Beneficiary UPI ID (India)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. name@okhdfcbank"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Confirm Withdrawal (₹{payoutAmount})
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

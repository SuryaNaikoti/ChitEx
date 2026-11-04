import React, { useState } from 'react';
import { CoinPackage, WalletTransaction } from '../types';
import { INITIAL_PACKAGES } from '../data/mockData';
import { Coins, Check, X } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';

interface WalletViewProps {
  coinBalance: number;
  ledger: WalletTransaction[];
  onAddCoins: (coins: number, priceInr: number, packageName: string) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  coinBalance,
  ledger,
  onAddCoins,
}) => {
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSimulatePayment = () => {
    if (!selectedPackage) return;
    setIsProcessing(true);

    setTimeout(() => {
      const totalCoinsToAdd = selectedPackage.coinAmount + selectedPackage.bonusCoins;
      onAddCoins(totalCoinsToAdd, selectedPackage.priceInr, selectedPackage.name);
      soundEngine.playConnectChime();
      setIsProcessing(false);
      setSelectedPackage(null);
    }, 1000);
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-md mx-auto space-y-6">
      {/* Minimal Balance Card */}
      <div className="text-center py-6 space-y-1">
        <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Balance</span>
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl font-extrabold tracking-tight text-white">{coinBalance}</span>
          <span className="text-lg text-amber-300">🪙</span>
        </div>
        <p className="text-xs text-zinc-400 pt-1">Used for 1:1 voice connections & gifts</p>
      </div>

      {/* Pricing Cards */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-zinc-400 px-1">Coin Packs</span>

        <div className="grid grid-cols-1 gap-2.5">
          {INITIAL_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg)}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                pkg.popular
                  ? 'bg-amber-400/[0.04] border-amber-400/40 hover:border-amber-400/60'
                  : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{pkg.name}</span>
                  {pkg.bonusCoins > 0 && (
                    <span className="text-[10px] text-amber-300 font-semibold">
                      +{pkg.bonusCoins} Bonus
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-400">
                  {pkg.coinAmount + pkg.bonusCoins} Coins
                </span>
              </div>

              <span className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs">
                ₹{pkg.priceInr}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Razorpay Sheet Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#141416] border border-white/10 rounded-3xl w-full max-w-xs p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Quick Top-Up</span>
              <button onClick={() => setSelectedPackage(null)} className="text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 border-y border-white/[0.06] flex justify-between text-xs">
              <span className="text-zinc-400">{selectedPackage.name}</span>
              <span className="font-bold text-amber-300">
                {selectedPackage.coinAmount + selectedPackage.bonusCoins} Coins
              </span>
            </div>

            <button
              onClick={handleSimulatePayment}
              disabled={isProcessing}
              className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              {isProcessing ? 'Confirming UPI...' : `Pay ₹${selectedPackage.priceInr} with UPI`}
            </button>
          </div>
        </div>
      )}

      {/* Minimal Transaction Ledger */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-semibold text-zinc-400 px-1">Activity</span>

        <div className="space-y-2">
          {ledger.map((tx) => (
            <div
              key={tx.id}
              className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-medium text-zinc-200 line-clamp-1">{tx.description}</p>
                <p className="text-[10px] text-zinc-500">{tx.createdAt}</p>
              </div>

              <span
                className={`font-semibold shrink-0 ml-3 ${
                  tx.amount > 0 ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 🪙
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

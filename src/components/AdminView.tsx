import React from 'react';
import { Users, PhoneCall, TrendingUp, IndianRupee, ShieldAlert, Settings, Package } from 'lucide-react';
import { INITIAL_PACKAGES, VIRTUAL_GIFTS } from '../data/mockData';

export const AdminView: React.FC = () => {
  return (
    <div className="pb-24 pt-2 px-3 sm:px-4 max-w-md mx-auto space-y-4">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Platform Administration</h2>
          <p className="text-xs text-zinc-400">Business performance metrics & virtual economy configuration</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold">
          <Settings className="w-5 h-5" />
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            Registered Users
          </span>
          <p className="text-2xl font-black text-white">1,248</p>
          <span className="text-[10px] text-emerald-400 font-bold">+18% this week</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            Concurrent Calls
          </span>
          <p className="text-2xl font-black text-emerald-400">38</p>
          <span className="text-[10px] text-zinc-400">LiveKit SFU India-South</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            Today's Coin Sales
          </span>
          <p className="text-2xl font-black text-amber-300">₹24,850</p>
          <span className="text-[10px] text-emerald-400 font-bold">142 UPI orders</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-purple-400" />
            Creator Liability
          </span>
          <p className="text-2xl font-black text-purple-300">₹11,420</p>
          <span className="text-[10px] text-zinc-400">60% reserve held</span>
        </div>
      </div>

      {/* Coin Packages Catalogue */}
      <div className="space-y-2">
        <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 px-1">
          <Package className="w-4 h-4 text-amber-400" />
          Active Coin Packages (INR)
        </h3>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 divide-y divide-zinc-800 text-xs">
          {INITIAL_PACKAGES.map((pkg) => (
            <div key={pkg.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">{pkg.name}</span>
                <span className="text-[11px] text-amber-300">
                  {pkg.coinAmount} coins {pkg.bonusCoins > 0 ? `+ ${pkg.bonusCoins} bonus` : ''}
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-sm text-emerald-400">₹{pkg.priceInr}</span>
                <span className="block text-[10px] text-zinc-500">{pkg.badge || 'Standard'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Gifts Pricing */}
      <div className="space-y-2">
        <h3 className="font-bold text-xs text-white uppercase tracking-wider px-1">
          Virtual Gifts Catalogue & Splits
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {VIRTUAL_GIFTS.map((g) => (
            <div key={g.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{g.icon}</span>
                <span className="font-bold text-white truncate">{g.name}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1 border-t border-zinc-800">
                <span className="text-amber-400 font-bold">{g.coins} 🪙</span>
                <span className="text-emerald-400 font-bold">Creator ₹{(g.coins * 0.6).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

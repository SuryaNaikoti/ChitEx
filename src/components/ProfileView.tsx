import React, { useState } from 'react';
import { LanguageCode } from '../types';
import { MapPin, Check } from 'lucide-react';

interface ProfileViewProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  coinBalance: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentLanguage,
  onLanguageChange,
  coinBalance,
}) => {
  const [displayName] = useState('Surya Teja');
  const [callRate, setCallRate] = useState(20);
  const [isOnline, setIsOnline] = useState(true);

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/10">
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80"
            alt="My Profile"
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            <span className="text-zinc-400 font-light">, 24</span>
            <div className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center ml-0.5">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          </div>
          <p className="text-xs text-zinc-400 flex items-center justify-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-500" />
            Hyderabad, India
          </p>
        </div>
      </div>

      {/* Stats pill */}
      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-center">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-medium">Balance</span>
          <span className="text-base font-bold text-amber-300">{coinBalance} 🪙</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-medium">Age Attestation</span>
          <span className="text-base font-bold text-emerald-400">18+ Verified</span>
        </div>
      </div>

      {/* Availability Switch */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-white block">Online for Voice Calls</span>
          <span className="text-[10px] text-zinc-500">Allow others to connect with you</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOnline}
          aria-label="Online for Voice Calls"
          onClick={() => setIsOnline(!isOnline)}
          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
            isOnline ? 'bg-amber-400' : 'bg-white/10'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-black transition-transform ${
              isOnline ? 'translate-x-5.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Call Rate Slider */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-white">Call Rate</span>
          <span className="font-bold text-amber-300">{callRate} 🪙 / min</span>
        </div>
        <input
          type="range"
          min="10"
          max="40"
          step="5"
          value={callRate}
          onChange={(e) => setCallRate(parseInt(e.target.value))}
          aria-label="Call Rate"
          className="w-full accent-amber-400 cursor-pointer"
        />
      </div>

      {/* Language Preference */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
        <span className="text-xs font-semibold text-white block">Primary Language</span>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { code: 'te' as LanguageCode, label: 'Telugu' },
            { code: 'hi' as LanguageCode, label: 'Hindi' },
            { code: 'en' as LanguageCode, label: 'English' },
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => onLanguageChange(l.code)}
              className={`py-2 rounded-xl text-center font-medium transition-all cursor-pointer ${
                currentLanguage === l.code
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

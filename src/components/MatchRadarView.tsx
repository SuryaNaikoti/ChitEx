import React, { useState, useEffect } from 'react';
import { UserProfile, LanguageCode } from '../types';
import { Phone, X } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';

interface MatchRadarViewProps {
  users: UserProfile[];
  currentLanguage: LanguageCode;
  onStartCallWithMatchedUser: (user: UserProfile) => void;
  coinBalance: number;
  onOpenWallet: () => void;
  blockedUserIds: string[];
}

export const MatchRadarView: React.FC<MatchRadarViewProps> = ({
  users,
  currentLanguage,
  onStartCallWithMatchedUser,
  coinBalance,
  onOpenWallet,
  blockedUserIds,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(currentLanguage);
  const [isSearching, setIsSearching] = useState(false);
  const [matchedCandidate, setMatchedCandidate] = useState<UserProfile | null>(null);
  const [countdown, setCountdown] = useState(15);

  const availablePool = users.filter(
    (u) =>
      !blockedUserIds.includes(u.id) &&
      u.isOnline &&
      (u.primaryLanguage === selectedLang || u.supportedLanguages.includes(selectedLang))
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (matchedCandidate && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (matchedCandidate && countdown === 0) {
      handleSkip();
    }
    return () => clearTimeout(timer);
  }, [matchedCandidate, countdown]);

  const handleStartSearch = () => {
    if (coinBalance < 15) {
      onOpenWallet();
      return;
    }
    setIsSearching(true);
    setMatchedCandidate(null);

    setTimeout(() => {
      if (availablePool.length > 0) {
        const pick = availablePool[Math.floor(Math.random() * availablePool.length)];
        setMatchedCandidate(pick);
        setIsSearching(false);
        setCountdown(15);
        soundEngine.playConnectChime();
      } else {
        setIsSearching(false);
      }
    }, 2200);
  };

  const handleSkip = () => {
    setMatchedCandidate(null);
    handleStartSearch();
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto flex flex-col items-center justify-center min-h-[75vh]">
      {/* Minimal Language Switcher */}
      <div className="flex items-center gap-2 mb-10">
        {[
          { code: 'te' as LanguageCode, label: 'Telugu' },
          { code: 'hi' as LanguageCode, label: 'Hindi' },
          { code: 'en' as LanguageCode, label: 'English' },
        ].map((item) => (
          <button
            key={item.code}
            disabled={isSearching || !!matchedCandidate}
            onClick={() => setSelectedLang(item.code)}
            className={`px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
              selectedLang === item.code
                ? 'bg-white text-black font-semibold'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Minimal Radar Area */}
      {!isSearching && !matchedCandidate && (
        <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in">
          {/* Subtle Breathing Rings */}
          <div className="relative flex items-center justify-center w-64 h-64">
            <div className="absolute w-64 h-64 rounded-full border border-white/[0.05]" />
            <div className="absolute w-48 h-48 rounded-full border border-white/[0.08]" />
            <div className="absolute w-32 h-32 rounded-full border border-white/[0.12]" />

            {/* Center Trigger Avatar / Button */}
            <button
              onClick={handleStartSearch}
              className="relative w-20 h-20 rounded-full bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl shadow-amber-400/20 cursor-pointer"
            >
              <Phone className="w-8 h-8 fill-current stroke-[1.5]" />
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight text-white">Voice Radar</h3>
            <p className="text-xs text-zinc-500">Tap to start 1:1 voice match</p>
          </div>
        </div>
      )}

      {/* Searching State */}
      {isSearching && (
        <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in">
          <div className="relative flex items-center justify-center w-64 h-64">
            <div className="absolute w-64 h-64 rounded-full border border-amber-400/20 animate-ping opacity-30" />
            <div className="absolute w-48 h-48 rounded-full border border-amber-400/40 animate-pulse" />
            <div className="absolute w-32 h-32 rounded-full border border-amber-400/60" />

            <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400 flex items-center justify-center text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-300">Finding someone to talk with...</p>
            <button
              onClick={() => setIsSearching(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Match Found Card */}
      {matchedCandidate && (
        <div className="w-full max-w-xs bg-[#16161a] border border-white/10 rounded-[32px] p-6 text-center space-y-5 animate-in zoom-in-95 shadow-2xl">
          <div className="relative w-28 h-28 mx-auto">
            <img
              src={matchedCandidate.avatarUrl}
              alt={matchedCandidate.displayName}
              className="w-full h-full rounded-full object-cover ring-2 ring-amber-400"
            />
            <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#16161a] text-amber-300 text-[11px] font-bold flex items-center justify-center border border-white/10">
              {countdown}s
            </span>
          </div>

          <div>
            <h4 className="text-xl font-bold text-white tracking-tight">
              {matchedCandidate.displayName}, {matchedCandidate.age}
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              {matchedCandidate.location}
            </p>
            <p className="text-xs text-zinc-300 italic mt-2 line-clamp-2">
              "{matchedCandidate.bio}"
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={handleSkip}
              className="w-14 h-14 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Pass"
            >
              <X className="w-6 h-6" />
            </button>

            <button
              onClick={() => onStartCallWithMatchedUser(matchedCandidate)}
              className="w-14 h-14 rounded-full bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center transition-all shadow-xl shadow-amber-400/30 cursor-pointer"
              title="Connect"
            >
              <Phone className="w-6 h-6 fill-current" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

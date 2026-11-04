import React, { useState } from 'react';
import { UserProfile, LanguageCode } from '../types';
import { Phone, Gift, MessageCircle, Volume2, Pause, MapPin, Check } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';

interface DiscoveryViewProps {
  users: UserProfile[];
  currentLanguage: LanguageCode;
  onInitiateCall: (user: UserProfile) => void;
  onSendGift: (user: UserProfile) => void;
  onOpenChat: (user: UserProfile) => void;
  blockedUserIds: string[];
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  users,
  currentLanguage,
  onInitiateCall,
  onSendGift,
  onOpenChat,
  blockedUserIds,
}) => {
  const [selectedLang, setSelectedLang] = useState<'all' | LanguageCode>(currentLanguage);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Filter out blocked users
  const visibleUsers = users.filter((u) => !blockedUserIds.includes(u.id));

  // Filter by language
  const filteredUsers = visibleUsers.filter((u) => {
    if (selectedLang === 'all') return true;
    return u.primaryLanguage === selectedLang || u.supportedLanguages.includes(selectedLang);
  });

  const toggleVoiceSnippet = (userId: string) => {
    if (playingVoiceId === userId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(userId);
      soundEngine.playConnectChime();
      setTimeout(() => {
        setPlayingVoiceId(null);
      }, 3500);
    }
  };

  return (
    <div className="pb-28 pt-1 px-4 max-w-md mx-auto space-y-6">
      {/* Minimal Language Filter Row */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {[
          { id: 'all' as const, label: 'All' },
          { id: 'te' as const, label: 'Telugu' },
          { id: 'hi' as const, label: 'Hindi' },
          { id: 'en' as const, label: 'English' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedLang(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              selectedLang === tab.id
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profiles Stream (Minimal Dating App Cards) */}
      <div className="space-y-8">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-24 text-zinc-500 text-xs">
            No profiles active in this category right now.
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isPlaying = playingVoiceId === user.id;

            return (
              <div
                key={user.id}
                className="relative bg-[#141417] rounded-[32px] overflow-hidden border border-white/[0.08] shadow-2xl transition-all"
              >
                {/* Large Portrait Image */}
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-900">
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-full h-full object-cover object-center"
                  />

                  {/* Gentle gradient vignette for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141417] via-black/20 to-black/30" />

                  {/* Top Bar on Card: Live Dot & Rate */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          user.isOnline ? 'bg-emerald-400' : 'bg-zinc-500'
                        }`}
                      />
                      <span className="text-[11px] font-medium text-white/90">
                        {user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-semibold text-amber-300">
                      {user.callRatePerMin} 🪙/m
                    </div>
                  </div>

                  {/* Interactive Voice Note Audio Prompt (Hinge-Style) */}
                  <div className="absolute bottom-5 left-4 right-4">
                    <button
                      onClick={() => toggleVoiceSnippet(user.id)}
                      className="w-full bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/15 rounded-2xl p-3 flex items-center gap-3 transition-all active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isPlaying
                            ? 'bg-amber-400 text-black'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] text-zinc-300">
                          <span className="font-semibold text-white">Voice Note</span>
                          <span className="text-zinc-400 text-[10px] font-mono">
                            {isPlaying ? 'Playing...' : '0:15'}
                          </span>
                        </div>

                        {/* Animated waveform bars */}
                        <div className="flex items-center gap-1 mt-1.5 h-3">
                          {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65, 40, 85, 60, 45].map((h, i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-full transition-all duration-200 ${
                                isPlaying ? 'bg-amber-400' : 'bg-white/30'
                              }`}
                              style={{
                                height: isPlaying ? `${Math.min(100, h * (0.6 + Math.random() * 0.6))}%` : `${h * 0.4}%`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Minimal Profile Details Section with Generous Free Space */}
                <div className="p-6 space-y-4">
                  {/* Name, Age, Location */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold tracking-tight text-white">
                        {user.displayName}
                      </h2>
                      <span className="text-xl font-light text-zinc-400">
                        {user.age}
                      </span>
                      {user.isVerified && (
                        <div className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{user.location}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-300">
                        {user.supportedLanguages.map((l) => (l === 'te' ? 'Telugu' : l === 'hi' ? 'Hindi' : 'English')).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Clean Short Bio */}
                  <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                    {user.bio}
                  </p>

                  {/* Minimal Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {user.interests.map((tag) => (
                      <span
                        key={tag}
                        className="bg-white/[0.04] border border-white/[0.08] text-zinc-300 px-3 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Clean Circular Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      {/* Chat Button */}
                      <button
                        onClick={() => onOpenChat(user)}
                        className="w-12 h-12 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Chat"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>

                      {/* Gift Button */}
                      <button
                        onClick={() => onSendGift(user)}
                        className="w-12 h-12 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Send Gift"
                      >
                        <Gift className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Prominent Voice Call Button */}
                    <button
                      onClick={() => onInitiateCall(user)}
                      disabled={!user.isOnline}
                      className={`h-12 px-6 rounded-full flex items-center gap-2 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                        user.isOnline
                          ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20'
                          : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      <Phone className="w-4 h-4 fill-current" />
                      <span>Voice Call</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

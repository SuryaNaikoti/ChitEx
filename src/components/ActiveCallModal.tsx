import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, VirtualGift } from '../types';
import { VIRTUAL_GIFTS } from '../data/mockData';
import { soundEngine } from '../utils/audioSynth';
import {
  Mic,
  MicOff,
  PhoneOff,
  Gift,
  Shield,
  Coins,
  AlertTriangle,
  X,
} from 'lucide-react';

interface ActiveCallModalProps {
  partner: UserProfile;
  coinBalance: number;
  onDeductCoins: (amount: number, description: string) => void;
  onEndCall: (summary: { durationSeconds: number; coinsBilled: number; partner: UserProfile }) => void;
  onOpenWallet: () => void;
  onBlockUser: (user: UserProfile) => void;
  onReportUser: (user: UserProfile, reason: string) => void;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  partner,
  coinBalance,
  onDeductCoins,
  onEndCall,
  onOpenWallet,
  onBlockUser,
  onReportUser,
}) => {
  const [callState, setCallState] = useState<'dialing' | 'connected'>('dialing');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showGiftDrawer, setShowGiftDrawer] = useState(false);
  const [activeGiftAnimation, setActiveGiftAnimation] = useState<VirtualGift | null>(null);
  const [showSafetySheet, setShowSafetySheet] = useState(false);
  const [lowBalanceAlert, setLowBalanceAlert] = useState(false);
  const [totalCoinsBilled, setTotalCoinsBilled] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastBilledMinuteRef = useRef(0);

  // Dial tone simulation then connect
  useEffect(() => {
    const stopDialTone = soundEngine.playDialTone();
    const connectTimer = setTimeout(() => {
      stopDialTone();
      setCallState('connected');
      soundEngine.playConnectChime();

      onDeductCoins(
        partner.callRatePerMin,
        `Voice Call with ${partner.displayName}`
      );
      setTotalCoinsBilled(partner.callRatePerMin);
      lastBilledMinuteRef.current = 1;
    }, 1800);

    return () => {
      stopDialTone();
      clearTimeout(connectTimer);
    };
  }, []);

  // Minute-by-Minute Billing
  useEffect(() => {
    if (callState !== 'connected') return;

    timerRef.current = setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 1;
        const currentMinute = Math.floor(next / 60) + 1;

        if (currentMinute > lastBilledMinuteRef.current) {
          lastBilledMinuteRef.current = currentMinute;

          if (coinBalance < partner.callRatePerMin) {
            soundEngine.playLowBalanceWarning();
            handleEndCall();
          } else {
            onDeductCoins(
              partner.callRatePerMin,
              `Voice Call Minute ${currentMinute}`
            );
            setTotalCoinsBilled((b) => b + partner.callRatePerMin);
          }
        }

        if (coinBalance < partner.callRatePerMin && !lowBalanceAlert) {
          setLowBalanceAlert(true);
          soundEngine.playLowBalanceWarning();
        }

        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState, coinBalance, partner.callRatePerMin, lowBalanceAlert]);

  const handleEndCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onEndCall({
      durationSeconds: secondsElapsed,
      coinsBilled: totalCoinsBilled,
      partner,
    });
  };

  const handleSendGift = (gift: VirtualGift) => {
    if (coinBalance < gift.coins) {
      onOpenWallet();
      return;
    }

    onDeductCoins(
      gift.coins,
      `Sent ${gift.name} to ${partner.displayName}`
    );
    soundEngine.playGiftFanfare();
    setActiveGiftAnimation(gift);
    setShowGiftDrawer(false);

    setTimeout(() => {
      setActiveGiftAnimation(null);
    }, 2800);
  };

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c0e] flex flex-col justify-between text-white p-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowSafetySheet(true)}
          className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <Shield className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/10 rounded-full px-3 py-1 text-xs font-medium text-amber-300">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>{coinBalance} 🪙</span>
        </div>
      </div>

      {/* Center Hero: Circular Avatar & Pulse */}
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="relative flex items-center justify-center w-52 h-52">
          {callState === 'connected' && (
            <>
              <div className="absolute w-52 h-52 rounded-full border border-amber-400/20 animate-ping opacity-25" />
              <div className="absolute w-44 h-44 rounded-full border border-amber-400/30 animate-pulse" />
            </>
          )}

          <div className="w-36 h-36 rounded-full overflow-hidden ring-2 ring-white/20 shadow-2xl">
            <img
              src={partner.avatarUrl}
              alt={partner.displayName}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name & Timer */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-white">{partner.displayName}</h2>
          <p className="text-xs text-zinc-400">
            {partner.location} • {partner.callRatePerMin} 🪙/m
          </p>

          <div className="pt-2">
            {callState === 'dialing' ? (
              <span className="text-xs text-amber-300/80 animate-pulse font-medium">Connecting...</span>
            ) : (
              <span className="text-2xl font-mono font-medium text-zinc-200 tracking-wider">
                {formatDuration(secondsElapsed)}
              </span>
            )}
          </div>
        </div>

        {/* Low balance subtle chime alert */}
        {lowBalanceAlert && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low balance: less than 1m left</span>
          </div>
        )}
      </div>

      {/* Gift Celebration Screen Overlay */}
      {activeGiftAnimation && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none animate-in zoom-in-75">
          <div className="text-7xl animate-bounce mb-3">{activeGiftAnimation.icon}</div>
          <div className="text-center space-y-1">
            <p className="text-base font-bold text-white">Sent {activeGiftAnimation.name}</p>
            <p className="text-xs text-amber-300">{partner.displayName} received virtual gift</p>
          </div>
        </div>
      )}

      {/* In-Call Gift Drawer */}
      {showGiftDrawer && (
        <div className="bg-[#141416] border border-white/10 rounded-3xl p-4 shadow-2xl mb-4 space-y-3 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Send a gift</span>
            <button onClick={() => setShowGiftDrawer(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {VIRTUAL_GIFTS.map((g) => (
              <button
                key={g.id}
                onClick={() => handleSendGift(g)}
                className="flex flex-col items-center p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <span className="text-2xl mb-1">{g.icon}</span>
                <span className="text-[11px] font-semibold text-white truncate w-full text-center">{g.name}</span>
                <span className="text-[10px] text-amber-300">{g.coins}🪙</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Bottom Call Controls */}
      <div className="flex items-center justify-center gap-6 max-w-xs mx-auto pb-4">
        {/* Mute */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isMuted ? 'bg-white text-black' : 'bg-white/[0.08] text-white hover:bg-white/[0.12]'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition-all active:scale-95 cursor-pointer"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

        {/* Gift */}
        <button
          onClick={() => setShowGiftDrawer(!showGiftDrawer)}
          className="w-14 h-14 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-amber-300 flex items-center justify-center transition-all cursor-pointer"
        >
          <Gift className="w-5 h-5" />
        </button>
      </div>

      {/* Safety Modal */}
      {showSafetySheet && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#141416] border border-white/10 rounded-3xl w-full max-w-xs p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Safety Options</span>
              <button onClick={() => setShowSafetySheet(false)} className="text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowSafetySheet(false);
                  onBlockUser(partner);
                  handleEndCall();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold text-left hover:bg-rose-500/20"
              >
                Block & Disconnect
              </button>
              <button
                onClick={() => {
                  setShowSafetySheet(false);
                  onReportUser(partner, 'inappropriate_audio');
                  handleEndCall();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] text-zinc-300 text-xs font-semibold text-left hover:bg-white/[0.08]"
              >
                Report Conduct
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

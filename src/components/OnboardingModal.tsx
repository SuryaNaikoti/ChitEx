import React, { useState } from 'react';
import { LanguageCode } from '../types';
import { ShieldCheck, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [birthYear, setBirthYear] = useState('2000');
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('te');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAgeSubmit = () => {
    const currentYear = 2026;
    const age = currentYear - parseInt(birthYear);
    if (age < 18 || !isAgeConfirmed) {
      setErrorMsg('You must be 18 years or older and confirm the legal declaration to use Nectar.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleFinish = () => {
    soundEngine.playConnectChime();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#12141e] border border-amber-500/40 rounded-3xl w-full max-w-sm p-6 text-white shadow-2xl space-y-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center font-black text-black">
            🍯
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Nectar Onboarding</h3>
            <span className="text-[10px] text-amber-400">Step {step} of 2 • Adult Voice Discovery</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-black text-white">18+ Age Assurance Verification</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Nectar is an adult voice social platform. In compliance with Indian digital safety regulations, access is restricted strictly to adults aged 18 and older.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                Year of Birth
              </label>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                aria-label="Select your year of birth"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60"
              >
                {Array.from({ length: 60 }, (_, i) => 2008 - i).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} (Age {2026 - yr})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={isAgeConfirmed}
                onChange={(e) => setIsAgeConfirmed(e.target.checked)}
                className="accent-amber-500 w-4 h-4 mt-0.5 rounded"
              />
              <span className="leading-relaxed">
                I solemnly affirm that I am 18 years of age or older and agree to Nectar's Community Safety Code.
              </span>
            </label>

            <button
              onClick={handleAgeSubmit}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-black text-white">Select Your Voice Language</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Choose the primary language for voice discovery and match queues.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {[
                { code: 'te' as LanguageCode, label: 'Telugu', local: 'తెలుగు వాయిస్ లాంజ్' },
                { code: 'hi' as LanguageCode, label: 'Hindi', local: 'हिन्दी बात-चीत' },
                { code: 'en' as LanguageCode, label: 'English', local: 'English Conversations' },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => setSelectedLang(l.code)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                    selectedLang === l.code
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs block">{l.label}</span>
                    <span className="text-[11px] text-zinc-400">{l.local}</span>
                  </div>
                  {selectedLang === l.code && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
            </div>

            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>You receive a <strong>120 Coins Welcome Bonus</strong> to explore voice calls!</span>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              Enter Nectar Voice Lounge
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

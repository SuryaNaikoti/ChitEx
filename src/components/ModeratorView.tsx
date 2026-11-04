import React, { useState } from 'react';
import { ReportTicket } from '../types';
import { ShieldAlert, AlertTriangle, CheckCircle2, UserX, Clock, Sparkles } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';

interface ModeratorViewProps {
  reports: ReportTicket[];
  onTakeAction: (ticketId: string, action: 'warned' | 'suspended' | 'banned' | 'dismissed') => void;
}

export const ModeratorView: React.FC<ModeratorViewProps> = ({
  reports,
  onTakeAction,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  const filteredReports = reports.filter((r) => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'resolved') return r.status !== 'pending';
    return true;
  });

  return (
    <div className="pb-24 pt-2 px-3 sm:px-4 max-w-md mx-auto space-y-4">
      {/* Moderation Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-black text-white">Safety & Moderation Console</h2>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
              Level 2 Guard
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Human review assisted by Google Gemini automated toxicity analysis
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
            filter === 'all'
              ? 'bg-amber-500 text-black shadow-md'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
          }`}
        >
          All Reports ({reports.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
            filter === 'pending'
              ? 'bg-amber-500 text-black shadow-md'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
          }`}
        >
          Pending Review ({reports.filter((r) => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
            filter === 'resolved'
              ? 'bg-amber-500 text-black shadow-md'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
          }`}
        >
          Resolved
        </button>
      </div>

      {/* Report Cards Stream */}
      <div className="space-y-3">
        {filteredReports.map((ticket) => (
          <div
            key={ticket.id}
            className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3 shadow-lg"
          >
            {/* Header: Reported User & Category */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={ticket.reportedUser.avatarUrl}
                  alt={ticket.reportedUser.displayName}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-700"
                />
                <div>
                  <h4 className="font-bold text-xs text-white">
                    {ticket.reportedUser.displayName}
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Reported by <strong className="text-zinc-300">{ticket.reporterName}</strong> • {ticket.timestamp}
                  </p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold uppercase">
                {ticket.reason.replace('_', ' ')}
              </span>
            </div>

            {/* Reporter Statement */}
            <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300">
              <span className="text-[10px] font-bold text-zinc-500 block uppercase">
                Reporter Statement
              </span>
              <p className="mt-0.5 italic">"{ticket.description}"</p>
            </div>

            {/* Gemini AI Toxicity Score & Analysis */}
            <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Gemini AI Safety Telemetry</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400">Toxicity:</span>
                  <span
                    className={`font-mono font-extrabold text-xs px-1.5 py-0.5 rounded ${
                      ticket.geminiToxicityScore > 0.8
                        ? 'bg-rose-500/30 text-rose-300'
                        : 'bg-amber-500/30 text-amber-300'
                    }`}
                  >
                    {(ticket.geminiToxicityScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {ticket.geminiAnalysis}
              </p>
            </div>

            {/* Status or Moderator Action Buttons */}
            {ticket.status === 'pending' ? (
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800 text-xs">
                <button
                  onClick={() => {
                    onTakeAction(ticket.id, 'dismissed');
                    soundEngine.playConnectChime();
                  }}
                  className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-[11px]"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    onTakeAction(ticket.id, 'warned');
                    soundEngine.playConnectChime();
                  }}
                  className="py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-[11px]"
                >
                  Warn User
                </button>
                <button
                  onClick={() => {
                    onTakeAction(ticket.id, 'banned');
                    soundEngine.playLowBalanceWarning();
                  }}
                  className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-md shadow-rose-600/30"
                >
                  Ban User
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 pt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Action Taken: {ticket.status.toUpperCase()}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

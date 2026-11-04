import React, { useState } from 'react';
import { UserProfile, ChatMessage } from '../types';
import { Send, Phone } from 'lucide-react';

interface MessagesViewProps {
  users: UserProfile[];
  onStartCall: (user: UserProfile) => void;
  onBlockUser: (user: UserProfile) => void;
  onReportUser: (user: UserProfile, reason: string) => void;
  blockedUserIds: string[];
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  users,
  onStartCall,
  blockedUserIds,
}) => {
  const [activePartner, setActivePartner] = useState<UserProfile | null>(users[0] || null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      senderId: 'user_1',
      receiverId: 'self',
      content: 'Loved talking about Telugu movies with you earlier 🌸',
      timestamp: '11:48 AM',
      isRead: true,
    },
    {
      id: 'msg_2',
      senderId: 'self',
      receiverId: 'user_1',
      content: 'Same here! Thanks for the playlist suggestions.',
      timestamp: '11:50 AM',
      isRead: true,
    },
    {
      id: 'msg_3',
      senderId: 'user_1',
      receiverId: 'self',
      content: 'Call again whenever you’re free! 🍯',
      timestamp: '11:52 AM',
      isRead: true,
    },
  ]);
  const [inputVal, setInputVal] = useState('');

  const eligibleUsers = users.filter((u) => !blockedUserIds.includes(u.id));

  const handleSendMessage = () => {
    if (!inputVal.trim() || !activePartner) return;
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: 'self',
      receiverId: activePartner.id,
      content: inputVal.trim(),
      timestamp: 'Just now',
      isRead: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputVal('');
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-md mx-auto space-y-4">
      {/* Horizontal Avatar Strip */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
        {eligibleUsers.map((u) => {
          const isSelected = activePartner?.id === u.id;
          return (
            <button
              key={u.id}
              onClick={() => setActivePartner(u)}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
            >
              <div
                className={`w-14 h-14 rounded-full overflow-hidden p-0.5 transition-all ${
                  isSelected ? 'ring-2 ring-amber-400 scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={u.avatarUrl}
                  alt={u.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[60px]">
                {u.displayName.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chat Thread */}
      {activePartner && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-[28px] overflow-hidden flex flex-col h-[480px]">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-white">{activePartner.displayName}</h4>
              <p className="text-[11px] text-zinc-400">{activePartner.location}</p>
            </div>

            <button
              onClick={() => onStartCall(activePartner)}
              className="w-9 h-9 rounded-full bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center transition-all cursor-pointer"
              title="Voice Call"
            >
              <Phone className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((m) => {
              const isMe = m.senderId === 'self';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-amber-400 text-black font-medium'
                        : 'bg-white/[0.08] text-white'
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-1 px-1">{m.timestamp}</span>
                </div>
              );
            })}
          </div>

          {/* Minimal Input Bar */}
          <div className="p-3 border-t border-white/[0.06] flex items-center gap-2">
            <input
              type="text"
              placeholder={`Message ${activePartner.displayName.split(' ')[0]}...`}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
            />
            <button
              onClick={handleSendMessage}
              className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shrink-0 cursor-pointer hover:bg-zinc-200 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

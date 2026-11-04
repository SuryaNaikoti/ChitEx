import React from 'react';
import { Compass, Radio, MessageSquare, Wallet, User } from 'lucide-react';

export type UserTab = 'discover' | 'match' | 'messages' | 'wallet' | 'profile';

interface BottomNavProps {
  activeTab: UserTab;
  onTabChange: (tab: UserTab) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 1,
}) => {
  const tabs = [
    { id: 'discover' as UserTab, icon: Compass },
    { id: 'match' as UserTab, icon: Radio },
    { id: 'messages' as UserTab, icon: MessageSquare, badge: unreadCount },
    { id: 'wallet' as UserTab, icon: Wallet },
    { id: 'profile' as UserTab, icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0c0c0e]/90 backdrop-blur-2xl border-t border-white/[0.06] py-3 max-w-md mx-auto">
      <div className="flex items-center justify-around px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative p-2.5 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer flex flex-col items-center"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'text-amber-300 scale-110' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {tab.badge && tab.badge > 0 && !isActive ? (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                ) : null}
              </div>

              {/* Minimalist dot indicator */}
              <span
                className={`w-1 h-1 rounded-full mt-1.5 transition-all duration-200 ${
                  isActive ? 'bg-amber-400 opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

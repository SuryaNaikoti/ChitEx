'use client';

import React, { useState } from 'react';
import { UserRole, LanguageCode, UserProfile, WalletTransaction, CreatorEarnings, ReportTicket, VirtualGift } from './types';
import { INITIAL_USERS, INITIAL_LEDGER, INITIAL_REPORTS, VIRTUAL_GIFTS } from './data/mockData';
import { Header } from './components/Header';
import { BottomNav, UserTab } from './components/BottomNav';
import { DiscoveryView } from './components/DiscoveryView';
import { MatchRadarView } from './components/MatchRadarView';
import { MessagesView } from './components/MessagesView';
import { WalletView } from './components/WalletView';
import { ProfileView } from './components/ProfileView';
import { CreatorView } from './components/CreatorView';
import { ModeratorView } from './components/ModeratorView';
import { AdminView } from './components/AdminView';
import { ActiveCallModal } from './components/ActiveCallModal';
import { PreCallPricingModal, CallSummaryModal } from './components/CallModals';
import { OnboardingModal } from './components/OnboardingModal';
import { soundEngine } from './utils/audioSynth';
import { Gift, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Navigation & Role states
  const [currentRole, setCurrentRole] = useState<UserRole>('user');
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('te');
  const [activeTab, setActiveTab] = useState<UserTab>('discover');

  // Economy state (User Wallet & Immutable Ledger)
  const [coinBalance, setCoinBalance] = useState<number>(210);
  const [ledger, setLedger] = useState<WalletTransaction[]>(INITIAL_LEDGER);

  // User directory & Safety blocks
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [reports, setReports] = useState<ReportTicket[]>(INITIAL_REPORTS);

  // Creator state
  const [creatorEarnings, setCreatorEarnings] = useState<CreatorEarnings>({
    withdrawableInr: 2840.00,
    lifetimeInrEarned: 14250.00,
    revenueSharePercent: 60,
    totalGiftsReceived: 84,
    payoutHistory: [
      {
        id: 'payout_tx_1',
        amountInr: 1500.00,
        destinationUpiOrBank: 'creator@okhdfcbank',
        status: 'processed',
        requestedAt: 'Yesterday, 4:30 PM',
      },
    ],
  });

  // Call & Modal states
  const [preCallTarget, setPreCallTarget] = useState<UserProfile | null>(null);
  const [activeCallPartner, setActiveCallPartner] = useState<UserProfile | null>(null);
  const [callSummary, setCallSummary] = useState<{
    durationSeconds: number;
    coinsBilled: number;
    partner: UserProfile;
  } | null>(null);

  // Quick gift drawer from Discovery feed
  const [giftPickerTarget, setGiftPickerTarget] = useState<UserProfile | null>(null);
  const [giftSuccessToast, setGiftSuccessToast] = useState<string | null>(null);

  // Onboarding Demo Modal
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Wallet Management Actions
  const handleAddCoins = (coins: number, priceInr: number, packageName: string) => {
    const newTx: WalletTransaction = {
      id: `tx_rzp_${Date.now()}`,
      type: 'purchase_credit',
      amount: coins,
      balanceAfter: coinBalance + coins,
      description: `Purchased ${packageName} (UPI ₹${priceInr})`,
      referenceId: `pay_rzp_${Date.now().toString().slice(-6)}`,
      createdAt: 'Just now',
    };
    setCoinBalance((prev) => prev + coins);
    setLedger((prev) => [newTx, ...prev]);
  };

  const handleDeductCoins = (amount: number, description: string) => {
    setCoinBalance((prev) => {
      const nextBal = Math.max(0, prev - amount);
      const newTx: WalletTransaction = {
        id: `tx_debit_${Date.now()}`,
        type: description.includes('Gift') ? 'gift_sent_debit' : 'call_debit',
        amount: -amount,
        balanceAfter: nextBal,
        description,
        referenceId: `call_sess_${Date.now().toString().slice(-5)}`,
        createdAt: 'Just now',
      };
      setLedger((prevLedger) => [newTx, ...prevLedger]);
      return nextBal;
    });
  };

  // Call Lifecycle Handlers
  const handleInitiateCallClick = (target: UserProfile) => {
    // Open Pre-Call Rate Disclosure Sheet
    setPreCallTarget(target);
  };

  const handleConfirmPreCall = () => {
    if (!preCallTarget) return;
    const partner = preCallTarget;
    setPreCallTarget(null);
    setActiveCallPartner(partner);
  };

  const handleEndCall = (summary: { durationSeconds: number; coinsBilled: number; partner: UserProfile }) => {
    setActiveCallPartner(null);
    setCallSummary(summary);

    // If call was with an active creator, credit creator earnings
    if (summary.partner.isCreator && summary.coinsBilled > 0) {
      const earningsInr = summary.coinsBilled * 0.6; // 60% revenue share
      setCreatorEarnings((prev) => ({
        ...prev,
        withdrawableInr: prev.withdrawableInr + earningsInr,
        lifetimeInrEarned: prev.lifetimeInrEarned + earningsInr,
      }));
    }
  };

  // Virtual Gifting
  const handleSendStandaloneGift = (gift: VirtualGift) => {
    if (!giftPickerTarget) return;
    if (coinBalance < gift.coins) {
      setGiftPickerTarget(null);
      setActiveTab('wallet');
      return;
    }

    handleDeductCoins(
      gift.coins,
      `Sent Virtual Gift: ${gift.icon} ${gift.name} to ${giftPickerTarget.displayName}`
    );
    soundEngine.playGiftFanfare();

    // Credit creator
    const creatorEarningsShare = gift.coins * 0.6;
    setCreatorEarnings((prev) => ({
      ...prev,
      withdrawableInr: prev.withdrawableInr + creatorEarningsShare,
      lifetimeInrEarned: prev.lifetimeInrEarned + creatorEarningsShare,
      totalGiftsReceived: prev.totalGiftsReceived + 1,
    }));

    setGiftSuccessToast(`Sent ${gift.icon} ${gift.name} to ${giftPickerTarget.displayName}!`);
    setGiftPickerTarget(null);
    setTimeout(() => setGiftSuccessToast(null), 3000);
  };

  // Safety & Blocking
  const handleBlockUser = (target: UserProfile) => {
    setBlockedUserIds((prev) => [...prev, target.id]);
    setGiftSuccessToast(`User ${target.displayName} has been blocked and removed.`);
    setTimeout(() => setGiftSuccessToast(null), 3000);
  };

  const handleReportUser = (target: UserProfile, reason: string) => {
    const newReport: ReportTicket = {
      id: `rep_${Date.now()}`,
      reporterName: 'Surya Teja',
      reportedUser: target,
      reason: reason as ReportTicket['reason'],
      description: `Reported during voice session for ${reason.replace('_', ' ')}.`,
      timestamp: 'Just now',
      geminiToxicityScore: 0.91,
      geminiAnalysis: 'High Confidence Flag: Detected violations against Indian community voice guidelines. Ticket routed to urgent review.',
      status: 'pending',
    };
    setReports((prev) => [newReport, ...prev]);
    handleBlockUser(target);
  };

  // Moderator Action
  const handleModeratorAction = (
    ticketId: string,
    action: 'warned' | 'suspended' | 'banned' | 'dismissed'
  ) => {
    setReports((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: action } : t))
    );
  };

  // Creator Payout
  const handleRequestPayout = (amountInr: number, destination: string) => {
    setCreatorEarnings((prev) => ({
      ...prev,
      withdrawableInr: prev.withdrawableInr - amountInr,
      payoutHistory: [
        {
          id: `payout_tx_${Date.now()}`,
          amountInr,
          destinationUpiOrBank: destination,
          status: 'processed',
          requestedAt: 'Just now',
        },
        ...prev.payoutHistory,
      ],
    }));
  };

  return (
    <div className="min-h-screen bg-[#0d0e15] text-zinc-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* Top Header with Role Switcher, Language & Coin Pill */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        coinBalance={coinBalance}
        onOpenWallet={() => {
          setCurrentRole('user');
          setActiveTab('wallet');
        }}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 w-full max-w-md mx-auto pt-2 pb-6 px-2 sm:px-0">
        {/* Toast Alert */}
        {giftSuccessToast && (
          <div className="mb-3 mx-3 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{giftSuccessToast}</span>
          </div>
        )}

        {/* 1. User Application Mode */}
        {currentRole === 'user' && (
          <>
            {activeTab === 'discover' && (
              <DiscoveryView
                users={users}
                currentLanguage={currentLanguage}
                onInitiateCall={handleInitiateCallClick}
                onSendGift={(u) => setGiftPickerTarget(u)}
                onOpenChat={() => setActiveTab('messages')}
                blockedUserIds={blockedUserIds}
              />
            )}

            {activeTab === 'match' && (
              <MatchRadarView
                users={users}
                currentLanguage={currentLanguage}
                onStartCallWithMatchedUser={(u) => setActiveCallPartner(u)}
                coinBalance={coinBalance}
                onOpenWallet={() => setActiveTab('wallet')}
                blockedUserIds={blockedUserIds}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesView
                users={users}
                onStartCall={handleInitiateCallClick}
                onBlockUser={handleBlockUser}
                onReportUser={handleReportUser}
                blockedUserIds={blockedUserIds}
              />
            )}

            {activeTab === 'wallet' && (
              <WalletView
                coinBalance={coinBalance}
                ledger={ledger}
                onAddCoins={handleAddCoins}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                currentLanguage={currentLanguage}
                onLanguageChange={setCurrentLanguage}
                coinBalance={coinBalance}
              />
            )}

            {/* Mobile Bottom Navigation Bar */}
            <BottomNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unreadCount={1}
            />
          </>
        )}

        {/* 2. Creator Hub Mode */}
        {currentRole === 'creator' && (
          <CreatorView
            earnings={creatorEarnings}
            onRequestPayout={handleRequestPayout}
          />
        )}

        {/* 3. Safety & Moderation Console */}
        {currentRole === 'moderator' && (
          <ModeratorView
            reports={reports}
            onTakeAction={handleModeratorAction}
          />
        )}

        {/* 4. Super Administrator Dashboard */}
        {currentRole === 'admin' && <AdminView />}
      </main>

      {/* Pre-Call Pricing & Balance Disclosure Modal */}
      {preCallTarget && (
        <PreCallPricingModal
          partner={preCallTarget}
          coinBalance={coinBalance}
          onConfirm={handleConfirmPreCall}
          onCancel={() => setPreCallTarget(null)}
          onOpenWallet={() => {
            setPreCallTarget(null);
            setCurrentRole('user');
            setActiveTab('wallet');
          }}
        />
      )}

      {/* Flagship Active Voice Call Screen */}
      {activeCallPartner && (
        <ActiveCallModal
          partner={activeCallPartner}
          coinBalance={coinBalance}
          onDeductCoins={handleDeductCoins}
          onEndCall={handleEndCall}
          onOpenWallet={() => {
            setCurrentRole('user');
            setActiveTab('wallet');
          }}
          onBlockUser={handleBlockUser}
          onReportUser={handleReportUser}
        />
      )}

      {/* Call Summary Modal */}
      {callSummary && (
        <CallSummaryModal
          summary={callSummary}
          onClose={() => setCallSummary(null)}
        />
      )}

      {/* Standalone Gift Picker Drawer */}
      {giftPickerTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#141416] border border-white/10 rounded-[32px] w-full max-w-xs p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">
                Send to {giftPickerTarget.displayName}
              </span>
              <button
                onClick={() => setGiftPickerTarget(null)}
                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {VIRTUAL_GIFTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSendStandaloneGift(g)}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-amber-400/40 transition-all text-left space-y-1 cursor-pointer group"
                >
                  <div className="text-2xl group-hover:scale-110 transition-transform">{g.icon}</div>
                  <h4 className="font-semibold text-xs text-white">{g.name}</h4>
                  <span className="inline-block font-bold text-xs text-amber-300">
                    {g.coins} 🪙
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive 18+ Onboarding Wizard */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}

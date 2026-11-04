export type UserRole = 'user' | 'creator' | 'moderator' | 'admin';

export type LanguageCode = 'te' | 'hi' | 'en';

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  age: number;
  gender: 'male' | 'female' | 'non_binary';
  primaryLanguage: LanguageCode;
  supportedLanguages: LanguageCode[];
  interests: string[];
  location: string;
  isOnline: boolean;
  isCalling: boolean;
  isVerified: boolean;
  callRatePerMin: number; // in coins (e.g., 15 or 20 coins/min)
  isCreator: boolean;
  totalCallsHosted?: number;
  totalMinutesHosted?: number;
}

export interface VirtualGift {
  id: string;
  name: string;
  coins: number;
  icon: string;
  animationType: 'rose' | 'coffee' | 'crown' | 'peacock';
  description: string;
}

export interface WalletTransaction {
  id: string;
  type: 'purchase_credit' | 'call_debit' | 'gift_sent_debit' | 'admin_grant' | 'refund';
  amount: number; // positive for credit, negative for debit
  balanceAfter: number;
  description: string;
  referenceId: string;
  createdAt: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  bonusCoins: number;
  priceInr: number;
  badge?: string;
  popular?: boolean;
}

export interface CreatorEarnings {
  withdrawableInr: number;
  lifetimeInrEarned: number;
  revenueSharePercent: number;
  totalGiftsReceived: number;
  payoutHistory: {
    id: string;
    amountInr: number;
    destinationUpiOrBank: string;
    status: 'pending' | 'processed' | 'rejected';
    requestedAt: string;
  }[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface ReportTicket {
  id: string;
  reporterName: string;
  reportedUser: UserProfile;
  reason: 'harassment' | 'inappropriate_audio' | 'underage' | 'spam' | 'impersonation';
  callSessionId?: string;
  description: string;
  timestamp: string;
  geminiToxicityScore: number; // 0.0 - 1.0
  geminiAnalysis: string;
  status: 'pending' | 'warned' | 'suspended' | 'banned' | 'dismissed';
}

import { UserProfile, VirtualGift, CoinPackage, WalletTransaction, ReportTicket } from '../types';

export const INITIAL_PACKAGES: CoinPackage[] = [
  {
    id: 'pack_starter',
    name: 'Starter Pack',
    coinAmount: 50,
    bonusCoins: 0,
    priceInr: 49,
    badge: 'Standard'
  },
  {
    id: 'pack_popular',
    name: 'Conversation Pack',
    coinAmount: 250,
    bonusCoins: 25,
    priceInr: 199,
    badge: 'Most Popular',
    popular: true
  },
  {
    id: 'pack_vip',
    name: 'Super Nectar Pack',
    coinAmount: 700,
    bonusCoins: 100,
    priceInr: 499,
    badge: 'Best Value'
  }
];

export const VIRTUAL_GIFTS: VirtualGift[] = [
  {
    id: 'gift_rose',
    name: 'Gulabi Rose',
    coins: 10,
    icon: '🌹',
    animationType: 'rose',
    description: 'A fragrant warm greeting'
  },
  {
    id: 'gift_coffee',
    name: 'Irani Chai',
    coins: 25,
    icon: '☕',
    animationType: 'coffee',
    description: 'Hyderabad special hot cutting chai'
  },
  {
    id: 'gift_crown',
    name: 'Nectar Crown',
    coins: 100,
    icon: '👑',
    animationType: 'crown',
    description: 'Royal honor for an amazing conversation'
  },
  {
    id: 'gift_peacock',
    name: 'Royal Peacock',
    coins: 500,
    icon: '🦚',
    animationType: 'peacock',
    description: 'Grandest gesture of friendship & respect'
  }
];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_1',
    displayName: 'Ananya Rao',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Late night Telugu movie debater & classical music enthusiast! Let’s talk about Tollywood nostalgia and Telugu poetry.',
    age: 23,
    gender: 'female',
    primaryLanguage: 'te',
    supportedLanguages: ['te', 'en'],
    interests: ['Tollywood', 'Late Night Talks', 'Classical Music', 'Poetry'],
    location: 'Hyderabad, Telangana',
    isOnline: true,
    isCalling: false,
    isVerified: true,
    callRatePerMin: 20,
    isCreator: true,
    totalCallsHosted: 342,
    totalMinutesHosted: 1850
  },
  {
    id: 'user_2',
    displayName: 'Rohan Sharma',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'Tech founder by day, Hindi shayari and indie acoustic guitarist by night. Up for philosophical chats & comedy!',
    age: 26,
    gender: 'male',
    primaryLanguage: 'hi',
    supportedLanguages: ['hi', 'en'],
    interests: ['Shayari', 'Startup Hustle', 'Acoustic Guitar', 'Philosophy'],
    location: 'Bengaluru, Karnataka',
    isOnline: true,
    isCalling: false,
    isVerified: true,
    callRatePerMin: 15,
    isCreator: false
  },
  {
    id: 'user_3',
    displayName: 'Sravani Reddy',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    bio: 'RJ vibes! Love deep meaningful midnight conversations, relationship advice and Telugu comedy banter.',
    age: 24,
    gender: 'female',
    primaryLanguage: 'te',
    supportedLanguages: ['te', 'hi', 'en'],
    interests: ['Telugu Comedy', 'Relationship Advice', 'Podcasts', 'Food Walks'],
    location: 'Visakhapatnam, Andhra Pradesh',
    isOnline: true,
    isCalling: false,
    isVerified: true,
    callRatePerMin: 25,
    isCreator: true,
    totalCallsHosted: 520,
    totalMinutesHosted: 2410
  },
  {
    id: 'user_4',
    displayName: 'Kabir Verma',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Delhi food lover, cricket analyst and cinema buff. Can talk about Virat Kohli and 90s Bollywood for hours!',
    age: 27,
    gender: 'male',
    primaryLanguage: 'hi',
    supportedLanguages: ['hi', 'en'],
    interests: ['Cricket Analysis', 'Bollywood', 'Food Walks', 'Standup Comedy'],
    location: 'Delhi NCR',
    isOnline: false,
    isCalling: false,
    isVerified: false,
    callRatePerMin: 15,
    isCreator: false
  },
  {
    id: 'user_5',
    displayName: 'Pooja Iyer',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    bio: 'Architect, jazz lover, and avid reader. Fluent in English and Telugu. Here to unwind with thoughtful storytellers.',
    age: 25,
    gender: 'female',
    primaryLanguage: 'en',
    supportedLanguages: ['en', 'te'],
    interests: ['Architecture', 'Jazz & Blues', 'Book Club', 'Travel Tales'],
    location: 'Chennai / Hyderabad',
    isOnline: true,
    isCalling: false,
    isVerified: true,
    callRatePerMin: 20,
    isCreator: true,
    totalCallsHosted: 190,
    totalMinutesHosted: 890
  },
  {
    id: 'user_6',
    displayName: 'Tarun Varma',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    bio: 'Software engineer & gaming streamer. Telugu & English. Always ready to connect and debate anime and sci-fi!',
    age: 22,
    gender: 'male',
    primaryLanguage: 'te',
    supportedLanguages: ['te', 'en'],
    interests: ['Anime', 'Gaming', 'Sci-Fi', 'Tech Gossip'],
    location: 'Hyderabad, Telangana',
    isOnline: true,
    isCalling: false,
    isVerified: false,
    callRatePerMin: 15,
    isCreator: false
  }
];

export const INITIAL_LEDGER: WalletTransaction[] = [
  {
    id: 'tx_init_1',
    type: 'purchase_credit',
    amount: 275,
    balanceAfter: 275,
    description: 'Purchased Conversation Pack (UPI / GPay)',
    referenceId: 'pay_rzp_mock_98231',
    createdAt: 'Today, 11:20 AM'
  },
  {
    id: 'tx_init_2',
    type: 'call_debit',
    amount: -40,
    balanceAfter: 235,
    description: 'Voice Call (2 mins @ 20 coins/min) with Ananya Rao',
    referenceId: 'call_sess_8912',
    createdAt: 'Today, 11:45 AM'
  },
  {
    id: 'tx_init_3',
    type: 'gift_sent_debit',
    amount: -25,
    balanceAfter: 210,
    description: 'Sent Irani Chai ☕ to Ananya Rao',
    referenceId: 'gift_tx_0912',
    createdAt: 'Today, 11:47 AM'
  }
];

export const INITIAL_REPORTS: ReportTicket[] = [
  {
    id: 'rep_1',
    reporterName: 'Sravani Reddy',
    reportedUser: {
      id: 'bad_user_99',
      displayName: 'Anonymous9921',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      bio: 'DM for private WhatsApp number. Available all night.',
      age: 21,
      gender: 'male',
      primaryLanguage: 'hi',
      supportedLanguages: ['hi'],
      interests: ['Late Night'],
      location: 'Unverified',
      isOnline: true,
      isCalling: false,
      isVerified: false,
      callRatePerMin: 10,
      isCreator: false
    },
    reason: 'inappropriate_audio',
    callSessionId: 'call_sess_bad_77',
    description: 'User repeatedly asked for personal phone number and made explicit romantic requests despite verbal warning.',
    timestamp: '15 mins ago',
    geminiToxicityScore: 0.94,
    geminiAnalysis: 'High Confidence Policy Violation: Solicitation of off-platform personal contact info & unwelcome explicit audio remarks. Recommended action: 24h Suspension or Permanent Ban.',
    status: 'pending'
  },
  {
    id: 'rep_2',
    reporterName: 'Rohan Sharma',
    reportedUser: {
      id: 'bad_user_88',
      displayName: 'CryptoPromoKing',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80',
      bio: 'Earn 5000 daily from home. Join Telegram group now!',
      age: 29,
      gender: 'male',
      primaryLanguage: 'en',
      supportedLanguages: ['en', 'hi'],
      interests: ['Tech Hustle'],
      location: 'Delhi',
      isOnline: false,
      isCalling: false,
      isVerified: false,
      callRatePerMin: 15,
      isCreator: false
    },
    reason: 'spam',
    description: 'Joined voice call playing automated pre-recorded audio advertising scam Telegram investment channel.',
    timestamp: '45 mins ago',
    geminiToxicityScore: 0.88,
    geminiAnalysis: 'Commercial spam / fraudulent solicitation detected. Matches blacklisted scam affiliate keywords.',
    status: 'pending'
  }
];

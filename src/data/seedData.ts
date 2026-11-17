import type {
  ClassmateEntry,
  FolderColor,
  RankTier,
  ReminderSettings,
  TopicFolder,
  UserProgress,
  VocabWord,
} from '../types/vocab';

export const FOLDER_COLOR_STYLES: Record<
  FolderColor,
  {
    label: string;
    bg: string;
    activeBg: string;
    border: string;
    swatch: string;
    text: string;
  }
> = {
  lavender: {
    label: 'Soft Lavender',
    bg: 'bg-[#F3F0FC]',
    activeBg: 'bg-[#E6E6FA]',
    border: 'border-[#D5CEF5]',
    swatch: 'bg-[#B9AEE8]',
    text: 'text-[#3F3163]',
  },
  blush: {
    label: 'Blush Pink',
    bg: 'bg-[#FFF2F0]',
    activeBg: 'bg-[#FFE4E1]',
    border: 'border-[#F7CBC6]',
    swatch: 'bg-[#F29C94]',
    text: 'text-[#632F2D]',
  },
  mint: {
    label: 'Fresh Mint',
    bg: 'bg-[#EEF9F8]',
    activeBg: 'bg-[#E0F2F1]',
    border: 'border-[#BFE3E0]',
    swatch: 'bg-[#6FC2BA]',
    text: 'text-[#1F4F4B]',
  },
  cream: {
    label: 'Warm Cream',
    bg: 'bg-[#FFFDF5]',
    activeBg: 'bg-[#FFF6DA]',
    border: 'border-[#EFE2B8]',
    swatch: 'bg-[#E6C56E]',
    text: 'text-[#59471A]',
  },
  sky: {
    label: 'Pastel Sky',
    bg: 'bg-[#EFF7FC]',
    activeBg: 'bg-[#DFF0FA]',
    border: 'border-[#BFDFF2]',
    swatch: 'bg-[#7BBCE8]',
    text: 'text-[#1F4B66]',
  },
  peach: {
    label: 'Soft Peach',
    bg: 'bg-[#FFF4EC]',
    activeBg: 'bg-[#FFE7D6]',
    border: 'border-[#F7CFB3]',
    swatch: 'bg-[#F2A679]',
    text: 'text-[#61371E]',
  },
};

function makeSvgSticker(bg: string, stroke: string, accent: string, pathMarkup: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><rect width="160" height="160" rx="28" fill="${bg}"/><circle cx="80" cy="80" r="56" fill="#FFFFFF" fill-opacity="0.72"/><g stroke="${stroke}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="${accent}">${pathMarkup}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface StickerOption {
  id: string;
  label: string;
  keywords: string[];
  url: string;
}

export const CURATED_STICKERS: StickerOption[] = [
  {
    id: 'sticker-env',
    label: 'Green Earth & Wind',
    keywords: ['environment', 'sustainable', 'renewable', 'earth', 'green', 'nature', 'eco'],
    url: '/src/assets/images/vocab_sustainability_earth_1794884413223.jpg',
  },
  {
    id: 'sticker-coffee',
    label: 'Coffee & Chat',
    keywords: ['conversation', 'coffee', 'chat', 'catch up', 'talk', 'friends', 'daily'],
    url: '/src/assets/images/vocab_coffee_conversation_1794884412432.jpg',
  },
  {
    id: 'sticker-family',
    label: 'Family Cottage',
    keywords: ['family', 'home', 'cottage', 'harmony', 'garden', 'upbringing', 'cherish'],
    url: '/src/assets/images/vocab_family_home_1794884412553.jpg',
  },
  {
    id: 'sticker-business',
    label: 'Business Desk',
    keywords: ['business', 'work', 'briefcase', 'negotiate', 'office', 'strategy', 'career'],
    url: '/src/assets/images/vocab_business_briefcase_1794884413185.jpg',
  },
  {
    id: 'sticker-notebook',
    label: 'Study Notebook',
    keywords: ['study', 'note', 'learn', 'write', 'journal', 'book', 'vocabulary'],
    url: '/src/assets/images/brand_notebook_illustration_1794884411584.jpg',
  },
  {
    id: 'sticker-leaf',
    label: 'Botanical Leaf',
    keywords: ['leaf', 'plant', 'ecosystem', 'biodiversity', 'forest', 'nature'],
    url: makeSvgSticker(
      '#E0F2F1',
      '#245953',
      '#9ADCD5',
      '<path d="M46 112C46 72 74 46 114 46C114 86 88 112 46 112Z"/><path d="M46 112L94 64" fill="none"/>'
    ),
  },
  {
    id: 'sticker-spark',
    label: 'Bright Idea',
    keywords: ['idea', 'initiative', 'creative', 'innovate', 'light', 'smart', 'solution'],
    url: makeSvgSticker(
      '#FFF6DA',
      '#6E5116',
      '#FDE28A',
      '<path d="M80 42A24 24 0 0 0 65 85V96H95V85A24 24 0 0 0 80 42Z"/><path d="M68 106H92M72 114H88" fill="none"/>'
    ),
  },
  {
    id: 'sticker-heart',
    label: 'Warm Care',
    keywords: ['love', 'affectionate', 'grateful', 'cherish', 'kind', 'care', 'heart'],
    url: makeSvgSticker(
      '#FFE4E1',
      '#783533',
      '#F9B4AE',
      '<path d="M80 114C80 114 44 90 44 65A19 19 0 0 1 80 57A19 19 0 0 1 116 65C116 90 80 114 80 114Z"/>'
    ),
  },
  {
    id: 'sticker-clock',
    label: 'Time & Deadline',
    keywords: ['time', 'deadline', 'schedule', 'milestone', 'routine', 'daily'],
    url: makeSvgSticker(
      '#E6E6FA',
      '#3F3163',
      '#CFC9F6',
      '<circle cx="80" cy="80" r="34"/><path d="M80 60V80L94 88" fill="none"/>'
    ),
  },
  {
    id: 'sticker-handshake',
    label: 'Teamwork',
    keywords: ['collaborate', 'team', 'together', 'partner', 'meeting', 'sibling'],
    url: makeSvgSticker(
      '#DFF0FA',
      '#1F4B66',
      '#A8D6F3',
      '<circle cx="62" cy="64" r="12"/><circle cx="98" cy="64" r="12"/><path d="M42 108C42 93 52 84 64 84C72 84 77 88 80 92C83 88 88 84 96 84C108 84 118 93 118 108Z"/>'
    ),
  },
];

export const RANK_TIERS: RankTier[] = [
  {
    id: 'seedling',
    title: 'Seedling Learner',
    minXp: 0,
    badgeEmoji: '🌱',
    accentBg: 'bg-[#E0F2F1]',
    accentText: 'text-[#1F4F4B]',
    description: 'Just planted your first English vocabulary seeds!',
  },
  {
    id: 'explorer',
    title: 'Word Explorer',
    minXp: 150,
    badgeEmoji: '🧭',
    accentBg: 'bg-[#DFF0FA]',
    accentText: 'text-[#1F4B66]',
    description: 'Curious learner building daily reading & listening habits.',
  },
  {
    id: 'builder',
    title: 'Vocabulary Builder',
    minXp: 400,
    badgeEmoji: '🧱',
    accentBg: 'bg-[#FFF6DA]',
    accentText: 'text-[#59471A]',
    description: 'Confidently connecting synonyms and real-life examples.',
  },
  {
    id: 'scholar',
    title: 'Language Scholar',
    minXp: 800,
    badgeEmoji: '📚',
    accentBg: 'bg-[#E6E6FA]',
    accentText: 'text-[#3F3163]',
    description: 'Strong mastery across academic and everyday topics.',
  },
  {
    id: 'master',
    title: 'Vocab Master',
    minXp: 1500,
    badgeEmoji: '🌸',
    accentBg: 'bg-[#FFE4E1]',
    accentText: 'text-[#632F2D]',
    description: 'Impressive recall speed, pronunciation, and sentence fluency.',
  },
  {
    id: 'linguist',
    title: 'Grand Linguist',
    minXp: 3000,
    badgeEmoji: '👑',
    accentBg: 'bg-[#FFE7D6]',
    accentText: 'text-[#61371E]',
    description: 'Top scholar in Ms. Thúy’s class with unstoppable momentum!',
  },
];

export function getRankForXp(xp: number): {
  current: RankTier;
  next: RankTier | null;
  progressPercent: number;
} {
  let current = RANK_TIERS[0];
  let next: RankTier | null = RANK_TIERS[1];

  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (xp >= RANK_TIERS[i].minXp) {
      current = RANK_TIERS[i];
      next = RANK_TIERS[i + 1] ?? null;
    }
  }

  if (!next) {
    return { current, next: null, progressPercent: 100 };
  }

  const span = next.minXp - current.minXp;
  const gained = xp - current.minXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((gained / span) * 100)));
  return { current, next, progressPercent };
}

export const INITIAL_FOLDERS: TopicFolder[] = [
  {
    id: 'folder-ielts-env',
    name: 'IELTS Environment',
    description: 'Academic vocabulary for climate, energy & conservation topics.',
    color: 'mint',
    createdAt: 1730000000000,
  },
  {
    id: 'folder-daily-conv',
    name: 'Daily Conversation',
    description: 'Natural expressions for warm everyday chats and social life.',
    color: 'blush',
    createdAt: 1730000100000,
  },
  {
    id: 'folder-business',
    name: 'Business English',
    description: 'Essential workplace verbs and project communication terms.',
    color: 'lavender',
    createdAt: 1730000200000,
  },
  {
    id: 'folder-unit1-family',
    name: 'Unit 1: Family',
    description: 'Heartwarming words about family bonds, home, and generations.',
    color: 'peach',
    createdAt: 1730000300000,
  },
];

export const INITIAL_WORDS: VocabWord[] = [
  // IELTS Environment
  {
    id: 'w-env-1',
    folderId: 'folder-ielts-env',
    english: 'sustainable',
    ipa: '/səˈsteɪnəbl/',
    vietnamese: 'bền vững, có thể duy trì lâu dài',
    example: 'Cities need sustainable transport systems to reduce carbon emissions.',
    exampleVi: 'Các thành phố cần hệ thống giao thông bền vững để giảm khí thải carbon.',
    synonyms: ['eco-friendly', 'viable'],
    imageUrl: '/src/assets/images/vocab_sustainability_earth_1794884413223.jpg',
    mastered: true,
    createdAt: 1730000001000,
  },
  {
    id: 'w-env-2',
    folderId: 'folder-ielts-env',
    english: 'mitigate',
    ipa: '/ˈmɪtɪɡeɪt/',
    vietnamese: 'làm dịu bớt, giảm nhẹ tác động',
    example: 'Planting coastal mangroves helps mitigate the impact of severe storms.',
    exampleVi: 'Việc trồng rừng ngập mặn ven biển giúp giảm nhẹ tác động của bão lớn.',
    synonyms: ['alleviate', 'lessen'],
    imageUrl: CURATED_STICKERS[5].url,
    mastered: false,
    createdAt: 1730000002000,
  },
  {
    id: 'w-env-3',
    folderId: 'folder-ielts-env',
    english: 'biodiversity',
    ipa: '/ˌbaɪəʊdaɪˈvɜːsəti/',
    vietnamese: 'đa dạng sinh học',
    example: 'Protecting tropical rainforests is vital for global biodiversity.',
    exampleVi: 'Bảo vệ rừng mưa nhiệt đới rất quan trọng đối với đa dạng sinh học toàn cầu.',
    synonyms: [],
    imageUrl: CURATED_STICKERS[5].url,
    mastered: false,
    createdAt: 1730000003000,
  },
  {
    id: 'w-env-4',
    folderId: 'folder-ielts-env',
    english: 'renewable',
    ipa: '/rɪˈnjuːəbl/',
    vietnamese: 'có thể tái tạo (năng lượng)',
    example: 'Solar and wind are clean renewable energy sources.',
    exampleVi: 'Năng lượng mặt trời và gió là những nguồn năng lượng tái tạo sạch.',
    synonyms: ['replenishable'],
    imageUrl: '/src/assets/images/vocab_sustainability_earth_1794884413223.jpg',
    mastered: false,
    createdAt: 1730000004000,
  },
  {
    id: 'w-env-5',
    folderId: 'folder-ielts-env',
    english: 'ecosystem',
    ipa: '/ˈiːkəʊsɪstəm/',
    vietnamese: 'hệ sinh thái',
    example: 'Plastic pollution seriously threatens the marine ecosystem.',
    exampleVi: 'Ô nhiễm rác thải nhựa đe dọa nghiêm trọng hệ sinh thái biển.',
    synonyms: [],
    mastered: false,
    createdAt: 1730000005000,
  },
  {
    id: 'w-env-6',
    folderId: 'folder-ielts-env',
    english: 'conservation',
    ipa: '/ˌkɒnsəˈveɪʃn/',
    vietnamese: 'sự bảo tồn (thiên nhiên, tài nguyên)',
    example: 'Wildlife conservation programs help endangered species recover.',
    exampleVi: 'Các chương trình bảo tồn động vật hoang dã giúp các loài có nguy cơ tuyệt chủng phục hồi.',
    synonyms: ['preservation'],
    mastered: false,
    createdAt: 1730000006000,
  },

  // Daily Conversation
  {
    id: 'w-daily-1',
    folderId: 'folder-daily-conv',
    english: 'catch up',
    ipa: '/kætʃ ʌp/',
    vietnamese: 'gặp gỡ, trò chuyện để cập nhật tin tức',
    example: 'Let us meet for coffee this Sunday to catch up on life.',
    exampleVi: 'Chủ nhật này chúng ta gặp nhau uống cà phê để hàn huyên nhé.',
    synonyms: ['reconnect'],
    imageUrl: '/src/assets/images/vocab_coffee_conversation_1794884412432.jpg',
    mastered: true,
    createdAt: 1730000101000,
  },
  {
    id: 'w-daily-2',
    folderId: 'folder-daily-conv',
    english: 'grateful',
    ipa: '/ˈɡreɪtfl/',
    vietnamese: 'biết ơn, cảm kích',
    example: 'I am truly grateful for your patient advice today.',
    exampleVi: 'Mình thực sự biết ơn những lời khuyên kiên nhẫn của bạn hôm nay.',
    synonyms: ['thankful', 'appreciative'],
    imageUrl: CURATED_STICKERS[7].url,
    mastered: false,
    createdAt: 1730000102000,
  },
  {
    id: 'w-daily-3',
    folderId: 'folder-daily-conv',
    english: 'spontaneous',
    ipa: '/spɒnˈteɪniəs/',
    vietnamese: 'tự phát, ngẫu hứng',
    example: 'We took a spontaneous road trip to the beach after class.',
    exampleVi: 'Chúng mình đã có một chuyến đi biển ngẫu hứng sau giờ học.',
    synonyms: ['impulsive', 'unplanned'],
    mastered: false,
    createdAt: 1730000103000,
  },
  {
    id: 'w-daily-4',
    folderId: 'folder-daily-conv',
    english: 'unwind',
    ipa: '/ʌnˈwaɪnd/',
    vietnamese: 'thư giãn, xả hơi sau giờ làm',
    example: 'Listening to acoustic music helps me unwind in the evening.',
    exampleVi: 'Nghe nhạc acoustic giúp tôi thư giãn vào buổi tối.',
    synonyms: ['relax'],
    mastered: false,
    createdAt: 1730000104000,
  },
  {
    id: 'w-daily-5',
    folderId: 'folder-daily-conv',
    english: 'hospitality',
    ipa: '/ˌhɒspɪˈtælɪti/',
    vietnamese: 'lòng hiếu khách',
    example: 'Visitors always remember the warm hospitality of local families.',
    exampleVi: 'Du khách luôn nhớ mãi lòng hiếu khách ấm áp của các gia đình địa phương.',
    synonyms: [],
    imageUrl: '/src/assets/images/vocab_coffee_conversation_1794884412432.jpg',
    mastered: false,
    createdAt: 1730000105000,
  },

  // Business English
  {
    id: 'w-biz-1',
    folderId: 'folder-business',
    english: 'collaborate',
    ipa: '/kəˈlæbəreɪt/',
    vietnamese: 'hợp tác, cộng tác',
    example: 'Our design and marketing teams collaborate closely on every launch.',
    exampleVi: 'Đội ngũ thiết kế và tiếp thị của chúng tôi hợp tác chặt chẽ trong mỗi lần ra mắt.',
    synonyms: ['cooperate', 'partner'],
    imageUrl: CURATED_STICKERS[9].url,
    mastered: false,
    createdAt: 1730000201000,
  },
  {
    id: 'w-biz-2',
    folderId: 'folder-business',
    english: 'negotiate',
    ipa: '/nɪˈɡəʊʃieɪt/',
    vietnamese: 'đàm phán, thương lượng',
    example: 'Both companies met to negotiate a fair supply agreement.',
    exampleVi: 'Cả hai công ty đã gặp nhau để đàm phán một thỏa thuận cung ứng công bằng.',
    synonyms: ['bargain'],
    imageUrl: '/src/assets/images/vocab_business_briefcase_1794884413185.jpg',
    mastered: false,
    createdAt: 1730000202000,
  },
  {
    id: 'w-biz-3',
    folderId: 'folder-business',
    english: 'deadline',
    ipa: '/ˈdedlaɪn/',
    vietnamese: 'hạn chót hoàn thành công việc',
    example: 'Please submit your quarterly report before the Friday deadline.',
    exampleVi: 'Vui lòng nộp báo cáo quý của bạn trước hạn chót thứ Sáu.',
    synonyms: [],
    imageUrl: CURATED_STICKERS[8].url,
    mastered: false,
    createdAt: 1730000203000,
  },
  {
    id: 'w-biz-4',
    folderId: 'folder-business',
    english: 'initiative',
    ipa: '/ɪˈnɪʃətɪv/',
    vietnamese: 'sáng kiến, tinh thần chủ động',
    example: 'She showed great initiative by organizing the weekly study group.',
    exampleVi: 'Cô ấy thể hiện tinh thần chủ động tuyệt vời khi tổ chức nhóm học hàng tuần.',
    synonyms: ['enterprise'],
    imageUrl: CURATED_STICKERS[6].url,
    mastered: false,
    createdAt: 1730000204000,
  },
  {
    id: 'w-biz-5',
    folderId: 'folder-business',
    english: 'streamline',
    ipa: '/ˈstriːmlaɪn/',
    vietnamese: 'tinh giản, tối ưu hóa quy trình',
    example: 'New software will streamline our daily invoice approval workflow.',
    exampleVi: 'Phần mềm mới sẽ tối ưu hóa quy trình phê duyệt hóa đơn hàng ngày của chúng ta.',
    synonyms: ['simplify'],
    mastered: false,
    createdAt: 1730000205000,
  },

  // Unit 1: Family
  {
    id: 'w-fam-1',
    folderId: 'folder-unit1-family',
    english: 'affectionate',
    ipa: '/əˈfekʃənət/',
    vietnamese: 'trìu mến, giàu tình cảm',
    example: 'My grandmother always greets everyone with an affectionate smile.',
    exampleVi: 'Bà tôi luôn chào đón mọi người bằng một nụ cười đầy trìu mến.',
    synonyms: ['loving', 'tender'],
    imageUrl: CURATED_STICKERS[7].url,
    mastered: false,
    createdAt: 1730000301000,
  },
  {
    id: 'w-fam-2',
    folderId: 'folder-unit1-family',
    english: 'upbringing',
    ipa: '/ˈʌpbrɪŋɪŋ/',
    vietnamese: 'sự nuôi dạy, giáo dục từ nhỏ',
    example: 'A supportive upbringing gives children confidence to explore the world.',
    exampleVi: 'Sự nuôi dạy đầy yêu thương giúp trẻ tự tin khám phá thế giới.',
    synonyms: [],
    imageUrl: '/src/assets/images/vocab_family_home_1794884412553.jpg',
    mastered: false,
    createdAt: 1730000302000,
  },
  {
    id: 'w-fam-3',
    folderId: 'folder-unit1-family',
    english: 'cherish',
    ipa: '/ˈtʃerɪʃ/',
    vietnamese: 'trân trọng, nâng niu',
    example: 'We cherish Sunday dinners together with the whole family.',
    exampleVi: 'Chúng tôi luôn trân trọng những bữa tối Chủ nhật quây quần bên cả gia đình.',
    synonyms: ['treasure'],
    imageUrl: '/src/assets/images/vocab_family_home_1794884412553.jpg',
    mastered: false,
    createdAt: 1730000303000,
  },
  {
    id: 'w-fam-4',
    folderId: 'folder-unit1-family',
    english: 'harmony',
    ipa: '/ˈhɑːməni/',
    vietnamese: 'sự hòa thuận, hài hòa',
    example: 'Mutual respect helps three generations live in harmony.',
    exampleVi: 'Sự tôn trọng lẫn nhau giúp ba thế hệ chung sống hòa thuận.',
    synonyms: [],
    mastered: false,
    createdAt: 1730000304000,
  },
  {
    id: 'w-fam-5',
    folderId: 'folder-unit1-family',
    english: 'sibling',
    ipa: '/ˈsɪblɪŋ/',
    vietnamese: 'anh chị em ruột',
    example: 'Having an older sibling taught me how to share patiently.',
    exampleVi: 'Có một người anh chị lớn tuổi hơn dạy tôi cách biết sẻ chia kiên nhẫn.',
    synonyms: [],
    imageUrl: CURATED_STICKERS[9].url,
    mastered: false,
    createdAt: 1730000305000,
  },
];

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const INITIAL_PROGRESS: UserProgress = {
  studentName: 'You (Class 12A)',
  xp: 215,
  dailyXp: 45,
  todayDate: getTodayIsoDate(),
  streak: 4,
  lastActiveDate: getTodayIsoDate(),
  totalWordsAdded: 0,
  totalFlashcardsCompleted: 1,
  totalQuizzesCompleted: 2,
  totalCorrectAnswers: 14,
};

export const INITIAL_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  email: '',
  time: '20:00',
  selectedFolderIds: ['folder-ielts-env', 'folder-daily-conv'],
};

export const SIMULATED_CLASSMATES: ClassmateEntry[] = [
  {
    id: 'peer-1',
    name: 'Minh Anh',
    dailyXp: 135,
    totalXp: 1640,
    streak: 14,
    avatarBg: 'bg-[#E6E6FA] text-[#3F3163]',
  },
  {
    id: 'peer-2',
    name: 'Gia Huy',
    dailyXp: 110,
    totalXp: 980,
    streak: 9,
    avatarBg: 'bg-[#E0F2F1] text-[#1F4F4B]',
  },
  {
    id: 'peer-3',
    name: 'Khánh Linh',
    dailyXp: 90,
    totalXp: 870,
    streak: 7,
    avatarBg: 'bg-[#FFE4E1] text-[#632F2D]',
  },
  {
    id: 'peer-4',
    name: 'Bảo Ngọc',
    dailyXp: 65,
    totalXp: 540,
    streak: 5,
    avatarBg: 'bg-[#FFF6DA] text-[#59471A]',
  },
  {
    id: 'peer-5',
    name: 'Đức Anh',
    dailyXp: 40,
    totalXp: 320,
    streak: 3,
    avatarBg: 'bg-[#DFF0FA] text-[#1F4B66]',
  },
  {
    id: 'peer-6',
    name: 'Thảo Vy',
    dailyXp: 25,
    totalXp: 190,
    streak: 2,
    avatarBg: 'bg-[#FFE7D6] text-[#61371E]',
  },
];

export const IPA_QUICK_SYMBOLS = [
  '/',
  'ˈ',
  'ˌ',
  'ː',
  'ə',
  'ɜː',
  'æ',
  'ɑː',
  'ɔː',
  'ɪ',
  'iː',
  'ʊ',
  'uː',
  'ʌ',
  'eɪ',
  'aɪ',
  'ɔɪ',
  'aʊ',
  'əʊ',
  'θ',
  'ð',
  'ʃ',
  'ʒ',
  'tʃ',
  'dʒ',
  'ŋ',
];

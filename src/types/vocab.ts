export type FolderColor = 'lavender' | 'blush' | 'mint' | 'cream' | 'sky' | 'peach';

export interface TopicFolder {
  id: string;
  name: string;
  description: string;
  color: FolderColor;
  createdAt: number;
}

export interface VocabWord {
  id: string;
  folderId: string;
  english: string;
  ipa: string;
  vietnamese: string;
  example: string;
  exampleVi: string;
  synonyms: string[];
  imageUrl?: string;
  mastered?: boolean;
  createdAt: number;
  lastReviewedAt?: number;
}

export interface RankTier {
  id: string;
  title: string;
  minXp: number;
  badgeEmoji: string;
  accentBg: string;
  accentText: string;
  description: string;
}

export interface UserProgress {
  studentName: string;
  xp: number;
  dailyXp: number;
  todayDate: string;
  streak: number;
  lastActiveDate: string;
  totalWordsAdded: number;
  totalFlashcardsCompleted: number;
  totalQuizzesCompleted: number;
  totalCorrectAnswers: number;
}

export interface ReminderSettings {
  enabled: boolean;
  email: string;
  time: string;
  selectedFolderIds: string[];
  lastTestSentAt?: string;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
}

export type QuizQuestionType =
  | 'en_to_vi'
  | 'vi_to_en'
  | 'cloze'
  | 'synonym'
  | 'scramble';

export interface QuizQuestion {
  id: string;
  quarter: 1 | 2 | 3 | 4;
  type: QuizQuestionType;
  word: VocabWord;
  prompt: string;
  subPrompt?: string;
  options?: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  scrambledTokens?: string[];
  targetTokens?: string[];
}

export interface QuizAnswerRecord {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
}

export interface ClassmateEntry {
  id: string;
  name: string;
  dailyXp: number;
  totalXp: number;
  streak: number;
  avatarBg: string;
  isCurrentUser?: boolean;
}

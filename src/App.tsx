/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { BackupModal, type VocabBackupPayload } from './components/BackupModal';
import { EmailReminderModal } from './components/EmailReminderModal';
import { FlashcardMode } from './components/FlashcardMode';
import { FolderSidebar } from './components/FolderSidebar';
import { Header, type ActiveView } from './components/Header';
import { LeaderboardModal } from './components/LeaderboardModal';
import { SmartQuizMode } from './components/SmartQuizMode';
import { VocabTable } from './components/VocabTable';
import {
  getRankForXp,
  getTodayIsoDate,
  INITIAL_FOLDERS,
  INITIAL_PROGRESS,
  INITIAL_REMINDER_SETTINGS,
  INITIAL_WORDS,
} from './data/seedData';
import type {
  FolderColor,
  ReminderSettings,
  TopicFolder,
  UserProgress,
  VocabWord,
} from './types/vocab';

const STORAGE_KEYS = {
  folders: 'ms_thuy_vocab_folders_v1',
  words: 'ms_thuy_vocab_words_v1',
  progress: 'ms_thuy_vocab_progress_v1',
  reminders: 'ms_thuy_vocab_reminders_v1',
  prefs: 'ms_thuy_vocab_prefs_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [folders, setFolders] = useState<TopicFolder[]>(() =>
    readStorage<TopicFolder[]>(STORAGE_KEYS.folders, INITIAL_FOLDERS)
  );
  const [words, setWords] = useState<VocabWord[]>(() =>
    readStorage<VocabWord[]>(STORAGE_KEYS.words, INITIAL_WORDS)
  );
  const [progress, setProgress] = useState<UserProgress>(() => {
    const stored = readStorage<UserProgress>(STORAGE_KEYS.progress, INITIAL_PROGRESS);
    const today = getTodayIsoDate();
    if (stored.todayDate !== today) {
      // Check if yesterday was active to keep streak, or increment on first action today
      const last = new Date(stored.lastActiveDate || today);
      const now = new Date(today);
      const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...stored,
        todayDate: today,
        dailyXp: 0,
        streak: diffDays === 1 ? stored.streak + 1 : diffDays === 0 ? stored.streak : 1,
        lastActiveDate: today,
      };
    }
    return stored;
  });
  const [reminders, setReminders] = useState<ReminderSettings>(() =>
    readStorage<ReminderSettings>(STORAGE_KEYS.reminders, INITIAL_REMINDER_SETTINGS)
  );
  const [prefs, setPrefs] = useState<{ accent: 'en-US' | 'en-GB'; muted: boolean }>(() =>
    readStorage(STORAGE_KEYS.prefs, { accent: 'en-US', muted: false })
  );

  const [activeFolderId, setActiveFolderId] = useState<string>(
    () => folders[0]?.id || 'all'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('notebook');
  const [studyWords, setStudyWords] = useState<VocabWord[]>([]);

  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(folders));
    } catch {
      // Storage quota guard
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(words));
    } catch {
      // Storage quota guard
    }
  }, [words]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
    } catch {
      // Storage quota guard
    }
  }, [progress]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders));
    } catch {
      // Storage quota guard
    }
  }, [reminders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(prefs));
    } catch {
      // Storage quota guard
    }
  }, [prefs]);

  const awardXp = useCallback((amount: number, extra?: Partial<UserProgress>) => {
    const today = getTodayIsoDate();
    setProgress((prev) => {
      const sameDay = prev.todayDate === today;
      return {
        ...prev,
        ...extra,
        xp: prev.xp + amount,
        dailyXp: (sameDay ? prev.dailyXp : 0) + amount,
        todayDate: today,
        lastActiveDate: today,
      };
    });
  }, []);

  // Folder handlers
  const handleCreateFolder = (name: string, description: string, color: FolderColor) => {
    const newFolder: TopicFolder = {
      id: `folder-${Date.now()}`,
      name,
      description,
      color,
      createdAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
    setActiveFolderId(newFolder.id);
  };

  const handleUpdateFolder = (
    id: string,
    updates: Partial<Pick<TopicFolder, 'name' | 'description' | 'color'>>
  ) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleDeleteFolder = (id: string) => {
    const remainingFolders = folders.filter((f) => f.id !== id);
    const removedWordIds = new Set(words.filter((w) => w.folderId === id).map((w) => w.id));
    setFolders(remainingFolders);
    setWords((prev) => prev.filter((w) => w.folderId !== id));
    setSelectedIds((prev) => prev.filter((wid) => !removedWordIds.has(wid)));
    if (activeFolderId === id) {
      setActiveFolderId(remainingFolders[0]?.id || 'all');
    }
  };

  // Word handlers
  const handleAddWord = (folderId: string): string => {
    const id = `word-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newWord: VocabWord = {
      id,
      folderId,
      english: '',
      ipa: '',
      vietnamese: '',
      example: '',
      exampleVi: '',
      synonyms: [],
      createdAt: Date.now(),
    };
    setWords((prev) => [newWord, ...prev]);
    setSelectedIds((prev) => [id, ...prev]);
    awardXp(10, { totalWordsAdded: progress.totalWordsAdded + 1 });
    return id;
  };

  const handleUpdateWord = (wordId: string, updates: Partial<VocabWord>) => {
    setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, ...updates } : w)));
  };

  const handleDeleteWord = (wordId: string) => {
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    setSelectedIds((prev) => prev.filter((id) => id !== wordId));
  };

  // Selection handlers
  const handleToggleSelect = (wordId: string) => {
    setSelectedIds((prev) =>
      prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]
    );
  };

  const handleSelectAllVisible = (visibleIds: string[]) => {
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Launch Flashcards or Smart Quiz
  const getPlayableSelectedWords = () => {
    return words.filter(
      (w) => selectedIds.includes(w.id) && (w.english.trim() || w.vietnamese.trim())
    );
  };

  const handleLaunchFlashcards = () => {
    const chosen = getPlayableSelectedWords();
    if (chosen.length === 0) return;
    setStudyWords(chosen);
    setActiveView('flashcards');
  };

  const handleLaunchQuiz = (customWords?: VocabWord[]) => {
    const chosen = customWords && customWords.length > 0 ? customWords : getPlayableSelectedWords();
    if (chosen.length === 0) return;
    setStudyWords(chosen);
    setActiveView('quiz');
  };

  const handleImportBackup = (payload: VocabBackupPayload) => {
    setFolders(payload.folders);
    setWords(payload.words);
    setProgress(payload.progress);
    setReminders(payload.reminders);
    setActiveFolderId(payload.folders[0]?.id || 'all');
    setSelectedIds([]);
  };

  const handleResetSampleData = () => {
    setFolders(INITIAL_FOLDERS);
    setWords(INITIAL_WORDS);
    setProgress(INITIAL_PROGRESS);
    setReminders(INITIAL_REMINDER_SETTINGS);
    setActiveFolderId(INITIAL_FOLDERS[0].id);
    setSelectedIds([]);
  };

  const masteredCount = words.filter((w) => w.mastered).length;
  const { current: rankTier } = getRankForXp(progress.xp);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        activeView={activeView}
        onNavigateNotebook={() => setActiveView('notebook')}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenReminders={() => setIsRemindersOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        progress={progress}
        accent={prefs.accent}
        onToggleAccent={() =>
          setPrefs((p) => ({
            ...p,
            accent: p.accent === 'en-US' ? 'en-GB' : 'en-US',
          }))
        }
        soundMuted={prefs.muted}
        onToggleMute={() => setPrefs((p) => ({ ...p, muted: !p.muted }))}
        reminderEnabled={reminders.enabled}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeView === 'notebook' && (
          <div className="space-y-5">
            {/* Compact Overview Strip */}
            <div className="glass-card rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm text-[#5E556E]">
                <span>
                  Scholar Rank:{' '}
                  <strong className="text-[#2B2438]">
                    {rankTier.badgeEmoji} {rankTier.title}
                  </strong>
                </span>
                <span aria-hidden="true" className="text-[#D5CEF5]">
                  ·
                </span>
                <span className="tabular-nums">
                  Mastered: <strong className="text-[#1F4F4B]">{masteredCount}</strong> / {words.length} words
                </span>
                <span aria-hidden="true" className="text-[#D5CEF5]">
                  ·
                </span>
                <span className="tabular-nums">
                  Today: <strong className="text-[#6F5C96]">{progress.dailyXp} XP</strong>
                </span>
              </div>
              <p className="text-xs font-semibold text-[#6F5C96]">
                Tip: Click any image cell and press Ctrl+V to paste a picture directly
              </p>
            </div>

            {/* Two-Zone Workspace: Folder Sidebar + 7-Column Vocabulary Table */}
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <FolderSidebar
                folders={folders}
                words={words}
                activeFolderId={activeFolderId}
                onSelectFolder={(id) => setActiveFolderId(id)}
                onCreateFolder={handleCreateFolder}
                onUpdateFolder={handleUpdateFolder}
                onDeleteFolder={handleDeleteFolder}
              />

              <VocabTable
                folders={folders}
                activeFolderId={activeFolderId}
                words={words}
                selectedIds={selectedIds}
                accent={prefs.accent}
                onToggleSelect={handleToggleSelect}
                onSelectAllVisible={handleSelectAllVisible}
                onClearSelection={handleClearSelection}
                onAddWord={handleAddWord}
                onUpdateWord={handleUpdateWord}
                onDeleteWord={handleDeleteWord}
                onLaunchFlashcards={handleLaunchFlashcards}
                onLaunchQuiz={() => handleLaunchQuiz()}
              />
            </div>
          </div>
        )}

        {activeView === 'flashcards' && (
          <FlashcardMode
            words={studyWords}
            accent={prefs.accent}
            soundMuted={prefs.muted}
            onMarkMastered={(wordId, mastered) =>
              handleUpdateWord(wordId, { mastered, lastReviewedAt: Date.now() })
            }
            onCardReviewed={(xp) => awardXp(xp)}
            onDeckCompleted={(bonusXp) =>
              awardXp(bonusXp, {
                totalFlashcardsCompleted: progress.totalFlashcardsCompleted + 1,
              })
            }
            onStartQuizWithWords={(w) => handleLaunchQuiz(w)}
            onExit={() => setActiveView('notebook')}
          />
        )}

        {activeView === 'quiz' && (
          <SmartQuizMode
            selectedWords={studyWords}
            allWordsPool={words}
            accent={prefs.accent}
            soundMuted={prefs.muted}
            onQuestionAnswered={(isCorrect, xpEarned) => {
              if (isCorrect) {
                awardXp(xpEarned, {
                  totalCorrectAnswers: progress.totalCorrectAnswers + 1,
                });
              }
            }}
            onQuizCompleted={(bonusXp) =>
              awardXp(bonusXp, {
                totalQuizzesCompleted: progress.totalQuizzesCompleted + 1,
              })
            }
            onExit={() => setActiveView('notebook')}
          />
        )}
      </main>

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        progress={progress}
        onUpdateStudentName={(name) =>
          setProgress((prev) => ({ ...prev, studentName: name }))
        }
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <EmailReminderModal
        isOpen={isRemindersOpen}
        settings={reminders}
        folders={folders}
        words={words}
        progress={progress}
        onUpdateSettings={(updates) =>
          setReminders((prev) => ({ ...prev, ...updates }))
        }
        onClose={() => setIsRemindersOpen(false)}
      />

      <BackupModal
        isOpen={isBackupOpen}
        folders={folders}
        words={words}
        progress={progress}
        reminders={reminders}
        onImportBackup={handleImportBackup}
        onResetSampleData={handleResetSampleData}
        onClose={() => setIsBackupOpen(false)}
      />
    </div>
  );
}

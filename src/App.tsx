/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { Cloud, LogIn, X } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
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
import { auth, googleProvider } from './firebase';
import type {
  FolderColor,
  ReminderSettings,
  TopicFolder,
  UserProgress,
  VocabWord,
} from './types/vocab';
import {
  createCloudFolder,
  createCloudWord,
  deleteCloudFolderAndWords,
  deleteCloudWord,
  ensureCloudUserInitialized,
  replaceCloudBackup,
  sanitizeId,
  subscribeToCloudUserData,
  updateCloudFolder,
  updateCloudReminders,
  updateCloudUserPrefs,
  updateCloudUserProgress,
  updateCloudWord,
} from './utils/cloudSync';

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

  // Firebase Auth & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hideSyncBanner, setHideSyncBanner] = useState(false);

  const [activeFolderId, setActiveFolderId] = useState<string>(
    () => folders[0]?.id || 'all'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('notebook');
  const [studyWords, setStudyWords] = useState<VocabWord[]>([]);

  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Keep latest state in refs for initial cloud migration on sign-in
  const latestLocalRef = useRef({ folders, words, progress, reminders, prefs });
  latestLocalRef.current = { folders, words, progress, reminders, prefs };

  // Debounce timers for inline word edits
  const wordDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingWordPatchRef = useRef<Record<string, Partial<VocabWord>>>({});

  // Persist to localStorage as offline cache / guest storage
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

  // Listen to Firebase Auth state & attach Firestore listeners when authenticated
  useEffect(() => {
    let unsubCloud: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubCloud) {
        unsubCloud();
        unsubCloud = null;
      }

      setCurrentUser(user);
      setSyncError(null);

      if (!user) {
        setIsSyncing(false);
        return;
      }

      setIsSyncing(true);
      try {
        const snapshot = latestLocalRef.current;
        await ensureCloudUserInitialized(user, {
          folders: snapshot.folders,
          words: snapshot.words,
          progress: snapshot.progress,
          reminders: snapshot.reminders,
          accent: snapshot.prefs.accent,
          soundMuted: snapshot.prefs.muted,
        });

        unsubCloud = subscribeToCloudUserData(user.uid, {
          onProfile: (bundle) => {
            setProgress(bundle.progress);
            setReminders((prev) => ({
              ...prev,
              ...bundle.reminders,
            }));
            setPrefs({ accent: bundle.accent, muted: bundle.soundMuted });
            setIsSyncing(false);
          },
          onFolders: (cloudFolders) => {
            setFolders(cloudFolders);
            setActiveFolderId((curr) =>
              curr === 'all' || cloudFolders.some((f) => f.id === curr)
                ? curr
                : cloudFolders[0]?.id || 'all'
            );
          },
          onWords: (cloudWords) => {
            setWords(cloudWords);
          },
          onError: (err) => {
            setSyncError(err.message);
            setIsSyncing(false);
          },
        });
      } catch (err) {
        setSyncError(
          err instanceof Error ? err.message : 'Unable to sync with cloud storage.'
        );
        setIsSyncing(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubCloud) unsubCloud();
    };
  }, []);

  const handleSignInWithGoogle = async () => {
    setSyncError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.';
      setSyncError(message);
    }
  };

  const handleSignOut = async () => {
    setSyncError(null);
    await signOut(auth);
  };

  const awardXp = useCallback(
    (amount: number, extra?: Partial<UserProgress>) => {
      const today = getTodayIsoDate();
      setProgress((prev) => {
        const sameDay = prev.todayDate === today;
        const nextProgress: UserProgress = {
          ...prev,
          ...extra,
          xp: prev.xp + amount,
          dailyXp: (sameDay ? prev.dailyXp : 0) + amount,
          todayDate: today,
          lastActiveDate: today,
        };
        if (currentUser) {
          updateCloudUserProgress(currentUser.uid, nextProgress).catch((err) =>
            setSyncError(err instanceof Error ? err.message : String(err))
          );
        }
        return nextProgress;
      });
    },
    [currentUser]
  );

  // Folder handlers
  const handleCreateFolder = (name: string, description: string, color: FolderColor) => {
    const newFolder: TopicFolder = {
      id: sanitizeId(`folder-${Date.now()}`, 'folder'),
      name,
      description,
      color,
      createdAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
    setActiveFolderId(newFolder.id);
    if (currentUser) {
      createCloudFolder(currentUser.uid, newFolder).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
  };

  const handleUpdateFolder = (
    id: string,
    updates: Partial<Pick<TopicFolder, 'name' | 'description' | 'color'>>
  ) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    if (currentUser) {
      updateCloudFolder(currentUser.uid, id, updates).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
  };

  const handleDeleteFolder = (id: string) => {
    const remainingFolders = folders.filter((f) => f.id !== id);
    const removedWordIds = words.filter((w) => w.folderId === id).map((w) => w.id);
    const removedSet = new Set(removedWordIds);
    setFolders(remainingFolders);
    setWords((prev) => prev.filter((w) => w.folderId !== id));
    setSelectedIds((prev) => prev.filter((wid) => !removedSet.has(wid)));
    if (activeFolderId === id) {
      setActiveFolderId(remainingFolders[0]?.id || 'all');
    }
    if (currentUser) {
      deleteCloudFolderAndWords(currentUser.uid, id, removedWordIds).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
  };

  // Word handlers
  const handleAddWord = (folderId: string): string => {
    const id = sanitizeId(`word-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, 'word');
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
    if (currentUser) {
      createCloudWord(currentUser.uid, newWord).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
    awardXp(10, { totalWordsAdded: progress.totalWordsAdded + 1 });
    return id;
  };

  const handleUpdateWord = (wordId: string, updates: Partial<VocabWord>) => {
    setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, ...updates } : w)));

    if (currentUser) {
      const uid = currentUser.uid;
      pendingWordPatchRef.current[wordId] = {
        ...(pendingWordPatchRef.current[wordId] || {}),
        ...updates,
      };
      if (wordDebounceRef.current[wordId]) {
        clearTimeout(wordDebounceRef.current[wordId]);
      }
      wordDebounceRef.current[wordId] = setTimeout(() => {
        const merged = pendingWordPatchRef.current[wordId];
        delete pendingWordPatchRef.current[wordId];
        delete wordDebounceRef.current[wordId];
        if (merged) {
          updateCloudWord(uid, wordId, merged).catch((err) =>
            setSyncError(err instanceof Error ? err.message : String(err))
          );
        }
      }, 450);
    }
  };

  const handleDeleteWord = (wordId: string) => {
    if (wordDebounceRef.current[wordId]) {
      clearTimeout(wordDebounceRef.current[wordId]);
      delete wordDebounceRef.current[wordId];
      delete pendingWordPatchRef.current[wordId];
    }
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    setSelectedIds((prev) => prev.filter((id) => id !== wordId));
    if (currentUser) {
      deleteCloudWord(currentUser.uid, wordId).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
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
    const prevFolderIds = folders.map((f) => f.id);
    const prevWordIds = words.map((w) => w.id);
    setFolders(payload.folders);
    setWords(payload.words);
    setProgress(payload.progress);
    setReminders(payload.reminders);
    setActiveFolderId(payload.folders[0]?.id || 'all');
    setSelectedIds([]);
    if (currentUser) {
      replaceCloudBackup(
        currentUser.uid,
        currentUser.email || '',
        {
          progress: payload.progress,
          reminders: payload.reminders,
          accent: prefs.accent,
          soundMuted: prefs.muted,
        },
        payload.folders,
        payload.words,
        prevFolderIds,
        prevWordIds
      ).catch((err) => setSyncError(err instanceof Error ? err.message : String(err)));
    }
  };

  const handleResetSampleData = () => {
    const prevFolderIds = folders.map((f) => f.id);
    const prevWordIds = words.map((w) => w.id);
    setFolders(INITIAL_FOLDERS);
    setWords(INITIAL_WORDS);
    setProgress(INITIAL_PROGRESS);
    setReminders(INITIAL_REMINDER_SETTINGS);
    setActiveFolderId(INITIAL_FOLDERS[0].id);
    setSelectedIds([]);
    if (currentUser) {
      replaceCloudBackup(
        currentUser.uid,
        currentUser.email || '',
        {
          progress: INITIAL_PROGRESS,
          reminders: INITIAL_REMINDER_SETTINGS,
          accent: prefs.accent,
          soundMuted: prefs.muted,
        },
        INITIAL_FOLDERS,
        INITIAL_WORDS,
        prevFolderIds,
        prevWordIds
      ).catch((err) => setSyncError(err instanceof Error ? err.message : String(err)));
    }
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
        onOpenAuth={() => setIsAuthOpen(true)}
        user={currentUser}
        isSyncing={isSyncing}
        progress={progress}
        accent={prefs.accent}
        onToggleAccent={() => {
          const nextAccent = prefs.accent === 'en-US' ? 'en-GB' : 'en-US';
          setPrefs((p) => ({ ...p, accent: nextAccent }));
          if (currentUser) {
            updateCloudUserPrefs(currentUser.uid, nextAccent, prefs.muted).catch(() => {});
          }
        }}
        soundMuted={prefs.muted}
        onToggleMute={() => {
          const nextMuted = !prefs.muted;
          setPrefs((p) => ({ ...p, muted: nextMuted }));
          if (currentUser) {
            updateCloudUserPrefs(currentUser.uid, prefs.accent, nextMuted).catch(() => {});
          }
        }}
        reminderEnabled={reminders.enabled}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeView === 'notebook' && (
          <div className="space-y-4">
            {/* Cloud Sync Prompt Banner (when not signed in) */}
            {!currentUser && !hideSyncBanner && (
              <div className="rounded-2xl px-5 py-3 bg-gradient-to-r from-[#E6E6FA]/85 via-[#FFE4E1]/70 to-[#E0F2F1]/85 border border-[#B9AEE8] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-[#2B2438]">
                  <Cloud className="w-4 h-4 text-[#4D3B73] shrink-0" />
                  <span>
                    <strong>Đồng bộ đa thiết bị:</strong> Đăng nhập Google để lưu toàn bộ từ vựng lên cloud và mở học trên mọi điện thoại, máy tính bảng hoặc laptop.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSignInWithGoogle}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6F5C96] text-white text-xs font-bold hover:bg-[#5E4C84] cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideSyncBanner(true)}
                    aria-label="Dismiss sync notice"
                    className="p-1.5 rounded-lg text-[#5E556E] hover:bg-white/60 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

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
                {currentUser && (
                  <>
                    <span aria-hidden="true" className="text-[#D5CEF5]">
                      ·
                    </span>
                    <span className="text-[#1F4F4B] font-semibold">
                      Cloud Synced ({currentUser.email})
                    </span>
                  </>
                )}
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

      <AuthModal
        isOpen={isAuthOpen}
        user={currentUser}
        isSyncing={isSyncing}
        syncError={syncError}
        wordCount={words.length}
        folderCount={folders.length}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignOut={handleSignOut}
        onClose={() => setIsAuthOpen(false)}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        progress={progress}
        onUpdateStudentName={(name) => {
          const updated = { ...progress, studentName: name };
          setProgress(updated);
          if (currentUser) {
            updateCloudUserProgress(currentUser.uid, updated).catch(() => {});
          }
        }}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <EmailReminderModal
        isOpen={isRemindersOpen}
        settings={reminders}
        folders={folders}
        words={words}
        progress={progress}
        onUpdateSettings={(updates) => {
          const next = { ...reminders, ...updates };
          setReminders(next);
          if (currentUser) {
            updateCloudReminders(currentUser.uid, next).catch(() => {});
          }
        }}
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

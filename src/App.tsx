/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { Cloud, Languages, LogIn, X } from 'lucide-react';
import type { VocabBackupPayload } from './components/BackupModal';
import { FolderSidebar } from './components/FolderSidebar';
import { Header, type ActiveView } from './components/Header';
import { VocabTable } from './components/VocabTable';

const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const BackupModal = lazy(() =>
  import('./components/BackupModal').then((m) => ({ default: m.BackupModal }))
);
const EmailReminderModal = lazy(() =>
  import('./components/EmailReminderModal').then((m) => ({ default: m.EmailReminderModal }))
);
const FlashcardMode = lazy(() =>
  import('./components/FlashcardMode').then((m) => ({ default: m.FlashcardMode }))
);
const LeaderboardModal = lazy(() =>
  import('./components/LeaderboardModal').then((m) => ({ default: m.LeaderboardModal }))
);
const SmartQuizMode = lazy(() =>
  import('./components/SmartQuizMode').then((m) => ({ default: m.SmartQuizMode }))
);
import {
  CHINESE_INITIAL_FOLDERS,
  CHINESE_INITIAL_WORDS,
  getRankForXp,
  getTodayIsoDate,
  INITIAL_FOLDERS,
  INITIAL_PROGRESS,
  INITIAL_REMINDER_SETTINGS,
  INITIAL_WORDS,
} from './data/seedData';
import { auth, googleProvider } from './firebase';
import type {
  ChineseAccent,
  EnglishAccent,
  FolderColor,
  ReminderSettings,
  SpeechAccent,
  StudyLanguage,
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
  seedLanguagePackInCloud,
  subscribeToCloudUserData,
  updateCloudFolder,
  updateCloudReminders,
  updateCloudUserPrefs,
  updateCloudUserProgress,
  updateCloudWord,
  upgradeFolderHierarchyInCloud,
} from './utils/cloudSync';

const STORAGE_KEYS = {
  folders: 'ms_thuy_vocab_folders_v1',
  words: 'ms_thuy_vocab_words_v1',
  progress: 'ms_thuy_vocab_progress_v1',
  reminders: 'ms_thuy_vocab_reminders_v1',
  prefs: 'ms_thuy_vocab_prefs_v1',
};

interface StoredPrefs {
  accent: EnglishAccent;
  zhAccent: ChineseAccent;
  learningLang: StudyLanguage;
  muted: boolean;
}

const DEFAULT_PREFS: StoredPrefs = {
  accent: 'en-US',
  zhAccent: 'zh-CN',
  learningLang: 'en',
  muted: false,
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

const STARTER_SUBFOLDER_PARENT_MAP: Record<string, string> = {
  'folder-ielts-env': 'parent-en-academic',
  'folder-business': 'parent-en-academic',
  'folder-daily-conv': 'parent-en-life',
  'folder-unit1-family': 'parent-en-life',
  'folder-zh-hsk1': 'parent-zh-hsk',
  'folder-zh-work': 'parent-zh-hsk',
  'folder-zh-family': 'parent-zh-life',
  'folder-zh-travel': 'parent-zh-life',
};

const ALL_STARTER_PARENTS: TopicFolder[] = [
  ...INITIAL_FOLDERS,
  ...CHINESE_INITIAL_FOLDERS,
].filter((f) => f.isParent);

function computeHierarchyUpgrade(foldersList: TopicFolder[]): {
  nextFolders: TopicFolder[];
  newParents: TopicFolder[];
  patches: { folderId: string; parentId: string }[];
} {
  const existingIds = new Set(foldersList.map((f) => f.id));
  const hasAnyParentInLang: Record<StudyLanguage, boolean> = {
    en: foldersList.some((f) => (f.language || 'en') === 'en' && Boolean(f.isParent)),
    zh: foldersList.some((f) => (f.language || 'en') === 'zh' && Boolean(f.isParent)),
  };

  const newParents: TopicFolder[] = [];
  for (const parentTpl of ALL_STARTER_PARENTS) {
    const lang = parentTpl.language || 'en';
    if (hasAnyParentInLang[lang] || existingIds.has(parentTpl.id)) continue;
    const hasStarterChild = foldersList.some(
      (f) => STARTER_SUBFOLDER_PARENT_MAP[f.id] === parentTpl.id && !f.isParent && !f.parentId
    );
    if (hasStarterChild) {
      newParents.push(parentTpl);
      existingIds.add(parentTpl.id);
    }
  }

  const patches: { folderId: string; parentId: string }[] = [];
  const updatedExisting = foldersList.map((f) => {
    const expectedParent = STARTER_SUBFOLDER_PARENT_MAP[f.id];
    const lang = f.language || 'en';
    if (
      expectedParent &&
      !f.isParent &&
      !f.parentId &&
      !hasAnyParentInLang[lang] &&
      existingIds.has(expectedParent)
    ) {
      patches.push({ folderId: f.id, parentId: expectedParent });
      return { ...f, isParent: false, parentId: expectedParent };
    }
    return f;
  });

  if (newParents.length === 0 && patches.length === 0) {
    return { nextFolders: foldersList, newParents: [], patches: [] };
  }

  return {
    nextFolders: [...newParents, ...updatedExisting],
    newParents,
    patches,
  };
}

function getDefaultFolderIdForLang(foldersList: TopicFolder[], lang: StudyLanguage): string {
  const langFolders = foldersList.filter((f) => (f.language || 'en') === lang);
  const firstParent = langFolders.find((f) => f.isParent);
  if (firstParent) {
    const firstChild = langFolders.find((f) => !f.isParent && f.parentId === firstParent.id);
    if (firstChild) return firstChild.id;
  }
  const anySubfolder = langFolders.find((f) => !f.isParent);
  if (anySubfolder) return anySubfolder.id;
  return langFolders[0]?.id || 'all';
}

export default function App() {
  const [folders, setFolders] = useState<TopicFolder[]>(() => {
    const saved = readStorage<TopicFolder[]>(STORAGE_KEYS.folders, [
      ...INITIAL_FOLDERS,
      ...CHINESE_INITIAL_FOLDERS,
    ]);
    // Ensure Chinese starter folders exist for returning local users upgrading from v1
    const withZh = saved.some((f) => f.language === 'zh')
      ? saved
      : [...saved, ...CHINESE_INITIAL_FOLDERS];
    return computeHierarchyUpgrade(withZh).nextFolders;
  });

  const [words, setWords] = useState<VocabWord[]>(() => {
    const saved = readStorage<VocabWord[]>(STORAGE_KEYS.words, [
      ...INITIAL_WORDS,
      ...CHINESE_INITIAL_WORDS,
    ]);
    if (!saved.some((w) => w.language === 'zh')) {
      return [...saved, ...CHINESE_INITIAL_WORDS];
    }
    return saved;
  });

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

  const [prefs, setPrefs] = useState<StoredPrefs>(() => {
    const saved = readStorage<Partial<StoredPrefs>>(STORAGE_KEYS.prefs, DEFAULT_PREFS);
    return {
      accent: saved.accent === 'en-GB' ? 'en-GB' : 'en-US',
      zhAccent: saved.zhAccent === 'zh-TW' ? 'zh-TW' : 'zh-CN',
      learningLang: saved.learningLang === 'zh' ? 'zh' : 'en',
      muted: Boolean(saved.muted),
    };
  });

  // Firebase Auth & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hideSyncBanner, setHideSyncBanner] = useState(false);

  const [activeFolderId, setActiveFolderId] = useState<string>(() =>
    getDefaultFolderIdForLang(folders, prefs.learningLang)
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('notebook');
  const [studyWords, setStudyWords] = useState<VocabWord[]>([]);

  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const latestLocalRef = useRef({ folders, words, progress, reminders, prefs });
  latestLocalRef.current = { folders, words, progress, reminders, prefs };

  const wordDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingWordPatchRef = useRef<Record<string, Partial<VocabWord>>>({});
  const seededZhCloudForUidRef = useRef<string | null>(null);
  const migratedHierarchyForUidRef = useRef<string | null>(null);

  // Debounced persistence to localStorage so typing/scrolling stays fast on mobile
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(folders));
      } catch {
        // Storage quota guard
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [folders]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(words));
      } catch {
        // Storage quota guard
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [words]);

  useEffect(() => {
    const flushLocal = () => {
      try {
        localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(latestLocalRef.current.folders));
        localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(latestLocalRef.current.words));
      } catch {
        // Storage quota guard
      }
    };
    window.addEventListener('pagehide', flushLocal);
    return () => window.removeEventListener('pagehide', flushLocal);
  }, []);

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
      seededZhCloudForUidRef.current = null;
      migratedHierarchyForUidRef.current = null;

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
          zhAccent: snapshot.prefs.zhAccent,
          learningLang: snapshot.prefs.learningLang,
          soundMuted: snapshot.prefs.muted,
        });

        unsubCloud = subscribeToCloudUserData(user.uid, {
          onProfile: (bundle) => {
            setProgress(bundle.progress);
            setReminders((prev) => ({
              ...prev,
              ...bundle.reminders,
            }));
            setPrefs({
              accent: bundle.accent,
              zhAccent: bundle.zhAccent,
              learningLang: bundle.learningLang,
              muted: bundle.soundMuted,
            });
            setIsSyncing(false);
          },
          onFolders: (cloudFolders) => {
            setFolders(cloudFolders);
            // If an existing cloud user has no Chinese folders yet, auto-seed Chinese starter pack once
            if (
              !cloudFolders.some((f) => f.language === 'zh') &&
              seededZhCloudForUidRef.current !== user.uid
            ) {
              seededZhCloudForUidRef.current = user.uid;
              seedLanguagePackInCloud(
                user.uid,
                CHINESE_INITIAL_FOLDERS,
                CHINESE_INITIAL_WORDS
              ).catch(() => {});
            }
            // Upgrade flat starter folders into 2-level Parent -> Subfolder hierarchy once per account
            const { newParents, patches } = computeHierarchyUpgrade(cloudFolders);
            if (
              (newParents.length > 0 || patches.length > 0) &&
              migratedHierarchyForUidRef.current !== user.uid
            ) {
              migratedHierarchyForUidRef.current = user.uid;
              upgradeFolderHierarchyInCloud(user.uid, newParents, patches).catch(() => {});
            }
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

  // Ensure activeFolderId always matches a folder in the current study language (or 'all')
  const languageFolders = useMemo(
    () => folders.filter((f) => (f.language || 'en') === prefs.learningLang),
    [folders, prefs.learningLang]
  );
  const languageWords = useMemo(
    () => words.filter((w) => (w.language || 'en') === prefs.learningLang),
    [words, prefs.learningLang]
  );

  useEffect(() => {
    if (
      activeFolderId !== 'all' &&
      !languageFolders.some((f) => f.id === activeFolderId)
    ) {
      setActiveFolderId(getDefaultFolderIdForLang(folders, prefs.learningLang));
    }
  }, [activeFolderId, languageFolders, folders, prefs.learningLang]);

  const activeSpeechAccent: SpeechAccent =
    prefs.learningLang === 'zh' ? prefs.zhAccent : prefs.accent;

  const handleSwitchLanguage = (nextLang: StudyLanguage) => {
    if (nextLang === prefs.learningLang) return;
    const nextPrefs: StoredPrefs = { ...prefs, learningLang: nextLang };
    setPrefs(nextPrefs);
    setSelectedIds([]);
    setActiveFolderId(getDefaultFolderIdForLang(folders, nextLang));
    setActiveView('notebook');

    if (currentUser) {
      updateCloudUserPrefs(currentUser.uid, {
        accent: nextPrefs.accent,
        zhAccent: nextPrefs.zhAccent,
        learningLang: nextPrefs.learningLang,
        soundMuted: nextPrefs.muted,
      }).catch(() => {});
    }
  };

  const handleSignInWithGoogle = async () => {
    setSyncError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthOpen(false);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      const rawMessage =
        err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.';

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setSyncError('Bạn đã đóng cửa sổ đăng nhập Google. Vui lòng thử lại.');
      } else if (code === 'auth/popup-blocked') {
        setSyncError(
          'auth/popup-blocked: Trình duyệt đang chặn cửa sổ bật lên (pop-up). Hãy cho phép pop-up hoặc mở ứng dụng ở tab mới để đăng nhập.'
        );
      } else if (code === 'auth/unauthorized-domain' || rawMessage.includes('auth/unauthorized-domain')) {
        setSyncError(
          `auth/unauthorized-domain: Tên miền hiện tại (${window.location.hostname}) chưa được cấp quyền đăng nhập trên Firebase.`
        );
      } else {
        setSyncError(rawMessage);
      }
      setIsAuthOpen(true);
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
  const handleCreateFolder = useCallback(
    (
      name: string,
      description: string,
      color: FolderColor,
      options?: { isParent?: boolean; parentId?: string }
    ) => {
      const isParent = Boolean(options?.isParent);
      const newFolder: TopicFolder = {
        id: sanitizeId(`folder-${prefs.learningLang}-${Date.now()}`, 'folder'),
        name,
        description,
        color,
        language: prefs.learningLang,
        isParent,
        ...(isParent ? {} : { parentId: options?.parentId }),
        createdAt: Date.now(),
      };
      setFolders((prev) => [...prev, newFolder]);
      setActiveFolderId(newFolder.id);
      if (currentUser) {
        createCloudFolder(currentUser.uid, newFolder).catch((err) =>
          setSyncError(err instanceof Error ? err.message : String(err))
        );
      }
    },
    [prefs.learningLang, currentUser]
  );

  const handleUpdateFolder = useCallback(
    (
      id: string,
      updates: Partial<Pick<TopicFolder, 'name' | 'description' | 'color' | 'parentId'>>
    ) => {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
      if (currentUser) {
        updateCloudFolder(currentUser.uid, id, updates).catch((err) =>
          setSyncError(err instanceof Error ? err.message : String(err))
        );
      }
    },
    [currentUser]
  );

  const handleDeleteFolder = useCallback(
    (id: string) => {
      const currentFolders = latestLocalRef.current.folders;
      const currentWords = latestLocalRef.current.words;
      const target = currentFolders.find((f) => f.id === id);
      const childIds = target?.isParent
        ? currentFolders.filter((f) => f.parentId === id).map((f) => f.id)
        : [];
      const idsToDelete = [id, ...childIds];
      const deleteFolderSet = new Set(idsToDelete);

      const remainingFolders = currentFolders.filter((f) => !deleteFolderSet.has(f.id));
      const removedWordIds = currentWords
        .filter((w) => deleteFolderSet.has(w.folderId))
        .map((w) => w.id);
      const removedSet = new Set(removedWordIds);
      setFolders(remainingFolders);
      setWords((prev) => prev.filter((w) => !deleteFolderSet.has(w.folderId)));
      setSelectedIds((prev) => prev.filter((wid) => !removedSet.has(wid)));
      setActiveFolderId((prevActive) => {
        if (!deleteFolderSet.has(prevActive)) return prevActive;
        return getDefaultFolderIdForLang(remainingFolders, prefs.learningLang);
      });
      if (currentUser) {
        deleteCloudFolderAndWords(currentUser.uid, idsToDelete, removedWordIds).catch((err) =>
          setSyncError(err instanceof Error ? err.message : String(err))
        );
      }
    },
    [prefs.learningLang, currentUser]
  );

  // Word handlers
  const handleAddWord = useCallback(
    (folderId: string): string => {
      const targetFolder = latestLocalRef.current.folders.find((f) => f.id === folderId);
      if (targetFolder?.isParent) return '';
      const id = sanitizeId(
        `word-${prefs.learningLang}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        'word'
      );
      const newWord: VocabWord = {
        id,
        folderId,
        language: prefs.learningLang,
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
      awardXp(10, { totalWordsAdded: latestLocalRef.current.progress.totalWordsAdded + 1 });
      return id;
    },
    [prefs.learningLang, currentUser, awardXp]
  );

  const handleUpdateWord = useCallback(
    (wordId: string, updates: Partial<VocabWord>) => {
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
    },
    [currentUser]
  );

  const handleDeleteWord = useCallback(
    (wordId: string) => {
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
    },
    [currentUser]
  );

  const handleToggleSelect = useCallback((wordId: string) => {
    setSelectedIds((prev) =>
      prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]
    );
  }, []);

  const handleSelectAllVisible = useCallback((visibleIds: string[]) => {
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const getPlayableSelectedWords = useCallback(() => {
    return languageWords.filter(
      (w) => selectedIds.includes(w.id) && (w.english.trim() || w.vietnamese.trim())
    );
  }, [languageWords, selectedIds]);

  const handleLaunchFlashcards = useCallback(() => {
    const chosen = getPlayableSelectedWords();
    if (chosen.length === 0) return;
    setStudyWords(chosen);
    setActiveView('flashcards');
  }, [getPlayableSelectedWords]);

  const handleLaunchQuiz = useCallback(
    (customWords?: VocabWord[]) => {
      const chosen =
        Array.isArray(customWords) && customWords.length > 0
          ? customWords
          : getPlayableSelectedWords();
      if (chosen.length === 0) return;
      setStudyWords(chosen);
      setActiveView('quiz');
    },
    [getPlayableSelectedWords]
  );

  const handleLaunchSelectedQuiz = useCallback(() => {
    handleLaunchQuiz();
  }, [handleLaunchQuiz]);

  const handleImportBackup = (payload: VocabBackupPayload) => {
    const prevFolderIds = folders.map((f) => f.id);
    const prevWordIds = words.map((w) => w.id);
    const upgradedFolders = computeHierarchyUpgrade(payload.folders).nextFolders;
    setFolders(upgradedFolders);
    setWords(payload.words);
    setProgress(payload.progress);
    setReminders(payload.reminders);
    setActiveFolderId(getDefaultFolderIdForLang(upgradedFolders, prefs.learningLang));
    setSelectedIds([]);
    if (currentUser) {
      replaceCloudBackup(
        currentUser.uid,
        currentUser.email || '',
        {
          progress: payload.progress,
          reminders: payload.reminders,
          accent: prefs.accent,
          zhAccent: prefs.zhAccent,
          learningLang: prefs.learningLang,
          soundMuted: prefs.muted,
        },
        upgradedFolders,
        payload.words,
        prevFolderIds,
        prevWordIds
      ).catch((err) => setSyncError(err instanceof Error ? err.message : String(err)));
    }
  };

  const handleResetSampleData = () => {
    const prevFolderIds = folders.map((f) => f.id);
    const prevWordIds = words.map((w) => w.id);
    const defaultFolders = [...INITIAL_FOLDERS, ...CHINESE_INITIAL_FOLDERS];
    const defaultWords = [...INITIAL_WORDS, ...CHINESE_INITIAL_WORDS];
    setFolders(defaultFolders);
    setWords(defaultWords);
    setProgress(INITIAL_PROGRESS);
    setReminders(INITIAL_REMINDER_SETTINGS);
    setActiveFolderId(getDefaultFolderIdForLang(defaultFolders, prefs.learningLang));
    setSelectedIds([]);
    if (currentUser) {
      replaceCloudBackup(
        currentUser.uid,
        currentUser.email || '',
        {
          progress: INITIAL_PROGRESS,
          reminders: INITIAL_REMINDER_SETTINGS,
          accent: prefs.accent,
          zhAccent: prefs.zhAccent,
          learningLang: prefs.learningLang,
          soundMuted: prefs.muted,
        },
        defaultFolders,
        defaultWords,
        prevFolderIds,
        prevWordIds
      ).catch((err) => setSyncError(err instanceof Error ? err.message : String(err)));
    }
  };

  const masteredCount = useMemo(
    () => languageWords.filter((w) => w.mastered).length,
    [languageWords]
  );
  const rankTier = useMemo(() => getRankForXp(progress.xp).current, [progress.xp]);

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
        learningLang={prefs.learningLang}
        speechAccent={activeSpeechAccent}
        onToggleAccent={() => {
          const nextPrefs: StoredPrefs =
            prefs.learningLang === 'zh'
              ? { ...prefs, zhAccent: prefs.zhAccent === 'zh-CN' ? 'zh-TW' : 'zh-CN' }
              : { ...prefs, accent: prefs.accent === 'en-US' ? 'en-GB' : 'en-US' };
          setPrefs(nextPrefs);
          if (currentUser) {
            updateCloudUserPrefs(currentUser.uid, {
              accent: nextPrefs.accent,
              zhAccent: nextPrefs.zhAccent,
              learningLang: nextPrefs.learningLang,
              soundMuted: nextPrefs.muted,
            }).catch(() => {});
          }
        }}
        soundMuted={prefs.muted}
        onToggleMute={() => {
          const nextMuted = !prefs.muted;
          const nextPrefs: StoredPrefs = { ...prefs, muted: nextMuted };
          setPrefs(nextPrefs);
          if (currentUser) {
            updateCloudUserPrefs(currentUser.uid, {
              accent: nextPrefs.accent,
              zhAccent: nextPrefs.zhAccent,
              learningLang: nextPrefs.learningLang,
              soundMuted: nextMuted,
            }).catch(() => {});
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
                    <strong>Đồng bộ đa thiết bị:</strong> Đăng nhập Google để lưu toàn bộ từ vựng Tiếng Anh & Tiếng Trung lên cloud và mở học trên mọi thiết bị.
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

            {/* Overview Strip + Language Track Switcher (English vs Chinese) */}
            <div className="glass-card rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {/* Language Switcher */}
                <div
                  className="inline-flex p-1 rounded-xl bg-[#F3F0FC] border border-[#D5CEF5]"
                  role="group"
                  aria-label="Choose vocabulary language version"
                >
                  <button
                    type="button"
                    onClick={() => handleSwitchLanguage('en')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      prefs.learningLang === 'en'
                        ? 'bg-white text-[#2B2438] shadow-xs'
                        : 'text-[#5E556E] hover:text-[#2B2438]'
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5 text-[#6F5C96]" />
                    <span>English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchLanguage('zh')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      prefs.learningLang === 'zh'
                        ? 'bg-white text-[#2B2438] shadow-xs'
                        : 'text-[#5E556E] hover:text-[#2B2438]'
                    }`}
                  >
                    <span className="text-xs font-bold text-[#B55F78]">中文</span>
                    <span>Tiếng Trung</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-[#5E556E]">
                  <span>
                    Rank:{' '}
                    <strong className="text-[#2B2438]">
                      {rankTier.badgeEmoji} {rankTier.title}
                    </strong>
                  </span>
                  <span aria-hidden="true" className="text-[#D5CEF5]">
                    ·
                  </span>
                  <span className="tabular-nums">
                    Mastered: <strong className="text-[#1F4F4B]">{masteredCount}</strong> /{' '}
                    {languageWords.length} words
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
                        Synced ({currentUser.email})
                      </span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs font-semibold text-[#6F5C96]">
                {prefs.learningLang === 'zh'
                  ? 'Mẹo: Bấm ô hình & nhấn Ctrl+V để dán ảnh trực tiếp'
                  : 'Tip: Click any image cell and press Ctrl+V to paste a picture directly'}
              </p>
            </div>

            {/* Two-Zone Workspace: Folder Sidebar + 7-Column Vocabulary Table */}
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <FolderSidebar
                studyLanguage={prefs.learningLang}
                folders={languageFolders}
                words={languageWords}
                activeFolderId={activeFolderId}
                onSelectFolder={(id) => setActiveFolderId(id)}
                onCreateFolder={handleCreateFolder}
                onUpdateFolder={handleUpdateFolder}
                onDeleteFolder={handleDeleteFolder}
              />

              <VocabTable
                studyLanguage={prefs.learningLang}
                folders={languageFolders}
                activeFolderId={activeFolderId}
                words={languageWords}
                selectedIds={selectedIds}
                speechAccent={activeSpeechAccent}
                onToggleSelect={handleToggleSelect}
                onSelectAllVisible={handleSelectAllVisible}
                onClearSelection={handleClearSelection}
                onAddWord={handleAddWord}
                onUpdateWord={handleUpdateWord}
                onDeleteWord={handleDeleteWord}
                onCreateFolder={handleCreateFolder}
                onUpdateFolder={handleUpdateFolder}
                onDeleteFolder={handleDeleteFolder}
                onLaunchFlashcards={handleLaunchFlashcards}
                onLaunchQuiz={handleLaunchSelectedQuiz}
              />
            </div>
          </div>
        )}

        {activeView === 'flashcards' && (
          <Suspense
            fallback={
              <div className="glass-card rounded-2xl p-10 text-center text-sm font-semibold text-[#5E556E]">
                Đang tải Flashcards...
              </div>
            }
          >
            <FlashcardMode
              words={studyWords}
              studyLanguage={prefs.learningLang}
              speechAccent={activeSpeechAccent}
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
          </Suspense>
        )}

        {activeView === 'quiz' && (
          <Suspense
            fallback={
              <div className="glass-card rounded-2xl p-10 text-center text-sm font-semibold text-[#5E556E]">
                Đang chuẩn bị Smart Quiz...
              </div>
            }
          >
            <SmartQuizMode
              selectedWords={studyWords}
              allWordsPool={languageWords}
              studyLanguage={prefs.learningLang}
              speechAccent={activeSpeechAccent}
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
          </Suspense>
        )}
      </main>

      {isAuthOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {isLeaderboardOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {isRemindersOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {isBackupOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </div>
  );
}

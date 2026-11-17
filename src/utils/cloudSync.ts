import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getTodayIsoDate } from '../data/seedData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  ChineseAccent,
  EnglishAccent,
  FolderColor,
  ReminderSettings,
  StudyLanguage,
  TopicFolder,
  UserProgress,
  VocabWord,
} from '../types/vocab';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const VALID_COLORS: FolderColor[] = ['lavender', 'blush', 'mint', 'cream', 'sky', 'peach'];

export function sanitizeId(raw: string, prefix = 'item'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  if (cleaned.length >= 1 && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${prefix}-${Date.now()}`;
}

function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.slice(0, maxLen);
}

function clampNonNegInt(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.round(val));
}

function sanitizeDateStr(val: unknown): string {
  if (typeof val === 'string' && DATE_REGEX.test(val)) return val;
  return getTodayIsoDate();
}

function sanitizeTimeStr(val: unknown): string {
  if (typeof val === 'string' && TIME_REGEX.test(val)) return val;
  return '20:00';
}

function sanitizeColor(val: unknown): FolderColor {
  if (typeof val === 'string' && VALID_COLORS.includes(val as FolderColor)) {
    return val as FolderColor;
  }
  return 'lavender';
}

function sanitizeLanguage(val: unknown): StudyLanguage {
  return val === 'zh' ? 'zh' : 'en';
}

function sanitizeSynonyms(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, 15)
    .map((s) => s.trim().slice(0, 80));
}

function sanitizeReminderFolderIds(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is string => typeof item === 'string' && VALID_ID_REGEX.test(item))
    .slice(0, 30)
    .map((id) => id.slice(0, 128));
}

export interface CloudUserBundle {
  progress: UserProgress;
  reminders: ReminderSettings;
  accent: EnglishAccent;
  zhAccent: ChineseAccent;
  learningLang: StudyLanguage;
  soundMuted: boolean;
}

export function buildUserProfileDoc(
  uid: string,
  userEmail: string,
  bundle: CloudUserBundle,
  includeCreatedAt: boolean
) {
  const base: Record<string, unknown> = {
    ownerId: sanitizeId(uid, 'user'),
    studentName: clampStr(bundle.progress.studentName.trim() || 'Student', 80, 'Student'),
    email: clampStr(userEmail, 200),
    xp: clampNonNegInt(bundle.progress.xp, 0),
    dailyXp: clampNonNegInt(bundle.progress.dailyXp, 0),
    todayDate: sanitizeDateStr(bundle.progress.todayDate),
    streak: clampNonNegInt(bundle.progress.streak, 1),
    lastActiveDate: sanitizeDateStr(bundle.progress.lastActiveDate),
    totalWordsAdded: clampNonNegInt(bundle.progress.totalWordsAdded, 0),
    totalFlashcardsCompleted: clampNonNegInt(bundle.progress.totalFlashcardsCompleted, 0),
    totalQuizzesCompleted: clampNonNegInt(bundle.progress.totalQuizzesCompleted, 0),
    totalCorrectAnswers: clampNonNegInt(bundle.progress.totalCorrectAnswers, 0),
    accent: bundle.accent === 'en-GB' ? 'en-GB' : 'en-US',
    zhAccent: bundle.zhAccent === 'zh-TW' ? 'zh-TW' : 'zh-CN',
    learningLang: sanitizeLanguage(bundle.learningLang),
    soundMuted: Boolean(bundle.soundMuted),
    reminderEnabled: Boolean(bundle.reminders.enabled),
    reminderEmail: clampStr(bundle.reminders.email || userEmail, 200),
    reminderTime: sanitizeTimeStr(bundle.reminders.time),
    reminderFolderIds: sanitizeReminderFolderIds(bundle.reminders.selectedFolderIds),
    updatedAt: serverTimestamp(),
  };

  if (includeCreatedAt) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export function buildFolderDoc(uid: string, folder: TopicFolder, includeCreatedAt: boolean) {
  const base: Record<string, unknown> = {
    ownerId: sanitizeId(uid, 'user'),
    name: clampStr(folder.name.trim() || 'Untitled Folder', 100, 'Untitled Folder'),
    description: clampStr(folder.description || '', 300),
    color: sanitizeColor(folder.color),
    language: sanitizeLanguage(folder.language),
    updatedAt: serverTimestamp(),
  };
  if (includeCreatedAt) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export function buildWordDoc(uid: string, word: VocabWord, includeCreatedAt: boolean) {
  const base: Record<string, unknown> = {
    ownerId: sanitizeId(uid, 'user'),
    folderId: sanitizeId(word.folderId, 'folder'),
    language: sanitizeLanguage(word.language),
    english: clampStr(word.english || '', 150),
    ipa: clampStr(word.ipa || '', 150),
    vietnamese: clampStr(word.vietnamese || '', 300),
    example: clampStr(word.example || '', 500),
    exampleVi: clampStr(word.exampleVi || '', 500),
    synonyms: sanitizeSynonyms(word.synonyms),
    imageUrl: clampStr(word.imageUrl || '', 300000),
    mastered: Boolean(word.mastered),
    updatedAt: serverTimestamp(),
  };
  if (includeCreatedAt) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export async function ensureCloudUserInitialized(
  user: User,
  localState: {
    folders: TopicFolder[];
    words: VocabWord[];
    progress: UserProgress;
    reminders: ReminderSettings;
    accent: EnglishAccent;
    zhAccent: ChineseAccent;
    learningLang: StudyLanguage;
    soundMuted: boolean;
  }
): Promise<boolean> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (snap.exists()) {
    return false;
  }

  const displayName =
    user.displayName?.trim() ||
    (localState.progress.studentName !== 'You (Class 12A)'
      ? localState.progress.studentName
      : user.email?.split('@')[0] || 'Student');

  const initialBundle: CloudUserBundle = {
    progress: {
      ...localState.progress,
      studentName: displayName,
    },
    reminders: {
      ...localState.reminders,
      email: localState.reminders.email || user.email || '',
    },
    accent: localState.accent,
    zhAccent: localState.zhAccent,
    learningLang: localState.learningLang,
    soundMuted: localState.soundMuted,
  };

  try {
    const batch1 = writeBatch(db);
    batch1.set(userRef, buildUserProfileDoc(user.uid, user.email || '', initialBundle, true));

    const validFolderIdMap = new Map<string, string>();
    for (const folder of localState.folders) {
      const safeFolderId = sanitizeId(folder.id, 'folder');
      validFolderIdMap.set(folder.id, safeFolderId);
      const folderRef = doc(db, 'users', user.uid, 'folders', safeFolderId);
      batch1.set(folderRef, buildFolderDoc(user.uid, { ...folder, id: safeFolderId }, true));
    }

    const firstChunkWords = localState.words.slice(0, 350);
    for (const word of firstChunkWords) {
      const safeWordId = sanitizeId(word.id, 'word');
      const mappedFolderId =
        validFolderIdMap.get(word.folderId) || sanitizeId(word.folderId, 'folder');
      const wordRef = doc(db, 'users', user.uid, 'words', safeWordId);
      batch1.set(
        wordRef,
        buildWordDoc(user.uid, { ...word, id: safeWordId, folderId: mappedFolderId }, true)
      );
    }

    await batch1.commit();

    for (let i = 350; i < localState.words.length; i += 400) {
      const chunk = localState.words.slice(i, i + 400);
      const nextBatch = writeBatch(db);
      for (const word of chunk) {
        const safeWordId = sanitizeId(word.id, 'word');
        const mappedFolderId =
          validFolderIdMap.get(word.folderId) || sanitizeId(word.folderId, 'folder');
        const wordRef = doc(db, 'users', user.uid, 'words', safeWordId);
        nextBatch.set(
          wordRef,
          buildWordDoc(user.uid, { ...word, id: safeWordId, folderId: mappedFolderId }, true)
        );
      }
      await nextBatch.commit();
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function seedLanguagePackInCloud(
  uid: string,
  folders: TopicFolder[],
  words: VocabWord[]
): Promise<void> {
  const path = `users/${uid}/folders`;
  try {
    const batch = writeBatch(db);
    for (const folder of folders) {
      const safeFid = sanitizeId(folder.id, 'folder');
      batch.set(
        doc(db, 'users', uid, 'folders', safeFid),
        buildFolderDoc(uid, { ...folder, id: safeFid }, true)
      );
    }
    for (const word of words.slice(0, 350)) {
      const safeWid = sanitizeId(word.id, 'word');
      const safeFid = sanitizeId(word.folderId, 'folder');
      batch.set(
        doc(db, 'users', uid, 'words', safeWid),
        buildWordDoc(uid, { ...word, id: safeWid, folderId: safeFid }, true)
      );
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToCloudUserData(
  uid: string,
  callbacks: {
    onProfile: (bundle: CloudUserBundle) => void;
    onFolders: (folders: TopicFolder[]) => void;
    onWords: (words: VocabWord[]) => void;
    onError: (err: Error) => void;
  }
): Unsubscribe {
  const userPath = `users/${uid}`;
  const foldersPath = `users/${uid}/folders`;
  const wordsPath = `users/${uid}/words`;

  const unsubProfile = onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const d = snapshot.data();
      const today = getTodayIsoDate();
      const storedToday = typeof d.todayDate === 'string' ? d.todayDate : today;
      const lastActive = typeof d.lastActiveDate === 'string' ? d.lastActiveDate : today;

      let streak = typeof d.streak === 'number' ? d.streak : 1;
      let dailyXp = typeof d.dailyXp === 'number' ? d.dailyXp : 0;
      if (storedToday !== today) {
        const last = new Date(lastActive);
        const now = new Date(today);
        const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        dailyXp = 0;
        streak = diffDays === 1 ? streak + 1 : diffDays === 0 ? streak : 1;
      }

      callbacks.onProfile({
        progress: {
          studentName: typeof d.studentName === 'string' ? d.studentName : 'Student',
          xp: typeof d.xp === 'number' ? d.xp : 0,
          dailyXp,
          todayDate: today,
          streak,
          lastActiveDate: storedToday !== today ? today : lastActive,
          totalWordsAdded: typeof d.totalWordsAdded === 'number' ? d.totalWordsAdded : 0,
          totalFlashcardsCompleted:
            typeof d.totalFlashcardsCompleted === 'number' ? d.totalFlashcardsCompleted : 0,
          totalQuizzesCompleted:
            typeof d.totalQuizzesCompleted === 'number' ? d.totalQuizzesCompleted : 0,
          totalCorrectAnswers:
            typeof d.totalCorrectAnswers === 'number' ? d.totalCorrectAnswers : 0,
        },
        reminders: {
          enabled: Boolean(d.reminderEnabled),
          email: typeof d.reminderEmail === 'string' ? d.reminderEmail : '',
          time: typeof d.reminderTime === 'string' ? d.reminderTime : '20:00',
          selectedFolderIds: Array.isArray(d.reminderFolderIds) ? d.reminderFolderIds : [],
        },
        accent: d.accent === 'en-GB' ? 'en-GB' : 'en-US',
        zhAccent: d.zhAccent === 'zh-TW' ? 'zh-TW' : 'zh-CN',
        learningLang: d.learningLang === 'zh' ? 'zh' : 'en',
        soundMuted: Boolean(d.soundMuted),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const foldersQuery = query(collection(db, 'users', uid, 'folders'), where('ownerId', '==', uid));
  const unsubFolders = onSnapshot(
    foldersQuery,
    (snapshot) => {
      const list: TopicFolder[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const ts = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now();
        return {
          id: docSnap.id,
          name: typeof d.name === 'string' ? d.name : 'Folder',
          description: typeof d.description === 'string' ? d.description : '',
          color: sanitizeColor(d.color),
          language: sanitizeLanguage(d.language),
          createdAt: ts,
        };
      });
      list.sort((a, b) => a.createdAt - b.createdAt);
      callbacks.onFolders(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, foldersPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const wordsQuery = query(collection(db, 'users', uid, 'words'), where('ownerId', '==', uid));
  const unsubWords = onSnapshot(
    wordsQuery,
    (snapshot) => {
      const list: VocabWord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const ts = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now();
        return {
          id: docSnap.id,
          folderId: typeof d.folderId === 'string' ? d.folderId : '',
          language: sanitizeLanguage(d.language),
          english: typeof d.english === 'string' ? d.english : '',
          ipa: typeof d.ipa === 'string' ? d.ipa : '',
          vietnamese: typeof d.vietnamese === 'string' ? d.vietnamese : '',
          example: typeof d.example === 'string' ? d.example : '',
          exampleVi: typeof d.exampleVi === 'string' ? d.exampleVi : '',
          synonyms: Array.isArray(d.synonyms) ? d.synonyms : [],
          imageUrl: typeof d.imageUrl === 'string' && d.imageUrl ? d.imageUrl : undefined,
          mastered: Boolean(d.mastered),
          createdAt: ts,
        };
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      callbacks.onWords(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, wordsPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubProfile();
    unsubFolders();
    unsubWords();
  };
}

export async function createCloudFolder(uid: string, folder: TopicFolder): Promise<void> {
  const safeId = sanitizeId(folder.id, 'folder');
  const path = `users/${uid}/folders/${safeId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'folders', safeId), buildFolderDoc(uid, folder, true));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCloudFolder(
  uid: string,
  folderId: string,
  updates: Partial<Pick<TopicFolder, 'name' | 'description' | 'color'>>
): Promise<void> {
  const safeId = sanitizeId(folderId, 'folder');
  const path = `users/${uid}/folders/${safeId}`;
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) {
    payload.name = clampStr(updates.name.trim() || 'Untitled Folder', 100, 'Untitled Folder');
  }
  if (updates.description !== undefined) {
    payload.description = clampStr(updates.description, 300);
  }
  if (updates.color !== undefined) {
    payload.color = sanitizeColor(updates.color);
  }
  try {
    await updateDoc(doc(db, 'users', uid, 'folders', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudFolderAndWords(
  uid: string,
  folderId: string,
  wordIdsInFolder: string[]
): Promise<void> {
  const safeFolderId = sanitizeId(folderId, 'folder');
  const path = `users/${uid}/folders/${safeFolderId}`;
  try {
    const batch = writeBatch(db);
    for (const wid of wordIdsInFolder.slice(0, 450)) {
      batch.delete(doc(db, 'users', uid, 'words', sanitizeId(wid, 'word')));
    }
    batch.delete(doc(db, 'users', uid, 'folders', safeFolderId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createCloudWord(uid: string, word: VocabWord): Promise<void> {
  const safeId = sanitizeId(word.id, 'word');
  const path = `users/${uid}/words/${safeId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'words', safeId), buildWordDoc(uid, word, true));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCloudWord(
  uid: string,
  wordId: string,
  updates: Partial<VocabWord>
): Promise<void> {
  const safeId = sanitizeId(wordId, 'word');
  const path = `users/${uid}/words/${safeId}`;
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.folderId !== undefined) payload.folderId = sanitizeId(updates.folderId, 'folder');
  if (updates.language !== undefined) payload.language = sanitizeLanguage(updates.language);
  if (updates.english !== undefined) payload.english = clampStr(updates.english, 150);
  if (updates.ipa !== undefined) payload.ipa = clampStr(updates.ipa, 150);
  if (updates.vietnamese !== undefined) payload.vietnamese = clampStr(updates.vietnamese, 300);
  if (updates.example !== undefined) payload.example = clampStr(updates.example, 500);
  if (updates.exampleVi !== undefined) payload.exampleVi = clampStr(updates.exampleVi, 500);
  if (updates.synonyms !== undefined) payload.synonyms = sanitizeSynonyms(updates.synonyms);
  if ('imageUrl' in updates) payload.imageUrl = clampStr(updates.imageUrl || '', 300000);
  if (updates.mastered !== undefined) payload.mastered = Boolean(updates.mastered);

  try {
    await updateDoc(doc(db, 'users', uid, 'words', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudWord(uid: string, wordId: string): Promise<void> {
  const safeId = sanitizeId(wordId, 'word');
  const path = `users/${uid}/words/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'words', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateCloudUserProgress(
  uid: string,
  progress: UserProgress
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      studentName: clampStr(progress.studentName.trim() || 'Student', 80, 'Student'),
      xp: clampNonNegInt(progress.xp, 0),
      dailyXp: clampNonNegInt(progress.dailyXp, 0),
      todayDate: sanitizeDateStr(progress.todayDate),
      streak: clampNonNegInt(progress.streak, 1),
      lastActiveDate: sanitizeDateStr(progress.lastActiveDate),
      totalWordsAdded: clampNonNegInt(progress.totalWordsAdded, 0),
      totalFlashcardsCompleted: clampNonNegInt(progress.totalFlashcardsCompleted, 0),
      totalQuizzesCompleted: clampNonNegInt(progress.totalQuizzesCompleted, 0),
      totalCorrectAnswers: clampNonNegInt(progress.totalCorrectAnswers, 0),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateCloudUserPrefs(
  uid: string,
  prefs: {
    accent: EnglishAccent;
    zhAccent: ChineseAccent;
    learningLang: StudyLanguage;
    soundMuted: boolean;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      accent: prefs.accent === 'en-GB' ? 'en-GB' : 'en-US',
      zhAccent: prefs.zhAccent === 'zh-TW' ? 'zh-TW' : 'zh-CN',
      learningLang: sanitizeLanguage(prefs.learningLang),
      soundMuted: Boolean(prefs.soundMuted),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateCloudReminders(
  uid: string,
  reminders: ReminderSettings
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      reminderEnabled: Boolean(reminders.enabled),
      reminderEmail: clampStr(reminders.email || '', 200),
      reminderTime: sanitizeTimeStr(reminders.time),
      reminderFolderIds: sanitizeReminderFolderIds(reminders.selectedFolderIds),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function replaceCloudBackup(
  uid: string,
  userEmail: string,
  bundle: CloudUserBundle,
  folders: TopicFolder[],
  words: VocabWord[],
  existingFolderIds: string[],
  existingWordIds: string[]
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const delBatch = writeBatch(db);
    for (const wid of existingWordIds.slice(0, 220)) {
      delBatch.delete(doc(db, 'users', uid, 'words', sanitizeId(wid, 'word')));
    }
    for (const fid of existingFolderIds.slice(0, 220)) {
      delBatch.delete(doc(db, 'users', uid, 'folders', sanitizeId(fid, 'folder')));
    }
    await delBatch.commit();

    const writeB = writeBatch(db);
    writeB.update(doc(db, 'users', uid), buildUserProfileDoc(uid, userEmail, bundle, false));
    for (const f of folders) {
      const safeFid = sanitizeId(f.id, 'folder');
      writeB.set(
        doc(db, 'users', uid, 'folders', safeFid),
        buildFolderDoc(uid, { ...f, id: safeFid }, true)
      );
    }
    for (const w of words.slice(0, 350)) {
      const safeWid = sanitizeId(w.id, 'word');
      const safeFid = sanitizeId(w.folderId, 'folder');
      writeB.set(
        doc(db, 'users', uid, 'words', safeWid),
        buildWordDoc(uid, { ...w, id: safeWid, folderId: safeFid }, true)
      );
    }
    await writeB.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

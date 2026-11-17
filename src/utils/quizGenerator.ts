import type { QuizQuestion, StudyLanguage, VocabWord } from '../types/vocab';
import { containsCjk, stripPinyinTones } from './pinyin';

const FALLBACK_VIETNAMESE_DISTRACTORS = [
  'sự kiên nhẫn và bền bỉ',
  'thay đổi nhanh chóng',
  'giải pháp sáng tạo',
  'môi trường làm việc năng động',
  'cảm giác tự tin',
  'kế hoạch dài hạn',
];

const FALLBACK_ENGLISH_DISTRACTORS = [
  'resilient',
  'harmony',
  'innovate',
  'generous',
  'efficient',
  'ambitious',
];

const FALLBACK_CHINESE_DISTRACTORS = [
  '认真',
  '顺利',
  '耐心',
  '精彩',
  '方便',
  '重要',
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAcceptedTargetAnswers(word: VocabWord, language: StudyLanguage): string[] {
  const set = new Set<string>();
  const target = word.english.trim();
  if (target) set.add(target.toLowerCase());

  if (language === 'zh' && word.ipa.trim()) {
    const pinyin = word.ipa.trim().toLowerCase();
    set.add(pinyin);
    set.add(stripPinyinTones(pinyin));
  }
  return Array.from(set);
}

function createClozeSentence(
  word: VocabWord,
  language: StudyLanguage
): {
  clozeSentence: string;
  acceptedAnswers: string[];
  displayAnswer: string;
} {
  const rawSentence = (word.example || '').trim();
  const target = word.english.trim();
  const baseAccepted = buildAcceptedTargetAnswers(word, language);

  if (!rawSentence) {
    return {
      clozeSentence:
        language === 'zh'
          ? `请填空 (Điền từ còn thiếu): ______ (${word.vietnamese})`
          : `Please complete the sentence with the target word: ______ (${word.vietnamese}).`,
      acceptedAnswers: baseAccepted,
      displayAnswer: target,
    };
  }

  // CJK direct substring match (no ASCII word boundaries \b)
  if (language === 'zh' || containsCjk(target) || containsCjk(rawSentence)) {
    if (target && rawSentence.includes(target)) {
      return {
        clozeSentence: rawSentence.replace(target, '______'),
        acceptedAnswers: baseAccepted,
        displayAnswer: target,
      };
    }
    return {
      clozeSentence: `${rawSentence} → ______`,
      acceptedAnswers: baseAccepted,
      displayAnswer: target,
    };
  }

  // English exact word/phrase match
  const exactRegex = new RegExp(`\\b(${escapeRegExp(target)})\\b`, 'i');
  const exactMatch = rawSentence.match(exactRegex);
  if (exactMatch && exactMatch[1]) {
    return {
      clozeSentence: rawSentence.replace(exactRegex, '______'),
      acceptedAnswers: [target.toLowerCase(), exactMatch[1].toLowerCase()],
      displayAnswer: exactMatch[1],
    };
  }

  // English stem match
  const stem = target.length > 4 ? target.slice(0, target.length - 1) : target;
  const stemRegex = new RegExp(`\\b(${escapeRegExp(stem)}[a-z]{0,4})\\b`, 'i');
  const stemMatch = rawSentence.match(stemRegex);
  if (stemMatch && stemMatch[1]) {
    return {
      clozeSentence: rawSentence.replace(stemRegex, '______'),
      acceptedAnswers: [target.toLowerCase(), stemMatch[1].toLowerCase()],
      displayAnswer: stemMatch[1],
    };
  }

  return {
    clozeSentence: `${rawSentence} → Target word: ______`,
    acceptedAnswers: baseAccepted,
    displayAnswer: target,
  };
}

function buildScrambledTokens(
  sentence: string,
  language: StudyLanguage
): {
  targetTokens: string[];
  scrambledTokens: string[];
  isCjkScramble: boolean;
} {
  const cleanSentence = sentence.trim().replace(/\s+/g, ' ');
  const isCjk = language === 'zh' || (containsCjk(cleanSentence) && !cleanSentence.includes(' '));

  let tokens: string[];
  if (isCjk) {
    // Split CJK text into clean tokens, attaching trailing punctuation to preceding char
    const chars = Array.from(cleanSentence.replace(/\s+/g, ''));
    const punctSet = new Set(['。', '，', '？', '！', '、', '；', '：', '.', ',', '?', '!']);
    tokens = [];
    for (const ch of chars) {
      if (punctSet.has(ch) && tokens.length > 0) {
        tokens[tokens.length - 1] = tokens[tokens.length - 1] + ch;
      } else {
        tokens.push(ch);
      }
    }
  } else {
    tokens = cleanSentence.split(' ').filter(Boolean);
  }

  if (tokens.length <= 1) {
    return {
      targetTokens: tokens,
      scrambledTokens: tokens,
      isCjkScramble: isCjk,
    };
  }

  let scrambled = shuffleArray(tokens);
  let attempts = 0;
  while (scrambled.join('') === tokens.join('') && attempts < 8) {
    scrambled = shuffleArray(tokens);
    attempts++;
  }
  if (scrambled.join('') === tokens.join('') && scrambled.length >= 2) {
    [scrambled[0], scrambled[1]] = [scrambled[1], scrambled[0]];
  }

  return {
    targetTokens: tokens,
    scrambledTokens: scrambled,
    isCjkScramble: isCjk,
  };
}

export function generateSmartQuiz(
  selectedWords: VocabWord[],
  allWordsPool: VocabWord[],
  studyLanguage: StudyLanguage = 'en'
): QuizQuestion[] {
  if (selectedWords.length === 0) return [];

  const totalQuestions = Math.max(4, Math.ceil(selectedWords.length / 4) * 4);
  const perQuarter = totalQuestions / 4;

  const shuffledSelected = shuffleArray(selectedWords);
  const assignedWords: VocabWord[] = [];
  for (let i = 0; i < totalQuestions; i++) {
    assignedWords.push(shuffledSelected[i % shuffledSelected.length]);
  }

  const sameLangPool = allWordsPool.filter(
    (w) => (w.language || 'en') === studyLanguage
  );
  const pool = sameLangPool.length >= selectedWords.length ? sameLangPool : selectedWords;
  const questions: QuizQuestion[] = [];

  for (let idx = 0; idx < totalQuestions; idx++) {
    const word = assignedWords[idx];
    const wordLang: StudyLanguage = word.language || studyLanguage;
    const quarter = (Math.floor(idx / perQuarter) + 1) as 1 | 2 | 3 | 4;

    if (quarter === 1) {
      const distractorPool = shuffleArray(
        Array.from(
          new Set(
            pool
              .filter(
                (w) =>
                  w.id !== word.id &&
                  w.vietnamese.trim() &&
                  w.vietnamese.trim() !== word.vietnamese.trim()
              )
              .map((w) => w.vietnamese.trim())
          )
        )
      );
      const options = [...distractorPool.slice(0, 3)];
      for (const fallback of FALLBACK_VIETNAMESE_DISTRACTORS) {
        if (options.length >= 3) break;
        if (fallback !== word.vietnamese.trim() && !options.includes(fallback)) {
          options.push(fallback);
        }
      }
      options.push(word.vietnamese.trim());

      questions.push({
        id: `q-${idx}-${word.id}-q1`,
        quarter: 1,
        type: 'en_to_vi',
        language: wordLang,
        word,
        prompt: word.english,
        subPrompt: word.ipa || undefined,
        options: shuffleArray(options),
        correctAnswer: word.vietnamese.trim(),
      });
    } else if (quarter === 2) {
      questions.push({
        id: `q-${idx}-${word.id}-q2`,
        quarter: 2,
        type: 'vi_to_en',
        language: wordLang,
        word,
        prompt: word.vietnamese,
        subPrompt:
          wordLang === 'zh'
            ? 'Gõ chữ Hán (汉字) hoặc phiên âm Pinyin tương ứng với nghĩa tiếng Việt này.'
            : 'Type the exact English word or phrase matching this Vietnamese meaning.',
        correctAnswer: word.english.trim(),
        acceptedAnswers: buildAcceptedTargetAnswers(word, wordLang),
      });
    } else if (quarter === 3) {
      const { clozeSentence, acceptedAnswers, displayAnswer } = createClozeSentence(
        word,
        wordLang
      );
      questions.push({
        id: `q-${idx}-${word.id}-q3`,
        quarter: 3,
        type: 'cloze',
        language: wordLang,
        word,
        prompt: clozeSentence,
        subPrompt:
          wordLang === 'zh'
            ? `Gợi ý: ${word.vietnamese} (nhập chữ Hán hoặc Pinyin)`
            : `Hint: ${word.vietnamese}`,
        correctAnswer: displayAnswer,
        acceptedAnswers,
      });
    } else {
      const validSynonyms = (word.synonyms || []).map((s) => s.trim()).filter(Boolean);
      const minLenForScramble = wordLang === 'zh' ? 3 : 3;
      const exampleTokenCount =
        wordLang === 'zh'
          ? Array.from((word.example || '').trim()).length
          : (word.example || '').trim().split(/\s+/).length;

      if (validSynonyms.length > 0) {
        const chosenSynonym = validSynonyms[0];
        const lowerExcluded = new Set([
          word.english.trim().toLowerCase(),
          ...validSynonyms.map((s) => s.toLowerCase()),
        ]);

        const candidatePool = shuffleArray(
          Array.from(
            new Set(
              pool
                .flatMap((w) => [w.english, ...(w.synonyms || [])])
                .map((s) => s.trim())
                .filter((s) => s && !lowerExcluded.has(s.toLowerCase()))
            )
          )
        );
        const options = [...candidatePool.slice(0, 3)];
        const fallbackList =
          wordLang === 'zh' ? FALLBACK_CHINESE_DISTRACTORS : FALLBACK_ENGLISH_DISTRACTORS;
        for (const fallback of fallbackList) {
          if (options.length >= 3) break;
          if (!lowerExcluded.has(fallback) && !options.includes(fallback)) {
            options.push(fallback);
          }
        }
        options.push(chosenSynonym);

        questions.push({
          id: `q-${idx}-${word.id}-q4-syn`,
          quarter: 4,
          type: 'synonym',
          language: wordLang,
          word,
          prompt: word.english,
          subPrompt:
            wordLang === 'zh'
              ? `Chọn từ đồng nghĩa tiếng Trung gần nhất với "${word.english}" (${word.ipa}).`
              : 'Select the closest English synonym for this word.',
          options: shuffleArray(options),
          correctAnswer: chosenSynonym,
        });
      } else {
        const sentenceSource =
          exampleTokenCount >= minLenForScramble
            ? word.example
            : wordLang === 'zh'
            ? `我们每天都练习${word.english}。`
            : `We practice the word ${word.english} every day.`;
        const { targetTokens, scrambledTokens, isCjkScramble } = buildScrambledTokens(
          sentenceSource,
          wordLang
        );

        questions.push({
          id: `q-${idx}-${word.id}-q4-scr`,
          quarter: 4,
          type: 'scramble',
          language: wordLang,
          word,
          prompt: word.vietnamese,
          subPrompt:
            wordLang === 'zh'
              ? `Sắp xếp các chữ Hán thành câu hoàn chỉnh chứa từ "${word.english}".`
              : `Arrange the words into the correct English sentence using "${word.english}".`,
          correctAnswer: isCjkScramble ? targetTokens.join('') : targetTokens.join(' '),
          targetTokens,
          scrambledTokens,
          isCjkScramble,
        });
      }
    }
  }

  return questions;
}

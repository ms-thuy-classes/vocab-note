import type { QuizQuestion, VocabWord } from '../types/vocab';

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

function createClozeSentence(word: VocabWord): {
  clozeSentence: string;
  acceptedAnswers: string[];
  displayAnswer: string;
} {
  const rawSentence = (word.example || '').trim();
  const target = word.english.trim();

  if (!rawSentence) {
    return {
      clozeSentence: `Please complete the sentence with the target word: ______ (${word.vietnamese}).`,
      acceptedAnswers: [target.toLowerCase()],
      displayAnswer: target,
    };
  }

  // Exact phrase/word match first
  const exactRegex = new RegExp(`\\b(${escapeRegExp(target)})\\b`, 'i');
  const exactMatch = rawSentence.match(exactRegex);
  if (exactMatch && exactMatch[1]) {
    return {
      clozeSentence: rawSentence.replace(exactRegex, '______'),
      acceptedAnswers: [target.toLowerCase(), exactMatch[1].toLowerCase()],
      displayAnswer: exactMatch[1],
    };
  }

  // Stem match (e.g. mitigate -> mitigating/mitigates/mitigated)
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

  // Fallback if example sentence does not explicitly include the exact word
  return {
    clozeSentence: `${rawSentence} → Target word: ______`,
    acceptedAnswers: [target.toLowerCase()],
    displayAnswer: target,
  };
}

function buildScrambledTokens(sentence: string): {
  targetTokens: string[];
  scrambledTokens: string[];
} {
  const cleanSentence = sentence.trim().replace(/\s+/g, ' ');
  const tokens = cleanSentence.split(' ').filter(Boolean);

  if (tokens.length <= 1) {
    return {
      targetTokens: tokens,
      scrambledTokens: tokens,
    };
  }

  let scrambled = shuffleArray(tokens);
  let attempts = 0;
  while (scrambled.join(' ') === tokens.join(' ') && attempts < 8) {
    scrambled = shuffleArray(tokens);
    attempts++;
  }
  if (scrambled.join(' ') === tokens.join(' ') && scrambled.length >= 2) {
    [scrambled[0], scrambled[1]] = [scrambled[1], scrambled[0]];
  }

  return {
    targetTokens: tokens,
    scrambledTokens: scrambled,
  };
}

export function generateSmartQuiz(
  selectedWords: VocabWord[],
  allWordsPool: VocabWord[]
): QuizQuestion[] {
  if (selectedWords.length === 0) return [];

  // Ensure exact 25% per quarter by making total questions a multiple of 4
  const totalQuestions = Math.max(4, Math.ceil(selectedWords.length / 4) * 4);
  const perQuarter = totalQuestions / 4;

  // Build balanced list of words of length `totalQuestions` where every selected word appears at least once
  const shuffledSelected = shuffleArray(selectedWords);
  const assignedWords: VocabWord[] = [];
  for (let i = 0; i < totalQuestions; i++) {
    assignedWords.push(shuffledSelected[i % shuffledSelected.length]);
  }

  const pool = allWordsPool.length >= selectedWords.length ? allWordsPool : selectedWords;
  const questions: QuizQuestion[] = [];

  for (let idx = 0; idx < totalQuestions; idx++) {
    const word = assignedWords[idx];
    const quarter = (Math.floor(idx / perQuarter) + 1) as 1 | 2 | 3 | 4;

    if (quarter === 1) {
      // Quarter 1: English -> Vietnamese
      const distractorPool = shuffleArray(
        Array.from(
          new Set(
            pool
              .filter((w) => w.id !== word.id && w.vietnamese.trim() && w.vietnamese.trim() !== word.vietnamese.trim())
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
        word,
        prompt: word.english,
        subPrompt: word.ipa || undefined,
        options: shuffleArray(options),
        correctAnswer: word.vietnamese.trim(),
      });
    } else if (quarter === 2) {
      // Quarter 2: Vietnamese -> English (Active Recall)
      questions.push({
        id: `q-${idx}-${word.id}-q2`,
        quarter: 2,
        type: 'vi_to_en',
        word,
        prompt: word.vietnamese,
        subPrompt: 'Type the exact English word or phrase matching this Vietnamese meaning.',
        correctAnswer: word.english.trim(),
        acceptedAnswers: [word.english.trim().toLowerCase()],
      });
    } else if (quarter === 3) {
      // Quarter 3: Fill-in-the-Blank Cloze Test
      const { clozeSentence, acceptedAnswers, displayAnswer } = createClozeSentence(word);
      questions.push({
        id: `q-${idx}-${word.id}-q3`,
        quarter: 3,
        type: 'cloze',
        word,
        prompt: clozeSentence,
        subPrompt: `Hint: ${word.vietnamese}`,
        correctAnswer: displayAnswer,
        acceptedAnswers,
      });
    } else {
      // Quarter 4: Adaptive Synonym OR Drag-and-Drop Sentence Scramble
      const validSynonyms = (word.synonyms || []).map((s) => s.trim()).filter(Boolean);
      const hasExampleForScramble = (word.example || '').trim().split(/\s+/).length >= 3;

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
        for (const fallback of FALLBACK_ENGLISH_DISTRACTORS) {
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
          word,
          prompt: word.english,
          subPrompt: 'Select the closest English synonym for this word.',
          options: shuffleArray(options),
          correctAnswer: chosenSynonym,
        });
      } else {
        const sentenceSource = hasExampleForScramble
          ? word.example
          : `We practice the word ${word.english} every day.`;
        const { targetTokens, scrambledTokens } = buildScrambledTokens(sentenceSource);

        questions.push({
          id: `q-${idx}-${word.id}-q4-scr`,
          quarter: 4,
          type: 'scramble',
          word,
          prompt: word.vietnamese,
          subPrompt: `Arrange the words into the correct English sentence using "${word.english}".`,
          correctAnswer: targetTokens.join(' '),
          targetTokens,
          scrambledTokens,
        });
      }
    }
  }

  return questions;
}

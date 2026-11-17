export const PINYIN_TONE_SYMBOLS = [
  'ā', 'á', 'ǎ', 'à',
  'ē', 'é', 'ě', 'è',
  'ī', 'í', 'ǐ', 'ì',
  'ō', 'ó', 'ǒ', 'ò',
  'ū', 'ú', 'ǔ', 'ù',
  'ǖ', 'ǘ', 'ǚ', 'ǜ',
  'ü',
];

const TONE_MAP: Record<string, [string, string, string, string, string]> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
};

function applyToneToSyllable(syllable: string, tone: number): string {
  const lower = syllable.toLowerCase().replace(/v/g, 'ü');
  const idx = tone >= 1 && tone <= 4 ? tone - 1 : 4;

  // Standard Pinyin tone placement rules: a > o > e > (iu -> u, ui -> i) > i/u/ü
  for (const vowel of ['a', 'o', 'e']) {
    if (lower.includes(vowel)) {
      return lower.replace(vowel, TONE_MAP[vowel][idx]);
    }
  }
  if (lower.includes('iu')) {
    return lower.replace('u', TONE_MAP.u[idx]);
  }
  if (lower.includes('ui')) {
    return lower.replace('i', TONE_MAP.i[idx]);
  }
  for (const vowel of ['i', 'u', 'ü']) {
    if (lower.includes(vowel)) {
      return lower.replace(vowel, TONE_MAP[vowel][idx]);
    }
  }
  return lower;
}

/**
 * Converts numbered Pinyin like "ni3 hao3" or "nv3 hai2" into "nǐ hǎo" / "nǚ hái".
 */
export function convertNumberedPinyin(input: string): string {
  return input.replace(/([a-zA-ZüÜ]+)([1-5])/g, (_match, syl: string, toneStr: string) => {
    const tone = Number(toneStr);
    return applyToneToSyllable(syl, tone);
  });
}

/**
 * Removes Pinyin tone marks for lenient matching (e.g., "nǐ hǎo" -> "ni hao").
 */
export function stripPinyinTones(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .toLowerCase()
    .trim();
}

export function containsCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

// Built-in quick HSK 1-4 dictionary snippets for offline instant Pinyin + synonym lookup
const MINI_ZH_DICT: Record<string, { pinyin: string; synonyms?: string[] }> = {
  '你好': { pinyin: 'nǐ hǎo', synonyms: ['您好'] },
  '谢谢': { pinyin: 'xièxie', synonyms: ['感谢'] },
  '请问': { pinyin: 'qǐngwèn' },
  '没关系': { pinyin: 'méi guānxi', synonyms: ['不要紧'] },
  '再见': { pinyin: 'zàijiàn', synonyms: ['拜拜'] },
  '高兴': { pinyin: 'gāoxìng', synonyms: ['开心', '快乐'] },
  '开心': { pinyin: 'kāixīn', synonyms: ['高兴', '快乐'] },
  '学习': { pinyin: 'xuéxí', synonyms: ['念书'] },
  '努力': { pinyin: 'nǔlì', synonyms: ['用功'] },
  '朋友': { pinyin: 'péngyou', synonyms: ['好友'] },
  '家人': { pinyin: 'jiārén', synonyms: ['亲人'] },
  '喜欢': { pinyin: 'xǐhuan', synonyms: ['喜爱'] },
  '工作': { pinyin: 'gōngzuò', synonyms: ['职业'] },
  '美味': { pinyin: 'měiwèi', synonyms: ['好吃'] },
  '帮助': { pinyin: 'bāngzhù', synonyms: ['帮忙'] },
  '准备': { pinyin: 'zhǔnbèi', synonyms: ['预备'] },
  '重要': { pinyin: 'zhòngyào', synonyms: ['关键'] },
};

export function lookupChineseWordHelper(
  hanzi: string,
  currentPinyin: string
): { pinyin?: string; synonyms?: string[] } | null {
  const trimmedHanzi = hanzi.trim();
  const converted = convertNumberedPinyin(currentPinyin.trim());
  const dictEntry = MINI_ZH_DICT[trimmedHanzi];

  if (dictEntry) {
    return {
      pinyin: dictEntry.pinyin,
      synonyms: dictEntry.synonyms,
    };
  }

  if (converted && converted !== currentPinyin.trim()) {
    return { pinyin: converted };
  }

  return null;
}

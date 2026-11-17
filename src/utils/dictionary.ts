export interface DictionaryLookupResult {
  ipa: string;
  synonyms: string[];
  example?: string;
}

interface DictionaryApiPhonetic {
  text?: string;
}

interface DictionaryApiDefinition {
  example?: string;
  synonyms?: string[];
}

interface DictionaryApiMeaning {
  synonyms?: string[];
  definitions?: DictionaryApiDefinition[];
}

interface DictionaryApiEntry {
  phonetic?: string;
  phonetics?: DictionaryApiPhonetic[];
  meanings?: DictionaryApiMeaning[];
}

export async function lookupEnglishWord(word: string): Promise<DictionaryLookupResult | null> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return null;

  // For multi-word phrases, try the full phrase first, then fallback gracefully
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`
  );
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as DictionaryApiEntry[];
  if (!Array.isArray(data) || data.length === 0) return null;

  const entry = data[0];
  let ipa = entry.phonetic || '';
  if (!ipa && Array.isArray(entry.phonetics)) {
    const found = entry.phonetics.find((p) => p.text && p.text.trim().length > 0);
    ipa = found?.text || '';
  }

  const synonymSet = new Set<string>();
  let example: string | undefined;

  if (Array.isArray(entry.meanings)) {
    for (const meaning of entry.meanings) {
      if (Array.isArray(meaning.synonyms)) {
        for (const s of meaning.synonyms) {
          if (s && s.toLowerCase() !== cleanWord && synonymSet.size < 4) {
            synonymSet.add(s);
          }
        }
      }
      if (Array.isArray(meaning.definitions)) {
        for (const def of meaning.definitions) {
          if (!example && def.example) {
            example = def.example;
          }
          if (Array.isArray(def.synonyms)) {
            for (const s of def.synonyms) {
              if (s && s.toLowerCase() !== cleanWord && synonymSet.size < 4) {
                synonymSet.add(s);
              }
            }
          }
        }
      }
    }
  }

  return {
    ipa: ipa.trim(),
    synonyms: Array.from(synonymSet),
    example,
  };
}

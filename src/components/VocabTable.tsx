import React, { useState } from 'react';
import {
  BookOpenCheck,
  CheckSquare,
  ClipboardPaste,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import { FOLDER_COLOR_STYLES, IPA_QUICK_SYMBOLS } from '../data/seedData';
import type { TopicFolder, VocabWord } from '../types/vocab';
import { speakText } from '../utils/audio';
import { lookupEnglishWord } from '../utils/dictionary';
import { compressImageToDataUrl } from '../utils/imageUtils';
import { ImagePickerModal } from './ImagePickerModal';

interface VocabTableProps {
  folders: TopicFolder[];
  activeFolderId: string;
  words: VocabWord[];
  selectedIds: string[];
  accent: 'en-US' | 'en-GB';
  onToggleSelect: (wordId: string) => void;
  onSelectAllVisible: (visibleIds: string[]) => void;
  onClearSelection: () => void;
  onAddWord: (folderId: string) => string;
  onUpdateWord: (wordId: string, updates: Partial<VocabWord>) => void;
  onDeleteWord: (wordId: string) => void;
  onLaunchFlashcards: () => void;
  onLaunchQuiz: () => void;
}

export const VocabTable: React.FC<VocabTableProps> = ({
  folders,
  activeFolderId,
  words,
  selectedIds,
  accent,
  onToggleSelect,
  onSelectAllVisible,
  onClearSelection,
  onAddWord,
  onUpdateWord,
  onDeleteWord,
  onLaunchFlashcards,
  onLaunchQuiz,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIpaWordId, setActiveIpaWordId] = useState<string | null>(null);
  const [synonymDrafts, setSynonymDrafts] = useState<Record<string, string>>({});
  const [lookupLoadingId, setLookupLoadingId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [imagePickerWordId, setImagePickerWordId] = useState<string | null>(null);

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const folderMap = new Map(folders.map((f) => [f.id, f]));

  const visibleWords = words.filter((w) => {
    const matchesFolder = activeFolderId === 'all' || w.folderId === activeFolderId;
    if (!matchesFolder) return false;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      w.english.toLowerCase().includes(q) ||
      w.vietnamese.toLowerCase().includes(q) ||
      w.example.toLowerCase().includes(q) ||
      w.synonyms.some((s) => s.toLowerCase().includes(q))
    );
  });

  const visibleIds = visibleWords.map((w) => w.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const targetAddFolderId =
    activeFolderId === 'all' ? folders[0]?.id || '' : activeFolderId;

  const showToast = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleAutoLookup = async (word: VocabWord) => {
    const term = word.english.trim();
    if (!term) {
      showToast('Enter an English word first before looking up IPA.');
      return;
    }
    setLookupLoadingId(word.id);
    try {
      const result = await lookupEnglishWord(term);
      if (!result) {
        showToast(`No dictionary entry found for "${term}". You can type or insert IPA symbols directly.`);
        return;
      }
      const updates: Partial<VocabWord> = {};
      if (result.ipa) updates.ipa = result.ipa;
      if (word.synonyms.length === 0 && result.synonyms.length > 0) {
        updates.synonyms = result.synonyms.slice(0, 3);
      }
      if (!word.example.trim() && result.example) {
        updates.example = result.example;
      }
      onUpdateWord(word.id, updates);
      showToast(`Updated IPA${updates.synonyms ? ' & synonyms' : ''} for "${term}".`);
    } catch {
      showToast('Dictionary lookup could not connect. Use the IPA quick-insert bar instead.');
    } finally {
      setLookupLoadingId(null);
    }
  };

  const handleInsertIpaSymbol = (word: VocabWord, symbol: string) => {
    const current = word.ipa || '';
    const next = current ? `${current}${symbol}` : `/${symbol}/`;
    onUpdateWord(word.id, { ipa: next });
  };

  const handleAddSynonym = (word: VocabWord) => {
    const draft = (synonymDrafts[word.id] || '').trim().replace(/,$/, '');
    if (!draft) return;
    if (!word.synonyms.some((s) => s.toLowerCase() === draft.toLowerCase())) {
      onUpdateWord(word.id, { synonyms: [...word.synonyms, draft] });
    }
    setSynonymDrafts((prev) => ({ ...prev, [word.id]: '' }));
  };

  const handleRemoveSynonym = (word: VocabWord, synToRemove: string) => {
    onUpdateWord(word.id, {
      synonyms: word.synonyms.filter((s) => s !== synToRemove),
    });
  };

  const handleCellPaste = async (e: React.ClipboardEvent, wordId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;
        try {
          const dataUrl = await compressImageToDataUrl(file);
          onUpdateWord(wordId, { imageUrl: dataUrl });
          showToast('Image pasted and saved!');
        } catch {
          showToast('Could not read pasted image.');
        }
        return;
      }
    }
  };

  const pickerWord = words.find((w) => w.id === imagePickerWordId) || null;
  const folderColor = activeFolder
    ? FOLDER_COLOR_STYLES[activeFolder.color] || FOLDER_COLOR_STYLES.lavender
    : null;

  return (
    <section className="flex-1 min-w-0 space-y-4">
      {/* Top Folder Header & Search */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              {folderColor ? (
                <span className={`w-3 h-3 rounded-full shrink-0 ${folderColor.swatch}`} />
              ) : (
                <Layers className="w-4 h-4 text-[#6F5C96] shrink-0" />
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-[#2B2438] truncate">
                {activeFolder ? activeFolder.name : 'All Topic Folders'}
              </h1>
            </div>
            <p className="text-sm text-[#5E556E] mt-1">
              {activeFolder?.description ||
                'Review and select words across all your personal vocabulary folders.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-[#867C96] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search words..."
                aria-label="Search vocabulary words"
                className="w-48 sm:w-56 pl-9 pr-3 py-2 rounded-xl bg-white/90 border border-[#867C96]/20 text-sm text-[#2B2438] placeholder:text-[#867C96]"
              />
            </div>

            {targetAddFolderId && (
              <button
                type="button"
                onClick={() => {
                  onAddWord(targetAddFolderId);
                  showToast('Added a new vocabulary row (+10 XP).');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6F5C96] text-white text-sm font-bold hover:bg-[#5E4C84] transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Word</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Select & Study Launcher Action Bar */}
        <div className="pt-3 border-t border-[#867C96]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() =>
                allVisibleSelected ? onClearSelection() : onSelectAllVisible(visibleIds)
              }
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F3F0FC] hover:bg-[#E6E6FA] text-xs font-bold text-[#3F3163] transition-colors cursor-pointer"
            >
              {allVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-[#6F5C96]" />
              ) : (
                <Square className="w-4 h-4 text-[#6F5C96]" />
              )}
              <span>{allVisibleSelected ? 'Deselect All' : 'Select All'}</span>
            </button>

            <span className="text-xs font-semibold text-[#5E556E] tabular-nums">
              <strong className="text-[#2B2438]">{selectedIds.length}</strong>{' '}
              {selectedIds.length === 1 ? 'word' : 'words'} selected
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="ml-2 text-[#6F5C96] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </span>

            {statusNotice && (
              <span className="text-xs font-bold text-[#1F4F4B] bg-[#E0F2F1] px-2.5 py-1 rounded-lg">
                {statusNotice}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={onLaunchFlashcards}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E0F2F1] text-[#1F4F4B] border border-[#9ADCD5] hover:bg-[#CEEBE8] disabled:opacity-45 disabled:cursor-not-allowed text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer"
            >
              <BookOpenCheck className="w-4 h-4" />
              <span>Create Flashcards</span>
              {selectedIds.length > 0 && (
                <span className="font-mono-num">({selectedIds.length})</span>
              )}
            </button>

            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={onLaunchQuiz}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C5CBF] to-[#C86D85] text-white hover:opacity-95 disabled:opacity-45 disabled:cursor-not-allowed text-xs sm:text-sm font-bold shadow-xs transition-all whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Smart Quiz</span>
              {selectedIds.length > 0 && (
                <span className="font-mono-num">({selectedIds.length})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {visibleWords.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-3">
          <p className="text-base font-bold text-[#2B2438]">
            {searchTerm ? 'No matching vocabulary words found.' : 'This topic folder has no words yet.'}
          </p>
          <p className="text-sm text-[#5E556E]">
            {searchTerm
              ? 'Try clearing your search filter or check another topic folder.'
              : 'Click "+ Add Word" above to add your first English word, IPA, meaning, example, and image.'}
          </p>
          {!searchTerm && targetAddFolderId && (
            <button
              type="button"
              onClick={() => onAddWord(targetAddFolderId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6F5C96] text-white text-sm font-bold hover:bg-[#5E4C84] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Word</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop 7-Column Interactive Table */}
          <div className="hidden md:block glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#F3F0FC] via-[#FFF2F0] to-[#EEF9F8] border-b border-[#867C96]/15 text-xs font-bold text-[#3F3163]">
                    <th className="py-3.5 pl-4 pr-2 w-[68px] whitespace-nowrap">No.</th>
                    <th className="py-3.5 px-2.5 min-w-[155px]">English Word</th>
                    <th className="py-3.5 px-2.5 min-w-[170px]">IPA</th>
                    <th className="py-3.5 px-2.5 min-w-[180px]">Vietnamese Meaning</th>
                    <th className="py-3.5 px-2.5 min-w-[240px]">Example Sentence</th>
                    <th className="py-3.5 px-2.5 min-w-[165px]">English Synonyms</th>
                    <th className="py-3.5 pl-2.5 pr-4 min-w-[140px]">Vivid Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#867C96]/12 text-sm">
                  {visibleWords.map((word, index) => {
                    const isSelected = selectedIds.includes(word.id);
                    const isIpaOpen = activeIpaWordId === word.id;
                    const folderName = folderMap.get(word.folderId)?.name;

                    return (
                      <tr
                        key={word.id}
                        className={`align-top transition-colors ${
                          isSelected ? 'bg-[#F3F0FC]/65' : 'hover:bg-white/60'
                        }`}
                      >
                        {/* 1. No. (STT) + Multi-Select Checkbox */}
                        <td className="py-3.5 pl-4 pr-2">
                          <div className="flex items-center gap-2 pt-1.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelect(word.id)}
                              aria-label={`Select ${word.english || `word ${index + 1}`}`}
                              className="w-4 h-4 rounded border-[#867C96]/40 accent-[#6F5C96] cursor-pointer"
                            />
                            <span className="font-mono-num text-xs font-bold text-[#5E556E]">
                              {index + 1}
                            </span>
                          </div>
                        </td>

                        {/* 2. English Word + Audio */}
                        <td className="py-3 px-2.5">
                          <div className="flex items-start gap-1.5">
                            <input
                              type="text"
                              value={word.english}
                              onChange={(e) =>
                                onUpdateWord(word.id, { english: e.target.value })
                              }
                              placeholder="English word"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white/80 border border-transparent hover:border-[#D5CEF5] focus:border-[#7C5CBF] focus:bg-white font-bold text-[#2B2438] text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => speakText(word.english, accent)}
                              title={`Pronounce "${word.english}" (${accent})`}
                              aria-label={`Pronounce ${word.english}`}
                              className="p-2 rounded-lg bg-[#F3F0FC] text-[#4D3B73] hover:bg-[#E6E6FA] transition-colors shrink-0 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {activeFolderId === 'all' && folderName && (
                            <span className="block mt-1 px-1 text-[11px] font-semibold text-[#867C96]">
                              {folderName}
                            </span>
                          )}
                        </td>

                        {/* 3. IPA + Auto-Lookup + Quick-Insert Bar */}
                        <td className="py-3 px-2.5">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={word.ipa}
                              onFocus={() => setActiveIpaWordId(word.id)}
                              onChange={(e) =>
                                onUpdateWord(word.id, { ipa: e.target.value })
                              }
                              placeholder="/aɪ.piː.eɪ/"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white/80 border border-transparent hover:border-[#D5CEF5] focus:border-[#7C5CBF] focus:bg-white font-ipa text-xs text-[#4D3B73]"
                            />
                            <button
                              type="button"
                              onClick={() => handleAutoLookup(word)}
                              disabled={lookupLoadingId === word.id}
                              title="Auto-lookup IPA & synonyms via dictionaryapi.dev"
                              aria-label={`Auto lookup IPA for ${word.english}`}
                              className="p-1.5 rounded-lg bg-[#EEF9F8] text-[#1F4F4B] border border-[#BFE3E0] hover:bg-[#E0F2F1] transition-colors shrink-0 cursor-pointer"
                            >
                              {lookupLoadingId === word.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Wand2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <div className="mt-1 flex items-center justify-between px-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveIpaWordId(isIpaOpen ? null : word.id)
                              }
                              className="text-[11px] font-semibold text-[#6F5C96] hover:underline cursor-pointer"
                            >
                              {isIpaOpen ? 'Hide IPA bar' : 'IPA symbols'}
                            </button>
                          </div>

                          {isIpaOpen && (
                            <div className="mt-1.5 p-1.5 rounded-xl bg-[#FFFDF9] border border-[#D5CEF5] shadow-sm flex flex-wrap gap-1 max-w-[215px]">
                              {IPA_QUICK_SYMBOLS.map((sym) => (
                                <button
                                  key={sym}
                                  type="button"
                                  onClick={() => handleInsertIpaSymbol(word, sym)}
                                  className="px-1.5 py-0.5 rounded bg-[#F3F0FC] hover:bg-[#E6E6FA] font-ipa text-[11px] text-[#3F3163] cursor-pointer"
                                >
                                  {sym}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* 4. Vietnamese Meaning */}
                        <td className="py-3 px-2.5">
                          <textarea
                            rows={2}
                            value={word.vietnamese}
                            onChange={(e) =>
                              onUpdateWord(word.id, { vietnamese: e.target.value })
                            }
                            placeholder="Nghĩa tiếng Việt..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white/80 border border-transparent hover:border-[#D5CEF5] focus:border-[#7C5CBF] focus:bg-white text-sm font-medium text-[#2B2438] resize-none leading-snug"
                          />
                        </td>

                        {/* 5. Example Sentence + Audio + Vietnamese Context */}
                        <td className="py-3 px-2.5 space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <textarea
                              rows={2}
                              value={word.example}
                              onChange={(e) =>
                                onUpdateWord(word.id, { example: e.target.value })
                              }
                              placeholder="English example sentence..."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white/80 border border-transparent hover:border-[#D5CEF5] focus:border-[#7C5CBF] focus:bg-white text-xs text-[#2B2438] resize-none leading-relaxed"
                            />
                            <button
                              type="button"
                              onClick={() => speakText(word.example, accent)}
                              title="Listen to example sentence"
                              aria-label="Pronounce example sentence"
                              className="p-2 rounded-lg bg-[#FFF2F0] text-[#632F2D] hover:bg-[#FFE4E1] transition-colors shrink-0 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={word.exampleVi}
                            onChange={(e) =>
                              onUpdateWord(word.id, { exampleVi: e.target.value })
                            }
                            placeholder="Dịch câu ví dụ (hiện khi chấm Quiz)..."
                            className="w-full px-2.5 py-1 rounded-lg bg-[#FAF7FD]/80 border border-transparent hover:border-[#D5CEF5] focus:border-[#7C5CBF] focus:bg-white text-[11px] text-[#5E556E]"
                          />
                        </td>

                        {/* 6. English Synonyms (Optional Tag Input) */}
                        <td className="py-3 px-2.5">
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {word.synonyms.map((syn) => (
                              <span
                                key={syn}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E0F2F1] text-[#1F4F4B] text-xs font-semibold"
                              >
                                <span>{syn}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSynonym(word, syn)}
                                  aria-label={`Remove synonym ${syn}`}
                                  className="hover:text-[#B03B3B] cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={synonymDrafts[word.id] || ''}
                            onChange={(e) =>
                              setSynonymDrafts((prev) => ({
                                ...prev,
                                [word.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                handleAddSynonym(word);
                              }
                            }}
                            onBlur={() => handleAddSynonym(word)}
                            placeholder={
                              word.synonyms.length === 0
                                ? '+ Add synonym (optional)'
                                : '+ Another...'
                            }
                            className="w-full px-2 py-1 rounded-lg bg-white/80 border border-[#867C96]/15 focus:border-[#7C5CBF] text-xs text-[#2B2438] placeholder:text-[#867C96]"
                          />
                        </td>

                        {/* 7. Vivid Image (Optional: Ctrl+V Paste + Picker Modal) + Row Delete */}
                        <td className="py-3 pl-2.5 pr-4">
                          <div className="flex items-start gap-2">
                            <div
                              tabIndex={0}
                              onPaste={(e) => handleCellPaste(e, word.id)}
                              title="Click and press Ctrl+V to paste image, or use the picker button"
                              className="group/img relative w-16 h-16 rounded-xl bg-[#FAF7FD] border border-dashed border-[#B9AEE8] hover:border-[#6F5C96] focus:border-[#6F5C96] focus:ring-2 focus:ring-[#E6E6FA] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer transition-all"
                              onClick={() => setImagePickerWordId(word.id)}
                            >
                              {word.imageUrl ? (
                                <>
                                  <img
                                    src={word.imageUrl}
                                    alt={word.english || 'Vocabulary illustration'}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute inset-0 bg-[#2B2438]/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                                    Change
                                  </span>
                                </>
                              ) : (
                                <div className="flex flex-col items-center text-center p-1">
                                  <ImageIcon className="w-4 h-4 text-[#6F5C96]" />
                                  <span className="text-[9px] font-bold text-[#5E556E] mt-0.5 leading-tight">
                                    Pick / Ctrl+V
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => setImagePickerWordId(word.id)}
                                title="Open free image & sticker picker"
                                className="p-1.5 rounded-lg bg-[#F3F0FC] text-[#3F3163] hover:bg-[#E6E6FA] cursor-pointer"
                                aria-label="Open image picker"
                              >
                                <ClipboardPaste className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteWord(word.id)}
                                title="Delete word"
                                aria-label={`Delete ${word.english}`}
                                className="p-1.5 rounded-lg text-[#9B4848] hover:bg-[#FFE4E1] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Small Tablet Card List */}
          <div className="md:hidden space-y-3">
            {visibleWords.map((word, index) => {
              const isSelected = selectedIds.includes(word.id);
              return (
                <div
                  key={word.id}
                  className={`glass-card rounded-2xl p-4 space-y-3 ${
                    isSelected ? 'ring-2 ring-[#7C5CBF]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(word.id)}
                        className="w-4 h-4 accent-[#6F5C96]"
                      />
                      <span className="font-mono-num text-xs font-bold text-[#5E556E]">
                        #{index + 1}
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => speakText(word.english, accent)}
                        className="p-2 rounded-xl bg-[#F3F0FC] text-[#3F3163]"
                        aria-label="Pronounce word"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoLookup(word)}
                        className="p-2 rounded-xl bg-[#EEF9F8] text-[#1F4F4B]"
                        aria-label="Lookup IPA"
                      >
                        <Wand2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteWord(word.id)}
                        className="p-2 rounded-xl text-[#9B4848] hover:bg-[#FFE4E1]"
                        aria-label="Delete word"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={word.english}
                      onChange={(e) => onUpdateWord(word.id, { english: e.target.value })}
                      placeholder="English Word"
                      className="px-3 py-2 rounded-xl bg-white border border-[#867C96]/20 font-bold text-[#2B2438] text-sm"
                    />
                    <input
                      type="text"
                      value={word.ipa}
                      onChange={(e) => onUpdateWord(word.id, { ipa: e.target.value })}
                      placeholder="IPA /.../"
                      className="px-3 py-2 rounded-xl bg-white border border-[#867C96]/20 font-ipa text-xs text-[#4D3B73]"
                    />
                  </div>

                  <input
                    type="text"
                    value={word.vietnamese}
                    onChange={(e) => onUpdateWord(word.id, { vietnamese: e.target.value })}
                    placeholder="Vietnamese Meaning"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#867C96]/20 text-sm text-[#2B2438]"
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={word.example}
                        onChange={(e) => onUpdateWord(word.id, { example: e.target.value })}
                        placeholder="Example Sentence"
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#867C96]/20 text-xs text-[#2B2438]"
                      />
                      <button
                        type="button"
                        onClick={() => speakText(word.example, accent)}
                        className="p-2 rounded-xl bg-[#FFF2F0] text-[#632F2D]"
                        aria-label="Listen to example"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={word.exampleVi}
                      onChange={(e) => onUpdateWord(word.id, { exampleVi: e.target.value })}
                      placeholder="Vietnamese translation of example"
                      className="w-full px-3 py-1.5 rounded-xl bg-[#FAF7FD] border border-[#867C96]/15 text-xs text-[#5E556E]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {word.synonyms.map((syn) => (
                          <span
                            key={syn}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E0F2F1] text-[#1F4F4B] text-xs font-semibold"
                          >
                            {syn}
                            <button
                              type="button"
                              onClick={() => handleRemoveSynonym(word, syn)}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={synonymDrafts[word.id] || ''}
                        onChange={(e) =>
                          setSynonymDrafts((prev) => ({ ...prev, [word.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            handleAddSynonym(word);
                          }
                        }}
                        onBlur={() => handleAddSynonym(word)}
                        placeholder="+ Add synonym (optional)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/20 text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setImagePickerWordId(word.id)}
                      className="w-14 h-14 rounded-xl bg-[#FAF7FD] border border-dashed border-[#B9AEE8] overflow-hidden flex items-center justify-center shrink-0"
                    >
                      {word.imageUrl ? (
                        <img
                          src={word.imageUrl}
                          alt={word.english}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-[#6F5C96]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Image Picker Modal */}
      <ImagePickerModal
        isOpen={Boolean(pickerWord)}
        initialQuery={pickerWord?.english || ''}
        wordLabel={pickerWord?.english || ''}
        currentImageUrl={pickerWord?.imageUrl}
        onSelectImage={(url) => {
          if (pickerWord) onUpdateWord(pickerWord.id, { imageUrl: url });
        }}
        onRemoveImage={() => {
          if (pickerWord) onUpdateWord(pickerWord.id, { imageUrl: undefined });
        }}
        onClose={() => setImagePickerWordId(null)}
      />
    </section>
  );
};

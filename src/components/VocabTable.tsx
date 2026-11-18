import React, { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenCheck,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Square,
  Table2,
  Trash2,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import { FOLDER_COLOR_STYLES, IPA_QUICK_SYMBOLS } from '../data/seedData';
import type {
  FolderColor,
  SpeechAccent,
  StudyLanguage,
  TopicFolder,
  VocabWord,
} from '../types/vocab';
import { speakText } from '../utils/audio';
import { lookupEnglishWord } from '../utils/dictionary';
import { compressImageToDataUrl } from '../utils/imageUtils';
import { lookupChineseWordHelper, PINYIN_TONE_SYMBOLS } from '../utils/pinyin';

const ImagePickerModal = lazy(() =>
  import('./ImagePickerModal').then((m) => ({ default: m.ImagePickerModal }))
);
const FOLDER_COLOR_OPTIONS: FolderColor[] = ['lavender', 'blush', 'mint', 'cream', 'sky', 'peach'];

interface VocabTableProps {
  studyLanguage: StudyLanguage;
  folders: TopicFolder[];
  activeFolderId: string;
  words: VocabWord[];
  selectedIds: string[];
  speechAccent: SpeechAccent;
  onToggleSelect: (wordId: string) => void;
  onSelectAllVisible: (visibleIds: string[]) => void;
  onClearSelection: () => void;
  onAddWord: (folderId: string) => string;
  onUpdateWord: (wordId: string, updates: Partial<VocabWord>) => void;
  onDeleteWord: (wordId: string) => void;
  onCreateFolder: (
    name: string,
    description: string,
    color: FolderColor,
    options?: { isParent?: boolean; parentId?: string }
  ) => void;
  onUpdateFolder: (
    id: string,
    updates: Partial<Pick<TopicFolder, 'name' | 'description' | 'color' | 'parentId'>>
  ) => void;
  onDeleteFolder: (id: string) => void;
  onLaunchFlashcards: () => void;
  onLaunchQuiz: () => void;
}

interface RowCommonProps {
  word: VocabWord;
  index: number;
  isSelected: boolean;
  isZh: boolean;
  speechAccent: SpeechAccent;
  folderName?: string;
  showFolderBadge: boolean;
  isPhoneticOpen: boolean;
  isLookupLoading: boolean;
  synonymDraft: string;
  quickSymbols: readonly string[];
  onToggleSelect: (wordId: string) => void;
  onUpdateWord: (wordId: string, updates: Partial<VocabWord>) => void;
  onDeleteWord: (wordId: string) => void;
  onTogglePhonetic: (wordId: string) => void;
  onFocusPhonetic: (wordId: string) => void;
  onAutoLookup: (word: VocabWord) => void;
  onInsertPhoneticSymbol: (word: VocabWord, symbol: string) => void;
  onSynonymDraftChange: (wordId: string, value: string) => void;
  onAddSynonym: (word: VocabWord) => void;
  onRemoveSynonym: (word: VocabWord, syn: string) => void;
  onCellPaste: (e: React.ClipboardEvent, wordId: string) => void;
  onOpenImagePicker: (wordId: string) => void;
}

const VocabTableRow = memo<RowCommonProps>(
  ({
    word,
    index,
    isSelected,
    isZh,
    speechAccent,
    folderName,
    showFolderBadge,
    isPhoneticOpen,
    isLookupLoading,
    synonymDraft,
    quickSymbols,
    onToggleSelect,
    onUpdateWord,
    onDeleteWord,
    onTogglePhonetic,
    onFocusPhonetic,
    onAutoLookup,
    onInsertPhoneticSymbol,
    onSynonymDraftChange,
    onAddSynonym,
    onRemoveSynonym,
    onCellPaste,
    onOpenImagePicker,
  }) => {
    return (
      <tr
        className={`vocab-row-opt align-top transition-colors ${
          isSelected ? 'bg-[#F3F0FC]/70' : 'hover:bg-[#FAF7FD]/60'
        }`}
      >
        {/* 1. Sticky No. (STT) + Multi-Select Checkbox */}
        <td
          className={`sticky left-0 z-10 py-3.5 pl-4 pr-2.5 border-r border-[#867C96]/12 ${
            isSelected ? 'bg-[#F3F0FC]' : 'bg-white'
          }`}
        >
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

        {/* 2. Target Word (English or Hanzi) + Audio */}
        <td className="py-3 px-2.5">
          <div className="flex items-start gap-1.5">
            <input
              type="text"
              value={word.english}
              onChange={(e) => onUpdateWord(word.id, { english: e.target.value })}
              placeholder={isZh ? '汉字 (VD: 你好)' : 'English word'}
              className={`w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/15 hover:border-[#D5CEF5] focus:border-[#7C5CBF] font-bold text-[#2B2438] ${
                isZh ? 'text-base' : 'text-sm'
              }`}
            />
            <button
              type="button"
              onClick={() => speakText(word.english, speechAccent)}
              title={`Pronounce "${word.english}" (${speechAccent})`}
              aria-label={`Pronounce ${word.english}`}
              className="p-2 rounded-lg bg-[#F3F0FC] text-[#4D3B73] hover:bg-[#E6E6FA] transition-colors shrink-0 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {showFolderBadge && folderName && (
            <span className="block mt-1 px-1 text-[11px] font-semibold text-[#867C96]">
              {folderName}
            </span>
          )}
        </td>

        {/* 3. IPA / Pinyin + Auto-Lookup + Quick-Insert Bar */}
        <td className="py-3 px-2.5">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={word.ipa}
              onFocus={() => onFocusPhonetic(word.id)}
              onChange={(e) => onUpdateWord(word.id, { ipa: e.target.value })}
              placeholder={isZh ? 'nǐ hǎo (hoặc ni3 hao3)' : '/aɪ.piː.eɪ/'}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/15 hover:border-[#D5CEF5] focus:border-[#7C5CBF] font-ipa text-xs text-[#4D3B73]"
            />
            <button
              type="button"
              onClick={() => onAutoLookup(word)}
              disabled={isLookupLoading}
              title={
                isZh
                  ? 'Tự chuyển ni3 hao3 → nǐ hǎo hoặc tra từ thông dụng'
                  : 'Auto-lookup IPA & synonyms via dictionaryapi.dev'
              }
              aria-label={`Auto lookup phonetic for ${word.english}`}
              className="p-1.5 rounded-lg bg-[#EEF9F8] text-[#1F4F4B] border border-[#BFE3E0] hover:bg-[#E0F2F1] transition-colors shrink-0 cursor-pointer"
            >
              {isLookupLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="mt-1 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => onTogglePhonetic(word.id)}
              className="text-[11px] font-semibold text-[#6F5C96] hover:underline cursor-pointer"
            >
              {isPhoneticOpen
                ? isZh
                  ? 'Ẩn thanh dấu'
                  : 'Hide IPA bar'
                : isZh
                ? 'Thanh dấu Pinyin'
                : 'IPA symbols'}
            </button>
          </div>

          {isPhoneticOpen && (
            <div className="mt-1.5 p-1.5 rounded-xl bg-[#FFFDF9] border border-[#D5CEF5] shadow-sm flex flex-wrap gap-1 max-w-[215px]">
              {quickSymbols.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => onInsertPhoneticSymbol(word, sym)}
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
            onChange={(e) => onUpdateWord(word.id, { vietnamese: e.target.value })}
            placeholder="Nghĩa tiếng Việt..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/15 hover:border-[#D5CEF5] focus:border-[#7C5CBF] text-sm font-medium text-[#2B2438] resize-none leading-snug"
          />
        </td>

        {/* 5. Example Sentence + Audio + Vietnamese Context */}
        <td className="py-3 px-2.5 space-y-1.5">
          <div className="flex items-start gap-1.5">
            <textarea
              rows={2}
              value={word.example}
              onChange={(e) => onUpdateWord(word.id, { example: e.target.value })}
              placeholder={isZh ? 'Câu ví dụ tiếng Trung...' : 'English example sentence...'}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/15 hover:border-[#D5CEF5] focus:border-[#7C5CBF] text-xs text-[#2B2438] resize-none leading-relaxed"
            />
            <button
              type="button"
              onClick={() => speakText(word.example, speechAccent)}
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
            onChange={(e) => onUpdateWord(word.id, { exampleVi: e.target.value })}
            placeholder="Dịch câu ví dụ (hiện khi chấm Quiz)..."
            className="w-full px-2.5 py-1 rounded-lg bg-[#FAF7FD] border border-transparent hover:border-[#D5CEF5] focus:border-[#7C5CBF] focus:bg-white text-[11px] text-[#5E556E]"
          />
        </td>

        {/* 6. Synonyms (Optional Tag Input) */}
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
                  onClick={() => onRemoveSynonym(word, syn)}
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
            value={synonymDraft}
            onChange={(e) => onSynonymDraftChange(word.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                onAddSynonym(word);
              }
            }}
            onBlur={() => onAddSynonym(word)}
            placeholder={word.synonyms.length === 0 ? '+ Add synonym (optional)' : '+ Another...'}
            className="w-full px-2 py-1 rounded-lg bg-white border border-[#867C96]/15 focus:border-[#7C5CBF] text-xs text-[#2B2438] placeholder:text-[#867C96]"
          />
        </td>

        {/* 7. Vivid Image (Ctrl+V Paste + Picker Modal) + Row Delete */}
        <td className="py-3 pl-2.5 pr-4">
          <div className="flex items-start gap-2">
            <div
              tabIndex={0}
              onPaste={(e) => onCellPaste(e, word.id)}
              title="Click and press Ctrl+V to paste image, or use the picker button"
              className="group/img relative w-16 h-16 rounded-xl bg-[#FAF7FD] border border-dashed border-[#B9AEE8] hover:border-[#6F5C96] focus:border-[#6F5C96] focus:ring-2 focus:ring-[#E6E6FA] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer transition-colors"
              onClick={() => onOpenImagePicker(word.id)}
            >
              {word.imageUrl ? (
                <>
                  <img
                    src={word.imageUrl}
                    alt={word.english || 'Vocabulary illustration'}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
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
                onClick={() => onOpenImagePicker(word.id)}
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
  }
);
VocabTableRow.displayName = 'VocabTableRow';

interface MobileCardProps {
  word: VocabWord;
  index: number;
  isSelected: boolean;
  isZh: boolean;
  speechAccent: SpeechAccent;
  synonymDraft: string;
  onToggleSelect: (wordId: string) => void;
  onUpdateWord: (wordId: string, updates: Partial<VocabWord>) => void;
  onDeleteWord: (wordId: string) => void;
  onAutoLookup: (word: VocabWord) => void;
  onSynonymDraftChange: (wordId: string, value: string) => void;
  onAddSynonym: (word: VocabWord) => void;
  onRemoveSynonym: (word: VocabWord, syn: string) => void;
  onOpenImagePicker: (wordId: string) => void;
}

const VocabMobileCard = memo<MobileCardProps>(
  ({
    word,
    index,
    isSelected,
    isZh,
    speechAccent,
    synonymDraft,
    onToggleSelect,
    onUpdateWord,
    onDeleteWord,
    onAutoLookup,
    onSynonymDraftChange,
    onAddSynonym,
    onRemoveSynonym,
    onOpenImagePicker,
  }) => {
    return (
      <div
        className={`vocab-card-opt glass-card rounded-2xl p-4 space-y-3 ${
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
            <span className="font-mono-num text-xs font-bold text-[#5E556E]">#{index + 1}</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => speakText(word.english, speechAccent)}
              className="p-2 rounded-xl bg-[#F3F0FC] text-[#3F3163]"
              aria-label="Pronounce word"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onAutoLookup(word)}
              className="p-2 rounded-xl bg-[#EEF9F8] text-[#1F4F4B]"
              aria-label="Lookup phonetic"
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
            placeholder={isZh ? '汉字 (Tiếng Trung)' : 'English Word'}
            className="px-3 py-2 rounded-xl bg-white border border-[#867C96]/20 font-bold text-[#2B2438] text-sm"
          />
          <input
            type="text"
            value={word.ipa}
            onChange={(e) => onUpdateWord(word.id, { ipa: e.target.value })}
            placeholder={isZh ? 'Pinyin (VD: nǐ hǎo)' : 'IPA /.../'}
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
              placeholder={isZh ? 'Câu ví dụ tiếng Trung' : 'Example Sentence'}
              className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#867C96]/20 text-xs text-[#2B2438]"
            />
            <button
              type="button"
              onClick={() => speakText(word.example, speechAccent)}
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
                  <button type="button" onClick={() => onRemoveSynonym(word, syn)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={synonymDraft}
              onChange={(e) => onSynonymDraftChange(word.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  onAddSynonym(word);
                }
              }}
              onBlur={() => onAddSynonym(word)}
              placeholder="+ Add synonym (optional)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/20 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenImagePicker(word.id)}
            className="w-14 h-14 rounded-xl bg-[#FAF7FD] border border-dashed border-[#B9AEE8] overflow-hidden flex items-center justify-center shrink-0"
          >
            {word.imageUrl ? (
              <img
                src={word.imageUrl}
                alt={word.english}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-[#6F5C96]" />
            )}
          </button>
        </div>
      </div>
    );
  }
);
VocabMobileCard.displayName = 'VocabMobileCard';

export const VocabTable: React.FC<VocabTableProps> = memo(({
  studyLanguage,
  folders,
  activeFolderId,
  words,
  selectedIds,
  speechAccent,
  onToggleSelect,
  onSelectAllVisible,
  onClearSelection,
  onAddWord,
  onUpdateWord,
  onDeleteWord,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onLaunchFlashcards,
  onLaunchQuiz,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activePhoneticWordId, setActivePhoneticWordId] = useState<string | null>(null);
  const [synonymDrafts, setSynonymDrafts] = useState<Record<string, string>>({});
  const [lookupLoadingId, setLookupLoadingId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [imagePickerWordId, setImagePickerWordId] = useState<string | null>(null);
  const [mobileLayout, setMobileLayout] = useState<'table' | 'cards'>('table');

  // Inline Active Folder Edit / Delete / Quick Subfolder state
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [folderEditName, setFolderEditName] = useState('');
  const [folderEditDesc, setFolderEditDesc] = useState('');
  const [folderEditColor, setFolderEditColor] = useState<FolderColor>('lavender');
  const [folderEditParentId, setFolderEditParentId] = useState('');
  const [isConfirmingDeleteFolder, setIsConfirmingDeleteFolder] = useState(false);
  const [quickSubfolderName, setQuickSubfolderName] = useState('');

  // Top + Bottom synced horizontal scrollbar refs
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const tableElRef = useRef<HTMLTableElement | null>(null);
  const syncLockRef = useRef<'top' | 'table' | null>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(1120);

  useEffect(() => {
    setIsEditingFolder(false);
    setIsConfirmingDeleteFolder(false);
  }, [activeFolderId]);

  const isZh = studyLanguage === 'zh';
  const parentFolders = useMemo(() => folders.filter((f) => Boolean(f.isParent)), [folders]);
  const subfolders = useMemo(() => folders.filter((f) => !f.isParent), [folders]);
  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId),
    [folders, activeFolderId]
  );
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const activeParentFolder = activeFolder?.parentId
    ? folderMap.get(activeFolder.parentId)
    : undefined;
  const isViewingEmptyParent = Boolean(activeFolder?.isParent);

  const visibleWords = useMemo(() => {
    if (isViewingEmptyParent) return [];
    const q = searchTerm.trim().toLowerCase();
    return words.filter((w) => {
      const matchesFolder = activeFolderId === 'all' || w.folderId === activeFolderId;
      if (!matchesFolder) return false;
      if (!q) return true;
      return (
        w.english.toLowerCase().includes(q) ||
        w.ipa.toLowerCase().includes(q) ||
        w.vietnamese.toLowerCase().includes(q) ||
        w.example.toLowerCase().includes(q) ||
        w.synonyms.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [words, activeFolderId, searchTerm, isViewingEmptyParent]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleIds = useMemo(() => visibleWords.map((w) => w.id), [visibleWords]);
  const selectedVisibleCount = useMemo(
    () => visibleIds.filter((id) => selectedSet.has(id)).length,
    [visibleIds, selectedSet]
  );
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const targetAddFolderId = useMemo(() => {
    if (activeFolder?.isParent) return '';
    if (activeFolderId === 'all') return subfolders[0]?.id || '';
    return activeFolderId;
  }, [activeFolder, activeFolderId, subfolders]);

  // Keep top scrollbar width matched to the real <table> scrollWidth
  useEffect(() => {
    const tableNode = tableElRef.current;
    if (!tableNode) return;

    const updateWidth = () => {
      const w = tableNode.scrollWidth;
      if (w > 0) setTableScrollWidth(w);
    };

    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(tableNode);
    return () => ro.disconnect();
  }, [visibleWords.length, mobileLayout, studyLanguage]);

  const handleTopScroll = useCallback(() => {
    if (syncLockRef.current === 'table') return;
    const topEl = topScrollRef.current;
    const tableEl = tableScrollRef.current;
    if (!topEl || !tableEl) return;
    syncLockRef.current = 'top';
    tableEl.scrollLeft = topEl.scrollLeft;
    requestAnimationFrame(() => {
      if (syncLockRef.current === 'top') syncLockRef.current = null;
    });
  }, []);

  const handleTableScroll = useCallback(() => {
    if (syncLockRef.current === 'top') return;
    const topEl = topScrollRef.current;
    const tableEl = tableScrollRef.current;
    if (!topEl || !tableEl) return;
    syncLockRef.current = 'table';
    topEl.scrollLeft = tableEl.scrollLeft;
    requestAnimationFrame(() => {
      if (syncLockRef.current === 'table') syncLockRef.current = null;
    });
  }, []);

  const nudgeHorizontalScroll = useCallback((delta: number) => {
    const tableEl = tableScrollRef.current;
    if (!tableEl) return;
    tableEl.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const showToast = useCallback((msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const handleAutoLookup = useCallback(
    async (word: VocabWord) => {
      const term = word.english.trim();
      if (!term && !word.ipa.trim()) {
        showToast(
          isZh
            ? 'Nhập chữ Hán hoặc Pinyin dạng số (VD: ni3 hao3) trước nhé.'
            : 'Enter an English word first before looking up IPA.'
        );
        return;
      }

      if (isZh) {
        const zhRes = lookupChineseWordHelper(term, word.ipa);
        if (!zhRes) {
          showToast(
            'Hãy nhập Pinyin dạng số (VD: ni3 hao3) hoặc dùng thanh dấu thanh Pinyin bên dưới.'
          );
          return;
        }
        const updates: Partial<VocabWord> = {};
        if (zhRes.pinyin) updates.ipa = zhRes.pinyin;
        if (word.synonyms.length === 0 && zhRes.synonyms && zhRes.synonyms.length > 0) {
          updates.synonyms = zhRes.synonyms.slice(0, 3);
        }
        onUpdateWord(word.id, updates);
        showToast(
          `Đã cập nhật Pinyin${updates.synonyms ? ' & từ đồng nghĩa' : ''} cho "${
            term || zhRes.pinyin
          }".`
        );
        return;
      }

      setLookupLoadingId(word.id);
      try {
        const result = await lookupEnglishWord(term);
        if (!result) {
          showToast(
            `No dictionary entry found for "${term}". You can type or insert IPA symbols directly.`
          );
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
    },
    [isZh, onUpdateWord, showToast]
  );

  const handleInsertPhoneticSymbol = useCallback(
    (word: VocabWord, symbol: string) => {
      const current = word.ipa || '';
      const next = isZh ? `${current}${symbol}` : current ? `${current}${symbol}` : `/${symbol}/`;
      onUpdateWord(word.id, { ipa: next });
    },
    [isZh, onUpdateWord]
  );

  const handleSynonymDraftChange = useCallback((wordId: string, value: string) => {
    setSynonymDrafts((prev) => ({ ...prev, [wordId]: value }));
  }, []);

  const handleAddSynonym = useCallback(
    (word: VocabWord) => {
      const draft = (synonymDrafts[word.id] || '').trim().replace(/,$/, '');
      if (!draft) return;
      if (!word.synonyms.some((s) => s.toLowerCase() === draft.toLowerCase())) {
        onUpdateWord(word.id, { synonyms: [...word.synonyms, draft] });
      }
      setSynonymDrafts((prev) => ({ ...prev, [word.id]: '' }));
    },
    [synonymDrafts, onUpdateWord]
  );

  const handleRemoveSynonym = useCallback(
    (word: VocabWord, synToRemove: string) => {
      onUpdateWord(word.id, {
        synonyms: word.synonyms.filter((s) => s !== synToRemove),
      });
    },
    [onUpdateWord]
  );

  const handleCellPaste = useCallback(
    async (e: React.ClipboardEvent, wordId: string) => {
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
    },
    [onUpdateWord, showToast]
  );

  const handleTogglePhonetic = useCallback((wordId: string) => {
    setActivePhoneticWordId((prev) => (prev === wordId ? null : wordId));
  }, []);

  const pickerWord = words.find((w) => w.id === imagePickerWordId) || null;
  const folderColor = activeFolder
    ? FOLDER_COLOR_STYLES[activeFolder.color] || FOLDER_COLOR_STYLES.lavender
    : null;

  const quickSymbols = isZh ? PINYIN_TONE_SYMBOLS : IPA_QUICK_SYMBOLS;

  return (
    <section className="flex-1 min-w-0 w-full space-y-4">
      {/* Top Folder Header & Search */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            {isEditingFolder && activeFolder ? (
              <div className="p-3.5 rounded-xl bg-[#FAF7FD] border border-[#D5CEF5] space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={folderEditName}
                    onChange={(e) => setFolderEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && folderEditName.trim()) {
                        onUpdateFolder(activeFolder.id, {
                          name: folderEditName.trim(),
                          description: folderEditDesc.trim(),
                          color: folderEditColor,
                        });
                        setIsEditingFolder(false);
                        showToast('Đã cập nhật tên thư mục.');
                      }
                      if (e.key === 'Escape') setIsEditingFolder(false);
                    }}
                    placeholder="Tên thư mục..."
                    aria-label="Edit active folder name"
                    autoFocus
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#867C96]/25 text-sm font-bold text-[#2B2438]"
                  />
                  <input
                    type="text"
                    value={folderEditDesc}
                    onChange={(e) => setFolderEditDesc(e.target.value)}
                    placeholder="Ghi chú ngắn (tùy chọn)..."
                    aria-label="Edit active folder description"
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#867C96]/25 text-xs text-[#5E556E]"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {FOLDER_COLOR_OPTIONS.map((c) => {
                      const cStyle = FOLDER_COLOR_STYLES[c];
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFolderEditColor(c)}
                          aria-label={cStyle.label}
                          className={`p-1 rounded-lg cursor-pointer transition-transform ${
                            folderEditColor === c
                              ? 'ring-2 ring-[#6F5C96] bg-white scale-110'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          <Folder className={`w-4 h-4 ${cStyle.icon}`} />
                        </button>
                      );
                    })}
                    {!activeFolder.isParent && parentFolders.length > 0 && (
                      <select
                        value={folderEditParentId}
                        onChange={(e) => setFolderEditParentId(e.target.value)}
                        aria-label="Move subfolder to parent"
                        className="ml-1 px-2 py-1 rounded-lg bg-white border border-[#867C96]/25 text-xs font-semibold text-[#3F3163]"
                      >
                        {parentFolders.map((p) => (
                          <option key={p.id} value={p.id}>
                            Thư mục lớn: {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingFolder(false)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-[#5E556E] hover:bg-white cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = folderEditName.trim();
                        if (!trimmed) return;
                        onUpdateFolder(activeFolder.id, {
                          name: trimmed,
                          description: folderEditDesc.trim(),
                          color: folderEditColor,
                          ...(activeFolder.isParent
                            ? {}
                            : { parentId: folderEditParentId || undefined }),
                        });
                        setIsEditingFolder(false);
                        showToast('Đã cập nhật thư mục.');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#6F5C96] text-white hover:bg-[#5E4C84] cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Lưu</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : isConfirmingDeleteFolder && activeFolder ? (
              <div className="p-3.5 rounded-xl bg-[#FFF2F0] border border-[#F29C94] flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs sm:text-sm font-semibold text-[#632F2D]">
                  {activeFolder.isParent
                    ? `Xóa thư mục lớn "${activeFolder.name}" cùng toàn bộ thư mục con và từ vựng bên trong?`
                    : `Xóa thư mục "${activeFolder.name}" và toàn bộ ${
                        words.filter((w) => w.folderId === activeFolder.id).length
                      } từ bên trong?`}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDeleteFolder(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5E556E] bg-white border border-[#867C96]/20 cursor-pointer"
                  >
                    Giữ lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteFolder(activeFolder.id);
                      setIsConfirmingDeleteFolder(false);
                      showToast('Đã xóa thư mục.');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#C94C4C] hover:bg-[#B03B3B] cursor-pointer"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeParentFolder && (
                  <p className="text-xs font-bold text-[#6F5C96] mb-0.5 flex items-center gap-1">
                    <span>{activeParentFolder.name}</span>
                    <span aria-hidden="true">›</span>
                    <span>Thư mục con</span>
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {folderColor ? (
                    <Folder className={`w-5 h-5 shrink-0 ${folderColor.icon}`} />
                  ) : (
                    <Layers className="w-4.5 h-4.5 text-[#6F5C96] shrink-0" />
                  )}
                  <h1 className="text-xl sm:text-2xl font-bold text-[#2B2438] truncate">
                    {activeFolder
                      ? activeFolder.name
                      : isZh
                      ? 'Tất cả thư mục Tiếng Trung'
                      : 'All Topic Folders'}
                  </h1>
                  {activeFolder && (
                    <div className="inline-flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFolderEditName(activeFolder.name);
                          setFolderEditDesc(activeFolder.description || '');
                          setFolderEditColor(activeFolder.color);
                          setFolderEditParentId(
                            activeFolder.parentId || parentFolders[0]?.id || ''
                          );
                          setIsEditingFolder(true);
                          setIsConfirmingDeleteFolder(false);
                        }}
                        title="Sửa tên, ghi chú hoặc màu thư mục"
                        aria-label={`Edit folder ${activeFolder.name}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F3F0FC] text-[#4D3B73] hover:bg-[#E6E6FA] text-xs font-bold cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsConfirmingDeleteFolder(true);
                          setIsEditingFolder(false);
                        }}
                        title="Xóa thư mục này"
                        aria-label={`Delete folder ${activeFolder.name}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FFF2F0] text-[#9B4848] hover:bg-[#FFE4E1] text-xs font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-[#5E556E] mt-1">
                  {activeFolder?.description ||
                    (isZh
                      ? 'Xem và chọn từ vựng Tiếng Trung (汉字 · Pinyin) trên tất cả các chủ đề.'
                      : 'Review and select words across all your personal vocabulary folders.')}
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-[#867C96] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isZh ? 'Tìm chữ Hán, Pinyin, nghĩa...' : 'Search words...'}
                aria-label="Search vocabulary words"
                className="w-full sm:w-56 pl-9 pr-3 py-2 rounded-xl bg-white border border-[#867C96]/20 text-sm text-[#2B2438] placeholder:text-[#867C96]"
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
                <span>{isZh ? 'Thêm từ mới' : 'Add Word'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Select & Study Launcher Action Bar */}
        <div className="pt-3 border-t border-[#867C96]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
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

            {/* Mobile Table vs Compact Card View Switcher */}
            <div
              className="md:hidden inline-flex p-0.5 rounded-xl bg-[#F3F0FC] border border-[#D5CEF5] ml-auto"
              role="group"
              aria-label="Mobile layout switch"
            >
              <button
                type="button"
                onClick={() => setMobileLayout('table')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  mobileLayout === 'table'
                    ? 'bg-white text-[#2B2438] shadow-2xs'
                    : 'text-[#5E556E]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Bảng</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileLayout('cards')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  mobileLayout === 'cards'
                    ? 'bg-white text-[#2B2438] shadow-2xs'
                    : 'text-[#5E556E]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thẻ</span>
              </button>
            </div>

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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E0F2F1] text-[#1F4F4B] border border-[#9ADCD5] hover:bg-[#CEEBE8] disabled:opacity-45 disabled:cursor-not-allowed text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer"
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C5CBF] to-[#C86D85] text-white hover:opacity-95 disabled:opacity-45 disabled:cursor-not-allowed text-xs sm:text-sm font-bold shadow-xs transition-opacity whitespace-nowrap cursor-pointer"
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

      {/* Empty State or Empty Parent Folder Prompt */}
      {isViewingEmptyParent && activeFolder ? (
        <div className="glass-card rounded-2xl p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F3F0FC] flex items-center justify-center mx-auto">
            <Folder className={`w-6 h-6 ${folderColor?.icon || 'text-[#6F5C96]'}`} />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-[#2B2438]">
              "{activeFolder.name}" là thư mục lớn (chỉ chứa thư mục con)
            </p>
            <p className="text-sm text-[#5E556E]">
              Thư mục lớn không chứa từ vựng trực tiếp. Hãy tạo thư mục con đầu tiên bên trong để bắt đầu thêm từ vựng.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = quickSubfolderName.trim();
              if (!trimmed) return;
              onCreateFolder(trimmed, '', activeFolder.color, {
                isParent: false,
                parentId: activeFolder.id,
              });
              setQuickSubfolderName('');
              showToast(`Đã tạo thư mục con "${trimmed}".`);
            }}
            className="max-w-md mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <input
              type="text"
              value={quickSubfolderName}
              onChange={(e) => setQuickSubfolderName(e.target.value)}
              placeholder={isZh ? 'VD: Bài 1 - Chào hỏi' : 'VD: Unit 1 - Core Words'}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#867C96]/25 text-sm text-[#2B2438]"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#6F5C96] text-white text-sm font-bold hover:bg-[#5E4C84] cursor-pointer shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tạo thư mục con</span>
            </button>
          </form>
        </div>
      ) : visibleWords.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-3">
          <p className="text-base font-bold text-[#2B2438]">
            {searchTerm ? 'No matching vocabulary words found.' : 'This topic folder has no words yet.'}
          </p>
          <p className="text-sm text-[#5E556E]">
            {searchTerm
              ? 'Try clearing your search filter or check another topic folder.'
              : 'Click "+ Add Word" above to add your first vocabulary entry.'}
          </p>
          {!searchTerm && targetAddFolderId && (
            <button
              type="button"
              onClick={() => onAddWord(targetAddFolderId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6F5C96] text-white text-sm font-bold hover:bg-[#5E4C84] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isZh ? 'Thêm từ đầu tiên' : 'Add First Word'}</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 7-Column Interactive Table with Top + Bottom Synced Horizontal Scrollbar */}
          <div
            className={`${
              mobileLayout === 'table' ? 'block' : 'hidden md:block'
            } glass-card rounded-2xl overflow-hidden`}
          >
            {/* Top Synchronized Horizontal Scrollbar + Nudge Buttons */}
            <div className="px-3 py-2 bg-[#FAF7FD] border-b border-[#867C96]/12 flex items-center gap-2">
              <button
                type="button"
                onClick={() => nudgeHorizontalScroll(-260)}
                aria-label="Scroll table left"
                title="Cuộn bảng sang trái"
                className="p-1.5 rounded-lg bg-white border border-[#D5CEF5] text-[#4D3B73] hover:bg-[#F3F0FC] shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#5E556E] px-0.5">
                  <span>Kéo thanh cuộn ngang để xem đủ 7 cột</span>
                  <span className="hidden sm:inline text-[#867C96]">
                    Cột STT được ghim cố định
                  </span>
                </div>
                <div
                  ref={topScrollRef}
                  onScroll={handleTopScroll}
                  className="vocab-table-scroll w-full"
                  aria-label="Table horizontal scrollbar"
                >
                  <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => nudgeHorizontalScroll(260)}
                aria-label="Scroll table right"
                title="Cuộn bảng sang phải"
                className="p-1.5 rounded-lg bg-white border border-[#D5CEF5] text-[#4D3B73] hover:bg-[#F3F0FC] shrink-0 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table Container with Always-Visible Bottom Horizontal Scrollbar */}
            <div
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="vocab-table-scroll w-full"
            >
              <table ref={tableElRef} className="w-full min-w-[1060px] text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#F3F0FC] via-[#FFF2F0] to-[#EEF9F8] border-b border-[#867C96]/15 text-xs font-bold text-[#3F3163]">
                    <th className="sticky left-0 z-10 bg-[#F3F0FC] border-r border-[#867C96]/12 py-3.5 pl-4 pr-2.5 w-[72px] whitespace-nowrap">
                      No.
                    </th>
                    <th className="py-3.5 px-2.5 min-w-[160px]">
                      {isZh ? 'Tiếng Trung (汉字)' : 'English Word'}
                    </th>
                    <th className="py-3.5 px-2.5 min-w-[175px]">
                      {isZh ? 'Pinyin (Phiên âm)' : 'IPA'}
                    </th>
                    <th className="py-3.5 px-2.5 min-w-[180px]">Vietnamese Meaning</th>
                    <th className="py-3.5 px-2.5 min-w-[245px]">
                      {isZh ? 'Câu ví dụ (中文)' : 'Example Sentence'}
                    </th>
                    <th className="py-3.5 px-2.5 min-w-[170px]">
                      {isZh ? 'Từ đồng nghĩa (中文)' : 'English Synonyms'}
                    </th>
                    <th className="py-3.5 pl-2.5 pr-4 min-w-[145px]">Vivid Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#867C96]/12 text-sm">
                  {visibleWords.map((word, index) => (
                    <VocabTableRow
                      key={word.id}
                      word={word}
                      index={index}
                      isSelected={selectedSet.has(word.id)}
                      isZh={isZh}
                      speechAccent={speechAccent}
                      folderName={folderMap.get(word.folderId)?.name}
                      showFolderBadge={activeFolderId === 'all'}
                      isPhoneticOpen={activePhoneticWordId === word.id}
                      isLookupLoading={lookupLoadingId === word.id}
                      synonymDraft={synonymDrafts[word.id] || ''}
                      quickSymbols={quickSymbols}
                      onToggleSelect={onToggleSelect}
                      onUpdateWord={onUpdateWord}
                      onDeleteWord={onDeleteWord}
                      onTogglePhonetic={handleTogglePhonetic}
                      onFocusPhonetic={setActivePhoneticWordId}
                      onAutoLookup={handleAutoLookup}
                      onInsertPhoneticSymbol={handleInsertPhoneticSymbol}
                      onSynonymDraftChange={handleSynonymDraftChange}
                      onAddSynonym={handleAddSynonym}
                      onRemoveSynonym={handleRemoveSynonym}
                      onCellPaste={handleCellPaste}
                      onOpenImagePicker={setImagePickerWordId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Compact Card List (Alternative View on Phone) */}
          {mobileLayout === 'cards' && (
            <div className="md:hidden space-y-3">
              {visibleWords.map((word, index) => (
                <VocabMobileCard
                  key={word.id}
                  word={word}
                  index={index}
                  isSelected={selectedSet.has(word.id)}
                  isZh={isZh}
                  speechAccent={speechAccent}
                  synonymDraft={synonymDrafts[word.id] || ''}
                  onToggleSelect={onToggleSelect}
                  onUpdateWord={onUpdateWord}
                  onDeleteWord={onDeleteWord}
                  onAutoLookup={handleAutoLookup}
                  onSynonymDraftChange={handleSynonymDraftChange}
                  onAddSynonym={handleAddSynonym}
                  onRemoveSynonym={handleRemoveSynonym}
                  onOpenImagePicker={setImagePickerWordId}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Image Picker Modal (Lazy-loaded on demand) */}
      {Boolean(pickerWord) && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </section>
  );
});
VocabTable.displayName = 'VocabTable';

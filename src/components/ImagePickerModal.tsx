import React, { useEffect, useState } from 'react';
import {
  ClipboardPaste,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { CURATED_STICKERS } from '../data/seedData';
import {
  compressImageToDataUrl,
  searchWikimediaImages,
  type WikimediaImageResult,
} from '../utils/imageUtils';

interface ImagePickerModalProps {
  isOpen: boolean;
  initialQuery: string;
  wordLabel: string;
  currentImageUrl?: string;
  onSelectImage: (imageUrl: string) => void;
  onRemoveImage: () => void;
  onClose: () => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  isOpen,
  initialQuery,
  wordLabel,
  currentImageUrl,
  onSelectImage,
  onRemoveImage,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'search' | 'paste'>('stickers');
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<WikimediaImageResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
      setResults([]);
      setSearchError(null);
      setPasteStatus(null);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const items = await searchWikimediaImages(q);
      setResults(items);
      if (items.length === 0) {
        setSearchError(`No Wikimedia illustrations found for "${q}". Try a simpler keyword or pick a sticker!`);
      }
    } catch {
      setSearchError('Could not reach Wikimedia search right now. You can use Curated Stickers or paste an image with Ctrl+V.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;
        setPasteStatus('Compressing pasted image...');
        try {
          const dataUrl = await compressImageToDataUrl(file);
          onSelectImage(dataUrl);
          onClose();
        } catch {
          setPasteStatus('Could not process the pasted image.');
        }
        return;
      }
    }
    setPasteStatus('No image found in clipboard. Copy an image first, then press Ctrl+V / Cmd+V.');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      onSelectImage(dataUrl);
      onClose();
    } catch {
      setPasteStatus('Unsupported image file.');
    }
  };

  const filteredStickers = searchQuery.trim()
    ? CURATED_STICKERS.filter(
        (s) =>
          s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.keywords.some((k) => k.includes(searchQuery.toLowerCase()))
      )
    : CURATED_STICKERS;

  const displayedStickers = filteredStickers.length > 0 ? filteredStickers : CURATED_STICKERS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2438]/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-picker-title"
    >
      <div className="w-full max-w-2xl bg-[#FFFDF9] rounded-2xl border border-[#D5CEF5] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#E6E6FA]/70 via-[#FFE4E1]/50 to-[#E0F2F1]/70 border-b border-[#867C96]/15 flex items-center justify-between gap-4">
          <div>
            <h3 id="image-picker-title" className="text-lg font-bold text-[#2B2438]">
              Choose Vivid Image {wordLabel ? `for "${wordLabel}"` : ''}
            </h3>
            <p className="text-xs text-[#5E556E]">
              Pick a curated pastel sticker, search Wikimedia Commons, or paste directly with Ctrl+V.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image picker"
            className="p-2 rounded-xl bg-white/80 text-[#5E556E] hover:text-[#2B2438] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-[#F3F0FC] border border-[#D5CEF5]">
            <button
              type="button"
              onClick={() => setActiveTab('stickers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'stickers'
                  ? 'bg-white text-[#3F3163] shadow-xs'
                  : 'text-[#5E556E] hover:text-[#2B2438]'
              }`}
            >
              Pastel Stickers
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('search');
                if (results.length === 0 && searchQuery.trim()) {
                  handleSearch();
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-white text-[#3F3163] shadow-xs'
                  : 'text-[#5E556E] hover:text-[#2B2438]'
              }`}
            >
              Wikimedia Search
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white text-[#3F3163] shadow-xs'
                  : 'text-[#5E556E] hover:text-[#2B2438]'
              }`}
            >
              Paste / Upload
            </button>
          </div>

          {currentImageUrl && (
            <button
              type="button"
              onClick={() => {
                onRemoveImage();
                onClose();
              }}
              className="text-xs font-bold text-[#B03B3B] hover:underline cursor-pointer"
            >
              Remove current image
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'stickers' && (
            <>
              <div className="flex items-center gap-2 text-xs text-[#5E556E]">
                <Sparkles className="w-3.5 h-3.5 text-[#6F5C96]" />
                <span>Curated educational illustrations — works instantly offline and in flashcards.</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {displayedStickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => {
                      onSelectImage(sticker.url);
                      onClose();
                    }}
                    className="group rounded-xl p-2 bg-white border border-[#867C96]/20 hover:border-[#7C5CBF] hover:shadow-md transition-all text-center cursor-pointer"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#FAF7FD] mb-2">
                      <img
                        src={sticker.url}
                        alt={sticker.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <span className="block text-[11px] font-bold text-[#2B2438] truncate">
                      {sticker.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === 'search' && (
            <>
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#867C96] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Wikimedia Commons (e.g. rainforest, coffee, teamwork)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#867C96]/25 text-sm text-[#2B2438]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2.5 rounded-xl bg-[#6F5C96] text-white text-sm font-bold hover:bg-[#5E4C84] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {isSearching && (
                <div className="py-10 flex flex-col items-center justify-center text-sm text-[#5E556E] gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#6F5C96]" />
                  <span>Searching Wikimedia Commons illustrations...</span>
                </div>
              )}

              {!isSearching && searchError && (
                <div className="p-4 rounded-xl bg-[#FFF2F0] border border-[#F7CBC6] text-xs font-semibold text-[#632F2D]">
                  {searchError}
                </div>
              )}

              {!isSearching && results.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {results.map((item, idx) => (
                    <button
                      key={`${item.url}-${idx}`}
                      type="button"
                      onClick={() => {
                        onSelectImage(item.thumbUrl);
                        onClose();
                      }}
                      className="group rounded-xl p-2 bg-white border border-[#867C96]/20 hover:border-[#7C5CBF] hover:shadow-md transition-all text-left cursor-pointer"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-[#FAF7FD] mb-1.5 flex items-center justify-center">
                        <img
                          src={item.thumbUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <span className="block text-[11px] font-semibold text-[#5E556E] truncate">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div
                tabIndex={0}
                onPaste={handlePaste}
                className="p-8 rounded-2xl border-2 border-dashed border-[#B9AEE8] bg-[#F3F0FC]/50 text-center focus:border-[#6F5C96] focus:bg-[#F3F0FC] transition-colors cursor-pointer"
              >
                <ClipboardPaste className="w-8 h-8 text-[#6F5C96] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#2B2438]">
                  Click here & press Ctrl+V (or Cmd+V) to paste any copied image
                </p>
                <p className="text-xs text-[#5E556E] mt-1">
                  Automatically compressed to save neatly in your vocabulary notebook.
                </p>
                {pasteStatus && (
                  <p className="mt-3 text-xs font-bold text-[#3F3163]">{pasteStatus}</p>
                )}
              </div>

              <div className="flex items-center justify-center">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#867C96]/25 text-xs font-bold text-[#2B2438] hover:bg-[#FAF7FD] cursor-pointer">
                  <Upload className="w-4 h-4 text-[#6F5C96]" />
                  <span>Or upload an image file from device</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Check,
  Folder,
  FolderPlus,
  Layers,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { FOLDER_COLOR_STYLES } from '../data/seedData';
import type { FolderColor, StudyLanguage, TopicFolder, VocabWord } from '../types/vocab';

interface FolderSidebarProps {
  studyLanguage: StudyLanguage;
  folders: TopicFolder[];
  words: VocabWord[];
  activeFolderId: string; // 'all' or folder.id
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string, description: string, color: FolderColor) => void;
  onUpdateFolder: (
    id: string,
    updates: Partial<Pick<TopicFolder, 'name' | 'description' | 'color'>>
  ) => void;
  onDeleteFolder: (id: string) => void;
}

const COLOR_OPTIONS: FolderColor[] = ['lavender', 'blush', 'mint', 'cream', 'sky', 'peach'];

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
  studyLanguage,
  folders,
  words,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState<FolderColor>('lavender');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<FolderColor>('lavender');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const countWordsInFolder = (folderId: string) =>
    words.filter((w) => w.folderId === folderId).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateFolder(trimmed, newDesc.trim(), newColor);
    setNewName('');
    setNewDesc('');
    setNewColor('lavender');
    setIsCreating(false);
  };

  const startEditing = (folder: TopicFolder) => {
    setEditingId(folder.id);
    setEditName(folder.name);
    setEditColor(folder.color);
    setConfirmDeleteId(null);
  };

  const saveEditing = (id: string) => {
    const trimmed = editName.trim();
    if (trimmed) {
      onUpdateFolder(id, { name: trimmed, color: editColor });
    }
    setEditingId(null);
  };

  return (
    <aside className="w-full lg:w-[290px] shrink-0 space-y-4">
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#2B2438]">
              {studyLanguage === 'zh' ? 'Chủ đề Tiếng Trung' : 'Topic Folders'}
            </h2>
            <p className="text-xs text-[#5E556E] tabular-nums">
              {folders.length} topics · {words.length} words
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#E6E6FA] text-[#3F3163] hover:bg-[#D8D3F8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>

        {/* Create Folder Form */}
        {isCreating && (
          <form
            onSubmit={handleCreateSubmit}
            className="mb-4 p-3.5 rounded-xl bg-[#FFFDF9] border border-[#D5CEF5] space-y-3"
          >
            <div>
              <label className="block text-xs font-bold text-[#3F3163] mb-1">
                Folder Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  studyLanguage === 'zh' ? 'VD: HSK 3 - Mua sắm' : 'e.g. IELTS Technology'
                }
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#867C96]/25 text-sm text-[#2B2438] placeholder:text-[#867C96]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3F3163] mb-1">
                Short Note (Optional)
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Topic focus or unit name"
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#867C96]/25 text-xs text-[#2B2438] placeholder:text-[#867C96]"
              />
            </div>
            <div>
              <span className="block text-xs font-bold text-[#3F3163] mb-1.5">
                Pastel Color
              </span>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    aria-label={FOLDER_COLOR_STYLES[c].label}
                    title={FOLDER_COLOR_STYLES[c].label}
                    className={`w-6 h-6 rounded-full ${FOLDER_COLOR_STYLES[c].swatch} transition-transform cursor-pointer flex items-center justify-center ${
                      newColor === c
                        ? 'ring-2 ring-offset-2 ring-[#6F5C96] scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {newColor === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5E556E] hover:bg-[#F3F0FC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#6F5C96] text-white hover:bg-[#5E4C84] cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* All Topics Cross-Folder Button */}
        <button
          type="button"
          onClick={() => onSelectFolder('all')}
          className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl mb-2 text-left transition-all duration-200 cursor-pointer ${
            activeFolderId === 'all'
              ? 'bg-gradient-to-r from-[#E6E6FA]/85 via-[#FFE4E1]/70 to-[#E0F2F1]/85 border border-[#B9AEE8] text-[#2B2438] shadow-xs'
              : 'hover:bg-white/80 border border-transparent text-[#5E556E]'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Layers className="w-4 h-4 text-[#6F5C96] shrink-0" />
            <span className="text-sm font-bold truncate">
              {studyLanguage === 'zh' ? 'Tất cả chủ đề (中文)' : 'All Folders'}
            </span>
          </span>
          <span className="text-xs font-bold font-mono-num text-[#5E556E] shrink-0">
            {words.length}
          </span>
        </button>

        <div className="h-px bg-[#867C96]/12 my-2.5" />

        {/* Individual Topic Folders */}
        <div className="space-y-1.5">
          {folders.map((folder) => {
            const style = FOLDER_COLOR_STYLES[folder.color] || FOLDER_COLOR_STYLES.lavender;
            const isActive = activeFolderId === folder.id;
            const wordCount = countWordsInFolder(folder.id);

            if (editingId === folder.id) {
              return (
                <div
                  key={folder.id}
                  className="p-3 rounded-xl bg-white border border-[#B9AEE8] space-y-2.5"
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(folder.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#867C96]/30 text-sm font-semibold text-[#2B2438]"
                    autoFocus
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          aria-label={FOLDER_COLOR_STYLES[c].label}
                          className={`w-5 h-5 rounded-full ${FOLDER_COLOR_STYLES[c].swatch} cursor-pointer ${
                            editColor === c ? 'ring-2 ring-offset-1 ring-[#6F5C96]' : 'opacity-75'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg text-[#5E556E] hover:bg-[#F3F0FC] cursor-pointer"
                        aria-label="Cancel rename"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEditing(folder.id)}
                        className="p-1.5 rounded-lg bg-[#6F5C96] text-white hover:bg-[#5E4C84] cursor-pointer"
                        aria-label="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (confirmDeleteId === folder.id) {
              return (
                <div
                  key={folder.id}
                  className="p-3 rounded-xl bg-[#FFF2F0] border border-[#F29C94] space-y-2"
                >
                  <p className="text-xs font-semibold text-[#632F2D]">
                    Delete "{folder.name}" and its {wordCount} words?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#5E556E] bg-white border border-[#867C96]/20 cursor-pointer"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteFolder(folder.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-[#C94C4C] hover:bg-[#B03B3B] cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={folder.id}
                className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? `${style.activeBg} ${style.border} ${style.text} shadow-xs`
                    : `bg-white/45 border-transparent hover:${style.bg} hover:${style.border} text-[#2B2438]`
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectFolder(folder.id)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.swatch}`} />
                  <Folder className="w-4 h-4 shrink-0 opacity-75" />
                  <span className="text-sm font-bold truncate">{folder.name}</span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-bold font-mono-num text-[#5E556E] px-1">
                    {wordCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEditing(folder)}
                    aria-label={`Rename ${folder.name}`}
                    title="Rename or recolor folder"
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-[#5E556E] hover:text-[#2B2438] hover:bg-white/80 transition-opacity cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {folders.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(folder.id)}
                      aria-label={`Delete ${folder.name}`}
                      title="Delete folder"
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-[#9B4848] hover:bg-[#FFE4E1] transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warm Study Card */}
      <div className="hidden lg:block glass-card rounded-2xl p-4 overflow-hidden">
        <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-[#F3F0FC]">
          <img
            src="/src/assets/images/brand_notebook_illustration_1794884411584.jpg"
            alt="Ms. Thúy pastel study notebook with lavender sprigs and teacup"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xs font-bold text-[#3F3163]">Ms. Thúy’s Study Tip</p>
        <p className="text-xs text-[#5E556E] mt-1 leading-relaxed">
          {studyLanguage === 'zh' ? (
            <>
              Trong bảng Tiếng Trung, bạn có thể gõ Pinyin dạng số như{' '}
              <strong className="text-[#2B2438]">ni3 hao3</strong> rồi bấm biểu tượng cây đũa thần để tự chuyển thành{' '}
              <strong className="text-[#2B2438]">nǐ hǎo</strong>!
            </>
          ) : (
            <>
              Check the words you want to review, then click{' '}
              <strong className="text-[#2B2438]">Create Flashcards</strong> or{' '}
              <strong className="text-[#2B2438]">Start Smart Quiz</strong> to practice all 4 memory skills.
            </>
          )}
        </p>
      </div>
    </aside>
  );
};

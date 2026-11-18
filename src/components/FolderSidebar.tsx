import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
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
}

const COLOR_OPTIONS: FolderColor[] = ['lavender', 'blush', 'mint', 'cream', 'sky', 'peach'];

export const FolderSidebar: React.FC<FolderSidebarProps> = memo(
  ({
    studyLanguage,
    folders,
    words,
    activeFolderId,
    onSelectFolder,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
  }) => {
    const parentFolders = useMemo(() => folders.filter((f) => Boolean(f.isParent)), [folders]);
    const parentIdSet = useMemo(() => new Set(parentFolders.map((p) => p.id)), [parentFolders]);

    const subfoldersByParent = useMemo(() => {
      const map = new Map<string, TopicFolder[]>();
      for (const p of parentFolders) {
        map.set(p.id, []);
      }
      for (const f of folders) {
        if (!f.isParent && f.parentId && parentIdSet.has(f.parentId)) {
          map.get(f.parentId)!.push(f);
        }
      }
      return map;
    }, [folders, parentFolders, parentIdSet]);

    const orphanSubfolders = useMemo(
      () => folders.filter((f) => !f.isParent && (!f.parentId || !parentIdSet.has(f.parentId))),
      [folders, parentIdSet]
    );

    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
      const init: Record<string, boolean> = {};
      for (const p of parentFolders) init[p.id] = true;
      return init;
    });

    // Ensure newly added parents & the active subfolder's parent stay expanded
    useEffect(() => {
      setExpandedIds((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const p of parentFolders) {
          if (next[p.id] === undefined) {
            next[p.id] = true;
            changed = true;
          }
        }
        const active = folders.find((f) => f.id === activeFolderId);
        if (active?.parentId && !next[active.parentId]) {
          next[active.parentId] = true;
          changed = true;
        }
        if (active?.isParent && !next[active.id]) {
          next[active.id] = true;
          changed = true;
        }
        return changed ? next : prev;
      });
    }, [parentFolders, folders, activeFolderId]);

    // Create Folder Form State
    const [isCreating, setIsCreating] = useState(false);
    const [createAsParent, setCreateAsParent] = useState(false);
    const [createParentId, setCreateParentId] = useState<string>('');
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newColor, setNewColor] = useState<FolderColor>('lavender');

    // Edit & Delete State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editColor, setEditColor] = useState<FolderColor>('lavender');
    const [editParentId, setEditParentId] = useState<string>('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const wordCountByFolder = useMemo(() => {
      const counts = new Map<string, number>();
      for (const w of words) {
        counts.set(w.folderId, (counts.get(w.folderId) || 0) + 1);
      }
      return counts;
    }, [words]);

    const getSubfolderWordCount = (folderId: string) => wordCountByFolder.get(folderId) || 0;

    const getParentTotalWords = (parentId: string) => {
      const children = subfoldersByParent.get(parentId) || [];
      return children.reduce((sum, child) => sum + getSubfolderWordCount(child.id), 0);
    };

    const openCreateModal = (asParent: boolean, targetParentId?: string) => {
      setCreateAsParent(asParent || parentFolders.length === 0);
      setCreateParentId(targetParentId || parentFolders[0]?.id || '');
      setNewName('');
      setNewDesc('');
      setNewColor('lavender');
      setIsCreating(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newName.trim();
      if (!trimmed) return;
      const shouldBeParent = createAsParent || parentFolders.length === 0;
      const resolvedParentId = shouldBeParent
        ? undefined
        : createParentId || parentFolders[0]?.id;
      onCreateFolder(trimmed, newDesc.trim(), newColor, {
        isParent: shouldBeParent,
        parentId: resolvedParentId,
      });
      if (resolvedParentId) {
        setExpandedIds((prev) => ({ ...prev, [resolvedParentId]: true }));
      }
      setNewName('');
      setNewDesc('');
      setNewColor('lavender');
      setIsCreating(false);
    };

    const startEditing = (folder: TopicFolder) => {
      setEditingId(folder.id);
      setEditName(folder.name);
      setEditDesc(folder.description || '');
      setEditColor(folder.color);
      setEditParentId(folder.parentId || parentFolders[0]?.id || '');
      setConfirmDeleteId(null);
    };

    const saveEditing = (folder: TopicFolder) => {
      const trimmed = editName.trim();
      if (trimmed) {
        onUpdateFolder(folder.id, {
          name: trimmed,
          description: editDesc.trim(),
          color: editColor,
          ...(folder.isParent ? {} : { parentId: editParentId || undefined }),
        });
      }
      setEditingId(null);
    };

    const handleClickParent = (parent: TopicFolder) => {
      const children = subfoldersByParent.get(parent.id) || [];
      setExpandedIds((prev) => ({ ...prev, [parent.id]: true }));
      if (children.length > 0) {
        onSelectFolder(children[0].id);
      } else {
        onSelectFolder(parent.id);
      }
    };

    const renderEditForm = (folder: TopicFolder) => (
      <div
        key={folder.id}
        className="p-3 rounded-xl bg-white border border-[#B9AEE8] space-y-2.5"
      >
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEditing(folder);
            if (e.key === 'Escape') setEditingId(null);
          }}
          placeholder="Tên thư mục..."
          aria-label="Edit folder name"
          className="w-full px-2.5 py-1.5 rounded-lg border border-[#867C96]/30 text-sm font-semibold text-[#2B2438]"
          autoFocus
        />
        <input
          type="text"
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEditing(folder);
            if (e.key === 'Escape') setEditingId(null);
          }}
          placeholder="Ghi chú ngắn (tùy chọn)..."
          aria-label="Edit folder description"
          className="w-full px-2.5 py-1 rounded-lg border border-[#867C96]/25 text-xs text-[#5E556E]"
        />
        {!folder.isParent && parentFolders.length > 0 && (
          <select
            value={editParentId}
            onChange={(e) => setEditParentId(e.target.value)}
            aria-label="Move to parent folder"
            className="w-full px-2.5 py-1.5 rounded-lg border border-[#867C96]/25 text-xs font-semibold text-[#3F3163] bg-[#FAF7FD]"
          >
            {parentFolders.map((p) => (
              <option key={p.id} value={p.id}>
                Thư mục lớn: {p.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {COLOR_OPTIONS.map((c) => {
              const cStyle = FOLDER_COLOR_STYLES[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  aria-label={cStyle.label}
                  className={`p-1 rounded-lg cursor-pointer transition-transform ${
                    editColor === c
                      ? 'ring-2 ring-[#6F5C96] bg-[#F3F0FC] scale-110'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <Folder className={`w-4 h-4 ${cStyle.icon}`} />
                </button>
              );
            })}
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
              onClick={() => saveEditing(folder)}
              className="p-1.5 rounded-lg bg-[#6F5C96] text-white hover:bg-[#5E4C84] cursor-pointer"
              aria-label="Save rename"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );

    const renderDeleteConfirm = (folder: TopicFolder) => {
      const childCount = folder.isParent ? (subfoldersByParent.get(folder.id) || []).length : 0;
      const totalWordsInside = folder.isParent
        ? getParentTotalWords(folder.id)
        : getSubfolderWordCount(folder.id);

      return (
        <div
          key={folder.id}
          className="p-3 rounded-xl bg-[#FFF2F0] border border-[#F29C94] space-y-2"
        >
          <p className="text-xs font-semibold text-[#632F2D]">
            {folder.isParent
              ? `Xóa thư mục lớn "${folder.name}" cùng ${childCount} thư mục con và ${totalWordsInside} từ vựng?`
              : `Xóa thư mục con "${folder.name}" và ${totalWordsInside} từ vựng bên trong?`}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#5E556E] bg-white border border-[#867C96]/20 cursor-pointer"
            >
              Giữ lại
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteFolder(folder.id);
                setConfirmDeleteId(null);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-[#C94C4C] hover:bg-[#B03B3B] cursor-pointer"
            >
              Xóa
            </button>
          </div>
        </div>
      );
    };

    const renderSubfolderRow = (folder: TopicFolder, indented: boolean) => {
      if (editingId === folder.id) return renderEditForm(folder);
      if (confirmDeleteId === folder.id) return renderDeleteConfirm(folder);

      const style = FOLDER_COLOR_STYLES[folder.color] || FOLDER_COLOR_STYLES.lavender;
      const isActive = activeFolderId === folder.id;
      const wordCount = getSubfolderWordCount(folder.id);

      return (
        <div
          key={folder.id}
          className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border transition-colors ${
            indented ? 'ml-3' : ''
          } ${
            isActive
              ? `${style.activeBg} ${style.border} ${style.text} shadow-2xs`
              : `bg-white/70 border-transparent hover:${style.bg} hover:${style.border} text-[#2B2438]`
          }`}
        >
          <button
            type="button"
            onClick={() => onSelectFolder(folder.id)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
          >
            <Folder className={`w-4 h-4 shrink-0 ${style.icon}`} />
            <span className="text-xs sm:text-sm font-bold truncate">{folder.name}</span>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <span className="text-xs font-bold font-mono-num text-[#5E556E] px-1">
              {wordCount}
            </span>
            <button
              type="button"
              onClick={() => startEditing(folder)}
              aria-label={`Rename ${folder.name}`}
              title="Sửa tên, ghi chú hoặc màu thư mục"
              className="p-1 rounded-lg opacity-80 hover:opacity-100 text-[#5E556E] hover:text-[#2B2438] hover:bg-white/80 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(folder.id)}
              aria-label={`Delete ${folder.name}`}
              title="Xóa thư mục con"
              className="p-1 rounded-lg opacity-80 hover:opacity-100 text-[#9B4848] hover:bg-[#FFE4E1] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    };

    return (
      <aside className="w-full lg:w-[300px] shrink-0 space-y-4">
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#2B2438]">
                {studyLanguage === 'zh' ? 'Chủ đề Tiếng Trung' : 'Topic Folders'}
              </h2>
              <p className="text-xs text-[#5E556E] tabular-nums">
                {parentFolders.length} thư mục lớn · {words.length} từ
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                isCreating ? setIsCreating(false) : openCreateModal(parentFolders.length === 0)
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#E6E6FA] text-[#3F3163] hover:bg-[#D8D3F8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Tạo thư mục</span>
            </button>
          </div>

          {/* Create Parent / Subfolder Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateSubmit}
              className="mb-4 p-3.5 rounded-xl bg-[#FFFDF9] border border-[#D5CEF5] space-y-3"
            >
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#F3F0FC]">
                <button
                  type="button"
                  onClick={() => setCreateAsParent(true)}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    createAsParent
                      ? 'bg-white text-[#2B2438] shadow-2xs'
                      : 'text-[#5E556E] hover:text-[#2B2438]'
                  }`}
                >
                  Thư mục lớn
                </button>
                <button
                  type="button"
                  disabled={parentFolders.length === 0}
                  onClick={() => setCreateAsParent(false)}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-45 ${
                    !createAsParent
                      ? 'bg-white text-[#2B2438] shadow-2xs'
                      : 'text-[#5E556E] hover:text-[#2B2438]'
                  }`}
                >
                  Thư mục con
                </button>
              </div>

              {!createAsParent && parentFolders.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-[#3F3163] mb-1">
                    Thuộc thư mục lớn
                  </label>
                  <select
                    value={createParentId || parentFolders[0]?.id}
                    onChange={(e) => setCreateParentId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/25 text-xs font-semibold text-[#2B2438]"
                  >
                    {parentFolders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {createAsParent && (
                <p className="text-[11px] text-[#5E556E] bg-[#EEF9F8] px-2.5 py-1.5 rounded-lg border border-[#BFE3E0]">
                  Thư mục lớn chỉ chứa các thư mục con (không chứa từ vựng trực tiếp).
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-[#3F3163] mb-1">
                  {createAsParent ? 'Tên thư mục lớn' : 'Tên thư mục con'}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={
                    createAsParent
                      ? studyLanguage === 'zh'
                        ? 'VD: HSK 3–4'
                        : 'VD: IELTS Writing'
                      : studyLanguage === 'zh'
                      ? 'VD: Bài 1 - Mua sắm'
                      : 'VD: Unit 2: Technology'
                  }
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#867C96]/25 text-sm text-[#2B2438] placeholder:text-[#867C96]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3F3163] mb-1">
                  Ghi chú ngắn (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Mô tả chủ đề..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#867C96]/25 text-xs text-[#2B2438] placeholder:text-[#867C96]"
                />
              </div>
              <div>
                <span className="block text-xs font-bold text-[#3F3163] mb-1.5">
                  Màu biểu tượng thư mục
                </span>
                <div className="flex items-center gap-1.5">
                  {COLOR_OPTIONS.map((c) => {
                    const cStyle = FOLDER_COLOR_STYLES[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        aria-label={cStyle.label}
                        title={cStyle.label}
                        className={`p-1.5 rounded-lg cursor-pointer transition-transform ${
                          newColor === c
                            ? 'ring-2 ring-[#6F5C96] bg-[#F3F0FC] scale-110'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                      >
                        <Folder className={`w-4.5 h-4.5 ${cStyle.icon}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5E556E] hover:bg-[#F3F0FC] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#6F5C96] text-white hover:bg-[#5E4C84] cursor-pointer"
                >
                  Tạo
                </button>
              </div>
            </form>
          )}

          {/* All Topics Cross-Folder Button */}
          <button
            type="button"
            onClick={() => onSelectFolder('all')}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl mb-2 text-left transition-colors cursor-pointer ${
              activeFolderId === 'all'
                ? 'bg-gradient-to-r from-[#E6E6FA]/85 via-[#FFE4E1]/70 to-[#E0F2F1]/85 border border-[#B9AEE8] text-[#2B2438] shadow-2xs'
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

          {/* Two-Level Hierarchy: Parent Folders -> Subfolders */}
          <div className="space-y-2">
            {parentFolders.map((parent) => {
              if (editingId === parent.id) return renderEditForm(parent);
              if (confirmDeleteId === parent.id) return renderDeleteConfirm(parent);

              const style = FOLDER_COLOR_STYLES[parent.color] || FOLDER_COLOR_STYLES.lavender;
              const children = subfoldersByParent.get(parent.id) || [];
              const isExpanded = expandedIds[parent.id] !== false;
              const hasActiveChild =
                activeFolderId === parent.id || children.some((c) => c.id === activeFolderId);
              const totalWords = getParentTotalWords(parent.id);

              return (
                <div key={parent.id} className="space-y-1">
                  {/* Parent Folder Row */}
                  <div
                    className={`group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl border transition-colors ${
                      hasActiveChild
                        ? `${style.bg} ${style.border} ${style.text}`
                        : 'bg-white/70 border-[#867C96]/10 hover:bg-white text-[#2B2438]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIds((prev) => ({
                          ...prev,
                          [parent.id]: !isExpanded,
                        }))
                      }
                      aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                      className="p-1 rounded-md text-[#5E556E] hover:bg-white/80 shrink-0 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleClickParent(parent)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      title="Bấm để mở bảng từ vựng thư mục con đầu tiên"
                    >
                      {isExpanded ? (
                        <FolderOpen className={`w-4.5 h-4.5 shrink-0 ${style.icon}`} />
                      ) : (
                        <Folder className={`w-4.5 h-4.5 shrink-0 ${style.icon}`} />
                      )}
                      <span className="text-sm font-bold truncate">{parent.name}</span>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <span
                        className="text-[11px] font-bold font-mono-num text-[#5E556E] px-1"
                        title={`${children.length} thư mục con · ${totalWords} từ`}
                      >
                        {totalWords}
                      </span>
                      <button
                        type="button"
                        onClick={() => openCreateModal(false, parent.id)}
                        title="Thêm thư mục con vào đây"
                        aria-label={`Add subfolder to ${parent.name}`}
                        className="p-1 rounded-lg text-[#4D3B73] hover:bg-white/90 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditing(parent)}
                        aria-label={`Edit ${parent.name}`}
                        title="Sửa tên, ghi chú hoặc màu thư mục lớn"
                        className="p-1 rounded-lg opacity-80 hover:opacity-100 text-[#5E556E] hover:text-[#2B2438] hover:bg-white/90 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(parent.id)}
                        aria-label={`Delete ${parent.name}`}
                        title="Xóa thư mục lớn"
                        className="p-1 rounded-lg opacity-80 hover:opacity-100 text-[#9B4848] hover:bg-[#FFE4E1] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Child Subfolders */}
                  {isExpanded && (
                    <div className="pl-2 border-l-2 border-[#D5CEF5]/70 ml-3 space-y-1">
                      {children.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => openCreateModal(false, parent.id)}
                          className="ml-2 w-[calc(100%-0.5rem)] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-[#B9AEE8] text-[11px] font-semibold text-[#6F5C96] hover:bg-[#F3F0FC]/60 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm thư mục con đầu tiên</span>
                        </button>
                      ) : (
                        children.map((child) => renderSubfolderRow(child, false))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Legacy / Unassigned Subfolders fallback (if any exist from older backups) */}
            {orphanSubfolders.length > 0 && (
              <div className="pt-2 space-y-1">
                {parentFolders.length > 0 && (
                  <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#867C96]">
                    Chưa phân nhóm
                  </p>
                )}
                {orphanSubfolders.map((folder) => renderSubfolderRow(folder, false))}
              </div>
            )}
          </div>
        </div>

        {/* Warm Study Card */}
        <div className="hidden lg:block glass-card rounded-2xl p-4 overflow-hidden">
          <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-[#F3F0FC]">
            <img
              src="/src/assets/images/brand_notebook_illustration_1794884411584.jpg"
              alt="Ms. Thúy pastel study notebook with lavender sprigs and teacup"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
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
  }
);
FolderSidebar.displayName = 'FolderSidebar';

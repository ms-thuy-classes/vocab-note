import React, { useState } from 'react';
import { CheckCircle2, Download, RotateCcw, Upload, X } from 'lucide-react';
import type { ReminderSettings, TopicFolder, UserProgress, VocabWord } from '../types/vocab';

export interface VocabBackupPayload {
  version: number;
  exportedAt: string;
  folders: TopicFolder[];
  words: VocabWord[];
  progress: UserProgress;
  reminders: ReminderSettings;
}

interface BackupModalProps {
  isOpen: boolean;
  folders: TopicFolder[];
  words: VocabWord[];
  progress: UserProgress;
  reminders: ReminderSettings;
  onImportBackup: (payload: VocabBackupPayload) => void;
  onResetSampleData: () => void;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  folders,
  words,
  progress,
  reminders,
  onImportBackup,
  onResetSampleData,
  onClose,
}) => {
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const payload: VocabBackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      folders,
      words,
      progress,
      reminders,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ms-thuy-vocab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Exported your folders, words, images, and XP progress as JSON.');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<VocabBackupPayload>;
      if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.words)) {
        setMessage('Invalid backup file format. Expected folders and words arrays.');
        return;
      }
      onImportBackup({
        version: parsed.version || 1,
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        folders: parsed.folders,
        words: parsed.words,
        progress: parsed.progress || progress,
        reminders: parsed.reminders || reminders,
      });
      setMessage(`Imported ${parsed.folders.length} folders and ${parsed.words.length} words!`);
    } catch {
      setMessage('Could not parse JSON backup file.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2438]/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
    >
      <div className="w-full max-w-lg bg-[#FFFDF9] rounded-2xl border border-[#D5CEF5] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[#E0F2F1]/75 via-[#E6E6FA]/70 to-[#FFE4E1]/70 border-b border-[#867C96]/15 flex items-center justify-between gap-4">
          <div>
            <h3 id="backup-modal-title" className="text-lg font-bold text-[#2B2438]">
              Backup & Data Management
            </h3>
            <p className="text-xs text-[#5E556E]">
              Your vocabulary notebook auto-saves locally. Export or restore anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close backup modal"
            className="p-2 rounded-xl bg-white/80 text-[#5E556E] hover:text-[#2B2438] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#FAF7FD] border border-[#867C96]/15 flex items-center justify-between text-xs font-semibold text-[#5E556E]">
            <span>Saved in browser storage</span>
            <span className="font-mono-num font-bold text-[#2B2438]">
              {folders.length} folders · {words.length} words
            </span>
          </div>

          {message && (
            <div className="p-3 rounded-xl bg-[#E0F2F1] border border-[#9ADCD5] text-xs font-bold text-[#1F4F4B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6F5C96] text-white text-sm font-bold hover:bg-[#5E4C84] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON Backup</span>
            </button>

            <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#B9AEE8] text-[#3F3163] text-sm font-bold hover:bg-[#F3F0FC] cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import JSON File</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-3 border-t border-[#867C96]/15">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9B4848] hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Ms. Thúy’s Sample Vocabulary Pack</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-[#FFF2F0] border border-[#F7CBC6] flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#632F2D]">
                  Reset to default sample folders & words?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1 rounded-lg bg-white text-xs font-semibold text-[#5E556E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetSampleData();
                      setConfirmReset(false);
                      setMessage('Restored sample folders and vocabulary words.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#C94C4C] text-white text-xs font-bold cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

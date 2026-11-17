import React, { useState } from 'react';
import { Flame, Medal, Pencil, Trophy, X } from 'lucide-react';
import {
  getRankForXp,
  RANK_TIERS,
  SIMULATED_CLASSMATES,
} from '../data/seedData';
import type { ClassmateEntry, UserProgress } from '../types/vocab';

interface LeaderboardModalProps {
  isOpen: boolean;
  progress: UserProgress;
  onUpdateStudentName: (name: string) => void;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  progress,
  onUpdateStudentName,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'ranks'>('leaderboard');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(progress.studentName);

  if (!isOpen) return null;

  const { current, next, progressPercent } = getRankForXp(progress.xp);

  const combinedEntries: ClassmateEntry[] = [
    ...SIMULATED_CLASSMATES,
    {
      id: 'current-user',
      name: progress.studentName,
      dailyXp: progress.dailyXp,
      totalXp: progress.xp,
      streak: progress.streak,
      avatarBg: 'bg-gradient-to-br from-[#E6E6FA] to-[#FFE4E1] text-[#2B2438]',
      isCurrentUser: true,
    },
  ].sort((a, b) => b.dailyXp - a.dailyXp || b.totalXp - a.totalXp);

  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (trimmed) {
      onUpdateStudentName(trimmed);
    }
    setEditingName(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2438]/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#FFFDF9] rounded-2xl border border-[#D5CEF5] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#E6E6FA]/80 via-[#FFE4E1]/65 to-[#E0F2F1]/80 border-b border-[#867C96]/15 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/85 flex items-center justify-center text-xl shadow-2xs">
              {current.badgeEmoji}
            </span>
            <div>
              <h3 id="leaderboard-modal-title" className="text-lg font-bold text-[#2B2438]">
                Daily Leaderboard & Rank Progress
              </h3>
              <p className="text-xs text-[#5E556E]">
                {current.title} · <span className="font-mono-num font-bold">{progress.xp}</span> Total XP ·{' '}
                <span className="font-mono-num font-bold">{progress.dailyXp}</span> XP Today
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close leaderboard"
            className="p-2 rounded-xl bg-white/80 text-[#5E556E] hover:text-[#2B2438] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-[#F3F0FC] border border-[#D5CEF5]">
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-[#3F3163] shadow-xs'
                  : 'text-[#5E556E] hover:text-[#2B2438]'
              }`}
            >
              Daily Class Ranking
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ranks')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'ranks'
                  ? 'bg-white text-[#3F3163] shadow-xs'
                  : 'text-[#5E556E] hover:text-[#2B2438]'
              }`}
            >
              Scholar Rank Roadmap
            </button>
          </div>

          {!editingName ? (
            <button
              type="button"
              onClick={() => {
                setNameDraft(progress.studentName);
                setEditingName(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6F5C96] hover:underline cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Display Name: {progress.studentName}</span>
            </button>
          ) : (
            <form onSubmit={saveName} className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-[#B9AEE8] text-xs font-bold text-[#2B2438]"
                autoFocus
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-[#6F5C96] text-white text-xs font-bold cursor-pointer"
              >
                Save
              </button>
            </form>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'leaderboard' ? (
            <>
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F3F0FC] to-[#EEF9F8] border border-[#D5CEF5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#3F3163]">
                    Your Progress to {next ? next.title : 'Top Rank'}
                  </p>
                  <p className="text-xs text-[#5E556E] mt-0.5">
                    {next
                      ? `${next.minXp - progress.xp} XP away from leveling up`
                      : 'You have reached the highest Grand Linguist rank!'}
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <div className="flex justify-between text-[11px] font-bold font-mono-num text-[#3F3163] mb-1">
                    <span>{current.title}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#9C89D9] via-[#E58D93] to-[#6FC2BA]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {combinedEntries.map((entry, idx) => {
                  const tier = getRankForXp(entry.totalXp).current;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors ${
                        entry.isCurrentUser
                          ? 'bg-[#F3F0FC] border-[#9C89D9] shadow-xs'
                          : 'bg-white border-[#867C96]/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-center font-mono-num text-sm font-bold text-[#5E556E] shrink-0">
                          {idx === 0 ? (
                            <Trophy className="w-4 h-4 text-[#C9932B] mx-auto" />
                          ) : idx < 3 ? (
                            <Medal className="w-4 h-4 text-[#8C7AB8] mx-auto" />
                          ) : (
                            idx + 1
                          )}
                        </span>
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${entry.avatarBg}`}
                        >
                          {entry.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#2B2438] truncate">
                            {entry.name}
                            {entry.isCurrentUser && (
                              <span className="ml-2 text-[11px] font-bold text-[#6F5C96]">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[#5E556E]">
                            {tier.badgeEmoji} {tier.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#B8532F] font-mono-num">
                          <Flame className="w-3.5 h-3.5 text-[#E5734D]" />
                          {entry.streak}d
                        </span>
                        <div className="text-right">
                          <span className="block text-sm font-bold font-mono-num text-[#3F3163]">
                            {entry.dailyXp} XP
                          </span>
                          <span className="block text-[10px] text-[#867C96] font-mono-num">
                            today
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {RANK_TIERS.map((tier) => {
                const unlocked = progress.xp >= tier.minXp;
                const isCurrent = current.id === tier.id;
                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                      isCurrent
                        ? 'bg-[#F3F0FC] border-[#7C5CBF]'
                        : unlocked
                        ? 'bg-white border-[#BFE3E0]'
                        : 'bg-white/50 border-[#867C96]/15 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${tier.accentBg}`}
                      >
                        {tier.badgeEmoji}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#2B2438]">
                          {tier.title}
                          {isCurrent && (
                            <span className="ml-2 text-xs font-bold text-[#6F5C96]">
                              · Current Rank
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#5E556E] mt-0.5">{tier.description}</p>
                      </div>
                    </div>
                    <span className="font-mono-num text-xs font-bold text-[#3F3163] shrink-0">
                      {tier.minXp} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

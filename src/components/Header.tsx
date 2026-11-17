import React from 'react';
import {
  BellRing,
  BookOpen,
  Download,
  Flame,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getRankForXp } from '../data/seedData';
import type { UserProgress } from '../types/vocab';

export type ActiveView = 'notebook' | 'flashcards' | 'quiz';

interface HeaderProps {
  activeView: ActiveView;
  onNavigateNotebook: () => void;
  onOpenLeaderboard: () => void;
  onOpenReminders: () => void;
  onOpenBackup: () => void;
  progress: UserProgress;
  accent: 'en-US' | 'en-GB';
  onToggleAccent: () => void;
  soundMuted: boolean;
  onToggleMute: () => void;
  reminderEnabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigateNotebook,
  onOpenLeaderboard,
  onOpenReminders,
  onOpenBackup,
  progress,
  accent,
  onToggleAccent,
  soundMuted,
  onToggleMute,
  reminderEnabled,
}) => {
  const { current, next, progressPercent } = getRankForXp(progress.xp);

  return (
    <header className="sticky top-0 z-30 glass-surface border-b border-[#867C96]/15">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={onNavigateNotebook}
          className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 group cursor-pointer"
        >
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E6E6FA] via-[#FFE4E1] to-[#E0F2F1] border border-[#867C96]/20 flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
            <BookOpen className="w-4.5 h-4.5 text-[#4D3B73]" />
          </span>
          <span className="text-base sm:text-lg font-bold tracking-tight text-[#2B2438]">
            Learn with Ms. Thúy <span className="hidden sm:inline font-semibold text-[#6F5C96]">- Vocabulary Note</span>
          </span>
        </button>

        {/* Zone 2: Clean Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#5E556E]">
          <button
            type="button"
            onClick={onNavigateNotebook}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer ${
              activeView === 'notebook'
                ? 'text-[#2B2438] border-[#7C5CBF]'
                : 'border-transparent hover:text-[#2B2438] hover:border-[#D5CEF5]'
            }`}
          >
            Notebook
          </button>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 border-transparent hover:text-[#2B2438] hover:border-[#D5CEF5] flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-[#B8862D]" />
            <span>Leaderboard</span>
          </button>
          <button
            type="button"
            onClick={onOpenReminders}
            className="py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 border-transparent hover:text-[#2B2438] hover:border-[#D5CEF5] flex items-center gap-1.5 cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5 text-[#C25C68]" />
            <span>Reminders{reminderEnabled ? ' · On' : ''}</span>
          </button>
          <button
            type="button"
            onClick={onOpenBackup}
            className="py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 border-transparent hover:text-[#2B2438] hover:border-[#D5CEF5] flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#337C75]" />
            <span>Backup</span>
          </button>
        </nav>

        {/* Zone 3: Compact Rank, Streak & Audio Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Audio controls */}
          <button
            type="button"
            onClick={onToggleAccent}
            title={`Pronunciation accent: ${accent === 'en-US' ? 'US English' : 'UK English'}`}
            className="hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#F3F0FC] text-[#3F3163] border border-[#D5CEF5] hover:bg-[#E6E6FA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {accent === 'en-US' ? 'US' : 'UK'}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={soundMuted ? 'Unmute quiz sound effects' : 'Mute quiz sound effects'}
            title={soundMuted ? 'Unmute sound effects' : 'Mute sound effects'}
            className="p-2 rounded-xl bg-white/75 border border-[#867C96]/15 text-[#5E556E] hover:text-[#2B2438] hover:bg-white transition-colors shrink-0 cursor-pointer"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Rank & XP Progress */}
          <button
            type="button"
            onClick={onOpenLeaderboard}
            title="View Rank Progression & Daily Leaderboard"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/85 border border-[#867C96]/18 hover:border-[#B9AEE8] transition-all duration-200 cursor-pointer shrink-0"
          >
            <span className="text-base leading-none" aria-hidden="true">
              {current.badgeEmoji}
            </span>
            <div className="hidden lg:flex flex-col items-start min-w-[120px]">
              <div className="w-full flex items-center justify-between gap-2 text-[11px] font-bold text-[#2B2438] leading-tight">
                <span className="truncate max-w-[92px]">{current.title}</span>
                <span className="font-mono-num text-[#6F5C96]">{progress.xp} XP</span>
              </div>
              <div className="w-full h-1.5 mt-1 rounded-full bg-[#EFEBF7] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#9C89D9] via-[#E58D93] to-[#6FC2BA] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {next && (
                <span className="sr-only">
                  {next.minXp - progress.xp} XP to {next.title}
                </span>
              )}
            </div>
            <span className="lg:hidden text-xs font-bold font-mono-num text-[#3F3163]">
              {progress.xp} XP
            </span>
            <span className="h-4 w-px bg-[#867C96]/20" aria-hidden="true" />
            <span className="flex items-center gap-1 text-xs font-bold text-[#B8532F] font-mono-num whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-[#E5734D]" />
              {progress.streak}d
            </span>
          </button>
        </div>
      </div>

      {/* Mobile quick navigation bar */}
      <div className="md:hidden border-t border-[#867C96]/10 px-4 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-[#5E556E] overflow-x-auto">
        <button
          type="button"
          onClick={onNavigateNotebook}
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 ${
            activeView === 'notebook' ? 'bg-[#E6E6FA] text-[#3F3163]' : ''
          }`}
        >
          Notebook
        </button>
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1 hover:bg-white/60"
        >
          <Trophy className="w-3.5 h-3.5 text-[#B8862D]" />
          Leaderboard
        </button>
        <button
          type="button"
          onClick={onOpenReminders}
          className="px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1 hover:bg-white/60"
        >
          <BellRing className="w-3.5 h-3.5 text-[#C25C68]" />
          Reminders
        </button>
        <button
          type="button"
          onClick={onOpenBackup}
          className="px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1 hover:bg-white/60"
        >
          <Download className="w-3.5 h-3.5 text-[#337C75]" />
          Backup
        </button>
        <button
          type="button"
          onClick={onToggleAccent}
          className="px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 bg-[#F3F0FC] text-[#3F3163]"
        >
          {accent === 'en-US' ? 'US' : 'UK'}
        </button>
      </div>
    </header>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Shuffle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type { VocabWord } from '../types/vocab';
import { playFeedbackSound, speakText } from '../utils/audio';

interface FlashcardModeProps {
  words: VocabWord[];
  accent: 'en-US' | 'en-GB';
  soundMuted: boolean;
  onMarkMastered: (wordId: string, mastered: boolean) => void;
  onCardReviewed: (xpAmount: number) => void;
  onDeckCompleted: (xpBonus: number) => void;
  onStartQuizWithWords: (words: VocabWord[]) => void;
  onExit: () => void;
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({
  words,
  accent,
  soundMuted,
  onMarkMastered,
  onCardReviewed,
  onDeckCompleted,
  onStartQuizWithWords,
  onExit,
}) => {
  const [deck, setDeck] = useState<VocabWord[]>(() => words);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set());
  const [masteredSessionIds, setMasteredSessionIds] = useState<Set<string>>(() => new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  const currentCard = deck[currentIndex];

  const goNext = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsCompleted(true);
      onDeckCompleted(25);
      playFeedbackSound('complete', soundMuted);
    }
  }, [currentIndex, deck.length, onDeckCompleted, soundMuted]);

  const goPrev = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isCompleted) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        goNext();
      } else if (e.code === 'ArrowLeft') {
        goPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, isCompleted]);

  const handleShuffle = () => {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setDeck(copy);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  const handleRateCard = (mastered: boolean) => {
    if (!currentCard) return;
    if (!reviewedIds.has(currentCard.id)) {
      setReviewedIds((prev) => new Set(prev).add(currentCard.id));
      onCardReviewed(5);
    }
    onMarkMastered(currentCard.id, mastered);
    if (mastered) {
      setMasteredSessionIds((prev) => new Set(prev).add(currentCard.id));
      playFeedbackSound('correct', soundMuted);
    }
    goNext();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  if (deck.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <p className="text-lg font-bold text-[#2B2438]">No words selected for flashcards.</p>
        <button
          type="button"
          onClick={onExit}
          className="px-5 py-2.5 rounded-xl bg-[#6F5C96] text-white text-sm font-bold cursor-pointer"
        >
          Back to Notebook
        </button>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="glass-card rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E0F2F1] flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-[#1F4F4B]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#2B2438]">Flashcard Session Complete!</h2>
            <p className="text-sm text-[#5E556E] mt-2">
              You reviewed <strong className="text-[#2B2438]">{deck.length}</strong> words and marked{' '}
              <strong className="text-[#1F4F4B]">{masteredSessionIds.size}</strong> as mastered (+25 XP completion bonus).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#D5CEF5] text-sm font-bold text-[#3F3163] hover:bg-[#F3F0FC] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Study Deck Again</span>
            </button>
            <button
              type="button"
              onClick={() => onStartQuizWithWords(deck)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C5CBF] to-[#C86D85] text-white text-sm font-bold hover:opacity-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Test Yourself with Smart Quiz</span>
            </button>
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-[#5E556E] hover:bg-white/70 cursor-pointer"
            >
              Back to Notebook
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = Math.round(((currentIndex + 1) / deck.length) * 100);

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-5">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/80 border border-[#867C96]/20 text-xs sm:text-sm font-bold text-[#2B2438] hover:bg-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Notebook</span>
        </button>

        <div className="text-xs sm:text-sm font-bold text-[#3F3163] font-mono-num">
          Card {currentIndex + 1} / {deck.length}
        </div>

        <button
          type="button"
          onClick={handleShuffle}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F3F0FC] text-[#3F3163] border border-[#D5CEF5] text-xs sm:text-sm font-bold hover:bg-[#E6E6FA] cursor-pointer"
        >
          <Shuffle className="w-4 h-4" />
          <span>Shuffle</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-white/80 border border-[#867C96]/15 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#9C89D9] via-[#E58D93] to-[#6FC2BA] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 3D Flip Card */}
      <div className="perspective-1200">
        <div
          onClick={() => setIsFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsFlipped((f) => !f);
          }}
          aria-label="Flip flashcard"
          className={`relative w-full min-h-[380px] sm:min-h-[420px] transition-transform duration-500 preserve-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front Side: English Word, IPA, Audio, Vivid Image */}
          <div className="absolute inset-0 backface-hidden glass-card rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-between text-center">
            <div className="w-full flex items-center justify-between text-xs font-bold text-[#867C96]">
              <span>Front · English Word</span>
              <span>Click or press Space to flip</span>
            </div>

            <div className="flex flex-col items-center gap-4 my-auto py-4">
              {currentCard.imageUrl && (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-[#D5CEF5] bg-[#FAF7FD] shadow-sm">
                  <img
                    src={currentCard.imageUrl}
                    alt={currentCard.english}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#2B2438] tracking-tight">
                  {currentCard.english || '(Untitled word)'}
                </h2>
                {currentCard.ipa && (
                  <p className="mt-2 font-ipa text-base sm:text-lg text-[#6F5C96]">
                    {currentCard.ipa}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakText(currentCard.english, accent);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F3F0FC] text-[#3F3163] hover:bg-[#E6E6FA] text-xs font-bold transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Listen ({accent === 'en-US' ? 'US' : 'UK'})</span>
              </button>
            </div>

            <p className="text-xs font-semibold text-[#867C96]">
              Tap card to reveal Vietnamese meaning & example
            </p>
          </div>

          {/* Back Side: Vietnamese Meaning, Example, Synonyms */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card rounded-2xl p-6 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-[#FFFDF9] via-[#FAF7FD] to-[#EEF9F8]">
            <div className="w-full flex items-center justify-between text-xs font-bold text-[#867C96]">
              <span>Back · Meaning & Context</span>
              <span className="font-ipa text-[#6F5C96]">{currentCard.english}</span>
            </div>

            <div className="my-auto space-y-5 text-center">
              <div>
                <p className="text-xs font-bold text-[#867C96] mb-1">Vietnamese Meaning</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#2B2438]">
                  {currentCard.vietnamese || '—'}
                </p>
              </div>

              {currentCard.example && (
                <div className="p-4 rounded-2xl bg-white/85 border border-[#867C96]/15 text-left space-y-2 max-w-xl mx-auto">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm sm:text-base font-semibold text-[#2B2438] leading-relaxed">
                      “{currentCard.example}”
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(currentCard.example, accent);
                      }}
                      className="p-2 rounded-lg bg-[#FFF2F0] text-[#632F2D] hover:bg-[#FFE4E1] shrink-0 cursor-pointer"
                      aria-label="Pronounce example sentence"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  {currentCard.exampleVi && (
                    <p className="text-xs sm:text-sm text-[#5E556E]">
                      {currentCard.exampleVi}
                    </p>
                  )}
                </div>
              )}

              {currentCard.synonyms.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs font-bold text-[#5E556E]">Synonyms:</span>
                  {currentCard.synonyms.map((syn) => (
                    <span
                      key={syn}
                      className="px-2.5 py-1 rounded-lg bg-[#E0F2F1] text-[#1F4F4B] text-xs font-bold"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-xs font-semibold text-[#867C96]">
              Tap card to flip back
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Study Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={goPrev}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#867C96]/20 text-sm font-bold text-[#2B2438] disabled:opacity-40 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleRateCard(false)}
            className="px-4 py-2.5 rounded-xl bg-[#FFE4E1] text-[#632F2D] border border-[#F7CBC6] hover:bg-[#FFD7D2] text-sm font-bold transition-colors cursor-pointer"
          >
            Still Learning
          </button>
          <button
            type="button"
            onClick={() => handleRateCard(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#E0F2F1] text-[#1F4F4B] border border-[#9ADCD5] hover:bg-[#CEEBE8] text-sm font-bold transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mastered (+5 XP)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={goNext}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#867C96]/20 text-sm font-bold text-[#2B2438] hover:bg-[#F3F0FC] cursor-pointer"
        >
          <span>{currentIndex + 1 === deck.length ? 'Finish' : 'Next'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

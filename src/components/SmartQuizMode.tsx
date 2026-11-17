import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  GripVertical,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import type {
  QuizAnswerRecord,
  QuizQuestion,
  SpeechAccent,
  StudyLanguage,
  VocabWord,
} from '../types/vocab';
import { playFeedbackSound, speakText } from '../utils/audio';
import { stripPinyinTones } from '../utils/pinyin';
import { generateSmartQuiz } from '../utils/quizGenerator';

interface SmartQuizModeProps {
  selectedWords: VocabWord[];
  allWordsPool: VocabWord[];
  studyLanguage: StudyLanguage;
  speechAccent: SpeechAccent;
  soundMuted: boolean;
  onQuestionAnswered: (isCorrect: boolean, xpEarned: number) => void;
  onQuizCompleted: (bonusXp: number) => void;
  onExit: () => void;
}

interface ScrambleTile {
  uid: string;
  text: string;
}

export const SmartQuizMode: React.FC<SmartQuizModeProps> = ({
  selectedWords,
  allWordsPool,
  studyLanguage,
  speechAccent,
  soundMuted,
  onQuestionAnswered,
  onQuizCompleted,
  onExit,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    generateSmartQuiz(selectedWords, allWordsPool, studyLanguage)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [showHint, setShowHint] = useState(false);

  const [bankTiles, setBankTiles] = useState<ScrambleTile[]>([]);
  const [answerTiles, setAnswerTiles] = useState<ScrambleTile[]>([]);
  const [draggedTile, setDraggedTile] = useState<{
    tile: ScrambleTile;
    source: 'bank' | 'answer';
  } | null>(null);

  const [checkedRecord, setCheckedRecord] = useState<QuizAnswerRecord | null>(null);
  const [records, setRecords] = useState<QuizAnswerRecord[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);

  const currentQuestion = questions[currentIndex];
  const isZh = (currentQuestion?.language || studyLanguage) === 'zh';

  const quarterLabels: Record<1 | 2 | 3 | 4, string> = isZh
    ? {
        1: 'Phần 1 (25%) · Tiếng Trung → Tiếng Việt',
        2: 'Phần 2 (25%) · Tiếng Việt → Tiếng Trung',
        3: 'Phần 3 (25%) · Điền từ vào chỗ trống (Cloze)',
        4: 'Phần 4 (25%) · Từ đồng nghĩa & Xếp câu',
      }
    : {
        1: 'Quarter 1 (25%) · English → Vietnamese',
        2: 'Quarter 2 (25%) · Vietnamese → English',
        3: 'Quarter 3 (25%) · Fill-in-the-Blank Cloze Test',
        4: 'Quarter 4 (25%) · Synonyms & Sentence Scramble',
      };

  useEffect(() => {
    setSelectedOption('');
    setTypedAnswer('');
    setShowHint(false);
    setCheckedRecord(null);
    setDraggedTile(null);

    if (currentQuestion?.type === 'scramble' && currentQuestion.scrambledTokens) {
      setBankTiles(
        currentQuestion.scrambledTokens.map((t, idx) => ({
          uid: `tile-${currentIndex}-${idx}-${t}`,
          text: t,
        }))
      );
      setAnswerTiles([]);
    } else {
      setBankTiles([]);
      setAnswerTiles([]);
    }
  }, [currentIndex, currentQuestion]);

  const canCheck = (() => {
    if (!currentQuestion || checkedRecord) return false;
    if (currentQuestion.type === 'en_to_vi' || currentQuestion.type === 'synonym') {
      return selectedOption.trim().length > 0;
    }
    if (currentQuestion.type === 'vi_to_en' || currentQuestion.type === 'cloze') {
      return typedAnswer.trim().length > 0;
    }
    if (currentQuestion.type === 'scramble') {
      return answerTiles.length > 0;
    }
    return false;
  })();

  const handleCheckAnswer = () => {
    if (!currentQuestion || checkedRecord) return;

    let userAnswer = '';
    let isCorrect = false;

    if (currentQuestion.type === 'en_to_vi' || currentQuestion.type === 'synonym') {
      userAnswer = selectedOption.trim();
      isCorrect = userAnswer.toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    } else if (currentQuestion.type === 'vi_to_en' || currentQuestion.type === 'cloze') {
      userAnswer = typedAnswer.trim();
      const normalized = userAnswer.toLowerCase().replace(/\s+/g, ' ');
      const stripped = stripPinyinTones(normalized);
      const accepted = currentQuestion.acceptedAnswers || [
        currentQuestion.correctAnswer.trim().toLowerCase(),
      ];
      isCorrect =
        accepted.includes(normalized) ||
        (isZh && accepted.includes(stripped));
    } else if (currentQuestion.type === 'scramble') {
      const joiner = currentQuestion.isCjkScramble ? '' : ' ';
      userAnswer = answerTiles.map((t) => t.text).join(joiner).trim();
      isCorrect = userAnswer === currentQuestion.correctAnswer.trim();
    }

    const record: QuizAnswerRecord = {
      question: currentQuestion,
      userAnswer,
      isCorrect,
    };

    setCheckedRecord(record);
    setRecords((prev) => [...prev, record]);

    const xp = isCorrect ? 15 : 0;
    if (xp > 0) {
      setSessionXp((s) => s + xp);
    }
    onQuestionAnswered(isCorrect, xp);
    playFeedbackSound(isCorrect ? 'correct' : 'incorrect', soundMuted);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      const bonus = 30;
      setSessionXp((s) => s + bonus);
      onQuizCompleted(bonus);
      setIsFinished(true);
      playFeedbackSound('complete', soundMuted);
    }
  };

  const handleRestartWithWords = (wordList: VocabWord[]) => {
    const newQuestions = generateSmartQuiz(wordList, allWordsPool, studyLanguage);
    setQuestions(newQuestions);
    setCurrentIndex(0);
    setRecords([]);
    setCheckedRecord(null);
    setIsFinished(false);
    setSessionXp(0);
  };

  const moveTileToAnswer = (tile: ScrambleTile) => {
    if (checkedRecord) return;
    setBankTiles((prev) => prev.filter((t) => t.uid !== tile.uid));
    setAnswerTiles((prev) => (prev.some((t) => t.uid === tile.uid) ? prev : [...prev, tile]));
  };

  const moveTileToBank = (tile: ScrambleTile) => {
    if (checkedRecord) return;
    setAnswerTiles((prev) => prev.filter((t) => t.uid !== tile.uid));
    setBankTiles((prev) => (prev.some((t) => t.uid === tile.uid) ? prev : [...prev, tile]));
  };

  const handleDropOnAnswerZone = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    if (!draggedTile || checkedRecord) return;
    const { tile, source } = draggedTile;

    if (source === 'bank') {
      setBankTiles((prev) => prev.filter((t) => t.uid !== tile.uid));
      setAnswerTiles((prev) => {
        const filtered = prev.filter((t) => t.uid !== tile.uid);
        if (typeof targetIndex === 'number') {
          filtered.splice(targetIndex, 0, tile);
          return filtered;
        }
        return [...filtered, tile];
      });
    } else if (source === 'answer' && typeof targetIndex === 'number') {
      setAnswerTiles((prev) => {
        const oldIdx = prev.findIndex((t) => t.uid === tile.uid);
        if (oldIdx === -1) return prev;
        const copy = [...prev];
        copy.splice(oldIdx, 1);
        copy.splice(targetIndex, 0, tile);
        return copy;
      });
    }
    setDraggedTile(null);
  };

  const handleDropOnBankZone = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTile || checkedRecord) return;
    if (draggedTile.source === 'answer') {
      moveTileToBank(draggedTile.tile);
    }
    setDraggedTile(null);
  };

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <p className="text-lg font-bold text-[#2B2438]">
          Select at least 1 vocabulary word to start a Smart Quiz.
        </p>
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

  if (isFinished) {
    const correctCount = records.filter((r) => r.isCorrect).length;
    const totalCount = records.length;
    const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    const missedMap = new Map<string, QuizAnswerRecord>();
    for (const rec of records) {
      if (!rec.isCorrect && !missedMap.has(rec.question.word.id)) {
        missedMap.set(rec.question.word.id, rec);
      }
    }
    const missedRecords = Array.from(missedMap.values());
    const missedWords = missedRecords.map((r) => r.question.word);

    return (
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        <div className="glass-card rounded-2xl p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#E6E6FA] via-[#FFE4E1] to-[#E0F2F1] flex items-center justify-center border border-[#D5CEF5]">
            <Award className="w-9 h-9 text-[#4D3B73]" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2B2438]">Smart Quiz Complete!</h2>
            <p className="text-lg font-bold text-[#6F5C96] mt-2 font-mono-num">
              {correctCount} / {totalCount} Correct - {pct}%
            </p>
            <p className="text-sm text-[#5E556E] mt-1">
              You earned <strong className="text-[#1F4F4B]">+{sessionXp} XP</strong> across all 4 quiz parts.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-left">
            {([1, 2, 3, 4] as const).map((qNum) => {
              const qRecs = records.filter((r) => r.question.quarter === qNum);
              const qRight = qRecs.filter((r) => r.isCorrect).length;
              return (
                <div
                  key={qNum}
                  className="p-3 rounded-xl bg-white/80 border border-[#867C96]/15"
                >
                  <p className="text-[11px] font-bold text-[#867C96]">Part {qNum} (25%)</p>
                  <p className="text-base font-bold text-[#2B2438] font-mono-num mt-0.5">
                    {qRight} / {qRecs.length}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {missedWords.length > 0 && (
              <button
                type="button"
                onClick={() => handleRestartWithWords(missedWords)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C5CBF] to-[#C86D85] text-white text-sm font-bold hover:opacity-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice Missed Words Again ({missedWords.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRestartWithWords(selectedWords)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F3F0FC] text-[#3F3163] border border-[#D5CEF5] text-sm font-bold hover:bg-[#E6E6FA] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Retry Full Quiz</span>
            </button>
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#867C96]/20 text-sm font-bold text-[#5E556E] hover:text-[#2B2438] cursor-pointer"
            >
              Back to Notebook
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-[#2B2438]">
                Words to Review (Những câu sai cần ôn lại)
              </h3>
              <p className="text-xs text-[#5E556E]">
                {missedRecords.length === 0
                  ? 'Perfect score! No missed words to review.'
                  : 'Review each missed word carefully with its transcription, Vietnamese meaning, and example sentence.'}
              </p>
            </div>
            {missedWords.length > 0 && (
              <button
                type="button"
                onClick={() => handleRestartWithWords(missedWords)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFE4E1] text-[#632F2D] border border-[#F7CBC6] text-xs font-bold hover:bg-[#FFD7D2] whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice Missed Words Again</span>
              </button>
            )}
          </div>

          {missedRecords.length > 0 && (
            <div className="divide-y divide-[#867C96]/15">
              {missedRecords.map(({ question, userAnswer }) => (
                <div key={question.id} className="py-4 first:pt-1 last:pb-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold text-[#2B2438]">
                        {question.word.english}
                      </span>
                      {question.word.ipa && (
                        <span className="font-ipa text-xs text-[#6F5C96]">
                          {question.word.ipa}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => speakText(question.word.english, speechAccent)}
                        className="p-1.5 rounded-lg bg-[#F3F0FC] text-[#3F3163] hover:bg-[#E6E6FA] cursor-pointer"
                        aria-label={`Pronounce ${question.word.english}`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs font-semibold text-[#9B4848]">
                      Your answer: {userAnswer || '(blank)'}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-[#1F4F4B]">
                    Vietnamese Meaning: {question.word.vietnamese}
                  </p>

                  {question.word.example && (
                    <div className="text-xs text-[#5E556E] space-y-0.5">
                      <p className="font-semibold text-[#2B2438]">
                        Example: {question.word.example}
                      </p>
                      {question.word.exampleVi && <p>{question.word.exampleVi}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);
  const targetWord = currentQuestion.word;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/80 border border-[#867C96]/20 text-xs sm:text-sm font-bold text-[#2B2438] hover:bg-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Quiz</span>
        </button>

        <span className="text-xs sm:text-sm font-bold text-[#3F3163] font-mono-num">
          Question {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#6F5C96]">
          <span>{quarterLabels[currentQuestion.quarter]}</span>
          <span className="font-mono-num">{progressPct}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-white/85 border border-[#867C96]/15 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#9C89D9] via-[#E58D93] to-[#6FC2BA] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Strictly ONE Question Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-[#867C96]">
                {currentQuestion.type === 'en_to_vi' &&
                  (isZh ? 'Chọn nghĩa tiếng Việt đúng' : 'Choose the Vietnamese meaning')}
                {currentQuestion.type === 'vi_to_en' &&
                  (isZh ? 'Dịch sang Tiếng Trung (汉字 hoặc Pinyin)' : 'Translate into English')}
                {currentQuestion.type === 'cloze' &&
                  (isZh ? 'Điền từ Tiếng Trung còn thiếu vào câu' : 'Complete the sentence with the missing word')}
                {currentQuestion.type === 'synonym' &&
                  (isZh ? 'Chọn từ đồng nghĩa Tiếng Trung' : 'Find the English synonym')}
                {currentQuestion.type === 'scramble' &&
                  (isZh
                    ? 'Kéo thả hoặc nhấn để xếp câu Tiếng Trung hoàn chỉnh'
                    : 'Drag or click words to build the English sentence')}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#2B2438] leading-snug">
                {currentQuestion.prompt}
              </h2>
              {currentQuestion.subPrompt && (
                <p className="text-sm text-[#5E556E]">{currentQuestion.subPrompt}</p>
              )}
            </div>

            {targetWord.imageUrl && currentQuestion.type !== 'vi_to_en' && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#D5CEF5] bg-[#FAF7FD] shrink-0">
                <img
                  src={targetWord.imageUrl}
                  alt={targetWord.english}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(currentQuestion.type === 'en_to_vi' ||
              currentQuestion.type === 'synonym' ||
              currentQuestion.type === 'vi_to_en') && (
              <button
                type="button"
                onClick={() => speakText(targetWord.english, speechAccent)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3F0FC] text-[#3F3163] hover:bg-[#E6E6FA] text-xs font-bold cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>
                  {currentQuestion.type === 'vi_to_en' ? 'Audio Hint' : 'Pronounce'}
                </span>
              </button>
            )}

            {(currentQuestion.type === 'vi_to_en' || currentQuestion.type === 'cloze') &&
              !checkedRecord && (
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF6DA] text-[#59471A] hover:bg-[#FCEEC5] text-xs font-bold cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>
                    {showHint
                      ? isZh && targetWord.ipa
                        ? `Pinyin: ${targetWord.ipa} (${targetWord.english.length} chữ)`
                        : `Starts with "${currentQuestion.correctAnswer[0]}" (${currentQuestion.correctAnswer.length} chars)`
                      : isZh
                      ? 'Gợi ý Pinyin'
                      : 'Letter Hint'}
                  </span>
                </button>
              )}
          </div>
        </div>

        {(currentQuestion.type === 'en_to_vi' || currentQuestion.type === 'synonym') && (
          <div className="grid grid-cols-1 gap-2.5">
            {currentQuestion.options?.map((opt, idx) => {
              const isChosen = selectedOption === opt;
              const isCorrectOpt =
                opt.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();

              let cardClasses =
                'bg-white/90 border-[#867C96]/20 hover:border-[#7C5CBF] text-[#2B2438]';
              if (checkedRecord) {
                if (isCorrectOpt) {
                  cardClasses = 'bg-[#E0F2F1] border-[#337C75] text-[#1F4F4B]';
                } else if (isChosen && !isCorrectOpt) {
                  cardClasses = 'bg-[#FFE4E1] border-[#C94C4C] text-[#632F2D]';
                } else {
                  cardClasses = 'bg-white/60 border-[#867C96]/15 text-[#867C96]';
                }
              } else if (isChosen) {
                cardClasses = 'bg-[#E6E6FA] border-[#6F5C96] text-[#2B2438] ring-2 ring-[#D5CEF5]';
              }

              return (
                <button
                  key={`${opt}-${idx}`}
                  type="button"
                  disabled={Boolean(checkedRecord)}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base font-semibold transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${cardClasses}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white/80 border border-[#867C96]/20 flex items-center justify-center text-xs font-bold font-mono-num shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </span>
                  {checkedRecord && isCorrectOpt && (
                    <CheckCircle2 className="w-5 h-5 text-[#1F4F4B] shrink-0" />
                  )}
                  {checkedRecord && isChosen && !isCorrectOpt && (
                    <XCircle className="w-5 h-5 text-[#B03B3B] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {(currentQuestion.type === 'vi_to_en' || currentQuestion.type === 'cloze') && (
          <div className="space-y-3">
            <input
              type="text"
              value={typedAnswer}
              disabled={Boolean(checkedRecord)}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCheck) {
                  handleCheckAnswer();
                }
              }}
              placeholder={
                isZh
                  ? 'Nhập chữ Hán (VD: 谢谢) hoặc Pinyin (VD: xiexie)...'
                  : 'Type your English answer here...'
              }
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl bg-white border-2 border-[#D5CEF5] focus:border-[#6F5C96] text-base font-bold text-[#2B2438] placeholder:text-[#867C96] disabled:bg-[#FAF7FD]"
            />
          </div>
        )}

        {currentQuestion.type === 'scramble' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-[#5E556E] mb-2">
                Your Sentence (drag or click tiles to arrange & reorder):
              </p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnAnswerZone(e)}
                className="min-h-[82px] p-3.5 rounded-2xl bg-white/90 border-2 border-dashed border-[#B9AEE8] flex flex-wrap items-center gap-2"
              >
                {answerTiles.length === 0 ? (
                  <span className="text-xs font-semibold text-[#867C96] mx-auto">
                    Click or drag word tiles here in grammatical order...
                  </span>
                ) : (
                  answerTiles.map((tile, idx) => (
                    <button
                      key={tile.uid}
                      type="button"
                      draggable={!checkedRecord}
                      onDragStart={() => setDraggedTile({ tile, source: 'answer' })}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.stopPropagation();
                        handleDropOnAnswerZone(e, idx);
                      }}
                      onClick={() => moveTileToBank(tile)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#E6E6FA] border border-[#B9AEE8] text-sm font-bold text-[#2B2438] hover:bg-[#D8D3F8] cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-[#6F5C96]" />
                      <span>{tile.text}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#5E556E] mb-2">Word Tiles:</p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropOnBankZone}
                className="min-h-[64px] p-3 rounded-2xl bg-[#FAF7FD] border border-[#867C96]/15 flex flex-wrap items-center gap-2"
              >
                {bankTiles.length === 0 ? (
                  <span className="text-xs font-semibold text-[#867C96] mx-auto">
                    All tiles placed above — click any tile above to move it back.
                  </span>
                ) : (
                  bankTiles.map((tile) => (
                    <button
                      key={tile.uid}
                      type="button"
                      draggable={!checkedRecord}
                      onDragStart={() => setDraggedTile({ tile, source: 'bank' })}
                      onClick={() => moveTileToAnswer(tile)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-[#867C96]/25 text-sm font-bold text-[#2B2438] hover:border-[#7C5CBF] hover:bg-[#F3F0FC] cursor-grab active:cursor-grabbing shadow-2xs"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-[#867C96]" />
                      <span>{tile.text}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instant Feedback Panel */}
        {checkedRecord && (
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              checkedRecord.isCorrect
                ? 'bg-[#E0F2F1]/90 border-[#6FC2BA] text-[#1F4F4B]'
                : 'bg-[#FFE4E1]/90 border-[#F29C94] text-[#632F2D]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {checkedRecord.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-[#1F4F4B] shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#B03B3B] shrink-0" />
                )}
                <span className="text-base font-bold">
                  {checkedRecord.isCorrect
                    ? 'Correct! (+15 XP)'
                    : `Not quite right — Correct answer: "${currentQuestion.correctAnswer}"`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => speakText(targetWord.example || targetWord.english, speechAccent)}
                className="p-2 rounded-xl bg-white/80 text-[#2B2438] hover:bg-white shrink-0 cursor-pointer"
                aria-label="Listen to pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-white/85 text-[#2B2438] space-y-1.5 text-sm">
              <p>
                <strong className="text-[#3F3163]">{targetWord.english}</strong>{' '}
                {targetWord.ipa && (
                  <span className="font-ipa text-xs text-[#6F5C96]">{targetWord.ipa}</span>
                )}{' '}
                — <span className="font-bold">{targetWord.vietnamese}</span>
              </p>

              {targetWord.example && (
                <div className="pt-1 border-t border-[#867C96]/15 text-xs space-y-0.5">
                  <p className="font-semibold text-[#2B2438]">Example: {targetWord.example}</p>
                  <p className="text-[#5E556E]">
                    Nghĩa câu ví dụ:{' '}
                    {targetWord.exampleVi ||
                      `Câu minh họa cho từ "${targetWord.english}" (${targetWord.vietnamese}).`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          {!checkedRecord ? (
            <button
              type="button"
              disabled={!canCheck}
              onClick={handleCheckAnswer}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C5CBF] to-[#C86D85] text-white text-sm font-bold hover:opacity-95 disabled:opacity-45 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              Check Answer
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2B2438] text-white text-sm font-bold hover:bg-[#3F3163] cursor-pointer"
            >
              <span>
                {currentIndex + 1 === questions.length ? 'View Results' : 'Next Question'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import { useEffect, useMemo, useState } from 'react';
import { Word, VaultId, LearningMode } from '../types';
import { buildQuiz } from '../lib/session';
import { recordReview } from '../lib/srs';
import { db, getVaultWords } from '../lib/db';
import { isSpeechAvailable, speak } from '../lib/speech';
import HighlightedExample from './HighlightedExample';

interface Props {
  vaultId: VaultId;
  words: Word[];
  mode: LearningMode;
  onFinish: () => void;
  onQuit: () => void;
}

type Phase = 'question' | 'feedback' | 'summary';

interface QueueItem {
  word: Word;
  isReQuiz: boolean;       // true if this is a second-chance after getting wrong
  originalIndex: number;
}

const REQUIZ_GAP = 4; // re-quiz wrong words after ~4 other items (interleaving with spacing)

export default function TestSession({ vaultId, words, mode, onFinish, onQuit }: Props) {
  // Pool for distractor generation
  const [pool, setPool] = useState<Word[]>(words);
  useEffect(() => {
    getVaultWords(vaultId).then(p => {
      setPool(p.length >= words.length ? p : words);
    });
  }, [vaultId]);

  // Build the queue: each word once initially, wrong ones get re-inserted
  const [queue, setQueue] = useState<QueueItem[]>(
    () => words.map((w, i) => ({ word: w, isReQuiz: false, originalIndex: i }))
  );
  const [position, setPosition] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [selected, setSelected] = useState<number | null>(null);

  const [firstPassResults, setFirstPassResults] = useState<Map<string, boolean>>(new Map());
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [startedAt] = useState(() => Date.now());

  const current = queue[position];
  const totalFirstPass = words.length;
  const isLastInQueue = position === queue.length - 1;

  const quiz = useMemo(
    () => current ? buildQuiz(current.word, pool) : null,
    [current?.word.word, pool]
  );

  function choose(optionIndex: number) {
    if (phase !== 'question' || !quiz || !current) return;
    setSelected(optionIndex);
    const isCorrect = optionIndex === quiz.correctIndex;

    // Stats and FSRS only count the FIRST attempt of each word
    if (!current.isReQuiz) {
      setFirstPassResults(prev => {
        const m = new Map(prev);
        m.set(current.word.word, isCorrect);
        return m;
      });
      if (isCorrect) {
        setCorrectCount(c => c + 1);
        recordReview(vaultId, current.word.word, 3);
      } else {
        setWrongCount(c => c + 1);
        setWrongWords(arr => [...arr, current.word.word]);
        recordReview(vaultId, current.word.word, 1);
        // Schedule a re-quiz of this word later in the queue
        setQueue(prev => {
          const insertAt = Math.min(position + 1 + REQUIZ_GAP, prev.length);
          const next = [...prev];
          next.splice(insertAt, 0, { ...current, isReQuiz: true });
          return next;
        });
      }
    }
    // For re-quiz, we don't change stats but still show feedback
    setPhase('feedback');
  }

  async function next() {
    if (position >= queue.length - 1) {
      // End of queue
      await db.sessions.add({
        vaultId,
        startedAt,
        finishedAt: Date.now(),
        wordsCount: totalFirstPass,
        correct: correctCount,
        wrong: wrongCount,
        wrongWords,
        mode,
      });
      setPhase('summary');
    } else {
      setPosition(p => p + 1);
      setSelected(null);
      setPhase('question');
    }
  }

  if (phase === 'summary') {
    return (
      <Summary
        correct={correctCount}
        total={totalFirstPass}
        wrongWords={wrongWords}
        mode={mode}
        onDone={onFinish}
      />
    );
  }

  if (!current || !quiz) return null;

  // Progress reflects first-pass progress (denominator = original word count)
  const firstPassDone = firstPassResults.size;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <button onClick={onQuit} className="text-mute hover:text-ink transition-colors">
          ← 返回
        </button>
        <div className="font-mono text-mute flex items-center gap-2">
          {current.isReQuiz && (
            <span className="text-amber text-[11px] uppercase tracking-wider">复习</span>
          )}
          {firstPassDone + (current.isReQuiz ? 0 : 1)} <span className="text-line">/</span> {totalFirstPass}
        </div>
      </div>
      <div className="h-1 bg-line/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-leaf transition-all duration-500"
          style={{ width: `${(firstPassDone / totalFirstPass) * 100}%` }}
        />
      </div>

      <div key={position} className="card p-7 animate-fade-up">
        <div className="text-sm font-semibold text-mute mb-2">
          {current.isReQuiz ? '错过的词,再试一次' : '选择正确的中文释义'}
        </div>
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="font-display text-4xl md:text-5xl font-medium">{current.word.word}</h2>
          <button
            onClick={() => speak(current.word.word)}
            className="text-mute hover:text-ink text-xl transition-colors"
            aria-label="发音"
          >
            🔊
          </button>
        </div>
        <div className="font-mono text-mute text-sm">{current.word.ipa}</div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {quiz.options.map((opt, i) => {
          const isChosen = selected === i;
          const isCorrect = i === quiz.correctIndex;
          const showFeedback = phase === 'feedback';
          let style =
            'card p-4 text-left text-lg border transition-all duration-200 active:scale-[0.99] ';
          if (!showFeedback) {
            style += 'hover:border-ink/40 cursor-pointer';
          } else {
            if (isCorrect) {
              style += 'border-leaf bg-leaf/5 text-leaf';
            } else if (isChosen) {
              style += 'border-rose bg-rose/5 text-rose animate-shake';
            } else {
              style += 'opacity-50';
            }
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={phase !== 'question'}
              className={style}
            >
              <span className="font-mono text-sm text-mute mr-3">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
              {showFeedback && isCorrect && <span className="ml-2">✓</span>}
              {showFeedback && isChosen && !isCorrect && <span className="ml-2">✗</span>}
            </button>
          );
        })}
      </div>

      {phase === 'feedback' && (
        <div className="card p-5 animate-pop space-y-3">
          {current.word.example && (
            <div className="pt-2 border-t border-line">
              <div className="text-sm font-semibold text-mute mb-1.5">【例句】</div>
              <div className="flex items-start gap-2 mb-1">
                <p className="font-display text-lg md:text-xl leading-snug flex-1">
                  <HighlightedExample example={current.word.example} target={current.word.word} />
                </p>
                <button
                  onClick={() => speak(current.word.example)}
                  className="btn-ghost shrink-0 text-xs px-3 py-1.5"
                  disabled={!isSpeechAvailable() || !current.word.example}
                  aria-label="播放例句"
                  title="播放例句"
                >
                  🔊 例句
                </button>
              </div>
              {current.word.exampleZh && (
                <p className="font-zh text-base md:text-lg text-mute leading-relaxed">{current.word.exampleZh}</p>
              )}
            </div>
          )}
          <button onClick={next} className="btn-primary w-full mt-2">
            {position >= queue.length - 1 ? '查看结果 →' : '下一题 →'}
          </button>
        </div>
      )}
    </div>
  );
}

function Summary({
  correct, total, wrongWords, mode, onDone,
}: {
  correct: number;
  total: number;
  wrongWords: string[];
  mode: LearningMode;
  onDone: () => void;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const flavor =
    pct === 100 ? '满分!太厉害了 🎉' :
    pct >= 80 ? '做得很棒 👍' :
    pct >= 60 ? '还不错,再接再厉' :
    '没关系,答错的词会自动安排重点复习';

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="card p-8 text-center">
        <div className="text-mute text-sm mb-3">
          {mode === 'test-only' ? '摸底测试完成' : '本轮测试完成'}
        </div>
        <div className="font-display text-6xl font-medium mb-2">
          {correct}<span className="text-mute text-3xl"> / {total}</span>
        </div>
        <div className="font-mono text-lg text-amber mb-3">{pct}%</div>
        <div className="text-sm text-mute">{flavor}</div>
      </div>

      {wrongWords.length > 0 && (
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-mute mb-2">
            答错的单词({wrongWords.length} 个)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {wrongWords.map(w => (
              <span key={w} className="chip bg-rose/10 text-rose">{w}</span>
            ))}
          </div>
          <p className="text-xs text-mute mt-3">
            这些词会在以后的学习里优先出现,直到掌握为止。
          </p>
        </div>
      )}

      <button onClick={onDone} className="btn-primary w-full">
        回到首页
      </button>
    </div>
  );
}

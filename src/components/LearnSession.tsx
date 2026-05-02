import { useEffect, useState } from 'react';
import { Word } from '../types';
import { speak, isSpeechAvailable, getVoiceLabel, ensureVoicesLoaded } from '../lib/speech';

interface Props {
  words: Word[];
  onFinish: () => void;
  onQuit: () => void;
}

export default function LearnSession({ words, onFinish, onQuit }: Props) {
  const [idx, setIdx] = useState(0);
  const [voiceLabel, setVoiceLabel] = useState<string>('');
  const current = words[idx];
  const isLast = idx === words.length - 1;

  useEffect(() => {
    (async () => {
      await ensureVoicesLoaded();
      setVoiceLabel(getVoiceLabel());
    })();
  }, []);

  // Auto-pronounce the word when the card first appears (best-effort)
  useEffect(() => {
    if (current) {
      const t = setTimeout(() => speak(current.word), 300);
      return () => clearTimeout(t);
    }
  }, [idx]);

  if (!current) return null;

  function next() {
    if (isLast) {
      onFinish();
    } else {
      setIdx(i => i + 1);
    }
  }

  function prev() {
    if (idx > 0) setIdx(i => i - 1);
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <button onClick={onQuit} className="text-mute hover:text-ink transition-colors">
          ← 退出
        </button>
        <div className="font-mono text-mute">
          {idx + 1} <span className="text-line">/</span> {words.length}
        </div>
      </div>

      <div className="h-1 bg-line/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-ink transition-all duration-500"
          style={{ width: `${((idx + 1) / words.length) * 100}%` }}
        />
      </div>

      {/* Word card */}
      <div key={idx} className="card p-8 animate-fade-up">
        <div className="flex items-start justify-between mb-3">
          <span className="chip text-base font-semibold px-4 py-2">{current.pos}</span>
          <span className="chip font-mono text-[11px]">
            首字母 {current.word[0].toUpperCase()}
          </span>
        </div>

        <h2 className="font-display text-5xl md:text-6xl font-medium tracking-tight mb-3 leading-none">
          {current.word}
        </h2>

        <div className="font-mono text-mute text-base mb-6">{current.ipa}</div>

        <div className="flex items-center gap-2 mb-7">
          <button
            onClick={() => speak(current.word)}
            className="btn-ghost text-sm px-4 py-2"
            disabled={!isSpeechAvailable()}
            title={voiceLabel || '发音'}
          >
            🔊 单词
          </button>
          <button
            onClick={() => speak(current.example)}
            className="btn-ghost text-sm px-4 py-2"
            disabled={!isSpeechAvailable()}
          >
            🔊 例句
          </button>
        </div>

        {current.fullForm && (
          <div className="mb-6 rounded-2xl bg-amber/10 border border-amber/30 px-4 py-3">
            <div className="text-sm font-semibold text-mute mb-1.5">【全称】</div>
            <p className="font-display text-lg md:text-xl text-ink leading-relaxed">
              {current.fullForm}
            </p>
          </div>
        )}

        {/* Meanings */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-mute mb-2">【中文释义】</div>
          <div className="font-zh text-xl text-ink leading-relaxed">
            {current.meanings.join(' · ')}
          </div>
        </div>

        {current.definition && (
          <div className="mb-7 rounded-2xl bg-cream/70 border border-line px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-mute mb-1.5">English definition</div>
            <p className="font-display text-lg text-ink leading-relaxed">
              {current.definition}
            </p>
          </div>
        )}

        {/* Example */}
        <div className="pt-5 border-t border-line">
          <div className="text-sm font-semibold text-mute mb-2">【例句】</div>
          <p className="font-display text-xl md:text-2xl leading-snug mb-2">
            {highlightTarget(current.example, current.word)}
          </p>
          <p className="font-zh text-base md:text-lg text-mute leading-relaxed">{current.exampleZh}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="btn-ghost flex-1 disabled:opacity-30"
        >
          ← 上一个
        </button>
        <button onClick={next} className="btn-primary flex-[2]">
          {isLast ? '完成,进入测试 →' : '下一个 →'}
        </button>
      </div>

      {!isSpeechAvailable() && (
        <p className="text-xs text-mute text-center">
          * 当前浏览器不支持语音朗读,请使用 Chrome / Edge / Safari
        </p>
      )}
      {isSpeechAvailable() && voiceLabel && (
        <p className="text-[11px] text-mute/70 text-center">
          当前语音: {voiceLabel}
        </p>
      )}
    </div>
  );
}

/** Highlight the target word inside the example, including common inflected forms (-s, -es, -ed, -ing, -ies) */
function highlightTarget(example: string, target: string) {
  // Build a regex that matches: target, target+s, target+es, target+ed, target+ing, target+ies
  //   and handles final-e drop (make → makes/made/making) and y→ies (carry → carries/carried)
  const t = target.toLowerCase();
  const alternatives = new Set<string>([t]);
  alternatives.add(t + 's');
  alternatives.add(t + 'es');
  alternatives.add(t + 'ed');
  alternatives.add(t + 'ing');
  if (t.endsWith('e')) {
    const stem = t.slice(0, -1);
    alternatives.add(stem + 'ed');
    alternatives.add(stem + 'ing');
  }
  if (t.endsWith('y') && t.length > 2) {
    const stem = t.slice(0, -1);
    alternatives.add(stem + 'ies');
    alternatives.add(stem + 'ied');
  }
  // Order by length desc so longer matches take precedence
  const pattern = Array.from(alternatives)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const regex = new RegExp(`\\b(${pattern})\\b`, 'ig');
  const parts = example.split(regex);
  return (
    <>
      {parts.map((p, i) =>
        alternatives.has(p.toLowerCase()) ? (
          <span key={i} className="text-amber font-medium">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

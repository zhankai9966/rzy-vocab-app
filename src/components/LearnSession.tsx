import { useEffect, useState } from 'react';
import { Word } from '../types';
import { speak, isSpeechAvailable, getVoiceLabel, ensureVoicesLoaded } from '../lib/speech';
import HighlightedExample from './HighlightedExample';

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
          <p
            className="example-sentence font-display text-xl md:text-2xl leading-snug mb-2"
            translate="no"
            spellCheck={false}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-ms-editor="false"
          >
            <HighlightedExample
              key={`${current.word}:${current.example}`}
              example={current.example}
              target={current.word}
            />
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

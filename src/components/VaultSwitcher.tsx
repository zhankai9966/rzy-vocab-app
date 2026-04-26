import { useEffect, useState } from 'react';
import { VaultId, VAULT_LABELS, VAULT_LIST } from '../types';
import { getVaultWordCount } from '../lib/db';
import { getStats } from '../lib/srs';

interface Props {
  current: VaultId;
  onSelect: (v: VaultId) => void;
  onClose: () => void;
}

interface VaultStat {
  words: number;
  learned: number;
}

export default function VaultSwitcher({ current, onSelect, onClose }: Props) {
  const [stats, setStats] = useState<Record<VaultId, VaultStat | null>>({
    longman3000: null,
    rzy: null,
  });

  useEffect(() => {
    (async () => {
      const out: Record<VaultId, VaultStat> = { longman3000: { words: 0, learned: 0 }, rzy: { words: 0, learned: 0 } };
      for (const v of VAULT_LIST) {
        const w = await getVaultWordCount(v);
        const s = await getStats(v);
        out[v] = { words: w, learned: s.learned };
      }
      setStats(out);
    })();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-3xl p-6 w-full max-w-md shadow-card border border-line"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-medium">选择词库</h2>
          <button onClick={onClose} className="text-mute hover:text-ink text-sm">关闭</button>
        </div>
        <p className="text-sm text-mute mb-5 leading-relaxed">
          每个词库的学习进度、设置都是独立的,互不影响。
        </p>
        <div className="space-y-2">
          {VAULT_LIST.map(v => {
            const isCurrent = v === current;
            const stat = stats[v];
            return (
              <button
                key={v}
                onClick={() => onSelect(v)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-amber/60 bg-amber/5'
                    : 'border-line hover:border-ink/40 bg-white'
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-display text-lg font-medium">{VAULT_LABELS[v]}</span>
                  {isCurrent && <span className="text-xs text-amber font-medium">当前</span>}
                </div>
                <div className="text-xs text-mute font-mono">
                  {stat ? `${stat.words} 个词 · 已学 ${stat.learned}` : '加载中…'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

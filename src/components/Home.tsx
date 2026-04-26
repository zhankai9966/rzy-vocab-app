import { useEffect, useState } from 'react';
import { VaultId, VAULT_LABELS, LearningMode } from '../types';
import { getStats } from '../lib/srs';
import {
  db, getVaultWordCount, isDefaultPackLoaded, loadDefaultPack,
} from '../lib/db';

interface Props {
  vaultId: VaultId;
  onStart: (mode: LearningMode) => void;
}

export default function Home({ vaultId, onStart }: Props) {
  const [stats, setStats] = useState({ learned: 0, due: 0, mastered: 0 });
  const [sessionCount, setSessionCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const s = await getStats(vaultId);
      setStats(s);
      const sc = await db.sessions.where('vaultId').equals(vaultId).count();
      setSessionCount(sc);
      const wc = await getVaultWordCount(vaultId);
      setWordCount(wc);
    })();
  }, [vaultId, refreshKey]);

  async function handleLoadDefault() {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await loadDefaultPack(vaultId);
      alert(`默认词包已加载: 新增 ${result.added} 个词。`);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      setLoadError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = wordCount === 0;
  const isLongman = vaultId === 'longman3000';
  const defaultLoaded = isDefaultPackLoaded(vaultId);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <section className="card p-7">
        <p className="text-mute text-sm mb-2">
          {VAULT_LABELS[vaultId]} · 今天也是好好背单词的一天
        </p>
        {isEmpty ? (
          <EmptyVaultPrompt
            vaultId={vaultId}
            isLongman={isLongman}
            defaultLoaded={defaultLoaded}
            loading={loading}
            onLoadDefault={handleLoadDefault}
            error={loadError}
          />
        ) : (
          <>
            <h1 className="font-display text-3xl md:text-4xl font-medium leading-tight mb-6">
              从 {wordCount} 个词里<br />
              随机挑 <span className="font-bold text-amber">10 个</span>,开始吧
            </h1>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => onStart('learn-then-test')}
                className="btn-primary flex-1 text-base px-6 py-4"
              >
                先学习,后测试 →
              </button>
              <button
                onClick={() => onStart('test-only')}
                className="btn-ghost flex-1 text-base px-6 py-4"
              >
                直接测试(摸底)
              </button>
            </div>
            <p className="text-xs text-mute mt-3 leading-relaxed">
              "直接测试"适合已经有基础的学习者 — 答错的词会在后续学习时优先出现。
            </p>
          </>
        )}
      </section>

      {/* Stats */}
      {!isEmpty && (
        <section className="grid grid-cols-3 gap-3">
          <StatCard label="已学单词" value={stats.learned} />
          <StatCard label="待复习" value={stats.due} highlight={stats.due > 0} />
          <StatCard label="学习次数" value={sessionCount} />
        </section>
      )}
    </div>
  );
}

function EmptyVaultPrompt({
  vaultId, isLongman, defaultLoaded, loading, onLoadDefault, error,
}: {
  vaultId: VaultId;
  isLongman: boolean;
  defaultLoaded: boolean;
  loading: boolean;
  onLoadDefault: () => void;
  error: string | null;
}) {
  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-medium leading-tight mb-3">
        这个词库还是空的
      </h1>
      <p className="text-sm text-mute leading-relaxed mb-5">
        {isLongman
          ? '可以一键加载内置的「朗曼基础 401 词」开始,或在「设置」里导入自己的词包。'
          : '可以在「设置」里导入你自己的词包(如 IT 专业词)。'}
      </p>

      {isLongman && !defaultLoaded && (
        <button
          onClick={onLoadDefault}
          disabled={loading}
          className="btn-accent text-sm px-6 py-3 disabled:opacity-50"
        >
          {loading ? '加载中…' : '加载默认词包(401 词) →'}
        </button>
      )}
      {isLongman && defaultLoaded && (
        <p className="text-xs text-mute italic">
          默认词包已加载过 — 如果需要重新加载,请到设置里清空词库后再试。
        </p>
      )}
      {error && (
        <p className="text-xs text-rose mt-3">{error}</p>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`card p-4 text-center ${highlight ? 'ring-2 ring-amber/40' : ''}`}>
      <div className={`font-display text-3xl font-medium ${highlight ? 'text-amber' : 'text-ink'}`}>
        {value}
      </div>
      <div className="text-xs text-mute mt-1">{label}</div>
    </div>
  );
}

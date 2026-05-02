import { useEffect, useRef, useState } from 'react';
import { VaultId, VAULT_LABELS, LearningMode } from '../types';
import { getStats } from '../lib/srs';
import {
  db, getVaultWordCount, isDefaultPackLoaded, loadDefaultPack,
} from '../lib/db';

interface Props {
  vaultId: VaultId;
  onStart: (mode: LearningMode) => void;
  onReviewDue: (mode: LearningMode) => void;
}

export default function Home({ vaultId, onStart, onReviewDue }: Props) {
  const [stats, setStats] = useState({ learned: 0, due: 0, mastered: 0 });
  const [sessionCount, setSessionCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [wordCountReady, setWordCountReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDueActions, setShowDueActions] = useState(false);
  const autoLoadVaultRef = useRef<VaultId | null>(null);

  useEffect(() => {
    let cancelled = false;
    setWordCountReady(false);
    (async () => {
      const s = await getStats(vaultId);
      if (cancelled) return;
      setStats(s);
      const sc = await db.sessions.where('vaultId').equals(vaultId).count();
      if (cancelled) return;
      setSessionCount(sc);
      const wc = await getVaultWordCount(vaultId);
      if (cancelled) return;
      setWordCount(wc);
      setWordCountReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultId, refreshKey]);

  useEffect(() => {
    const defaultLoaded = isDefaultPackLoaded(vaultId);
    if (
      !wordCountReady
      || defaultLoaded
      || autoLoadVaultRef.current === vaultId
      || loading
    ) return;
    let cancelled = false;
    autoLoadVaultRef.current = vaultId;
    (async () => {
      setAutoLoading(true);
      setLoadError(null);
      try {
        await loadDefaultPack(vaultId, { replaceWords: true });
        if (!cancelled) setRefreshKey(k => k + 1);
      } catch (e: any) {
        if (!cancelled) {
          autoLoadVaultRef.current = null;
          setLoadError(e?.message ?? String(e));
        }
      } finally {
        if (!cancelled) setAutoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultId, wordCountReady, wordCount, loading]);

  async function handleLoadDefault() {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await loadDefaultPack(vaultId, { replaceWords: true });
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
  const isRzy = vaultId === 'rzy';
  const hasBuiltInPack = isLongman || isRzy;
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
            isRzy={isRzy}
            hasBuiltInPack={hasBuiltInPack}
            defaultLoaded={defaultLoaded}
            loading={loading || autoLoading}
            autoLoading={autoLoading}
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
          <StatCard
            label="待复习"
            value={stats.due}
            highlight={stats.due > 0}
            buttonLabel={stats.due > 0 ? '复习待复习单词' : undefined}
            onClick={stats.due > 0 ? () => setShowDueActions(true) : undefined}
          />
          <StatCard label="学习次数" value={sessionCount} />
        </section>
      )}

      {showDueActions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/35 px-5 py-6">
          <div className="card w-full max-w-sm p-5 animate-pop">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-2xl font-medium">待复习单词</h2>
                <p className="text-sm text-mute mt-1">
                  当前有 {stats.due} 个到期复习词。选一个方式开始。
                </p>
              </div>
              <button
                onClick={() => setShowDueActions(false)}
                className="text-mute hover:text-ink transition-colors"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setShowDueActions(false);
                  onReviewDue('learn-then-test');
                }}
                className="btn-primary w-full"
              >
                先学习，再测试
              </button>
              <button
                onClick={() => {
                  setShowDueActions(false);
                  onReviewDue('test-only');
                }}
                className="btn-ghost w-full"
              >
                直接测试
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyVaultPrompt({
  vaultId, isLongman, isRzy, hasBuiltInPack, defaultLoaded, loading, autoLoading, onLoadDefault, error,
}: {
  vaultId: VaultId;
  isLongman: boolean;
  isRzy: boolean;
  hasBuiltInPack: boolean;
  defaultLoaded: boolean;
  loading: boolean;
  autoLoading: boolean;
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
          ? '正在为你准备内置的朗曼基础词库。升级词库时会保留复习计划。'
          : isRzy
          ? '正在为你准备内置的 rzy-IT 专业词库。升级词库时会保留复习计划。'
          : '可以在「设置」里导入你自己的词包。'}
      </p>

      {hasBuiltInPack && autoLoading && (
        <div className="chip bg-amber/10 text-amber">
          正在加载内置词库...
        </div>
      )}

      {hasBuiltInPack && !defaultLoaded && !autoLoading && (
        <button
          onClick={onLoadDefault}
          disabled={loading}
          className="btn-accent text-sm px-6 py-3 disabled:opacity-50"
        >
          {loading ? '加载中...' : '加载内置词库 →'}
        </button>
      )}
      {hasBuiltInPack && defaultLoaded && (
        <p className="text-xs text-mute italic">
          默认词包已加载过 - 如果需要重新加载,请到设置里清空词库后再试。
        </p>
      )}
      {error && (
        <p className="text-xs text-rose mt-3">{error}</p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  onClick,
  buttonLabel,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  onClick?: () => void;
  buttonLabel?: string;
}) {
  const className = `card p-4 text-center ${highlight ? 'ring-2 ring-amber/40' : ''} ${
    onClick ? 'cursor-pointer hover:border-amber/60 active:scale-[0.99] transition-all' : ''
  }`;
  const content = (
    <>
      <div className={`font-display text-3xl font-medium ${highlight ? 'text-amber' : 'text-ink'}`}>
        {value}
      </div>
      <div className="text-xs text-mute mt-1">{label}</div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={buttonLabel ?? label}>
        {content}
      </button>
    );
  }
  return (
    <div className={className}>
      {content}
    </div>
  );
}

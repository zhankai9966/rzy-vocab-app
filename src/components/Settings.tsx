import { useEffect, useRef, useState } from 'react';
import {
  db,
  exportVaultData, importVaultBackup,
  importWordPackFromFile, getVaultWordCount, clearVaultWords,
  loadDefaultPack, isDefaultPackLoaded,
  WordPackImportResult,
  getLastBackupTime,
} from '../lib/db';
import { getVoiceLabel } from '../lib/speech';
import { VaultId, VAULT_LABELS } from '../types';

interface Props {
  vaultId: VaultId;
  onBack: () => void;
}

export default function Settings({ vaultId, onBack }: Props) {
  const [wordCount, setWordCount] = useState(0);
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<WordPackImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const wordPackRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refresh(); }, [vaultId]);

  async function refresh() {
    setWordCount(await getVaultWordCount(vaultId));
    setLastBackup(getLastBackupTime(vaultId));
  }

  async function handleWordPackImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setImportResult(null);
    try {
      const result = await importWordPackFromFile(vaultId, file);
      setImportResult(result);
      await refresh();
    } catch (err: any) {
      alert('导入失败: ' + err.message);
    } finally {
      setBusy(false);
      if (wordPackRef.current) wordPackRef.current.value = '';
    }
  }

  async function handleBackupImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`恢复备份会覆盖当前词库「${VAULT_LABELS[vaultId]}」的所有数据。确定继续?`)) return;
    try {
      await importVaultBackup(vaultId, file);
      alert('备份已恢复,即将刷新页面。');
      location.reload();
    } catch (err: any) {
      alert('恢复失败: ' + err.message);
    }
  }

  async function handleLoadDefault() {
    if (vaultId !== 'longman3000') {
      alert('默认词包只对「朗曼 3000」词库可用。');
      return;
    }
    setBusy(true);
    try {
      const r = await loadDefaultPack(vaultId);
      setImportResult(r);
      await refresh();
    } catch (e: any) {
      alert('加载失败: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClearWords() {
    if (!confirm(`确定要清空词库「${VAULT_LABELS[vaultId]}」里全部 ${wordCount} 个词吗?\n\n(学习进度记录会保留 — 但因为词没了,这些进度也无意义)`)) return;
    await clearVaultWords(vaultId);
    setImportResult(null);
    await refresh();
  }

  async function handleResetProgress() {
    if (!confirm(`确定要清除词库「${VAULT_LABELS[vaultId]}」的全部学习进度吗?\n\n(词库本身不会删,但已学/已复习的记录会全部归零)`)) return;
    await db.reviews.where('vaultId').equals(vaultId).delete();
    await db.sessions.where('vaultId').equals(vaultId).delete();
    alert('学习进度已清除。');
    onBack();
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-mute hover:text-ink text-sm">← 返回</button>

      <div className="card p-6 space-y-3.5">
        <h2 className="font-display text-2xl font-medium">设置</h2>
        <Row label="当前词库" value={VAULT_LABELS[vaultId]} />
        <Row label="词库总数" value={`${wordCount} 个`} />
        <Row label="发音引擎" value={getVoiceLabel() || '(浏览器默认)'} />
        <Row
          label="上次备份"
          value={lastBackup ? new Date(lastBackup).toLocaleString('zh-CN') : '从未备份'}
        />
      </div>

      <div className="card p-6 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-medium">导入词包</h3>
          {wordCount > 0 && <span className="text-xs text-mute">已有 {wordCount} 个词</span>}
        </div>
        <p className="text-sm text-mute leading-relaxed">
          选择 <code className="font-mono text-xs bg-ink/5 px-1.5 py-0.5 rounded">.json</code> 词包文件。
          导入会和现有词库合并,同名词以新版本为准。<strong>所有词只导入到当前词库「{VAULT_LABELS[vaultId]}」</strong>。
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => wordPackRef.current?.click()}
            disabled={busy}
            className="btn-accent text-sm px-5 py-2.5 disabled:opacity-50"
          >
            {busy ? '处理中…' : '选择词包文件 →'}
          </button>
          {vaultId === 'longman3000' && !isDefaultPackLoaded(vaultId) && (
            <button
              onClick={handleLoadDefault}
              disabled={busy}
              className="btn-ghost text-sm"
            >
              加载默认词包(401 词)
            </button>
          )}
          {wordCount > 0 && (
            <button
              onClick={handleClearWords}
              disabled={busy}
              className="btn-ghost text-sm text-rose border-rose/30 hover:bg-rose/5"
            >
              清空词库
            </button>
          )}
          <input
            ref={wordPackRef}
            type="file"
            accept="application/json,.json"
            onChange={handleWordPackImport}
            className="hidden"
          />
        </div>

        {importResult && (
          <div className="mt-3 p-4 rounded-2xl bg-leaf/5 border border-leaf/30 animate-fade-up">
            <div className="text-sm font-medium text-leaf mb-2">
              导入完成{importResult.packName ? ` · ${importResult.packName}` : ''}
            </div>
            <div className="text-xs text-mute leading-relaxed space-y-0.5">
              <div>共 {importResult.total} 个 · 新增 {importResult.added} · 更新 {importResult.updated} · 跳过 {importResult.skipped}</div>
              {importResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-rose">{importResult.errors.length} 处问题(展开查看)</summary>
                  <ul className="mt-1 ml-4 list-disc text-rose">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 space-y-3">
        <h3 className="font-medium">学习进度备份</h3>
        <p className="text-sm text-mute leading-relaxed">
          浏览器清缓存会清掉进度。<strong>建议每周备份一次</strong> — 备份只包含当前词库「{VAULT_LABELS[vaultId]}」的数据。
        </p>
        <div className="flex gap-2">
          <button onClick={() => exportVaultData(vaultId).then(refresh)} className="btn-ghost text-sm flex-1">
            导出备份
          </button>
          <button onClick={() => backupRef.current?.click()} className="btn-ghost text-sm flex-1">
            从备份恢复
          </button>
          <input
            ref={backupRef}
            type="file"
            accept="application/json"
            onChange={handleBackupImport}
            className="hidden"
          />
        </div>
      </div>

      <div className="card p-6 space-y-2">
        <h3 className="font-medium text-rose">危险操作</h3>
        <button
          onClick={handleResetProgress}
          className="btn-ghost text-sm text-rose border-rose/30 hover:bg-rose/5 w-full"
        >
          清除当前词库的学习进度
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-line/60 pb-2.5 last:border-b-0 last:pb-0">
      <span className="text-mute">{label}</span>
      <span className="text-xs text-ink text-right max-w-[65%]">{value}</span>
    </div>
  );
}

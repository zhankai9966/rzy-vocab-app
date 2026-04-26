import { useEffect, useState } from 'react';
import { VaultId } from '../types';
import { exportVaultData, getLastBackupTime, db } from '../lib/db';

interface Props {
  vaultId: VaultId;
  /** Increment this to force re-check (e.g. after a session finishes) */
  reloadKey: number;
}

const REMINDER_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function BackupReminder({ vaultId, reloadKey }: Props) {
  const [needs, setNeeds] = useState(false);
  const [days, setDays] = useState(0);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    (async () => {
      // Check if there's any data worth backing up
      const sessionCount = await db.sessions.where('vaultId').equals(vaultId).count();
      setHasData(sessionCount > 0);

      const last = getLastBackupTime(vaultId);
      const elapsed = last ? Date.now() - last : Infinity;
      setDays(last ? Math.floor(elapsed / (24 * 60 * 60 * 1000)) : -1);
      setNeeds(elapsed > REMINDER_AFTER_MS && sessionCount > 0);
    })();
  }, [vaultId, reloadKey]);

  if (!needs || !hasData) return null;

  async function backup() {
    try {
      await exportVaultData(vaultId);
      setNeeds(false);
    } catch (e: any) {
      alert('备份失败: ' + (e?.message ?? e));
    }
  }

  return (
    <div className="mb-5 p-4 rounded-2xl bg-amber/10 border border-amber/40 flex items-center justify-between gap-3 animate-fade-up">
      <div className="text-sm text-ink leading-snug">
        <div className="font-medium">⚠️ 该备份了</div>
        <div className="text-mute mt-0.5">
          {days < 0 ? '你还没有备份过学习进度。' : `已经 ${days} 天没备份。`}
        </div>
      </div>
      <button onClick={backup} className="btn-accent text-sm whitespace-nowrap">
        立即备份
      </button>
    </div>
  );
}

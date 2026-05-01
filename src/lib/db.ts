import Dexie, { Table } from 'dexie';
import { ReviewRecord, SessionResult, Word, VaultWord, VaultId } from '../types';

export class AppDatabase extends Dexie {
  reviews!: Table<ReviewRecord, string>;       // id = `${vaultId}:${word}`
  sessions!: Table<SessionResult, number>;
  words!: Table<VaultWord, string>;            // id = `${vaultId}:${word}`

  constructor() {
    super('RzyVocabApp');
    this.version(1).stores({
      reviews: 'id, vaultId, word, due, state, [vaultId+state], [vaultId+due]',
      sessions: '++id, vaultId, startedAt',
      words: 'id, vaultId, word, [vaultId+pos]',
    });
  }
}

export const db = new AppDatabase();

/* ───────────── Active vault (which vault is in use) ───────────── */

const ACTIVE_VAULT_KEY = 'rzy.activeVault';

export function getActiveVault(): VaultId {
  const v = localStorage.getItem(ACTIVE_VAULT_KEY);
  if (v === 'longman3000' || v === 'rzy') return v;
  return 'longman3000';
}

export function setActiveVault(vault: VaultId) {
  localStorage.setItem(ACTIVE_VAULT_KEY, vault);
}

/* ───────────── Word storage (per-vault) ───────────── */

function makeWordId(vaultId: VaultId, word: string): string {
  return `${vaultId}:${word.toLowerCase()}`;
}

export async function getVaultWords(vaultId: VaultId): Promise<Word[]> {
  const rows = await db.words.where('vaultId').equals(vaultId).toArray();
  return rows.map(r => ({
    word: r.word, pos: r.pos, ipa: r.ipa,
    meanings: r.meanings, definition: r.definition ?? '',
    example: r.example, exampleZh: r.exampleZh,
  }));
}

export async function getVaultWordCount(vaultId: VaultId): Promise<number> {
  return db.words.where('vaultId').equals(vaultId).count();
}

export async function clearVaultWords(vaultId: VaultId): Promise<void> {
  await db.words.where('vaultId').equals(vaultId).delete();
}

/* ───────────── Word-pack import (per-vault) ───────────── */

export interface WordPackImportResult {
  added: number;
  updated: number;
  skipped: number;
  total: number;
  errors: string[];
  packName?: string;
}

function validateWord(raw: any): { ok: true; word: Word } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: '不是对象' };
  if (typeof raw.word !== 'string' || !raw.word.trim()) {
    return { ok: false, reason: '缺少 word 字段' };
  }
  let meanings: string[] | null = null;
  if (Array.isArray(raw.meanings) && raw.meanings.length) {
    meanings = raw.meanings.map((m: any) => String(m).trim()).filter(Boolean);
  } else if (typeof raw.meanings === 'string' && raw.meanings.trim()) {
    meanings = [raw.meanings.trim()];
  } else if (typeof raw.meaning === 'string' && raw.meaning.trim()) {
    meanings = [raw.meaning.trim()];
  }
  if (!meanings || meanings.length === 0) {
    return { ok: false, reason: '缺少 meanings(中文释义)' };
  }
  const w: Word = {
    word: raw.word.trim().toLowerCase(),
    pos: typeof raw.pos === 'string' && raw.pos.trim() ? raw.pos.trim() : '—',
    ipa: typeof raw.ipa === 'string' ? raw.ipa.trim() : '',
    meanings,
    definition: typeof raw.definition === 'string' ? raw.definition.trim()
                : (typeof raw.definitionEn === 'string' ? raw.definitionEn.trim()
                : (typeof raw.englishDefinition === 'string' ? raw.englishDefinition.trim() : '')),
    example: typeof raw.example === 'string' ? raw.example.trim() : '',
    exampleZh: typeof raw.exampleZh === 'string' ? raw.exampleZh.trim()
              : (typeof raw.example_zh === 'string' ? raw.example_zh.trim() : ''),
  };
  return { ok: true, word: w };
}

/** Import a word pack from raw JSON into a specific vault */
export async function importWordPackData(vaultId: VaultId, parsed: any): Promise<WordPackImportResult> {
  const list: any[] | null = Array.isArray(parsed) ? parsed
                    : Array.isArray(parsed?.words) ? parsed.words
                    : null;
  if (!list) {
    throw new Error('JSON 格式不对。期望是一个数组,或带有 words 数组的对象。');
  }

  const packName = !Array.isArray(parsed) && typeof parsed?.name === 'string' ? parsed.name : undefined;
  const result: WordPackImportResult = {
    added: 0, updated: 0, skipped: 0, total: list.length, errors: [], packName,
  };

  await db.transaction('rw', db.words, async () => {
    for (let i = 0; i < list.length; i++) {
      const v = validateWord(list[i]);
      if (!v.ok) {
        result.skipped++;
        if (result.errors.length < 5) {
          result.errors.push(`第 ${i + 1} 个: ${v.reason}`);
        }
        continue;
      }
      const id = makeWordId(vaultId, v.word.word);
      const existing = await db.words.get(id);
      const vw: VaultWord = { id, vaultId, ...v.word };
      await db.words.put(vw);
      if (existing) result.updated++;
      else result.added++;
    }
  });

  return result;
}

export async function importWordPackFromFile(vaultId: VaultId, file: File): Promise<WordPackImportResult> {
  const text = await file.text();
  let parsed: any;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('文件不是有效的 JSON。请检查格式。'); }
  return importWordPackData(vaultId, parsed);
}

/* ───────────── Backup / restore (per-vault) ───────────── */

export async function exportVaultData(vaultId: VaultId) {
  const reviews = await db.reviews.where('vaultId').equals(vaultId).toArray();
  const sessions = await db.sessions.where('vaultId').equals(vaultId).toArray();
  const words = await db.words.where('vaultId').equals(vaultId).toArray();
  const data = {
    appVersion: '1.0.0',
    vaultId,
    exportedAt: Date.now(),
    reviews,
    sessions,
    words,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeId = vaultId.replace(/[^a-z0-9]/gi, '-');
  a.download = `vocab-backup-${safeId}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  // Mark backup time
  localStorage.setItem(`rzy.lastBackup.${vaultId}`, String(Date.now()));
}

export async function importVaultBackup(vaultId: VaultId, file: File) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.reviews)) {
    throw new Error('备份文件格式不正确。');
  }
  await db.transaction('rw', db.reviews, db.sessions, db.words, async () => {
    // Clear only this vault's data
    await db.reviews.where('vaultId').equals(vaultId).delete();
    await db.sessions.where('vaultId').equals(vaultId).delete();
    await db.words.where('vaultId').equals(vaultId).delete();
    // Re-insert with this vault's id (in case the backup came from another vault)
    if (Array.isArray(data.reviews)) {
      const fixed = data.reviews.map((r: any) => ({
        ...r,
        vaultId,
        id: makeWordId(vaultId, r.word),
      }));
      await db.reviews.bulkAdd(fixed);
    }
    if (Array.isArray(data.sessions)) {
      const fixed = data.sessions.map((s: any) => {
        const { id, ...rest } = s;
        return { ...rest, vaultId };
      });
      await db.sessions.bulkAdd(fixed);
    }
    if (Array.isArray(data.words)) {
      const fixed = data.words.map((w: any) => ({
        ...w,
        vaultId,
        id: makeWordId(vaultId, w.word),
      }));
      await db.words.bulkAdd(fixed);
    }
  });
}

export function getLastBackupTime(vaultId: VaultId): number | null {
  const v = localStorage.getItem(`rzy.lastBackup.${vaultId}`);
  return v ? Number(v) : null;
}

/* ───────────── Default pack loading ───────────── */

const DEFAULT_PACK_LOADED_KEY = 'rzy.defaultPackLoaded';
const DEFAULT_PACK_VERSION = 3;

export function isDefaultPackLoaded(vaultId: VaultId): boolean {
  const raw = localStorage.getItem(DEFAULT_PACK_LOADED_KEY);
  if (!raw) return false;
  try {
    const obj = JSON.parse(raw);
    return obj[vaultId] === DEFAULT_PACK_VERSION;
  } catch { return false; }
}

export function markDefaultPackLoaded(vaultId: VaultId) {
  const raw = localStorage.getItem(DEFAULT_PACK_LOADED_KEY);
  let obj: Record<string, number> = {};
  if (raw) { try { obj = JSON.parse(raw); } catch {} }
  obj[vaultId] = DEFAULT_PACK_VERSION;
  localStorage.setItem(DEFAULT_PACK_LOADED_KEY, JSON.stringify(obj));
}

export async function loadDefaultPack(
  vaultId: VaultId,
  options: { replaceWords?: boolean } = {},
): Promise<WordPackImportResult> {
  const url = `${import.meta.env.BASE_URL}wordpacks/default.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('下载默认词包失败,请检查网络。');
  const json = await resp.json();
  if (options.replaceWords) {
    await clearVaultWords(vaultId);
  }
  const result = await importWordPackData(vaultId, json);
  markDefaultPackLoaded(vaultId);
  return result;
}

import { Word, QuizQuestion, VaultId } from '../types';
import { getDueWords, getOrCreateReview } from './srs';
import { getVaultWords } from './db';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw N words from a vault, prioritising:
 *   0. Due review words
 *   1. New words
 *   2. Already-seen (not due)
 * with a per-letter cap of 2.
 */
export async function drawSession(vaultId: VaultId, n: number = 10): Promise<Word[]> {
  const words = await getVaultWords(vaultId);
  if (words.length === 0) return [];
  const dueSet = new Set(await getDueWords(vaultId));

  const scored: { word: Word; score: number }[] = [];
  for (const w of words) {
    if (dueSet.has(w.word)) {
      scored.push({ word: w, score: 0 });
    } else {
      const rec = await getOrCreateReview(vaultId, w.word);
      scored.push({ word: w, score: rec.state === 0 ? 1 : 2 });
    }
  }
  scored.sort((a, b) => a.score - b.score || Math.random() - 0.5);

  const picked: Word[] = [];
  const letterCount: Record<string, number> = {};
  const MAX = 2;
  for (const { word } of scored) {
    const l = word.word[0].toUpperCase();
    if ((letterCount[l] || 0) < MAX) {
      picked.push(word);
      letterCount[l] = (letterCount[l] || 0) + 1;
      if (picked.length >= n) break;
    }
  }
  if (picked.length < n) {
    const got = new Set(picked.map(w => w.word));
    for (const { word } of scored) {
      if (got.has(word.word)) continue;
      picked.push(word);
      if (picked.length >= n) break;
    }
  }
  return shuffle(picked);
}

/** Build a quiz question with 4 Chinese options, 1 correct */
export function buildQuiz(target: Word, pool: Word[]): QuizQuestion {
  const correct = target.meanings[0];
  const sameType = pool.filter(w => w.word !== target.word && w.pos === target.pos);
  const others = pool.filter(w => w.word !== target.word && w.pos !== target.pos);
  const picks: string[] = [];
  const used = new Set([correct]);
  const candidates = shuffle(sameType.length >= 3 ? sameType : [...sameType, ...others]);
  for (const c of candidates) {
    const m = c.meanings[0];
    if (!used.has(m)) {
      picks.push(m);
      used.add(m);
      if (picks.length === 3) break;
    }
  }
  while (picks.length < 3) picks.push('—');
  const options = shuffle([correct, ...picks]);
  return { word: target, options, correctIndex: options.indexOf(correct) };
}

import { fsrs, generatorParameters, createEmptyCard, State, Grade } from 'ts-fsrs';
import { db } from './db';
import { ReviewRecord, Rating, VaultId } from '../types';

const scheduler = fsrs(generatorParameters({
  enable_fuzz: true,
  request_retention: 0.9,
}));

function makeId(vaultId: VaultId, word: string): string {
  return `${vaultId}:${word.toLowerCase()}`;
}

export async function getOrCreateReview(vaultId: VaultId, word: string): Promise<ReviewRecord> {
  const id = makeId(vaultId, word);
  const existing = await db.reviews.get(id);
  if (existing) return existing;
  const empty = createEmptyCard(new Date());
  return {
    id, vaultId, word,
    due: empty.due.getTime(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state,
    lastReview: empty.last_review?.getTime() ?? 0,
  };
}

export async function recordReview(vaultId: VaultId, word: string, rating: Rating): Promise<ReviewRecord> {
  const rec = await getOrCreateReview(vaultId, word);
  const card = {
    due: new Date(rec.due),
    stability: rec.stability,
    difficulty: rec.difficulty,
    elapsed_days: rec.elapsedDays,
    scheduled_days: rec.scheduledDays,
    reps: rec.reps,
    lapses: rec.lapses,
    state: rec.state as State,
    last_review: rec.lastReview ? new Date(rec.lastReview) : undefined,
  };
  const now = new Date();
  const result = scheduler.next(card, now, rating as Grade);
  const updated: ReviewRecord = {
    id: rec.id,
    vaultId,
    word,
    due: result.card.due.getTime(),
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    elapsedDays: result.card.elapsed_days,
    scheduledDays: result.card.scheduled_days,
    reps: result.card.reps,
    lapses: result.card.lapses,
    state: result.card.state,
    lastReview: result.card.last_review?.getTime() ?? now.getTime(),
  };
  await db.reviews.put(updated);
  return updated;
}

export async function getDueWords(vaultId: VaultId): Promise<string[]> {
  const now = Date.now();
  const all = await db.reviews.where('vaultId').equals(vaultId).toArray();
  return all.filter(r => r.state > 0 && r.due <= now).map(r => r.word);
}

export async function getStats(vaultId: VaultId) {
  const all = await db.reviews.where('vaultId').equals(vaultId).toArray();
  const now = Date.now();
  const learned = all.filter(r => r.state > 0).length;
  const due = all.filter(r => r.state > 0 && r.due <= now).length;
  const mastered = all.filter(r => r.state === 2 && r.stability > 30).length;
  return { learned, due, mastered };
}

/** Words that the user got wrong recently (for "wrong word priority queue") */
export async function getStrugglingWords(vaultId: VaultId, limit: number = 50): Promise<string[]> {
  const all = await db.reviews.where('vaultId').equals(vaultId).toArray();
  // High difficulty or many lapses → struggling
  return all
    .filter(r => r.lapses >= 1 || r.difficulty >= 7)
    .sort((a, b) => (b.lapses - a.lapses) || (b.difficulty - a.difficulty))
    .slice(0, limit)
    .map(r => r.word);
}

export interface Word {
  word: string;
  pos: string;
  ipa: string;
  meanings: string[];
  definition: string;
  example: string;
  exampleZh: string;
}

export type VaultId = 'longman3000' | 'rzy';

export const VAULT_LABELS: Record<VaultId, string> = {
  longman3000: '朗曼 3000',
  rzy: 'rzy · IT',
};

export const VAULT_LIST: VaultId[] = ['longman3000', 'rzy'];

export interface ReviewRecord {
  /** Composite key: `${vaultId}:${word}` */
  id: string;
  vaultId: VaultId;
  word: string;
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: number;
}

export interface SessionResult {
  id?: number;
  vaultId: VaultId;
  startedAt: number;
  finishedAt: number;
  wordsCount: number;
  correct: number;
  wrong: number;
  wrongWords: string[];
  mode: LearningMode;
}

export interface VaultWord extends Word {
  /** Composite key: `${vaultId}:${word}` */
  id: string;
  vaultId: VaultId;
}

export type Rating = 1 | 2 | 3 | 4;

export interface QuizQuestion {
  word: Word;
  options: string[];
  correctIndex: number;
}

export type LearningMode = 'learn-then-test' | 'test-only';

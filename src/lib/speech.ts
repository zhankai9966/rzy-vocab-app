/**
 * Smart US English voice selection for Web Speech API.
 * We try, in order of preference:
 *  1. Neural / Premium voices (modern, natural-sounding)
 *  2. Named high-quality voices (Samantha on macOS, specific Google voices)
 *  3. Any en-US voice
 */

const PREFERRED_VOICE_NAMES = [
  // macOS / iOS high-quality
  'Samantha',
  'Ava (Premium)',
  'Ava',
  'Allison',
  'Evan',
  'Nathan',
  'Serena',
  'Tom',
  // Microsoft neural
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Guy Online (Natural) - English (United States)',
  'Microsoft AvaMultilingual Online (Natural) - English (United States)',
  'Microsoft Zira',
  'Microsoft David',
  // Google / Chrome
  'Google US English',
];

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesLoadedResolve: (() => void) | null = null;
const voicesLoaded = new Promise<void>(res => { voicesLoadedResolve = res; });

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const check = () => {
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) {
      voicesLoadedResolve?.();
    }
  };
  window.speechSynthesis.addEventListener('voiceschanged', check);
  // Some browsers populate synchronously
  check();
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const all = window.speechSynthesis.getVoices();
  if (all.length === 0) return null;

  // 1. Try preferred named voices (in order)
  for (const name of PREFERRED_VOICE_NAMES) {
    const v = all.find(x => x.name === name);
    if (v) {
      cachedVoice = v;
      return v;
    }
  }

  // 2. Try any voice with "Natural" or "Neural" or "Premium" in the name, en-US
  const fancy = all.find(v => /^en[-_]US$/i.test(v.lang) && /(natural|neural|premium|enhanced)/i.test(v.name));
  if (fancy) { cachedVoice = fancy; return fancy; }

  // 3. Any en-US voice
  const us = all.find(v => /^en[-_]US$/i.test(v.lang));
  if (us) { cachedVoice = us; return us; }

  // 4. Any en-* voice
  const en = all.find(v => /^en/i.test(v.lang));
  if (en) { cachedVoice = en; return en; }

  return null;
}

export async function ensureVoicesLoaded(timeoutMs = 1500): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) return;
  await Promise.race([
    voicesLoaded,
    new Promise<void>(res => setTimeout(res, timeoutMs)),
  ]);
}

export function isSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Speak the given English text with a natural US voice.
 * Automatically slows down very short utterances slightly (single words sound robotic at full speed).
 */
export async function speak(text: string, opts?: { rate?: number; pitch?: number }): Promise<void> {
  if (!isSpeechAvailable()) return;

  await ensureVoicesLoaded();

  // Cancel any in-flight utterance
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    utter.lang = 'en-US';
  }

  // Single words — slow down a touch for clarity
  const isSingleWord = !/\s/.test(text.trim());
  utter.rate = opts?.rate ?? (isSingleWord ? 0.85 : 0.95);
  utter.pitch = opts?.pitch ?? 1.0;
  utter.volume = 1.0;

  return new Promise(resolve => {
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

/** Return the name of the voice that will be used — for showing the user */
export function getVoiceLabel(): string {
  const v = pickVoice();
  if (!v) return '(无可用语音)';
  return v.name;
}

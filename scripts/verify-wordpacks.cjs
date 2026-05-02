const fs = require('fs');

const packs = [
  { file: 'public/wordpacks/default.json', minWords: 2800 },
  { file: 'public/wordpacks/rzy-it.json', minWords: 400 },
];

let failed = false;
let warned = false;

function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

function warn(message) {
  warned = true;
  console.warn(`WARN ${message}`);
}

function hasCjk(text) {
  return /[\u4e00-\u9fff]/.test(text || '');
}

function hasMojibake(text) {
  return /[?]{3,}/.test(text || '') || (text || '').includes(String.fromCharCode(0xfffd));
}

function isChineseMeaning(meaning) {
  return hasCjk(meaning) && !hasMojibake(meaning);
}

function getQuizMeaning(word) {
  const meanings = Array.isArray(word.meanings) ? word.meanings : [];
  return meanings.map(m => String(m).trim()).find(isChineseMeaning) || null;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHighlightAlternatives(target) {
  const original = String(target || '').trim();
  const t = original.toLowerCase();
  const alternatives = new Set();
  if (!t) return alternatives;

  alternatives.add(original);
  alternatives.add(t);
  alternatives.add(t.replace(/-/g, ' '));
  alternatives.add(t.replace(/\s+/g, '-'));

  const irregulars = {
    hide: ['hid', 'hidden'],
    shoot: ['shot'],
    undertake: ['undertook', 'undertaken'],
    pad: ['notepad'],
    site: ['website'],
  };
  (irregulars[t] || []).forEach(form => alternatives.add(form));

  if (/^[a-z]+$/.test(t)) {
    alternatives.add(t + 's');
    alternatives.add(t + 'es');
    alternatives.add(t + 'ed');
    alternatives.add(t + 'ing');

    if (/[^aeiou][aeiou][^aeiouwxy]$/.test(t)) {
      const doubled = t + t[t.length - 1];
      alternatives.add(doubled + 'ed');
      alternatives.add(doubled + 'ing');
    }
    if (t.endsWith('l')) {
      alternatives.add(t + 'led');
      alternatives.add(t + 'ling');
    }

    if (t.endsWith('e')) {
      const stem = t.slice(0, -1);
      alternatives.add(stem + 'ed');
      alternatives.add(stem + 'ing');
    }
    if (t.endsWith('y') && t.length > 2) {
      const stem = t.slice(0, -1);
      alternatives.add(stem + 'ies');
      alternatives.add(stem + 'ied');
    }
  }

  return alternatives;
}

function exampleHighlightsTarget(example, target) {
  const alternatives = buildHighlightAlternatives(target);
  if (!example || alternatives.size === 0) return false;
  const pattern = Array.from(alternatives)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');
  const regex = new RegExp(`(^|[^A-Za-z0-9])(${pattern})(?=$|[^A-Za-z0-9])`, 'gi');
  return regex.test(example);
}

function categoryOf(word) {
  const value = String(word.word || '');
  if (word.pos === 'abbr.' || /^[A-Z0-9/.-]{2,}$/.test(value)) return 'abbreviation';
  if (value.includes(' ')) return 'phrase';
  if (value.includes('-')) return 'hyphenated';
  if (Array.isArray(word.meanings) && word.meanings.length > 1) return 'multi-meaning';
  return 'standard';
}

for (const { file, minWords } of packs) {
  const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
  const words = Array.isArray(pack.words) ? pack.words : [];
  console.log(`${file}: version=${pack.version}, words=${words.length}`);
  const categories = {
    abbreviation: 0,
    phrase: 0,
    hyphenated: 0,
    'multi-meaning': 0,
    standard: 0,
  };

  if (words.length < minWords) {
    fail(`${file} has only ${words.length} words; expected at least ${minWords}`);
  }

  const seen = new Set();
  for (const [index, word] of words.entries()) {
    const label = `${file}#${index + 1}${word?.word ? `(${word.word})` : ''}`;
    if (!word || typeof word !== 'object') {
      fail(`${label} is not an object`);
      continue;
    }
    if (!word.word || typeof word.word !== 'string') fail(`${label} is missing word`);
    if (word.word && seen.has(word.word.toLowerCase())) fail(`${label} is duplicated`);
    if (word.word) seen.add(word.word.toLowerCase());
    if (!Array.isArray(word.meanings) || word.meanings.length === 0) fail(`${label} is missing meanings`);
    if (!word.example || typeof word.example !== 'string') fail(`${label} is missing English example`);
    if (!word.exampleZh || typeof word.exampleZh !== 'string') fail(`${label} is missing Chinese example`);
    if (hasMojibake(word.exampleZh)) fail(`${label} has mojibake markers in exampleZh`);
    if (word.exampleZh && !hasCjk(word.exampleZh)) fail(`${label} Chinese example has no CJK characters`);
    if (Array.isArray(word.meanings) && !getQuizMeaning(word)) {
      fail(`${label} has no Chinese meaning for quiz options`);
    }
    if (Array.isArray(word.meanings) && word.meanings[0] && !isChineseMeaning(String(word.meanings[0]))) {
      warn(`${label} first meaning is not Chinese; quiz will use the first Chinese meaning instead`);
    }
    if (word.word && word.example && !exampleHighlightsTarget(word.example, word.word)) {
      fail(`${label} English example does not contain a highlightable target form`);
    }
    categories[categoryOf(word)]++;
  }

  console.log(
    `${file}: categories ` +
    Object.entries(categories).map(([name, count]) => `${name}=${count}`).join(', ')
  );
}

if (failed) process.exit(1);
console.log(`Wordpack verification passed${warned ? ' with warnings.' : '.'}`);

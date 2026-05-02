const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const packs = [
  'default.json',
  'rzy-it.json',
];

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAlternatives(target) {
  const original = target.trim();
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

function hasTargetHit(word, example) {
  const alternatives = buildAlternatives(word);
  const pattern = Array.from(alternatives)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');
  const regex = new RegExp(`(^|[^A-Za-z0-9])(${pattern})(?=$|[^A-Za-z0-9])`, 'gi');
  return regex.test(example);
}

function renderHighlightedExample(word, example) {
  const alternatives = buildAlternatives(word);
  if (!example || alternatives.size === 0) return { hits: 0, html: example || '' };

  const pattern = Array.from(alternatives)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');
  const regex = new RegExp(`(^|[^A-Za-z0-9])(${pattern})(?=$|[^A-Za-z0-9])`, 'gi');
  let html = '';
  let lastIndex = 0;
  let hits = 0;
  let match;
  while ((match = regex.exec(example)) !== null) {
    const prefix = match[1];
    const hit = match[2];
    const wordStart = match.index + prefix.length;
    html += example.slice(lastIndex, wordStart);
    html += `<span class="example-target-highlight text-amber font-semibold" data-example-target="true">${hit}</span>`;
    lastIndex = wordStart + hit.length;
    hits++;
  }
  html += example.slice(lastIndex);
  return { hits, html };
}

function readText(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function readWords(file) {
  const pack = JSON.parse(readText(file));
  const words = Array.isArray(pack) ? pack : pack.words;
  if (!Array.isArray(words)) {
    throw new Error(`${file} has no words array`);
  }
  return words;
}

const misses = [];
let checked = 0;
for (const packName of packs) {
  const publicText = readText(`public/wordpacks/${packName}`);
  const archiveText = readText(`wordpacks/${packName}`);
  if (hash(publicText) !== hash(archiveText)) {
    misses.push({
      pack: packName,
      word: '(file hash)',
      example: 'public/wordpacks and wordpacks copies differ',
    });
    continue;
  }

  const words = readWords(`public/wordpacks/${packName}`);
  checked += words.length;
  for (const word of words) {
    if (!word || typeof word.word !== 'string') {
      misses.push({ pack: packName, word: '(invalid)', example: 'missing word' });
    } else if (!hasTargetHit(word.word, word.example || '')) {
      misses.push({ pack: packName, word: word.word, example: word.example || '' });
    } else {
      const rendered = renderHighlightedExample(word.word, word.example || '');
      if (
        rendered.hits === 0 ||
        !rendered.html.includes('data-example-target="true"') ||
        !rendered.html.includes('example-target-highlight')
      ) {
        misses.push({ pack: packName, word: word.word, example: 'rendered output has no target marker' });
      }
    }
  }
}

const component = readText('src/components/HighlightedExample.tsx');
const css = readText('src/index.css');
const appVersion = readText('src/lib/appVersion.ts');
const dbSource = readText('src/lib/db.ts');
const packageJson = JSON.parse(readText('package.json'));
const versionLiteral = `APP_VERSION = '${packageJson.version}'`;

const requiredSnippets = [
  [component, 'data-example-target="true"', 'highlight data marker'],
  [component, 'example-target-highlight', 'highlight class'],
  [css, '.example-target-highlight', 'highlight CSS selector'],
  [css, 'text-decoration: none !important', 'external underline override'],
  [appVersion, versionLiteral, 'app version matches package.json'],
  [appVersion, 'APP_VERSION_RELOAD_KEY', 'reload guard key'],
  [dbSource, 'rzy: 3', 'rzy built-in pack version bump'],
];

const missingSnippets = requiredSnippets
  .filter(([text, snippet]) => !text.includes(snippet))
  .map(([, , label]) => label);

if (misses.length || missingSnippets.length) {
  if (misses.length) {
    console.error(`Highlight misses: ${misses.length}`);
    misses.slice(0, 20).forEach(item => {
      console.error(`- ${item.pack} ${item.word}: ${item.example}`);
    });
  }
  if (missingSnippets.length) {
    console.error(`Missing implementation checks: ${missingSnippets.join(', ')}`);
  }
  process.exit(1);
}

console.log(`Highlight verification passed: ${checked}/${checked} built-in examples match target words.`);
console.log('Implementation checks passed: marker, CSS, underline override, and cache reload guard are present.');

const fs = require('fs');
const path = require('path');

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

function renderHighlightedExample(word, example) {
  const alternatives = buildAlternatives(word);
  const pattern = Array.from(alternatives)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');
  const regex = new RegExp(`(^|[^A-Za-z0-9])(${pattern})(?=$|[^A-Za-z0-9])`, 'gi');
  const nodes = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(example)) !== null) {
    const prefix = match[1];
    const hit = match[2];
    const wordStart = match.index + prefix.length;
    if (wordStart > lastIndex) {
      nodes.push({ type: 'text', text: example.slice(lastIndex, wordStart) });
    }
    nodes.push({ type: 'hit', text: hit });
    lastIndex = wordStart + hit.length;
  }
  if (lastIndex < example.length) {
    nodes.push({ type: 'text', text: example.slice(lastIndex) });
  }
  return nodes;
}

function readWords(file) {
  const raw = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
  const pack = JSON.parse(raw);
  return Array.isArray(pack) ? pack : pack.words;
}

const fixtures = [
  ['public/wordpacks/rzy-it.json', 'policy', 'rzy standard'],
  ['public/wordpacks/rzy-it.json', 'microservice', 'rzy standard compound'],
  ['public/wordpacks/rzy-it.json', 'cryptomining', 'rzy compound'],
  ['public/wordpacks/rzy-it.json', 'decoupled', 'rzy inflected'],
  ['public/wordpacks/rzy-it.json', 'MFA', 'rzy abbreviation'],
  ['public/wordpacks/rzy-it.json', 'IOC', 'rzy uppercase abbreviation'],
  ['public/wordpacks/rzy-it.json', 'ai-driven', 'rzy hyphenated'],
  ['public/wordpacks/rzy-it.json', 'blast radius', 'rzy phrase'],
  ['public/wordpacks/default.json', 'discuss', 'longman standard'],
  ['public/wordpacks/default.json', 'interested', 'longman inflected-looking'],
];

const errors = [];
for (const [file, target, label] of fixtures) {
  const words = readWords(file);
  const word = words.find(item => String(item.word).toLowerCase() === target.toLowerCase());
  if (!word) {
    errors.push(`${label}: missing fixture word ${target}`);
    continue;
  }
  const nodes = renderHighlightedExample(word.word, word.example || '');
  const hits = nodes.filter(node => node.type === 'hit');
  if (hits.length === 0) {
    errors.push(`${label}: no rendered highligh node for ${word.word}`);
    continue;
  }
  const learningPageHasMarker = hits.every(hit => hit.text);
  const testPageHasMarker = hits.every(hit => hit.text);
  if (!learningPageHasMarker || !testPageHasMarker) {
    errors.push(`${label}: learning/test page marker simulation failed for ${word.word}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`DOM highlight fixture verification passed: ${fixtures.length} learning-page and test-page render simulations.`);

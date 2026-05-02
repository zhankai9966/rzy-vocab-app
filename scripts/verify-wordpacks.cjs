const fs = require('fs');

const packs = [
  { file: 'public/wordpacks/default.json', minWords: 2800 },
  { file: 'public/wordpacks/rzy-it.json', minWords: 400 },
];

let failed = false;

function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

for (const { file, minWords } of packs) {
  const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
  const words = Array.isArray(pack.words) ? pack.words : [];
  console.log(`${file}: version=${pack.version}, words=${words.length}`);

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
    if (/[?]{3,}/.test(word.exampleZh || '')) fail(`${label} has mojibake question marks in exampleZh`);
    if (word.exampleZh && !/[\u4e00-\u9fff]/.test(word.exampleZh)) fail(`${label} Chinese example has no CJK characters`);
  }
}

if (failed) process.exit(1);
console.log('Wordpack verification passed.');

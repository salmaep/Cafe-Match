const fs = require('fs');
const path = require('path');

const NAMESPACES = ['common', 'wizard', 'cafe', 'map', 'errors', 'discover'];

const KEY_OBJECTS = {
  common: 'commonText',
  wizard: 'wizardText',
  cafe: 'cafeText',
  map: 'mapText',
  errors: 'errorsText',
  discover: 'discoverText',
};

function rewriteFile(filepath) {
  let src = fs.readFileSync(filepath, 'utf8');
  const used = new Set();

  for (const ns of NAMESPACES) {
    const re = new RegExp(`t\\('${ns}\\.([a-zA-Z]+)'`, 'g');
    src = src.replace(re, (_m, key) => {
      used.add(ns);
      return `t(${KEY_OBJECTS[ns]}.${key}`;
    });
  }

  if (used.size === 0) return false;

  const importList = Array.from(used)
    .map((ns) => KEY_OBJECTS[ns])
    .sort()
    .join(', ');

  const importLine = `import { ${importList} } from '@shared/i18n/keys';`;

  if (src.includes("from '@shared/i18n/keys'")) {
    src = src.replace(
      /import\s*\{[^}]*\}\s*from\s*['"]@shared\/i18n\/keys['"];?/,
      importLine,
    );
  } else {
    let useTrIdx = src.indexOf("from 'react-i18next'");
    if (useTrIdx === -1) useTrIdx = src.indexOf('from "react-i18next"');
    if (useTrIdx === -1) {
      console.warn(`[skip-import] ${filepath}: no react-i18next import found`);
    } else {
      const eol = src.indexOf('\n', useTrIdx);
      src = src.slice(0, eol + 1) + importLine + '\n' + src.slice(eol + 1);
    }
  }

  fs.writeFileSync(filepath, src);
  return true;
}

const files = process.argv.slice(2);
for (const f of files) {
  const abs = path.resolve(f);
  const changed = rewriteFile(abs);
  console.log(`${changed ? 'rewrote' : 'no-change'}: ${abs}`);
}

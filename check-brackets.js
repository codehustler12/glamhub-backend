const fs = require('fs');
const s = fs.readFileSync('glamhub-api-postman.json', 'utf8');
let depth = 0;
let inString = false;
let escape = false;
let strChar = '';
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (inString && !escape) {
    if (c === '\\') escape = true;
    else if (c === strChar) inString = false;
    continue;
  }
  if (escape) { escape = false; continue; }
  if (!inString && (c === '"' || c === "'")) {
    inString = true;
    strChar = c;
    continue;
  }
  if (!inString) {
    if (c === '{' || c === '[') depth++;
    if (c === '}' || c === ']') depth--;
    if (depth === 0 && i > 100) {
      const line = s.slice(0, i).split(/\r?\n/).length;
      console.log('Depth 0 at position', i, 'line', line);
      console.log('Context:', s.substring(i - 50, i + 30));
      break;
    }
  }
}
console.log('Final depth', depth);

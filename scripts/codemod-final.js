const fs = require('fs'), path = require('path');
const jsDir = path.join(__dirname, '..', 'public', 'js');

function walkDir(dir, files = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    if (e.isDirectory()) walkDir(path.join(dir, e.name), files);
    else if (e.name.endsWith('.js')) files.push(path.join(dir, e.name));
  });
  return files;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let changes = 0, i = 0;

  while (i < lines.length) {
    const line = lines[i], trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);
    
    if (indent.length > 0 || /^\/\//.test(trimmed) || /^\/\*/.test(trimmed) || trimmed === '' || /^window\./.test(trimmed)) {
      newLines.push(line); i++; continue;
    }

    // async function → window.name = async function
    const afn = trimmed.match(/^async function (\w+)\((.*?)\)\s*\{/);
    // function → window.name = function (non-greedy param match)
    const fn = !afn ? trimmed.match(/^function (\w+)\((.*?)\)\s*\{/) : null;
    const match = afn || fn;
    
    if (match) {
      const name = match[1], params = match[2], isAsync = !!afn;
      const prefix = `window.${name} = ${isAsync ? 'async ' : ''}function(${params}) {`;
      const rest = trimmed.slice(trimmed.indexOf('{') + 1);
      const funcLines = [prefix];
      if (rest.trim()) funcLines.push(rest);
      let braceCount = 1;
      for (const ch of line.slice(line.indexOf('{') + 1)) {
        if (ch === '{') braceCount++; else if (ch === '}') braceCount--;
      }
      // If one-liner, braceCount is already 0, don't consume more lines
      if (braceCount > 0) {
        i++;
        while (i < lines.length && braceCount > 0) {
          for (const ch of lines[i]) { if (ch === '{') braceCount++; else if (ch === '}') braceCount--; }
          funcLines.push(lines[i]);
          i++;
        }
      } else { i++; }
      newLines.push(...funcLines);
      changes++; continue;
    }

    // var declaration
    const vm = trimmed.match(/^var (.+);\s*$/);
    if (vm) {
      const parts = []; let depth = 0, cur = '';
      for (const ch of vm[1]) {
        if (ch === '{' || ch === '[' || ch === '(') depth++;
        else if (ch === '}' || ch === ']' || ch === ')') depth--;
        if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      if (cur.trim()) parts.push(cur.trim());
      parts.forEach(p => {
        const eq = p.indexOf('=');
        newLines.push(eq >= 0 ? `window.${p.slice(0,eq).trim()} = ${p.slice(eq+1).trim()};` : `window.${p.trim()}`);
      });
      changes++; i++; continue;
    }
    newLines.push(line); i++;
  }
  if (changes) { fs.writeFileSync(filePath, newLines.join('\n'), 'utf8'); console.log(`  ${path.relative(jsDir, filePath)}: ${changes} changes`); }
  return changes;
}

const jsFiles = walkDir(jsDir);
let total = 0;
jsFiles.forEach(f => { total += processFile(f); });
console.log(`\nTotal: ${total} changes`);

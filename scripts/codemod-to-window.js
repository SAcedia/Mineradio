// Convert top-level var/function/async function to window.* assignments
const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '..', 'public', 'js');

function walkDir(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(e => {
    if (e.isDirectory()) walkDir(path.join(dir, e.name), files);
    else if (e.name.endsWith('.js')) files.push(path.join(dir, e.name));
  });
  return files;
}

const jsFiles = walkDir(jsDir);
let totalChanges = 0;

jsFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);

    // Only convert lines at column 0 (no indentation = top-level)
    if (indent.length > 0) { newLines.push(line); continue; }

    // Skip comment-only lines and blank lines
    if (/^\/\//.test(trimmed) || /^\/\*/.test(trimmed) || trimmed === '') { newLines.push(line); continue; }

    // Skip already-window-prefixed declarations
    if (/^window\./.test(trimmed)) { newLines.push(line); continue; }

    // Convert: async function name(...) { → window.name = async function(...) {
    const asyncFnMatch = trimmed.match(/^async function (\w+)\((.*)\)\s*\{/);
    if (asyncFnMatch) {
      newLines.push(`window.${asyncFnMatch[1]} = async function(${asyncFnMatch[2]}) {`);
      changes++;
      continue;
    }

    // Convert: function name(...) { → window.name = function(...) {
    const fnMatch = trimmed.match(/^function (\w+)\((.*)\)\s*\{/);
    if (fnMatch) {
      newLines.push(`window.${fnMatch[1]} = function(${fnMatch[2]}) {`);
      changes++;
      continue;
    }

    // Convert: var a = 1, b = 2, c = 3; → window.a = 1; window.b = 2; window.c = 3;
    // Handle comma-separated with bracket-depth awareness
    const varMatch = trimmed.match(/^var (.+);\s*$/);
    if (varMatch) {
      const declarations = varMatch[1];
      const parts = [];
      let depth = 0, current = '';
      for (const ch of declarations) {
        if (ch === '{' || ch === '[' || ch === '(') depth++;
        else if (ch === '}' || ch === ']' || ch === ')') depth--;
        if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; }
        else current += ch;
      }
      if (current.trim()) parts.push(current.trim());
      parts.forEach(part => {
        const eqIdx = part.indexOf('=');
        if (eqIdx >= 0) {
          const name = part.slice(0, eqIdx).trim();
          const value = part.slice(eqIdx + 1).trim();
          newLines.push(`window.${name} = ${value};`);
        } else {
          newLines.push(`window.${part.trim()}`);
        }
      });
      changes++;
      continue;
    }

    newLines.push(line);
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    console.log(`  ${path.relative(jsDir, filePath)}: ${changes} changes`);
    totalChanges += changes;
  }
});

console.log(`\nTotal: ${totalChanges} changes across ${jsFiles.length} files`);

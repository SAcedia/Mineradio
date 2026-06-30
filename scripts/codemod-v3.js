// Robust codemod — brace-counting for function bodies, handles comma-vars
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

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let changes = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);

    // Skip indented lines, comments, blank lines, already-window lines
    if (indent.length > 0 || /^\/\//.test(trimmed) || /^\/\*/.test(trimmed) || trimmed === '') {
      newLines.push(line);
      i++;
      continue;
    }
    if (/^window\./.test(trimmed)) {
      newLines.push(line);
      i++;
      continue;
    }

    // Handle functions — collect until matching closing brace
    const asyncFn = trimmed.match(/^async function (\w+)\((.*)\)\s*\{/);
    const fnMatch = !asyncFn ? trimmed.match(/^function (\w+)\((.*)\)\s*\{/) : null;
    const match = asyncFn || fnMatch;

    if (match) {
      const name = match[1];
      const params = match[2].trim();
      const isAsync = !!asyncFn;
      const prefix = isAsync ? `window.${name} = async function(${params}) {` : `window.${name} = function(${params}) {`;

      // Extract the rest of the opening line after the first {
      const restOfLine = trimmed.slice(trimmed.indexOf('{') + 1);
      const funcLines = [prefix];
      if (restOfLine.trim()) funcLines.push(restOfLine);

      // Brace counting for the function body
      let braceCount = 1;
      i++;
      while (i < lines.length && braceCount > 0) {
        const bodyLine = lines[i];
        // Count braces (simple approach — works for well-formatted JS)
        for (const ch of bodyLine) {
          if (ch === '{') braceCount++;
          else if (ch === '}') braceCount--;
        }
        funcLines.push(bodyLine);
        if (braceCount <= 0) break;
        i++;
      }
      // If we ended because braceCount is 0, push that last line too
      // Actually the last line is already pushed

      newLines.push(...funcLines);
      changes++;
      i++;
      continue;
    }

    // Handle var declarations
    const varMatch = trimmed.match(/^var (.+);\s*$/);
    if (varMatch) {
      const decl = varMatch[1];
      // Split by comma, respecting bracket depth ONLY (not strings for simplicity)
      // For safety, if any part contains a comma inside quotes/braces, keep as-is
      const parts = [];
      let depth = 0, current = '';
      for (const ch of decl) {
        if (ch === '{' || ch === '[' || ch === '(') depth++;
        else if (ch === '}' || ch === ']' || ch === ')') depth--;
        if (ch === ',' && depth === 0) {
          parts.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      if (current.trim()) parts.push(current.trim());

      parts.forEach(part => {
        const eqIdx = part.indexOf('=');
        if (eqIdx >= 0) {
          newLines.push(`window.${part.slice(0, eqIdx).trim()} = ${part.slice(eqIdx + 1).trim()};`);
        } else {
          newLines.push(`window.${part.trim()}`);
        }
      });
      changes++;
      i++;
      continue;
    }

    newLines.push(line);
    i++;
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    console.log(`  ${path.relative(jsDir, filePath)}: ${changes} changes`);
  }
  return changes;
}

const jsFiles = walkDir(jsDir);
let totalChanges = 0;
jsFiles.forEach(f => { totalChanges += processFile(f); });
console.log(`\nTotal: ${totalChanges} changes across ${jsFiles.length} files`);

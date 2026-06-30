// Safe codemod - handles only simple patterns, leaves comma-sep for manual fix
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
const commaLines = []; // lines needing manual fix

jsFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);

    if (indent.length > 0) { newLines.push(line); continue; }
    if (/^\/\//.test(trimmed) || /^\/\*/.test(trimmed) || trimmed === '') { newLines.push(line); continue; }
    if (/^window\./.test(trimmed)) { newLines.push(line); continue; }

    // Simple single var:  var name = value;
    const simpleVar = trimmed.match(/^var (\w+) ?= ?(.+);\s*$/);
    if (simpleVar) {
      newLines.push(`window.${simpleVar[1]} = ${simpleVar[2]};`);
      changes++;
      continue;
    }

    // Comma-separated var - skip, mark for manual
    const commaVar = trimmed.match(/^var .+,.+(;)?$/);
    if (commaVar) {
      commaLines.push(`${path.relative(jsDir, filePath)}:${i+1}: ${trimmed}`);
      newLines.push(line); // keep original
      continue;
    }

    // Bare var declaration (no assignment): var x;
    const bareVar = trimmed.match(/^var (\w+)\s*;?\s*$/);
    if (bareVar) {
      newLines.push(`window.${bareVar[1]} = undefined;`);
      changes++;
      continue;
    }

    // function name(...) {
    const fnMatch = trimmed.match(/^function (\w+)\((.*)\)\s*\{/);
    if (fnMatch) {
      newLines.push(`window.${fnMatch[1]} = function(${fnMatch[2]}) {`);
      changes++;
      continue;
    }

    // async function name(...) {
    const asyncFn = trimmed.match(/^async function (\w+)\((.*)\)\s*\{/);
    if (asyncFn) {
      newLines.push(`window.${asyncFn[1]} = async function(${asyncFn[2]}) {`);
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

if (commaLines.length > 0) {
  console.log(`\n⚠️  ${commaLines.length} comma-separated var lines need manual fix:`);
  commaLines.forEach(l => console.log(`  ${l}`));
}

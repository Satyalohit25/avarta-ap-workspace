import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk(path.resolve('./src'));
const violations = [];

const rules = [
  {
    name: 'Zero Backdrop Blur (Liquid Glass)',
    pattern: /\bbackdrop-blur-[a-z0-9]+\b/,
  },
  {
    name: 'Zero Sparkles Icon (Consumer AI)',
    pattern: /\bSparkles\b/,
  },
  {
    name: 'Zero Literal Unicode Emojis in Code/Strings',
    pattern: /[⚡✓✔]/,
  },
  {
    name: 'Zero Decorative Hover Scale',
    pattern: /\bhover:scale-\d+\b/,
  },
  {
    name: 'Zero Animated Chevron Slides',
    pattern: /\bgroup-hover:translate-x-[\d.]+\b/,
  },
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          line: idx + 1,
          rule: rule.name,
          snippet: line.trim(),
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`\x1b[31m[FAILED] Found ${violations.length} institutional UI invariant violations:\x1b[0m\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} - [${v.rule}]`);
    console.error(`    ${v.snippet}\n`);
  }
  process.exit(1);
} else {
  console.log('\x1b[32m[PASSED] All institutional UI invariants verified clean (0 violations across all files).\x1b[0m');
}

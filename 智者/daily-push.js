const fs = require('fs');
const path = require('path');

const modelsPath = path.join(__dirname, 'core', 'models.json');
const counterPath = path.join(__dirname, '.push-counter');

try {
  const raw = fs.readFileSync(modelsPath, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  const models = data.models;

  let counter = 0;
  try { counter = parseInt(fs.readFileSync(counterPath, 'utf8').trim(), 10) || 0; } catch(e) {}
  
  const total = models.length;
  const start = (counter * 3) % total;
  
  const lines = [];
  lines.push('\u{1F9E0} \u6BCF\u65E5\u601D\u7EF4\u6A21\u578B \u00D73');
  lines.push('\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');
  lines.push('');
  
  for (let i = 0; i < 3; i++) {
    const m = models[(start + i) % total];
    const tags = (m.tags || []).slice(0, 3).join(' \u00B7 ');
    lines.push('\u3010' + m.title + '\u3011  ' + m.id);
    lines.push(tags);
    lines.push('');
    const view = (m.coreView || '').slice(0, 180);
    if (view) lines.push(view);
    if (m.example) {
      lines.push('\u{1F4A1} \u4F8B\u5B50: ' + m.example.slice(0, 120));
    }
    lines.push('');
    lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    lines.push('');
  }

  fs.writeFileSync(counterPath, String(counter + 1), 'utf8');
  console.log(lines.join('\n'));
} catch(e) {
  console.error('\u274C Error:', e.message);
  process.exit(1);
}

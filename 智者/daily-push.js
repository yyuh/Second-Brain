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
  const idx = counter % total;
  const m = models[idx];

  const lines = [];

  // 标题头
  lines.push('🧠 今日思维模型：' + m.title);
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // 来源/标签（如果有）
  const tags = (m.tags || []).slice(0, 4).join(' · ');
  if (tags) lines.push('🏷️ ' + tags);
  lines.push('');

  // 核心理论（完整）
  const theory = m.coreView || '';
  if (theory) {
    lines.push(theory);
    lines.push('');
  }

  // 故事讲解（完整example）
  const story = m.example || '';
  if (story) {
    lines.push('📖 故事时间');
    lines.push('');
    lines.push(story);
    lines.push('');
  }

  // 来源（如果有）
  const source = m.source || '';
  if (source) {
    lines.push('—— 来源：' + source);
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💡 明日继续推送下一模型，共' + total + '条轮回');

  // 写计数器（下次+1）
  fs.writeFileSync(counterPath, String(counter + 1), 'utf8');
  console.log(lines.join('\n'));

} catch(e) {
  console.error('❌ 推送出错:', e.message);
  process.exit(1);
}

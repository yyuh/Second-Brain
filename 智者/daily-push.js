const fs = require('fs');
const path = require('path');

const modelsPath = path.join(__dirname, 'core', 'models.json');
const counterPath = path.join(__dirname, '.push-counter');

// 短模型阈值（total=theory+story字符数）
const SHORT_THRESHOLD = 300;

try {
  const raw = fs.readFileSync(modelsPath, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  const models = data.models;

  let counter = 0;
  try { counter = parseInt(fs.readFileSync(counterPath, 'utf8').trim(), 10) || 0; } catch(e) {}
  
  const total = models.length;

  // 获取当前模型的长度
  const currentModel = models[counter % total];
  const currentLen = (currentModel.coreView || '').length + (currentModel.example || '').length;
  
  // 决定本次推几个：<300字符的短模型推2个，≥300的长模型推1个
  const pushCount = currentLen < SHORT_THRESHOLD ? 2 : 1;

  const lines = [];
  let pushedTitles = [];

  for (let p = 0; p < pushCount; p++) {
    const idx = (counter + p) % total;
    const m = models[idx];
    pushedTitles.push(m.title);

    if (p > 0) {
      lines.push('');
      lines.push('');
    }

    lines.push('🧠 今日思维模型：' + m.title);
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    const tags = (m.tags || []).slice(0, 4).join(' · ');
    if (tags) lines.push('🏷️ ' + tags + '');
    lines.push('');

    const theory = m.coreView || '';
    if (theory) {
      lines.push(theory);
      lines.push('');
    }

    const story = m.example || '';
    if (story) {
      lines.push('📖 故事时间');
      lines.push('');
      lines.push(story);
      lines.push('');
    }

    const source = m.source || '';
    if (source) {
      lines.push('—— 来源：' + source);
      lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━');
  }

  // 底部预告：如果本次推了2个，预告再下一条；推1个就预告下一条
  const nextIdx = (counter + pushCount) % total;
  const nextModel = models[nextIdx];
  const nextLen = (nextModel.coreView || '').length + (nextModel.example || '').length;
  const nextLabel = nextLen < SHORT_THRESHOLD ? '（短模型，明日同推2条）' : '（长模型，明日推1条）';

  lines.push('💡 明日推送：' + nextModel.title + ' ' + nextLabel);
  lines.push('（本轮循环共' + total + '条模式，已推送至第' + (counter + pushCount) + '条）');

  // 写计数器：前进 pushCount
  fs.writeFileSync(counterPath, String(counter + pushCount), 'utf8');
  console.log(lines.join('\n'));

} catch(e) {
  console.error('❌ 推送出错:', e.message);
  process.exit(1);
}

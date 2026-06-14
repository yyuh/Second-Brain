/**
 * Second Brain 输入站 — 独立 Web 服务器
 *
 * 从浏览器接收内容，自动写入 wiki/，git push 到 GitHub。
 * 不依赖 QClaw，独立运行。
 *
 * 启动: node inbox/server.js
 * 打开: http://localhost:3456
 */

const express = require('express')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const WIKI_DIR = path.join(ROOT, 'wiki')
const RAW_INBOX_DIR = path.join(ROOT, 'raw', 'inbox')
const HISTORY_FILE = path.join(ROOT, 'raw', 'inbox', '.history.json')
const PORT = process.env.PORT || 3456

// 确保目录存在
fs.mkdirSync(RAW_INBOX_DIR, { recursive: true })
fs.mkdirSync(path.join(WIKI_DIR, 'journal'), { recursive: true })
fs.mkdirSync(path.join(WIKI_DIR, 'reminders'), { recursive: true })
fs.mkdirSync(path.join(WIKI_DIR, 'insights'), { recursive: true })
fs.mkdirSync(path.join(WIKI_DIR, 'goals'), { recursive: true })
fs.mkdirSync(path.join(WIKI_DIR, 'learning'), { recursive: true })

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))

// ---------- 分类逻辑 ----------

function classifyContent(content, userType) {
  if (userType && userType !== 'auto') return userType

  const lines = content.trim().split('\n')
  const firstLine = lines[0] || ''

  // 提醒/待办
  if (/^(提醒|记得|待办|todo|remind|别忘了|有空)/i.test(firstLine)) return 'reminder'
  if (/^(钥匙|手机|钱包|放在|桌上|抽屉)/i.test(firstLine)) return 'reminder'

  // 项目/目标
  if (/^(项目|目标|计划|进度|在做|正在)/i.test(firstLine)) return 'goal'

  // 学习笔记
  if (/^(学习了|学到|笔记|总结|读书|课程|教程)/i.test(firstLine)) return 'learning'

  // 日记/反思
  if (/^(今天|昨天|明天|刚才|早上|晚上|下午)/i.test(firstLine) && content.length < 500) return 'journal'

  // 长文 → 观点/文章
  if (content.length > 500) return 'insight'

  // 默认
  return 'note'
}

function generateTitle(content, type) {
  const firstLine = content.trim().split('\n')[0] || ''
  const clean = firstLine.replace(/^[#\s>*-]+/, '').trim()
  if (clean.length <= 60) return clean || `${type}-${dateStr()}`
  return clean.substring(0, 60).trim() + '…'
}

function dateStr() {
  return new Date().toISOString().slice(0, 10)
}

function timeStr() {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

const CATEGORY_MAP = {
  reminder: { dir: 'reminders', category: 'reminders', emoji: '📌' },
  insight:  { dir: 'insights',  category: 'insights',  emoji: '💡' },
  journal:  { dir: 'journal',   category: 'journal',   emoji: '📝' },
  goal:     { dir: 'goals',     category: 'goals',     emoji: '🎯' },
  learning: { dir: 'learning',  category: 'learning',  emoji: '📚' },
  note:     { dir: 'journal',   category: 'journal',   emoji: '📄' },
}

// ---------- 写入 wiki ----------

function writeToWiki(content, type, title) {
  const cat = CATEGORY_MAP[type] || CATEGORY_MAP.note
  const now = dateStr()
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 80)
  const fileName = `${now}-${safeTitle}.md`
  const filePath = path.join(WIKI_DIR, cat.dir, fileName)

  const md = [
    '---',
    `title: "${title}"`,
    `category: ${cat.category}`,
    `tags: []`,
    `created: ${now}`,
    `updated: ${now}`,
    `sources: 0`,
    '---',
    '',
    content.trim(),
    '',
    `---`,
    `_通过输入站 · ${timeStr()}_`,
    '',
  ].join('\n')

  fs.writeFileSync(filePath, md, 'utf-8')
  return { filePath, fileName, relativePath: `wiki/${cat.dir}/${fileName}` }
}

// ---------- 更新 index.md ----------

function updateIndex(type, title, relativePath) {
  const indexPath = path.join(WIKI_DIR, 'index.md')
  let index = ''
  try {
    index = fs.readFileSync(indexPath, 'utf-8')
  } catch {
    index = [
      '---',
      'title: "Second Brain 目录"',
      'category: index',
      `created: ${dateStr()}`,
      `updated: ${dateStr()}`,
      '---',
      '',
      '# Second Brain 知识库',
      '',
      '> 自动维护的目录。每次摄入后更新。',
      '',
      '---',
      '',
    ].join('\n')
  }

  const entry = `- [${title}](${relativePath}) — ${timeStr()}`
  // Add after the last category heading, or at the end
  const lines = index.split('\n')
  // Find insertion point - right before the first --- that ends frontmatter
  let insertAt = lines.length
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith('---') && i > 0) {
      insertAt = i + 1
      break
    }
  }

  lines.splice(insertAt, 0, '', `### ${dateStr()}`, '', entry)
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8')
}

// ---------- 更新 log.md ----------

function updateLog(type, title, relativePath) {
  const logPath = path.join(WIKI_DIR, 'log.md')
  let log = ''
  try {
    log = fs.readFileSync(logPath, 'utf-8')
  } catch {
    log = [
      '---',
      'title: "操作日志"',
      `created: ${dateStr()}`,
      `updated: ${dateStr()}`,
      '---',
      '',
      '# 操作日志',
      '',
      '| 时间 | 操作 | 内容 |',
      '|------|------|------|',
    ].join('\n')
  }

  const entry = `| ${timeStr()} | ingest | [${title}](${relativePath}) (${type}) |`
  fs.writeFileSync(logPath, log + '\n' + entry, 'utf-8')
}

// ---------- Git commit + push ----------

function gitCommitPush(type, title) {
  try {
    execSync('git add -A', { cwd: ROOT, stdio: 'pipe', timeout: 10000 })
    execSync(`git commit -m "[${dateStr()}] inbox: ${type} — ${title.substring(0, 50)}"`, {
      cwd: ROOT, stdio: 'pipe', timeout: 10000
    })
    execSync('git push', { cwd: ROOT, stdio: 'pipe', timeout: 15000 })
    return true
  } catch (e) {
    // If nothing to commit, it's fine
    if (e.message.includes('nothing to commit')) return true
    console.error('Git push error:', e.message.substring(0, 200))
    return false
  }
}

// ---------- History tracking ----------

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'))
  } catch {
    return { items: [] }
  }
}

function saveHistory(entry) {
  const history = loadHistory()
  history.items.unshift(entry)
  if (history.items.length > 100) history.items = history.items.slice(0, 100)
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8')
}

// ---------- Routes ----------

app.post('/api/ingest', (req, res) => {
  const { content, type: userType } = req.body
  if (!content || !content.trim()) {
    return res.json({ success: false, error: '内容不能为空' })
  }

  const type = classifyContent(content, userType)
  const title = generateTitle(content, type)
  const result = writeToWiki(content, type, title)

  // Save raw copy to inbox
  const rawFile = path.join(RAW_INBOX_DIR, `${timestamp()}-${type}.md`)
  fs.writeFileSync(rawFile, [
    `# ${title}`,
    `> 来源: 输入站 · ${timeStr()}`,
    `> 类型: ${type}`,
    ``,
    content.trim(),
  ].join('\n'), 'utf-8')

  // Update index and log
  updateIndex(type, title, result.relativePath)
  updateLog(type, title, result.relativePath)

  // Git push
  const committed = gitCommitPush(type, title)
  const commitMsg = committed
    ? `[${dateStr()}] inbox: ${type} — ${title.substring(0, 30)}`
    : '已保存（git skip）'

  // Save to history
  saveHistory({
    title,
    type,
    path: result.relativePath,
    time: timeStr(),
    contentPreview: content.substring(0, 100),
  })

  const response = {
    success: true,
    path: result.relativePath,
    type,
    commit: commitMsg,
  }

  // If it's an insight/article, add a note about 智者
  if (type === 'insight') {
    response.insightNote = '💡 长文内容已归档到 insights/，下次对话时 LLM 会提取为思维模型补充到智者。'
  }

  console.log(`[${timeStr()}] ✅ ${type}: ${title}`)
  res.json(response)
})

app.get('/api/history', (req, res) => {
  const history = loadHistory()
  const now = Date.now()
  res.json({
    items: history.items.slice(0, 20).map(item => ({
      ...item,
      timeAgo: formatTimeAgo(item.time, now),
    }))
  })
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ---------- Start ----------

app.listen(PORT, () => {
  console.log(`\n🧠 Second Brain 输入站`)
  console.log(`   地址: http://localhost:${PORT}`)
  console.log(`   工作目录: ${ROOT}`)
  console.log(`   Ctrl+C 停止\n`)
})

// ---------- Utils ----------

function formatTimeAgo(timeStr, now) {
  // Simple relative time
  return timeStr || ''
}

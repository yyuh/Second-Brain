/**
 * Second Brain 输入站 — 独立 Web 服务器
 *
 * 从浏览器/飞书接收内容，自动写入 wiki/，git push 到 GitHub。
 * 不依赖 QClaw，独立运行。
 *
 * 启动: node inbox/server.js
 * 打开: http://localhost:3456
 *
 * 飞书 Bot 配置（环境变量）:
 *   FEISHU_APP_ID        — 飞书应用的 APP ID
 *   FEISHU_APP_SECRET    — 飞书应用的 App Secret
 *   FEISHU_ENCRYPT_KEY   — 事件回调的 Encrypt Key (AES-256-CBC)
 *   FEISHU_VERIFY_TOKEN  — 事件回调的 Verification Token
 *   NGROK_AUTOTOKEN      — ngrok 认证令牌（可选，自动开启隧道）
 */

const express = require('express')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { execSync } = require('child_process')

// 加载 .env（如果存在）
try { require('dotenv').config({ path: __dirname + '/.env' }) } catch (e) {}

const ROOT = path.resolve(__dirname, '..')
const WIKI_DIR = path.join(ROOT, 'wiki')
const RAW_INBOX_DIR = path.join(ROOT, 'raw', 'inbox')
const HISTORY_FILE = path.join(ROOT, 'raw', 'inbox', '.history.json')
const PORT = process.env.PORT || 3456

// 飞书配置（从环境变量读取，不硬编码）
const FEISHU_CONFIG = {
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  encryptKey: process.env.FEISHU_ENCRYPT_KEY || '',
  verifyToken: process.env.FEISHU_VERIFY_TOKEN || '',
}

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

function writeToWiki(content, type, title, source) {
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
    `_通过输入站${source ? ` · ${source}` : ''} · ${timeStr()}_`,
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

// ---------- 飞书 Bot ----------

/**
 * AES-256-CBC 解密（PKCS7 填充）
 * Feishu 事件回调使用此方式加密
 */
function feishuDecrypt(encryptBase64) {
  if (!FEISHU_CONFIG.encryptKey) return null
  const key = Buffer.from(FEISHU_CONFIG.encryptKey, 'base64')
  const encrypted = Buffer.from(encryptBase64, 'base64')
  const iv = encrypted.subarray(0, 16)
  const data = encrypted.subarray(16)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  decipher.setAutoPadding(true)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return JSON.parse(decrypted.toString('utf-8'))
}

/** 处理飞书消息内容 */
function parseFeishuMessage(event) {
  if (!event || !event.message) return null
  const msg = event.message
  const msgType = msg.message_type || 'text'
  const sender = event.sender || {}
  const chatType = msg.chat_type || 'p2p' // p2p = 私聊, group = 群聊

  let content = ''

  if (msgType === 'text') {
    try {
      const parsed = JSON.parse(msg.content || '{}')
      content = parsed.text || msg.content || ''
    } catch {
      content = msg.content || ''
    }
  } else if (msgType === 'file' || msgType === 'image') {
    // 文件/图片消息：存为引用，TODO: 下载文件
    content = `[收到 ${msgType} 消息: ${msg.message_id}]`
  } else {
    content = `[收到 ${msgType} 消息]`
  }

  return {
    content: content.trim(),
    messageId: msg.message_id,
    senderId: sender.sender_id?.user_id || 'unknown',
    chatType,
    raw: msg,
  }
}

/** processingMiddleware：将内容送入大脑 */
function processFeishuContent(feishuMsg, sourceLabel) {
  const { content } = feishuMsg
  if (!content || content.startsWith('[收到 ')) {
    console.log(`[飞书] ⏭️ 跳过非文本消息: ${content}`)
    return { skipped: true }
  }

  const type = classifyContent(content, 'auto')
  const title = generateTitle(content, type)
  const result = writeToWiki(content, type, title, `飞书 · ${sourceLabel}`)

  const rawFile = path.join(RAW_INBOX_DIR, `${timestamp()}-feishu-${type}.md`)
  fs.writeFileSync(rawFile, [
    `# ${title}`,
    `> 来源: 飞书 Bot · ${timeStr()}`,
    `> 飞书消息ID: ${feishuMsg.messageId}`,
    `> 发送者: ${feishuMsg.senderId}`,
    `> 类型: ${type}`,
    ``,
    content.trim(),
  ].join('\n'), 'utf-8')

  updateIndex(type, title, result.relativePath)
  updateLog(type, title, result.relativePath)
  gitCommitPush(type, title)

  saveHistory({
    title,
    type,
    path: result.relativePath,
    time: timeStr(),
    source: 'feishu',
    contentPreview: content.substring(0, 100),
  })

  return { success: true, path: result.relativePath, type, title }
}

/**
 * POST /api/feishu/webhook — 飞书事件回调入口
 *
 * 处理:
 * 1. URL Challenge (验证)
 * 2. im.message.receive_v1 (收到消息)
 */
console.log('[DEBUG] 注册飞书路由...')
// Test route
app.post('/api/test', (req, res) => res.json({ok: true}))
// Feishu route
app.post('/api/feishu/webhook', (req, res) => {
  console.log('[DEBUG] 飞书路由被调用!')
  const body = req.body || {}

  // === URL Challenge 验证 ===
  if (body.challenge) {
    console.log(`[飞书] 🔐 URL Challenge 验证`)
    return res.json({ challenge: body.challenge })
  }

  // === 加密事件 ===
  if (body.encrypt) {
    let event
    try {
      event = feishuDecrypt(body.encrypt)
    } catch (e) {
      console.error('[飞书] 解密失败:', e.message)
      return res.status(200).json({ code: 0 }) // 仍返回 200 避免飞书重试
    }

    if (!event) {
      return res.status(200).json({ code: 0 })
    }

    const eventType = event.header?.event_type || event.type || 'unknown'
    console.log(`[飞书] 📩 事件: ${eventType}`)

    // 处理消息
    if (eventType === 'im.message.receive_v1' || eventType === 'im.message.receive_v1') {
      const msg = parseFeishuMessage(event.event)
      if (!msg) {
        return res.json({ code: 0 })
      }

      console.log(`[飞书] 💬 来自 ${msg.senderId}: ${msg.content.substring(0, 60)}`)
      processFeishuContent(msg, '飞书')
    }

    return res.json({ code: 0 })
  }

  // 未知请求
  console.log('[飞书] ⚠️ 未知请求:', JSON.stringify(body).substring(0, 200))
  res.status(200).json({ code: 0 })
})

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
  console.log(`   🌐 本地: http://localhost:${PORT}`)
  console.log(`   📁 工作目录: ${ROOT}`)
  console.log(`   ⌨️  Ctrl+C 停止\n`)

  // 飞书状态
  if (FEISHU_CONFIG.appId && FEISHU_CONFIG.encryptKey) {
    console.log(`   ✅ 飞书 Bot 已配置 (${FEISHU_CONFIG.appId})`)
    console.log(`   ⚠️  需要 HTTPS 隧道暴露端口 ${PORT} 给飞书回调`)
    console.log(`      飞书回调地址: POST /api/feishu/webhook\n`)

    // 如果有 ngrok token，自动创建隧道
    if (process.env.NGROK_AUTOTOKEN) {
      require('@ngrok/ngrok').forward({
        addr: PORT,
        authtoken: process.env.NGROK_AUTOTOKEN,
      }).then(listener => {
        console.log(`   🔗 ngrok 隧道: ${listener.url()}`)
        console.log(`   📌 飞书回调地址设为: ${listener.url()}/api/feishu/webhook\n`)
      }).catch(e => {
        console.log(`   ⚠️  ngrok 隧道启动失败: ${e.message}`)
        console.log(`      手动运行: npx ngrok http ${PORT}\n`)
      })
    } else {
      console.log(`      手动运行: npx ngrok http ${PORT}\n`)
    }
  } else {
    console.log(`   ❌ 飞书 Bot 未配置（设置环境变量 FEISHU_APP_ID 等）\n`)
  }
})

// ---------- Utils ----------

function formatTimeAgo(timeStr, now) {
  // Simple relative time
  return timeStr || ''
}

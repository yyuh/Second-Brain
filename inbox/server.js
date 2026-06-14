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

// ----------------------------------------------------------------
// 分类逻辑
// ----------------------------------------------------------------

function classifyContent(content, userType) {
  if (userType && userType !== 'auto') return userType

  const lines = content.trim().split('\n')
  const firstLine = lines[0] || ''

  if (/^(提醒|记得|待办|todo|remind|别忘了|有空)/i.test(firstLine)) return 'reminder'
  if (/^(钥匙|手机|钱包|放在|桌上|抽屉)/i.test(firstLine)) return 'reminder'
  if (/^(项目|目标|计划|进度|在做|正在)/i.test(firstLine)) return 'goal'
  if (/^(学习了|学到|笔记|总结|读书|课程|教程)/i.test(firstLine)) return 'learning'
  if (/^(今天|昨天|明天|刚才|早上|晚上|下午)/i.test(firstLine) && content.length < 500) return 'journal'
  if (content.length > 500) return 'insight'
  return 'note'
}

function generateTitle(content, type) {
  const firstLine = content.trim().split('\n')[0] || ''
  const clean = firstLine.replace(/^[#\s>*-]+/, '').trim()
  if (clean.length <= 60) return clean || type + '-' + dateStr()
  return clean.substring(0, 60).trim() + '...'
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
  reminder: { dir: 'reminders', category: 'reminders', emoji: '\u{1F4CC}' },
  insight:  { dir: 'insights',  category: 'insights',  emoji: '\u{1F4A1}' },
  journal:  { dir: 'journal',   category: 'journal',   emoji: '\u{1F4DD}' },
  goal:     { dir: 'goals',     category: 'goals',     emoji: '\u{1F3AF}' },
  learning: { dir: 'learning',  category: 'learning',  emoji: '\u{1F4DA}' },
  note:     { dir: 'journal',   category: 'journal',   emoji: '\u{1F4C4}' },
}

// ----------------------------------------------------------------
// Wiki 写入
// ----------------------------------------------------------------

function writeToWiki(content, type, title, source) {
  const cat = CATEGORY_MAP[type] || CATEGORY_MAP.note
  const now = dateStr()
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 80) || 'untitled'
  const fileName = now + '-' + safeTitle + '.md'
  const filePath = path.join(WIKI_DIR, cat.dir, fileName)

  const mdLines = [
    '---',
    'title: "' + title + '"',
    'category: ' + cat.category,
    'tags: []',
    'created: ' + now,
    'updated: ' + now,
    'sources: 0',
    '---',
    '',
    content.trim(),
    '',
    '---',
    '_通过输入站' + (source ? ' · ' + source : '') + ' · ' + timeStr() + '_',
    '',
  ]

  fs.writeFileSync(filePath, mdLines.join('\n'), 'utf-8')
  return { filePath, fileName, relativePath: 'wiki/' + cat.dir + '/' + fileName }
}

function updateIndex(type, title, relativePath) {
  const indexPath = path.join(WIKI_DIR, 'index.md')
  let content
  try {
    content = fs.readFileSync(indexPath, 'utf-8')
  } catch {
    content = '---\ntitle: "Second Brain 目录"\ncategory: index\ncreated: ' + dateStr() + '\nupdated: ' + dateStr() + '\n---\n\n# Second Brain 知识库\n\n> 自动维护的目录。\n'
  }

  const entry = '- [' + title + '](' + relativePath + ') — ' + timeStr()
  const lines = content.split('\n')
  let insertAt = lines.length
  for (let i = lines.length - 1; i > 0; i--) {
    if (lines[i].startsWith('---')) { insertAt = i + 1; break }
  }
  lines.splice(insertAt, 0, '', '### ' + dateStr(), '', entry)
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8')
}

function updateLog(type, title, relativePath) {
  const logPath = path.join(WIKI_DIR, 'log.md')
  let log
  try {
    log = fs.readFileSync(logPath, 'utf-8')
  } catch {
    log = '---\ntitle: "操作日志"\ncreated: ' + dateStr() + '\nupdated: ' + dateStr() + '\n---\n\n# 操作日志\n\n| 时间 | 操作 | 内容 |\n|---|---|---|\n'
  }

  const entry = '| ' + timeStr() + ' | ingest | [' + title + '](' + relativePath + ') (' + type + ') |'
  fs.writeFileSync(logPath, log + '\n' + entry, 'utf-8')
}

// ----------------------------------------------------------------
// Git
// ----------------------------------------------------------------

function gitCommitPush(type, title) {
  try {
    execSync('git add -A', { cwd: ROOT, stdio: 'pipe', timeout: 10000 })
    execSync('git commit -m "[' + dateStr() + '] inbox: ' + type + ' — ' + title.substring(0, 50) + '"', {
      cwd: ROOT, stdio: 'pipe', timeout: 10000
    })
    execSync('git push', { cwd: ROOT, stdio: 'pipe', timeout: 15000 })
    return true
  } catch (e) {
    if (e.message && e.message.includes('nothing to commit')) return true
    return false
  }
}

// ----------------------------------------------------------------
// History
// ----------------------------------------------------------------

function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')) }
  catch { return { items: [] } }
}

function saveHistory(entry) {
  const h = loadHistory()
  h.items.unshift(entry)
  if (h.items.length > 100) h.items = h.items.slice(0, 100)
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(h, null, 2), 'utf-8')
}

// ----------------------------------------------------------------
// Web Routes
// ----------------------------------------------------------------

app.post('/api/ingest', function(req, res) {
  var content = req.body && req.body.content
  var userType = req.body && req.body.type
  if (!content || !content.trim()) {
    return res.json({ success: false, error: '内容不能为空' })
  }

  var type = classifyContent(content, userType)
  var title = generateTitle(content, type)
  var result = writeToWiki(content, type, title)

  var rawFile = path.join(RAW_INBOX_DIR, timestamp() + '-' + type + '.md')
  fs.writeFileSync(rawFile, '# ' + title + '\n> 来源: 输入站 · ' + timeStr() + '\n> 类型: ' + type + '\n\n' + content.trim() + '\n', 'utf-8')

  updateIndex(type, title, result.relativePath)
  updateLog(type, title, result.relativePath)

  var committed = gitCommitPush(type, title)
  var commitMsg = committed
    ? '[' + dateStr() + '] inbox: ' + type + ' — ' + title.substring(0, 30)
    : '已保存（git skip）'

  saveHistory({
    title: title,
    type: type,
    path: result.relativePath,
    time: timeStr(),
    contentPreview: content.substring(0, 100),
  })

  var response = {
    success: true,
    path: result.relativePath,
    type: type,
    commit: commitMsg,
  }

  if (type === 'insight') {
    response.insightNote = '\u{1F4A1} 长文内容已归档到 insights/，下次对话时 LLM 会提取为思维模型补充到智者。'
  }

  console.log('[' + timeStr() + '] ✅ ' + type + ': ' + title)
  res.json(response)
})

app.get('/api/history', function(req, res) {
  var h = loadHistory()
  res.json({ items: h.items.slice(0, 20) })
})

// ----------------------------------------------------------------
// Feishu Bot Webhook
// ----------------------------------------------------------------

function feishuDecrypt(encryptBase64) {
  if (!FEISHU_CONFIG.encryptKey) return null
  var key = Buffer.from(FEISHU_CONFIG.encryptKey, 'base64')
  var encrypted = Buffer.from(encryptBase64, 'base64')
  var iv = encrypted.subarray(0, 16)
  var data = encrypted.subarray(16)
  var decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  decipher.setAutoPadding(true)
  var decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return JSON.parse(decrypted.toString('utf-8'))
}

function processFeishuContent(feishuMsg, sourceLabel) {
  var content = feishuMsg.content
  if (!content || content.startsWith('[收到 ')) {
    console.log('[飞书] ⏭️ 跳过非文本消息: ' + content)
    return { skipped: true }
  }

  var type = classifyContent(content, 'auto')
  var title = generateTitle(content, type)
  var result = writeToWiki(content, type, title, '飞书 · ' + sourceLabel)

  var rawFile = path.join(RAW_INBOX_DIR, timestamp() + '-feishu-' + type + '.md')
  fs.writeFileSync(rawFile, '# ' + title + '\n> 来源: 飞书 Bot · ' + timeStr() + '\n> 飞书消息ID: ' + feishuMsg.messageId + '\n> 类型: ' + type + '\n\n' + content.trim() + '\n', 'utf-8')

  updateIndex(type, title, result.relativePath)
  updateLog(type, title, result.relativePath)
  gitCommitPush(type, title)

  saveHistory({
    title: title,
    type: type,
    path: result.relativePath,
    time: timeStr(),
    source: 'feishu',
    contentPreview: content.substring(0, 100),
  })

  return { success: true, path: result.relativePath, type: type, title: title }
}

app.post('/api/feishu/webhook', function(req, res) {
  var body = req.body || {}

  // URL Challenge verification
  if (body.challenge) {
    console.log('[飞书] 🔐 URL Challenge 验证')
    return res.json({ challenge: body.challenge })
  }

  // Encrypted event
  if (body.encrypt) {
    var event
    try {
      event = feishuDecrypt(body.encrypt)
    } catch (e) {
      console.error('[飞书] 解密失败:', e.message)
      return res.status(200).json({ code: 0 })
    }

    if (!event) return res.status(200).json({ code: 0 })

    var eventType = (event.header && event.header.event_type) || event.type || 'unknown'
    console.log('[飞书] 📩 事件: ' + eventType)

    if (eventType === 'im.message.receive_v1') {
      var ev = event.event || {}
      var msg = ev.message || {}
      var sender = ev.sender || {}

      var parsedContent = ''
      if (msg.message_type === 'text') {
        try { parsedContent = JSON.parse(msg.content || '{}').text || msg.content }
        catch (e) { parsedContent = msg.content || '' }
      } else {
        parsedContent = '[收到 ' + msg.message_type + ' 消息: ' + msg.message_id + ']'
      }

      console.log('[飞书] 💬 来自 ' + (sender.sender_id ? sender.sender_id.user_id : 'unknown') + ': ' + parsedContent.substring(0, 60))

      processFeishuContent({
        content: parsedContent.trim(),
        messageId: msg.message_id,
        senderId: sender.sender_id ? sender.sender_id.user_id : 'unknown',
      }, '飞书')
    }

    return res.json({ code: 0 })
  }

  console.log('[飞书] ⚠️ 未知请求')
  res.status(200).json({ code: 0 })
})

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ----------------------------------------------------------------
// Start
// ----------------------------------------------------------------

app.listen(PORT, function() {
  console.log('')
  console.log('\u{1F9E0} Second Brain 输入站')
  console.log('   🌐 本地: http://localhost:' + PORT)
  console.log('   📁 工作目录: ' + ROOT)
  console.log('')

  if (FEISHU_CONFIG.appId && FEISHU_CONFIG.encryptKey) {
    console.log('   ✅ 飞书 Bot 已配置 (' + FEISHU_CONFIG.appId + ')')
    console.log('   ⚠️ 需要 HTTPS 隧道暴露端口 ' + PORT + ' 给飞书回调')
    console.log('      飞书回调地址: POST /api/feishu/webhook')
    console.log('')

    if (process.env.NGROK_AUTOTOKEN) {
      require('@ngrok/ngrok').forward({
        addr: PORT,
        authtoken: process.env.NGROK_AUTOTOKEN,
      }).then(function(listener) {
        console.log('   🔗 ngrok 隧道: ' + listener.url())
        console.log('   📌 飞书回调地址设为: ' + listener.url() + '/api/feishu/webhook')
        console.log('')
      }).catch(function(e) {
        console.log('   ⚠️ ngrok 隧道失败: ' + e.message)
        console.log('      手动运行: npx ngrok http ' + PORT)
        console.log('')
      })
    } else {
      console.log('      手动运行: npx ngrok http ' + PORT)
      console.log('')
    }
  } else {
    console.log('   ❌ 飞书 Bot 未配置（设置环境变量 FEISHU_APP_ID 等）')
    console.log('')
  }
})

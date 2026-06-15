// DeepSeek 对话静默提取脚本 v2
// 原理：用 xbrowser 的 Edge profile（已登录 DeepSeek）→ 打开页面 → 读 DOM
// 不依赖 API、Token、IndexedDB
// 运行: node raw/deepseek/extract-deepseek.cjs
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const PROFILE_PATH = 'C:/Users/18480/.qclaw/tools/xbrowser/profiles/edge/Default'
const OUTPUT_DIR = 'C:/Users/18480/Desktop/second-brain/raw/deepseek'
const STATE_FILE = path.join(OUTPUT_DIR, '.scan-state.json')

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  } catch {}
  return { lastSuccess: null, lastAttempt: null, consecutiveFailures: 0, savedIds: [] }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
}

function saveSession(title, messages, sessionId) {
  if (!title || title === '未命名') return null
  const date = new Date().toISOString().slice(0, 10)
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50)
  const filePath = path.join(OUTPUT_DIR, `${date}-${safeTitle}.md`)
  if (fs.existsSync(filePath)) return null

  const md = [
    `# ${title}`,
    ``,
    `> 来源: DeepSeek DOM 提取`,
    `> 提取时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
    sessionId ? `> 会话 ID: ${sessionId}` : null,
    ``,
    `## 对话内容`,
    ``,
    ...messages.map(m =>
      `**${m.role}**:\n\n${m.content}\n\n---\n`
    ),
  ].filter(Boolean).join('\n')

  fs.writeFileSync(filePath, md, 'utf-8')
  console.log(`  ✅ 保存: ${date}-${safeTitle}.md (${messages.length} 条消息)`)
  return filePath
}

async function main() {
  const state = loadState()
  state.lastAttempt = new Date().toISOString()
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('[deepseek-scan] 启动 Edge (xbrowser profile)...')
  const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
    channel: 'msedge',
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-blink-features=AutomationControlled'],
  })

  const page = await browser.newPage()
  await page.goto('https://chat.deepseek.com', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(5000)

  // 登录检测：有 ds_session_id cookie 且不在登录页 = 已登录
  const cookies = await page.context().cookies()
  const hasSessionCookie = cookies.some(c => c.name === 'ds_session_id')
  const isOnLoginPage = page.url().includes('/sign_in') || page.url().includes('/login')

  if (!hasSessionCookie || isOnLoginPage) {
    console.log('[deepseek-scan] ❌ 未登录，跳过本次提取')
    state.consecutiveFailures++
    saveState(state)
    await browser.close()
    return { success: false, reason: 'not_logged_in' }
  }

  console.log('[deepseek-scan] ✅ 已登录')

  // 从 DOM 读取侧边栏中的会话链接（每个链接包含 /chat/{id}）
  const sessions = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/chat/"]')
    const seen = new Set()
    const results = []
    for (const a of links) {
      const href = a.getAttribute('href')
      const text = a.textContent?.trim()
      if (href && text && !seen.has(href)) {
        seen.add(href)
        const id = href.replace('/chat/', '')
        if (id && id.length > 10) { // UUID 至少这么长
          results.push({ id, title: text, href })
        }
      }
    }
    return results
  }).catch(() => [])

  console.log(`[deepseek-scan] 找到 ${sessions.length} 个会话:`)
  sessions.slice(0, 10).forEach(s => console.log(`  - [${s.id.slice(0, 8)}] ${s.title.slice(0, 40)}`))
  if (sessions.length > 10) console.log(`  ... 还有 ${sessions.length - 10} 个`)

  let savedCount = 0
  const newIds = []

  for (const sess of sessions) {
    if (state.savedIds?.includes(sess.id)) continue

    console.log(`\n[deepseek-scan] 读取: ${sess.title.slice(0, 30)}...`)
    try {
      await page.goto(`https://chat.deepseek.com${sess.href}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {})
      await page.waitForTimeout(3000)
    } catch {
      continue
    }

    // JS 渲染后等消息 DOM 出现
    try {
      await page.waitForSelector('[class*="message"], [class*="ds-markdown"], [class*="ds-user"], [class*="chat-bubble"]', { timeout: 8000 })
    } catch {}

    const messages = await page.evaluate(() => {
      // DeepSeek 的消息可能是 ds-markdown, ds-user-message, prose 等 class
      const containers = document.querySelectorAll('[class*="ds-user-message"], [class*="ds-markdown"], [class*="ds-chat"], [class*="message"], [class*="bubble"]')
      const results = []
      for (const el of containers) {
        const text = el.textContent?.trim()
        if (!text || text.length < 5) continue
        const parent = el.closest('[class*="user"]') || el.closest('[class*="assistant"]') || el.parentElement
        const isUser = /user|self|query|question/i.test(parent?.className || '')
        results.push({
          role: isUser ? '用户' : 'DeepSeek',
          content: text.slice(0, 10000),
        })
      }
      return results
    }).catch(() => [])

    if (messages.length > 0) {
      // 去重：合并连续的同角色消息
      const deduped = messages.filter((m, i) =>
        i === 0 || m.role !== messages[i - 1].role || m.content !== messages[i - 1].content
      )
      const saved = saveSession(sess.title, deduped, sess.id)
      if (saved) {
        savedCount++
        newIds.push(sess.id)
      }
    } else {
      console.log(`  ⚠️ 未提取到消息 (DOM 选择器可能不匹配)`)
      // fallback: 检查页面是否有内容
      const bodyText = await page.evaluate(() => document.body?.innerText?.length || 0)
      console.log(`  body text length: ${bodyText}`)
    }
  }

  // 更新 state
  if (newIds.length > 0) {
    state.lastSuccess = new Date().toISOString()
    state.consecutiveFailures = 0
    state.savedIds = [...new Set([...(state.savedIds || []), ...newIds])]
  } else {
    state.lastSuccess = new Date().toISOString()
    state.consecutiveFailures = 0
  }
  saveState(state)

  await browser.close()
  console.log(`\n[deepseek-scan] ✅ 完成: 新保存 ${savedCount} 个会话`)
  return { success: true, saved: savedCount, total: sessions.length }
}

main().then(r => {
  console.log(`[deepseek-scan] 结果: ${JSON.stringify(r)}`)
  process.exit(0)
}).catch(e => {
  console.error('[deepseek-scan] 错误:', e.message)
  try {
    const state = loadState()
    state.lastAttempt = new Date().toISOString()
    state.consecutiveFailures = (state.consecutiveFailures || 0) + 1
    saveState(state)
  } catch {}
  process.exit(0)
})

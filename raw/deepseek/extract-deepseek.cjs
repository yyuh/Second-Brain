// DeepSeek 浏览器数据提取脚本
// 使用 Playwright 从 Edge/Chrome 中提取已登录的 DeepSeek 对话
// 运行: node raw/deepseek/extract-deepseek.mjs
//
// 首次运行：如果未登录，会以非 headless 模式打开窗口让你扫码登录，登录后自动提取。
// 后续运行：如果已有登录态，headless 模式下直接提取。

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const PROFILE_PATH = 'C:/Users/18480/.qclaw/tools/xbrowser/profiles/edge/Default'
const OUTPUT_DIR = 'C:/Users/18480/Desktop/second-brain/raw/deepseek'

async function extractAll(page) {
  return await page.evaluate(async () => {
    const results = []
    const dbNames = await indexedDB.databases()

    for (const info of dbNames) {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open(info.name)
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error)
      })

      const dbInfo = { name: info.name, stores: [] }
      for (const storeName of db.objectStoreNames) {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const allData = await new Promise((resolve, reject) => {
          const r = store.getAll()
          r.onsuccess = () => resolve(r.result)
          r.onerror = () => reject(r.error)
        })
        dbInfo.stores.push({ name: storeName, count: allData.length, data: allData })
      }
      db.close()
      results.push(dbInfo)
    }
    return results
  })
}

function saveSession(title, messages, sessionId) {
  if (!title || title === '未命名') return

  const date = new Date().toISOString().slice(0, 10)
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50)
  const filePath = path.join(OUTPUT_DIR, `${date}-${safeTitle}.md`)

  const md = [
    `# ${title}`,
    ``,
    `> 来源: DeepSeek 自动提取`,
    `> 提取时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
    sessionId ? `> 会话 ID: ${sessionId}` : null,
    ``,
    `## 对话内容`,
    ``,
    ...messages.map(m => {
      const role = m.role === 'USER' ? '**🙋 用户**' : m.role === 'ASSISTANT' ? '**🤖 DeepSeek**' : `**${m.role}**`
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content, null, 2)
      return `${role}:\n\n${content}\n\n---\n`
    }),
  ].filter(Boolean).join('\n')

  fs.writeFileSync(filePath, md, 'utf-8')
  console.log(`  ✅ 已保存: ${date}-${safeTitle}.md`)
  return filePath
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('启动 Edge (使用 xbrowser 配置)...')
  const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
    channel: 'msedge',
    headless: false,  // 非 headless，可以看到登录界面
    args: ['--no-first-run', '--no-default-browser-check'],
  })

  const page = await browser.newPage()
  console.log('导航到 DeepSeek...')
  await page.goto('https://chat.deepseek.com', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)

  const currentUrl = page.url()
  console.log(`当前页面: ${currentUrl}`)

  // 如果未登录，等待用户手动登录
  if (currentUrl.includes('/sign_in') || currentUrl.includes('/login') || currentUrl.includes('/auth')) {
    console.log('\n⚠️  未登录 DeepSeek')
    console.log('请在打开的浏览器窗口中扫码/登录 DeepSeek')
    console.log('登录完成后，按 Enter 键继续...')
    console.log('（或输入 s 跳过本次提取）\n')

    // 等待用户按 Enter
    await new Promise(resolve => {
      process.stdin.once('data', data => {
        const input = data.toString().trim().toLowerCase()
        if (input === 's' || input === 'skip') {
          console.log('已跳过本次提取')
          resolve('skip')
        } else {
          resolve('continue')
        }
      })
    })

    // 再等几秒让页面加载
    await page.waitForTimeout(2000)
  }

  // 检查是否已登录（跳转到聊天页面了）
  const afterUrl = page.url()
  if (afterUrl.includes('/sign_in') || afterUrl.includes('/login')) {
    console.log('仍未登录，跳过提取。')
    await browser.close()
    return
  }

  console.log('\n已登录！提取对话数据...')
  await page.waitForTimeout(2000)

  const allData = await extractAll(page)
  let totalSessions = 0
  let totalMessages = 0

  // 数据按 session + message 组织
  const sessionsMap = new Map()

  for (const db of allData) {
    console.log(`\n📦 数据库: ${db.name}`)
    for (const store of db.stores) {
      console.log(`  📋 ${store.name} (${store.count} 条)`)

      for (const item of store.data) {
        // 会话表
        if (item.id && item.title !== undefined) {
          totalSessions++
          sessionsMap.set(item.id, { title: item.title, messages: [], id: item.id })
          console.log(`  📄 会话: ${item.title} (${item.id.slice(0, 8)}...)`)
        }

        // 消息表
        if (item.role && item.content) {
          totalMessages++
          const preview = typeof item.content === 'string'
            ? item.content.slice(0, 80).replace(/\n/g, ' ')
            : '[二进制]'
          console.log(`  💬 [${item.role}] ${preview}`)

          // 如果消息有 sessionId/parentId，关联到对应会话
          if (item.parent_id && sessionsMap.has(item.parent_id)) {
            sessionsMap.get(item.parent_id).messages.push(item)
          }
        }
      }
    }
  }

  // 保存每个会话
  let savedCount = 0
  for (const [id, session] of sessionsMap) {
    if (session.messages.length > 0) {
      saveSession(session.title, session.messages, id)
      savedCount++
    }
  }

  console.log(`\n=== 提取完成 ===`)
  console.log(`会话: ${totalSessions}, 消息: ${totalMessages}, 已保存: ${savedCount} 个文件`)

  await browser.close()
}

main().catch(e => {
  console.error('错误:', e.message)
  process.exit(1)
})

// DeepSeek 浏览器数据提取脚本
// 使用 Playwright 读取 xbrowser 配置文件中已登录的 DeepSeek 对话
// 运行: node raw/deepseek/extract-deepseek.mjs

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const PROFILE_PATH = 'C:/Users/18480/.qclaw/tools/xbrowser/profiles/edge/Default'
const OUTPUT_DIR = 'C:/Users/18480/Desktop/second-brain/raw/deepseek'
const DEEPSEEK_URL = 'https://chat.deepseek.com'

async function extractFromIndexedDB(page) {
  return await page.evaluate(async () => {
    const results = []
    const dbNames = await indexedDB.databases()

    for (const dbInfo of dbNames) {
      if (!dbInfo.name.includes('deepseek')) continue

      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(dbInfo.name)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })

      for (const storeName of db.objectStoreNames) {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const allData = await new Promise((resolve, reject) => {
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
        results.push({ db: dbInfo.name, store: storeName, count: allData.length, data: allData })
      }
      db.close()
    }
    return results
  })
}

async function main() {
  console.log('启动 Edge (使用 xbrowser 配置)...')
  const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
    channel: 'msedge',
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check'],
  })

  const page = await browser.newPage()
  console.log('导航到 DeepSeek...')
  await page.goto(DEEPSEEK_URL, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)

  // 检测是否已登录
  const url = page.url()
  if (url.includes('/auth') || url.includes('/login')) {
    console.log('未登录 DeepSeek，需要先手动登录一次。')
    console.log('请在浏览器中登录 DeepSeek 后再运行此脚本。')
    await browser.close()
    return
  }

  console.log('已登录！提取 IndexedDB 数据...')
  const extracted = await extractFromIndexedDB(page)

  for (const item of extracted) {
    console.log(`\n📦 ${item.db} / ${item.store} (${item.count} 条)`)

    if (item.store === 'chat_sessions' || item.store.includes('session')) {
      for (const session of item.data) {
        const title = session.title || session.name || '未命名'
        const id = session.id || ''
        console.log(`  📄 ${title} (${id.substring(0, 20)}...)`)

        // 保存为 markdown 文件
        if (title && title !== '未命名') {
          const date = new Date().toISOString().slice(0, 10)
          const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50)
          const md = [
            `# ${title}`,
            ``,
            `> 来源: DeepSeek 自动提取 (${new Date().toISOString()})`,
            `> 会话 ID: ${id}`,
            ``,
            `## 对话内容`,
            ``,
          ].join('\n')

          writeFileSync(join(OUTPUT_DIR, `${date}-${safeTitle}.md`), md, 'utf-8')
          console.log(`  ✅ 已保存: ${date}-${safeTitle}.md`)
        }
      }
    }

    if (item.store === 'chat_messages' || item.store.includes('message')) {
      for (const msg of item.data) {
        if (msg.role && msg.content) {
          const preview = typeof msg.content === 'string'
            ? msg.content.substring(0, 100).replace(/\n/g, ' ')
            : '[二进制内容]'
          console.log(`  💬 [${msg.role}] ${preview}`)
        }
      }
    }
  }

  console.log(`\n共提取 ${extracted.length} 个数据源`)
  await browser.close()
}

main().catch(e => {
  console.error('错误:', e.message)
  process.exit(1)
})

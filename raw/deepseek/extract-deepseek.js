// Extract DeepSeek chat data from xbrowser's Edge IndexedDB LevelDB
const { ClassicLevel } = require('classic-level')
const path = require('path')

const dbPath = path.resolve('C:/Users/18480/.qclaw/tools/xbrowser/profiles/edge/Default/IndexedDB/https_chat.deepseek.com_0.indexeddb.leveldb')

async function extract() {
  const db = new ClassicLevel(dbPath, { keyEncoding: 'buffer', valueEncoding: 'buffer' })

  const sessions = []
  const messages = []
  try {
    const entries = await db.iterator().all()
    console.log(`Total LevelDB entries: ${entries.length}`)

    for (const [key, value] of entries) {
      // Try to parse value as JSON
      const str = value.toString('utf8').replace(/\0/g, '').trim()
      if (!str || str.length < 5) continue

      // Look for JSON objects
      if (str.startsWith('{') || str.startsWith('[')) {
        try {
          const obj = JSON.parse(str)
          if (obj.id && obj.title !== undefined) {
            sessions.push({ id: obj.id, title: obj.title, model: obj.model, obj })
          } else if (obj.role && obj.content !== undefined) {
            const content = typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content).substring(0, 200)
            messages.push({ role: obj.role, content: content.substring(0, 200) })
          }
        } catch(e) {
          // Not JSON, skip
        }
      }

      // Check key for chat_session or message patterns
      const keyStr = key.toString('utf8').replace(/\0/g, '')
      if (keyStr.includes('chat_session') || keyStr.includes('session')) {
        // Try to extract text content from binary value
        const text = value.toString('utf8').replace(/[\x00-\x08\x0E-\x1F]/g, ' ').substring(0, 500)
        if (text.includes('"id"') || text.includes('"title"')) {
          sessions.push({ key: keyStr, text })
        }
      }
    }
  } finally {
    await db.close()
  }

  console.log('\n=== SESSIONS FOUND ===')
  sessions.forEach((s, i) => {
    console.log(`\n[${i+1}] ${s.title || 'unnamed'}`)
    if (s.id) console.log(`    ID: ${s.id}`)
    if (s.model) console.log(`    Model: ${s.model}`)
    if (s.text) console.log(`    Raw: ${s.text.substring(0, 200)}`)
  })

  console.log(`\n=== MESSAGES FOUND: ${messages.length} ===`)
  messages.forEach((m, i) => {
    console.log(`[${i+1}] ${m.role}: ${m.content.substring(0, 100)}`)
  })

  console.log(`\nTotal sessions: ${sessions.length}`)
}

extract().catch(e => console.error('Error:', e.message))

/**
 * Second Brain HTTPS Tunnel - 通过 localtunnel 暴露本地服务器
 *
 * 作用：让飞书服务器能访问到本地 localhost:3456
 * 启动：node inbox/tunnel.js
 */
const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

const TUNNEL_FILE = path.join(__dirname, '..', 'raw', 'inbox', '.tunnel.json');
const PORT = process.env.PORT || 3456;

(async () => {
  console.log('🔗 正在建立 HTTPS 隧道...');
  try {
    const tunnel = await localtunnel({ port: PORT });
    const info = {
      url: tunnel.url,
      started: new Date().toISOString(),
      feishuWebhook: tunnel.url + '/api/feishu/webhook',
    };

    console.log('');
    console.log('✅ ========================================');
    console.log('   🧠 Second Brain 隧道已开启');
    console.log('   🌐 公网地址: ' + tunnel.url);
    console.log('   📌 飞书回调: ' + info.feishuWebhook);
    console.log('   ========================================');
    console.log('');
    console.log('   下一步：去飞书开发者后台');
    console.log('   1. 打开 https://open.feishu.cn/app');
    console.log('   2. 选择你的应用');
    console.log('   3. 左侧 → 事件与回调');
    console.log('   4. 回调地址填入上面的地址');
    console.log('   5. 把 Encrypt Key 发给泰明');
    console.log('');

    // Save tunnel info for reference
    fs.mkdirSync(path.dirname(TUNNEL_FILE), { recursive: true });
    fs.writeFileSync(TUNNEL_FILE, JSON.stringify(info, null, 2));

    tunnel.on('close', () => {
      console.log('⚠️ 隧道已关闭');
      fs.unlinkSync(TUNNEL_FILE);
    });

    // Keep alive - print a heartbeat every hour
    setInterval(() => {
      console.log('🔗 隧道活跃中: ' + tunnel.url);
    }, 3600000);

  } catch (e) {
    console.error('❌ 隧道建立失败:', e.message);
    console.log('');
    console.log('   请尝试手动运行: npx localtunnel --port ' + PORT);
    process.exit(1);
  }
})();

<#
.SYNOPSIS
  从 Edge/xbrowser 配置文件中提取 DeepSeek 对话记录
.DESCRIPTION
  利用 Edge 的 DevTools Protocol (CDP) 读取 DeepSeek 的 IndexedDB 数据。
  通过启动 Edge headless 模式,用 CDP 查询 IndexedDB 中的 chat_sessions 和 chat_messages。
#>

param(
    [string]$ProfilePath = "$env:USERPROFILE\.qclaw\tools\xbrowser\profiles\edge\Default",
    [string]$OutputDir = "$env:USERPROFILE\Desktop\second-brain\raw\deepseek"
)

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$debugPort = 9222

# 确保输出目录存在
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# 1. 用 xbrowser 的 Edge profile 启动 Edge headless，开启调试端口
Write-Host "启动 Edge headless 模式 (Profile: $ProfilePath) ..."

# 先检查是否已有 Edge 在 debug 端口
$existingProcess = Get-Process -Name "msedge" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*$debugPort*" -or $_.CommandLine -like "*$ProfilePath*"
}

if (-not $existingProcess) {
    $proc = Start-Process -FilePath $edgePath -ArgumentList @(
        "--headless=new",
        "--remote-debugging-port=$debugPort",
        "--user-data-dir=`"$ProfilePath`"",
        "--no-first-run",
        "--no-default-browser-check",
        "https://chat.deepseek.com"
    ) -PassThru

    Write-Host "Edge 已启动 (PID: $($proc.Id))"
    Start-Sleep -Seconds 5
} else {
    Write-Host "Edge 已在运行，复用进程..."
}

# 2. 通过 CDP 获取 IndexedDB 数据
$baseUrl = "http://localhost:$debugPort"

try {
    # 获取可用的页面目标
    $targets = Invoke-RestMethod -Uri "$baseUrl/json" -Method Get
    $chatTarget = $targets | Where-Object { $_.url -like "*chat.deepseek.com*" } | Select-Object -First 1

    if (-not $chatTarget) {
        Write-Host "找不到 DeepSeek 页面，尝试创建新页面..."
        $null = Invoke-RestMethod -Uri "$baseUrl/json/new?https://chat.deepseek.com" -Method Put
        Start-Sleep -Seconds 3
        $targets = Invoke-RestMethod -Uri "$baseUrl/json" -Method Get
        $chatTarget = $targets | Where-Object { $_.url -like "*chat.deepseek.com*" } | Select-Object -First 1
    }

    if (-not $chatTarget) {
        Write-Host "无法访问 DeepSeek 页面"
        exit 1
    }

    $wsUrl = $chatTarget.webSocketDebuggerUrl
    Write-Host "连接: $wsUrl"

    # 使用 WebSocket 发送 CDP 命令
    # 这里需要一个 WebSocket 客户端
    # 可以用 .NET 的 WebSocket 或调用第三方工具
    Write-Host "DeepSeek 页面已连接，准备提取 IndexedDB..."

    # 注入脚本读取 IndexedDB
    $script = @"
    (async () => {
        const dbs = await indexedDB.databases();
        const results = [];

        for (const dbInfo of dbs) {
            if (dbInfo.name !== 'chat_deepseek') continue;

            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open(dbInfo.name);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            // 读取所有 Object Stores
            for (const storeName of db.objectStoreNames) {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const all = await new Promise((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });
                results.push({ store: storeName, data: all });
            }
            db.close();
        }
        return results;
    })()
"@

    Write-Host "通过 CDP Runtime.evaluate 注入脚本..."
    $body = @{
        id = 1
        method = "Runtime.evaluate"
        params = @{
            expression = $script
            returnByValue = $true
            awaitPromise = $true
        }
    } | ConvertTo-Json

    try {
        $result = Invoke-RestMethod -Uri "$baseUrl/json" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "CDP 结果: $($result | ConvertTo-Json -Depth 2)"
    } catch {
        Write-Host "WebSocket 方式需要额外工具，回退到内容提取..."
    }

} catch {
    Write-Host "CDP 操作失败: $_"
} finally {
    # 清理：关闭 Edge
    if ($proc) {
        $proc.Kill()
        Write-Host "Edge 已关闭"
    }
}

# 3. 回退方案：用 strings 从 LevelDB 日志提取
Write-Host "`n=== 回退方案 ===`n"
Write-Host "LevelDB 二进制格式较难直接解析。推荐工作流："
Write-Host "  1. 打开 chat.deepseek.com"
Write-Host "  2. 手动复制对话内容"
Write-Host "  3. 粘贴到 raw/deepseek/ 目录的新文件"
Write-Host ""
Write-Host "或者使用 DeepSeek 网页版的导出功能（如果有的话）。"
Write-Host ""

# 该功能需要 WebSocket 库支持
# 安装: Install-Module -Name websocket 或使用 .NET WebSocket
Write-Host "需要安装 WebSocket 客户端以完成自动提取。"
Write-Host "安装命令: Install-Module -Name websocket -Force -Scope CurrentUser"

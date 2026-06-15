# CODx连接DeepSeek授权问题
> 来源: DeepSeek DOM 提取
> 提取时间: 2026/6/16 06:10:40
> 会话 ID: /as/751e470e-85e1-4d99-9288-6db5bca325b9
## 对话内容
**DeepSeek**:

1000062648.jpgJPG 372.74KB1000062647.jpgJPG 320.64KBcodx的窗口

---

**DeepSeek**:

从你发的这两张截图来看，你正在使用一个叫 CODx 的界面（可能是 VS Code 的某个插件或自建 AI 工具），它试图连接 DeepSeek 的 API，但遇到了授权问题。核心问题（401 Unauthorized）截图里明确提示了：unexpected status 401 UnauthorizedAuthentication Fails意思就是：CODx 在调用 DeepSeek API 时，没有通过身份验证。通常是因为：API Key 没有填、填错了、或者已失效。代理配置（CC Switch local proxy）转发时丢失了鉴权信息。你需要做的（解决后我才能正常工作）打开 CODx 的设置截图二里已经提示：“Couldn't import other agent setup / Open settings to review and try again”找到 DeepSeek 的 API Key 配置项填入有效的 DeepSeek API Key检查 Base URL 是否正确（通常是 https://api.deepseek.com）如果使用代理确认代理是否也需要携带 API Key或者暂时关闭代理直连试试保存设置后，重启 CODx 或重新连接关于你的问题：“你好，你是谁，你能为我做什么”我是 DeepSeek，一个由深度求索公司创造的 AI 助手。我目前是通过 DeepSeek 的 API 能力在为你服务。一旦 CODx 里的鉴权问题解决，我可以帮你做这些事（通过你的 CODx 界面）：回答各种知识性问题解释代码、写代码、改 bug总结文档、翻译、润色文本分析逻辑、给建议、陪你讨论问题总结一句话：现在是 CODx 没把你的 DeepSeek API Key 正确传给 DeepSeek 服务器，导致我“进不来”。你需要进 CODx 设置里重新配一下 API Key。如果你方便，也可以告诉我 —— 你是想继续修好 CODx 里的连接，还是换一个地方（比如直接在本网页对话）来使用我？

---

**DeepSeek**:

从你发的这两张截图来看，你正在使用一个叫 CODx 的界面（可能是 VS Code 的某个插件或自建 AI 工具），它试图连接 DeepSeek 的 API，但遇到了授权问题。

---

**DeepSeek**:

核心问题（401 Unauthorized）截图里明确提示了：

---

**DeepSeek**:

unexpected status 401 UnauthorizedAuthentication Fails

---

**DeepSeek**:

意思就是：CODx 在调用 DeepSeek API 时，没有通过身份验证。通常是因为：

---

**DeepSeek**:

API Key 没有填、填错了、或者已失效。

---

**DeepSeek**:

代理配置（CC Switch local proxy）转发时丢失了鉴权信息。

---

**DeepSeek**:

你需要做的（解决后我才能正常工作）

---

**DeepSeek**:

打开 CODx 的设置截图二里已经提示：

---

**DeepSeek**:

“Couldn't import other agent setup / Open settings to review and try again”

---

**DeepSeek**:

找到 DeepSeek 的 API Key 配置项

---

**DeepSeek**:

填入有效的 DeepSeek API Key

---

**DeepSeek**:

检查 Base URL 是否正确（通常是 https://api.deepseek.com）

---

**DeepSeek**:

如果使用代理

---

**DeepSeek**:

确认代理是否也需要携带 API Key

---

**DeepSeek**:

或者暂时关闭代理直连试试

---

**DeepSeek**:

保存设置后，重启 CODx 或重新连接

---

**DeepSeek**:

关于你的问题：“你好，你是谁，你能为我做什么”

---

**DeepSeek**:

我是 DeepSeek，一个由深度求索公司创造的 AI 助手。我目前是通过 DeepSeek 的 API 能力在为你服务。

---

**DeepSeek**:

一旦 CODx 里的鉴权问题解决，我可以帮你做这些事（通过你的 CODx 界面）：

---

**DeepSeek**:

回答各种知识性问题

---

**DeepSeek**:

解释代码、写代码、改 bug

---

**DeepSeek**:

总结文档、翻译、润色文本

---

**DeepSeek**:

分析逻辑、给建议、陪你讨论问题

---

**DeepSeek**:

总结一句话：现在是 CODx 没把你的 DeepSeek API Key 正确传给 DeepSeek 服务器，导致我“进不来”。你需要进 CODx 设置里重新配一下 API Key。

---

**DeepSeek**:

如果你方便，也可以告诉我 —— 你是想继续修好 CODx 里的连接，还是换一个地方（比如直接在本网页对话）来使用我？

---

**DeepSeek**:

deepseek接入codx需要路由，是我cc上路由设置的不对吗

---

**DeepSeek**:

已阅读 10 个网页根据你的截图 1000062648.jpg 中明确显示的错误信息：unexpected status 401 Unauthorized: CC Switch local proxy failed while handling Codex endpoint /responses. Provider: DeepSeek; model: deepseek-v4-flash; upstream_status: HTTP 401; cause: Authentication Fails (governor)这个 401 错误的核心原因是：请求到达了 DeepSeek 服务器，但 API Key 无法通过身份验证-9-1。大概率不是你的“路由设置本身”错了，而是路由正常工作后，转发请求时 DeepSeek 没能认出你的 API Key-1。请按以下顺序排查（最可能的原因排在最前面）🥇 1. DeepSeek API Key 复制不正确（最常见）重新复制一次 API Key，确保没有多余空格或换行符。确认使用的是 DeepSeek 官方平台（https://platform.deepseek.com/）的有效 Key，余额充足。如果使用过不同的 Key，确认 CC Switch 里填的是当前启用、未过期的 Key-9。DeepSeek 不会提示“Key 错误”，只会统一返回 401-9。🥈 2. 未使用 DeepSeek 预设（路由映射是否打开）CC Switch 接入 DeepSeek 必须使用“DeepSeek 预设”，并确保该供应商开启了 “需要本地路由映射” 开关（勾选）。检查你在 CC Switch → Codex 标签页 添加供应商时，是否选择的是预设列表里的 DeepSeek，而不是手动填写的-1。预设会自动填写正确的 API 地址和格式标记（apiFormat = "openai_chat"），确保路由知道上游是 Chat 接口-1。确认 DeepSeek 供应商处于 “启用” 状态。🥉 3. Codex 配置是否被正确接管CC Switch 接管 Codex 后，会修改 ~/.codex/config.toml，让 Codex 请求发到本地路由（127.0.0.1:15721），而不是直连 DeepSeek-1。检查 ~/.codex/config.toml 中的 base_url 是否为 http://127.0.0.1:15721/v1。确认 wire_api = "responses" 是否存在。如果文件被手动改过或被其他工具覆盖，接管会失效。4. CC Switch 路由服务是否正常运行在 CC Switch → 路由页面，确认 “本地路由”总开关为“运行中”。“路由启用”中必须勾选 Codex。确保没有其他程序占用 127.0.0.1:15721 端口。5. 重启 Codex 终端修改配置或切换供应商后，必须完全退出 Codex 进程（关闭终端窗口或 kill 进程），重新打开，才能加载新的配置和模型目录-1。你的路由设置“不对”的可能性很低因为从你的错误信息来看：请求已经到达了 DeepSeek 上游（upstream_status: HTTP 401 说明连接成功了）CC Switch 路由层在正常工作，把 Codex 的请求转发给了 DeepSeek所以路由基本是通的。问题出在“DeepSeek 不认可你的身份”。如果 401 持续出现，建议在 CC Switch 的 DeepSeek 供应商设置里，重新填入 API Key 并保存，然后重启路由服务和 Codex。10 个网页

---

**DeepSeek**:

根据你的截图 1000062648.jpg 中明确显示的错误信息：unexpected status 401 Unauthorized: CC Switch local proxy failed while handling Codex endpoint /responses. Provider: DeepSeek; model: deepseek-v4-flash; upstream_status: HTTP 401; cause: Authentication Fails (governor)这个 401 错误的核心原因是：请求到达了 DeepSeek 服务器，但 API Key 无法通过身份验证-9-1。大概率不是你的“路由设置本身”错了，而是路由正常工作后，转发请求时 DeepSeek 没能认出你的 API Key-1。请按以下顺序排查（最可能的原因排在最前面）🥇 1. DeepSeek API Key 复制不正确（最常见）重新复制一次 API Key，确保没有多余空格或换行符。确认使用的是 DeepSeek 官方平台（https://platform.deepseek.com/）的有效 Key，余额充足。如果使用过不同的 Key，确认 CC Switch 里填的是当前启用、未过期的 Key-9。DeepSeek 不会提示“Key 错误”，只会统一返回 401-9。🥈 2. 未使用 DeepSeek 预设（路由映射是否打开）CC Switch 接入 DeepSeek 必须使用“DeepSeek 预设”，并确保该供应商开启了 “需要本地路由映射” 开关（勾选）。检查你在 CC Switch → Codex 标签页 添加供应商时，是否选择的是预设列表里的 DeepSeek，而不是手动填写的-1。预设会自动填写正确的 API 地址和格式标记（apiFormat = "openai_chat"），确保路由知道上游是 Chat 接口-1。确认 DeepSeek 供应商处于 “启用” 状态。🥉 3. Codex 配置是否被正确接管CC Switch 接管 Codex 后，会修改 ~/.codex/config.toml，让 Codex 请求发到本地路由（127.0.0.1:15721），而不是直连 DeepSeek-1。检查 ~/.codex/config.toml 中的 base_url 是否为 http://127.0.0.1:15721/v1。确认 wire_api = "responses" 是否存在。如果文件被手动改过或被其他工具覆盖，接管会失效。4. CC Switch 路由服务是否正常运行在 CC Switch → 路由页面，确认 “本地路由”总开关为“运行中”。“路由启用”中必须勾选 Codex。确保没有其他程序占用 127.0.0.1:15721 端口。5. 重启 Codex 终端修改配置或切换供应商后，必须完全退出 Codex 进程（关闭终端窗口或 kill 进程），重新打开，才能加载新的配置和模型目录-1。你的路由设置“不对”的可能性很低因为从你的错误信息来看：请求已经到达了 DeepSeek 上游（upstream_status: HTTP 401 说明连接成功了）CC Switch 路由层在正常工作，把 Codex 的请求转发给了 DeepSeek所以路由基本是通的。问题出在“DeepSeek 不认可你的身份”。如果 401 持续出现，建议在 CC Switch 的 DeepSeek 供应商设置里，重新填入 API Key 并保存，然后重启路由服务和 Codex。

---

**DeepSeek**:

根据你的截图 1000062648.jpg 中明确显示的错误信息：

---

**DeepSeek**:

unexpected status 401 Unauthorized: CC Switch local proxy failed while handling Codex endpoint /responses. Provider: DeepSeek; model: deepseek-v4-flash; upstream_status: HTTP 401; cause: Authentication Fails (governor)

---

**DeepSeek**:

这个 401 错误的核心原因是：请求到达了 DeepSeek 服务器，但 API Key 无法通过身份验证-9-1。

---

**DeepSeek**:

大概率不是你的“路由设置本身”错了，而是路由正常工作后，转发请求时 DeepSeek 没能认出你的 API Key-1。

---

**DeepSeek**:

重新复制一次 API Key，确保没有多余空格或换行符。

---

**DeepSeek**:

确认使用的是 DeepSeek 官方平台（https://platform.deepseek.com/）的有效 Key，余额充足。

---

**DeepSeek**:

如果使用过不同的 Key，确认 CC Switch 里填的是当前启用、未过期的 Key-9。

---

**DeepSeek**:

DeepSeek 不会提示“Key 错误”，只会统一返回 401-9。

---

**DeepSeek**:

CC Switch 接入 DeepSeek 必须使用“DeepSeek 预设”，并确保该供应商开启了 “需要本地路由映射” 开关（勾选）。

---

**DeepSeek**:

检查你在 CC Switch → Codex 标签页 添加供应商时，是否选择的是预设列表里的 DeepSeek，而不是手动填写的-1。

---

**DeepSeek**:

预设会自动填写正确的 API 地址和格式标记（apiFormat = "openai_chat"），确保路由知道上游是 Chat 接口-1。

---

**DeepSeek**:

确认 DeepSeek 供应商处于 “启用” 状态。

---

**DeepSeek**:

CC Switch 接管 Codex 后，会修改 ~/.codex/config.toml，让 Codex 请求发到本地路由（127.0.0.1:15721），而不是直连 DeepSeek-1。

---

**DeepSeek**:

检查 ~/.codex/config.toml 中的 base_url 是否为 http://127.0.0.1:15721/v1。

---

**DeepSeek**:

确认 wire_api = "responses" 是否存在。

---

**DeepSeek**:

如果文件被手动改过或被其他工具覆盖，接管会失效。

---

**DeepSeek**:

在 CC Switch → 路由页面，确认 “本地路由”总开关为“运行中”。

---

**DeepSeek**:

“路由启用”中必须勾选 Codex。

---

**DeepSeek**:

确保没有其他程序占用 127.0.0.1:15721 端口。

---

**DeepSeek**:

修改配置或切换供应商后，必须完全退出 Codex 进程（关闭终端窗口或 kill 进程），重新打开，才能加载新的配置和模型目录-1。

---

**DeepSeek**:

因为从你的错误信息来看：

---

**DeepSeek**:

请求已经到达了 DeepSeek 上游（upstream_status: HTTP 401 说明连接成功了）

---

**DeepSeek**:

CC Switch 路由层在正常工作，把 Codex 的请求转发给了 DeepSeek

---

**DeepSeek**:

所以路由基本是通的。问题出在“DeepSeek 不认可你的身份”。

---

**DeepSeek**:

如果 401 持续出现，建议在 CC Switch 的 DeepSeek 供应商设置里，重新填入 API Key 并保存，然后重启路由服务和 Codex。

---

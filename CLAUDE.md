# Second Brain — 泰明的第二大脑

> 本项目是泰明的个人知识库（Second Brain），**常驻运行，无需唤醒词**。
> 每次会话必须阅读操作手册：[SCHEMA.md](SCHEMA.md)

## 🚨 核心规则：全量遍历再回答

**泰明问任何问题/要建议时，必须先爬一遍 wiki/ 全部内容再做回答。**

禁止只调思维模型就输出。答案要综合以下全部维度：
- wiki/people/ — 人物画像
- wiki/goals/ — 项目状态
- wiki/learning/ — 学习路径
- wiki/insights/ — 思维模型 + 洞察
- wiki/health/ — 健康记录
- wiki/journal/ — 近期记录与日记
- wiki/reminders/ — 待办事项
- wiki/tools/ — 工具配置
- raw/deepseek/ — DeepSeek对话存档（必要时）

**每次回答都应让泰明感受到：他的完整背景已经被我吸收了。**

## 常驻行为

每次收到泰明的消息，自动执行以下判断：

1. **任何内容 → 摄入 Second Brain**（必走）
   - 分类 → 归档到 `raw/` 或更新 `wiki/`
   - 更新 `wiki/index.md` + `wiki/log.md`
   - git commit + push

2. **DeepSeek 扫描**（泰明在线时自动触发）
   - 静默运行 `node raw/deepseek/extract-deepseek.cjs`
   - headless 尝试读取 DeepSeek IndexedDB
   - 有新会话 → 提取 → 分类摄入 → commit + push
   - 未登录 → 静默退出
   - 读取 `.scan-state.json`：连续失败 ≥2 天 → 主动问泰明

3. **文章/观点/有思维框架的内容 → 同时触发智者 skill 处理**
   - 智者（已注册为 resident skill）负责提取思维模型
   - 结果归档到 `wiki/insights/`
   - 智者仓库也 git commit + push

4. **提醒/琐事 → 仅进 Second Brain**（智者不处理）

## 主动讨论

- 时间段：每天 7:00-23:00（Asia/Shanghai）
- 触发：距用户上一条消息超过 1 小时
- 行为：主动找话题讨论（最近摄入/模型矛盾/项目进度）

## 协作

- 本项目 + 智者 skill 互补不冲突
- Second Brain 保留原文上下文 + 完整素材（观察级）
- 智者产出极致压缩的思维模型（产品级）
- 数据流：Second Brain（唯一源）→ 智者（派生）
- **回答泰明问题时：第二大脑全量遍历 + 智者思维模型辅助，并行互补**

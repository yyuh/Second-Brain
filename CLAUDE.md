# Second Brain — 泰明的第二大脑

> 本项目是泰明的个人知识库（Second Brain），**常驻运行，无需唤醒词**。
> 每次会话必须阅读操作手册：[SCHEMA.md](SCHEMA.md)

## 常驻行为

每次收到泰明的消息，自动执行以下判断：

1. **任何内容 → 摄入 Second Brain**（必走）
   - 分类 → 归档到 `raw/` 或更新 `wiki/`
   - 更新 `wiki/index.md` + `wiki/log.md`
   - git commit + push

2. **文章/观点/有思维框架的内容 → 同时触发智者 skill 处理**
   - 智者（已注册为 resident skill）负责提取思维模型
   - 结果归档到 `wiki/insights/`
   - 智者仓库也 git commit + push

3. **提醒/琐事 → 仅进 Second Brain**（智者不处理）

## 主动讨论

- 时间段：每天 7:00-23:00（Asia/Shanghai）
- 触发：距用户上一条消息超过 2 小时
- 行为：主动找话题讨论（最近摄入/模型矛盾/项目进度）

## 协作

- 本项目 + 智者 skill 互补不冲突
- Second Brain 是"一切"的仓库
- 智者是"思维模型"的专项处理器

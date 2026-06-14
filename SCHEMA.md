# SCHEMA v2 — 泰明的第二大脑 + 智者 双系统

> LLM 操作手册。每次会话必读。泰明和 LLM 共同演进此文件。

---

## 一、双系统架构

泰明拥有两个常驻知识系统，**均无需关键词唤醒，始终在线**：

| 系统 | 位置 | 职责 | 处理内容 |
|------|------|------|---------|
| **智者** | `~/.qclaw/skills/智者/` | 思维模型的提取、内化、演进 | 文章、观点、直播精华、可提炼为模型的内容 |
| **Second Brain** | `C:\Users\18480\Desktop\second-brain\` | 关于泰明的一切的结构化知识库 | 身份、健康、项目、学习、日记、工具、截图、提醒、琐事 |

**路由规则**：泰明发的任何东西，LLM 判断内容类型后自动分发——不需等泰明说"摄入"或"处理"。

**核心原则：所有内容都进 Second Brain，智者作为思维模型的专门处理器叠加操作。**

```
泰明发来任何内容
    │
    ├─ 全部内容 ──→ Second Brain 摄入（必走）
    │
    └─ 文章/观点/直播/播客/有可提炼的思维框架
         └─→ 智者额外处理（提取模型→ models.json）
              └─ 结果同步归档到 second-brain/wiki/insights/
```

**每次处理完后**：两个仓库都要 git commit + push。

---

## 二、目录结构

### Second Brain
```
second-brain/
├── SCHEMA.md              # 本文件
├── .git / .gitignore
├── raw/                   # 不可变来源（只读）
│   ├── articles/          # 网页剪藏、PDF、截图
│   ├── screenshots/       # 待处理截图
│   ├── reminders/         # 提醒类内容
│   └── assets/            # 图片附件
└── wiki/                  # LLM 维护的知识库
    ├── index.md           # 全库目录
    ├── log.md             # 操作日志（追加）
    ├── people/            # 人物
    ├── health/            # 健康
    ├── goals/             # 目标与项目
    ├── learning/          # 学习笔记
    ├── journal/           # 日记与反思
    ├── insights/          # 洞察与思维模型（智者产出的镜像）
    ├── reminders/         # 待办与提醒（从截图/消息提取）
    └── tools/             # 工具与工作流
```

### 智者
```
~/.qclaw/skills/智者/
├── SKILL.md               # 智者技能定义
├── core/models.json       # 27 条思维模型（主数据库）
├── .git / .gitignore
└── archive/               # 已处理的原稿归档
```

---

## 三、自动摄入规则（常驻，无需唤醒词）

LLM 接收到泰明的每条消息后，自动判断并执行：

### A. 所有内容 → Second Brain 摄入（必走）
**任何内容都先进 Second Brain**——文章、截图、提醒、琐事、对话，无一例外。

处理流程：
1. 分类归档到 wiki/ 对应子目录
2. 创建/更新相关页面
3. 更新 `wiki/index.md` 和 `wiki/log.md`
4. git commit

### B. 文章/观点类 → 智者额外处理（叠加）
**触发特征**：长文、直播口播转录、播客摘要、含论点+论证结构的内容

在 A 流程完成后，额外执行：
1. 读取内容，提取核心观点
2. 判断：是否可提炼为新的思维模型？是否更新/强化现有模型？
3. 更新 `~/.qclaw/skills/智者/core/models.json`
4. 在 `second-brain/wiki/insights/` 同步更新摘要页面
5. git commit + push 智者仓库

### D. DeepSeek 对话 → 定期挖掘
LLM 定期读取泰明的 DeepSeek 对话记录，提取有价值的问答，分类补充到智者和 Second Brain。
（具体实现待泰明确认 DeepSeek 访问方式）

---

## 四、主动联系规则（7:00-23:00，2 小时无消息）

匹配智者 Skill 的行为模式：

- **时间窗口**：每天 7:00 - 23:00（Asia/Shanghai）
- **触发条件**：距离泰明上一条消息超过 2 小时
- **行为**：查找 Second Brain 或智者中最近更新/值得讨论的内容，发起一个讨论
  - 可能的讨论话题：最近摄入的观点、项目进展、投资思考、巡检发现问题、推荐探索方向
- **夜深时段（23:00-7:00）**：静默，不打扰
- **实现**：通过 HEARTBEAT.md 配合心跳机制

---

## 五、GitHub 自动同步

### 仓库地址
| 仓库 | 本地路径 | GitHub（待创建） |
|------|---------|-----------------|
| Second Brain | `C:\Users\18480\Desktop\second-brain\` | 待泰明确认仓库名 |
| 智者 | `~/.qclaw/skills/智者/` | 待泰明确认仓库名 |

### 同步规则
- **每次更新后立即** commit + push
- commit message 格式：`[YYYY-MM-DD] <操作类型>: <简述>`
  - 例：`[2026-06-14] ingest: XX直播精华 → 强化 m006/m007/m008`
  - 例：`[2026-06-14] daily: 更新项目进度`
- 推送前先 pull --rebase 避免冲突

---

## 六、页面格式约定

每个 wiki 页面包含 YAML frontmatter：

```yaml
---
title: "页面标题"
category: people | health | goals | learning | journal | insights | reminders | tools
tags: [标签1, 标签2]
created: 2026-06-14
updated: 2026-06-14
sources: 0
---
```

---

## 七、辅助约定

- 日期格式：ISO YYYY-MM-DD，时区 Asia/Shanghai
- Markdown 编码：UTF-8 无 BOM，CRLF 换行
- 鼓励 `[[双向链接]]`（Obsidian 兼容）
- raw/ 目录只读，绝不修改
- 每次摄入必须更新 index.md 和 log.md
- 每次更新必须 git commit + push

---

## 八、系统关系图

```
泰明的消息
    │
    ├─ 全部 ──→ Second Brain 摄入（必走）
    │
    ├─ 思维类 ──→ 智者子进程（叠加处理）→ models.json
    │                  └─→ second-brain/wiki/insights/（镜像摘要）
    │
    └─ DeepSeek ──→ 定期读取 → 提炼 → 分发两者
    │
    ▼
  git push（每次更新后）
```

# AI生成PPT (AI PPT Generator)

基于素材上传、AI解析、对话式改稿与多模型生成的演示文稿系统（MVP）。  
支持通过 `gpt-image-2` 生成高质量图片型 PPT，并可通过 OpenAI-compatible 渠道接入 Gemini / GPT 等模型能力。

- 仓库地址: https://github.com/Cute-chen/ai--ppt
- 当前状态: 半成品（适合参考与二次开发）

## 关键词（便于搜索）

`AI生成PPT` `AI做PPT` `AI PPT Generator` `AI Presentation Generator` `Gemini PPT` `GPT Image PPT` `GPT-Image-2` `高质量PPT自动生成`

## 功能概览

- 多格式素材接入：`pdf/docx/txt/md/json` 等
- 素材解析与分块：用于后续对话与生成上下文
- 对话式改稿：按需求迭代主题、结构、页数与风格
- 异步任务中心：`source-parse` / `deck-generate` / `slide-regenerate` / `deck-export`
- 高质量PPT生成：基于 `gpt-image2-ppt-skills` + `gpt-image-2`
- 产物导出：`PPTX` / `PDF`

## 模型支持说明

- 图片生成主链路：`gpt-image-2`
- 文本分析模型：`OpenAI` / `Anthropic`
- 渠道兼容：支持 OpenAI-compatible 网关，可按渠道能力接入 Gemini/GPT

说明：是否可直接使用 Gemini，取决于你配置的网关是否已提供 Gemini 对应模型路由。

## 项目结构

```text
.
├─ frontend/      # React + Vite 前端
├─ backend/       # Node + TypeScript API + Worker
├─ ppt-skill/     # Python 侧 PPT 生成技能（项目运行关键依赖）
├─ docx/          # 需求/计划/配置文档
└─ local-storage/ # 本地开发存储目录
```

## 技术栈

- Frontend: React + TypeScript + Vite + Ant Design
- Backend: Node.js + TypeScript + Express
- Queue: BullMQ + Redis
- DB: MySQL
- Skill: Python (`md_to_plan.py` / `generate_ppt.py`)

## 快速开始

### 1. 环境准备

- Node.js 18+
- Python 3.10+
- MySQL 8+
- Redis 6+

### 2. 启动后端 API

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. 启动 Worker

```bash
cd backend
npm run worker
```

### 4. 启动前端

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

默认端口通常为：前端 `5173`，后端 `3001`（以 `.env` 实际配置为准）。

## 开发参考

- `backend/README.md`
- `frontend/README.md`
- `docx/plan-1.md`
- `docx/plan-2.md`
- `docx/plan-3.md`
- `docx/backend-db-config.md`

## 开源使用与引用

欢迎学习、研究与二次开发。  
如果你将本项目或衍生版本用于产品，请标注原作者引用。

建议示例：

```text
Based on ai--ppt by Cute-chen
Repo: https://github.com/Cute-chen/ai--ppt
```

## 安全提醒

- 不要将真实密钥、SMTP口令、生产环境配置提交到仓库。
- 请仅在本地 `.env` 中保存敏感信息。
- 上线前建议启用密钥轮换与最小权限策略。

## 免责声明

本项目仍在持续迭代，不保证可直接用于生产环境。请在充分测试后再部署。

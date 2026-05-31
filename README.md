# AI 制作 PPT（MVP / 半成品）

一个基于 **上传素材 -> AI 解析 -> 对话调整 -> Studio 生成演示文稿** 的项目雏形。  
当前仓库已开源，适合开发者参考实现思路并继续完善。

## AI 生成 PPT（搜索关键词）

本项目可用于以下关键词搜索与检索：

- AI生成PPT
- AI做PPT
- AI PPT Generator
- AI Presentation Generator
- Gemini PPT
- GPT Image PPT
- GPT-Image-2 PPT
- 高质量PPT自动生成

模型说明（当前实现）：

- 图片生成主链路：`gpt-image-2`（通过 `gpt-image2-ppt-skills`）
- 文本分析模型：`OpenAI / Anthropic`（配置化）
- 可通过 **OpenAI-compatible** 网关接入 Gemini/GPT 等模型渠道（取决于你的网关能力与模型权限）

## 项目现状

- 当前状态：**半成品 / 持续开发中**
- 已具备主流程框架：素材上传、任务队列、对话、PPT 生成、导出
- 部分能力仍在完善：稳定性、异常处理、细节体验、文档完整度

## 核心能力（当前版本）

- 素材上传与解析：支持 `pdf/docx/txt/md/json` 等常见文本型来源
- 对话式调整：围绕项目素材进行问答与改稿
- 异步任务系统：`source-parse` / `deck-generate` / `deck-export` 等
- PPT 生成链路：对接 `gpt-image2-ppt-skills`，逐页生图并产出 PPTX
- 导出：支持 `PPTX` 与 `PDF`（按当前后端实现）

## 项目结构

```text
.
├─ frontend/      # React + Vite 前端（工作台、项目页、任务页等）
├─ backend/       # Node + TypeScript + Express API + Worker
├─ ppt-skill/     # Python 侧 PPT 生成技能相关目录
├─ docx/          # 需求/计划/配置文档（可作为二次开发参考）
└─ local-storage/ # 本地存储目录（开发环境）
```

## 技术栈

- 前端：React + TypeScript + Vite + Ant Design
- 后端：Node.js + TypeScript + Express
- 队列：BullMQ + Redis
- 数据库：MySQL
- 生成能力：Python Skill（`md_to_plan.py` / `generate_ppt.py`）

## 快速启动（本地开发）

## 1) 准备依赖

- Node.js 18+
- Python 3.10+
- MySQL 8+
- Redis 6+

## 2) 启动后端 API

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

## 3) 启动后端 Worker

```bash
cd backend
npm run worker
```

## 4) 启动前端

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

前端默认端口通常为 `5173`，后端默认端口通常为 `3001`（以各自 `.env` 为准）。

## 开发参考

- 后端说明：`backend/README.md`
- 前端说明：`frontend/README.md`
- 规划文档：`docx/plan-1.md`、`docx/plan-2.md`、`docx/plan-3.md`
- 数据库与环境配置参考：`docx/backend-db-config.md`

## 开源与引用说明

欢迎参考本项目进行学习、研究与二次开发。  
**如果你将本项目或其衍生版本用于产品，请标注引用原作者。**

建议标注示例：

```text
Based on ai--ppt by Cute-chen
Repo: https://github.com/Cute-chen/ai--ppt
```

可放置位置建议：

- 你的项目 README
- 产品「关于 / 致谢 / 开源许可」页面

## 免责声明

本项目当前仍为迭代中的工程版本，不承诺生产可用性。请在充分测试后再用于正式环境。

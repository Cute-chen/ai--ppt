# Backend (Node + TypeScript)

基于 `docx/plan-1.md` 的 MVP 后端框架，已接入本地 MySQL + Redis，并切换为 `gpt-image2-ppt-skills` 生成链路。

## 技术栈

- Node.js + TypeScript + Express
- MySQL（业务数据持久化）
- BullMQ + Redis（任务队列）
- 本地对象存储目录（兼容后续 S3）
- LLM: OpenAI / Anthropic
- 生成: Python Skill (`md_to_plan.py` + `generate_ppt.py`)
- 导出: PPTX + PDF

## 快速开始

```bash
npm install
cp .env.example .env
npm run dev
npm run worker
```

默认端口：`3001`

## 已接入的真实能力

- `source-parse`:
  - 支持 `pdf/docx/txt/md/json` 的文本抽取
  - 将分块落到 `source_chunks`
  - 更新 `sources.status` 和 `parse_summary`
- `chat`:
  - 对话接口会读取项目素材分块并调用分析模型回复
  - 支持 `gpt/claude` 两类配置
- `deck-plan`:
  - worker 调用分析模型生成 deck 草案（供快速预览/回退）
- `deck-generate`:
  - 生成 `slides_plan.md` -> 调 skill `md_to_plan.py` -> `slides_plan.json`
  - 调 skill `generate_ppt.py` 逐页生图并输出 `metadata.json + pptx`
  - 将生成图片回写本地存储并写入 `deck_slides.image_asset_key`
- `slide-regenerate`:
  - 基于已有 skill session 的 `--edit` 单页重生图
- `deck-export`:
  - 支持 `.pptx`（图片型）与 `.pdf` 导出
  - 结果写入本地存储并记录 `exports`

## 环境变量（关键）

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=1234
DB_NAME=ai_ppt_backend

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
QUEUE_ENABLED=true

SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@example.com
SMTP_PASS=<qq-mail-auth-code>
SMTP_FROM=your_email@example.com
AUTH_CODE_COOLDOWN_SECONDS=60
AUTH_CODE_WINDOW_SECONDS=3600
AUTH_CODE_MAX_PER_WINDOW=10

LOCAL_STORAGE_ROOT_DIR=./local-storage

FEATURE_REAL_SOURCE_PARSE=true
FEATURE_REAL_DECK_PLAN=true
FEATURE_REAL_DECK_GENERATE=true
FEATURE_REAL_SLIDE_REGENERATE=true
FEATURE_REAL_DECK_EXPORT=true

SKILL_PYTHON_BIN=python3
PPT_SKILL_ROOT_DIR=../ppt-skill/gpt-image2-ppt-skills
PPT_SKILL_OUTPUT_ROOT_DIR=./local-storage/skill-outputs
PPT_SKILL_GENERATE_CONCURRENCY=4
PPT_SKILL_COMMAND_TIMEOUT_MS=600000
PPT_SKILL_IMAGE_QUALITY=high
```

## 已实现 API（plan-1 对齐）

- `POST /api/auth/send-code`（用于注册/重置密码验证码）
- `POST /api/auth/register`
- `POST /api/auth/login`（邮箱+密码）
- `POST /api/auth/forgot-password`
- `GET /api/me/model-config`
- `PUT /api/me/model-config`
- `POST /api/me/model-config/validate`
- `GET /api/styles`
- `POST /api/uploads/presign`
- `POST /api/projects/:id/sources/complete`
- `GET /api/projects/:id/sources`
- `POST /api/projects/:id/chat/messages`
- `POST /api/projects/:id/deck/generate`
- `GET /api/projects/:id/deck`
- `PATCH /api/projects/:id/slides/:slideId/spec`
- `POST /api/projects/:id/slides/:slideId/regenerate-image`
- `POST /api/projects/:id/export/pptx`
- `POST /api/projects/:id/export/pdf`
- `GET /api/jobs/:jobId`
- `GET /api/jobs/:jobId/events`

补充项目接口：

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`

## 目录结构

```text
src/
  common/            # 通用类型、错误、响应、DB工具
  config/            # env / db / queue / storage
  modules/           # auth / model-config / projects / sources / chat / studio / export / jobs
  repositories/      # MySQL 数据访问层
  services/          # 业务服务层（含 parser/llm/skill/export/styles）
  worker/            # BullMQ worker
  app.ts
  server.ts
```

## 说明

- 目前上传链路默认要求文件已经存在于 `LOCAL_STORAGE_ROOT_DIR/<objectKey>`。
- `uploads/presign` 仍是占位 URL，后续可接入真实对象存储签名上传。
- 若 `OPENAI_API_KEY`（来自用户生图配置）未配置，`deck-generate` 会失败并在 job error/events 给出原因。

## 登录与鉴权（最新）

- 登录方式：邮箱 + 密码
- 验证码用途：仅用于注册与忘记密码
- 验证码限流：
  - 同一邮箱+用途，发送后 `60s` 内不可重复发送（冷却期）
  - 同一邮箱+用途，`1h` 内最多 `10` 次（窗口上限）
- 所有业务 API 均要求 `Authorization: Bearer <accessToken>`
- 未登录访问受保护接口时返回 `401`
- 当前登录用户信息：`GET /api/me`

鉴权相关接口：

- `POST /api/auth/send-code`（purpose=`register|reset_password`）
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `GET /api/me`

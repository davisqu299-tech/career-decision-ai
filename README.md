# Career Decision AI

AI 驱动的离职决策分析助手 MVP。帮助用户通过多轮对话收集信息，最终生成结构化的离职决策报告。

## 技术栈

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Dify Workflow API（可 Mock）

## 快速开始

```bash
cd C:\Users\admin\Projects\career-decision-ai
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

复制 `.env.example` 为 `.env.local`：

| 变量 | 说明 |
|------|------|
| `DIFY_USE_MOCK` | `true` 使用本地 Mock；`false` 调用真实 Dify |
| `DIFY_API_BASE` | Dify API 地址，默认 `https://api.dify.ai/v1` |
| `DIFY_API_KEY` | Dify API Key |
| `DIFY_WORKFLOW_ID` | 可选，指定工作流 ID 时使用 `/workflows/{id}/run` |
| `DIFY_USER_PREFIX` | 用户标识前缀，默认 `career-ai` |

## 用户流程

1. **首页** — 输入离职困惑
2. **对话页** — 多轮 AI 反问（Mock 模式：2 轮反问后出报告）
3. **报告页** — 展示 `decision_summary` 四个模块

## API

### `POST /api/chat`

**Request:**

```json
{
  "sessionId": "uuid",
  "message": "用户输入",
  "history": [{ "role": "user", "content": "..." }]
}
```

**Response（反问）:**

```json
{
  "type": "follow_up",
  "strategy_id": "salary_team_growth",
  "question": "..."
}
```

**Response（最终报告）:**

```json
{
  "type": "decision",
  "decision_summary": {
    "conclusion": { "final_choice": "..." },
    "reasoning": { "core_logic": "..." },
    "insights_and_actions": { "deep_insight": "..." },
    "core_truth": { "problem_essence": "..." }
  }
}
```

## Dify 工作流对接

### 输入变量

| 变量名 | 说明 |
|--------|------|
| `query` | 用户当前输入 + 对话历史（由 `buildQuery` 拼接） |

### 输出格式

工作流需在 `outputs` 中返回以下之一：

**继续反问：**

```json
{
  "strategy_id": "策略标识",
  "question": "反问内容"
}
```

**最终决策：**

```json
{
  "decision_summary": {
    "conclusion": { "final_choice": "..." },
    "reasoning": { "core_logic": "..." },
    "insights_and_actions": { "deep_insight": "..." },
    "core_truth": { "problem_essence": "..." }
  }
}
```

解析逻辑见 [`lib/dify/parser.ts`](lib/dify/parser.ts)。

## 项目结构

```
app/           # 页面与 API 路由
components/    # UI 与业务组件
lib/dify/      # Dify 客户端、Mock、解析器
lib/chat/      # 会话存储与 hooks
lib/report/    # 报告模块注册表
types/         # 共享类型定义
```

## 扩展报告模块

1. 在 `components/report/modules/` 新建模块组件
2. 在 `lib/report/module-registry.ts` 注册

## 开发说明

- 会话数据存储在浏览器 `localStorage`
- Mock 模式无需 Dify API Key 即可完整跑通流程
- 接入真实 API 时设置 `DIFY_USE_MOCK=false` 并填写 `DIFY_API_KEY`

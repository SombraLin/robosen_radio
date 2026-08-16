# RADIO AI Shared Spec (共享协议与数据规范)

本工程是 RADIO AI 玩偶互动频道平台的**核心数据结构与 API 通讯协议契约库**。

## 📦 内容清单

- `types/index.ts`: 前端 (React)、客户端 (TypeScript) 共享的类型声明集合（包含 `Doll`, `Channel`, `NewsClip`, `PlaylistItem`, `AudioAssetItem` 等）。
- `examples/ts_usage_example.ts`: 在 Node/TypeScript 项目中消费该协议包的代码示例。

## 🚀 如何使用

### 本地项目中引用

在前端或其他 TypeScript 项目中，可通过相对路径或 npm 本地 link 引入：

```typescript
import type { Doll, Channel, PlaylistItem } from '@radio-ai/shared-spec';
```

### 运行示例代码

```bash
# 执行 TS 类型检查
npm run typecheck
```

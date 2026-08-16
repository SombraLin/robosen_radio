# RADIO AI 玩偶互动频道平台 — 代码审查与优化建议

> 审查对象：`github.com/SombraLin/robosen_radio`（main 分支）
> 审查范围：`radio-ai-admin-console`（前端）、`radio-ai-backend-service`（后端网关）、`radio-ai-crawler` / `radio-ai-data` / `radio-ai-engine` / `radio-ai-tts`（Python SDK/服务）、`radio-ai-shared-spec`（共享协议）
> 审查方式：拉取全部源码，逐模块通读关键文件（路由、数据层、Celery 任务、前端 store/组件），未运行服务（结论基于静态代码分析）
> **本版说明**：每个问题只给出一个确定的修改方案（技术选型、具体实现方式、落地位置），不再列出多种可选路径，可直接按方案排期实施。

---

## 一、总体印象

这是一个功能相当完整的"新闻抓取 → LLM 改写 → TTS 合成 → 玩偶频道播放"全链路项目，短时间内能跑通多个子系统，工程量不小，个别模块（`radio-ai-crawler` 的校验清洗逻辑、后端的 `admin/health.py` 诊断探针、自动化配置的乐观并发控制）写得比同类模块更规范。

但当前代码整体处于**原型/demo 阶段**，存在若干**必须优先处理的安全问题**，以及大量**架构一致性、工程化缺失**问题。以下按严重程度分类给出结论与**确定的修改方案**，最后给出分阶段路线图。

**风险速览：**

| 类别 | 状态 | 说明 |
|---|---|---|
| 鉴权/权限控制 | 🔴 缺失 | 所有 Admin / Device / Internal 接口均无身份验证 |
| 密钥管理 | 🔴 不安全 | LLM/TTS API Key 明文存库，未脱敏地通过 API 下发到浏览器 `localStorage` |
| 路径穿越 / SSRF | 🔴 存在 | `freeze_channel_endpoint` 中可控路径拼接与任意 URL 抓取 |
| 自动化测试 | 🔴 完全缺失 | 全仓库零测试文件（`pytest` 却被列为生产依赖） |
| 架构一致性 | 🟠 较差 | 三套并行的"任务完成同步"机制、共享类型包未被实际引用、TTS 合成逻辑重复两份 |
| 数据层设计 | 🟠 一般 | 全局互斥锁抵消 SQLite WAL 并发能力、无迁移框架、种子数据硬编码进代码 |
| 前端架构 | 🟠 一般 | 新旧目录结构并存（`components/data` vs `features/shared`）、2387 行超级组件、Mock 数据混入生产 store |
| CI/CD | 🟡 缺失 | 无 `.github/workflows`，部署靠一个前台阻塞的 shell 脚本 |

---

## 二、🔴 严重问题（下一次迭代前必须修复）

### 2.1 全系统无鉴权、无权限边界

`radio-ai-backend-service` 的所有路由——`admin/routes.py`、`device/routes.py`、`internal_router.py`——**没有任何身份验证**。`app_factory.py` 中 CORS 还同时开启了 `allow_origins=["*"]` 与 `allow_credentials=True`（浏览器规范下二者本不该共存）。

**确定方案（三类接口分别处理，均需在阶段一落地）：**

1. **Admin Console 接口**（`/api/v1/admin/*`、`/api/v1/radio-ai/*` 中非 device 的部分）：新增 `admin_users` 表（`username`、`password_hash` 用 `bcrypt`），实现登录接口签发 Session Cookie（`HttpOnly` + `Secure` + `SameSite=Lax`，服务端用签名 token，例如 `itsdangerous` 生成，有效期 8 小时）。所有 Admin 路由统一加 FastAPI 依赖 `Depends(require_admin_session)`，未登录返回 401。前端 `shared/api/client.ts` 的 `requestJson` 在收到 401 时统一跳转登录页。
2. **Device 网关**（`/api/v1/device/*`、`/ws/v1/device/theater/*`）：新增 `devices` 表（`device_sn`、`token_hash`、`doll_id`、`status`），设备出厂/绑定时由 Admin 后台生成一次性 Token 写入设备固件配置。所有 `/api/v1/device/*` 接口要求请求头 `X-Device-Token`，通过 FastAPI 依赖 `require_device_token` 校验哈希匹配且状态为已启用。WebSocket 剧场接口在 `JOIN_ROOM` 消息里必须携带同样的 `token` 字段，服务端校验通过后才 `accept()` 连接、才允许以该 `doll_id` 广播，校验失败直接关闭连接（不再信任客户端自报的 `doll_id`）。
3. **Internal 回调接口**（`/api/v1/internal/*`）：新增环境变量 `INTERNAL_API_SECRET`，Celery worker 与后端共用同一份 `.env`。所有 `internal_router` 路由加依赖 `require_internal_secret`，校验请求头 `X-Internal-Secret` 与环境变量用 `hmac.compare_digest` 做常量时间比较，不匹配返回 403。`radio-ai-crawler/tasks.py` 与 `radio-ai-tts/app/tasks.py` 里发起回调的 `httpx.Client` 统一加上这个请求头。
4. **CORS**：新增环境变量 `ADMIN_ALLOWED_ORIGINS`（逗号分隔的域名列表，本地开发默认 `http://localhost:5173`），`CORSMiddleware` 的 `allow_origins` 从该变量读取，不再使用 `"*"`。

### 2.2 LLM/TTS 密钥管理不当（明文存储 + 未脱敏下发）

`dashscope_api_key` 明文存入 SQLite，`GET /api/v1/radio-ai/generative-config` 原样返回，前端又写进 `localStorage`；Celery 任务参数里也带着明文密钥流经 Redis。

**确定方案：**

1. `radio_ai_data/db.py::get_generative_config()` 返回给外部调用方（即经由 API 返回给前端）时，密钥统一做掩码处理，新增函数：
   ```python
   def mask_api_key(key: str) -> str:
       if not key or len(key) < 8:
           return "" if not key else "****"
       return f"{key[:3]}...{key[-4:]}"  # 例如 sk-...ab12
   ```
   `admin/routes.py::get_gen_config()` 路由层调用 `mask_api_key` 后再返回；服务内部（`create_script`/`create_audio` 等实际发起 LLM/TTS 调用的地方）继续从 `get_generative_config()` 的**内部版本**（不掩码）取真实密钥，即拆成 `get_generative_config()`（内部用，真值）和 `get_generative_config_public()`（对外用，掩码）两个函数。
2. 前端 `useApiKeyStore.ts` 删除 `loadFromStorageAndApi` 中把接口返回值写入 `localStorage` 的逻辑；"设置密钥"表单改为只写不回显（`PUT /api/v1/radio-ai/generative-config` 提交新值，成功后表单显示掩码后的返回值，不缓存真值到本地）。
3. Celery 任务签名中删除 `api_key` 参数：`crawler/tasks.py::generate_script_task`、`tts/tasks.py` 相关任务不再接收 `api_key` kwarg，worker 内部直接调用 `radio_ai_data.get_generative_config()`（内部版本）自行读取当前有效密钥。这样密钥不再经过 Celery 消息体，也就不会落入 Redis。

### 2.3 路径穿越与 SSRF 风险（`freeze_channel_endpoint`）

`admin/routes.py::freeze_channel_endpoint` 对客户端传入的 `audioUrl` 做本地路径拼接和外链下载时缺少校验，与同仓库 `radio_ai_data/storage.py::delete_audio_asset()` 已有的正确防护不一致。

**确定方案：**

1. 在 `radio_ai_data/storage.py` 中把 `delete_audio_asset()` 里已有的路径校验逻辑抽成公共函数并导出：
   ```python
   def safe_resolve_audio_path(rel_path: str) -> Path:
       if ".." in rel_path:
           raise ValueError("非法路径")
       target = (settings.audio_dir / rel_path).resolve()
       audio_dir_resolved = settings.audio_dir.resolve()
       if not str(target).startswith(str(audio_dir_resolved)):
           raise ValueError("路径超出音频目录范围")
       return target
   ```
   `admin/routes.py::freeze_channel_endpoint` 中原来直接 `(settings.audio_dir / rel_path_str).resolve()` 的写法，统一替换为调用 `safe_resolve_audio_path()`，捕获 `ValueError` 后跳过该 audio_url（走后续 TTS 兜底分支），不再直接信任客户端路径。
2. 外链下载分支增加白名单校验函数，放在 `admin/routes.py` 顶部：
   ```python
   import ipaddress, socket
   from urllib.parse import urlsplit

   def is_public_http_url(url: str) -> bool:
       parts = urlsplit(url)
       if parts.scheme not in ("http", "https") or not parts.hostname:
           return False
       try:
           ip = ipaddress.ip_address(socket.gethostbyname(parts.hostname))
       except (socket.gaierror, ValueError):
           return False
       return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved)
   ```
   下载前先调用 `is_public_http_url(audio_url)`，返回 `False` 直接跳过该分支，不发起请求。

### 2.4 零自动化测试

全仓库零测试文件，`pytest==8.4.1` 却被列在生产 `requirements.txt` 中。

**确定方案（阶段一即启动，按顺序落地，不是可选项）：**

1. 新增 `requirements-dev.txt`，把 `pytest`、`pytest-asyncio`、`httpx`（测试客户端用）从各服务的 `requirements.txt` 移入，生产 `requirements.txt` 不再包含测试依赖。
2. `radio-ai-crawler` 新增 `tests/test_zaker_fetcher.py`，覆盖 `validate_candidate`、`parse_publish_time`、`clean_summary`、`normalize_tag` 四个纯函数，要求覆盖率 100%（这几个函数决定哪些新闻进库，回归风险最高）。
3. `radio-ai-data` 新增 `tests/test_repositories.py` 与 `tests/test_db.py`，用 `tempfile` 生成的临时 SQLite 文件跑 `init_database()` + `migrate_database()` + `DollRepository`/`NewsRepository` 的增删改查。
4. `radio-ai-backend-service` 新增 `tests/test_admin_routes.py`，用 FastAPI `TestClient` 针对 2.3 的修复点写一条显式回归测试（构造 `audioUrl` 含 `../../` 的请求，断言不会读取到 `audio_dir` 之外的文件）。
5. 以上四项作为阶段一的验收标准之一，与安全修复一起提交同一批 PR。

---

## 三、🟠 重要问题（架构一致性 / 可维护性）

### 3.1 三套并行的"任务完成同步"机制，职责不清

新闻稿生成状态同步同时存在：路由里阻塞 `result.get(60)`、worker 主动 HTTP 回调、回调失败后 worker 直连数据库写库三条路径，互相冲突且跨进程无锁保护。

**确定方案：只保留"Celery 异步执行 + HTTP 回调通知状态"一种路径，其余两条全部删除。**

1. `pipeline.py::create_script` / `create_audio` 改为"提交即返回"，不再 `await asyncio.to_thread(result.get, 60)`：
   ```python
   result = celery_app.send_task("crawler.generate_script", kwargs={...})
   execute("UPDATE news SET script_status='generating', updated_at=? WHERE id=?", (utc_now(), news_id))
   return {"status": "queued", "task_id": result.id}
   ```
2. `crawler/tasks.py::generate_script_task` 中删除"HTTP 回调失败后直接 `from radio_ai_data import execute` 写库"的兜底分支（整段 `if not notified: ...` 删除）。回调改为必须成功，`httpx.Client` 加重试：
   ```python
   for attempt in range(3):
       try:
           res = client.put(callback_url, json=payload, headers={"X-Internal-Secret": INTERNAL_SECRET}, timeout=5)
           if res.status_code == 200:
               break
       except Exception:
           if attempt == 2:
               logger.error(f"回调后端失败，news_id={news_id}", exc_info=True)
           time.sleep(0.5 * (2 ** attempt))
   ```
   （worker 读取 LLM/TTS 密钥仍然经由 `radio_ai_data.get_generative_config()` 只读访问配置表，这属于"读配置"而非"绕过回调写业务状态"，予以保留，不算兜底分支。）
3. 前端 `features/news-console/hooks.ts` 中生成稿件/音频后改为轮询：调用生成接口拿到 `task_id` 后，每 2 秒 `GET /api/v1/admin/news/{news_id}` 一次，读取 `script_status`/`audio_status` 字段，状态变为 `ready` 或 `failed` 时停止轮询并刷新 UI（该接口已存在，只需前端补轮询逻辑，无需新增接口）。

### 3.2 `radio-ai-shared-spec` 名存实亡

`shared-spec` 定义为前后端共享类型契约，但前端未依赖它，各自维护重复类型定义，字段一致性全靠人工对齐。

**确定方案：保留并正式接入构建流程（不删除）。**

1. `radio-ai-admin-console/package.json` 的 `dependencies` 中新增：
   ```json
   "@radio-ai/shared-spec": "file:../radio-ai-shared-spec"
   ```
   执行一次 `npm install` 建立本地软链。
2. 删除 `src/types.ts` 与 `src/shared/types/index.ts` 中和 `radio-ai-shared-spec/types/index.ts` 重复的 `Doll`、`Channel`、`NewsClip`、`PlaylistItem`、`AudioAssetItem` 等类型定义，改为统一 `import type { Doll, Channel, ... } from '@radio-ai/shared-spec'`；`shared-spec` 里目前缺失的类型（如果前端还有未覆盖的），补充进 `radio-ai-shared-spec/types/index.ts`，不再在前端本地重复声明。
3. 后端不引入额外的代码生成工具链（Python/TS 没有原生共享类型机制，投入产出比不高），但强制要求：`repositories.py` 里返回给前端的字典字段名必须与 `shared-spec` 类型字段一一对应。落地为一条契约测试 `radio-ai-backend-service/tests/test_contract.py`：启动 `TestClient` 实际请求 `/api/v1/radio-ai/dolls` 等接口，读取返回 JSON 的顶层 key 集合，与手工维护的一份"来自 shared-spec 的字段清单"（可以是简单的 Python 常量列表，跟着 `types/index.ts` 手动同步）做差集比对，字段不一致时测试失败，作为 CI 的一部分防止后续再次跑偏。
4. 各 Python 子包（`radio-ai-data`、`radio-ai-engine`、`radio-ai-crawler`）统一用 `pip install -e ./radio-ai-xxx` 方式安装（`start_all.sh` 已经这么做），删除 `admin/routes.py`、`device/routes.py`、`internal_router.py`、`pipeline.py`、`scheduler.py` 等文件里重复的 `try: import ... except ImportError: sys.path.append(...)` 兜底代码，统一改为直接 `from radio_ai_data import ...`。

### 3.3 TTS 合成逻辑重复实现两份，且已经出现行为分叉

`radio_ai_engine/synthesizer.py` 与 `radio-ai-tts/app/synthesizer.py` 是同一逻辑的两份拷贝，且百炼失败降级等行为已经出现分叉；Provider 判定还用玩偶名字做字符串子串匹配，脆弱且业务逻辑泄漏进基础设施层。

**确定方案：`radio-ai-tts` 作为唯一的 TTS 合成实现，`radio-ai-engine` 不再自己实现合成逻辑。**

1. 删除 `radio_ai_engine/synthesizer.py` 整个文件。`radio_ai_engine` 包中原本依赖它的地方，改为通过 HTTP 调用 `radio-ai-tts` 服务的 `/api/generate` 接口（后端 `admin/routes.py`、`pipeline.py` 里已经是这么调用 TTS 服务的，做法上保持一致，不再有"直接 import 合成代码"与"HTTP 调用独立服务"两种并存方式）。`radio-ai-tts/app/synthesizer.py` 里已有的"百炼失败自动降级 Edge-TTS"逻辑作为最终保留版本。
2. Provider 判定不再用字符串子串猜测。`dolls` 与 `channels` 表已有 `tts_provider` 字段，`voice_id`/`speaker` 也已落库，调用 `synthesize()` 时一律由调用方显式传入 `tts_provider`（来自 doll/channel 配置或请求参数），`radio-ai-tts/app/synthesizer.py::synthesize()` 中删除 `elif voice.startswith("cosyvoice") or "lotso" in voice or ...` 这一段推断逻辑，`tts_provider` 为空时唯一的默认值是 `"edge"`，不再做启发式判断。

### 3.4 异步路由里做同步阻塞调用 + 数据层锁设计过度保守

`create_script`/`create_audio` 在 `async def` 路由里阻塞等待 Celery 结果（已在 3.1 移除）；`radio_ai_data/db.py` 用进程级全局 `RLock` 把所有读写串行化，抵消了 SQLite WAL 模式的并发能力，且跨进程无效。

**确定方案：**

1. 阻塞等待的移除已在 3.1 落地，此处不再重复。
2. `radio_ai_data/db.py` 删除模块级 `_LOCK = RLock()` 以及 `fetch_one`/`fetch_all`/`execute` 中的 `with _LOCK`。改为在 `connection()` 里对每个新连接设置一次 `busy_timeout`：
   ```python
   db = sqlite3.connect(settings.database_path, timeout=30)
   db.row_factory = sqlite3.Row
   db.execute("PRAGMA busy_timeout=5000")
   ```
   `PRAGMA journal_mode=WAL` 只在 `init_database()` 里执行一次（它是数据库文件级别的持久设置，不需要每次连接都重复设置），从 `connection()` 的每次调用中移除。SQLite 自身的锁机制加上 `busy_timeout` 足以正确处理多读单写并发，不再需要应用层的 Python 锁。
3. 明确不迁移 PostgreSQL，作为一条架构决策记录（建议落一份 `docs/ADR-001-database-choice.md`）：当前单机部署、数据量小，SQLite + WAL + `busy_timeout` 足够。触发重新评估的量化条件写死在 ADR 里——`news` 表超过 50 万行，或需要多实例横向扩展部署（不再是单机 `start_all.sh` 的部署方式）——达到任一条件时启动 PostgreSQL 迁移，在此之前不再讨论这个问题。

### 3.5 无 Schema 迁移框架，种子业务数据硬编码进代码

手写 `ALTER TABLE IF NOT EXISTS` 式"迁移"无版本号无法回滚；4 个默认玩偶的完整人设/播单数据硬编码在 `seed_default_dolls()` 里，属于业务数据混进代码仓库。

**确定方案：**

1. 引入 [Alembic](https://alembic.sqlalchemy.org/)：`radio-ai-data` 新增 `alembic/` 目录与 `alembic.ini`，把 `migrate_database()` 里现有的每条 `ALTER TABLE` 语句转成一个 Alembic revision 文件，建立版本链；后续所有 schema 变更必须通过 `alembic revision` 生成新文件，不再手写 `if col not in cols` 判断。`init_database()` 里调用改为 `alembic upgrade head`（通过 `alembic.command.upgrade` 编程调用，不依赖命令行）。
2. 新增目录 `radio-ai-data/seeds/dolls/*.json`，每个默认玩偶一个 JSON 文件（`lotso.json`、`shin.json`、`maruko.json`、`woody.json`），内容就是现在 `seed_default_dolls()` 里的字面量数据搬过去。`seed_default_dolls()` 改为读取该目录下所有 `*.json` 文件并写入数据库，函数本身只保留"如何导入"的逻辑，不再包含任何具体文案。运营后续改文案只需改 JSON 文件，不需要走代码发布。

### 3.6 后端路由文件职责过重

`freeze_channel_endpoint` 一个函数约 150 行，混杂五种职责；`AudioRequest`、`ChannelCopyRequest` 在两个文件里各自重复定义。

**确定方案：**

1. 新建 `radio-ai-backend-service/app/services/channel_freeze_service.py`，把 `freeze_channel_endpoint` 里的业务逻辑（文件拷贝、外链下载、Base64 解码、TTS 兜底、manifest 生成、落库）整体搬过去，拆成 `resolve_playlist_item_audio()`（处理单条播单项的音频来源判定，对应原来的第 1-5 步）与 `freeze_channel()`（编排整体流程并落库）两个函数。`admin/routes.py::freeze_channel_endpoint` 只保留参数解析 + 调用 `channel_freeze_service.freeze_channel(...)` + 返回结果，函数体控制在 15 行以内。
2. `AudioRequest`、`ChannelCopyRequest`（以及其余请求体模型）统一移入 `radio-ai-backend-service/app/schemas.py`，`app_factory.py` 与 `admin/routes.py` 都从这一个文件导入，删除各自的重复定义，字段以 `admin/routes.py` 里更完整的版本为准。

---

## 四、🟡 一般问题（代码质量与规范）— 确定处理方式

1. **日志体系不统一**：`radio-ai-backend-service`、`radio-ai-tts`、`radio-ai-crawler` 三个服务统一改用 Python 标准库 `logging`，删除所有 `print()` 调用。新增公共 `logging_config.py`（可放进 `radio_ai_data` 包，三个服务都依赖它），配置一个输出 JSON 的 `Formatter`（字段固定为 `timestamp`、`level`、`service`、`message`，异常信息放 `exc_info`），各服务启动时调用 `configure_logging(service_name="backend")`。`crawler/tasks.py` 里所有 `except Exception: pass` 改为至少 `logger.warning(..., exc_info=True)`。不引入 ELK/Loki 等外部日志系统（当前量级不需要），触发条件同样写进 ADR：单机日志量超过每日 1GB 或需要跨机器聚合查询时再引入。
2. **日志查询接口脆弱**：`GET /api/v1/admin/logs` 的关键字猜测日志级别的方式，随上一条改为 JSON 日志后自然失效——改为直接解析每行 JSON 并读取其中的 `level` 字段，不再用字符串包含关键字判断。
3. **日志条目 ID 不稳定**：`hash(line_str)` 替换为 `f"{src}-{line_number}"`（文件内的物理行号，读取同一份日志文件是稳定的，不依赖进程级随机盐）。
4. **前端 TypeScript 未开启 `strict`**：`tsconfig.json` 增加 `"strict": true`，同批修复由此暴露的类型错误（预计集中在 `data: any` 类的请求/响应处理代码，与 3.2 的 `shared-spec` 类型接入一起做）。
5. **新旧目录结构并存**：以 `src/features/` + `src/shared/` 为准，`src/components/`、`src/data/`、旧的 `src/utils/audioSynth.ts`、`src/api/newsCenter.ts` 等逐个迁移合并进 `features/*` 对应目录；确认无引用后删除 `src/shared/components/ThemeSelector.tsx`、`src/shared/utils/audioSynth.ts` 这两个已确认未被引用的死文件（立即可删，不依赖迁移完成）。
6. **Mock 数据混入生产 store**：`src/data/mockData.ts` 只允许在开发环境（`import.meta.env.DEV === true`）下作为兜底数据被 `features/*/store.ts` 使用；生产构建下各 store 的初始状态一律为空数组/空对象，由接口请求真实数据填充，不再以假数据作为生产环境兜底。
7. **超级组件拆分**：`ChannelStudioView.tsx`（2387 行）按现有的隐含职责拆成 `ChannelStudioView/index.tsx`（页面壳 + 布局）、`PlaylistEditor.tsx`（播单编排）、`AudioNodeGenerator.tsx`（TTS 节点生成）、`ResourceFreezePanel.tsx`（固化面板）四个文件，数据请求逻辑迁入 `features/channel-studio/hooks.ts`（新建）。`ChannelsView.tsx`、`AudioAssetsView.tsx` 按同样模式（页面壳 + 列表 + 编辑弹窗拆分）处理。
8. **硬编码内部服务地址**：`app/config.py::Settings` 新增字段 `tts_service_url: str = os.getenv("RADIO_AI_TTS_SERVICE_URL", "http://127.0.0.1:8018")`，`admin/routes.py`、`pipeline.py` 中所有 `"http://127.0.0.1:8018/api/generate"` 替换为 `f"{settings.tts_service_url}/api/generate"`。
9. **头像上传缺少校验**：`DollRepository.save_avatar` 增加两项校验后再落盘：① 用 `Pillow` 的 `Image.open(io.BytesIO(img_bytes)).verify()` 校验确实是合法图片，非法直接抛 `ValueError`；② 限制解码后字节数不超过 5MB。写入路径的 4 层 `.parent` 硬编码改为从 `app/config.py::Settings` 读取显式配置的 `frontend_public_avatar_dir` 路径（本地单机部署时指向 `radio-ai-admin-console/public/avatars`，容器化部署时可配置为空以跳过这一步——即该步骤变为可选的"本地开发便利性写入"，不作为服务正常运行的必需路径，`assets_dir`/`public_dir` 写入操作用 `try/except` 包裹且失败只记录日志，不影响接口返回结果）。
10. **依赖管理**：`pytest` 移出生产 `requirements.txt`（见 2.4）；`radio-ai-admin-console` 新增 `.eslintrc.cjs`，采用 `@typescript-eslint` 推荐规则集 + `eslint-plugin-react-hooks`，`package.json` 的 `lint` 脚本改为 `"lint": "eslint src --ext .ts,.tsx && tsc --noEmit"`。

---

## 五、👍 值得肯定的地方（无需改动，可作为其他模块参考标准）

- **`radio_ai_crawler/zaker_fetcher.py`**：`dataclass` 建模、指数退避重试、多层校验（标题长度、URL scheme、发布时间窗口、正文有效字符密度）写得很扎实，是全仓库质量最高的模块。
- **`admin/health.py` 的诊断探针体系**：把爬虫/LLM/TTS/数据库拆成独立 `probe_*` 函数，统一用 Pydantic 模型描述"健康度评分 + 根因 + 可执行修复建议"，思路清晰。
- **自动化调度的乐观并发控制**：`scheduler.py` 的配置更新用 `expected_version` 做乐观锁（版本冲突返回 409），是这套系统里少见的、认真考虑了并发写冲突的设计。
- **`.gitignore` 对密钥/音频大文件的排除比较到位**：审查过程中未在仓库历史里发现真实泄露的 API Key，运行期密钥流转的问题已在 2.2 给出确定修复方案。

---

## 六、优化路线图（按序执行，每阶段有明确验收标准）

### 阶段一：安全止血（1 个迭代内，验收标准=下方全部打勾）
- [ ] 落地 2.1 的三类鉴权方案（Admin Session、Device Token、Internal Secret）+ CORS 白名单
- [ ] 落地 2.2 密钥掩码返回 + 前端不落 `localStorage` + Celery 任务参数移除 `api_key`
- [ ] 落地 2.3 `safe_resolve_audio_path` + 外链白名单校验，替换 `freeze_channel_endpoint` 中的不安全写法
- [ ] 落地 2.4 的四项测试（crawler 纯函数 100% 覆盖、data 层 CRUD/迁移测试、backend 路径穿越回归测试、测试依赖迁出生产 requirements）

### 阶段二：架构收敛（1-2 个迭代）
- [ ] 落地 3.1：`pipeline.py` 改为提交即返回，`crawler/tasks.py` 删除直连数据库兜底分支，回调加重试，前端补轮询
- [ ] 落地 3.2：前端接入 `@radio-ai/shared-spec` 作为唯一类型来源，删除重复类型定义，新增契约测试
- [ ] 落地 3.3：删除 `radio_ai_engine/synthesizer.py`，统一走 `radio-ai-tts` HTTP 接口，Provider 判定改为显式传参
- [ ] 落地 3.4：数据层删除全局 `RLock`，改用 `busy_timeout`；输出 `docs/ADR-001-database-choice.md` 明确不迁移 PostgreSQL 及触发条件
- [ ] 落地 3.5：引入 Alembic，种子数据迁出为 `seeds/dolls/*.json`
- [ ] 落地 3.6：`freeze_channel_endpoint` 拆分到 `channel_freeze_service.py`，请求体模型合并到 `schemas.py`

### 阶段三：工程化补课（与阶段二并行持续推进）
- [ ] 接入 CI（GitHub Actions）：跑 `pytest` + `ruff`（Python）+ `eslint`/`tsc --noEmit`（前端），四个 Python 子服务与前端各一个 job
- [ ] 落地第四节第 1-3 条：统一 JSON 结构化日志、日志查询接口改读 JSON、日志 ID 改用行号
- [ ] 落地第四节第 4-7 条：`tsconfig.json` 开启 `strict`、完成新旧目录结构迁移并删除死文件、Mock 数据仅限开发环境、拆分超级组件
- [ ] 落地第四节第 8-10 条：TTS 服务地址配置化、头像上传增加校验、接入 ESLint

### 阶段四：部署与运维（阶段一二三完成后启动）
- [ ] 把 `start_all.sh` 的编排逻辑迁移为 `docker-compose.yml`：每个 `radio-ai-*` 服务一个容器，Redis 一个容器，通过 `depends_on` + healthcheck 控制启动顺序，替代当前"前台阻塞 + `sleep 1` 硬等"的方式；`.env` 通过 compose 的 `env_file` 统一注入，不再依赖每个子服务各自 `load_dotenv`。
- [ ] Alembic 迁移作为容器启动的前置步骤（`docker-compose` 中的一个一次性 `migrate` 服务），确保容器化部署下 schema 变更可控。

---

*说明：本次审查基于对源码的静态阅读，未启动服务进行动态验证（如实际发起路径穿越请求验证漏洞可利用性）。上述方案中的表名/字段名/文件路径为建议命名，实施时如与团队现有命名规范冲突可等价替换，但方案本身（技术选型、职责划分、落地位置）按此执行，不再需要额外决策。*

# 登录注册与用户级数据持久化实施计划

## 目标

在保留匿名使用能力的前提下，新增可选登录注册模块。匿名用户继续使用 `x-anonymous-session-id` 作为 `owner_type=anonymous` 的数据归属；登录用户使用账号会话作为 `owner_type=user` 的数据归属，避免不同用户读取到同一份匿名默认数据。用户从匿名状态注册或登录后，可以将当前匿名数据导入账号，避免关闭网页或切换设备后丢失个人数据。

## 核心设计

1. 后端新增认证能力：
   - `users` 表补充 `password_hash`、`password_salt`、`last_login_at` 等字段。
   - 使用 Node `crypto.scrypt` 做密码哈希，不新增第三方密码依赖。
   - 使用随机 session token，数据库仅保存 token hash。
   - 新增 `/api/v1/auth/register`、`/api/v1/auth/login`、`/api/v1/auth/me`、`/api/v1/auth/logout`。

2. 请求归属解析：
   - 如果请求带有效 `Authorization: Bearer <token>`，使用 `{ ownerType: 'user', ownerId: user.id }`。
   - 否则使用匿名 header `x-anonymous-session-id`，使用 `{ ownerType: 'anonymous', ownerId: anonymousSessionId }`。
   - 所有历史查询与持久化接口统一走 owner 上下文，去掉 repository 中硬编码的匿名 owner。

3. 匿名数据迁移：
   - 注册或登录时，客户端可传当前匿名 session id。
   - 后端提供迁移服务，将该匿名 owner 下的数据复制/合并到登录用户 owner 下。
   - flashcards 使用现有唯一键合并；其它历史类数据复制并重新生成 id。

4. 前端体验：
   - 保留原有匿名 session 生成逻辑。
   - 新增 auth token 与当前用户本地存储。
   - API 客户端自动同时发送匿名 header 和登录 token。
   - 导航栏增加登录入口与当前账号状态；登录/注册为可选，不阻断核心功能。
   - 登录成功后刷新各模块历史数据时自动读取账号数据。

5. 测试与提交节奏：
   - 每一小步完成后运行针对性测试。
   - 测试通过后执行 git commit。
   - 出现问题仅通过 git 回滚，避免手动破坏既有变更。

## 落地步骤

1. 计划文档
   - 新建本文件，明确设计、阶段和验证方式。
   - 自检：确认文件存在且 git diff 仅包含计划文件。
   - 提交：`docs: add auth persistence plan`。

2. 数据库迁移
   - 新增迁移文件为 `users` 增加密码字段、登录时间字段和必要索引。
   - 更新迁移测试，校验新字段与迁移数量。
   - 自检：运行 server 迁移相关测试。
   - 提交：`db: add auth credential migration`。

3. 后端认证基础设施
   - 新增 password/session token 工具。
   - 新增 auth repository，负责用户注册、登录验证、session 创建、session 查询、注销。
   - 新增 auth router。
   - 自检：新增 auth route 测试并运行。
   - 提交：`server: add optional auth endpoints`。

4. Owner 上下文改造
   - 新增请求 owner 解析工具。
   - repository 方法参数从裸 owner id 改为 `{ ownerType, ownerId }`。
   - flashcards、sentence、reading、quiz、report、migration 路由统一使用 owner 上下文。
   - 自检：运行现有 route/repository 测试，补充匿名隔离与登录隔离测试。
   - 提交：`server: scope persisted data by authenticated owner`。

5. 匿名数据导入账号
   - 新增 repository 迁移方法，将匿名 owner 数据合并到 user owner。
   - 注册/登录接口支持 `anonymousSessionId` 和 `importAnonymousData`。
   - 自检：测试匿名数据登录后可导入，且不同用户互不读取。
   - 提交：`server: import anonymous data into accounts`。

6. 前端认证状态与 API Header
   - 新增 auth storage/session helper。
   - API 请求自动附带 Bearer token，同时继续发送匿名 session id。
   - 新增 auth API 方法。
   - 自检：运行 client API/session 单测。
   - 提交：`client: persist auth session and request headers`。

7. 登录注册 UI
   - 在导航栏增加账号入口。
   - 新增登录/注册弹窗或面板，默认不打扰匿名使用。
   - 登录/注册成功后显示用户状态与退出入口。
   - 自检：运行 client build/lint，手动检查关键交互。
   - 提交：`client: add optional login and register UI`。

8. 全量验证
   - 运行 server 测试、client 测试、client build。
   - 检查 git status 与提交历史。
   - 如需要，启动本地服务给出访问地址。

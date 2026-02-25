# 会话令牌流转设计（P3-02）

Date: 2026-02-25  
Owner: Codex

## 1. 目标
- 建立匿名会话与登录会话的统一令牌流转模型。
- 定义创建、刷新、失效、恢复闭环。
- 约定前后端传递方式，为后续接口与存储迁移提供实现基线。

## 2. 令牌与标识定义

### 2.1 匿名态标识（当前已存在）
- `x-anonymous-session-id`（header）
  - 来源：`localStorage['anonymous-session-id']`
  - 生命周期：直到用户清空本地数据或重置
  - 用途：匿名数据隔离、迁移归并上下文

### 2.2 登录态令牌（规划）
- `access_token`（短期）
  - 格式：JWT（建议 15 分钟有效）
  - 传递：`Authorization: Bearer <access_token>`
  - 存储：前端内存（可选 sessionStorage 兜底）
- `refresh_token`（长期）
  - 格式：不可预测随机串（建议 14 天有效）
  - 传递：HttpOnly + Secure + SameSite=Lax Cookie
  - 存储：仅服务端可见（前端 JS 不可读）
- `x-device-id`（可选增强）
  - 用于多端会话管理、风控和设备级撤销

## 3. 接口契约（建议）
- `POST /api/v1/session/bootstrap`
  - 作用：首次访问/打开应用时建立匿名上下文并返回会话状态
- `POST /api/v1/session/login`
  - 作用：登录并签发 access/refresh；接收匿名 ID 以触发数据迁移
- `POST /api/v1/session/refresh`
  - 作用：access 过期后用 refresh 续期
- `POST /api/v1/session/logout`
  - 作用：撤销 refresh，清理服务端会话映射
- `GET /api/v1/session/me`
  - 作用：前端恢复时查询当前会话状态（anonymous/authenticated）

## 4. 前后端传递约定
- 匿名请求（未登录）
  - Header: `x-anonymous-session-id`
- 登录请求
  - Header: `Authorization`, `x-anonymous-session-id`（迁移期可保留）
  - Cookie: `refresh_token`（自动带上，不由 JS 拼装）
- 统一响应字段（建议）
  - `sessionState`: `anonymous | authenticated | expired`
  - `accessTokenExpiresAt`: ISO 时间戳
  - `needsRelogin`: 布尔值

## 5. 生命周期闭环

### 5.1 创建
1. 首次访问：前端生成/读取 `anonymous-session-id`。  
2. 调用 `session/bootstrap` 获取服务端会话态。  
3. 未登录继续匿名；已登录恢复用户态。

### 5.2 刷新
1. 前端在 access token 过期前 2 分钟尝试静默刷新。  
2. 调用 `session/refresh`，成功后替换 access token 与过期时间。  
3. 失败时按错误类型分流：
   - 可重试网络错误：指数退避重试
   - refresh 无效：转失效路径

### 5.3 失效
- 触发条件：refresh 过期、服务端撤销、密码变更后全局登出等。
- 行为：
  - 前端清空 access token 内存态
  - 标记 `sessionState=expired`
  - 保留 `anonymous-session-id` 作为匿名回退与迁移上下文

### 5.4 恢复
- 刷新页面时：
  - 先调用 `session/me` 判定状态
  - `authenticated`：继续用户态
  - `expired`：提示登录
  - `anonymous`：保持匿名学习

## 6. 三类场景复现脚本（验收对应）

### 场景 A：首次访问
1. 清空浏览器 localStorage/cookie。  
2. 打开应用，观察生成 `anonymous-session-id`。  
3. `session/bootstrap` 返回 `sessionState=anonymous`。

### 场景 B：刷新恢复
1. 保持匿名或登录态，刷新页面。  
2. 验证 `anonymous-session-id` 不变。  
3. `session/me` 返回与刷新前一致状态。

### 场景 C：令牌失效
1. 人为让 access/refresh 过期（或服务端撤销 refresh）。  
2. 发起受保护请求，收到 `needsRelogin=true`。  
3. 前端进入“会话过期”提示并保留匿名回退能力。

## 7. 安全与实现约束
- access token 不落 localStorage，降低 XSS 持久窃取风险。
- refresh token 必须 HttpOnly，禁止前端脚本访问。
- 迁移期允许同时传 `Authorization + x-anonymous-session-id`，用于匿名数据并入用户空间。
- 服务端日志中禁止输出原始 token；仅记录哈希或截断 ID。

## 8. 对后续步骤输入
- P3-03（数据库模型）需包含：
  - session 表（refresh 生命周期）
  - owner 映射（anonymous/user）
- P3-04/P3-08 需基于本文双写与恢复规则落地迁移流程。

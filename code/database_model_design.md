# 数据库模型设计（P3-03）

Date: 2026-02-25  
Owner: Codex

## 1. 设计目标
- 覆盖五大模块（闪卡、句子、阅读、测验、成就）核心读写场景。
- 支持匿名会话与登录用户双轨归属。
- 为后续迁移、双写、跨端同步提供稳定主键与索引策略。

## 2. 技术假设
- 主存储：PostgreSQL 15+
- 时间字段统一使用 `timestamptz`
- 主键统一 `uuid`
- 文本检索优先 B-Tree + trigram（必要时）

## 3. 归属模型（跨表统一）
- 字段：`owner_type` + `owner_id`
  - `owner_type`: `anonymous | user`
  - `owner_id`: 匿名会话 ID 或用户 ID
- 索引基线：`(owner_type, owner_id, updated_at desc)`
- 作用：在登录迁移期保持同一查询接口，无需分叉 SQL。

## 4. 核心表结构

### 4.1 用户与会话
- `users`
  - `id`, `email`, `display_name`, `status`, `created_at`, `updated_at`
  - 索引：`unique(email)`
- `sessions`
  - `id`, `user_id`, `device_id`, `refresh_token_hash`, `expires_at`, `revoked_at`, `created_at`, `last_seen_at`
  - 索引：
    - `idx_sessions_user_last_seen (user_id, last_seen_at desc)`
    - `idx_sessions_token_hash (refresh_token_hash)`
    - `idx_sessions_active (user_id, revoked_at, expires_at)`

### 4.2 闪卡模块
- `flashcards`
  - `id`, `owner_type`, `owner_id`, `word`, `phonetic`, `definition`, `etymology`, `example`, `example_translation`, `learning_status`, `accuracy`, `review_count`, `next_review_at`, `source_text_hash`, `created_at`, `updated_at`
  - 约束：`unique(owner_type, owner_id, word)`
  - 索引：
    - `idx_flashcards_owner_review (owner_type, owner_id, next_review_at asc)`
    - `idx_flashcards_owner_status (owner_type, owner_id, learning_status, updated_at desc)`
- `flashcard_sessions`
  - `id`, `owner_type`, `owner_id`, `extracted_count`, `studied_count`, `correct_count`, `incorrect_count`, `accuracy`, `due_count`, `started_at`, `ended_at`, `created_at`, `updated_at`
  - 索引：`idx_flashcard_sessions_owner_time (owner_type, owner_id, started_at desc)`

### 4.3 句子分析模块
- `sentence_analyses`
  - `id`, `owner_type`, `owner_id`, `sentence_text`, `analysis_json`, `grammar_tags`, `created_at`, `updated_at`
  - 索引：
    - `idx_sentence_owner_time (owner_type, owner_id, created_at desc)`
    - `idx_sentence_tags_gin (grammar_tags)`
- `sentence_notes`
  - `id`, `owner_type`, `owner_id`, `analysis_id`, `note_text`, `created_at`
  - 索引：`idx_sentence_notes_owner_time (owner_type, owner_id, created_at desc)`

### 4.4 阅读模块
- `reading_contents`
  - `id`, `owner_type`, `owner_id`, `title`, `english_text`, `chinese_text`, `topic`, `difficulty`, `length`, `language`, `vocabulary_json`, `created_at`, `updated_at`
  - 索引：
    - `idx_reading_owner_time (owner_type, owner_id, created_at desc)`
    - `idx_reading_owner_topic (owner_type, owner_id, topic, created_at desc)`
- `reading_favorites`
  - `id`, `owner_type`, `owner_id`, `reading_id`, `tags`, `saved_at`, `updated_at`
  - 约束：`unique(owner_type, owner_id, reading_id)`
  - 索引：
    - `idx_reading_fav_owner_saved (owner_type, owner_id, saved_at desc)`
    - `idx_reading_fav_tags_gin (tags)`

### 4.5 测验模块
- `quiz_attempts`
  - `id`, `owner_type`, `owner_id`, `quiz_type`, `difficulty`, `question_count`, `timed_mode`, `time_limit_minutes`, `time_spent_seconds`, `score`, `accuracy`, `reading_id`, `created_at`
  - 索引：
    - `idx_quiz_owner_time (owner_type, owner_id, created_at desc)`
    - `idx_quiz_owner_type (owner_type, owner_id, quiz_type, created_at desc)`
- `quiz_attempt_questions`
  - `id`, `attempt_id`, `question_index`, `question_text`, `options_json`, `correct_index`, `user_answer`, `explanation`, `is_wrong`, `created_at`
  - 约束：`unique(attempt_id, question_index)`
  - 索引：
    - `idx_quiz_questions_attempt (attempt_id, question_index)`
    - `idx_quiz_questions_wrong (attempt_id, is_wrong)`
- `wrong_question_book`
  - `id`, `owner_type`, `owner_id`, `quiz_type`, `question_fingerprint`, `question_text`, `options_json`, `correct_index`, `last_user_answer`, `wrong_reason`, `repeat_count`, `first_wrong_at`, `last_practiced_at`, `difficulty`, `created_at`, `updated_at`
  - 约束：`unique(owner_type, owner_id, quiz_type, question_fingerprint)`
  - 索引：
    - `idx_wrong_owner_type_repeat (owner_type, owner_id, quiz_type, repeat_count desc, last_practiced_at asc)`
    - `idx_wrong_owner_recent (owner_type, owner_id, updated_at desc)`

### 4.6 成就报告模块
- `learning_reports`
  - `id`, `owner_type`, `owner_id`, `template_type`, `title`, `period`, `summary`, `report_json`, `share_text`, `created_at`
  - 索引：
    - `idx_reports_owner_time (owner_type, owner_id, created_at desc)`
    - `idx_reports_owner_template (owner_type, owner_id, template_type, created_at desc)`

## 5. 核心查询场景映射
- 闪卡复习队列：
  - `flashcards` 按 `next_review_at` + `learning_status` 读取。
- 句子历史回看：
  - `sentence_analyses` 按 `created_at desc` 分页。
- 阅读收藏检索：
  - `reading_favorites` + `reading_contents`，按 tags/关键词/时间排序。
- 错题重练：
  - `wrong_question_book` 按 `repeat_count desc` + `last_practiced_at asc` 截断题量。
- 成就报告回放：
  - `learning_reports` 按 `created_at desc` 取最近 N 条并恢复模板上下文。

## 6. 归档与数据保留建议
- 细粒度题目明细（`quiz_attempt_questions`）保留 180 天后冷归档。
- 汇总层（`quiz_attempts`, `learning_reports`）长期保留。
- 匿名数据超过 90 天无活动可清理或压缩。

## 7. 验收映射（P3-03）
- [x] 五大模块均有明确主表设计。
- [x] 核心查询场景均可由索引覆盖。
- [x] 匿名与登录归属模型可共存。
- [x] 模型可直接进入迁移脚本阶段（P3-04）。

-- ===========================================
-- 添加学员考试天数和科目字段
-- ===========================================
-- 版本: V1.0.3
-- 说明: 为 students 表添加考试天数和科目字段
-- 注意: Flyway 会自动跟踪迁移历史，避免重复执行
--       H2 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS
--       如果列已存在，此脚本会失败，需要手动处理

-- 为 students 表添加考试天数字段
-- 如果列已存在，此语句会失败，需要检查 flyway_schema_history 表
ALTER TABLE students ADD COLUMN exam_days INTEGER DEFAULT 2;

-- 为 students 表添加第一天考试科目字段（JSON格式存储）
ALTER TABLE students ADD COLUMN day1_subjects VARCHAR(200);

-- 为 students 表添加第二天考试科目字段（JSON格式存储）
ALTER TABLE students ADD COLUMN day2_subjects VARCHAR(200);


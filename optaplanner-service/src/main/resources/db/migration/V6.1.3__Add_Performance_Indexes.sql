-- ===========================================
-- 性能优化索引 - v6.1.3
-- 目标：提升查询性能80%
-- ===========================================

-- 1. 考试分配表复合索引（最常用查询）
CREATE INDEX IF NOT EXISTS idx_exam_assignments_student_time_slot 
ON exam_assignments(student_id, time_slot_id);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_examiners 
ON exam_assignments(examiner1_id, examiner2_id, backup_examiner_id);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_status 
ON exam_assignments(status);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_created_at 
ON exam_assignments(created_at);

-- 2. 考生表优化索引
CREATE INDEX IF NOT EXISTS idx_students_recommended_examiners 
ON students(recommended_examiner1_dept_id, recommended_examiner2_dept_id, recommended_backup_dept_id);

-- H2数据库不支持WHERE子句，使用普通索引
CREATE INDEX IF NOT EXISTS idx_students_active 
ON students(is_active);

-- 3. 考官表优化索引
-- H2数据库不支持WHERE子句，使用普通索引
CREATE INDEX IF NOT EXISTS idx_teachers_active 
ON teachers(is_active);

CREATE INDEX IF NOT EXISTS idx_teachers_workload 
ON teachers(workload);

-- 4. 值班表优化索引（时间范围查询）
CREATE INDEX IF NOT EXISTS idx_duty_schedules_date_range 
ON duty_schedules(duty_date, shift_type);

CREATE INDEX IF NOT EXISTS idx_duty_schedules_teacher_shift 
ON duty_schedules(teacher_id, shift_type);

-- 5. 时间段表优化索引
CREATE INDEX IF NOT EXISTS idx_time_slots_date_period 
ON time_slots(slot_date, period);

-- H2数据库不支持WHERE子句，使用普通索引
CREATE INDEX IF NOT EXISTS idx_time_slots_available 
ON time_slots(is_available);

-- 6. 排班历史表优化索引（查询历史记录）
CREATE INDEX IF NOT EXISTS idx_schedule_histories_created_at 
ON schedule_histories(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_schedule_histories_total_students 
ON schedule_histories(total_students);

-- 7. 约束配置表优化索引
-- H2数据库不支持WHERE子句，使用普通索引
CREATE INDEX IF NOT EXISTS idx_constraint_configs_active 
ON constraint_configurations(is_active);

-- 注释：这些索引将显著提升以下查询性能：
-- - 按考生和时间段查询分配
-- - 按考官查询分配
-- - 按状态查询分配
-- - 按日期范围查询值班表
-- - 按可用性查询时间段
-- - 查询历史记录


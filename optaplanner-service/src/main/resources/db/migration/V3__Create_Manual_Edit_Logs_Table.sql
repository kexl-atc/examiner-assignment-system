-- 创建人工修改日志表
CREATE TABLE IF NOT EXISTS manual_edit_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- 基本信息
    edited_at TIMESTAMP NOT NULL,
    edited_by VARCHAR(100),
    
    -- 上下文信息
    student_name VARCHAR(100),
    department VARCHAR(50),
    exam_date DATE,
    field_name VARCHAR(50),
    time_slot VARCHAR(10),
    
    -- 修改内容
    original_value VARCHAR(100),
    new_value VARCHAR(100),
    was_recommended BOOLEAN,
    recommendation_rank INTEGER,
    recommendation_score DOUBLE PRECISION,
    
    -- 修改原因
    reason_category VARCHAR(100),
    reason_detail TEXT,
    
    -- 冲突信息
    had_conflicts BOOLEAN,
    conflicts_json TEXT,
    is_forced BOOLEAN,
    
    -- 结果评估
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    feedback TEXT,
    hard_violations INTEGER,
    soft_violations INTEGER,
    
    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_manual_edit_logs_edited_at ON manual_edit_logs(edited_at);
CREATE INDEX idx_manual_edit_logs_department ON manual_edit_logs(department);
CREATE INDEX idx_manual_edit_logs_field_name ON manual_edit_logs(field_name);
CREATE INDEX idx_manual_edit_logs_new_value ON manual_edit_logs(new_value);
CREATE INDEX idx_manual_edit_logs_reason_category ON manual_edit_logs(reason_category);
CREATE INDEX idx_manual_edit_logs_was_recommended ON manual_edit_logs(was_recommended);
CREATE INDEX idx_manual_edit_logs_is_forced ON manual_edit_logs(is_forced);

-- 添加注释
COMMENT ON TABLE manual_edit_logs IS '人工修改日志表，用于记录用户的每次手动修改以便系统学习';
COMMENT ON COLUMN manual_edit_logs.edited_at IS '修改时间';
COMMENT ON COLUMN manual_edit_logs.edited_by IS '修改人';
COMMENT ON COLUMN manual_edit_logs.student_name IS '学员姓名';
COMMENT ON COLUMN manual_edit_logs.department IS '科室';
COMMENT ON COLUMN manual_edit_logs.field_name IS '字段名称(examiner1_1等)';
COMMENT ON COLUMN manual_edit_logs.original_value IS '原始值';
COMMENT ON COLUMN manual_edit_logs.new_value IS '新值';
COMMENT ON COLUMN manual_edit_logs.was_recommended IS '是否来自推荐';
COMMENT ON COLUMN manual_edit_logs.reason_category IS '修改原因分类';
COMMENT ON COLUMN manual_edit_logs.is_forced IS '是否强制修改(有冲突仍修改)';


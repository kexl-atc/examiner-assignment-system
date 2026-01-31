-- ===========================================
-- 考试调度系统 - 基础表结构
-- ===========================================

-- 科室表
CREATE TABLE departments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 班组表
CREATE TABLE groups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 考官表
CREATE TABLE teachers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    teacher_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department_id BIGINT NOT NULL,
    group_id BIGINT,
    workload INTEGER DEFAULT 0,
    consecutive_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- 学员表
CREATE TABLE students (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    recommended_examiner1_dept_id BIGINT,
    recommended_examiner2_dept_id BIGINT,
    recommended_backup_dept_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (recommended_examiner1_dept_id) REFERENCES departments(id),
    FOREIGN KEY (recommended_examiner2_dept_id) REFERENCES departments(id),
    FOREIGN KEY (recommended_backup_dept_id) REFERENCES departments(id)
);

-- 值班表
CREATE TABLE duty_schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    teacher_id BIGINT NOT NULL,
    duty_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL, -- 'DAY', 'NIGHT', 'OFF'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    UNIQUE(teacher_id, duty_date)
);

-- 时间段表
CREATE TABLE time_slots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    slot_date DATE NOT NULL,
    time_range VARCHAR(20) NOT NULL, -- '08:00-12:00', '14:00-18:00'
    period VARCHAR(10) NOT NULL, -- '上午', '下午'
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_date, time_range)
);

-- 考试分配表
CREATE TABLE exam_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    time_slot_id BIGINT,
    examiner1_id BIGINT,
    examiner2_id BIGINT,
    backup_examiner_id BIGINT,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id),
    FOREIGN KEY (examiner1_id) REFERENCES teachers(id),
    FOREIGN KEY (examiner2_id) REFERENCES teachers(id),
    FOREIGN KEY (backup_examiner_id) REFERENCES teachers(id)
);

-- 约束配置表
CREATE TABLE constraint_configurations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL UNIQUE,
    config_data CLOB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 排班历史表
CREATE TABLE schedule_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    schedule_name VARCHAR(200),
    total_students INTEGER,
    total_assignments INTEGER,
    complete_assignments INTEGER,
    score_hard INTEGER,
    score_soft INTEGER,
    constraint_config_id BIGINT,
    schedule_data CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (constraint_config_id) REFERENCES constraint_configurations(id)
);

-- 创建索引
CREATE INDEX idx_teachers_department ON teachers(department_id);
CREATE INDEX idx_teachers_group ON teachers(group_id);
CREATE INDEX idx_students_department ON students(department_id);
CREATE INDEX idx_students_group ON students(group_id);
CREATE INDEX idx_duty_schedules_teacher_date ON duty_schedules(teacher_id, duty_date);
CREATE INDEX idx_time_slots_date ON time_slots(slot_date);
CREATE INDEX idx_exam_assignments_student ON exam_assignments(student_id);
CREATE INDEX idx_exam_assignments_time_slot ON exam_assignments(time_slot_id);
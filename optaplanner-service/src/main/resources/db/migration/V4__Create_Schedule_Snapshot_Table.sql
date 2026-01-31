-- 创建Hibernate序列（用于PanacheEntity的ID生成）
-- 必须在创建表之前创建序列
CREATE SEQUENCE IF NOT EXISTS HIBERNATE_SEQUENCE START WITH 1 INCREMENT BY 1;

-- 创建排班快照表
CREATE TABLE IF NOT EXISTS schedule_snapshot (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    schedule_data CLOB,
    metadata CLOB,
    total_students INT,
    total_teachers INT,
    start_date VARCHAR(20),
    end_date VARCHAR(20),
    manual_edit_count INT DEFAULT 0,
    auto_assigned_count INT DEFAULT 0,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_name ON schedule_snapshot(name);
CREATE INDEX IF NOT EXISTS idx_snapshot_created_at ON schedule_snapshot(created_at);
CREATE INDEX IF NOT EXISTS idx_snapshot_date_range ON schedule_snapshot(start_date, end_date);


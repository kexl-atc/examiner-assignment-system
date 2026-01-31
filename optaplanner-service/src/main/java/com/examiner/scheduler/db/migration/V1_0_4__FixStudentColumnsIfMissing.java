package com.examiner.scheduler.db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Set;

/**
 * 修复学员表列（如果缺失）
 * 版本: V1.0.4
 * 说明: 如果 V1.0.3 迁移失败导致列缺失，此迁移会检查并添加缺失的列
 */
public class V1_0_4__FixStudentColumnsIfMissing extends BaseJavaMigration {
    
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        
        // 获取现有列
        Set<String> existingColumns = new HashSet<>();
        DatabaseMetaData metaData = connection.getMetaData();
        try (ResultSet columns = metaData.getColumns(null, null, "STUDENTS", null)) {
            while (columns.next()) {
                String columnName = columns.getString("COLUMN_NAME");
                existingColumns.add(columnName.toUpperCase());
            }
        }
        
        // 检查并添加缺失的列
        try (Statement statement = connection.createStatement()) {
            if (!existingColumns.contains("EXAM_DAYS")) {
                statement.execute("ALTER TABLE students ADD COLUMN exam_days INTEGER DEFAULT 2");
                System.out.println("✅ 已添加 exam_days 列");
            }
            
            if (!existingColumns.contains("DAY1_SUBJECTS")) {
                statement.execute("ALTER TABLE students ADD COLUMN day1_subjects VARCHAR(200)");
                System.out.println("✅ 已添加 day1_subjects 列");
            }
            
            if (!existingColumns.contains("DAY2_SUBJECTS")) {
                statement.execute("ALTER TABLE students ADD COLUMN day2_subjects VARCHAR(200)");
                System.out.println("✅ 已添加 day2_subjects 列");
            }
        }
    }
}


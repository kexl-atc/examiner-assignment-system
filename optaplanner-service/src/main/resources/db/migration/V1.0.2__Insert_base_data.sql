-- ===========================================
-- 考试调度系统 - 基础数据初始化
-- ===========================================

-- 插入科室数据
INSERT INTO departments (code, name, description) VALUES
('DEPT_1', '区域一室', '负责区域一的相关业务'),
('DEPT_2', '区域二室', '负责区域二的相关业务'),
('DEPT_3', '区域三室', '负责区域三的相关业务'),
('DEPT_4', '区域四室', '负责区域四的相关业务'),
('DEPT_5', '区域五室', '负责区域五的相关业务'),
('DEPT_6', '区域六室', '负责区域六的相关业务'),
('DEPT_7', '区域七室', '负责区域七的相关业务');

-- 插入班组数据
INSERT INTO groups (code, name, description) VALUES
('GROUP_1', '一组', '第一班组'),
('GROUP_2', '二组', '第二班组'),
('GROUP_3', '三组', '第三班组'),
('GROUP_4', '四组', '第四班组'),
('GROUP_NONE', '无', '无班组');

-- 插入默认约束配置
INSERT INTO constraint_configurations (config_name, config_data, is_active, created_by) VALUES
('默认配置', '{
  "hardConstraints": {
    "workdaysOnlyExam": true,
    "examinerDepartmentRules": true,
    "twoMainExaminersRequired": true,
    "noExaminerDayShift": true,
    "consecutiveWorkdaysComplete": true
  },
  "softConstraints": {
    "backupExaminerDiffDeptWeight": 30,
    "avoidStudentDayShiftWeight": 25,
    "preferRecommendedDeptsWeight": 40,
    "allowDept37CrossUseWeight": 20,
    "ensureConsecutiveDaysWeight": 35,
    "preferNoGroupTeachersWeight": 15,
    "balanceWorkloadWeight": 30,
    "preferLaterDatesWeight": 10
  }
}', true, 'system');
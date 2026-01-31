-- 开发环境初始化数据
-- 插入部门数据
INSERT INTO departments (id, code, name, description, created_at, updated_at) VALUES 
(1, 'DEPT1', '区域一室', '区域一室', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'DEPT2', '区域二室', '区域二室', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'DEPT3', '区域三室', '区域三室', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'DEPT4', '区域四室', '区域四室', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'DEPT5', '区域五室', '区域五室', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'DEPT6', '区域六室', '区域六室', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'DEPT7', '区域七室', '区域七室', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入班组数据
INSERT INTO groups (id, code, name, description, created_at, updated_at) VALUES 
(1, 'GRP1_1', '一组', '区域一室一组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'GRP1_2', '二组', '区域一室二组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'GRP1_3', '三组', '区域一室三组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'GRP1_4', '四组', '区域一室四组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'GRP2_1', '一组', '区域二室一组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'GRP2_2', '二组', '区域二室二组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'GRP2_3', '三组', '区域二室三组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'GRP2_4', '四组', '区域二室四组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'GRP3_1', '一组', '区域三室一组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 'GRP3_2', '二组', '区域三室二组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, 'GRP3_3', '三组', '区域三室三组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, 'GRP3_4', '四组', '区域三室四组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'GRP4_1', '一组', '区域四室一组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(14, 'GRP4_2', '二组', '区域四室二组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, 'GRP4_3', '三组', '区域四室三组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(16, 'GRP4_4', '四组', '区域四室四组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(17, 'GRP5_1', '一组', '区域五室一组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(18, 'GRP5_2', '二组', '区域五室二组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(19, 'GRP5_3', '三组', '区域五室三组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(20, 'GRP5_4', '四组', '区域五室四组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(21, 'GRP6_1', '一组', '区域六室一组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(22, 'GRP6_2', '二组', '区域六室二组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(23, 'GRP6_3', '三组', '区域六室三组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(24, 'GRP6_4', '四组', '区域六室四组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(25, 'GRP7_1', '一组', '区域七室一组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(26, 'GRP7_2', '二组', '区域七室二组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(27, 'GRP7_3', '三组', '区域七室三组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(28, 'GRP7_4', '四组', '区域七室四组', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入示例考官数据
INSERT INTO teachers (id, teacher_id, name, department_id, group_id, workload, consecutive_days, is_active, created_at, updated_at) VALUES 
(1, 'T001', '张考官', 1, 1, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'T002', '李考官', 1, 2, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'T003', '王考官', 2, 5, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'T004', '赵考官', 2, 6, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'T005', '刘考官', 3, 9, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'T006', '陈考官', 3, 10, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'T007', '杨考官', 4, 13, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'T008', '周考官', 4, 14, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'T009', '吴考官', 5, 17, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 'T010', '郑考官', 5, 18, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, 'T011', '孙考官', 6, 21, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, 'T012', '朱考官', 6, 22, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'T013', '许考官', 7, 25, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(14, 'T014', '何考官', 7, 26, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入示例学员数据
INSERT INTO students (id, student_id, name, department_id, group_id, recommended_examiner1_dept_id, recommended_examiner2_dept_id, recommended_backup_dept_id, created_at, updated_at) VALUES 
(1, 'S001', '杨杰', 1, 1, 1, 3, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'S002', '顾秀云', 3, 9, 3, 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'S003', '黄伟徐', 5, 17, 5, 7, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'S004', '廖轩春', 2, 5, 2, 4, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'S005', '黎明鑫', 7, 25, 7, 3, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'S006', '马恒强', 6, 21, 6, 2, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'S007', '何若鑫', 4, 13, 4, 6, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入时间段数据
INSERT INTO time_slots (id, slot_date, time_range, period, is_available, created_at, updated_at) VALUES 
(1, '2024-01-15', '08:00-12:00', '上午', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, '2024-01-15', '14:00-18:00', '下午', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, '2024-01-15', '19:00-22:00', '晚上', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, '2024-01-16', '08:00-12:00', '上午', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, '2024-01-16', '14:00-18:00', '下午', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, '2024-01-16', '19:00-22:00', '晚上', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入约束配置数据
INSERT INTO constraint_configurations (id, config_name, config_data, is_active, created_by, created_at, updated_at) VALUES 
(1, '默认约束配置', '{
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
}', 
 true, 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
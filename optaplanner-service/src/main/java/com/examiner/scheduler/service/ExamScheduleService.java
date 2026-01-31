package com.examiner.scheduler.service;

import com.examiner.scheduler.domain.*;
import com.examiner.scheduler.rest.ScheduleResponse;
import com.examiner.scheduler.config.HolidayConfig;
import com.examiner.scheduler.entity.ScheduleHistory;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.transaction.Transactional;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;
import java.util.Map;
import java.util.Set;
import java.util.HashMap;
import java.util.HashSet;

/**
 * 考试排班服务类
 * 负责创建问题实例和构建响应结果
 */
@ApplicationScoped
public class ExamScheduleService {
    
    private static final Logger LOGGER = Logger.getLogger(ExamScheduleService.class.getName());
    
    @Inject
    private HolidayConfig holidayConfig;
    
    @Inject
    ObjectMapper objectMapper;
    
    /**
     * 创建问题实例
     */
    public ExamSchedule createProblemInstance(List<Student> students, 
                                             List<Teacher> teachers, 
                                             String startDate, 
                                             String endDate,
                                             OptimizedConstraintConfiguration constraints) {
        // ⭐ HC4约束修复：跟踪每天已分配的考官及其角色，避免同一考官在同一天多次分配
        // 🔧 关键修复：使用Map<日期, Map<考官ID, 分配详情>>结构，区分角色
        // 从：Map<String, Set<String>> 改为：Map<String, Map<String, ExaminerAssignmentDetail>>
        Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments = new HashMap<>();
        
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [接收数据] 创建问题实例");
        LOGGER.info("   学员数量: " + students.size());
        LOGGER.info("   考官数量: " + teachers.size());
        LOGGER.info("   开始日期: " + startDate);
        LOGGER.info("   结束日期: " + endDate);
        LOGGER.info("🔍 [接收数据] 学员名单:");
        for (Student s : students) {
            LOGGER.info("   - " + s.getName() + " (科室:" + s.getDepartment() + ", 班组:" + s.getGroup() + ")");
        }
        
        // 🆕 检查教师的不可用期数据
        LOGGER.info("🔍 [接收数据] 考官不可用期检查:");
        for (Teacher t : teachers) {
            if (t.getUnavailablePeriods() != null && !t.getUnavailablePeriods().isEmpty()) {
                LOGGER.warning("   ⚠️ 考官 " + t.getName() + " 有 " + t.getUnavailablePeriods().size() + " 个不可用期:");
                for (Teacher.UnavailablePeriod period : t.getUnavailablePeriods()) {
                    LOGGER.warning("      - " + period.getStartDate() + " ~ " + period.getEndDate() + " (原因: " + period.getReason() + ")");
                }
            }
        }
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        ExamSchedule schedule = new ExamSchedule();
        
        // 设置基础数据
        schedule.setStudents(students);
        schedule.setTeachers(teachers);
        
        // 生成可用日期（关键修复）
        List<String> availableDates = generateAvailableDates(startDate, endDate);
        schedule.setAvailableDates(availableDates);
        LOGGER.info("生成可用日期: " + availableDates.size() + " 天");
        // 🔧 优化：只显示前5个和后5个日期，避免日志过长
        if (availableDates.size() <= 10) {
        LOGGER.info("可用日期详情: " + String.join(", ", availableDates));
        } else {
            String firstFive = String.join(", ", availableDates.subList(0, 5));
            String lastFive = String.join(", ", availableDates.subList(availableDates.size() - 5, availableDates.size()));
            LOGGER.info("可用日期范围: " + firstFive + " ... " + lastFive + " (共" + availableDates.size() + "天)");
        }
        
        // 添加调试信息
        LOGGER.info("考官详情: " + teachers.stream().map(t -> t.getName() + "(" + t.getDepartment() + ")").collect(java.util.stream.Collectors.joining(", ")));
        LOGGER.info("学员详情: " + students.stream().map(s -> s.getName() + "(" + s.getDepartment() + ")").collect(java.util.stream.Collectors.joining(", ")));
        
        // 生成时间段
        List<TimeSlot> timeSlots = generateTimeSlots(startDate, endDate);
        schedule.setTimeSlots(timeSlots);
        
        // 🔧 创建考试分配实体（确保HC6连续日期 + HC5避免冲突）
        List<ExamAssignment> assignments = new ArrayList<>();
        
        // ⭐ 跟踪已使用的日期对，避免所有学员挤在同一天
        List<String> usedDates = new ArrayList<>();
        
        // 🔧 优化策略：按科室分组学员，优先处理资源紧张科室
        // 这样可以避免某些科室的教员被过早耗尽
        
        // 🔍 关键诊断：在排序前检查学员列表
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [数据诊断] 排序前学员列表详情:");
        LOGGER.info("   学员总数: " + students.size());
        for (int i = 0; i < students.size(); i++) {
            Student s = students.get(i);
            LOGGER.info("   [" + (i+1) + "] 姓名:" + s.getName() + ", 科室:" + s.getDepartment() + 
                       ", 班组:" + s.getGroup() + ", ID:" + s.getId());
        }
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        // 🎯 ****第一阶段：全局资源冲突分析****
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [全局分析] 开始资源冲突风险评估...");
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        Map<Student, StudentResourceProfile> resourceProfiles = 
            analyzeStudentResourceProfiles(students, teachers, availableDates);
        
        // 🎯 ****第二阶段：智能排序（考虑资源冲突风险）****
        List<Student> sortedStudents = sortStudentsByResourceRisk(students, teachers, resourceProfiles);
        
        // 🔍 关键诊断：在排序后检查学员列表
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [智能排序] 排序后学员列表详情（智能填充优化）:");
        LOGGER.info("   学员总数: " + sortedStudents.size());
        
        // 🆕 统计2天和1天考试学员数量
        long twoDayStudents = sortedStudents.stream().filter(Student::needsDay2Exam).count();
        long oneDayStudents = sortedStudents.size() - twoDayStudents;
        LOGGER.info("   📊 2天考试学员: " + twoDayStudents + "名（优先调度）");
        LOGGER.info("   📊 1天考试学员: " + oneDayStudents + "名（填充间隙）");
        
        for (int i = 0; i < sortedStudents.size(); i++) {
            Student s = sortedStudents.get(i);
            StudentResourceProfile profile = resourceProfiles.get(s);
            String examDaysLabel = s.needsDay2Exam() ? "2天" : "1天";
            LOGGER.info("   [" + (i+1) + "] 姓名:" + s.getName() + 
                       ", 科室:" + s.getDepartment() + 
                       ", 班组:" + s.getGroup() + 
                       ", 考试天数:" + examDaysLabel +
                       ", 可选窗口:" + profile.availableDatePairs.size() + "对" +
                       ", 风险等级:" + profile.riskLevel);
        }
        LOGGER.info("🎯 [智能填充策略] 2天学员先获取连续日期 → 1天学员填补间隙日期");
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        // 🔧 防御性编程：检查学员列表是否有重复
        Set<String> processedStudentIds = new HashSet<>();
        Set<String> processedStudentNames = new HashSet<>();
        
        for (Student student : sortedStudents) {
            // 🔍 检查学员ID是否重复
            if (processedStudentIds.contains(String.valueOf(student.getId()))) {
                LOGGER.severe("🚨 [数据异常] 检测到重复的学员ID: " + student.getId() + " (" + student.getName() + ")，跳过");
                continue;
            }
            
            // 🔍 检查学员姓名+科室是否重复
            String studentKey = student.getName() + "_" + normalizeDepartment(student.getDepartment());
            if (processedStudentNames.contains(studentKey)) {
                LOGGER.severe("🚨 [数据异常] 检测到重复的学员: " + student.getName() + " (" + 
                             normalizeDepartment(student.getDepartment()) + ")，跳过");
                continue;
            }
            
            processedStudentIds.add(String.valueOf(student.getId()));
            processedStudentNames.add(studentKey);
            // ========================================
            // Step 1: 🎯 确定连续的考试日期对（强制满足HC6，且尽量分散）
            // ========================================
            System.err.println("━━━ 开始为学员分配日期: " + student.getName() + " (科室:" + 
                       normalizeDepartment(student.getDepartment()) + ", 班组:" + student.getGroup() + ") ━━━");
            LOGGER.info("━━━ 开始为学员分配日期: " + student.getName() + " (科室:" + 
                       normalizeDepartment(student.getDepartment()) + ", 班组:" + student.getGroup() + ") ━━━");
            
            String day1Date;
            String day2Date;
            if (student.needsDay2Exam()) {
                String[] examDates = findConsecutiveDatePairWithResourceCheck(
                    student, teachers, availableDates, usedDates, examinerDailyAssignments);

                // 🆕 修复：添加回退逻辑，避免学员被跳过
                if (examDates == null || examDates[0] == null || examDates[1] == null) {
                    LOGGER.warning("⚠️ [HC6+资源] 理想连续日期对不足，启用回退策略为学员 " + student.getName());
                    
                    // 回退策略：尝试找到任何可用的连续日期（不严格检查资源）
                    examDates = findAnyConsecutiveDatePair(student, availableDates);
                    
                    if (examDates == null) {
                        LOGGER.severe("❌ [HC6+资源] 无法为学员 " + student.getName() + " 找到任何连续日期对");
                        LOGGER.severe("   学员科室: " + normalizeDepartment(student.getDepartment()));
                        LOGGER.severe("   建议: 扩大排班日期范围或增加考官数量");
                        continue; // 只有在完全无法安排时才跳过
                    }
                    
                    LOGGER.info("✅ [回退策略] 为学员 " + student.getName() + " 找到备用日期: " + 
                               examDates[0] + " → " + examDates[1]);
                }

                day1Date = examDates[0];
                day2Date = examDates[1];

                System.err.println("✅ 选定日期: " + day1Date + " → " + day2Date + " (学员:" + student.getName() + ")");
                LOGGER.info("✅ 选定日期: " + day1Date + " → " + day2Date + " (学员:" + student.getName() + ", 科室:" +
                           normalizeDepartment(student.getDepartment()) + ")");
                LOGGER.info("✅ [HC6] 学员 " + student.getName() + " 连续日期: " + day1Date + " → " + day2Date);
            } else {
                day1Date = findSingleExamDateWithResourceCheck(
                    student, teachers, availableDates, usedDates, examinerDailyAssignments);
                
                // 🆕 修复：添加回退逻辑
                if (day1Date == null) {
                    LOGGER.warning("⚠️ [资源] 理想日期不足，启用回退策略为学员 " + student.getName());
                    
                    // 回退策略：找到任何非白班的可用日期
                    day1Date = findAnyAvailableDate(student, availableDates);
                    
                    if (day1Date == null) {
                        LOGGER.severe("❌ [资源] 无法为学员 " + student.getName() + " 找到任何可用考试日期");
                        LOGGER.severe("   学员科室: " + normalizeDepartment(student.getDepartment()));
                        LOGGER.severe("   建议: 扩大排班日期范围或检查白班安排");
                        continue; // 只有在完全无法安排时才跳过
                    }
                    
                    LOGGER.info("✅ [回退策略] 为学员 " + student.getName() + " 找到备用日期: " + day1Date);
                }
                day2Date = null;

                System.err.println("✅ 选定日期: " + day1Date + " (学员:" + student.getName() + ")");
                LOGGER.info("✅ 选定日期: " + day1Date + " (学员:" + student.getName() + ", 科室:" +
                           normalizeDepartment(student.getDepartment()) + ")");
            }

            // ========================================
            // Step 2: 🚀 为day1分配考官（满足HC2、HC5）
            // ========================================
            LOGGER.info("🔍 [Step 2.1] 为Day1分配考官 - 学员:" + student.getName() + " 日期:" + day1Date);
            Teacher[] day1Examiners = intelligentPreAssignExaminersForSingleDay(
                student, teachers, day1Date, examinerDailyAssignments);

            if (day1Examiners == null || day1Examiners[0] == null) {
                LOGGER.severe("❌ [资源不足-Day1] 无法为学员 " + student.getName() + " Day1智能分配考官！");
                LOGGER.severe("   学员科室: " + normalizeDepartment(student.getDepartment()));
                LOGGER.severe("   考试日期: " + day1Date);
                LOGGER.severe("   当前该科室考官在此日期的占用情况:");

                // 🔍 详细诊断：显示该科室所有考官的状态
                String studentDeptNorm = normalizeDepartment(student.getDepartment());
                for (Teacher t : teachers) {
                    String tDept = normalizeDepartment(t.getDepartment());
                    if (isValidExaminer1Department(studentDeptNorm, tDept)) {
                        boolean available = isExaminerAvailable(t, day1Date, examinerDailyAssignments);
                        LOGGER.severe("     考官: " + t.getName() + " (科室:" + tDept + ", 班组:" + t.getGroup() +
                                     ") - " + (available ? "✅可用" : "❌已占用"));
                    }
                }

                LOGGER.severe("   ⚠️ 跳过该学员，避免生成违反HC2约束的初始解");
                continue;
            }

            // ========================================
            // Step 2.2: 🚀 为day2分配考官（仅当需要Day2考试时）
            // ========================================
            Teacher[] day2Examiners = null;
            if (student.needsDay2Exam()) {
                LOGGER.info("🔍 [Step 2.2] 为Day2分配考官 - 学员:" + student.getName() + " 日期:" + day2Date);
                day2Examiners = intelligentPreAssignExaminersForSingleDay(
                    student, teachers, day2Date, examinerDailyAssignments);

                if (day2Examiners == null || day2Examiners[0] == null) {
                    LOGGER.severe("❌ [资源不足-Day2] 无法为学员 " + student.getName() + " Day2智能分配考官！");
                    LOGGER.severe("   学员科室: " + normalizeDepartment(student.getDepartment()));
                    LOGGER.severe("   考试日期: " + day2Date);
                    LOGGER.severe("   当前该科室考官在此日期的占用情况:");

                    // 🔍 详细诊断：显示该科室所有考官的状态
                    String studentDeptNorm = normalizeDepartment(student.getDepartment());
                    for (Teacher t : teachers) {
                        String tDept = normalizeDepartment(t.getDepartment());
                        if (isValidExaminer1Department(studentDeptNorm, tDept)) {
                            boolean available = isExaminerAvailable(t, day2Date, examinerDailyAssignments);
                            LOGGER.severe("     考官: " + t.getName() + " (科室:" + tDept + ", 班组:" + t.getGroup() +
                                         ") - " + (available ? "✅可用" : "❌已占用"));
                        }
                    }

                    // 🔧 关键：如果Day2分配失败，需要释放Day1的考官标记
                    LOGGER.warning("   🔄 开始回滚Day1的考官标记...");
                    if (day1Examiners[0] != null) unmarkExaminerAsAssigned(day1Examiners[0], day1Date, examinerDailyAssignments);
                    if (day1Examiners[1] != null) unmarkExaminerAsAssigned(day1Examiners[1], day1Date, examinerDailyAssignments);
                    if (day1Examiners[2] != null) unmarkExaminerAsAssigned(day1Examiners[2], day1Date, examinerDailyAssignments);
                    LOGGER.warning("   ✅ 已释放Day1的考官标记");
                    LOGGER.severe("   ⚠️ 跳过该学员");
                    continue;
                }
            }

            // ========================================
            // Step 3: 创建day1 assignment
            // ========================================
            ExamAssignment day1Assignment = new ExamAssignment();
            String uniqueId1 = "EXAM_" + student.getId() + "_DAY1_" + day1Date.replace("-", "") + "_" + System.nanoTime();
            day1Assignment.setId(uniqueId1);
            day1Assignment.setStudent(student);
            day1Assignment.setExamType("day1");
            day1Assignment.setSubjects(List.of("现场", "模拟机1"));
            day1Assignment.setExamDate(day1Date);

            if (day1Examiners[0] != null) {
                day1Assignment.setExaminer1(day1Examiners[0]);
                LOGGER.info("📋 Day1 考官1: " + day1Examiners[0].getName());
            }
            if (day1Examiners[1] != null) {
                day1Assignment.setExaminer2(day1Examiners[1]);
                LOGGER.info("📋 Day1 考官2: " + day1Examiners[1].getName());
            }
            if (day1Examiners[2] != null) {
                day1Assignment.setBackupExaminer(day1Examiners[2]);
                LOGGER.info("📋 Day1 备份: " + day1Examiners[2].getName());
            }

            assignments.add(day1Assignment);
            usedDates.add(day1Date);

            // ========================================
            // Step 4: 🆕 根据学员考试天数决定是否创建day2 assignment
            // ========================================
            if (student.needsDay2Exam()) {
                ExamAssignment day2Assignment = new ExamAssignment();
                String uniqueId2 = "EXAM_" + student.getId() + "_DAY2_" + day2Date.replace("-", "") + "_" + System.nanoTime();
                day2Assignment.setId(uniqueId2);
                day2Assignment.setStudent(student);
                day2Assignment.setExamType("day2");
                day2Assignment.setSubjects(List.of("模拟机2", "口试"));
                day2Assignment.setExamDate(day2Date);

                if (day2Examiners != null && day2Examiners[0] != null) {
                    day2Assignment.setExaminer1(day2Examiners[0]);
                    LOGGER.info("📋 Day2 考官1: " + day2Examiners[0].getName());
                }
                if (day2Examiners != null && day2Examiners[1] != null) {
                    day2Assignment.setExaminer2(day2Examiners[1]);
                    LOGGER.info("📋 Day2 考官2: " + day2Examiners[1].getName());
                }
                if (day2Examiners != null && day2Examiners[2] != null) {
                    day2Assignment.setBackupExaminer(day2Examiners[2]);
                    LOGGER.info("📋 Day2 备份: " + day2Examiners[2].getName());
                }

                assignments.add(day2Assignment);
                usedDates.add(day2Date);

                LOGGER.info("✅ [Assignment创建] 学员 " + student.getName() + " 两天考试已分配：" + uniqueId1 + ", " + uniqueId2);
            } else {
                LOGGER.info("✅ [Assignment创建] 学员 " + student.getName() + " 一天考试已分配：" + uniqueId1 + " (释放Day2考官资源)");
            }
        }

        // 🔧 [优化策略修正] 不再pin住assignment，让OptaPlanner优化所有考官选择
        // 新策略：
        //   - 考官1可以在Day1和Day2不同，只需满足HC2（同科室）硬约束
        //   - 考官2、备份考官可以根据推荐科室池优化
        //   - OptaPlanner根据软约束（SC1晚班、SC3/SC5休息等）选择最优考官
        //   - HC2极高权重（100000）会自动保证考官1与学员同科室
        // 🔍 资源分析：诊断可能导致约束违反的原因
        diagnoseResourceAvailability(students, teachers, availableDates, assignments);

        // ✅ 验证初始解的HC4约束
        validateHC4Constraint(assignments);

        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🚀 [优化策略] OptaPlanner将优化所有考官选择");
        LOGGER.info("   ✅ 初始日期分配: 连续且分散（已固定）");
        LOGGER.info("   🔓 考官1: 允许OptaPlanner优化（必须满足HC2）");
        LOGGER.info("   🔧 考官2: 根据day1/day2推荐科室池优化");
        LOGGER.info("   🔧 备份考官: 根据推荐科室池优化");
        LOGGER.info("   💡 初始解仅作为起点，OptaPlanner将寻找最优组合");
        for (ExamAssignment assignment : assignments) {
            // ⚠️ 修复: 如果assignment已经被pinned，则保持pinned状态，否则允许OptaPlanner优化
            // 仅当pinned为false时才设置，避免覆盖前端已设置的固定状态
            if (!assignment.isPinned()) {
                assignment.setPinned(false);
            }

            if (assignment.getExaminer1() != null) {
                String studentDept = assignment.getStudent() != null ?
                    normalizeDepartment(assignment.getStudent().getDepartment()) : "未知";
                String examiner1Dept = normalizeDepartment(assignment.getExaminer1().getDepartment());
                LOGGER.info("  🔓 可优化: " + assignment.getId() +
                           " | 学员:" + (assignment.getStudent() != null ? assignment.getStudent().getName() : "null") +
                           " (" + studentDept + ")" +
                           " | 日期:" + assignment.getExamDate() +
                           " | 初始考官1:" + assignment.getExaminer1().getName() + " (" + examiner1Dept + ")");
            }
        }
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        schedule.setExamAssignments(assignments);

        // 设置约束配置
        if (constraints != null) {
            schedule.setConstraintConfig(constraints);
        }

        return schedule;
    }

     private String findSingleExamDateWithResourceCheck(
            Student student,
            List<Teacher> teachers,
            List<String> availableDates,
            List<String> usedDates,
            Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {

        String studentGroup = student.getGroup();
        String bestDate = null;
        int bestScore = Integer.MIN_VALUE;

        // 🆕 智能填充：计算哪些日期是"间隙日期"（前一天或后一天有考试安排）
        Set<String> gapDates = findGapDates(availableDates, usedDates);
        LOGGER.info("🎯 [智能填充-1天学员] 检测到的间隙日期: " + gapDates);

        for (String date : availableDates) {
            if (isStudentOnDayShift(studentGroup, date)) {
                continue;
            }

            int availableExaminers = countAvailableExaminersForDate(student, teachers, date, examinerDailyAssignments);
            if (availableExaminers <= 0) {
                continue;
            }

            // 🔧 智能填充评分：
            // - 间隙日期（前后有考试）得分最高 → 优先填充
            // - 已使用日期次之（可以叠加多人考试）
            // - 全新日期得分较低（避免创造新间隙）
            int baseScore;
            if (gapDates.contains(date)) {
                baseScore = 200;  // 🆕 间隙日期优先级最高
                LOGGER.info("  📍 日期 " + date + " 是间隙日期，优先填充 (基础分:200)");
            } else if (usedDates.contains(date)) {
                baseScore = 150;  // 已使用日期次高（可叠加）
            } else {
                baseScore = 50;   // 全新日期得分较低
            }
            
            int useCount = (int) usedDates.stream().filter(d -> d.equals(date)).count();
            int finalScore = baseScore + (availableExaminers * 50) - (useCount * 5);

            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestDate = date;
            }
        }

        if (bestDate != null && gapDates.contains(bestDate)) {
            LOGGER.info("✅ [智能填充] 学员 " + student.getName() + " 将填充间隙日期: " + bestDate);
        }

        return bestDate;
    }
    
    /**
     * 🆕 智能填充：找出所有间隙日期（前一天或后一天有考试安排的日期）
     * 这些日期是最适合安排1天考试学员的，可以充分利用时间资源
     */
    private Set<String> findGapDates(List<String> availableDates, List<String> usedDates) {
        Set<String> gapDates = new HashSet<>();
        
        for (String date : availableDates) {
            if (usedDates.contains(date)) {
                continue; // 已使用的日期不是"间隙"
            }
            
            try {
                LocalDate currentDate = LocalDate.parse(date);
                LocalDate prevDate = currentDate.minusDays(1);
                LocalDate nextDate = currentDate.plusDays(1);
                
                String prevDateStr = prevDate.toString();
                String nextDateStr = nextDate.toString();
                
                // 如果前一天或后一天有考试安排，则当前日期是间隙日期
                if (usedDates.contains(prevDateStr) || usedDates.contains(nextDateStr)) {
                    gapDates.add(date);
                }
            } catch (Exception e) {
                LOGGER.warning("⚠️ [间隙检测] 日期解析失败: " + date);
            }
        }
        
        return gapDates;
    }
    
    /**
     * 🎯 HC6+资源评估：寻找连续的考试日期对（考官资源充足度优先）
     * 🔧 核心策略：评估每个日期对在该科室有多少可用考官
     * 优先选择考官资源充足的日期对，避免资源局部耗尽导致后续学员无法分配
     * 
     * @param teachers 所有考官列表
     * @param examinerDailyAssignments 考官每日占用情况
     * @return [day1, day2] 其中 day2 = day1 + 1天，或 null
     */
    private String[] findConsecutiveDatePairWithResourceCheck(
            Student student, 
            List<Teacher> teachers,
            List<String> availableDates, 
            List<String> usedDates,
            Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {
        List<DatePairScore> allPairs = new ArrayList<>();
        
        String studentGroup = student.getGroup(); // 学员班组
        String studentDept = normalizeDepartment(student.getDepartment());
        
        LOGGER.info("🔍 [智能日期选择] 为学员 " + student.getName() + " (科室:" + studentDept + 
                   ", 班组:" + studentGroup + ") 评估可用日期对");
        
        // 收集并评分所有连续日期对
        for (int i = 0; i < availableDates.size() - 1; i++) {
            String date1 = availableDates.get(i);
            try {
                LocalDate day1 = LocalDate.parse(date1);
                LocalDate day2 = day1.plusDays(1);
                String date2 = day2.toString();
                
                if (!availableDates.contains(date2)) continue;
                
                // ✅ 检查是否是学员白班日
                    boolean date1IsDayShift = isStudentOnDayShift(studentGroup, date1);
                    boolean date2IsDayShift = isStudentOnDayShift(studentGroup, date2);
                    
                    if (date1IsDayShift || date2IsDayShift) {
                    LOGGER.fine("⚠️ [日期筛选] 跳过白班日: " + date1 + "~" + date2);
                        continue; // 跳过白班日
                    }
                
                // 🔧 **关键优化：评估这个日期对的考官资源充足度**
                int baseScore = evaluateDatePairResourceScore(date1, date2, usedDates);
                
                // 🎯 **核心新增：评估该日期对该科室有多少可用考官**
                int availableExaminersDay1 = countAvailableExaminersForDate(student, teachers, date1, examinerDailyAssignments);
                int availableExaminersDay2 = countAvailableExaminersForDate(student, teachers, date2, examinerDailyAssignments);
                
                // 资源加成：可用考官越多，得分越高
                int resourceBonus = (availableExaminersDay1 + availableExaminersDay2) * 50;
                
                int finalScore = baseScore + resourceBonus;
                
                LOGGER.fine("📊 [日期评分] " + date1 + "~" + date2 + 
                          " | 基础:" + baseScore + 
                          " | Day1可用考官:" + availableExaminersDay1 +
                          " | Day2可用考官:" + availableExaminersDay2 +
                          " | 资源加成:" + resourceBonus +
                          " | 总分:" + finalScore);
                
                // 🚨 **如果两天都没有可用考官，直接跳过**
                if (availableExaminersDay1 == 0 || availableExaminersDay2 == 0) {
                    LOGGER.fine("⚠️ [资源不足] 跳过日期对 " + date1 + "~" + date2 + 
                              " (Day1考官:" + availableExaminersDay1 + 
                              ", Day2考官:" + availableExaminersDay2 + ")");
                    continue;
                }
                
                allPairs.add(new DatePairScore(date1, date2, finalScore));
                
            } catch (Exception e) {
                LOGGER.warning("⚠️ 日期解析失败: " + date1);
            }
        }
        
        if (allPairs.isEmpty()) {
            LOGGER.severe("❌ [日期选择] 没有找到任何可用的连续日期对！");
            return null;
        }
        
        // 按得分排序，选择资源最充足的日期对
        allPairs.sort((a, b) -> Integer.compare(b.score, a.score));
        
        DatePairScore best = allPairs.get(0);
        LOGGER.info("✅ [智能日期选择] 选定日期对: " + best.date1 + " → " + best.date2 + 
                   " (得分:" + best.score + ", 共有" + allPairs.size() + "个候选)");
        
        return new String[]{best.date1, best.date2};
    }
    
    /**
     * 🆕 回退策略：当资源检查找不到日期时，尝试找到任何可用的连续日期对
     * 不严格检查考官资源，只确保日期连续且不是白班日
     * 
     * @param student 学员
     * @param availableDates 可用日期列表
     * @return [day1, day2] 或 null
     */
    private String[] findAnyConsecutiveDatePair(Student student, List<String> availableDates) {
        String studentGroup = student.getGroup();
        
        for (int i = 0; i < availableDates.size() - 1; i++) {
            String date1 = availableDates.get(i);
            try {
                LocalDate day1 = LocalDate.parse(date1);
                LocalDate day2 = day1.plusDays(1);
                String date2 = day2.toString();
                
                if (!availableDates.contains(date2)) continue;
                
                // 只检查白班日，不严格检查资源
                boolean date1IsDayShift = isStudentOnDayShift(studentGroup, date1);
                boolean date2IsDayShift = isStudentOnDayShift(studentGroup, date2);
                
                if (date1IsDayShift || date2IsDayShift) {
                    continue;
                }
                
                return new String[]{date1, date2};
                
            } catch (Exception e) {
                LOGGER.fine("日期解析失败: " + date1);
            }
        }
        
        return null;
    }
    
    /**
     * 🆕 回退策略：当资源检查找不到日期时，尝试找到任何非白班的可用日期
     * 
     * @param student 学员
     * @param availableDates 可用日期列表
     * @return 可用日期 或 null
     */
    private String findAnyAvailableDate(Student student, List<String> availableDates) {
        String studentGroup = student.getGroup();
        
        for (String date : availableDates) {
            if (!isStudentOnDayShift(studentGroup, date)) {
                return date;
            }
        }
        
        return null;
    }
    
    /**
     * 🎯 全局资源分析：预先评估每个学员的资源可用性
     * 
     * 核心思想：
     * 1. 分析每个学员在每个连续日期对的可用考官数量
     * 2. 计算学员的"可选择窗口"大小（有多少个可行的日期对）
     * 3. 评估资源冲突风险等级
     * 
     * @return Map<学员, 资源档案>
     */
    private Map<Student, StudentResourceProfile> analyzeStudentResourceProfiles(
            List<Student> students,
            List<Teacher> teachers,
            List<String> availableDates) {
        
        Map<Student, StudentResourceProfile> profiles = new HashMap<>();
        Map<String, Map<String, ExaminerAssignmentDetail>> emptyAssignments = new HashMap<>(); // 空的占用情况（初始分析）
        
        for (Student student : students) {
            StudentResourceProfile profile = new StudentResourceProfile();
            profile.availableDatePairs = new ArrayList<>();
            
            String studentDept = normalizeDepartment(student.getDepartment());
            String studentGroup = student.getGroup();
            
            // 分析所有连续日期对
            for (int i = 0; i < availableDates.size() - 1; i++) {
                String date1 = availableDates.get(i);
                try {
                    LocalDate day1 = LocalDate.parse(date1);
                    LocalDate day2 = day1.plusDays(1);
                    String date2 = day2.toString();
                    
                    if (!availableDates.contains(date2)) continue;
                    
                    // 检查学员白班日
                    if (isStudentOnDayShift(studentGroup, date1) || isStudentOnDayShift(studentGroup, date2)) {
                        continue;
                    }
                    
                    // 统计该日期对的可用考官数量
                    int availDay1 = countAvailableExaminersForDate(student, teachers, date1, emptyAssignments);
                    int availDay2 = countAvailableExaminersForDate(student, teachers, date2, emptyAssignments);
                    
                    if (availDay1 > 0 && availDay2 > 0) {
                        DatePairResource pair = new DatePairResource();
                        pair.minAvailable = Math.min(availDay1, availDay2);
                        profile.availableDatePairs.add(pair);
                    }
                } catch (Exception e) {
                    // 跳过无效日期
                }
            }
            
            // 计算风险等级
            profile.calculateRiskLevel(teachers, studentDept);
            
            profiles.put(student, profile);
            
            LOGGER.info("📊 [资源分析] 学员:" + student.getName() + 
                       " | 科室:" + studentDept +
                       " | 可选日期对:" + profile.availableDatePairs.size() +
                       " | 最小可用考官:" + profile.getMinAvailableExaminers() +
                       " | 风险等级:" + profile.riskLevel);
        }
        
        return profiles;
    }
    
    /**
     * 🎯 按资源风险排序学员
     * 
     * 排序策略：
     * 1. 风险等级高的优先（可选日期对少）
     * 2. 同风险等级，按最小可用考官数排序（资源最紧张的优先）
     * 3. 其他相同，按科室资源紧张度排序
     */
    private List<Student> sortStudentsByResourceRisk(
            List<Student> students,
            List<Teacher> teachers,
            Map<Student, StudentResourceProfile> profiles) {
        
        List<Student> sorted = new ArrayList<>(students);
        
        sorted.sort((s1, s2) -> {
            StudentResourceProfile p1 = profiles.get(s1);
            StudentResourceProfile p2 = profiles.get(s2);
            
            // 🆕 0. 智能填充优化：两天考试学员优先（约束更严格），一天考试学员后调度（可填充间隙）
            // 这确保2天考试学员先获得连续日期对，1天考试学员可以灵活填补空隙
            boolean s1Needs2Days = s1.needsDay2Exam();
            boolean s2Needs2Days = s2.needsDay2Exam();
            if (s1Needs2Days != s2Needs2Days) {
                return s1Needs2Days ? -1 : 1; // 2天考试优先
            }
            
            // 1. 风险等级：高风险优先
            int riskCompare = p2.riskLevel.compareTo(p1.riskLevel);
            if (riskCompare != 0) return riskCompare;
            
            // 2. 可选窗口大小：窗口小的优先
            int windowCompare = Integer.compare(p1.availableDatePairs.size(), p2.availableDatePairs.size());
            if (windowCompare != 0) return windowCompare;
            
            // 3. 最小可用考官数：资源紧张的优先
            int minExaminerCompare = Integer.compare(p1.getMinAvailableExaminers(), p2.getMinAvailableExaminers());
            if (minExaminerCompare != 0) return minExaminerCompare;
            
            // 4. 科室资源紧张度（保留原有逻辑）
            String dept1 = normalizeDepartment(s1.getDepartment());
            String dept2 = normalizeDepartment(s2.getDepartment());
            
            // 统计科室学员数和考官数
            long studentCount1 = students.stream().filter(s -> normalizeDepartment(s.getDepartment()).equals(dept1)).count();
            long studentCount2 = students.stream().filter(s -> normalizeDepartment(s.getDepartment()).equals(dept2)).count();
            long teacherCount1 = teachers.stream().filter(t -> normalizeDepartment(t.getDepartment()).equals(dept1)).count();
            long teacherCount2 = teachers.stream().filter(t -> normalizeDepartment(t.getDepartment()).equals(dept2)).count();
            
            double pressure1 = teacherCount1 > 0 ? (double)studentCount1 / teacherCount1 : Double.MAX_VALUE;
            double pressure2 = teacherCount2 > 0 ? (double)studentCount2 / teacherCount2 : Double.MAX_VALUE;
            
            int pressureCompare = Double.compare(pressure2, pressure1);
            if (pressureCompare != 0) return pressureCompare;
            
            // 5. 按姓名排序（保证稳定性）
            return s1.getName().compareTo(s2.getName());
        });
        
        LOGGER.info("🎯 [智能填充] 排序策略：2天考试学员优先调度 → 1天考试学员填充间隙");
        
        return sorted;
    }
    
    /**
     * 学员资源档案（资源可用性分析结果）
     */
    private static class StudentResourceProfile {
        List<DatePairResource> availableDatePairs; // 所有可行的日期对
        RiskLevel riskLevel; // 风险等级
        
        /**
         * 计算风险等级
         */
        void calculateRiskLevel(List<Teacher> teachers, String studentDept) {
            int pairCount = availableDatePairs.size();
            int minExaminers = getMinAvailableExaminers();
            
            // 统计科室考官总数
            long deptTeacherCount = teachers.stream()
                .filter(t -> {
                    String tDept = t.getDepartment();
                    if (tDept == null) return false;
                    String normalized = tDept.trim();
                    if (normalized.contains("区域一室")) return studentDept.equals("一");
                    if (normalized.contains("区域二室")) return studentDept.equals("二");
                    if (normalized.contains("区域三室")) return studentDept.equals("三");
                    if (normalized.contains("区域四室")) return studentDept.equals("四");
                    if (normalized.contains("区域五室")) return studentDept.equals("五");
                    if (normalized.contains("区域六室")) return studentDept.equals("六");
                    if (normalized.contains("区域七室")) return studentDept.equals("七");
                    return false;
                })
                .count();
            
            // 风险评估逻辑
            if (pairCount <= 2 || minExaminers <= 1) {
                riskLevel = RiskLevel.CRITICAL; // 极高风险：选择极少
            } else if (pairCount <= 5 || minExaminers <= 2 || deptTeacherCount <= 3) {
                riskLevel = RiskLevel.HIGH; // 高风险：选择较少或考官紧张
            } else if (pairCount <= 10) {
                riskLevel = RiskLevel.MEDIUM; // 中等风险
            } else {
                riskLevel = RiskLevel.LOW; // 低风险：选择充足
            }
        }
        
        int getMinAvailableExaminers() {
            return availableDatePairs.stream()
                .mapToInt(p -> p.minAvailable)
                .min()
                .orElse(0);
        }
    }
    
    /**
     * 日期对资源信息
     */
    private static class DatePairResource {
        int minAvailable; // 两天中较少的可用考官数
    }
    
    /**
     * 风险等级枚举
     */
    private enum RiskLevel {
        CRITICAL("极高"),
        HIGH("高"),
        MEDIUM("中"),
        LOW("低");
        
        final String label;
        
        RiskLevel(String label) {
            this.label = label;
        }
        
        @Override
        public String toString() {
            return label;
        }
    }
    
    /**
     * 🎯 统计某个日期对某个学员科室有多少可用考官
     * @return 可用考官数量（满足HC2、HC3、HC5的考官）
     */
    private int countAvailableExaminersForDate(
            Student student,
            List<Teacher> teachers,
            String examDate,
            Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {
        
        String studentDept = normalizeDepartment(student.getDepartment());
        DutySchedule duty = DutySchedule.forDate(examDate);
        int count = 0;
        
        for (Teacher teacher : teachers) {
            String teacherDept = normalizeDepartment(teacher.getDepartment());
            
            // HC2检查：考官1必须与学员同科室（或3/7互通）
            if (!isValidExaminer1Department(studentDept, teacherDept)) {
                continue;
            }
            
            // HC3检查：不能是白班执勤
            if (!isTeacherAvailableOnDate(teacher, duty)) {
                continue;
            }
            
            // HC9检查：考官不可用期不能安排 ⭐ 新增
            if (teacher.isUnavailableOnDate(examDate)) {
                continue;
            }
            
            // HC5检查：该天不能已被分配
            if (!isExaminerAvailable(teacher, examDate, examinerDailyAssignments)) {
                continue;
            }
            
            count++;
        }
        
        return count;
    }
    
    /**
     * 🎯 评估日期对的资源充足度得分
     * 得分越高表示这个日期对越适合分配（考官资源越充足）
     * 
     * 评分规则：
     * - 完全未使用的日期对：+100分（最优）
     * - 部分使用的日期对：+50分（次优，允许复用）
     * - 全部已使用的日期对：+20分（最后选择，但仍可用）
     * - 考虑日期的分散性：避免所有学员挤在开头几天
     */
    private int evaluateDatePairResourceScore(String date1, String date2, List<String> usedDates) {
        int score = 0;
                    
                    boolean date1Used = usedDates.contains(date1);
                    boolean date2Used = usedDates.contains(date2);
                    
                    if (!date1Used && !date2Used) {
            // 完全未使用：最优选择
            score += 100;
        } else if (!date1Used || !date2Used) {
            // 部分使用：次优，但仍然可用
            // 关键：同一天可以有多个学员，只要考官不同！
            score += 50;
                    } else {
            // 都已使用：最后选择
            // 但仍然可用，因为考官可以在同一天监考不同学员
            score += 20;
        }
        
        // 🔧 优化：鼓励日期分散，避免所有学员挤在一起
        // 已使用次数越多，轻微降低得分（鼓励使用更分散的日期）
        int date1UseCount = (int) usedDates.stream().filter(d -> d.equals(date1)).count();
        int date2UseCount = (int) usedDates.stream().filter(d -> d.equals(date2)).count();
        score -= (date1UseCount + date2UseCount) * 5; // 每次使用-5分
        
        return score;
    }
    
    /**
     * 辅助类：日期对及其得分
     */
    private static class DatePairScore {
        String date1;
        String date2;
        int score;
        
        DatePairScore(String date1, String date2, int score) {
            this.date1 = date1;
            this.date2 = date2;
            this.score = score;
        }
    }
    
    /**
     * 🚀 智能预分配考官（单天版本）
     * ✨ 为一天的考试分配考官，避免冲突
     * 🔧 考虑因素：晚班优先、休息日优先、工作量均衡、推荐科室
     */
    private Teacher[] intelligentPreAssignExaminersForSingleDay(
            Student student, List<Teacher> teachers, String examDate,
            Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {
        
        Teacher[] result = new Teacher[3]; // [考官1, 考官2, 备份]
        String studentDept = normalizeDepartment(student.getDepartment());
        
        LOGGER.info("🔍 [智能预分配-单天] 开始为学员 " + student.getName() + " (科室:" + studentDept + 
                   ") 选择考官，日期:" + examDate);
        
        // 🔧 获取该日期的班组轮换状态
        DutySchedule duty = DutySchedule.forDate(examDate);
        
        // ========================================
        // Step 1: 选择考官1（满足HC2 + 软约束优化）
        // ========================================
        List<TeacherCandidate> examiner1Candidates = new ArrayList<>();
        
        for (Teacher teacher : teachers) {
            String teacherDept = normalizeDepartment(teacher.getDepartment());
            
            // HC2检查：考官1必须与学员同科室（或3/7互通）
            if (!isValidExaminer1Department(studentDept, teacherDept)) {
                continue;
            }
            
            // HC3检查：不能是白班执勤
            if (!isTeacherAvailableOnDate(teacher, duty)) {
                continue;
            }
            
            // HC9检查：考官不可用期不能安排 ⭐ 新增
            if (teacher.isUnavailableOnDate(examDate)) {
                continue;
            }
            
            // HC5检查：该天不能已被分配
            if (!isExaminerAvailable(teacher, examDate, examinerDailyAssignments)) {
                continue;
            }
            
            // ✨ 计算优先级分数（考虑软约束）
            int priority = calculateTeacherPrioritySingleDay(teacher, examDate, duty, examinerDailyAssignments);
            examiner1Candidates.add(new TeacherCandidate(teacher, priority));
        }
        
        if (examiner1Candidates.isEmpty()) {
            LOGGER.severe("❌ [智能预分配-单天] 无法为学员 " + student.getName() + " 找到满足HC2+HC3+HC5的考官1");
        return null;
        }
        
        // 按优先级排序，选择最优的
        examiner1Candidates.sort((a, b) -> Integer.compare(b.priority, a.priority));
        result[0] = examiner1Candidates.get(0).teacher;
        markExaminerAsAssigned(result[0], examDate, student, "examiner1", examinerDailyAssignments);
        
        LOGGER.info("✅ [考官1] " + result[0].getName() + " (科室:" + 
                   normalizeDepartment(result[0].getDepartment()) + 
                   ", 优先级:" + examiner1Candidates.get(0).priority + ")");
        
        // ========================================
        // Step 2: 选择考官2（满足HC7 + 软约束优化）
        // ========================================
        String examiner1Dept = normalizeDepartment(result[0].getDepartment());
        List<TeacherCandidate> examiner2Candidates = new ArrayList<>();
        
        // 获取学员的推荐科室
        List<String> recommendedDepts = student.getExaminer2RecommendedDepartments();
        
        for (Teacher teacher : teachers) {
            if (teacher.equals(result[0])) continue;
            
            String teacherDept = normalizeDepartment(teacher.getDepartment());
            
            // HC7检查：考官2必须与考官1不同科室
            if (teacherDept.equals(examiner1Dept)) continue;
            
            // HC2检查：考官2必须与学员不同科室
            if (teacherDept.equals(studentDept)) continue;
            
            // HC3检查
            if (!isTeacherAvailableOnDate(teacher, duty)) {
                continue;
            }
            
            // HC9检查：考官不可用期不能安排 ⭐ 新增
            if (teacher.isUnavailableOnDate(examDate)) {
                continue;
            }
            
            // HC5检查
            if (!isExaminerAvailable(teacher, examDate, examinerDailyAssignments)) {
                continue;
            }
            
            // ✨ 计算优先级分数
            int priority = calculateTeacherPrioritySingleDay(teacher, examDate, duty, examinerDailyAssignments);
            
            // ✨ SC2加分：如果来自推荐科室，优先级+100
            if (recommendedDepts != null && recommendedDepts.contains(teacher.getDepartment())) {
                priority += 100;
                LOGGER.fine("💡 [SC2加分] " + teacher.getName() + " 来自推荐科室 " + teacher.getDepartment());
            }
            
            examiner2Candidates.add(new TeacherCandidate(teacher, priority));
        }
        
        if (!examiner2Candidates.isEmpty()) {
            examiner2Candidates.sort((a, b) -> Integer.compare(b.priority, a.priority));
            result[1] = examiner2Candidates.get(0).teacher;
            markExaminerAsAssigned(result[1], examDate, student, "examiner2", examinerDailyAssignments);
            
            LOGGER.info("✅ [考官2] " + result[1].getName() + " (科室:" + 
                       normalizeDepartment(result[1].getDepartment()) + 
                       ", 优先级:" + examiner2Candidates.get(0).priority + ")");
        } else {
            // examiner2 是必需的规划变量（nullable=false），没有候选则该日期不可用
            unmarkExaminerAsAssigned(result[0], examDate, examinerDailyAssignments);
            return null;
        }
        
        // ========================================
        // Step 3: 选择备份考官（软约束优化）
        // ========================================
        List<TeacherCandidate> backupCandidates = new ArrayList<>();
        // 🔧 复用Step 2中定义的examiner1Dept，只定义examiner2Dept
        String examiner2Dept = normalizeDepartment(result[1].getDepartment());
        
        for (Teacher teacher : teachers) {
            // HC8检查：备份考官不能与考官1和考官2是同一人
            if (teacher.equals(result[0]) || teacher.equals(result[1])) continue;
            
            String teacherDept = normalizeDepartment(teacher.getDepartment());
            
            // 🔧 HC8b检查：备份考官不能与考官1和考官2同科室 ⭐ 新增
            if (teacherDept.equals(examiner1Dept) || teacherDept.equals(examiner2Dept)) {
                continue; // 同科室，跳过
            }
            
            // HC3检查
            if (!isTeacherAvailableOnDate(teacher, duty)) {
                continue;
            }
            
            // HC9检查：考官不可用期不能安排 ⭐ 新增
            if (teacher.isUnavailableOnDate(examDate)) {
                continue;
            }
            
            // HC5检查
            if (!isExaminerAvailable(teacher, examDate, examinerDailyAssignments)) {
                continue;
            }
            
            // ✨ 计算优先级分数
            int priority = calculateTeacherPrioritySingleDay(teacher, examDate, duty, examinerDailyAssignments);
            
            // ✨ SC4加分：如果来自推荐科室，优先级+50
            if (recommendedDepts != null && recommendedDepts.contains(teacher.getDepartment())) {
                priority += 50;
            }
            
            backupCandidates.add(new TeacherCandidate(teacher, priority));
        }
        
        if (!backupCandidates.isEmpty()) {
            backupCandidates.sort((a, b) -> Integer.compare(b.priority, a.priority));
            result[2] = backupCandidates.get(0).teacher;
            markExaminerAsAssigned(result[2], examDate, student, "backup", examinerDailyAssignments);
            
            LOGGER.info("✅ [备份考官] " + result[2].getName() + " (科室:" + 
                       normalizeDepartment(result[2].getDepartment()) + 
                       ", 优先级:" + backupCandidates.get(0).priority + ")");
        }
        
        return result;
    }
    
    /**
     * ✨ 计算考官优先级分数（单天版本）
     * 分数越高，越优先被选择
     */
    private int calculateTeacherPrioritySingleDay(Teacher teacher, String examDate,
                                                 DutySchedule duty,
                                                 Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {
        int score = 100; // 基础分数
        
        // SC1: 晚班考官优先 (+100分)
        if (isTeacherOnNightShift(teacher, duty)) {
            score += 100;
            LOGGER.fine("💡 [SC1] " + teacher.getName() + " 晚班考官 +100");
        }
        
        // SC3: 休息第一天考官优先 (+80分)
        if (isTeacherOnFirstRestDay(teacher, duty)) {
            score += 80;
            LOGGER.fine("💡 [SC3] " + teacher.getName() + " 休息第一天 +80");
        }
        
        // SC5: 休息第二天考官次优先 (+60分)
        if (isTeacherOnSecondRestDay(teacher, duty)) {
            score += 60;
            LOGGER.fine("💡 [SC5] " + teacher.getName() + " 休息第二天 +60");
        }
        
        // SC10: 工作量较少的考官优先 (工作量每少1次 +10分)
        int currentWorkload = getTeacherCurrentWorkload(teacher, examinerDailyAssignments);
        int workloadBonus = Math.max(0, (5 - currentWorkload)) * 10;
        score += workloadBonus;
        if (workloadBonus > 0) {
            LOGGER.fine("💡 [SC10] " + teacher.getName() + " 工作量较少(" + currentWorkload + "次) +" + workloadBonus);
        }
        
        // 避免连续工作惩罚
        if (hasConsecutiveWorkSingleDay(teacher, examDate, examinerDailyAssignments)) {
            score -= 50;
            LOGGER.fine("⚠️ [SC10] " + teacher.getName() + " 有连续工作 -50");
        }
        
        return score;
    }
    
    /**
     * 检查考官是否有连续工作（单天版本）
     */
    private boolean hasConsecutiveWorkSingleDay(Teacher teacher, String examDate,
                                               Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {
        try {
            java.time.LocalDate date = java.time.LocalDate.parse(examDate);
            String beforeDate = date.minusDays(1).toString();
            String afterDate = date.plusDays(1).toString();
            
            String teacherId = String.valueOf(teacher.getId());
            Map<String, ExaminerAssignmentDetail> beforeAssignments = examinerDailyAssignments.get(beforeDate);
            Map<String, ExaminerAssignmentDetail> afterAssignments = examinerDailyAssignments.get(afterDate);
            
            return (beforeAssignments != null && beforeAssignments.containsKey(teacherId)) ||
                   (afterAssignments != null && afterAssignments.containsKey(teacherId));
        } catch (Exception e) {
            return false;
        }
    }
    /**
     * 检查考官是否在晚班
     */
    private boolean isTeacherOnNightShift(Teacher teacher, DutySchedule dutySchedule) {
        String group = teacher.getGroup();
        return dutySchedule != null && group != null && group.equals(dutySchedule.getNightShift());
    }
    
    /**
     * 检查考官是否在休息第一天
     */
    private boolean isTeacherOnFirstRestDay(Teacher teacher, DutySchedule dutySchedule) {
        String group = teacher.getGroup();
        List<String> restGroups = dutySchedule != null ? dutySchedule.getRestGroups() : null;
        return restGroups != null && !restGroups.isEmpty() && group != null && group.equals(restGroups.get(0));
    }
    
    /**
     * 检查考官是否在休息第二天
     */
    private boolean isTeacherOnSecondRestDay(Teacher teacher, DutySchedule dutySchedule) {
        String group = teacher.getGroup();
        List<String> restGroups = dutySchedule != null ? dutySchedule.getRestGroups() : null;
        return restGroups != null && restGroups.size() > 1 && group != null && group.equals(restGroups.get(1));
    }
    
    /**
     * 获取考官当前工作量
     */
    private int getTeacherCurrentWorkload(Teacher teacher, Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {
        int count = 0;
        String teacherId = String.valueOf(teacher.getId());
        for (Map<String, ExaminerAssignmentDetail> dateMap : examinerDailyAssignments.values()) {
            if (dateMap.containsKey(teacherId)) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * 获取学员的推荐科室（用于SC2、SC4）
     * @deprecated 已废弃。现在使用Student对象的getExaminer2RecommendedDepartments()方法
     * 该方法使用硬编码规则，不如使用Student对象中实际的推荐科室字段
     */
    @Deprecated
    @SuppressWarnings("unused")
    private List<String> getRecommendedDepartments(String studentDept) {
        // 根据业务规则返回推荐科室
        List<String> recommended = new ArrayList<>();
        
        // 示例规则：每个科室都有2个推荐科室
        switch (studentDept) {
            case "一":
                recommended.add("区域五室");
                recommended.add("区域六室");
                break;
            case "二":
                recommended.add("区域四室");
                recommended.add("区域六室");
                break;
            case "三":
                recommended.add("区域五室");
                recommended.add("区域七室");
                break;
            case "四":
                recommended.add("区域二室");
                recommended.add("区域六室");
                break;
            case "五":
                recommended.add("区域一室");
                recommended.add("区域三室");
                break;
            case "六":
                recommended.add("区域一室");
                recommended.add("区域二室");
                break;
            case "七":
                recommended.add("区域三室");
                recommended.add("区域五室");
                break;
        }
        
        return recommended;
    }
    
    /**
     * 考官候选者（用于排序）
     */
    private static class TeacherCandidate {
        Teacher teacher;
        int priority;
        
        TeacherCandidate(Teacher teacher, int priority) {
            this.teacher = teacher;
            this.priority = priority;
        }
    }
    
    /**
     * 内部类：考官分配详情
     * 用于跟踪考官在特定日期的分配情况（角色和学员信息）
     */
    private static class ExaminerAssignmentDetail {
        @SuppressWarnings("unused")
        String studentId;
        String studentName;
        String role;  // "examiner1", "examiner2", "backup"
        
        ExaminerAssignmentDetail(String studentId, String studentName, String role) {
            this.studentId = studentId;
            this.studentName = studentName;
            this.role = role;
        }
        
        @Override
        public String toString() {
            return studentName + "-" + role;
        }
    }
    
    /**
     * ⭐ HC4：检查考官在指定日期是否可用（改进版）
     * 不仅检查是否被分配，还区分角色
     */
    private boolean isExaminerAvailable(Teacher teacher, String date, Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {
        if (teacher == null || date == null) return false;
        
        // 初始化日期映射
        if (!examinerDailyAssignments.containsKey(date)) {
            examinerDailyAssignments.put(date, new HashMap<>());
        }
        
        String teacherId = String.valueOf(teacher.getId());
        Map<String, ExaminerAssignmentDetail> dateMap = examinerDailyAssignments.get(date);
        
        // 检查该考官是否已被分配（无论什么角色）
        boolean available = !dateMap.containsKey(teacherId);
        
        // 🔍 添加调试日志
        if (!available) {
            ExaminerAssignmentDetail detail = dateMap.get(teacherId);
            LOGGER.fine("⚠️ [HC4检查] 考官 " + teacher.getName() + " 在 " + date + 
                       " 已被分配为" + detail.role + " (学员:" + detail.studentName + ")，跳过");
        }
        
        return available;
    }
    
    /**
     * ⭐ HC4：标记考官在指定日期已被分配（改进版，包含角色和学员信息）
     */
    private void markExaminerAsAssigned(Teacher teacher, String date, Student student, String role,
                                       Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {
        if (teacher == null || date == null || student == null) return;
        
        // 初始化日期映射
        if (!examinerDailyAssignments.containsKey(date)) {
            examinerDailyAssignments.put(date, new HashMap<>());
        }
        
        String teacherId = String.valueOf(teacher.getId());
        Map<String, ExaminerAssignmentDetail> dateMap = examinerDailyAssignments.get(date);
        
        // 创建分配详情
        ExaminerAssignmentDetail detail = new ExaminerAssignmentDetail(
            String.valueOf(student.getId()),
            student.getName(),
            role
        );
        
        // 检查是否已存在（这是错误情况）
        if (dateMap.containsKey(teacherId)) {
            ExaminerAssignmentDetail existing = dateMap.get(teacherId);
            LOGGER.severe("🚨 [HC4冲突] 考官 " + teacher.getName() + " (ID:" + teacherId + ") 在 " + date + 
                         " 已经被标记过！");
            LOGGER.severe("    已有分配: 学员=" + existing.studentName + ", 角色=" + existing.role);
            LOGGER.severe("    新分配: 学员=" + student.getName() + ", 角色=" + role);
            LOGGER.severe("    ⚠️ 这表示HC4约束检查逻辑存在Bug，需要立即修复！");
        } else {
            dateMap.put(teacherId, detail);
            LOGGER.fine("✅ [HC4标记] 考官 " + teacher.getName() + " (ID:" + teacherId + ") 在 " + date + 
                       " 被标记为 " + role + " (学员:" + student.getName() + ")");
        }
    }
    
    /**
     * ⭐ HC4：取消标记考官在指定日期的分配（改进版）
     * 用于回滚操作，当Day2分配失败时释放Day1的标记
     */
    private void unmarkExaminerAsAssigned(Teacher teacher, String date, 
                                         Map<String, Map<String, ExaminerAssignmentDetail>> examinerDailyAssignments) {
        if (teacher == null || date == null) return;
        if (!examinerDailyAssignments.containsKey(date)) {
            return;
        }
        
        String teacherId = String.valueOf(teacher.getId());
        Map<String, ExaminerAssignmentDetail> dateMap = examinerDailyAssignments.get(date);
        
        ExaminerAssignmentDetail removed = dateMap.remove(teacherId);
        
        if (removed != null) {
            LOGGER.info("🔄 [HC4回滚] 考官 " + teacher.getName() + " (ID:" + teacherId + ") 在 " + date + 
                       " 的标记已被取消 (原角色:" + removed.role + ", 学员:" + removed.studentName + ")");
        } else {
            LOGGER.warning("⚠️ [HC4回滚] 考官 " + teacher.getName() + " (ID:" + teacherId + ") 在 " + date + 
                          " 没有被标记过，无需取消");
        }
    }
    
    /**
     * 🔧 随机分配考官（当智能分配失败时的fallback）
     * 虽然可能不满足约束，但至少给OptaPlanner一个非null的起点
     * OptaPlanner会在求解过程中调整这些分配以满足所有约束
     * 
     * 注意：此方法已不再使用，但保留以备将来需要
     */
    @SuppressWarnings("unused")
    private Teacher[] assignRandomTeachers(Student student, List<Teacher> teachers) {
        if (teachers == null || teachers.isEmpty()) {
            return null;
        }
        
        Teacher[] result = new Teacher[3];
        String studentDept = normalizeDepartment(student.getDepartment());
        
        LOGGER.warning("🎲 随机分配考官给学员: " + student.getName() + " (科室:" + studentDept + ")");
        
        // 🔧 [HC2修复] 严格遵守HC2约束：只分配符合科室规则的考官1
        // 尝试找一个同科室的作为考官1（或符合3室7室互通规则）
        for (Teacher teacher : teachers) {
            if (isValidExaminer1Department(studentDept, normalizeDepartment(teacher.getDepartment()))) {
                result[0] = teacher;
                LOGGER.info("✅ [HC2] 找到符合科室规则的考官1: " + teacher.getName() + " (科室:" + teacher.getDepartment() + ")");
                break;
            }
        }
        
        // 🚨 [HC2修复] 如果找不到符合HC2的考官1，直接返回null，不生成违反约束的初始解
        if (result[0] == null) {
            LOGGER.severe("🚨 [HC2] 严重错误：无法为学员 " + student.getName() + " (科室:" + studentDept + ") 找到符合HC2约束的考官1！");
            LOGGER.severe("💡 [HC2] 建议：检查是否有足够的" + studentDept + "室考官，或考虑3室7室互通规则");
            LOGGER.severe("⚠️ [HC2] 该学员将被跳过，不生成初始解，避免HC2违反");
            return null; // 🔧 关键修复：返回null而不是部分填充的数组
        }
        
        // 找一个不同的作为考官2
        for (Teacher teacher : teachers) {
            if (!teacher.equals(result[0])) {
                result[1] = teacher;
                break;
            }
        }
        
        // 找一个不同的作为备份
        for (Teacher teacher : teachers) {
            if (!teacher.equals(result[0]) && !teacher.equals(result[1])) {
                result[2] = teacher;
                break;
            }
        }
        
        LOGGER.info("✅ 随机分配完成: 考官1=" + result[0].getName() +
                   ", 考官2=" + (result[1] != null ? result[1].getName() : "null") +
                   ", 备份=" + (result[2] != null ? result[2].getName() : "null"));
        
        return result;
    }
    
    /**
     * 🎯 智能预分配考官方法
     * 🔧 修复：集成班组轮换算法，基于科室规则和班组状态为学员预分配最合适的考官组合
     * 
     * ⚠️ 注意：此方法已被 intelligentPreAssignExaminersWithConflictCheck 替代
     * 保留此方法以备将来参考或特殊用途
     * 
     * @param student 学员
     * @param teachers 考官列表  
     * @param availableDates 可用日期
     * @return 预分配的考官数组 [考官1, 考官2, 备份考官]
     */
    @SuppressWarnings("unused")  // 此方法已被新版本替代，但保留以备将来使用
    private Teacher[] intelligentPreAssignExaminers(Student student, List<Teacher> teachers, List<String> availableDates) {
        Teacher[] result = new Teacher[3]; // [考官1, 考官2, 备份考官]
        String studentDept = normalizeDepartment(student.getDepartment());
        
        LOGGER.info("🎯 开始为学员 " + student.getName() + " (科室:" + studentDept + ") 智能预分配考官");
        
        // 🔧 获取学员适合的考试日期（非白班执勤日）
        String bestExamDate = findBestExamDateForStudent(student, availableDates);
        if (bestExamDate == null) {
            LOGGER.warning("⚠️ 学员 " + student.getName() + " 没有合适的考试日期");
            return result;
        }
        
        // 🔧 获取该日期的班组轮换状态
        DutySchedule dutySchedule = DutySchedule.forDate(bestExamDate);
        LOGGER.info("📅 选择考试日期: " + bestExamDate + " (白班:" + dutySchedule.getDayShift() + 
                    ", 晚班:" + dutySchedule.getNightShift() + ", 休息:" + dutySchedule.getRestGroups() + ")");
        
        // 🔍 第一步：寻找考官1（同科室或三七室互通，且非白班执勤）
        for (Teacher teacher : teachers) {
            if (result[0] != null) break;
            
            String teacherDept = normalizeDepartment(teacher.getDepartment());
            if (isValidExaminer1Department(studentDept, teacherDept) && 
                isTeacherAvailableOnDate(teacher, dutySchedule)) {
                result[0] = teacher;
                LOGGER.info("✅ 找到合适考官1: " + teacher.getName() + " (科室:" + teacherDept + 
                           ", 班组:" + teacher.getGroup() + ")");
                break;
            }
        }
        
        // 🔍 第二步：寻找考官2（异科室，优先晚班或休息班组）
        // 🔧 修复：不再找到第一个就用，而是按优先级选择最佳考官
        Teacher bestExaminer2 = null;
        int bestExaminer2Priority = -1;
        
        for (Teacher teacher : teachers) {
            if (teacher.equals(result[0])) continue; // 不能与考官1重复
            
            String teacherDept = normalizeDepartment(teacher.getDepartment());
            if (!studentDept.equals(teacherDept) && 
                (result[0] == null || !teacherDept.equals(normalizeDepartment(result[0].getDepartment()))) &&
                isTeacherAvailableOnDate(teacher, dutySchedule)) {
                
                // 🔧 计算考官优先级：晚班100 > 休息第一天80 > 休息第二天60 > 其他10
                int priority = calculateTeacherPriority(teacher, dutySchedule);
                
                if (priority > bestExaminer2Priority) {
                    bestExaminer2 = teacher;
                    bestExaminer2Priority = priority;
                    LOGGER.info("🎯 发现更优考官2候选: " + teacher.getName() + " (科室:" + teacherDept + 
                               ", 班组:" + teacher.getGroup() + ", 优先级:" + priority + ")");
                }
            }
        }
        
        if (bestExaminer2 != null) {
            result[1] = bestExaminer2;
            LOGGER.info("✅ 最终选择考官2: " + bestExaminer2.getName() + " (优先级:" + bestExaminer2Priority + ")");
        }
        
        // 🔍 第三步：寻找备份考官（不同于考官1和考官2，优先晚班或休息班组）
        // 🔧 修复：按优先级选择最佳备份考官
        Teacher bestBackup = null;
        int bestBackupPriority = -1;
        
        for (Teacher teacher : teachers) {
            if (teacher.equals(result[0]) || teacher.equals(result[1])) continue;
            
            if (isTeacherAvailableOnDate(teacher, dutySchedule)) {
                int priority = calculateTeacherPriority(teacher, dutySchedule);
                
                if (priority > bestBackupPriority) {
                    bestBackup = teacher;
                    bestBackupPriority = priority;
                    LOGGER.info("🎯 发现更优备份考官候选: " + teacher.getName() + " (科室:" + 
                               normalizeDepartment(teacher.getDepartment()) + ", 班组:" + teacher.getGroup() + 
                               ", 优先级:" + priority + ")");
                }
            }
        }
        
        if (bestBackup != null) {
            result[2] = bestBackup;
            LOGGER.info("✅ 最终选择备份考官: " + bestBackup.getName() + " (优先级:" + bestBackupPriority + ")");
        }
        
        // 📊 预分配结果统计
        int successCount = 0;
        if (result[0] != null) successCount++;
        if (result[1] != null) successCount++;
        if (result[2] != null) successCount++;
        
        LOGGER.info("📊 学员 " + student.getName() + " 预分配完成: " + successCount + "/3 个考官已分配");
        
        return result;
    }
    
    /**
     * ✅ 检查学员是否在指定日期为白班执勤
     * @param studentGroup 学员班组
     * @param examDate 考试日期
     * @return true=白班执勤不能考试, false=可以考试
     */
    private boolean isStudentOnDayShift(String studentGroup, String examDate) {
        if (studentGroup == null || examDate == null) {
            return false; // 没有班组信息，默认可以考试
        }
        
        try {
            // 使用DutySchedule获取该日期的白班班组
            DutySchedule dutySchedule = DutySchedule.forDate(examDate);
            String dayShiftGroup = dutySchedule.getDayShift();
            
            // 判断学员班组是否为白班班组
            boolean isDayShift = studentGroup.equals(dayShiftGroup);
            
            if (isDayShift) {
                String msg = "🚨 [白班检查] 日期:" + examDate + " 白班班组:" + dayShiftGroup + 
                           " 学员班组:" + studentGroup + " → 是白班执勤日，需跳过";
                System.err.println(msg);
                LOGGER.info(msg);
            } else {
                System.err.println("✅ [白班检查] 日期:" + examDate + " 白班:" + dayShiftGroup + 
                                 " 学员:" + studentGroup + " → 可以考试");
            }
            
            return isDayShift;
        } catch (Exception e) {
            LOGGER.warning("⚠️ 白班检查失败: " + examDate + " - " + e.getMessage());
            return false; // 发生异常，默认可以考试
        }
    }
    
    /**
     * 科室名称标准化
     */
    private String normalizeDepartment(String department) {
        if (department == null) return null;
        
        String normalized = department.trim();
        
        // 🔧 v7.1.2: 优先精确匹配单字符（已标准化的情况）
        if (normalized.equals("一") || normalized.equals("1")) return "一";
        if (normalized.equals("二") || normalized.equals("2")) return "二";
        if (normalized.equals("三") || normalized.equals("3")) return "三";
        if (normalized.equals("四") || normalized.equals("4")) return "四";
        if (normalized.equals("五") || normalized.equals("5")) return "五";
        if (normalized.equals("六") || normalized.equals("6")) return "六";
        if (normalized.equals("七") || normalized.equals("7")) return "七";
        if (normalized.equals("八") || normalized.equals("8")) return "八";
        if (normalized.equals("九") || normalized.equals("9")) return "九";
        if (normalized.equals("十") || normalized.equals("10")) return "十";
        
        // 标准化映射（与前端保持完全一致，包括"第X科室"格式）
        if (normalized.contains("区域一室") || normalized.contains("一室") || normalized.contains("1室") || normalized.contains("第1科室")) return "一";
        if (normalized.contains("区域二室") || normalized.contains("二室") || normalized.contains("2室") || normalized.contains("第2科室")) return "二";
        if (normalized.contains("区域三室") || normalized.contains("三室") || normalized.contains("3室") || normalized.contains("第3科室")) return "三";
        if (normalized.contains("区域四室") || normalized.contains("四室") || normalized.contains("4室") || normalized.contains("第4科室")) return "四";
        if (normalized.contains("区域五室") || normalized.contains("五室") || normalized.contains("5室") || normalized.contains("第5科室")) return "五";
        if (normalized.contains("区域六室") || normalized.contains("六室") || normalized.contains("6室") || normalized.contains("第6科室")) return "六";
        if (normalized.contains("区域七室") || normalized.contains("七室") || normalized.contains("7室") || normalized.contains("第7科室")) return "七";
        if (normalized.contains("区域八室") || normalized.contains("八室") || normalized.contains("8室") || normalized.contains("第8科室")) return "八";
        if (normalized.contains("区域九室") || normalized.contains("九室") || normalized.contains("9室") || normalized.contains("第9科室")) return "九";
        if (normalized.contains("区域十室") || normalized.contains("十室") || normalized.contains("10室") || normalized.contains("第10科室")) return "十";
        
        return normalized;
    }
    
    /**
     * ✅ 验证并修复最终解的HC4约束：每名考官每天只能监考一名考生
     * 如果发现违反，将重复分配的考官设置为null（让前端知道需要手动分配）
     * @return 修复的违反数量
     */
    private int validateAndFixHC4ConstraintInFinalSolution(List<ExamAssignment> assignments) {
        LOGGER.info("🔍 [HC4最终验证] 开始验证最终解的HC4约束并尝试自动修复");
        
        // Map<日期, Map<考官ID, List<assignment和角色>>>
        Map<String, Map<String, List<AssignmentRole>>> dailyExaminerAssignments = new HashMap<>();
        int violationCount = 0;
        int fixedCount = 0;
        
        // 第一遍：收集所有分配
        for (ExamAssignment assignment : assignments) {
            String date = assignment.getExamDate();
            if (date == null) continue;
            
            dailyExaminerAssignments.putIfAbsent(date, new HashMap<>());
            Map<String, List<AssignmentRole>> dateMap = dailyExaminerAssignments.get(date);
            
            // 记录考官1
            if (assignment.getExaminer1() != null) {
                String examiner1Id = String.valueOf(assignment.getExaminer1().getId());
                dateMap.putIfAbsent(examiner1Id, new ArrayList<>());
                dateMap.get(examiner1Id).add(new AssignmentRole(assignment, "考官1", assignment.getExaminer1().getName()));
            }
            
            // 记录考官2
            if (assignment.getExaminer2() != null) {
                String examiner2Id = String.valueOf(assignment.getExaminer2().getId());
                dateMap.putIfAbsent(examiner2Id, new ArrayList<>());
                dateMap.get(examiner2Id).add(new AssignmentRole(assignment, "考官2", assignment.getExaminer2().getName()));
            }
            
            // 记录备份考官
            if (assignment.getBackupExaminer() != null) {
                String backupId = String.valueOf(assignment.getBackupExaminer().getId());
                dateMap.putIfAbsent(backupId, new ArrayList<>());
                dateMap.get(backupId).add(new AssignmentRole(assignment, "备份", assignment.getBackupExaminer().getName()));
            }
        }
        
        // 第二遍：检测并修复违反
        for (Map.Entry<String, Map<String, List<AssignmentRole>>> dateEntry : dailyExaminerAssignments.entrySet()) {
            String date = dateEntry.getKey();
            Map<String, List<AssignmentRole>> examinerMap = dateEntry.getValue();
            
            for (Map.Entry<String, List<AssignmentRole>> examinerEntry : examinerMap.entrySet()) {
                String examinerId = examinerEntry.getKey();
                List<AssignmentRole> roles = examinerEntry.getValue();
                
                if (roles.size() > 1) {
                    violationCount++;
                    String examinerName = roles.get(0).examinerName;
                    
                    LOGGER.severe("🚨 [HC4违反-最终解] 日期:" + date + ", 考官:" + examinerName + 
                                " (ID:" + examinerId + ") 被分配了" + roles.size() + "次:");
                    
                    for (AssignmentRole role : roles) {
                        String studentName = role.assignment.getStudent() != null ? 
                            role.assignment.getStudent().getName() : "未知";
                        LOGGER.severe("    - " + studentName + " 的 " + role.role);
                    }
                    
                    // 🔧 修复策略：保留第一个分配，清空其他分配
                    // 保留考官1的分配（最重要），其次是考官2，最后是备份
                    roles.sort((a, b) -> {
                        int priorityA = getRolePriority(a.role);
                        int priorityB = getRolePriority(b.role);
                        return Integer.compare(priorityA, priorityB);
                    });
                    
                    AssignmentRole toKeep = roles.get(0);
                    LOGGER.info("    ✅ 保留: " + (toKeep.assignment.getStudent() != null ? 
                               toKeep.assignment.getStudent().getName() : "未知") + " 的 " + toKeep.role);
                    
                    // 清空其他分配
                    for (int i = 1; i < roles.size(); i++) {
                        AssignmentRole toRemove = roles.get(i);
                        ExamAssignment assignment = toRemove.assignment;
                        String role = toRemove.role;
                        
                        switch (role) {
                            case "考官1":
                                assignment.setExaminer1(null);
                                break;
                            case "考官2":
                                assignment.setExaminer2(null);
                                break;
                            case "备份":
                                assignment.setBackupExaminer(null);
                                break;
                        }
                        
                        fixedCount++;
                        LOGGER.warning("    🔧 已清空: " + (assignment.getStudent() != null ? 
                                     assignment.getStudent().getName() : "未知") + " 的 " + role);
                    }
                }
            }
        }
        
        if (violationCount > 0) {
            LOGGER.severe("🚨 [HC4最终验证] 发现 " + violationCount + " 个HC4约束违反");
            LOGGER.warning("⚠️ [HC4修复] 已清空 " + fixedCount + " 个重复的考官分配");
            LOGGER.warning("⚠️ [用户提示] 这些学员的考官需要手动重新分配！");
        } else {
            LOGGER.info("✅ [HC4最终验证] 最终解满足HC4约束，没有考官重复分配");
        }
        
        return fixedCount;
    }
    
    /**
     * 获取角色的优先级（用于决定保留哪个分配）
     * 考官1最重要（优先级最高=1），其次是考官2，最后是备份
     */
    private int getRolePriority(String role) {
        switch (role) {
            case "考官1": return 1;  // 最高优先级
            case "考官2": return 2;
            case "备份": return 3;
            default: return 999;
        }
    }
    
    /**
     * 辅助类：记录assignment和角色
     */
    private static class AssignmentRole {
        ExamAssignment assignment;
        String role;
        String examinerName;
        
        AssignmentRole(ExamAssignment assignment, String role, String examinerName) {
            this.assignment = assignment;
            this.role = role;
            this.examinerName = examinerName;
        }
    }
    
    /**
     * 🔧 彻底去重：移除重复的assignment
     * 去重规则：同一个学员+同一个日期+同一个考试类型 = 重复
     * 如果有重复，保留第一个
     */
    private List<ExamAssignment> deduplicateAssignments(List<ExamAssignment> assignments) {
        Map<String, ExamAssignment> uniqueMap = new java.util.LinkedHashMap<>();
        int duplicateCount = 0;
        
        for (ExamAssignment assignment : assignments) {
            if (assignment == null || assignment.getStudent() == null) {
                continue;
            }
            
            // 生成唯一键：学员ID + 考试日期 + 考试类型
            String studentId = String.valueOf(assignment.getStudent().getId());
            String examDate = assignment.getExamDate() != null ? assignment.getExamDate() : "UNKNOWN";
            String examType = assignment.getExamType() != null ? assignment.getExamType() : "UNKNOWN";
            String uniqueKey = studentId + "_" + examDate + "_" + examType;
            
            if (uniqueMap.containsKey(uniqueKey)) {
                duplicateCount++;
                LOGGER.warning("🔍 [去重] 发现重复assignment: 学员=" + assignment.getStudent().getName() + 
                             ", 日期=" + examDate + 
                             ", 类型=" + examType +
                             ", ID=" + assignment.getId());
            } else {
                uniqueMap.put(uniqueKey, assignment);
            }
        }
        
        if (duplicateCount > 0) {
            LOGGER.warning("⚠️ [去重] 总共发现 " + duplicateCount + " 个重复的assignment");
            LOGGER.info("✅ [去重] 去重后保留 " + uniqueMap.size() + " 个唯一assignment");
        } else {
            LOGGER.info("✅ [去重] 没有发现重复的assignment");
        }
        
        return new ArrayList<>(uniqueMap.values());
    }
    
    /**
     * ✅ 验证初始解的HC4约束：每名考官每天只能监考一名考生
     * 检查是否有考官在同一天被分配了多次（仅报告，不修复）
     */
    private void validateHC4Constraint(List<ExamAssignment> assignments) {
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [HC4验证] 开始验证初始解的HC4约束（每名考官每天只能监考一名考生）");
        
        // Map<日期, Map<考官ID, List<分配详情>>>
        Map<String, Map<String, List<String>>> dailyExaminerAssignments = new HashMap<>();
        int violationCount = 0;
        
        for (ExamAssignment assignment : assignments) {
            String date = assignment.getExamDate();
            if (date == null) continue;
            
            dailyExaminerAssignments.putIfAbsent(date, new HashMap<>());
            Map<String, List<String>> dateMap = dailyExaminerAssignments.get(date);
            
            String studentName = assignment.getStudent() != null ? assignment.getStudent().getName() : "未知";
            
            // 检查考官1
            if (assignment.getExaminer1() != null) {
                String examiner1Id = String.valueOf(assignment.getExaminer1().getId());
                String examiner1Name = assignment.getExaminer1().getName();
                dateMap.putIfAbsent(examiner1Id, new ArrayList<>());
                dateMap.get(examiner1Id).add(studentName + "(考官1)");
                
                if (dateMap.get(examiner1Id).size() > 1) {
                    LOGGER.severe("🚨 [HC4违反-初始解] 日期:" + date + ", 考官:" + examiner1Name + 
                                " 被分配了" + dateMap.get(examiner1Id).size() + "次: " + 
                                String.join(", ", dateMap.get(examiner1Id)));
                    violationCount++;
                }
            }
            
            // 检查考官2
            if (assignment.getExaminer2() != null) {
                String examiner2Id = String.valueOf(assignment.getExaminer2().getId());
                String examiner2Name = assignment.getExaminer2().getName();
                dateMap.putIfAbsent(examiner2Id, new ArrayList<>());
                dateMap.get(examiner2Id).add(studentName + "(考官2)");
                
                if (dateMap.get(examiner2Id).size() > 1) {
                    LOGGER.severe("🚨 [HC4违反-初始解] 日期:" + date + ", 考官:" + examiner2Name + 
                                " 被分配了" + dateMap.get(examiner2Id).size() + "次: " + 
                                String.join(", ", dateMap.get(examiner2Id)));
                    violationCount++;
                }
            }
            
            // 检查备份考官
            if (assignment.getBackupExaminer() != null) {
                String backupId = String.valueOf(assignment.getBackupExaminer().getId());
                String backupName = assignment.getBackupExaminer().getName();
                dateMap.putIfAbsent(backupId, new ArrayList<>());
                dateMap.get(backupId).add(studentName + "(备份)");
                
                if (dateMap.get(backupId).size() > 1) {
                    LOGGER.severe("🚨 [HC4违反-初始解] 日期:" + date + ", 考官:" + backupName + 
                                " 被分配了" + dateMap.get(backupId).size() + "次: " + 
                                String.join(", ", dateMap.get(backupId)));
                    violationCount++;
                }
            }
        }
        
        if (violationCount > 0) {
            LOGGER.severe("🚨🚨🚨 [HC4验证失败] 初始解存在 " + violationCount + " 个HC4约束违反！");
            LOGGER.severe("   这表示初始解生成逻辑存在Bug，需要修复！");
        } else {
            LOGGER.info("✅ [HC4验证通过] 初始解满足HC4约束，没有考官在同一天被重复分配");
        }
        
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
    
    /**
     * 🔍 资源可用性诊断
     * 分析学员、考官、日期的分布情况，帮助定位约束违反的原因
     */
    private void diagnoseResourceAvailability(
            List<Student> students, 
            List<Teacher> teachers, 
            List<String> availableDates,
            List<ExamAssignment> assignments) {
        
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [资源诊断] 开始分析资源分布情况");
        
        // 1. 学员科室分布
        Map<String, Integer> studentDeptCount = new java.util.HashMap<>();
        for (Student student : students) {
            String dept = normalizeDepartment(student.getDepartment());
            studentDeptCount.put(dept, studentDeptCount.getOrDefault(dept, 0) + 1);
        }
        LOGGER.info("📊 [学员科室分布] 总计" + students.size() + "名学员");
        for (Map.Entry<String, Integer> entry : studentDeptCount.entrySet()) {
            LOGGER.info("   - " + entry.getKey() + "室: " + entry.getValue() + "名");
        }
        
        // 2. 考官科室分布
        Map<String, Integer> teacherDeptCount = new java.util.HashMap<>();
        for (Teacher teacher : teachers) {
            String dept = normalizeDepartment(teacher.getDepartment());
            teacherDeptCount.put(dept, teacherDeptCount.getOrDefault(dept, 0) + 1);
        }
        LOGGER.info("📊 [考官科室分布] 总计" + teachers.size() + "名考官");
        for (Map.Entry<String, Integer> entry : teacherDeptCount.entrySet()) {
            LOGGER.info("   - " + entry.getKey() + "室: " + entry.getValue() + "名");
        }
        
        // 3. 资源充足性分析
        LOGGER.info("📊 [资源充足性分析]");
        for (Map.Entry<String, Integer> entry : studentDeptCount.entrySet()) {
            String dept = entry.getKey();
            int studentCount = entry.getValue();
            int teacherCount = teacherDeptCount.getOrDefault(dept, 0);
            int requiredTeachers = studentCount * 2; // 每个学员2天，每天需要1个考官1
            
            if (teacherCount < requiredTeachers) {
                LOGGER.severe("⚠️ [资源不足] " + dept + "室：需要至少" + requiredTeachers + 
                            "名考官（" + studentCount + "名学员×2天），但只有" + teacherCount + "名");
            } else {
                LOGGER.info("✅ [资源充足] " + dept + "室：" + studentCount + "名学员，" + 
                          teacherCount + "名考官（充足）");
            }
        }
        
        // 4. 日期使用分析
        LOGGER.info("📊 [日期范围] " + availableDates.size() + "个可用日期");
        LOGGER.info("   起始: " + availableDates.get(0));
        LOGGER.info("   结束: " + availableDates.get(availableDates.size() - 1));
        
        // 5. 初始解统计
        LOGGER.info("📊 [初始解统计] 成功分配" + assignments.size() + "个考试");
        int expectedAssignments = students.size() * 2; // 每个学员2天
        if (assignments.size() < expectedAssignments) {
            LOGGER.severe("⚠️ [初始解不完整] 预期" + expectedAssignments + "个，实际" + 
                        assignments.size() + "个，缺少" + (expectedAssignments - assignments.size()) + "个");
            LOGGER.severe("   这意味着某些学员无法找到符合HC2约束的考官1");
            LOGGER.severe("   可能原因: 1.该科室考官不足 2.白班执勤冲突 3.考官时间冲突");
        }
        
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
    
    /**
     * 验证考官1科室是否有效（只允许同科室或三七室互通）
     */
    private boolean isValidExaminer1Department(String studentDept, String examiner1Dept) {
        if (studentDept == null || examiner1Dept == null) return false;
        
        // 同科室（优先匹配）
        if (studentDept.equals(examiner1Dept)) {
            return true;
        }
        
        // 三室七室互通（特殊规则）
        if ((studentDept.equals("三") && examiner1Dept.equals("七")) ||
            (studentDept.equals("七") && examiner1Dept.equals("三"))) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 构建排班响应结果
     */
    public ScheduleResponse buildScheduleResponse(ExamSchedule solution) {
        ScheduleResponse response = new ScheduleResponse();
        
        // 设置基本信息
        response.setSuccess(true);
        response.setScore(solution.getScore());
        
        // 设置分配结果
        List<ExamAssignment> assignments = solution.getExamAssignments();
        
        // 🔧 **第一步：彻底去重（按学员+日期+考试类型）**
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [去重检查] 开始检查并去除重复的assignment...");
        List<ExamAssignment> deduplicatedAssignments = deduplicateAssignments(assignments);
        if (deduplicatedAssignments.size() < assignments.size()) {
            LOGGER.warning("⚠️ [去重] 移除了 " + (assignments.size() - deduplicatedAssignments.size()) + " 个重复的assignment");
        }
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        // 使用去重后的列表
        assignments = deduplicatedAssignments;
        
        // ✅ 关键：在返回前再次验证并尝试修复HC4约束违反
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [最终验证] 对求解后的solution进行HC4约束最终验证和修复");
        int hc4ViolationsFixed = validateAndFixHC4ConstraintInFinalSolution(assignments);
        if (hc4ViolationsFixed > 0) {
            LOGGER.warning("⚠️ [最终验证] 修复了 " + hc4ViolationsFixed + " 个HC4约束违反");
        }
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        response.setAssignments(assignments);
        
        // 分配统计
        OptimizedConstraintConfiguration constraintConfig = solution.getConstraintConfiguration();
        long completeAssignments = assignments.stream()
                .mapToLong(assignment -> isAssignmentComplete(assignment, constraintConfig) ? 1 : 0)
                .sum();
        
        // 🔍 详细诊断：列出所有不完整的assignment
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [分配完整性检查] 总数=" + assignments.size() + ", 完整=" + completeAssignments);
        int incompleteIndex = 1;
        for (ExamAssignment assignment : assignments) {
            if (!isAssignmentComplete(assignment, constraintConfig)) {
                LOGGER.severe("❌ [不完整#" + incompleteIndex + "] ID=" + assignment.getId() + 
                            " | 学员=" + (assignment.getStudent() != null ? assignment.getStudent().getName() : "NULL") +
                            " | 日期=" + assignment.getExamDate() +
                            " | 考官1=" + (assignment.getExaminer1() != null ? assignment.getExaminer1().getName() : "NULL") +
                            " | 考官2=" + (assignment.getExaminer2() != null ? assignment.getExaminer2().getName() : "NULL") +
                            " | 备份=" + (assignment.getBackupExaminer() != null ? assignment.getBackupExaminer().getName() : "NULL"));
                incompleteIndex++;
            }
        }
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        response.setTotalAssignments(assignments.size());
        response.setCompleteAssignments((int) completeAssignments);
        response.setIncompleteAssignments(assignments.size() - (int) completeAssignments);
        
        // 构建并设置统计数据
        ScheduleResponse.ScheduleStatistics statistics = new ScheduleResponse.ScheduleStatistics();
        
        // 设置基本统计
        statistics.setTotalStudents(assignments.size() / 2); // 每个学员有两次考试
        statistics.setAssignedStudents((int) completeAssignments / 2);
        statistics.setCompletionPercentage(assignments.isEmpty() ? 0 : (double) completeAssignments / assignments.size() * 100);
        
        // 🔍 先验证约束违反情况，获取准确的违反数量
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        LOGGER.info("🔍 [约束验证] 开始验证最终解的约束情况...");
        int hc2ViolationCount = 0;
        List<ScheduleResponse.ConstraintViolation> conflictDetails = new ArrayList<>();

        List<Teacher> allTeachers = solution.getTeachers() != null ? solution.getTeachers() : java.util.Collections.emptyList();
        Map<String, java.util.Set<String>> teacherAssignedDatesIndex = buildTeacherAssignedDatesIndex(assignments);
        
        for (ExamAssignment assignment : assignments) {
            if (assignment.getStudent() != null && 
                assignment.getExaminer1() != null && 
                assignment.getExaminer2() != null) {
                
                String studentName = assignment.getStudent().getName();
                // #region agent log - 追踪原始科室数据
                String studentDeptRaw = assignment.getStudent().getDepartment();
                String examiner1DeptRaw = assignment.getExaminer1().getDepartment();
                String examiner2DeptRaw = assignment.getExaminer2().getDepartment();
                // #endregion
                String studentDept = normalizeDepartment(studentDeptRaw);
                String examiner1Name = assignment.getExaminer1().getName();
                String examiner1Dept = normalizeDepartment(examiner1DeptRaw);
                String examiner2Name = assignment.getExaminer2().getName();
                String examiner2Dept = normalizeDepartment(examiner2DeptRaw);
                String examDate = assignment.getExamDate();
                
                // #region agent log - 输出原始和标准化科室数据用于调试 (使用WARNING级别确保输出)
                // 输出字节信息帮助诊断编码问题
                String e1RawBytes = examiner1DeptRaw != null ? java.util.Arrays.toString(examiner1DeptRaw.getBytes(java.nio.charset.StandardCharsets.UTF_8)) : "null";
                String e2RawBytes = examiner2DeptRaw != null ? java.util.Arrays.toString(examiner2DeptRaw.getBytes(java.nio.charset.StandardCharsets.UTF_8)) : "null";
                LOGGER.warning("[DEBUG-HC2] Student:" + studentName + " rawDept=[" + studentDeptRaw + "] normalized=[" + studentDept + "]");
                LOGGER.warning("[DEBUG-HC2] Examiner1:" + examiner1Name + " rawDept=[" + examiner1DeptRaw + "] rawBytes=" + e1RawBytes + " normalized=[" + examiner1Dept + "]");
                LOGGER.warning("[DEBUG-HC2] Examiner2:" + examiner2Name + " rawDept=[" + examiner2DeptRaw + "] rawBytes=" + e2RawBytes + " normalized=[" + examiner2Dept + "]");
                LOGGER.warning("[DEBUG-HC2] COMPARE: e1Dept=[" + examiner1Dept + "] e2Dept=[" + examiner2Dept + "] equals=" + examiner1Dept.equals(examiner2Dept));
                // #endregion
                
                // 检查考官1是否与学员同科室（或三七互通）
                boolean examiner1Valid = isValidExaminer1Department(studentDept, examiner1Dept);
                
                // 检查考官2是否与学员不同科室
                boolean examiner2Valid = !studentDept.equals(examiner2Dept);
                
                // 检查两个考官是否来自不同科室
                boolean differentExaminers = !examiner1Dept.equals(examiner2Dept);
                
                if (!examiner1Valid || !examiner2Valid || !differentExaminers) {
                    hc2ViolationCount++;
                    LOGGER.severe("🚨 [HC2违反] 学员: " + studentName + " (" + studentDept + "), " +
                                "日期: " + examDate + ", " +
                                "考官1: " + examiner1Name + " (" + examiner1Dept + ") " + 
                                (examiner1Valid ? "✅" : "❌") + ", " +
                                "考官2: " + examiner2Name + " (" + examiner2Dept + ") " +
                                (examiner2Valid ? "✅" : "❌") + ", " +
                                "考官间: " + (differentExaminers ? "✅异科室" : "❌同科室"));

                    ScheduleResponse.ConstraintViolation conflict = new ScheduleResponse.ConstraintViolation();
                    conflict.setType("hard");
                    conflict.setConstraint("HC2");
                    conflict.setSeverity("high");
                    conflict.setDescription(
                            "HC2违反: 学员(" + studentName + "/" + studentDept + "), 日期(" + examDate + "), " +
                                    "考官1(" + examiner1Name + "/" + examiner1Dept + "), " +
                                    "考官2(" + examiner2Name + "/" + examiner2Dept + ")"
                    );
                    conflict.setAffectedEntities(java.util.Arrays.asList(
                            "student=" + studentName,
                            "date=" + examDate,
                            "examiner1=" + examiner1Name,
                            "examiner2=" + examiner2Name
                    ));

                    CandidateFeasibility feasibility = analyzeExaminer1Feasibility(
                            assignment.getStudent(),
                            examDate,
                            allTeachers,
                            teacherAssignedDatesIndex
                    );

                    String feasibilityMsg = "可行性诊断: 同科室考官1候选=" + feasibility.candidateCount +
                            " (同科室匹配=" + feasibility.sameDeptMatchCount +
                            ", 白班排除=" + feasibility.excludedDayShift +
                            ", 不可用排除=" + feasibility.excludedUnavailable +
                            ", 已占用排除=" + feasibility.excludedAlreadyAssigned +
                            ", 科室无效排除=" + feasibility.excludedInvalidDept + ")";

                    String baseSuggestion;
                    if (feasibility.candidateCount <= 0) {
                        baseSuggestion = "该日期可能没有任何可用的同科室考官1，属于资源不可满足。建议: 增加该科室考官/调整不可用期/调整白班执勤或放宽规则，或扩大可排日期范围。";
                    } else {
                        baseSuggestion = "该日期存在可用同科室考官1，但求解结果仍违约。建议: 提高求解时间或更换求解模式(standard/precise)以确保找到0hard可行解；同时检查是否有其他硬约束把候选全部挤占。";
                    }

                    String candidatesPreview = feasibility.candidateNamesPreview != null && !feasibility.candidateNamesPreview.isEmpty()
                            ? (" 候选示例: " + String.join("、", feasibility.candidateNamesPreview))
                            : "";

                    conflict.setSuggestion(baseSuggestion + " " + feasibilityMsg + candidatesPreview);
                    conflictDetails.add(conflict);
                } else {
                    LOGGER.fine("✅ [HC2合规] 学员: " + studentName + " (" + studentDept + "), " +
                              "考官1: " + examiner1Name + " (" + examiner1Dept + "), " +
                              "考官2: " + examiner2Name + " (" + examiner2Dept + ")");
                }
            }
        }

        if (!conflictDetails.isEmpty()) {
            response.setConflicts(conflictDetails);
        }
        
        if (hc2ViolationCount > 0) {
            LOGGER.severe("🚨🚨🚨 [HC2验证失败] 最终解存在 " + hc2ViolationCount + " 个HC2约束违反！");
            LOGGER.severe("🚨 这表示后端约束检查逻辑存在严重Bug，或数据在求解后被意外修改！");
        } else {
            LOGGER.info("✅ [HC2验证通过] 所有分配都满足HC2约束");
        }
        LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // ✅ HC2是硬约束：如果违反，不能当作成功排班结果返回
        if (hc2ViolationCount > 0) {
            response.setSuccess(false);
        }
        
        // 🔧 修复：使用实际的约束违反数量，而不是得分的绝对值
        // 设置得分信息
        if (solution.getScore() != null) {
            HardSoftScore score = solution.getScore();
            statistics.setFinalScore(score);
            
            // ✅ 使用实际验证得到的违反数量（目前只有HC2验证，后续可扩展其他约束）
            // 注意：hardScore是得分（带权重），不是违反数量！
            // 例如：21个违反 × 权重(-4) = -84分
            statistics.setHardConstraintViolations(hc2ViolationCount);
            statistics.setSoftConstraintsScore(score.softScore());
            
            LOGGER.info("📊 [统计信息] 硬约束违反数: " + hc2ViolationCount + " (得分: " + score.hardScore() + ")");
        }
        
        response.setStatistics(statistics);
        
        // 设置消息
        if (solution.getScore() != null) {
            HardSoftScore score = solution.getScore();
            if (score.hardScore() < 0 || hc2ViolationCount > 0) {
                response.setSuccess(false);
                response.setMessage("排班完成，但存在硬约束违规 (HC2考官1科室不匹配: " + hc2ViolationCount + "个, 硬约束得分: " + score.hardScore() + ")");
            } else {
                response.setMessage("排班成功完成 (得分: " + score + ")");
            }
        } else {
            response.setMessage("排班计算完成");
        }
        
        LOGGER.info("构建响应完成: 总分配=" + assignments.size() + 
                   ", 完整分配=" + completeAssignments + 
                   ", 硬约束违反=" + hc2ViolationCount +
                   ", 得分=" + solution.getScore());
        
        return response;
    }

    private static Map<String, java.util.Set<String>> buildTeacherAssignedDatesIndex(List<ExamAssignment> assignments) {
        Map<String, java.util.Set<String>> index = new java.util.HashMap<>();
        if (assignments == null) {
            return index;
        }
        for (ExamAssignment a : assignments) {
            if (a == null || a.getExamDate() == null) {
                continue;
            }
            String date = a.getExamDate();
            if (a.getExaminer1() != null && a.getExaminer1().getId() != null) {
                index.computeIfAbsent(a.getExaminer1().getId(), k -> new java.util.HashSet<>()).add(date);
            }
            if (a.getExaminer2() != null && a.getExaminer2().getId() != null) {
                index.computeIfAbsent(a.getExaminer2().getId(), k -> new java.util.HashSet<>()).add(date);
            }
            if (a.getBackupExaminer() != null && a.getBackupExaminer().getId() != null) {
                index.computeIfAbsent(a.getBackupExaminer().getId(), k -> new java.util.HashSet<>()).add(date);
            }
        }
        return index;
    }

    private static final class CandidateFeasibility {
        private final int candidateCount;
        private final int sameDeptMatchCount;
        private final int excludedDayShift;
        private final int excludedUnavailable;
        private final int excludedAlreadyAssigned;
        private final int excludedInvalidDept;
        private final java.util.List<String> candidateNamesPreview;

        private CandidateFeasibility(
                int candidateCount,
                int sameDeptMatchCount,
                int excludedDayShift,
                int excludedUnavailable,
                int excludedAlreadyAssigned,
                int excludedInvalidDept,
                java.util.List<String> candidateNamesPreview
        ) {
            this.candidateCount = candidateCount;
            this.sameDeptMatchCount = sameDeptMatchCount;
            this.excludedDayShift = excludedDayShift;
            this.excludedUnavailable = excludedUnavailable;
            this.excludedAlreadyAssigned = excludedAlreadyAssigned;
            this.excludedInvalidDept = excludedInvalidDept;
            this.candidateNamesPreview = candidateNamesPreview;
        }
    }

    private CandidateFeasibility analyzeExaminer1Feasibility(
            Student student,
            String examDate,
            List<Teacher> allTeachers,
            Map<String, java.util.Set<String>> teacherAssignedDatesIndex
    ) {
        if (student == null || examDate == null) {
            return new CandidateFeasibility(0, 0, 0, 0, 0, 0, java.util.Collections.emptyList());
        }

        String studentDept = normalizeDepartment(student.getDepartment());
        DutySchedule duty = DutySchedule.forDate(examDate);

        int sameDeptMatch = 0;
        int excludedDayShift = 0;
        int excludedUnavailable = 0;
        int excludedAlreadyAssigned = 0;
        int excludedInvalidDept = 0;

        java.util.List<String> candidateNames = new java.util.ArrayList<>();

        for (Teacher t : allTeachers) {
            if (t == null) {
                continue;
            }

            String teacherDept = normalizeDepartment(t.getDepartment());
            if (studentDept == null || teacherDept == null ||
                    "__INVALID_DEPARTMENT__".equals(studentDept) || "__INVALID_DEPARTMENT__".equals(teacherDept)) {
                excludedInvalidDept++;
                continue;
            }

            if (!isValidExaminer1Department(studentDept, teacherDept)) {
                continue;
            }
            sameDeptMatch++;

            if (t.isUnavailableOnDate(examDate)) {
                excludedUnavailable++;
                continue;
            }

            if (!isTeacherAvailableOnDateNoLog(t, duty)) {
                excludedDayShift++;
                continue;
            }

            String teacherId = t.getId();
            if (teacherId != null) {
                java.util.Set<String> assignedDates = teacherAssignedDatesIndex.get(teacherId);
                if (assignedDates != null && assignedDates.contains(examDate)) {
                    excludedAlreadyAssigned++;
                    continue;
                }
            }

            if (candidateNames.size() < 5) {
                candidateNames.add(t.getName());
            }
        }

        int candidates = sameDeptMatch - excludedUnavailable - excludedDayShift - excludedAlreadyAssigned;
        if (candidates < 0) {
            candidates = 0;
        }

        return new CandidateFeasibility(
                candidates,
                sameDeptMatch,
                excludedDayShift,
                excludedUnavailable,
                excludedAlreadyAssigned,
                excludedInvalidDept,
                candidateNames
        );
    }

    private boolean isTeacherAvailableOnDateNoLog(Teacher teacher, DutySchedule dutySchedule) {
        if (teacher == null || dutySchedule == null) {
            return false;
        }
        if (teacher.isUnavailableOnDate(dutySchedule.getDate())) {
            return false;
        }
        String teacherGroup = teacher.getGroup();
        if (teacherGroup == null || "无".equals(teacherGroup) || "行政班".equals(teacherGroup) || teacherGroup.trim().isEmpty()) {
            return true;
        }
        return !dutySchedule.isGroupOnDayShift(teacherGroup);
    }
    
    @Transactional
    public ScheduleHistory saveScheduleHistory(String scheduleName, ScheduleResponse response) {
        if (response == null) {
            return null;
        }
        try {
            String scheduleData = objectMapper.writeValueAsString(response);
            Integer totalStudents = null;
            Integer scoreHard = null;
            Integer scoreSoft = null;
            if (response.getStatistics() != null) {
                totalStudents = response.getStatistics().getTotalStudents();
            }
            if (response.getScore() != null) {
                scoreHard = response.getScore().hardScore();
                scoreSoft = response.getScore().softScore();
            }
            ScheduleHistory history = new ScheduleHistory(
                scheduleName,
                totalStudents,
                response.getTotalAssignments(),
                response.getCompleteAssignments(),
                scoreHard,
                scoreSoft,
                null,
                scheduleData
            );
            history.persist();
            LOGGER.info("已保存排班历史记录: " + scheduleName + " (ID: " + history.id + ")");
            return history;
        } catch (Exception e) {
            LOGGER.severe("保存排班历史记录失败: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * 检查考官分配是否完整（根据约束配置）
     */
    private boolean isAssignmentComplete(ExamAssignment assignment, OptimizedConstraintConfiguration constraintConfig) {
        if (constraintConfig != null && !constraintConfig.isTwoMainExaminersRequired()) {
            // 如果不要求两名主考官，则只检查是否有考官1
            return assignment.getExaminer1() != null;
        }
        
        // 默认要求两名主考官
        return assignment.getExaminer1() != null && assignment.getExaminer2() != null;
    }
    
    /**
     * 生成时间段
     */
    private List<TimeSlot> generateTimeSlots(String startDate, String endDate) {
        List<TimeSlot> timeSlots = new ArrayList<>();
        
        try {
            LocalDate start = LocalDate.parse(startDate, DateTimeFormatter.ISO_LOCAL_DATE);
            LocalDate end = LocalDate.parse(endDate, DateTimeFormatter.ISO_LOCAL_DATE);
            
            LocalDate current = start;
            int slotId = 1;
            
            while (!current.isAfter(end)) {
                // 使用HolidayConfig统一判断工作日（考虑周末、节假日和调休）
                if (holidayConfig.isWorkingDay(current)) {
                    // 上午时段
                    TimeSlot morningSlot = new TimeSlot();
                    morningSlot.setId((long) slotId++);
                    morningSlot.setDate(current.toString());
                    morningSlot.setTimeRange("08:00-12:00");
                    morningSlot.setPeriod("上午");
                    timeSlots.add(morningSlot);
                    
                    // 下午时段
                    TimeSlot afternoonSlot = new TimeSlot();
                    afternoonSlot.setId((long) slotId++);
                    afternoonSlot.setDate(current.toString());
                    afternoonSlot.setTimeRange("14:00-18:00");
                    afternoonSlot.setPeriod("下午");
                    timeSlots.add(afternoonSlot);
                }
                
                current = current.plusDays(1);
            }
            
        } catch (Exception e) {
            LOGGER.severe("生成时间段时发生错误: " + e.getMessage());
        }
        
        LOGGER.info("生成时间段完成: " + timeSlots.size() + " 个时段");
        return timeSlots;
    }
    
    /**
     * 生成可用日期列表（仅工作日，考虑节假日和调休）
     */
    private List<String> generateAvailableDates(String startDate, String endDate) {
        List<String> availableDates = new ArrayList<>();
        
        try {
            LocalDate start = LocalDate.parse(startDate, DateTimeFormatter.ISO_LOCAL_DATE);
            LocalDate end = LocalDate.parse(endDate, DateTimeFormatter.ISO_LOCAL_DATE);
            
            LocalDate current = start;
            while (!current.isAfter(end)) {
                // ✅ [HC1修复] 严格过滤节假日：先检查是否是节假日，节假日绝对不能考试
                if (holidayConfig.isHoliday(current)) {
                    // 🚫 节假日（包括国庆、春节等），直接跳过
                    LOGGER.fine("⛔ 跳过节假日: " + current);
                    current = current.plusDays(1);
                    continue;
                }
                
                // ✅ 非节假日：工作日或普通周末都可以考试
                if (holidayConfig.isWorkingDay(current)) {
                    // 工作日（含调休）
                    availableDates.add(current.toString());
                    LOGGER.fine("✅ 添加工作日: " + current);
                } else {
                    // 非工作日（普通周末，非节假日）
                    DayOfWeek dayOfWeek = current.getDayOfWeek();
                    if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
                        availableDates.add(current.toString());
                        LOGGER.fine("✅ 添加周末: " + current);
                    }
                }
                current = current.plusDays(1);
            }
            
        } catch (Exception e) {
            LOGGER.severe("生成可用日期时发生错误: " + e.getMessage());
        }
        
        return availableDates;
    }
    
    /**
     * 🔧 智能为学员寻找最佳考试日期（考虑HC6约束和连续两天要求）
     */
    private String findBestExamDateForStudent(Student student, List<String> availableDates) {
        String studentGroup = student.getGroup();
        if (studentGroup == null) {
            // 没有班组信息，返回第一个可用日期
            return availableDates.isEmpty() ? null : availableDates.get(0);
        }
        
        // 🎯 智能搜索：寻找连续两天都不违反HC6约束的日期对
        for (int i = 0; i < availableDates.size() - 1; i++) {
            String firstDate = availableDates.get(i);
            String secondDate = availableDates.get(i + 1);
            
            try {
                LocalDate firstDay = LocalDate.parse(firstDate);
                LocalDate secondDay = LocalDate.parse(secondDate);
                
                // 检查是否连续两天
                if (secondDay.equals(firstDay.plusDays(1))) {
                    DutySchedule firstDuty = DutySchedule.forDate(firstDate);
                    DutySchedule secondDuty = DutySchedule.forDate(secondDate);
                    
                    // 检查两天都不是学员白班执勤日（HC6约束）
                    boolean firstDayOk = !firstDuty.isGroupOnDayShift(studentGroup);
                    boolean secondDayOk = !secondDuty.isGroupOnDayShift(studentGroup);
                    
                    if (firstDayOk && secondDayOk) {
                        LOGGER.info("✅ 学员 " + student.getName() + " 找到最佳连续考试日期: " + firstDate + " -> " + secondDate + " (均非白班执勤日)");
                        return firstDate; // 返回第一天，第二天会自动设置
                    } else {
                        LOGGER.fine("⚠️ 学员 " + student.getName() + " 日期对 " + firstDate + " -> " + secondDate + " 不符合约束: 第一天=" + 
                                    (firstDayOk ? "可用" : "白班冲突") + ", 第二天=" + (secondDayOk ? "可用" : "白班冲突"));
                    }
                }
            } catch (Exception e) {
                LOGGER.warning("⚠️ 无法解析日期对: " + firstDate + " -> " + secondDate);
            }
        }
        
        // 如果找不到完美的连续日期对，寻找单独的非白班日期
        for (String date : availableDates) {
            try {
                DutySchedule dutySchedule = DutySchedule.forDate(date);
                if (!dutySchedule.isGroupOnDayShift(studentGroup)) {
                    LOGGER.info("✅ 学员 " + student.getName() + " 选择次优考试日期: " + date + " (非白班执勤日)");
                    return date;
                }
            } catch (Exception e) {
                LOGGER.warning("⚠️ 无法解析日期: " + date);
            }
        }
        
        // 最后选择：返回第一个可用日期（让约束系统处理冲突）
        String defaultDate = availableDates.isEmpty() ? "无" : availableDates.get(0);
        LOGGER.warning("⚠️ 学员 " + student.getName() + " 无法找到理想考试日期，使用默认日期 " + defaultDate + " (可能违反约束)");
        return availableDates.isEmpty() ? null : availableDates.get(0);
    }
    
    /**
     * 🔧 新增：判断考官在指定日期是否可用（非白班执勤且非行政班限制）
     */
    private boolean isTeacherAvailableOnDate(Teacher teacher, DutySchedule dutySchedule) {
        // 🆕 HC9检查：首先检查考官在该日期是否在不可用期内
        if (teacher.isUnavailableOnDate(dutySchedule.getDate())) {
            String reason = teacher.getUnavailableReason(dutySchedule.getDate());
            LOGGER.warning("❌ [HC9] 考官 " + teacher.getName() + " 在 " + dutySchedule.getDate() + 
                         " 不可用 (原因: " + (reason != null ? reason : "未说明") + ")");
            return false;
        }
        
        String teacherGroup = teacher.getGroup();
        
        // 🔧 修复：行政班考官判断（group为null、"无"或空）
        if (teacherGroup == null || "无".equals(teacherGroup) || "行政班".equals(teacherGroup) || teacherGroup.trim().isEmpty()) {
            return true; // 行政班考官始终可用（如果不在不可用期内）
        }
        
        // 非白班执勤的考官可用（晚班或休息）
        boolean isAvailable = !dutySchedule.isGroupOnDayShift(teacherGroup);
        
        if (isAvailable) {
            if (dutySchedule.isGroupOnNightShift(teacherGroup)) {
                LOGGER.info("🌙 考官 " + teacher.getName() + " 为晚班，优先推荐");
            } else if (dutySchedule.isGroupResting(teacherGroup)) {
                LOGGER.info("😴 考官 " + teacher.getName() + " 为休息班组，可以安排");
            }
        }
        
        return isAvailable;
    }
    
    /**
     * 🔧 新增：计算考官在指定日期的优先级
     * 晚班100 > 休息第一天80 > 休息第二天60 > 行政班40 > 其他10
     */
    private int calculateTeacherPriority(Teacher teacher, DutySchedule dutySchedule) {
        String teacherGroup = teacher.getGroup();
        
        // 🔧 修复：行政班考官判断（group为null、"无"或空）
        if (teacherGroup == null || "无".equals(teacherGroup) || "行政班".equals(teacherGroup) || teacherGroup.trim().isEmpty()) {
            return 40; // 行政班中等优先级
        }
        
        // 晚班最高优先级
        if (dutySchedule.isGroupOnNightShift(teacherGroup)) {
            return 100;
        }
        
        // 休息班组次高优先级
        java.util.List<String> restGroups = dutySchedule.getRestGroups();
        if (restGroups != null && restGroups.size() >= 1 && restGroups.get(0).equals(teacherGroup)) {
            return 80; // 休息第一天
        }
        if (restGroups != null && restGroups.size() >= 2 && restGroups.get(1).equals(teacherGroup)) {
            return 60; // 休息第二天
        }
        
        return 10; // 其他情况（白班或未知）
    }
}

package com.examiner.scheduler.solver;

import org.optaplanner.core.api.score.director.ScoreDirector;
import org.optaplanner.core.impl.phase.custom.CustomPhaseCommand;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.examiner.scheduler.domain.ExamAssignment;
import com.examiner.scheduler.domain.ExamSchedule;
import com.examiner.scheduler.domain.Teacher;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 局部重排自定义阶段命令
 * 
 * 功能：
 * 1. 智能修复未分配的排班
 * 2. 解决日期重复问题
 * 3. 优化考官分配
 * 4. 修复冲突约束
 * 
 * 策略：
 * - 优先修复硬约束违反
 * - 使用贪心算法快速修复
 * - 保护固定排班不被改变
 * 
 * @author System
 * @version 8.0.15
 */
public class PartialRescheduleCustomPhaseCommand implements CustomPhaseCommand<ExamSchedule> {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(PartialRescheduleCustomPhaseCommand.class);
    
    @Override
    public void changeWorkingSolution(ScoreDirector<ExamSchedule> scoreDirector) {
        LOGGER.info("🔧 [局部重排自定义阶段] 开始智能修复");
        
        ExamSchedule schedule = scoreDirector.getWorkingSolution();
        
        // 统计问题
        int unassignedCount = countUnassignedAssignments(schedule);
        int duplicateDateCount = countDuplicateDates(schedule);
        int conflictCount = countConflicts(schedule);
        
        LOGGER.info("📊 [局部重排自定义阶段] 问题统计: 未分配=" + unassignedCount + 
            ", 日期重复=" + duplicateDateCount + ", 冲突=" + conflictCount);
        
        // 修复未分配的排班
        if (unassignedCount > 0) {
            LOGGER.info("🔧 [局部重排自定义阶段] 修复未分配排班");
            fixUnassignedAssignments(scoreDirector, schedule);
        }
        
        // 解决日期重复问题
        if (duplicateDateCount > 0) {
            LOGGER.info("🔧 [局部重排自定义阶段] 解决日期重复");
            fixDuplicateDates(scoreDirector, schedule);
        }
        
        // 优化考官分配
        LOGGER.info("🔧 [局部重排自定义阶段] 优化考官分配");
        optimizeExaminerAssignment(scoreDirector, schedule);
        
        // 修复冲突约束
        if (conflictCount > 0) {
            LOGGER.info("🔧 [局部重排自定义阶段] 修复冲突约束");
            fixConflicts(scoreDirector, schedule);
        }
        
        LOGGER.info("✅ [局部重排自定义阶段] 智能修复完成");
    }
    
    /**
     * 标准化科室名称
     */
    private String normalizeDepartment(String department) {
        if (department == null) return null;
        
        String normalized = department.trim();
        
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
     * 统计未分配的排班
     */
    private int countUnassignedAssignments(ExamSchedule schedule) {
        return (int) schedule.getExamAssignments().stream()
            .filter(a -> !a.isPinned() && !a.isComplete())
            .count();
    }
    
    /**
     * 统计日期重复的排班
     */
    private int countDuplicateDates(ExamSchedule schedule) {
        Map<String, Long> dateCount = schedule.getExamAssignments().stream()
            .filter(a -> a.getExamDate() != null)
            .collect(Collectors.groupingBy(ExamAssignment::getExamDate, Collectors.counting()));
        
        return (int) dateCount.values().stream()
            .filter(count -> count > 1)
            .mapToLong(count -> count - 1)
            .sum();
    }
    
    /**
     * 统计冲突约束
     */
    private int countConflicts(ExamSchedule schedule) {
        // 统计考官冲突
        int examinerConflicts = countExaminerConflicts(schedule);
        
        // 统计科室冲突
        int departmentConflicts = countDepartmentConflicts(schedule);
        
        return examinerConflicts + departmentConflicts;
    }
    
    /**
     * 统计考官冲突
     */
    private int countExaminerConflicts(ExamSchedule schedule) {
        int conflicts = 0;
        
        for (ExamAssignment assignment : schedule.getExamAssignments()) {
            if (assignment.getExamDate() == null) continue;
            
            Teacher examiner1 = assignment.getExaminer1();
            Teacher examiner2 = assignment.getExaminer2();
            Teacher backup = assignment.getBackupExaminer();
            
            if (examiner1 != null && isExaminerBusy(schedule, assignment, examiner1)) {
                conflicts++;
            }
            if (examiner2 != null && isExaminerBusy(schedule, assignment, examiner2)) {
                conflicts++;
            }
            if (backup != null && isExaminerBusy(schedule, assignment, backup)) {
                conflicts++;
            }
        }
        
        return conflicts;
    }
    
    /**
     * 检查考官是否忙碌
     */
    private boolean isExaminerBusy(ExamSchedule schedule, ExamAssignment currentAssignment, Teacher examiner) {
        for (ExamAssignment assignment : schedule.getExamAssignments()) {
            if (assignment == currentAssignment) continue;
            if (assignment.getExamDate() == null) continue;
            if (!assignment.getExamDate().equals(currentAssignment.getExamDate())) continue;
            
            if (examiner.equals(assignment.getExaminer1()) ||
                examiner.equals(assignment.getExaminer2()) ||
                examiner.equals(assignment.getBackupExaminer())) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 统计科室冲突
     */
    private int countDepartmentConflicts(ExamSchedule schedule) {
        int conflicts = 0;
        
        for (ExamAssignment assignment : schedule.getExamAssignments()) {
            if (assignment.getStudent() == null || assignment.getExaminer1() == null) continue;
            
            String studentDept = normalizeDepartment(assignment.getStudent().getDepartment());
            String examiner1Dept = normalizeDepartment(assignment.getExaminer1().getDepartment());
            
            if (!studentDept.equals(examiner1Dept) && 
                !isValidInterconnected(studentDept, examiner1Dept)) {
                conflicts++;
            }
        }
        
        return conflicts;
    }
    
    /**
     * 检查是否是有效的互通科室
     */
    private boolean isValidInterconnected(String dept1, String dept2) {
        return (dept1.equals("三") && dept2.equals("七")) ||
               (dept1.equals("七") && dept2.equals("三"));
    }
    
    /**
     * 修复未分配的排班
     */
    private void fixUnassignedAssignments(ScoreDirector<ExamSchedule> scoreDirector, ExamSchedule schedule) {
        List<ExamAssignment> unassigned = schedule.getExamAssignments().stream()
            .filter(a -> !a.isPinned() && !a.isComplete())
            .collect(Collectors.toList());
        
        LOGGER.info("🔧 [局部重排自定义阶段] 修复 " + unassigned.size() + " 个未分配排班");
        
        for (ExamAssignment assignment : unassigned) {
            if (assignment.getStudent() == null) continue;
            
            String studentDept = normalizeDepartment(assignment.getStudent().getDepartment());
            
            // 分配考官1（同科室）
            if (assignment.getExaminer1() == null) {
                Teacher examiner1 = findBestExaminer1(schedule, assignment, studentDept);
                if (examiner1 != null) {
                    scoreDirector.beforeVariableChanged(assignment, "examiner1");
                    assignment.setExaminer1(examiner1);
                    scoreDirector.afterVariableChanged(assignment, "examiner1");
                    LOGGER.info("  ✅ 分配考官1: " + assignment.getStudentName() + " -> " + examiner1.getName());
                }
            }
            
            // 分配考官2（不同科室）
            if (assignment.getExaminer2() == null) {
                Teacher examiner2 = findBestExaminer2(schedule, assignment, studentDept);
                if (examiner2 != null) {
                    scoreDirector.beforeVariableChanged(assignment, "examiner2");
                    assignment.setExaminer2(examiner2);
                    scoreDirector.afterVariableChanged(assignment, "examiner2");
                    LOGGER.info("  ✅ 分配考官2: " + assignment.getStudentName() + " -> " + examiner2.getName());
                }
            }
            
            // 分配备份考官
            if (assignment.getBackupExaminer() == null) {
                Teacher backup = findBestBackup(schedule, assignment, studentDept);
                if (backup != null) {
                    scoreDirector.beforeVariableChanged(assignment, "backupExaminer");
                    assignment.setBackupExaminer(backup);
                    scoreDirector.afterVariableChanged(assignment, "backupExaminer");
                    LOGGER.info("  ✅ 分配备份考官: " + assignment.getStudentName() + " -> " + backup.getName());
                }
            }
            
            // 分配考试日期
            if (assignment.getExamDate() == null) {
                String bestDate = findBestDate(schedule, assignment);
                if (bestDate != null) {
                    scoreDirector.beforeVariableChanged(assignment, "examDate");
                    assignment.setExamDate(bestDate);
                    scoreDirector.afterVariableChanged(assignment, "examDate");
                    LOGGER.info("  ✅ 分配日期: " + assignment.getStudentName() + " -> " + bestDate);
                }
            }
        }
    }
    
    /**
     * 查找最佳考官1（同科室）
     */
    private Teacher findBestExaminer1(ExamSchedule schedule, ExamAssignment assignment, String studentDept) {
        List<Teacher> candidates = schedule.getTeachers().stream()
            .filter(t -> normalizeDepartment(t.getDepartment()).equals(studentDept))
            .filter(t -> isTeacherAvailable(t, schedule, assignment))
            .sorted(Comparator.comparingInt(Teacher::getWorkload))
            .collect(Collectors.toList());
        
        if (candidates.isEmpty()) {
            LOGGER.warn("  ⚠️ 未找到同科室考官: " + studentDept);
            return null;
        }
        
        return candidates.get(0);
    }
    
    /**
     * 查找最佳考官2（不同科室）
     */
    private Teacher findBestExaminer2(ExamSchedule schedule, ExamAssignment assignment, String studentDept) {
        List<Teacher> candidates = schedule.getTeachers().stream()
            .filter(t -> !normalizeDepartment(t.getDepartment()).equals(studentDept))
            .filter(t -> isTeacherAvailable(t, schedule, assignment))
            .sorted(Comparator.comparingInt(Teacher::getWorkload))
            .collect(Collectors.toList());
        
        if (candidates.isEmpty()) {
            LOGGER.warn("  ⚠️ 未找到不同科室考官");
            return null;
        }
        
        return candidates.get(0);
    }
    
    /**
     * 查找最佳备份考官
     */
    private Teacher findBestBackup(ExamSchedule schedule, ExamAssignment assignment, String studentDept) {
        List<Teacher> candidates = schedule.getTeachers().stream()
            .filter(t -> !normalizeDepartment(t.getDepartment()).equals(studentDept))
            .filter(t -> isTeacherAvailable(t, schedule, assignment))
            .sorted(Comparator.comparingInt(Teacher::getWorkload))
            .collect(Collectors.toList());
        
        if (candidates.isEmpty()) {
            return null;
        }
        
        return candidates.get(0);
    }
    
    /**
     * 检查教师是否可用
     */
    private boolean isTeacherAvailable(Teacher teacher, ExamSchedule schedule, ExamAssignment currentAssignment) {
        String examDate = currentAssignment.getExamDate();
        if (examDate != null) {
            for (ExamAssignment assignment : schedule.getExamAssignments()) {
                if (assignment == currentAssignment) continue;
                if (!examDate.equals(assignment.getExamDate())) continue;
                
                if (teacher.equals(assignment.getExaminer1()) ||
                    teacher.equals(assignment.getExaminer2()) ||
                    teacher.equals(assignment.getBackupExaminer())) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * 查找最佳考试日期
     */
    private String findBestDate(ExamSchedule schedule, ExamAssignment assignment) {
        if (schedule.getAvailableDates() == null || schedule.getAvailableDates().isEmpty()) {
            return null;
        }
        
        Map<String, Integer> dateUsage = new HashMap<>();
        for (ExamAssignment a : schedule.getExamAssignments()) {
            if (a.getExamDate() != null) {
                dateUsage.put(a.getExamDate(), dateUsage.getOrDefault(a.getExamDate(), 0) + 1);
            }
        }
        
        return schedule.getAvailableDates().stream()
            .sorted(Comparator.comparingInt(date -> dateUsage.getOrDefault(date, 0)))
            .findFirst()
            .orElse(null);
    }
    
    /**
     * 解决日期重复问题
     */
    private void fixDuplicateDates(ScoreDirector<ExamSchedule> scoreDirector, ExamSchedule schedule) {
        Map<String, List<ExamAssignment>> dateGroups = schedule.getExamAssignments().stream()
            .filter(a -> a.getExamDate() != null && !a.isPinned())
            .collect(Collectors.groupingBy(ExamAssignment::getExamDate));
        
        for (Map.Entry<String, List<ExamAssignment>> entry : dateGroups.entrySet()) {
            List<ExamAssignment> assignments = entry.getValue();
            if (assignments.size() <= 1) continue;
            
            LOGGER.info("🔧 [局部重排自定义阶段] 修复日期重复: " + entry.getKey() + " (" + assignments.size() + " 个排班)");
            
            for (int i = 1; i < assignments.size(); i++) {
                ExamAssignment assignment = assignments.get(i);
                String newDate = findBestDate(schedule, assignment);
                if (newDate != null && !newDate.equals(assignment.getExamDate())) {
                    scoreDirector.beforeVariableChanged(assignment, "examDate");
                    assignment.setExamDate(newDate);
                    scoreDirector.afterVariableChanged(assignment, "examDate");
                    LOGGER.info("  ✅ 修改日期: " + assignment.getStudentName() + " " + entry.getKey() + " -> " + newDate);
                }
            }
        }
    }
    
    /**
     * 优化考官分配
     */
    private void optimizeExaminerAssignment(ScoreDirector<ExamSchedule> scoreDirector, ExamSchedule schedule) {
        LOGGER.info("🔧 [局部重排自定义阶段] 优化考官分配");
        
        int optimized = 0;
        
        for (ExamAssignment assignment : schedule.getExamAssignments()) {
            if (assignment.isPinned()) continue;
            if (assignment.getStudent() == null) continue;
            
            String studentDept = normalizeDepartment(assignment.getStudent().getDepartment());
            
            // 优化考官1
            if (assignment.getExaminer1() != null) {
                String examiner1Dept = normalizeDepartment(assignment.getExaminer1().getDepartment());
                if (!studentDept.equals(examiner1Dept) && !isValidInterconnected(studentDept, examiner1Dept)) {
                    Teacher betterExaminer1 = findBestExaminer1(schedule, assignment, studentDept);
                    if (betterExaminer1 != null) {
                        scoreDirector.beforeVariableChanged(assignment, "examiner1");
                        assignment.setExaminer1(betterExaminer1);
                        scoreDirector.afterVariableChanged(assignment, "examiner1");
                        optimized++;
                        LOGGER.info("  ✅ 优化考官1: " + assignment.getStudentName() + " -> " + betterExaminer1.getName());
                    }
                }
            }
            
            // 优化考官2
            if (assignment.getExaminer2() != null) {
                String examiner2Dept = normalizeDepartment(assignment.getExaminer2().getDepartment());
                if (studentDept.equals(examiner2Dept)) {
                    Teacher betterExaminer2 = findBestExaminer2(schedule, assignment, studentDept);
                    if (betterExaminer2 != null) {
                        scoreDirector.beforeVariableChanged(assignment, "examiner2");
                        assignment.setExaminer2(betterExaminer2);
                        scoreDirector.afterVariableChanged(assignment, "examiner2");
                        optimized++;
                        LOGGER.info("  ✅ 优化考官2: " + assignment.getStudentName() + " -> " + betterExaminer2.getName());
                    }
                }
            }
        }
        
        LOGGER.info("✅ [局部重排自定义阶段] 优化了 " + optimized + " 个考官分配");
    }
    
    /**
     * 修复冲突约束
     */
    private void fixConflicts(ScoreDirector<ExamSchedule> scoreDirector, ExamSchedule schedule) {
        LOGGER.info("🔧 [局部重排自定义阶段] 修复冲突约束");
        
        int fixed = 0;
        
        for (ExamAssignment assignment : schedule.getExamAssignments()) {
            if (assignment.isPinned()) continue;
            if (assignment.getExamDate() == null) continue;
            
            // 修复考官冲突
            Teacher examiner1 = assignment.getExaminer1();
            if (examiner1 != null && isExaminerBusy(schedule, assignment, examiner1)) {
                Teacher replacement = findReplacementExaminer(schedule, assignment, examiner1);
                if (replacement != null) {
                    scoreDirector.beforeVariableChanged(assignment, "examiner1");
                    assignment.setExaminer1(replacement);
                    scoreDirector.afterVariableChanged(assignment, "examiner1");
                    fixed++;
                    LOGGER.info("  ✅ 修复考官1冲突: " + assignment.getStudentName());
                }
            }
            
            Teacher examiner2 = assignment.getExaminer2();
            if (examiner2 != null && isExaminerBusy(schedule, assignment, examiner2)) {
                Teacher replacement = findReplacementExaminer(schedule, assignment, examiner2);
                if (replacement != null) {
                    scoreDirector.beforeVariableChanged(assignment, "examiner2");
                    assignment.setExaminer2(replacement);
                    scoreDirector.afterVariableChanged(assignment, "examiner2");
                    fixed++;
                    LOGGER.info("  ✅ 修复考官2冲突: " + assignment.getStudentName());
                }
            }
        }
        
        LOGGER.info("✅ [局部重排自定义阶段] 修复了 " + fixed + " 个冲突");
    }
    
    /**
     * 查找替代考官
     */
    private Teacher findReplacementExaminer(ExamSchedule schedule, ExamAssignment assignment, Teacher currentExaminer) {
        String currentDept = normalizeDepartment(currentExaminer.getDepartment());
        
        List<Teacher> candidates = schedule.getTeachers().stream()
            .filter(t -> !t.equals(currentExaminer))
            .filter(t -> normalizeDepartment(t.getDepartment()).equals(currentDept))
            .filter(t -> isTeacherAvailable(t, schedule, assignment))
            .sorted(Comparator.comparingInt(Teacher::getWorkload))
            .collect(Collectors.toList());
        
        return candidates.isEmpty() ? null : candidates.get(0);
    }
}

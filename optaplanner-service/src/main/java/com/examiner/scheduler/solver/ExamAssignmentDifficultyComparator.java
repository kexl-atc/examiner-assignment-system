package com.examiner.scheduler.solver;

import com.examiner.scheduler.domain.ExamAssignment;
import com.examiner.scheduler.domain.Student;

import java.util.Comparator;

/**
 * 考试分配难度比较器
 * 用于确定哪些考试分配更难安排，应优先处理
 * 
 * 性能优化：通过合理的排序，OptaPlanner 可以更快地找到可行解
 * 
 * 排序逻辑（从难到易）：
 * 1. 推荐科室少的学员更难安排（资源受限）
 * 2. 特殊考试类型（day2）需要配对，更难安排
 * 3. 已固定日期的优先处理（减少后续约束冲突）
 */
public class ExamAssignmentDifficultyComparator implements Comparator<ExamAssignment> {
    
    @Override
    public int compare(ExamAssignment a1, ExamAssignment a2) {
        // 1. 优先处理推荐科室配置完整的学员（资源约束更严格）
        int deptConstraintLevel1 = getDepartmentConstraintLevel(a1.getStudent());
        int deptConstraintLevel2 = getDepartmentConstraintLevel(a2.getStudent());
        if (deptConstraintLevel1 != deptConstraintLevel2) {
            return Integer.compare(deptConstraintLevel2, deptConstraintLevel1); // 降序：约束多的优先
        }
        
        // 2. Day2 考试需要与 Day1 配对，更复杂，优先处理
        int examTypeLevel1 = getExamTypeComplexity(a1.getExamType());
        int examTypeLevel2 = getExamTypeComplexity(a2.getExamType());
        if (examTypeLevel1 != examTypeLevel2) {
            return Integer.compare(examTypeLevel2, examTypeLevel1); // 降序：复杂的优先
        }
        
        // 3. 已固定日期的优先处理（可能资源更受限）
        boolean hasDate1 = a1.getExamDate() != null;
        boolean hasDate2 = a2.getExamDate() != null;
        if (hasDate1 != hasDate2) {
            return hasDate1 ? -1 : 1; // 有日期的优先
        }
        
        // 4. 按学员ID排序（保证稳定性）
        String id1 = a1.getStudent() != null ? a1.getStudent().getId() : "";
        String id2 = a2.getStudent() != null ? a2.getStudent().getId() : "";
        return id1.compareTo(id2);
    }
    
    /**
     * 计算学员的科室约束级别
     * 返回值越大，约束越严格，越难安排
     */
    private int getDepartmentConstraintLevel(Student student) {
        if (student == null) {
            return 0;
        }
        
        int level = 0;
        
        // 有推荐考官1科室的 +3
        if (student.getRecommendedExaminer1Dept() != null && !student.getRecommendedExaminer1Dept().isEmpty()) {
            level += 3;
        }
        
        // 有推荐考官2科室的 +2
        if (student.getRecommendedExaminer2Dept() != null && !student.getRecommendedExaminer2Dept().isEmpty()) {
            level += 2;
        }
        
        // 有推荐备份考官科室的 +1
        if (student.getRecommendedBackupDept() != null && !student.getRecommendedBackupDept().isEmpty()) {
            level += 1;
        }
        
        return level;
    }
    
    /**
     * 获取考试类型的复杂度
     */
    private int getExamTypeComplexity(String examType) {
        if ("day2".equals(examType)) {
            return 2; // Day2 需要与 Day1 配对，更复杂
        } else if ("day1".equals(examType)) {
            return 1; // Day1 是基准
        }
        return 0; // 其他或null
    }
}


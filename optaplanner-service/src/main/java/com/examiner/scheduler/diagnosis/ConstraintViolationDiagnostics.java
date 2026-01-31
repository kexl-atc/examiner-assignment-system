package com.examiner.scheduler.diagnosis;

import com.examiner.scheduler.domain.ExamSchedule;
import com.examiner.scheduler.domain.ExamAssignment;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 约束冲突诊断器
 * 分析排班结果中的约束违反情况，给出具体建议
 * 
 * @version 5.5.4
 * @author AI Assistant
 */
public class ConstraintViolationDiagnostics {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(ConstraintViolationDiagnostics.class);
    
    /**
     * 诊断结果
     */
    public static class DiagnosisResult {
        private boolean hasSolution;
        private boolean isFeasible;
        private String overallAssessment;
        private HardSoftScore score;
        private int completionPercentage;
        private List<String> violations;
        private List<String> suggestions;
        
        public DiagnosisResult() {
            this.violations = new ArrayList<>();
            this.suggestions = new ArrayList<>();
        }
        
        // Getters and setters
        public boolean isHasSolution() { return hasSolution; }
        public void setHasSolution(boolean hasSolution) { this.hasSolution = hasSolution; }
        public boolean isFeasible() { return isFeasible; }
        public void setFeasible(boolean feasible) { isFeasible = feasible; }
        public String getOverallAssessment() { return overallAssessment; }
        public void setOverallAssessment(String overallAssessment) { this.overallAssessment = overallAssessment; }
        public HardSoftScore getScore() { return score; }
        public void setScore(HardSoftScore score) { this.score = score; }
        public int getCompletionPercentage() { return completionPercentage; }
        public void setCompletionPercentage(int completionPercentage) { this.completionPercentage = completionPercentage; }
        public List<String> getViolations() { return violations; }
        public void setViolations(List<String> violations) { this.violations = violations; }
        public List<String> getSuggestions() { return suggestions; }
        public void setSuggestions(List<String> suggestions) { this.suggestions = suggestions; }
    }
    
    /**
     * 诊断排班结果
     * 
     * @param schedule 排班结果
     * @return 诊断结果
     */
    public static DiagnosisResult diagnose(ExamSchedule schedule) {
        DiagnosisResult result = new DiagnosisResult();
        
        if (schedule == null) {
            result.setHasSolution(false);
            result.setFeasible(false);
            result.setOverallAssessment("无法获取排班结果");
            result.getViolations().add("❌ 求解器未返回任何结果");
            result.getSuggestions().add("🔧 请检查数据配置是否正确");
            return result;
        }
        
        result.setHasSolution(true);
        
        HardSoftScore score = schedule.getScore();
        result.setScore(score);
        
        List<ExamAssignment> assignments = schedule.getExamAssignments();
        
        if (assignments == null || assignments.isEmpty()) {
            result.setFeasible(false);
            result.setCompletionPercentage(0);
            result.setOverallAssessment("未生成任何排班分配");
            result.getViolations().add("❌ 排班分配列表为空");
            result.getSuggestions().add("🔧 数据可能存在严重冲突，请检查约束配置");
            return result;
        }
        
        // 统计分配完成情况
        long totalAssignments = assignments.size();
        long completedAssignments = assignments.stream()
            .filter(a -> a.getExaminer1() != null || a.getExaminer2() != null || a.getBackupExaminer() != null)
            .count();
        
        int completionPercentage = (int) ((double) completedAssignments / totalAssignments * 100);
        result.setCompletionPercentage(completionPercentage);
        
        LOGGER.info("📊 [诊断] 完成度: {}% ({}/{}), 分数: {}", 
            completionPercentage, completedAssignments, totalAssignments, score);
        
        // 判断是否可行
        boolean isFeasible = score != null && score.isFeasible();
        result.setFeasible(isFeasible);
        
        // 生成总体评估
        if (isFeasible && completionPercentage >= 95) {
            result.setOverallAssessment("✅ 排班成功完成，质量良好");
        } else if (isFeasible && completionPercentage >= 80) {
            result.setOverallAssessment("⚠️ 排班基本完成，但部分分配可能需要手动调整");
        } else if (completionPercentage >= 50) {
            result.setOverallAssessment("⚠️ 排班部分完成，存在较多约束冲突");
        } else {
            result.setOverallAssessment("❌ 排班未能完成，数据可能存在严重约束冲突");
        }
        
        // 分析具体违反情况
        analyzeViolations(result, schedule, completionPercentage);
        
        // 生成建议
        generateSuggestions(result, schedule, completionPercentage, isFeasible);
        
        return result;
    }
    
    /**
     * 分析约束违反情况
     */
    private static void analyzeViolations(DiagnosisResult result, ExamSchedule schedule, int completionPercentage) {
        List<ExamAssignment> assignments = schedule.getExamAssignments();
        
        // 统计未分配的数量
        long unassignedCount = assignments.stream()
            .filter(a -> a.getExaminer1() == null && a.getExaminer2() == null && a.getBackupExaminer() == null)
            .count();
        
        if (unassignedCount > 0) {
            result.getViolations().add(String.format("❌ 有 %d 个排班分配未完成（%d%%）", 
                unassignedCount, (int)((double)unassignedCount / assignments.size() * 100)));
        }
        
        // 统计部分分配的数量（只有1-2个考官的）
        long partiallyAssignedCount = assignments.stream()
            .filter(a -> {
                int assignedCount = 0;
                if (a.getExaminer1() != null) assignedCount++;
                if (a.getExaminer2() != null) assignedCount++;
                if (a.getBackupExaminer() != null) assignedCount++;
                return assignedCount > 0 && assignedCount < 3;
            })
            .count();
        
        if (partiallyAssignedCount > 0) {
            result.getViolations().add(String.format("⚠️ 有 %d 个排班分配不完整（缺少部分考官）", partiallyAssignedCount));
        }
        
        // 分析科室问题
        Map<String, Long> studentsByDept = assignments.stream()
            .filter(a -> a.getStudent() != null && a.getStudent().getDepartment() != null)
            .collect(Collectors.groupingBy(a -> a.getStudent().getDepartment(), Collectors.counting()));
        
        Map<String, Long> unassignedByDept = assignments.stream()
            .filter(a -> a.getStudent() != null && a.getStudent().getDepartment() != null)
            .filter(a -> a.getExaminer1() == null && a.getExaminer2() == null && a.getBackupExaminer() == null)
            .collect(Collectors.groupingBy(a -> a.getStudent().getDepartment(), Collectors.counting()));
        
        for (Map.Entry<String, Long> entry : unassignedByDept.entrySet()) {
            String dept = entry.getKey();
            long unassigned = entry.getValue();
            long total = studentsByDept.getOrDefault(dept, 0L);
            if (unassigned > 0) {
                result.getViolations().add(String.format("⚠️ 科室【%s】: %d/%d 未完成分配", dept, unassigned, total));
            }
        }
        
        // 检查硬约束分数
        HardSoftScore score = schedule.getScore();
        if (score != null && !score.isFeasible()) {
            result.getViolations().add(String.format("❌ 硬约束违反: %d 分", score.hardScore()));
        }
    }
    
    /**
     * 生成改进建议
     */
    private static void generateSuggestions(DiagnosisResult result, ExamSchedule schedule, 
                                           int completionPercentage, boolean isFeasible) {
        
        if (completionPercentage >= 95 && isFeasible) {
            result.getSuggestions().add("✅ 排班质量良好，可以直接使用");
            return;
        }
        
        if (completionPercentage < 50) {
            result.getSuggestions().add("🔧 数据可能存在严重约束冲突，建议：");
            result.getSuggestions().add("   1. 增加考官数量（建议 ≥ 学员数 × 3）");
            result.getSuggestions().add("   2. 检查科室分布，确保每个科室有足够的考官");
            result.getSuggestions().add("   3. 减少考官的不可用时间设置");
            result.getSuggestions().add("   4. 临时禁用\"科室同一性\"或\"行政班\"约束");
            result.getSuggestions().add("   5. 缩短日期范围或减少学员数量");
        } else if (completionPercentage < 80) {
            result.getSuggestions().add("💡 排班部分完成，建议：");
            result.getSuggestions().add("   1. 检查未完成分配的学员所在科室");
            result.getSuggestions().add("   2. 增加相关科室的考官数量");
            result.getSuggestions().add("   3. 调整考官的不可用时间");
            result.getSuggestions().add("   4. 或接受当前结果，手动完成剩余分配");
        } else {
            result.getSuggestions().add("💡 排班基本完成，建议：");
            result.getSuggestions().add("   1. 检查部分分配是否可以接受");
            result.getSuggestions().add("   2. 可以手动调整少量未完成的分配");
            result.getSuggestions().add("   3. 或重新排班并调整约束权重");
        }
        
        // 如果硬约束违反，给出特殊建议
        if (!isFeasible) {
            result.getSuggestions().add("⚠️ 硬约束违反提示：");
            result.getSuggestions().add("   - 可能有考官在同一天被分配了多次");
            result.getSuggestions().add("   - 可能有考官被分配到不可用日期");
            result.getSuggestions().add("   - 建议检查约束配置和数据一致性");
        }
    }
    
    /**
     * 格式化诊断结果为字符串
     * 
     * @param result 诊断结果
     * @return 格式化的字符串
     */
    public static String formatDiagnosis(DiagnosisResult result) {
        StringBuilder sb = new StringBuilder();
        
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        sb.append("📋 排班诊断报告\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        
        sb.append("📊 总体评估:\n");
        sb.append("  ").append(result.getOverallAssessment()).append("\n\n");
        
        sb.append("📈 完成度: ").append(result.getCompletionPercentage()).append("%\n");
        sb.append("📊 分数: ").append(result.getScore()).append("\n");
        sb.append("✅ 可行性: ").append(result.isFeasible() ? "是" : "否").append("\n\n");
        
        if (!result.getViolations().isEmpty()) {
            sb.append("⚠️ 问题列表:\n");
            for (String violation : result.getViolations()) {
                sb.append("  ").append(violation).append("\n");
            }
            sb.append("\n");
        }
        
        if (!result.getSuggestions().isEmpty()) {
            sb.append("💡 改进建议:\n");
            for (String suggestion : result.getSuggestions()) {
                sb.append("  ").append(suggestion).append("\n");
            }
        }
        
        sb.append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        
        return sb.toString();
    }
}


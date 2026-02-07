package com.examiner.scheduler.service;

import com.examiner.scheduler.config.HolidayConfig;
import com.examiner.scheduler.domain.ExamAssignment;
import com.examiner.scheduler.domain.Student;
import com.examiner.scheduler.domain.Teacher;
import com.examiner.scheduler.dto.SchedulingGuidanceDTO;
import com.examiner.scheduler.rest.ScheduleResponse;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * 排班指导信息服务
 * 提供完整的8步提示信息操作流程，帮助用户解决排班问题
 */
@ApplicationScoped
public class SchedulingGuidanceService {
    
    private static final Logger LOGGER = Logger.getLogger(SchedulingGuidanceService.class.getName());
    
    @Inject
    HolidayConfig holidayConfig;
    
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    /**
     * 生成完整的排班指导信息
     */
    public SchedulingGuidanceDTO generateGuidance(
            List<ExamAssignment> assignments,
            List<Student> students,
            List<Teacher> teachers,
            String currentStartDate,
            String currentEndDate,
            ScheduleResponse scheduleResponse) {
        
        SchedulingGuidanceDTO guidance = new SchedulingGuidanceDTO();
        
        // 1. 问题识别
        identifyIssues(guidance, assignments, students, scheduleResponse);
        
        if (!guidance.isHasIssue()) {
            return guidance; // 没有问题，返回空指导
        }
        
        // 2. 资源分析
        ResourceAnalysisResult analysis = analyzeResources(students, teachers, currentStartDate, currentEndDate);
        guidance.setResourceAnalysis(convertToDTO(analysis));
        
        // 3. 生成日期范围推荐
        generateDateRangeRecommendation(guidance, analysis, currentStartDate, currentEndDate);
        
        // 4. 生成解决方案建议
        generateSolutionRecommendation(guidance, analysis);
        
        // 5. 生成操作指引
        generateOperationSteps(guidance);
        
        // 6. 生成预期效果说明
        generateExpectedOutcome(guidance, analysis);
        
        // 7. 生成替代方案
        generateAlternativeSolutions(guidance, analysis);
        
        // 8. 生成确认信息
        generateConfirmationInfo(guidance);
        
        return guidance;
    }
    
    /**
     * 1. 问题识别提示
     */
    private void identifyIssues(SchedulingGuidanceDTO guidance, 
                                List<ExamAssignment> assignments,
                                List<Student> students,
                                ScheduleResponse scheduleResponse) {
        
        int unassignedCount = 0;
        List<String> unassignedStudents = new ArrayList<>();
        
        // 统计未分配的学员
        for (ExamAssignment assignment : assignments) {
            if (assignment.getExaminer1() == null || assignment.getExaminer2() == null) {
                unassignedCount++;
                if (assignment.getStudent() != null) {
                    unassignedStudents.add(assignment.getStudent().getName());
                }
            }
        }
        
        // 检查约束违反
        int constraintViolations = scheduleResponse.getConflicts() != null ? 
                scheduleResponse.getConflicts().size() : 0;
        
        boolean hasUnassigned = unassignedCount > 0;
        boolean hasViolations = constraintViolations > 0;
        
        guidance.setHasIssue(hasUnassigned || hasViolations);
        
        if (!guidance.isHasIssue()) {
            return;
        }
        
        // 确定问题类型和严重程度
        if (hasUnassigned && hasViolations) {
            guidance.setIssueType("UNASSIGNED_AND_VIOLATION");
            guidance.setSeverity("CRITICAL");
            guidance.setIssueTitle("排班未完成且存在约束违反");
            guidance.setIssueDescription(
                String.format("当前排班存在 %d 个未分配项目，同时有 %d 个约束违反。" +
                    "这会影响考试安排的完整性和合规性。", unassignedCount, constraintViolations));
        } else if (hasUnassigned) {
            guidance.setIssueType("UNASSIGNED");
            guidance.setSeverity(unassignedCount > 5 ? "HIGH" : "MEDIUM");
            guidance.setIssueTitle("部分学员未完成排班");
            guidance.setIssueDescription(
                String.format("当前有 %d 个考试安排未完成考官分配。" +
                    "这些学员的考试日期已确定，但缺少主考官或副考官。", unassignedCount));
        } else {
            guidance.setIssueType("CONSTRAINT_VIOLATION");
            guidance.setSeverity(constraintViolations > 3 ? "HIGH" : "MEDIUM");
            guidance.setIssueTitle("排班存在约束违反");
            guidance.setIssueDescription(
                String.format("当前排班存在 %d 个约束违反。" +
                    "虽然所有学员都已分配考官，但部分安排可能不符合最优约束条件。", constraintViolations));
        }
        
        guidance.setAffectedCount(unassignedCount);
        guidance.setAffectedStudents(unassignedStudents.stream().limit(10).collect(Collectors.toList()));
    }
    
    /**
     * 资源分析
     */
    private ResourceAnalysisResult analyzeResources(
            List<Student> students,
            List<Teacher> teachers,
            String startDate,
            String endDate) {
        
        ResourceAnalysisResult result = new ResourceAnalysisResult();
        
        // 基本统计
        result.totalStudents = students.size();
        result.availableTeachers = teachers.size();
        
        // 计算可用日期
        result.currentAvailableDays = calculateAvailableDays(startDate, endDate);
        
        // 计算容量
        // 假设每天上午下午各一场，每场需要2名考官
        int dailyCapacity = result.availableTeachers / 2; // 每天可以安排的学员数
        result.currentCapacity = result.currentAvailableDays * dailyCapacity;
        result.requiredCapacity = result.totalStudents;
        result.capacityGap = result.requiredCapacity - result.currentCapacity;
        
        // 确定瓶颈类型
        if (result.capacityGap > 0) {
            result.bottleneckType = "DATE_RANGE";
        } else if (result.availableTeachers < result.totalStudents * 2) {
            result.bottleneckType = "TEACHER_SHORTAGE";
        } else {
            result.bottleneckType = "CONSTRAINT_CONFLICT";
        }
        
        // 计算所需天数
        result.requiredDays = (int) Math.ceil(result.totalStudents / (double) dailyCapacity);
        
        return result;
    }
    
    /**
     * 3. 生成日期范围推荐
     */
    private void generateDateRangeRecommendation(SchedulingGuidanceDTO guidance,
                                                  ResourceAnalysisResult analysis,
                                                  String currentStartDate,
                                                  String currentEndDate) {
        SchedulingGuidanceDTO.DateRangeRecommendation recommendation = 
            new SchedulingGuidanceDTO.DateRangeRecommendation();
        
        recommendation.setCurrentStartDate(currentStartDate);
        recommendation.setCurrentEndDate(currentEndDate);
        
        // 计算需要扩展的天数
        int extensionDays = Math.max(0, analysis.requiredDays - analysis.currentAvailableDays);
        
        // 如果当前容量足够，但仍有未分配，可能是约束冲突
        if (extensionDays == 0 && analysis.capacityGap <= 0) {
            extensionDays = 3; // 建议至少扩展3天以缓解约束冲突
        }
        
        // 计算推荐日期范围
        LocalDate currentEnd = LocalDate.parse(currentEndDate);
        LocalDate recommendedEnd = currentEnd.plusDays(extensionDays + 2); // 额外加2天缓冲
        
        // 确保推荐日期不超过合理范围（最多扩展14天）
        LocalDate maxEnd = currentEnd.plusDays(14);
        if (recommendedEnd.isAfter(maxEnd)) {
            recommendedEnd = maxEnd;
        }
        
        recommendation.setRecommendedStartDate(currentStartDate); // 保持开始日期不变
        recommendation.setRecommendedEndDate(recommendedEnd.format(DATE_FORMATTER));
        recommendation.setRecommendedExtensionDays((int) ChronoUnit.DAYS.between(currentEnd, recommendedEnd));
        
        // 计算额外可用时段
        int additionalDays = calculateAvailableDays(currentEndDate, recommendation.getRecommendedEndDate());
        recommendation.setAdditionalAvailableSlots(additionalDays * (analysis.availableTeachers / 2) * 2); // 每天2场
        
        // 计算容量增加百分比
        double increasePercent = (recommendation.getAdditionalAvailableSlots() / Math.max(1, analysis.currentCapacity)) * 100;
        recommendation.setCapacityIncreasePercentage(Math.round(increasePercent * 100.0) / 100.0);
        
        // 生成推荐的具体日期列表
        List<String> recommendedDates = new ArrayList<>();
        LocalDate date = currentEnd.plusDays(1);
        while (!date.isAfter(recommendedEnd)) {
            if (!holidayConfig.isHoliday(date)) {
                recommendedDates.add(date.format(DATE_FORMATTER));
            }
            date = date.plusDays(1);
        }
        recommendation.setRecommendedDates(recommendedDates);
        
        // 生成推荐理由
        StringBuilder reasoning = new StringBuilder();
        reasoning.append("基于当前资源分析：\n");
        reasoning.append(String.format("• 当前可用天数：%d天\n", analysis.currentAvailableDays));
        reasoning.append(String.format("• 预计需要天数：%d天\n", analysis.requiredDays));
        reasoning.append(String.format("• 容量缺口：%.0f个考试位\n", analysis.capacityGap));
        reasoning.append(String.format("• 建议扩展：%d天\n", recommendation.getRecommendedExtensionDays()));
        reasoning.append(String.format("• 可增加：%d个考试时段\n", recommendation.getAdditionalAvailableSlots()));
        
        if ("DATE_RANGE".equals(analysis.bottleneckType)) {
            reasoning.append("\n当前考试日期范围不足以容纳所有学员，扩展日期范围是最直接的解决方案。");
        } else if ("CONSTRAINT_CONFLICT".equals(analysis.bottleneckType)) {
            reasoning.append("\n当前日期范围内存在较多约束冲突，扩展日期可以提供更多灵活安排空间。");
        }
        
        recommendation.setReasoning(reasoning.toString());
        
        guidance.setDateRangeRecommendation(recommendation);
    }
    
    /**
     * 4. 生成解决方案建议
     */
    private void generateSolutionRecommendation(SchedulingGuidanceDTO guidance, ResourceAnalysisResult analysis) {
        StringBuilder solution = new StringBuilder();
        StringBuilder explanation = new StringBuilder();
        
        switch (analysis.bottleneckType) {
            case "DATE_RANGE":
                solution.append("扩展考试日期范围");
                explanation.append("当前考试日期范围不足以安排所有学员。通过扩展结束日期，可以增加可用考试时段，");
                explanation.append("使系统有更多选择空间来为每位学员分配合适的考官组合。");
                explanation.append(String.format("建议将结束日期延后 %d 天，这将增加 %d 个可用考试时段。",
                    guidance.getDateRangeRecommendation().getRecommendedExtensionDays(),
                    guidance.getDateRangeRecommendation().getAdditionalAvailableSlots()));
                break;
                
            case "TEACHER_SHORTAGE":
                solution.append("增加可用考官或扩展日期范围");
                explanation.append("当前考官数量相对学员数量偏少。建议：\n");
                explanation.append("1. 检查是否有考官被错误标记为不可用\n");
                explanation.append("2. 考虑将部分学员安排到更晚的日期\n");
                explanation.append("3. 如有条件，可增加临时考官");
                break;
                
            case "CONSTRAINT_CONFLICT":
                solution.append("扩展日期范围并优化约束配置");
                explanation.append("当前日期范围内存在较多约束冲突（如科室匹配、考官不可用期等）。");
                explanation.append("扩展日期范围可以提供更多灵活安排空间，减少冲突概率。");
                break;
                
            default:
                solution.append("重新排班或手动调整");
                explanation.append("建议尝试重新排班，或手动为未分配学员指定考官。");
        }
        
        guidance.setRecommendedSolution(solution.toString());
        guidance.setSolutionExplanation(explanation.toString());
    }
    
    /**
     * 5. 生成操作指引
     */
    private void generateOperationSteps(SchedulingGuidanceDTO guidance) {
        List<SchedulingGuidanceDTO.OperationStep> steps = new ArrayList<>();
        
        steps.add(new SchedulingGuidanceDTO.OperationStep(
            1,
            "进入排班管理页面",
            "点击左侧导航栏的'自动排班'菜单，进入排班管理界面",
            "点击'自动排班'菜单",
            "显示排班管理页面",
            "left-nav-auto-schedule"
        ));
        
        steps.add(new SchedulingGuidanceDTO.OperationStep(
            2,
            "打开日期设置",
            "在排班向导的第2步'选择考试日期'中，查看当前设置的日期范围",
            "点击'上一步'或'选择考试日期'标签",
            "显示日期选择界面",
            "step2-date-selection"
        ));
        
        steps.add(new SchedulingGuidanceDTO.OperationStep(
            3,
            "调整结束日期",
            String.format("将结束日期从 %s 调整为 %s",
                guidance.getDateRangeRecommendation().getCurrentEndDate(),
                guidance.getDateRangeRecommendation().getRecommendedEndDate()),
            "点击结束日期选择器，选择新的日期",
            "结束日期显示为新选择的日期",
            "date-picker-end"
        ));
        
        steps.add(new SchedulingGuidanceDTO.OperationStep(
            4,
            "确认日期范围",
            "检查新的日期范围是否正确，确保包含所有推荐日期",
            "查看日期范围显示",
            "日期范围显示正确",
            "date-range-display"
        ));
        
        steps.add(new SchedulingGuidanceDTO.OperationStep(
            5,
            "重新排班",
            "返回排班结果页面，点击'重新排班'按钮",
            "点击'重新排班'按钮",
            "系统开始重新计算排班",
            "reschedule-button"
        ));
        
        steps.add(new SchedulingGuidanceDTO.OperationStep(
            6,
            "查看结果",
            "等待排班完成，检查是否还有未分配项目",
            "查看排班结果表格",
            "未分配项目减少或消除",
            "schedule-result-table"
        ));
        
        guidance.setOperationSteps(steps);
        guidance.setMenuPath("自动排班 > 排班向导 > 选择考试日期");
        guidance.setButtonLocation("排班向导第2步 - 日期选择区域");
    }
    
    /**
     * 6. 生成预期效果说明
     */
    private void generateExpectedOutcome(SchedulingGuidanceDTO guidance, ResourceAnalysisResult analysis) {
        StringBuilder outcome = new StringBuilder();
        
        outcome.append("调整考试日期范围后，预计可以：\n\n");
        
        // 计算预期改善
        int currentUnassigned = guidance.getAffectedCount();
        int expectedResolved = Math.min(currentUnassigned, 
            guidance.getDateRangeRecommendation().getAdditionalAvailableSlots() / 2);
        
        outcome.append(String.format("✅ 解决约 %d 个未分配项目\n", expectedResolved));
        outcome.append(String.format("✅ 排班完成率从 %.0f%% 提升至 %.0f%%\n",
            (1 - (double)currentUnassigned / analysis.totalStudents) * 100,
            (1 - (double)(currentUnassigned - expectedResolved) / analysis.totalStudents) * 100));
        outcome.append(String.format("✅ 减少 %.0f%% 的约束冲突\n", 
            guidance.getDateRangeRecommendation().getCapacityIncreasePercentage()));
        
        guidance.setExpectedOutcome(outcome.toString());
        
        // 生成收益列表
        List<String> benefits = new ArrayList<>();
        benefits.add("更多可用考试时段，提高排班成功率");
        benefits.add("减少考官时间冲突，优化资源利用");
        benefits.add("降低约束违反概率，提高排班质量");
        benefits.add("为系统提供更多选择空间，生成更优方案");
        guidance.setBenefits(benefits);
        
        // 生成潜在影响
        List<String> impacts = new ArrayList<>();
        impacts.add("考试周期延长，可能影响后续教学安排");
        impacts.add("需要通知相关考官新的考试日期");
        impacts.add("部分学员的考试准备时间增加");
        if (guidance.getDateRangeRecommendation().getRecommendedExtensionDays() > 7) {
            impacts.add("扩展时间较长，建议评估是否可接受");
        }
        guidance.setPotentialImpacts(impacts);
    }
    
    /**
     * 7. 生成替代方案
     */
    private void generateAlternativeSolutions(SchedulingGuidanceDTO guidance, ResourceAnalysisResult analysis) {
        List<SchedulingGuidanceDTO.AlternativeSolution> alternatives = new ArrayList<>();
        
        // 替代方案1：增加考官
        SchedulingGuidanceDTO.AlternativeSolution alt1 = new SchedulingGuidanceDTO.AlternativeSolution();
        alt1.setSolutionId("ADD_TEACHERS");
        alt1.setTitle("增加可用考官");
        alt1.setDescription("检查并添加更多可用考官，或调整现有考官的不可用期设置");
        alt1.setDifficulty("EASY");
        alt1.setExpectedEffectiveness("中等");
        alt1.getSteps().add("进入'考官管理'页面");
        alt1.getSteps().add("检查是否有考官被错误标记为不可用");
        alt1.getSteps().add("调整考官的不可用期设置");
        alt1.getSteps().add("重新进行排班");
        alt1.getPros().add("不延长考试周期");
        alt1.getPros().add("可立即生效");
        alt1.getCons().add("受实际考官数量限制");
        alt1.getCons().add("可能需要协调考官时间");
        alternatives.add(alt1);
        
        // 替代方案2：调整约束权重
        SchedulingGuidanceDTO.AlternativeSolution alt2 = new SchedulingGuidanceDTO.AlternativeSolution();
        alt2.setSolutionId("ADJUST_CONSTRAINTS");
        alt2.setTitle("放宽约束条件");
        alt2.setDescription("临时放宽部分软约束权重，优先保证所有学员都能安排考试");
        alt2.setDifficulty("MEDIUM");
        alt2.setExpectedEffectiveness("高");
        alt2.getSteps().add("进入'约束配置'页面");
        alt2.getSteps().add("降低非关键软约束的权重");
        alt2.getSteps().add("保存配置并重新排班");
        alt2.getSteps().add("排班完成后恢复原始权重");
        alt2.getPros().add("可能在不扩展日期的情况下完成排班");
        alt2.getPros().add("灵活性高");
        alt2.getCons().add("排班质量可能略有下降");
        alt2.getCons().add("需要手动调整约束配置");
        alternatives.add(alt2);
        
        // 替代方案3：分批排班
        SchedulingGuidanceDTO.AlternativeSolution alt3 = new SchedulingGuidanceDTO.AlternativeSolution();
        alt3.setSolutionId("BATCH_SCHEDULING");
        alt3.setTitle("分批安排考试");
        alt3.setDescription("将学员分成多批，优先安排部分学员，剩余学员延后安排");
        alt3.setDifficulty("HARD");
        alt3.setExpectedEffectiveness("高");
        alt3.getSteps().add("导出当前学员列表");
        alt3.getSteps().add("按优先级将学员分为2-3批");
        alt3.getSteps().add("先为第一批次学员排班");
        alt3.getSteps().add("为第一批次固定排班后，为剩余学员排班");
        alt3.getPros().add("可以充分利用现有日期范围");
        alt3.getPros().add("优先保证重要学员的考试安排");
        alt3.getCons().add("操作复杂，需要多次排班");
        alt3.getCons().add("部分学员考试时间会延后较多");
        alternatives.add(alt3);
        
        guidance.setAlternativeSolutions(alternatives);
    }
    
    /**
     * 8. 生成确认信息
     */
    private void generateConfirmationInfo(SchedulingGuidanceDTO guidance) {
        SchedulingGuidanceDTO.ConfirmationInfo confirmation = new SchedulingGuidanceDTO.ConfirmationInfo();
        
        confirmation.setConfirmationTitle("确认调整考试日期范围");
        
        StringBuilder message = new StringBuilder();
        message.append("您即将调整考试日期范围，请确认以下信息：\n\n");
        message.append(String.format("📅 当前结束日期：%s\n", 
            guidance.getDateRangeRecommendation().getCurrentEndDate()));
        message.append(String.format("📅 建议结束日期：%s\n", 
            guidance.getDateRangeRecommendation().getRecommendedEndDate()));
        message.append(String.format("📊 预计增加考试时段：%d个\n", 
            guidance.getDateRangeRecommendation().getAdditionalAvailableSlots()));
        message.append(String.format("⏱️ 考试周期延长：%d天\n", 
            guidance.getDateRangeRecommendation().getRecommendedExtensionDays()));
        
        confirmation.setConfirmationMessage(message.toString());
        
        // 变更摘要
        List<String> changes = new ArrayList<>();
        changes.add(String.format("考试结束日期从 %s 调整为 %s",
            guidance.getDateRangeRecommendation().getCurrentEndDate(),
            guidance.getDateRangeRecommendation().getRecommendedEndDate()));
        changes.add(String.format("考试周期延长 %d 天",
            guidance.getDateRangeRecommendation().getRecommendedExtensionDays()));
        changes.add("系统将基于新的日期范围重新计算排班");
        confirmation.setChangesSummary(changes);
        
        // 风险提示
        List<String> risks = new ArrayList<>();
        risks.add("已固定的排班可能需要重新调整");
        risks.add("需要通知相关考官新的考试日期安排");
        if (guidance.getDateRangeRecommendation().getRecommendedExtensionDays() > 7) {
            risks.add("考试周期延长较多，可能影响后续教学计划");
        }
        confirmation.setRisks(risks);
        
        confirmation.setConfirmButtonText("确认调整并重新排班");
        confirmation.setCancelButtonText("取消，保持当前设置");
        confirmation.setRequiresExplicitConfirmation(true);
        
        guidance.setConfirmationInfo(confirmation);
    }
    
    /**
     * 生成调整后的结果反馈
     */
    public SchedulingGuidanceDTO.ScheduleResultComparison generateResultComparison(
            int beforeUnassigned,
            int afterUnassigned,
            int beforeViolations,
            int afterViolations,
            double beforeCompletionRate,
            double afterCompletionRate) {
        
        SchedulingGuidanceDTO.ScheduleResultComparison comparison = 
            new SchedulingGuidanceDTO.ScheduleResultComparison();
        
        comparison.setBeforeUnassignedCount(beforeUnassigned);
        comparison.setAfterUnassignedCount(afterUnassigned);
        comparison.setBeforeConstraintViolations(beforeViolations);
        comparison.setAfterConstraintViolations(afterViolations);
        comparison.setBeforeCompletionRate(beforeCompletionRate);
        comparison.setAfterCompletionRate(afterCompletionRate);
        
        // 生成改善摘要
        StringBuilder summary = new StringBuilder();
        int resolvedUnassigned = beforeUnassigned - afterUnassigned;
        int resolvedViolations = beforeViolations - afterViolations;
        
        if (resolvedUnassigned > 0) {
            summary.append(String.format("✅ 解决了 %d 个未分配项目\n", resolvedUnassigned));
        }
        if (resolvedViolations > 0) {
            summary.append(String.format("✅ 减少了 %d 个约束违反\n", resolvedViolations));
        }
        if (afterCompletionRate > beforeCompletionRate) {
            summary.append(String.format("✅ 完成率从 %.1f%% 提升至 %.1f%%\n", 
                beforeCompletionRate * 100, afterCompletionRate * 100));
        }
        
        if (resolvedUnassigned == 0 && resolvedViolations == 0) {
            summary.append("⚠️ 调整后排班情况没有明显改善\n");
            summary.append("建议尝试其他解决方案，如增加考官数量或放宽约束条件");
        }
        
        comparison.setImprovementSummary(summary.toString());
        
        // 已解决的问题
        if (resolvedUnassigned > 0) {
            comparison.getResolvedIssues().add(String.format("未分配项目减少 %d 个", resolvedUnassigned));
        }
        if (resolvedViolations > 0) {
            comparison.getResolvedIssues().add(String.format("约束违反减少 %d 个", resolvedViolations));
        }
        
        // 剩余问题
        if (afterUnassigned > 0) {
            comparison.getRemainingIssues().add(String.format("仍有 %d 个未分配项目", afterUnassigned));
        }
        if (afterViolations > 0) {
            comparison.getRemainingIssues().add(String.format("仍有 %d 个约束违反", afterViolations));
        }
        
        return comparison;
    }
    
    // ========== 辅助方法 ==========
    
    private int calculateAvailableDays(String startDate, String endDate) {
        try {
            LocalDate start = LocalDate.parse(startDate);
            LocalDate end = LocalDate.parse(endDate);
            
            int availableDays = 0;
            LocalDate current = start;
            
            while (!current.isAfter(end)) {
                if (!holidayConfig.isHoliday(current)) {
                    availableDays++;
                }
                current = current.plusDays(1);
            }
            
            return availableDays;
        } catch (Exception e) {
            LOGGER.warning("计算可用日期失败: " + e.getMessage());
            return 0;
        }
    }
    
    private SchedulingGuidanceDTO.ResourceAnalysis convertToDTO(ResourceAnalysisResult result) {
        SchedulingGuidanceDTO.ResourceAnalysis dto = new SchedulingGuidanceDTO.ResourceAnalysis();
        dto.setTotalStudents(result.totalStudents);
        dto.setUnassignedStudents((int) result.capacityGap);
        dto.setAvailableTeachers(result.availableTeachers);
        dto.setCurrentAvailableDays(result.currentAvailableDays);
        dto.setRequiredDays(result.requiredDays);
        dto.setCurrentCapacity(result.currentCapacity);
        dto.setRequiredCapacity(result.requiredCapacity);
        dto.setCapacityGap(result.capacityGap);
        dto.setBottleneckType(result.bottleneckType);
        return dto;
    }
    
    // ========== 内部类 ==========
    
    private static class ResourceAnalysisResult {
        int totalStudents;
        int availableTeachers;
        int currentAvailableDays;
        int requiredDays;
        double currentCapacity;
        double requiredCapacity;
        double capacityGap;
        String bottleneckType;
    }
}

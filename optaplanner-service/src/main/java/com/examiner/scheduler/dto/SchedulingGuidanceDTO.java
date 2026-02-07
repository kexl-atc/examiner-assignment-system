package com.examiner.scheduler.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;

/**
 * 排班指导信息DTO
 * 用于向用户提供完整的排班问题解决方案指引
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class SchedulingGuidanceDTO {
    
    // ========== 1. 问题识别提示 ==========
    private boolean hasIssue;
    private String issueType; // "UNASSIGNED", "CONSTRAINT_VIOLATION", "RESOURCE_SHORTAGE"
    private String issueTitle;
    private String issueDescription;
    private int affectedCount;
    private List<String> affectedStudents;
    private String severity; // "LOW", "MEDIUM", "HIGH", "CRITICAL"
    
    // ========== 2. 解决方案建议 ==========
    private String recommendedSolution;
    private String solutionExplanation;
    
    // ========== 3. 数据驱动建议 ==========
    private DateRangeRecommendation dateRangeRecommendation;
    private ResourceAnalysis resourceAnalysis;
    
    // ========== 4. 操作指引 ==========
    private List<OperationStep> operationSteps;
    private String menuPath;
    private String buttonLocation;
    
    // ========== 5. 预期效果说明 ==========
    private String expectedOutcome;
    private List<String> benefits;
    private List<String> potentialImpacts;
    
    // ========== 6. 替代方案 ==========
    private List<AlternativeSolution> alternativeSolutions;
    
    // ========== 7. 确认机制 ==========
    private ConfirmationInfo confirmationInfo;
    
    // ========== 8. 结果反馈 ==========
    private boolean adjustmentMade;
    private String adjustmentResult;
    private ScheduleResultComparison beforeAfterComparison;
    
    // 构造函数
    public SchedulingGuidanceDTO() {
        this.affectedStudents = new ArrayList<>();
        this.operationSteps = new ArrayList<>();
        this.benefits = new ArrayList<>();
        this.potentialImpacts = new ArrayList<>();
        this.alternativeSolutions = new ArrayList<>();
    }
    
    // ========== 内部类定义 ==========
    
    /**
     * 日期范围推荐
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DateRangeRecommendation {
        private String currentStartDate;
        private String currentEndDate;
        private String recommendedStartDate;
        private String recommendedEndDate;
        private int recommendedExtensionDays;
        private int additionalAvailableSlots;
        private double capacityIncreasePercentage;
        private String reasoning;
        private List<String> recommendedDates; // 推荐的具体日期列表
        
        public DateRangeRecommendation() {}
        
        // Getters and Setters
        public String getCurrentStartDate() { return currentStartDate; }
        public void setCurrentStartDate(String currentStartDate) { this.currentStartDate = currentStartDate; }
        
        public String getCurrentEndDate() { return currentEndDate; }
        public void setCurrentEndDate(String currentEndDate) { this.currentEndDate = currentEndDate; }
        
        public String getRecommendedStartDate() { return recommendedStartDate; }
        public void setRecommendedStartDate(String recommendedStartDate) { this.recommendedStartDate = recommendedStartDate; }
        
        public String getRecommendedEndDate() { return recommendedEndDate; }
        public void setRecommendedEndDate(String recommendedEndDate) { this.recommendedEndDate = recommendedEndDate; }
        
        public int getRecommendedExtensionDays() { return recommendedExtensionDays; }
        public void setRecommendedExtensionDays(int recommendedExtensionDays) { this.recommendedExtensionDays = recommendedExtensionDays; }
        
        public int getAdditionalAvailableSlots() { return additionalAvailableSlots; }
        public void setAdditionalAvailableSlots(int additionalAvailableSlots) { this.additionalAvailableSlots = additionalAvailableSlots; }
        
        public double getCapacityIncreasePercentage() { return capacityIncreasePercentage; }
        public void setCapacityIncreasePercentage(double capacityIncreasePercentage) { this.capacityIncreasePercentage = capacityIncreasePercentage; }
        
        public String getReasoning() { return reasoning; }
        public void setReasoning(String reasoning) { this.reasoning = reasoning; }
        
        public List<String> getRecommendedDates() { return recommendedDates; }
        public void setRecommendedDates(List<String> recommendedDates) { this.recommendedDates = recommendedDates; }
    }
    
    /**
     * 资源分析
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ResourceAnalysis {
        private int totalStudents;
        private int unassignedStudents;
        private int availableTeachers;
        private int currentAvailableDays;
        private int requiredDays;
        private double currentCapacity;
        private double requiredCapacity;
        private double capacityGap;
        private String bottleneckType; // "TEACHER_SHORTAGE", "DATE_RANGE", "CONSTRAINT_CONFLICT"
        
        public ResourceAnalysis() {}
        
        // Getters and Setters
        public int getTotalStudents() { return totalStudents; }
        public void setTotalStudents(int totalStudents) { this.totalStudents = totalStudents; }
        
        public int getUnassignedStudents() { return unassignedStudents; }
        public void setUnassignedStudents(int unassignedStudents) { this.unassignedStudents = unassignedStudents; }
        
        public int getAvailableTeachers() { return availableTeachers; }
        public void setAvailableTeachers(int availableTeachers) { this.availableTeachers = availableTeachers; }
        
        public int getCurrentAvailableDays() { return currentAvailableDays; }
        public void setCurrentAvailableDays(int currentAvailableDays) { this.currentAvailableDays = currentAvailableDays; }
        
        public int getRequiredDays() { return requiredDays; }
        public void setRequiredDays(int requiredDays) { this.requiredDays = requiredDays; }
        
        public double getCurrentCapacity() { return currentCapacity; }
        public void setCurrentCapacity(double currentCapacity) { this.currentCapacity = currentCapacity; }
        
        public double getRequiredCapacity() { return requiredCapacity; }
        public void setRequiredCapacity(double requiredCapacity) { this.requiredCapacity = requiredCapacity; }
        
        public double getCapacityGap() { return capacityGap; }
        public void setCapacityGap(double capacityGap) { this.capacityGap = capacityGap; }
        
        public String getBottleneckType() { return bottleneckType; }
        public void setBottleneckType(String bottleneckType) { this.bottleneckType = bottleneckType; }
    }
    
    /**
     * 操作步骤
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OperationStep {
        private int stepNumber;
        private String title;
        private String description;
        private String action;
        private String expectedResult;
        private String screenshotHint; // 前端可以据此显示对应位置的提示
        
        public OperationStep() {}
        
        public OperationStep(int stepNumber, String title, String description, String action) {
            this.stepNumber = stepNumber;
            this.title = title;
            this.description = description;
            this.action = action;
        }
        
        public OperationStep(int stepNumber, String title, String description, String action, 
                            String expectedResult, String screenshotHint) {
            this(stepNumber, title, description, action);
            this.expectedResult = expectedResult;
            this.screenshotHint = screenshotHint;
        }
        
        // Getters and Setters
        public int getStepNumber() { return stepNumber; }
        public void setStepNumber(int stepNumber) { this.stepNumber = stepNumber; }
        
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        
        public String getExpectedResult() { return expectedResult; }
        public void setExpectedResult(String expectedResult) { this.expectedResult = expectedResult; }
        
        public String getScreenshotHint() { return screenshotHint; }
        public void setScreenshotHint(String screenshotHint) { this.screenshotHint = screenshotHint; }
    }
    
    /**
     * 替代方案
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AlternativeSolution {
        private String solutionId;
        private String title;
        private String description;
        private String difficulty; // "EASY", "MEDIUM", "HARD"
        private String expectedEffectiveness;
        private List<String> steps;
        private List<String> pros;
        private List<String> cons;
        
        public AlternativeSolution() {
            this.steps = new ArrayList<>();
            this.pros = new ArrayList<>();
            this.cons = new ArrayList<>();
        }
        
        // Getters and Setters
        public String getSolutionId() { return solutionId; }
        public void setSolutionId(String solutionId) { this.solutionId = solutionId; }
        
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public String getDifficulty() { return difficulty; }
        public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
        
        public String getExpectedEffectiveness() { return expectedEffectiveness; }
        public void setExpectedEffectiveness(String expectedEffectiveness) { this.expectedEffectiveness = expectedEffectiveness; }
        
        public List<String> getSteps() { return steps; }
        public void setSteps(List<String> steps) { this.steps = steps; }
        
        public List<String> getPros() { return pros; }
        public void setPros(List<String> pros) { this.pros = pros; }
        
        public List<String> getCons() { return cons; }
        public void setCons(List<String> cons) { this.cons = cons; }
    }
    
    /**
     * 确认信息
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ConfirmationInfo {
        private String confirmationTitle;
        private String confirmationMessage;
        private List<String> changesSummary;
        private List<String> risks;
        private String confirmButtonText;
        private String cancelButtonText;
        private boolean requiresExplicitConfirmation;
        
        public ConfirmationInfo() {
            this.changesSummary = new ArrayList<>();
            this.risks = new ArrayList<>();
        }
        
        // Getters and Setters
        public String getConfirmationTitle() { return confirmationTitle; }
        public void setConfirmationTitle(String confirmationTitle) { this.confirmationTitle = confirmationTitle; }
        
        public String getConfirmationMessage() { return confirmationMessage; }
        public void setConfirmationMessage(String confirmationMessage) { this.confirmationMessage = confirmationMessage; }
        
        public List<String> getChangesSummary() { return changesSummary; }
        public void setChangesSummary(List<String> changesSummary) { this.changesSummary = changesSummary; }
        
        public List<String> getRisks() { return risks; }
        public void setRisks(List<String> risks) { this.risks = risks; }
        
        public String getConfirmButtonText() { return confirmButtonText; }
        public void setConfirmButtonText(String confirmButtonText) { this.confirmButtonText = confirmButtonText; }
        
        public String getCancelButtonText() { return cancelButtonText; }
        public void setCancelButtonText(String cancelButtonText) { this.cancelButtonText = cancelButtonText; }
        
        public boolean isRequiresExplicitConfirmation() { return requiresExplicitConfirmation; }
        public void setRequiresExplicitConfirmation(boolean requiresExplicitConfirmation) { this.requiresExplicitConfirmation = requiresExplicitConfirmation; }
    }
    
    /**
     * 调整前后对比
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ScheduleResultComparison {
        private int beforeUnassignedCount;
        private int afterUnassignedCount;
        private int beforeConstraintViolations;
        private int afterConstraintViolations;
        private double beforeCompletionRate;
        private double afterCompletionRate;
        private String improvementSummary;
        private List<String> resolvedIssues;
        private List<String> remainingIssues;
        
        public ScheduleResultComparison() {
            this.resolvedIssues = new ArrayList<>();
            this.remainingIssues = new ArrayList<>();
        }
        
        // Getters and Setters
        public int getBeforeUnassignedCount() { return beforeUnassignedCount; }
        public void setBeforeUnassignedCount(int beforeUnassignedCount) { this.beforeUnassignedCount = beforeUnassignedCount; }
        
        public int getAfterUnassignedCount() { return afterUnassignedCount; }
        public void setAfterUnassignedCount(int afterUnassignedCount) { this.afterUnassignedCount = afterUnassignedCount; }
        
        public int getBeforeConstraintViolations() { return beforeConstraintViolations; }
        public void setBeforeConstraintViolations(int beforeConstraintViolations) { this.beforeConstraintViolations = beforeConstraintViolations; }
        
        public int getAfterConstraintViolations() { return afterConstraintViolations; }
        public void setAfterConstraintViolations(int afterConstraintViolations) { this.afterConstraintViolations = afterConstraintViolations; }
        
        public double getBeforeCompletionRate() { return beforeCompletionRate; }
        public void setBeforeCompletionRate(double beforeCompletionRate) { this.beforeCompletionRate = beforeCompletionRate; }
        
        public double getAfterCompletionRate() { return afterCompletionRate; }
        public void setAfterCompletionRate(double afterCompletionRate) { this.afterCompletionRate = afterCompletionRate; }
        
        public String getImprovementSummary() { return improvementSummary; }
        public void setImprovementSummary(String improvementSummary) { this.improvementSummary = improvementSummary; }
        
        public List<String> getResolvedIssues() { return resolvedIssues; }
        public void setResolvedIssues(List<String> resolvedIssues) { this.resolvedIssues = resolvedIssues; }
        
        public List<String> getRemainingIssues() { return remainingIssues; }
        public void setRemainingIssues(List<String> remainingIssues) { this.remainingIssues = remainingIssues; }
    }
    
    // ========== Getters and Setters ==========
    
    public boolean isHasIssue() { return hasIssue; }
    public void setHasIssue(boolean hasIssue) { this.hasIssue = hasIssue; }
    
    public String getIssueType() { return issueType; }
    public void setIssueType(String issueType) { this.issueType = issueType; }
    
    public String getIssueTitle() { return issueTitle; }
    public void setIssueTitle(String issueTitle) { this.issueTitle = issueTitle; }
    
    public String getIssueDescription() { return issueDescription; }
    public void setIssueDescription(String issueDescription) { this.issueDescription = issueDescription; }
    
    public int getAffectedCount() { return affectedCount; }
    public void setAffectedCount(int affectedCount) { this.affectedCount = affectedCount; }
    
    public List<String> getAffectedStudents() { return affectedStudents; }
    public void setAffectedStudents(List<String> affectedStudents) { this.affectedStudents = affectedStudents; }
    
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    
    public String getRecommendedSolution() { return recommendedSolution; }
    public void setRecommendedSolution(String recommendedSolution) { this.recommendedSolution = recommendedSolution; }
    
    public String getSolutionExplanation() { return solutionExplanation; }
    public void setSolutionExplanation(String solutionExplanation) { this.solutionExplanation = solutionExplanation; }
    
    public DateRangeRecommendation getDateRangeRecommendation() { return dateRangeRecommendation; }
    public void setDateRangeRecommendation(DateRangeRecommendation dateRangeRecommendation) { this.dateRangeRecommendation = dateRangeRecommendation; }
    
    public ResourceAnalysis getResourceAnalysis() { return resourceAnalysis; }
    public void setResourceAnalysis(ResourceAnalysis resourceAnalysis) { this.resourceAnalysis = resourceAnalysis; }
    
    public List<OperationStep> getOperationSteps() { return operationSteps; }
    public void setOperationSteps(List<OperationStep> operationSteps) { this.operationSteps = operationSteps; }
    
    public String getMenuPath() { return menuPath; }
    public void setMenuPath(String menuPath) { this.menuPath = menuPath; }
    
    public String getButtonLocation() { return buttonLocation; }
    public void setButtonLocation(String buttonLocation) { this.buttonLocation = buttonLocation; }
    
    public String getExpectedOutcome() { return expectedOutcome; }
    public void setExpectedOutcome(String expectedOutcome) { this.expectedOutcome = expectedOutcome; }
    
    public List<String> getBenefits() { return benefits; }
    public void setBenefits(List<String> benefits) { this.benefits = benefits; }
    
    public List<String> getPotentialImpacts() { return potentialImpacts; }
    public void setPotentialImpacts(List<String> potentialImpacts) { this.potentialImpacts = potentialImpacts; }
    
    public List<AlternativeSolution> getAlternativeSolutions() { return alternativeSolutions; }
    public void setAlternativeSolutions(List<AlternativeSolution> alternativeSolutions) { this.alternativeSolutions = alternativeSolutions; }
    
    public ConfirmationInfo getConfirmationInfo() { return confirmationInfo; }
    public void setConfirmationInfo(ConfirmationInfo confirmationInfo) { this.confirmationInfo = confirmationInfo; }
    
    public boolean isAdjustmentMade() { return adjustmentMade; }
    public void setAdjustmentMade(boolean adjustmentMade) { this.adjustmentMade = adjustmentMade; }
    
    public String getAdjustmentResult() { return adjustmentResult; }
    public void setAdjustmentResult(String adjustmentResult) { this.adjustmentResult = adjustmentResult; }
    
    public ScheduleResultComparison getBeforeAfterComparison() { return beforeAfterComparison; }
    public void setBeforeAfterComparison(ScheduleResultComparison beforeAfterComparison) { this.beforeAfterComparison = beforeAfterComparison; }
}

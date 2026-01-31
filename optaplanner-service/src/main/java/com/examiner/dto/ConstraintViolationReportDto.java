package com.examiner.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;

/**
 * 约束违规报告DTO
 */
@RegisterForReflection
public class ConstraintViolationReportDto {
    
    private String scheduleId;
    private String generatedAt;
    private List<ViolationDetailDto> hardConstraintViolations;
    private List<ViolationDetailDto> softConstraintViolations;
    private ViolationStatisticsDto statistics;
    private List<RepairSuggestionDto> repairSuggestions;
    private int overallScore;

    // 默认构造函数
    public ConstraintViolationReportDto() {}

    // Getter和Setter方法
    public String getScheduleId() {
        return scheduleId;
    }

    public void setScheduleId(String scheduleId) {
        this.scheduleId = scheduleId;
    }

    public String getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(String generatedAt) {
        this.generatedAt = generatedAt;
    }

    public List<ViolationDetailDto> getHardConstraintViolations() {
        return hardConstraintViolations;
    }

    public void setHardConstraintViolations(List<ViolationDetailDto> hardConstraintViolations) {
        this.hardConstraintViolations = hardConstraintViolations;
    }

    public List<ViolationDetailDto> getSoftConstraintViolations() {
        return softConstraintViolations;
    }

    public void setSoftConstraintViolations(List<ViolationDetailDto> softConstraintViolations) {
        this.softConstraintViolations = softConstraintViolations;
    }

    public ViolationStatisticsDto getStatistics() {
        return statistics;
    }

    public void setStatistics(ViolationStatisticsDto statistics) {
        this.statistics = statistics;
    }

    public List<RepairSuggestionDto> getRepairSuggestions() {
        return repairSuggestions;
    }

    public void setRepairSuggestions(List<RepairSuggestionDto> repairSuggestions) {
        this.repairSuggestions = repairSuggestions;
    }

    public int getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(int overallScore) {
        this.overallScore = overallScore;
    }
}
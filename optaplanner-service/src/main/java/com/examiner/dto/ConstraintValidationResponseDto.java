package com.examiner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 约束验证响应DTO
 * 用于后端向前端返回约束配置验证结果
 */
public class ConstraintValidationResponseDto {

    @JsonProperty("isValid")
    private boolean valid;

    @JsonProperty("violations")
    private List<ConstraintViolationDto> violations;

    @JsonProperty("warnings")
    private List<ConstraintWarningDto> warnings;

    @JsonProperty("validationTime")
    private long validationTime;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @JsonProperty("configurationHash")
    private String configurationHash;

    @JsonProperty("conflictDetection")
    private ConstraintConflictDetectionDto conflictDetection;

    @JsonProperty("appliedPreset")
    private String appliedPreset;

    @JsonProperty("dynamicAdjustmentApplied")
    private boolean dynamicAdjustmentApplied;

    @JsonProperty("errorMessage")
    private String errorMessage;

    @JsonProperty("validationSummary")
    private ValidationSummaryDto validationSummary;

    // 构造函数
    public ConstraintValidationResponseDto() {}

    public ConstraintValidationResponseDto(boolean valid, List<ConstraintViolationDto> violations, 
                                         List<ConstraintWarningDto> warnings, long validationTime) {
        this.valid = valid;
        this.violations = violations;
        this.warnings = warnings;
        this.validationTime = validationTime;
        this.timestamp = LocalDateTime.now();
    }

    // Getter和Setter方法
    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public List<ConstraintViolationDto> getViolations() {
        return violations;
    }

    public void setViolations(List<ConstraintViolationDto> violations) {
        this.violations = violations;
    }

    public List<ConstraintWarningDto> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<ConstraintWarningDto> warnings) {
        this.warnings = warnings;
    }

    public long getValidationTime() {
        return validationTime;
    }

    public void setValidationTime(long validationTime) {
        this.validationTime = validationTime;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getConfigurationHash() {
        return configurationHash;
    }

    public void setConfigurationHash(String configurationHash) {
        this.configurationHash = configurationHash;
    }

    public ConstraintConflictDetectionDto getConflictDetection() {
        return conflictDetection;
    }

    public void setConflictDetection(ConstraintConflictDetectionDto conflictDetection) {
        this.conflictDetection = conflictDetection;
    }

    public String getAppliedPreset() {
        return appliedPreset;
    }

    public void setAppliedPreset(String appliedPreset) {
        this.appliedPreset = appliedPreset;
    }

    public boolean isDynamicAdjustmentApplied() {
        return dynamicAdjustmentApplied;
    }

    public void setDynamicAdjustmentApplied(boolean dynamicAdjustmentApplied) {
        this.dynamicAdjustmentApplied = dynamicAdjustmentApplied;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public ValidationSummaryDto getValidationSummary() {
        return validationSummary;
    }

    public void setValidationSummary(ValidationSummaryDto validationSummary) {
        this.validationSummary = validationSummary;
    }

    /**
     * 验证摘要DTO
     */
    public static class ValidationSummaryDto {
        @JsonProperty("totalConstraints")
        private int totalConstraints;

        @JsonProperty("validConstraints")
        private int validConstraints;

        @JsonProperty("invalidConstraints")
        private int invalidConstraints;

        @JsonProperty("criticalViolations")
        private int criticalViolations;

        @JsonProperty("highViolations")
        private int highViolations;

        @JsonProperty("mediumViolations")
        private int mediumViolations;

        @JsonProperty("lowViolations")
        private int lowViolations;

        @JsonProperty("totalWarnings")
        private int totalWarnings;

        @JsonProperty("conflictsDetected")
        private int conflictsDetected;

        @JsonProperty("performanceScore")
        private double performanceScore;

        @JsonProperty("overallHealthScore")
        private double overallHealthScore;

        // 构造函数
        public ValidationSummaryDto() {}

        // Getter和Setter方法
        public int getTotalConstraints() { return totalConstraints; }
        public void setTotalConstraints(int totalConstraints) { this.totalConstraints = totalConstraints; }

        public int getValidConstraints() { return validConstraints; }
        public void setValidConstraints(int validConstraints) { this.validConstraints = validConstraints; }

        public int getInvalidConstraints() { return invalidConstraints; }
        public void setInvalidConstraints(int invalidConstraints) { this.invalidConstraints = invalidConstraints; }

        public int getCriticalViolations() { return criticalViolations; }
        public void setCriticalViolations(int criticalViolations) { this.criticalViolations = criticalViolations; }

        public int getHighViolations() { return highViolations; }
        public void setHighViolations(int highViolations) { this.highViolations = highViolations; }

        public int getMediumViolations() { return mediumViolations; }
        public void setMediumViolations(int mediumViolations) { this.mediumViolations = mediumViolations; }

        public int getLowViolations() { return lowViolations; }
        public void setLowViolations(int lowViolations) { this.lowViolations = lowViolations; }

        public int getTotalWarnings() { return totalWarnings; }
        public void setTotalWarnings(int totalWarnings) { this.totalWarnings = totalWarnings; }

        public int getConflictsDetected() { return conflictsDetected; }
        public void setConflictsDetected(int conflictsDetected) { this.conflictsDetected = conflictsDetected; }

        public double getPerformanceScore() { return performanceScore; }
        public void setPerformanceScore(double performanceScore) { this.performanceScore = performanceScore; }

        public double getOverallHealthScore() { return overallHealthScore; }
        public void setOverallHealthScore(double overallHealthScore) { this.overallHealthScore = overallHealthScore; }
    }

    @Override
    public String toString() {
        return "ConstraintValidationResponseDto{" +
                "valid=" + valid +
                ", violations=" + (violations != null ? violations.size() : 0) +
                ", warnings=" + (warnings != null ? warnings.size() : 0) +
                ", validationTime=" + validationTime +
                ", timestamp=" + timestamp +
                ", configurationHash='" + configurationHash + '\'' +
                ", appliedPreset='" + appliedPreset + '\'' +
                ", dynamicAdjustmentApplied=" + dynamicAdjustmentApplied +
                ", errorMessage='" + errorMessage + '\'' +
                '}';
    }
}
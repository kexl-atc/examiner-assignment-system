package com.examiner.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * 修复进度DTO
 */
@RegisterForReflection
public class RepairProgressDto {
    
    private String jobId;
    private String status;
    private int totalViolations;
    private int processedViolations;
    private int repairedViolations;
    private String currentStep;
    private String estimatedTimeRemaining;

    // 默认构造函数
    public RepairProgressDto() {}

    // Getter和Setter方法
    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getTotalViolations() {
        return totalViolations;
    }

    public void setTotalViolations(int totalViolations) {
        this.totalViolations = totalViolations;
    }

    public int getProcessedViolations() {
        return processedViolations;
    }

    public void setProcessedViolations(int processedViolations) {
        this.processedViolations = processedViolations;
    }

    public int getRepairedViolations() {
        return repairedViolations;
    }

    public void setRepairedViolations(int repairedViolations) {
        this.repairedViolations = repairedViolations;
    }

    public String getCurrentStep() {
        return currentStep;
    }

    public void setCurrentStep(String currentStep) {
        this.currentStep = currentStep;
    }

    public String getEstimatedTimeRemaining() {
        return estimatedTimeRemaining;
    }

    public void setEstimatedTimeRemaining(String estimatedTimeRemaining) {
        this.estimatedTimeRemaining = estimatedTimeRemaining;
    }
}
package com.examiner.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.Map;

/**
 * 违规统计DTO
 */
@RegisterForReflection
public class ViolationStatisticsDto {
    
    private int totalViolations;
    private int hardConstraintViolations;
    private int softConstraintViolations;
    private Map<String, Integer> violationsByType;
    private Map<String, Integer> violationsBySeverity;
    private int criticalCount;
    private int highCount;
    private int mediumCount;
    private int lowCount;
    private Map<String, Integer> constraintViolationCounts;

    // 默认构造函数
    public ViolationStatisticsDto() {}

    // Getter和Setter方法
    public int getTotalViolations() {
        return totalViolations;
    }

    public void setTotalViolations(int totalViolations) {
        this.totalViolations = totalViolations;
    }

    public int getHardConstraintViolations() {
        return hardConstraintViolations;
    }

    public void setHardConstraintViolations(int hardConstraintViolations) {
        this.hardConstraintViolations = hardConstraintViolations;
    }

    public int getSoftConstraintViolations() {
        return softConstraintViolations;
    }

    public void setSoftConstraintViolations(int softConstraintViolations) {
        this.softConstraintViolations = softConstraintViolations;
    }

    public Map<String, Integer> getViolationsByType() {
        return violationsByType;
    }

    public void setViolationsByType(Map<String, Integer> violationsByType) {
        this.violationsByType = violationsByType;
    }

    public Map<String, Integer> getViolationsBySeverity() {
        return violationsBySeverity;
    }

    public void setViolationsBySeverity(Map<String, Integer> violationsBySeverity) {
        this.violationsBySeverity = violationsBySeverity;
    }

    public int getCriticalCount() {
        return criticalCount;
    }

    public void setCriticalCount(int criticalCount) {
        this.criticalCount = criticalCount;
    }

    public int getHighCount() {
        return highCount;
    }

    public void setHighCount(int highCount) {
        this.highCount = highCount;
    }

    public int getMediumCount() {
        return mediumCount;
    }

    public void setMediumCount(int mediumCount) {
        this.mediumCount = mediumCount;
    }

    public int getLowCount() {
        return lowCount;
    }

    public void setLowCount(int lowCount) {
        this.lowCount = lowCount;
    }

    public Map<String, Integer> getConstraintViolationCounts() {
        return constraintViolationCounts;
    }

    public void setConstraintViolationCounts(Map<String, Integer> constraintViolationCounts) {
        this.constraintViolationCounts = constraintViolationCounts;
    }
}
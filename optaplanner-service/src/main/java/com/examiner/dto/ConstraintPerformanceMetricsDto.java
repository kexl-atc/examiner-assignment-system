package com.examiner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

/**
 * 约束性能指标DTO
 * 用于约束性能监控数据的传输
 */
public class ConstraintPerformanceMetricsDto {

    @JsonProperty("constraintId")
    private String constraintId;

    @JsonProperty("totalExecutions")
    private long totalExecutions;

    @JsonProperty("totalExecutionTime")
    private long totalExecutionTime;

    @JsonProperty("averageExecutionTime")
    private double averageExecutionTime;

    @JsonProperty("lastExecutionTime")
    private long lastExecutionTime;

    @JsonProperty("errorCount")
    private long errorCount;

    @JsonProperty("lastUpdated")
    private LocalDateTime lastUpdated;

    @JsonProperty("totalMatchCount")
    private long totalMatchCount;

    @JsonProperty("totalWeight")
    private double totalWeight;

    @JsonProperty("performanceScore")
    private double performanceScore;

    // 构造函数
    public ConstraintPerformanceMetricsDto() {}

    public ConstraintPerformanceMetricsDto(String constraintId) {
        this.constraintId = constraintId;
        this.totalExecutions = 0;
        this.totalExecutionTime = 0;
        this.averageExecutionTime = 0.0;
        this.lastExecutionTime = 0;
        this.errorCount = 0;
        this.lastUpdated = LocalDateTime.now();
        this.totalMatchCount = 0;
        this.totalWeight = 0.0;
        this.performanceScore = 0.0;
    }

    // Getter和Setter方法
    public String getConstraintId() { return constraintId; }
    public void setConstraintId(String constraintId) { this.constraintId = constraintId; }

    public long getTotalExecutions() { return totalExecutions; }
    public void setTotalExecutions(long totalExecutions) { this.totalExecutions = totalExecutions; }

    public long getTotalExecutionTime() { return totalExecutionTime; }
    public void setTotalExecutionTime(long totalExecutionTime) { this.totalExecutionTime = totalExecutionTime; }

    public double getAverageExecutionTime() { return averageExecutionTime; }
    public void setAverageExecutionTime(double averageExecutionTime) { this.averageExecutionTime = averageExecutionTime; }

    public long getLastExecutionTime() { return lastExecutionTime; }
    public void setLastExecutionTime(long lastExecutionTime) { this.lastExecutionTime = lastExecutionTime; }

    public long getErrorCount() { return errorCount; }
    public void setErrorCount(long errorCount) { this.errorCount = errorCount; }

    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }

    public long getTotalMatchCount() { return totalMatchCount; }
    public void setTotalMatchCount(long totalMatchCount) { this.totalMatchCount = totalMatchCount; }

    public double getTotalWeight() { return totalWeight; }
    public void setTotalWeight(double totalWeight) { this.totalWeight = totalWeight; }

    public double getPerformanceScore() { return performanceScore; }
    public void setPerformanceScore(double performanceScore) { this.performanceScore = performanceScore; }
}
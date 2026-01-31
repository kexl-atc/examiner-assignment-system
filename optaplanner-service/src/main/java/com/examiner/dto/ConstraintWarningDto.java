package com.examiner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

/**
 * 约束警告DTO
 * 用于传输约束警告信息
 */
public class ConstraintWarningDto {

    @JsonProperty("constraintId")
    private String constraintId;

    @JsonProperty("warningType")
    private String warningType;

    @JsonProperty("level")
    private String level;

    @JsonProperty("message")
    private String message;

    @JsonProperty("description")
    private String description;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @JsonProperty("recommendation")
    private String recommendation;

    @JsonProperty("impact")
    private String impact;

    @JsonProperty("category")
    private String category;

    @JsonProperty("canIgnore")
    private boolean canIgnore;

    // 构造函数
    public ConstraintWarningDto() {}

    public ConstraintWarningDto(String constraintId, String warningType, String level, String message) {
        this.constraintId = constraintId;
        this.warningType = warningType;
        this.level = level;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    // Getter和Setter方法
    public String getConstraintId() {
        return constraintId;
    }

    public void setConstraintId(String constraintId) {
        this.constraintId = constraintId;
    }

    public String getWarningType() {
        return warningType;
    }

    public void setWarningType(String warningType) {
        this.warningType = warningType;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public String getImpact() {
        return impact;
    }

    public void setImpact(String impact) {
        this.impact = impact;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public boolean isCanIgnore() {
        return canIgnore;
    }

    public void setCanIgnore(boolean canIgnore) {
        this.canIgnore = canIgnore;
    }

    @Override
    public String toString() {
        return "ConstraintWarningDto{" +
                "constraintId='" + constraintId + '\'' +
                ", warningType='" + warningType + '\'' +
                ", level='" + level + '\'' +
                ", message='" + message + '\'' +
                ", description='" + description + '\'' +
                ", timestamp=" + timestamp +
                ", recommendation='" + recommendation + '\'' +
                ", impact='" + impact + '\'' +
                ", category='" + category + '\'' +
                ", canIgnore=" + canIgnore +
                '}';
    }
}
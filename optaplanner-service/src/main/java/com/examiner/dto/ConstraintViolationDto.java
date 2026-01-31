package com.examiner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

/**
 * 约束违规DTO
 * 用于传输约束违规信息
 */
public class ConstraintViolationDto {

    @JsonProperty("constraintId")
    private String constraintId;

    @JsonProperty("violationType")
    private String violationType;

    @JsonProperty("severity")
    private String severity;

    @JsonProperty("message")
    private String message;

    @JsonProperty("details")
    private String details;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @JsonProperty("affectedEntities")
    private String[] affectedEntities;

    @JsonProperty("suggestedFix")
    private String suggestedFix;

    @JsonProperty("errorCode")
    private String errorCode;

    @JsonProperty("category")
    private String category;

    // 构造函数
    public ConstraintViolationDto() {}

    public ConstraintViolationDto(String constraintId, String violationType, String severity, String message) {
        this.constraintId = constraintId;
        this.violationType = violationType;
        this.severity = severity;
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

    public String getViolationType() {
        return violationType;
    }

    public void setViolationType(String violationType) {
        this.violationType = violationType;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String[] getAffectedEntities() {
        return affectedEntities;
    }

    public void setAffectedEntities(String[] affectedEntities) {
        this.affectedEntities = affectedEntities;
    }

    public String getSuggestedFix() {
        return suggestedFix;
    }

    public void setSuggestedFix(String suggestedFix) {
        this.suggestedFix = suggestedFix;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    @Override
    public String toString() {
        return "ConstraintViolationDto{" +
                "constraintId='" + constraintId + '\'' +
                ", violationType='" + violationType + '\'' +
                ", severity='" + severity + '\'' +
                ", message='" + message + '\'' +
                ", details='" + details + '\'' +
                ", timestamp=" + timestamp +
                ", errorCode='" + errorCode + '\'' +
                ", category='" + category + '\'' +
                '}';
    }
}
package com.examiner.scheduler.rest;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;

import java.util.ArrayList;
import java.util.List;

/**
 * 验证结果DTO
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ValidationResult {
    
    private boolean valid;
    private HardSoftScore score;
    private List<ValidationError> errors;
    private List<ValidationWarning> warnings;
    private ValidationStatistics statistics;
    
    // 构造函数
    public ValidationResult() {
        this.errors = new ArrayList<>();
        this.warnings = new ArrayList<>();
    }
    
    public ValidationResult(boolean valid, HardSoftScore score) {
        this();
        this.valid = valid;
        this.score = score;
    }
    
    // Getter和Setter方法
    public boolean isValid() {
        return valid;
    }
    
    public void setValid(boolean valid) {
        this.valid = valid;
    }
    
    public HardSoftScore getScore() {
        return score;
    }
    
    public void setScore(HardSoftScore score) {
        this.score = score;
    }
    
    public List<ValidationError> getErrors() {
        return errors;
    }
    
    public void setErrors(List<ValidationError> errors) {
        this.errors = errors;
    }
    
    public List<ValidationWarning> getWarnings() {
        return warnings;
    }
    
    public void setWarnings(List<ValidationWarning> warnings) {
        this.warnings = warnings;
    }
    
    public ValidationStatistics getStatistics() {
        return statistics;
    }
    
    public void setStatistics(ValidationStatistics statistics) {
        this.statistics = statistics;
    }
    
    /**
     * 添加错误
     */
    public void addError(String constraint, String message, String entityId) {
        this.errors.add(new ValidationError(constraint, message, entityId));
        this.valid = false;
    }
    
    /**
     * 添加警告
     */
    public void addWarning(String constraint, String message, String entityId) {
        this.warnings.add(new ValidationWarning(constraint, message, entityId));
    }
    
    @Override
    public String toString() {
        return "ValidationResult{" +
                "valid=" + valid +
                ", score=" + score +
                ", errors=" + errors.size() +
                ", warnings=" + warnings.size() +
                '}';
    }
    
    /**
     * 验证错误内部类
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ValidationError {
        private String constraint;
        private String message;
        private String entityId;
        
        public ValidationError() {}
        
        public ValidationError(String constraint, String message, String entityId) {
            this.constraint = constraint;
            this.message = message;
            this.entityId = entityId;
        }
        
        public String getConstraint() {
            return constraint;
        }
        
        public void setConstraint(String constraint) {
            this.constraint = constraint;
        }
        
        public String getMessage() {
            return message;
        }
        
        public void setMessage(String message) {
            this.message = message;
        }
        
        public String getEntityId() {
            return entityId;
        }
        
        public void setEntityId(String entityId) {
            this.entityId = entityId;
        }
        
        @Override
        public String toString() {
            return "ValidationError{" +
                    "constraint='" + constraint + '\'' +
                    ", message='" + message + '\'' +
                    ", entityId='" + entityId + '\'' +
                    '}';
        }
    }
    
    /**
     * 验证警告内部类
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ValidationWarning {
        private String constraint;
        private String message;
        private String entityId;
        
        public ValidationWarning() {}
        
        public ValidationWarning(String constraint, String message, String entityId) {
            this.constraint = constraint;
            this.message = message;
            this.entityId = entityId;
        }
        
        public String getConstraint() {
            return constraint;
        }
        
        public void setConstraint(String constraint) {
            this.constraint = constraint;
        }
        
        public String getMessage() {
            return message;
        }
        
        public void setMessage(String message) {
            this.message = message;
        }
        
        public String getEntityId() {
            return entityId;
        }
        
        public void setEntityId(String entityId) {
            this.entityId = entityId;
        }
        
        @Override
        public String toString() {
            return "ValidationWarning{" +
                    "constraint='" + constraint + '\'' +
                    ", message='" + message + '\'' +
                    ", entityId='" + entityId + '\'' +
                    '}';
        }
    }
    
    /**
     * 验证统计信息内部类
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ValidationStatistics {
        private int totalAssignments;
        private int completeAssignments;
        private int incompleteAssignments;
        private int hardConstraintViolations;
        private int softConstraintViolations;
        private double completionRate;
        
        public ValidationStatistics() {}
        
        public int getTotalAssignments() {
            return totalAssignments;
        }
        
        public void setTotalAssignments(int totalAssignments) {
            this.totalAssignments = totalAssignments;
        }
        
        public int getCompleteAssignments() {
            return completeAssignments;
        }
        
        public void setCompleteAssignments(int completeAssignments) {
            this.completeAssignments = completeAssignments;
        }
        
        public int getIncompleteAssignments() {
            return incompleteAssignments;
        }
        
        public void setIncompleteAssignments(int incompleteAssignments) {
            this.incompleteAssignments = incompleteAssignments;
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
        
        public double getCompletionRate() {
            return completionRate;
        }
        
        public void setCompletionRate(double completionRate) {
            this.completionRate = completionRate;
        }
        
        @Override
        public String toString() {
            return "ValidationStatistics{" +
                    "totalAssignments=" + totalAssignments +
                    ", completeAssignments=" + completeAssignments +
                    ", completionRate=" + completionRate +
                    ", hardConstraintViolations=" + hardConstraintViolations +
                    ", softConstraintViolations=" + softConstraintViolations +
                    '}';
        }
    }
}
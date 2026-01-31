package com.examiner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 约束冲突检测DTO
 * 用于传输约束冲突检测结果
 */
public class ConstraintConflictDetectionDto {

    @JsonProperty("hasConflicts")
    private boolean hasConflicts;

    @JsonProperty("hardConstraintConflicts")
    private List<ConstraintConflictDto> hardConstraintConflicts;

    @JsonProperty("softConstraintConflicts")
    private List<ConstraintConflictDto> softConstraintConflicts;

    @JsonProperty("crossCategoryConflicts")
    private List<ConstraintConflictDto> crossCategoryConflicts;

    @JsonProperty("totalConflicts")
    private int totalConflicts;

    @JsonProperty("criticalConflicts")
    private int criticalConflicts;

    @JsonProperty("resolutionSuggestions")
    private List<ConflictResolutionSuggestionDto> resolutionSuggestions;

    @JsonProperty("lastDetectionTime")
    private LocalDateTime lastDetectionTime;

    // 构造函数
    public ConstraintConflictDetectionDto() {}

    public ConstraintConflictDetectionDto(boolean hasConflicts, 
                                        List<ConstraintConflictDto> hardConstraintConflicts,
                                        List<ConstraintConflictDto> softConstraintConflicts,
                                        List<ConstraintConflictDto> crossCategoryConflicts) {
        this.hasConflicts = hasConflicts;
        this.hardConstraintConflicts = hardConstraintConflicts;
        this.softConstraintConflicts = softConstraintConflicts;
        this.crossCategoryConflicts = crossCategoryConflicts;
        this.totalConflicts = calculateTotalConflicts();
    }

    // Getter和Setter方法
    public boolean isHasConflicts() {
        return hasConflicts;
    }

    public void setHasConflicts(boolean hasConflicts) {
        this.hasConflicts = hasConflicts;
    }

    public List<ConstraintConflictDto> getHardConstraintConflicts() {
        return hardConstraintConflicts;
    }

    public void setHardConstraintConflicts(List<ConstraintConflictDto> hardConstraintConflicts) {
        this.hardConstraintConflicts = hardConstraintConflicts;
    }

    public List<ConstraintConflictDto> getSoftConstraintConflicts() {
        return softConstraintConflicts;
    }

    public void setSoftConstraintConflicts(List<ConstraintConflictDto> softConstraintConflicts) {
        this.softConstraintConflicts = softConstraintConflicts;
    }

    public List<ConstraintConflictDto> getCrossCategoryConflicts() {
        return crossCategoryConflicts;
    }

    public void setCrossCategoryConflicts(List<ConstraintConflictDto> crossCategoryConflicts) {
        this.crossCategoryConflicts = crossCategoryConflicts;
    }

    public int getTotalConflicts() {
        return totalConflicts;
    }

    public void setTotalConflicts(int totalConflicts) {
        this.totalConflicts = totalConflicts;
    }

    public int getCriticalConflicts() {
        return criticalConflicts;
    }

    public void setCriticalConflicts(int criticalConflicts) {
        this.criticalConflicts = criticalConflicts;
    }

    public List<ConflictResolutionSuggestionDto> getResolutionSuggestions() {
        return resolutionSuggestions;
    }

    public void setResolutionSuggestions(List<ConflictResolutionSuggestionDto> resolutionSuggestions) {
        this.resolutionSuggestions = resolutionSuggestions;
    }

    public LocalDateTime getLastDetectionTime() {
        return lastDetectionTime;
    }

    public void setLastDetectionTime(LocalDateTime lastDetectionTime) {
        this.lastDetectionTime = lastDetectionTime;
    }

    private int calculateTotalConflicts() {
        int total = 0;
        if (hardConstraintConflicts != null) total += hardConstraintConflicts.size();
        if (softConstraintConflicts != null) total += softConstraintConflicts.size();
        if (crossCategoryConflicts != null) total += crossCategoryConflicts.size();
        return total;
    }

    /**
     * 约束冲突DTO
     */
    public static class ConstraintConflictDto {
        @JsonProperty("conflictId")
        private String conflictId;

        @JsonProperty("conflictType")
        private String conflictType;

        @JsonProperty("severity")
        private String severity;

        @JsonProperty("description")
        private String description;

        @JsonProperty("involvedConstraints")
        private List<String> involvedConstraints;

        @JsonProperty("conflictReason")
        private String conflictReason;

        @JsonProperty("impact")
        private String impact;

        // 构造函数
        public ConstraintConflictDto() {}

        public ConstraintConflictDto(String conflictId, String conflictType, String severity, 
                                   String description, List<String> involvedConstraints) {
            this.conflictId = conflictId;
            this.conflictType = conflictType;
            this.severity = severity;
            this.description = description;
            this.involvedConstraints = involvedConstraints;
        }

        // Getter和Setter方法
        public String getConflictId() { return conflictId; }
        public void setConflictId(String conflictId) { this.conflictId = conflictId; }

        public String getConflictType() { return conflictType; }
        public void setConflictType(String conflictType) { this.conflictType = conflictType; }

        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public List<String> getInvolvedConstraints() { return involvedConstraints; }
        public void setInvolvedConstraints(List<String> involvedConstraints) { this.involvedConstraints = involvedConstraints; }

        public String getConflictReason() { return conflictReason; }
        public void setConflictReason(String conflictReason) { this.conflictReason = conflictReason; }

        public String getImpact() { return impact; }
        public void setImpact(String impact) { this.impact = impact; }
    }

    /**
     * 冲突解决建议DTO
     */
    public static class ConflictResolutionSuggestionDto {
        @JsonProperty("suggestionId")
        private String suggestionId;

        @JsonProperty("conflictId")
        private String conflictId;

        @JsonProperty("resolutionType")
        private String resolutionType;

        @JsonProperty("description")
        private String description;

        @JsonProperty("priority")
        private String priority;

        @JsonProperty("estimatedImpact")
        private String estimatedImpact;

        @JsonProperty("actionRequired")
        private String actionRequired;

        // 构造函数
        public ConflictResolutionSuggestionDto() {}

        public ConflictResolutionSuggestionDto(String suggestionId, String conflictId, 
                                             String resolutionType, String description) {
            this.suggestionId = suggestionId;
            this.conflictId = conflictId;
            this.resolutionType = resolutionType;
            this.description = description;
        }

        // Getter和Setter方法
        public String getSuggestionId() { return suggestionId; }
        public void setSuggestionId(String suggestionId) { this.suggestionId = suggestionId; }

        public String getConflictId() { return conflictId; }
        public void setConflictId(String conflictId) { this.conflictId = conflictId; }

        public String getResolutionType() { return resolutionType; }
        public void setResolutionType(String resolutionType) { this.resolutionType = resolutionType; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }

        public String getEstimatedImpact() { return estimatedImpact; }
        public void setEstimatedImpact(String estimatedImpact) { this.estimatedImpact = estimatedImpact; }

        public String getActionRequired() { return actionRequired; }
        public void setActionRequired(String actionRequired) { this.actionRequired = actionRequired; }
    }

    @Override
    public String toString() {
        return "ConstraintConflictDetectionDto{" +
                "hasConflicts=" + hasConflicts +
                ", totalConflicts=" + totalConflicts +
                ", criticalConflicts=" + criticalConflicts +
                ", hardConstraintConflicts=" + (hardConstraintConflicts != null ? hardConstraintConflicts.size() : 0) +
                ", softConstraintConflicts=" + (softConstraintConflicts != null ? softConstraintConflicts.size() : 0) +
                ", crossCategoryConflicts=" + (crossCategoryConflicts != null ? crossCategoryConflicts.size() : 0) +
                '}';
    }
}
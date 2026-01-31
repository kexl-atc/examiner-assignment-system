package com.examiner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.util.Map;

/**
 * 约束验证请求DTO
 * 用于前端向后端发送约束配置验证请求
 */
public class ConstraintValidationRequestDto {

    @NotBlank(message = "配置ID不能为空")
    @JsonProperty("configurationId")
    private String configurationId;

    @NotBlank(message = "版本号不能为空")
    @JsonProperty("version")
    private String version;

    @JsonProperty("description")
    private String description;

    @Valid
    @JsonProperty("hardConstraints")
    private Map<String, HardConstraintDto> hardConstraints;

    @Valid
    @JsonProperty("softConstraints")
    private Map<String, SoftConstraintDto> softConstraints;

    @Valid
    @JsonProperty("globalSettings")
    private GlobalSettingsDto globalSettings;

    @JsonProperty("validationOptions")
    private ValidationOptionsDto validationOptions;

    // 构造函数
    public ConstraintValidationRequestDto() {}

    public ConstraintValidationRequestDto(String configurationId, String version) {
        this.configurationId = configurationId;
        this.version = version;
    }

    // Getter和Setter方法
    public String getConfigurationId() {
        return configurationId;
    }

    public void setConfigurationId(String configurationId) {
        this.configurationId = configurationId;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Map<String, HardConstraintDto> getHardConstraints() {
        return hardConstraints;
    }

    public void setHardConstraints(Map<String, HardConstraintDto> hardConstraints) {
        this.hardConstraints = hardConstraints;
    }

    public Map<String, SoftConstraintDto> getSoftConstraints() {
        return softConstraints;
    }

    public void setSoftConstraints(Map<String, SoftConstraintDto> softConstraints) {
        this.softConstraints = softConstraints;
    }

    public GlobalSettingsDto getGlobalSettings() {
        return globalSettings;
    }

    public void setGlobalSettings(GlobalSettingsDto globalSettings) {
        this.globalSettings = globalSettings;
    }

    public ValidationOptionsDto getValidationOptions() {
        return validationOptions;
    }

    public void setValidationOptions(ValidationOptionsDto validationOptions) {
        this.validationOptions = validationOptions;
    }

    /**
     * 硬约束DTO
     */
    public static class HardConstraintDto {
        @NotBlank(message = "约束ID不能为空")
        private String id;

        @NotBlank(message = "约束名称不能为空")
        private String name;

        private String description;

        @NotNull(message = "约束权重不能为空")
        private Integer weight;

        private Integer minWeight;
        private Integer maxWeight;
        private boolean mandatory;
        private boolean adjustable;

        @NotBlank(message = "约束状态不能为空")
        private String status;

        @NotBlank(message = "约束类型不能为空")
        private String type;

        @NotBlank(message = "约束类别不能为空")
        private String category;

        @NotBlank(message = "约束优先级不能为空")
        private String priority;

        private String version;

        // Getter和Setter方法
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public Integer getWeight() { return weight; }
        public void setWeight(Integer weight) { this.weight = weight; }

        public Integer getMinWeight() { return minWeight; }
        public void setMinWeight(Integer minWeight) { this.minWeight = minWeight; }

        public Integer getMaxWeight() { return maxWeight; }
        public void setMaxWeight(Integer maxWeight) { this.maxWeight = maxWeight; }

        public boolean isMandatory() { return mandatory; }
        public void setMandatory(boolean mandatory) { this.mandatory = mandatory; }

        public boolean isAdjustable() { return adjustable; }
        public void setAdjustable(boolean adjustable) { this.adjustable = adjustable; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }

        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }
    }

    /**
     * 软约束DTO
     */
    public static class SoftConstraintDto {
        @NotBlank(message = "约束ID不能为空")
        private String id;

        @NotBlank(message = "约束名称不能为空")
        private String name;

        private String description;

        @NotNull(message = "约束权重不能为空")
        private Integer weight;

        private Integer minWeight;
        private Integer maxWeight;
        private boolean adjustable;

        @NotBlank(message = "约束状态不能为空")
        private String status;

        @NotBlank(message = "约束类型不能为空")
        private String type;

        @NotBlank(message = "约束类别不能为空")
        private String category;

        @NotBlank(message = "约束优先级不能为空")
        private String priority;

        private String version;
        private String degradationCurve;
        private Integer satisfactionReward;

        // Getter和Setter方法
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public Integer getWeight() { return weight; }
        public void setWeight(Integer weight) { this.weight = weight; }

        public Integer getMinWeight() { return minWeight; }
        public void setMinWeight(Integer minWeight) { this.minWeight = minWeight; }

        public Integer getMaxWeight() { return maxWeight; }
        public void setMaxWeight(Integer maxWeight) { this.maxWeight = maxWeight; }

        public boolean isAdjustable() { return adjustable; }
        public void setAdjustable(boolean adjustable) { this.adjustable = adjustable; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }

        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }

        public String getDegradationCurve() { return degradationCurve; }
        public void setDegradationCurve(String degradationCurve) { this.degradationCurve = degradationCurve; }

        public Integer getSatisfactionReward() { return satisfactionReward; }
        public void setSatisfactionReward(Integer satisfactionReward) { this.satisfactionReward = satisfactionReward; }
    }

    /**
     * 全局设置DTO
     */
    public static class GlobalSettingsDto {
        private Integer maxSolverTime;
        private Double terminationScoreThreshold;
        private boolean enableIncrementalScoring;
        private boolean enableMultiThreading;

        // Getter和Setter方法
        public Integer getMaxSolverTime() { return maxSolverTime; }
        public void setMaxSolverTime(Integer maxSolverTime) { this.maxSolverTime = maxSolverTime; }

        public Double getTerminationScoreThreshold() { return terminationScoreThreshold; }
        public void setTerminationScoreThreshold(Double terminationScoreThreshold) { 
            this.terminationScoreThreshold = terminationScoreThreshold; 
        }

        public boolean isEnableIncrementalScoring() { return enableIncrementalScoring; }
        public void setEnableIncrementalScoring(boolean enableIncrementalScoring) { 
            this.enableIncrementalScoring = enableIncrementalScoring; 
        }

        public boolean isEnableMultiThreading() { return enableMultiThreading; }
        public void setEnableMultiThreading(boolean enableMultiThreading) { 
            this.enableMultiThreading = enableMultiThreading; 
        }
    }

    /**
     * 验证选项DTO
     */
    public static class ValidationOptionsDto {
        private boolean validateConflicts = true;
        private boolean validatePerformance = true;
        private boolean validateBusinessRules = true;
        private boolean generateWarnings = true;
        private boolean strictMode = false;

        // Getter和Setter方法
        public boolean isValidateConflicts() { return validateConflicts; }
        public void setValidateConflicts(boolean validateConflicts) { this.validateConflicts = validateConflicts; }

        public boolean isValidatePerformance() { return validatePerformance; }
        public void setValidatePerformance(boolean validatePerformance) { this.validatePerformance = validatePerformance; }

        public boolean isValidateBusinessRules() { return validateBusinessRules; }
        public void setValidateBusinessRules(boolean validateBusinessRules) { this.validateBusinessRules = validateBusinessRules; }

        public boolean isGenerateWarnings() { return generateWarnings; }
        public void setGenerateWarnings(boolean generateWarnings) { this.generateWarnings = generateWarnings; }

        public boolean isStrictMode() { return strictMode; }
        public void setStrictMode(boolean strictMode) { this.strictMode = strictMode; }
    }

    @Override
    public String toString() {
        return "ConstraintValidationRequestDto{" +
                "configurationId='" + configurationId + '\'' +
                ", version='" + version + '\'' +
                ", description='" + description + '\'' +
                ", hardConstraints=" + (hardConstraints != null ? hardConstraints.size() : 0) +
                ", softConstraints=" + (softConstraints != null ? softConstraints.size() : 0) +
                ", globalSettings=" + globalSettings +
                ", validationOptions=" + validationOptions +
                '}';
    }
}
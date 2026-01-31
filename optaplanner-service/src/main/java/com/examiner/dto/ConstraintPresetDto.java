package com.examiner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

/**
 * 约束预设DTO
 * 用于约束配置预设的数据传输
 */
public class ConstraintPresetDto {

    @JsonProperty("id")
    private String id;

    @JsonProperty("name")
    private String name;

    @JsonProperty("description")
    private String description;

    @JsonProperty("hardConstraints")
    private Map<String, HardConstraintDto> hardConstraints;

    @JsonProperty("softConstraints")
    private Map<String, SoftConstraintDto> softConstraints;

    // 构造函数
    public ConstraintPresetDto() {}

    public ConstraintPresetDto(String id, String name, String description,
                              Map<String, HardConstraintDto> hardConstraints,
                              Map<String, SoftConstraintDto> softConstraints) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.hardConstraints = hardConstraints;
        this.softConstraints = softConstraints;
    }

    // Getter和Setter方法
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Map<String, HardConstraintDto> getHardConstraints() { return hardConstraints; }
    public void setHardConstraints(Map<String, HardConstraintDto> hardConstraints) { this.hardConstraints = hardConstraints; }

    public Map<String, SoftConstraintDto> getSoftConstraints() { return softConstraints; }
    public void setSoftConstraints(Map<String, SoftConstraintDto> softConstraints) { this.softConstraints = softConstraints; }

    /**
     * 硬约束DTO
     */
    public static class HardConstraintDto {
        @JsonProperty("id")
        private String id;

        @JsonProperty("name")
        private String name;

        @JsonProperty("description")
        private String description;

        @JsonProperty("category")
        private String category;

        @JsonProperty("priority")
        private String priority;

        @JsonProperty("status")
        private String status;

        @JsonProperty("weight")
        private Integer weight;

        @JsonProperty("minWeight")
        private Integer minWeight;

        @JsonProperty("maxWeight")
        private Integer maxWeight;

        @JsonProperty("defaultWeight")
        private Integer defaultWeight;

        @JsonProperty("adjustable")
        private boolean adjustable;

        @JsonProperty("version")
        private String version;

        @JsonProperty("satisfactionReward")
        private Integer satisfactionReward;

        @JsonProperty("enabled")
        private boolean enabled;

        // Getter和Setter方法
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public Integer getWeight() { return weight; }
        public void setWeight(Integer weight) { this.weight = weight; }

        public Integer getMinWeight() { return minWeight; }
        public void setMinWeight(Integer minWeight) { this.minWeight = minWeight; }

        public Integer getMaxWeight() { return maxWeight; }
        public void setMaxWeight(Integer maxWeight) { this.maxWeight = maxWeight; }

        public Integer getDefaultWeight() { return defaultWeight; }
        public void setDefaultWeight(Integer defaultWeight) { this.defaultWeight = defaultWeight; }

        public boolean isAdjustable() { return adjustable; }
        public void setAdjustable(boolean adjustable) { this.adjustable = adjustable; }

        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }

        public Integer getSatisfactionReward() { return satisfactionReward; }
        public void setSatisfactionReward(Integer satisfactionReward) { this.satisfactionReward = satisfactionReward; }

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
    }

    /**
     * 软约束DTO
     */
    public static class SoftConstraintDto {
        @JsonProperty("id")
        private String id;

        @JsonProperty("name")
        private String name;

        @JsonProperty("description")
        private String description;

        @JsonProperty("category")
        private String category;

        @JsonProperty("priority")
        private String priority;

        @JsonProperty("status")
        private String status;

        @JsonProperty("weight")
        private Integer weight;

        @JsonProperty("minWeight")
        private Integer minWeight;

        @JsonProperty("maxWeight")
        private Integer maxWeight;

        @JsonProperty("defaultWeight")
        private Integer defaultWeight;

        @JsonProperty("adjustable")
        private boolean adjustable;

        @JsonProperty("version")
        private String version;

        @JsonProperty("satisfactionReward")
        private Integer satisfactionReward;

        @JsonProperty("degradationCurve")
        private String degradationCurve;

        // Getter和Setter方法
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public Integer getWeight() { return weight; }
        public void setWeight(Integer weight) { this.weight = weight; }

        public Integer getMinWeight() { return minWeight; }
        public void setMinWeight(Integer minWeight) { this.minWeight = minWeight; }

        public Integer getMaxWeight() { return maxWeight; }
        public void setMaxWeight(Integer maxWeight) { this.maxWeight = maxWeight; }

        public Integer getDefaultWeight() { return defaultWeight; }
        public void setDefaultWeight(Integer defaultWeight) { this.defaultWeight = defaultWeight; }

        public boolean isAdjustable() { return adjustable; }
        public void setAdjustable(boolean adjustable) { this.adjustable = adjustable; }

        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }

        public Integer getSatisfactionReward() { return satisfactionReward; }
        public void setSatisfactionReward(Integer satisfactionReward) { this.satisfactionReward = satisfactionReward; }

        public String getDegradationCurve() { return degradationCurve; }
        public void setDegradationCurve(String degradationCurve) { this.degradationCurve = degradationCurve; }
    }
}
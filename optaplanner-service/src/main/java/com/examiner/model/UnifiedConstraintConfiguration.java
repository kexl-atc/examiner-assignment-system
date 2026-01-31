package com.examiner.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 统一约束配置类
 * 与前端 unified-constraint.ts 保持数据结构一致
 * 基于 constraint-configuration-guide.md 文档设计
 */
@RegisterForReflection
public class UnifiedConstraintConfiguration {

    // 约束类型枚举
    public enum ConstraintType {
        HARD, SOFT
    }

    // 约束类别枚举
    public enum ConstraintCategory {
        TIME,           // 时间相关约束
        RESOURCE,       // 资源分配约束
        WORKLOAD,       // 工作负载约束
        QUALITY,        // 质量优化约束
        PREFERENCE      // 偏好设置约束
    }

    // 约束优先级枚举
    public enum ConstraintPriority {
        CRITICAL,       // 关键约束，必须满足
        HIGH,           // 高优先级
        MEDIUM,         // 中等优先级
        LOW             // 低优先级
    }

    // 约束状态枚举
    public enum ConstraintStatus {
        ENABLED,        // 启用
        DISABLED,       // 禁用
        CONDITIONAL     // 条件启用
    }

    // 基础约束定义
    @RegisterForReflection
    public static class BaseConstraint {
        @NotNull
        private String id;                          // 约束唯一标识符
        
        @NotNull
        private String name;                        // 约束名称
        
        private String description;                 // 约束描述
        
        @NotNull
        private ConstraintType type;                // 约束类型（硬约束/软约束）
        
        @NotNull
        private ConstraintCategory category;        // 约束类别
        
        @NotNull
        private ConstraintPriority priority;        // 约束优先级
        
        @NotNull
        private ConstraintStatus status;            // 约束状态
        
        @Min(0)
        private int weight;                         // 约束权重
        
        @Min(0)
        private int minWeight;                      // 最小权重
        
        @Min(0)
        private int maxWeight;                      // 最大权重
        
        @Min(0)
        private int defaultWeight;                  // 默认权重
        
        private boolean isAdjustable;               // 是否可调整
        
        private String version;                     // 约束版本
        
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime lastModified;         // 最后修改时间
        
        private List<String> tags;                  // 约束标签

        // 构造函数
        public BaseConstraint() {}

        public BaseConstraint(String id, String name, String description, ConstraintType type,
                            ConstraintCategory category, ConstraintPriority priority, ConstraintStatus status,
                            int weight, int minWeight, int maxWeight, int defaultWeight, boolean isAdjustable,
                            String version, List<String> tags) {
            this.id = id;
            this.name = name;
            this.description = description;
            this.type = type;
            this.category = category;
            this.priority = priority;
            this.status = status;
            this.weight = weight;
            this.minWeight = minWeight;
            this.maxWeight = maxWeight;
            this.defaultWeight = defaultWeight;
            this.isAdjustable = isAdjustable;
            this.version = version;
            this.lastModified = LocalDateTime.now();
            this.tags = tags;
        }

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public ConstraintType getType() { return type; }
        public void setType(ConstraintType type) { this.type = type; }

        public ConstraintCategory getCategory() { return category; }
        public void setCategory(ConstraintCategory category) { this.category = category; }

        public ConstraintPriority getPriority() { return priority; }
        public void setPriority(ConstraintPriority priority) { this.priority = priority; }

        public ConstraintStatus getStatus() { return status; }
        public void setStatus(ConstraintStatus status) { this.status = status; }

        public int getWeight() { return weight; }
        public void setWeight(int weight) { this.weight = weight; }

        public int getMinWeight() { return minWeight; }
        public void setMinWeight(int minWeight) { this.minWeight = minWeight; }

        public int getMaxWeight() { return maxWeight; }
        public void setMaxWeight(int maxWeight) { this.maxWeight = maxWeight; }

        public int getDefaultWeight() { return defaultWeight; }
        public void setDefaultWeight(int defaultWeight) { this.defaultWeight = defaultWeight; }

        public boolean isAdjustable() { return isAdjustable; }
        public void setAdjustable(boolean adjustable) { isAdjustable = adjustable; }

        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }

        public LocalDateTime getLastModified() { return lastModified; }
        public void setLastModified(LocalDateTime lastModified) { this.lastModified = lastModified; }

        public List<String> getTags() { return tags; }
        public void setTags(List<String> tags) { this.tags = tags; }
    }

    // 硬约束定义
    @RegisterForReflection
    public static class HardConstraint extends BaseConstraint {
        private int violationPenalty;               // 违反惩罚值
        private boolean isMandatory;                // 是否强制执行

        public HardConstraint() {
            super();
            setType(ConstraintType.HARD);
        }

        public HardConstraint(String id, String name, String description, ConstraintCategory category,
                            ConstraintPriority priority, ConstraintStatus status, int weight, int minWeight,
                            int maxWeight, int defaultWeight, boolean isAdjustable, String version,
                            List<String> tags, int violationPenalty, boolean isMandatory) {
            super(id, name, description, ConstraintType.HARD, category, priority, status, weight,
                  minWeight, maxWeight, defaultWeight, isAdjustable, version, tags);
            this.violationPenalty = violationPenalty;
            this.isMandatory = isMandatory;
        }

        public int getViolationPenalty() { return violationPenalty; }
        public void setViolationPenalty(int violationPenalty) { this.violationPenalty = violationPenalty; }

        public boolean isMandatory() { return isMandatory; }
        public void setMandatory(boolean mandatory) { isMandatory = mandatory; }
    }

    // 软约束定义
    @RegisterForReflection
    public static class SoftConstraint extends BaseConstraint {
        private int satisfactionReward;             // 满足奖励值
        private String degradationCurve;            // 降级曲线: linear, exponential, logarithmic

        public SoftConstraint() {
            super();
            setType(ConstraintType.SOFT);
        }

        public SoftConstraint(String id, String name, String description, ConstraintCategory category,
                            ConstraintPriority priority, ConstraintStatus status, int weight, int minWeight,
                            int maxWeight, int defaultWeight, boolean isAdjustable, String version,
                            List<String> tags, int satisfactionReward, String degradationCurve) {
            super(id, name, description, ConstraintType.SOFT, category, priority, status, weight,
                  minWeight, maxWeight, defaultWeight, isAdjustable, version, tags);
            this.satisfactionReward = satisfactionReward;
            this.degradationCurve = degradationCurve;
        }

        public int getSatisfactionReward() { return satisfactionReward; }
        public void setSatisfactionReward(int satisfactionReward) { this.satisfactionReward = satisfactionReward; }

        public String getDegradationCurve() { return degradationCurve; }
        public void setDegradationCurve(String degradationCurve) { this.degradationCurve = degradationCurve; }
    }

    // 全局设置
    @RegisterForReflection
    public static class GlobalSettings {
        @Min(1)
        private int hardConstraintWeight = 1000000;     // 硬约束权重
        
        @Min(1)
        private int softConstraintWeight = 1;           // 软约束权重
        
        @Min(1)
        private long optimizationTimeout = 300000;      // 优化超时时间（毫秒）
        
        @Min(1)
        private int maxIterations = 10000;              // 最大迭代次数
        
        @Min(0)
        @Max(1)
        private double convergenceThreshold = 0.001;    // 收敛阈值
        
        private Integer maxSolverTime;                  // 求解器最大时间（秒）
        private Double terminationScoreThreshold;       // 终止分数阈值
        private boolean enableIncrementalScoring = true; // 启用增量评分
        private boolean enableMultiThreading = true;    // 启用多线程

        // Getters and Setters
        public int getHardConstraintWeight() { return hardConstraintWeight; }
        public void setHardConstraintWeight(int hardConstraintWeight) { this.hardConstraintWeight = hardConstraintWeight; }

        public int getSoftConstraintWeight() { return softConstraintWeight; }
        public void setSoftConstraintWeight(int softConstraintWeight) { this.softConstraintWeight = softConstraintWeight; }

        public long getOptimizationTimeout() { return optimizationTimeout; }
        public void setOptimizationTimeout(long optimizationTimeout) { this.optimizationTimeout = optimizationTimeout; }

        public int getMaxIterations() { return maxIterations; }
        public void setMaxIterations(int maxIterations) { this.maxIterations = maxIterations; }

        public double getConvergenceThreshold() { return convergenceThreshold; }
        public void setConvergenceThreshold(double convergenceThreshold) { this.convergenceThreshold = convergenceThreshold; }
        
        public Integer getMaxSolverTime() { return maxSolverTime; }
        public void setMaxSolverTime(Integer maxSolverTime) { this.maxSolverTime = maxSolverTime; }
        
        public Double getTerminationScoreThreshold() { return terminationScoreThreshold; }
        public void setTerminationScoreThreshold(Double terminationScoreThreshold) { this.terminationScoreThreshold = terminationScoreThreshold; }
        
        public boolean isEnableIncrementalScoring() { return enableIncrementalScoring; }
        public void setEnableIncrementalScoring(boolean enableIncrementalScoring) { this.enableIncrementalScoring = enableIncrementalScoring; }
        
        public boolean isEnableMultiThreading() { return enableMultiThreading; }
        public void setEnableMultiThreading(boolean enableMultiThreading) { this.enableMultiThreading = enableMultiThreading; }
    }

    // 配置元数据
    @RegisterForReflection
    public static class ConfigurationMetadata {
        private String configVersion;                   // 配置版本
        
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime createdAt;                // 创建时间
        
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime updatedAt;                // 更新时间
        
        private String createdBy;                       // 创建者
        
        private String environment;                     // 环境: development, testing, production

        public ConfigurationMetadata() {
            this.createdAt = LocalDateTime.now();
            this.updatedAt = LocalDateTime.now();
        }

        // Getters and Setters
        public String getConfigVersion() { return configVersion; }
        public void setConfigVersion(String configVersion) { this.configVersion = configVersion; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

        public String getCreatedBy() { return createdBy; }
        public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

        public String getEnvironment() { return environment; }
        public void setEnvironment(String environment) { this.environment = environment; }
    }

    // 约束权重映射配置
    @RegisterForReflection
    public static class ConstraintWeightMapping {
        @RegisterForReflection
        public static class WeightRange {
            private int min;
            private int max;

            public WeightRange() {}

            public WeightRange(int min, int max) {
                this.min = min;
                this.max = max;
            }

            public int getMin() { return min; }
            public void setMin(int min) { this.min = min; }

            public int getMax() { return max; }
            public void setMax(int max) { this.max = max; }
        }

        private WeightRange frontendRange;              // 前端权重范围
        private WeightRange backendRange;               // 后端权重范围
        private String mappingFunction;                 // 映射函数: linear, exponential, logarithmic
        private double scalingFactor;                   // 缩放因子

        public ConstraintWeightMapping() {}

        public ConstraintWeightMapping(WeightRange frontendRange, WeightRange backendRange,
                                     String mappingFunction, double scalingFactor) {
            this.frontendRange = frontendRange;
            this.backendRange = backendRange;
            this.mappingFunction = mappingFunction;
            this.scalingFactor = scalingFactor;
        }

        // Getters and Setters
        public WeightRange getFrontendRange() { return frontendRange; }
        public void setFrontendRange(WeightRange frontendRange) { this.frontendRange = frontendRange; }

        public WeightRange getBackendRange() { return backendRange; }
        public void setBackendRange(WeightRange backendRange) { this.backendRange = backendRange; }

        public String getMappingFunction() { return mappingFunction; }
        public void setMappingFunction(String mappingFunction) { this.mappingFunction = mappingFunction; }

        public double getScalingFactor() { return scalingFactor; }
        public void setScalingFactor(double scalingFactor) { this.scalingFactor = scalingFactor; }
    }

    // 主配置类属性
    @JsonProperty("hardConstraints")
    private Map<String, HardConstraint> hardConstraints;        // 硬约束集合

    @JsonProperty("softConstraints")
    private Map<String, SoftConstraint> softConstraints;        // 软约束集合

    @JsonProperty("globalSettings")
    private GlobalSettings globalSettings;                      // 全局设置

    @JsonProperty("metadata")
    private ConfigurationMetadata metadata;                     // 配置元数据

    @JsonProperty("weightMapping")
    private Map<String, ConstraintWeightMapping> weightMapping; // 权重映射配置

    // 构造函数
    public UnifiedConstraintConfiguration() {
        this.globalSettings = new GlobalSettings();
        this.metadata = new ConfigurationMetadata();
    }

    // Getters and Setters
    public Map<String, HardConstraint> getHardConstraints() { return hardConstraints; }
    public void setHardConstraints(Map<String, HardConstraint> hardConstraints) { this.hardConstraints = hardConstraints; }

    public Map<String, SoftConstraint> getSoftConstraints() { return softConstraints; }
    public void setSoftConstraints(Map<String, SoftConstraint> softConstraints) { this.softConstraints = softConstraints; }

    public GlobalSettings getGlobalSettings() { return globalSettings; }
    public void setGlobalSettings(GlobalSettings globalSettings) { this.globalSettings = globalSettings; }

    public ConfigurationMetadata getMetadata() { return metadata; }
    public void setMetadata(ConfigurationMetadata metadata) { this.metadata = metadata; }

    public Map<String, ConstraintWeightMapping> getWeightMapping() { return weightMapping; }
    public void setWeightMapping(Map<String, ConstraintWeightMapping> weightMapping) { this.weightMapping = weightMapping; }

    // 配置标识符相关方法
    public String getConfigurationId() {
        return metadata != null ? metadata.getConfigVersion() : null;
    }

    public void setConfigurationId(String configurationId) {
        if (metadata == null) {
            metadata = new ConfigurationMetadata();
        }
        metadata.setConfigVersion(configurationId);
    }

    public String getVersion() {
        return metadata != null ? metadata.getConfigVersion() : null;
    }

    public void setVersion(String version) {
        if (metadata == null) {
            metadata = new ConfigurationMetadata();
        }
        metadata.setConfigVersion(version);
    }

    public String getDescription() {
        return metadata != null ? metadata.getEnvironment() : null;
    }

    public void setDescription(String description) {
        if (metadata == null) {
            metadata = new ConfigurationMetadata();
        }
        metadata.setEnvironment(description);
    }

    // 工具方法
    public void updateTimestamp() {
        if (this.metadata != null) {
            this.metadata.setUpdatedAt(LocalDateTime.now());
        }
    }

    public boolean isConstraintEnabled(String constraintId) {
        if (hardConstraints != null && hardConstraints.containsKey(constraintId)) {
            return hardConstraints.get(constraintId).getStatus() == ConstraintStatus.ENABLED;
        }
        if (softConstraints != null && softConstraints.containsKey(constraintId)) {
            return softConstraints.get(constraintId).getStatus() == ConstraintStatus.ENABLED;
        }
        return false;
    }

    public int getConstraintWeight(String constraintId) {
        if (hardConstraints != null && hardConstraints.containsKey(constraintId)) {
            return hardConstraints.get(constraintId).getWeight();
        }
        if (softConstraints != null && softConstraints.containsKey(constraintId)) {
            return softConstraints.get(constraintId).getWeight();
        }
        return 0;
    }
}
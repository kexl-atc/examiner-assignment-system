package com.examiner.service;

import com.examiner.model.UnifiedConstraintConfiguration;
import io.quarkus.runtime.annotations.RegisterForReflection;
import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 统一约束验证服务
 * 提供约束配置验证、冲突检测、权重调整等核心功能
 */
@ApplicationScoped
@RegisterForReflection
public class UnifiedConstraintValidationService {

    private static final Logger logger = LoggerFactory.getLogger(UnifiedConstraintValidationService.class);

    @Inject
    ConstraintPerformanceMonitoringService performanceMonitoringService;

    /**
     * 验证约束配置
     */
    public ConstraintValidationResult validateConfiguration(UnifiedConstraintConfiguration config) {
        long startTime = System.currentTimeMillis();
        List<ConstraintViolation> violations = new ArrayList<>();
        List<ConstraintWarning> warnings = new ArrayList<>();

        try {
            logger.info("开始验证约束配置，硬约束数量: {}, 软约束数量: {}", 
                       config.getHardConstraints().size(), 
                       config.getSoftConstraints().size());

            // 验证硬约束
            violations.addAll(validateHardConstraints(config.getHardConstraints()));

            // 验证软约束
            violations.addAll(validateSoftConstraints(config.getSoftConstraints()));

            // 检查约束冲突
            ConstraintConflictDetection conflictDetection = detectConstraintConflicts(config);
            violations.addAll(convertConflictsToViolations(conflictDetection.getConflicts()));

            // 生成警告
            warnings.addAll(generateConfigurationWarnings(config));

            // 验证全局设置
            violations.addAll(validateGlobalSettings(config.getGlobalSettings()));

            long validationTime = System.currentTimeMillis() - startTime;
            
            ConstraintValidationResult result = new ConstraintValidationResult();
            result.setValid(violations.isEmpty());
            result.setViolations(violations);
            result.setWarnings(warnings);
            result.setValidationTime(validationTime);
            result.setTimestamp(LocalDateTime.now());
            result.setConfigurationHash(generateConfigurationHash(config));

            logger.info("约束配置验证完成，耗时: {}ms, 违规数量: {}, 警告数量: {}", 
                       validationTime, violations.size(), warnings.size());

            // 记录性能指标
            performanceMonitoringService.recordValidation(validationTime, violations.size(), warnings.size());

            return result;

        } catch (Exception e) {
            logger.error("约束配置验证过程中发生错误", e);
            
            ConstraintViolation systemError = new ConstraintViolation();
            systemError.setConstraintId("VALIDATION_ERROR");
            systemError.setViolationType(ViolationType.SYSTEM_ERROR);
            systemError.setSeverity(ViolationSeverity.CRITICAL);
            systemError.setMessage("配置验证过程中发生系统错误: " + e.getMessage());
            systemError.setDetails(getStackTrace(e));
            systemError.setTimestamp(LocalDateTime.now());
            violations.add(systemError);

            ConstraintValidationResult result = new ConstraintValidationResult();
            result.setValid(false);
            result.setViolations(violations);
            result.setWarnings(warnings);
            result.setValidationTime(System.currentTimeMillis() - startTime);
            result.setTimestamp(LocalDateTime.now());
            result.setConfigurationHash("");

            return result;
        }
    }

    /**
     * 验证硬约束
     */
    private List<ConstraintViolation> validateHardConstraints(Map<String, UnifiedConstraintConfiguration.HardConstraint> hardConstraints) {
        List<ConstraintViolation> violations = new ArrayList<>();

        for (Map.Entry<String, UnifiedConstraintConfiguration.HardConstraint> entry : hardConstraints.entrySet()) {
            String constraintId = entry.getKey();
            UnifiedConstraintConfiguration.HardConstraint constraint = entry.getValue();

            // 检查必填字段
            if (constraint.getId() == null || constraint.getId().trim().isEmpty()) {
                violations.add(createViolation(constraintId, ViolationType.MISSING_REQUIRED_FIELD, 
                    ViolationSeverity.HIGH, "硬约束缺少ID字段", null));
            }

            if (constraint.getName() == null || constraint.getName().trim().isEmpty()) {
                violations.add(createViolation(constraintId, ViolationType.MISSING_REQUIRED_FIELD, 
                    ViolationSeverity.HIGH, "硬约束缺少名称字段", null));
            }

            // 检查权重范围
            if (constraint.getWeight() < constraint.getMinWeight() || constraint.getWeight() > constraint.getMaxWeight()) {
                violations.add(createViolation(constraintId, ViolationType.INVALID_WEIGHT_RANGE, 
                    ViolationSeverity.HIGH, 
                    String.format("硬约束权重超出允许范围，当前权重: %d, 允许范围: %d-%d", 
                                 constraint.getWeight(), constraint.getMinWeight(), constraint.getMaxWeight()),
                    null));
            }

            // 检查强制约束状态
            if (constraint.isMandatory() && constraint.getStatus() == UnifiedConstraintConfiguration.ConstraintStatus.DISABLED) {
                violations.add(createViolation(constraintId, ViolationType.MANDATORY_CONSTRAINT_DISABLED, 
                    ViolationSeverity.CRITICAL, 
                    String.format("强制硬约束 '%s' 不能被禁用", constraint.getName()),
                    "请启用此约束或修改其强制属性"));
            }

            // 检查约束版本兼容性
            if (!isVersionCompatible(constraint.getVersion())) {
                violations.add(createViolation(constraintId, ViolationType.VERSION_INCOMPATIBLE, 
                    ViolationSeverity.MEDIUM, 
                    String.format("约束版本 '%s' 可能不兼容当前系统", constraint.getVersion()),
                    "建议更新约束定义或系统版本"));
            }

            // 验证约束特定的业务规则
            violations.addAll(validateHardConstraintBusinessRules(constraint));
        }

        return violations;
    }

    /**
     * 验证软约束
     */
    private List<ConstraintViolation> validateSoftConstraints(Map<String, UnifiedConstraintConfiguration.SoftConstraint> softConstraints) {
        List<ConstraintViolation> violations = new ArrayList<>();

        for (Map.Entry<String, UnifiedConstraintConfiguration.SoftConstraint> entry : softConstraints.entrySet()) {
            String constraintId = entry.getKey();
            UnifiedConstraintConfiguration.SoftConstraint constraint = entry.getValue();

            // 检查必填字段
            if (constraint.getId() == null || constraint.getId().trim().isEmpty()) {
                violations.add(createViolation(constraintId, ViolationType.MISSING_REQUIRED_FIELD, 
                    ViolationSeverity.MEDIUM, "软约束缺少ID字段", null));
            }

            if (constraint.getName() == null || constraint.getName().trim().isEmpty()) {
                violations.add(createViolation(constraintId, ViolationType.MISSING_REQUIRED_FIELD, 
                    ViolationSeverity.MEDIUM, "软约束缺少名称字段", null));
            }

            // 检查权重范围
            if (constraint.getWeight() < constraint.getMinWeight() || constraint.getWeight() > constraint.getMaxWeight()) {
                violations.add(createViolation(constraintId, ViolationType.INVALID_WEIGHT_RANGE, 
                    ViolationSeverity.MEDIUM, 
                    String.format("软约束权重超出允许范围，当前权重: %d, 允许范围: %d-%d", 
                                 constraint.getWeight(), constraint.getMinWeight(), constraint.getMaxWeight()),
                    null));
            }

            // 检查退化曲线
            if (constraint.getDegradationCurve() != null) {
                List<String> validCurves = Arrays.asList("linear", "exponential", "logarithmic", "step");
                if (!validCurves.contains(constraint.getDegradationCurve())) {
                    violations.add(createViolation(constraintId, ViolationType.INVALID_DEGRADATION_CURVE, 
                        ViolationSeverity.LOW, 
                        String.format("软约束退化曲线类型无效: %s, 支持类型: %s", 
                                     constraint.getDegradationCurve(), String.join(", ", validCurves)),
                        null));
                }
            }

            // 检查满意度奖励值
            if (constraint.getSatisfactionReward() < 0) {
                violations.add(createViolation(constraintId, ViolationType.INVALID_SATISFACTION_REWARD, 
                    ViolationSeverity.LOW, 
                    String.format("软约束满意度奖励值不能为负数: %d", constraint.getSatisfactionReward()),
                    "请设置非负的奖励值"));
            }

            // 验证约束特定的业务规则
            violations.addAll(validateSoftConstraintBusinessRules(constraint));
        }

        return violations;
    }

    /**
     * 验证硬约束业务规则
     */
    private List<ConstraintViolation> validateHardConstraintBusinessRules(UnifiedConstraintConfiguration.HardConstraint constraint) {
        List<ConstraintViolation> violations = new ArrayList<>();

        // 根据约束ID验证特定业务规则
        switch (constraint.getId()) {
            case "HC1_WEEKDAY_EXAMS_ONLY":
                // 工作日考试约束的特定验证
                if (constraint.getWeight() < 500000) {
                    violations.add(createViolation(constraint.getId(), ViolationType.BUSINESS_RULE_VIOLATION, 
                        ViolationSeverity.MEDIUM, 
                        "工作日考试约束权重过低，可能导致周末安排考试",
                        "建议将权重设置为至少500000"));
                }
                break;

            case "HC2_EXAMINER_DEPARTMENT_RULE":
                // 考官科室规则的特定验证
                if (constraint.getStatus() == UnifiedConstraintConfiguration.ConstraintStatus.DISABLED) {
                    violations.add(createViolation(constraint.getId(), ViolationType.BUSINESS_RULE_VIOLATION, 
                        ViolationSeverity.HIGH, 
                        "考官科室规则是核心业务约束，不建议禁用",
                        "请启用此约束以确保考试公正性"));
                }
                break;

            case "HC3_TWO_MAIN_EXAMINERS_REQUIRED":
                // 双考官要求的特定验证
                if (!constraint.isMandatory()) {
                    violations.add(createViolation(constraint.getId(), ViolationType.BUSINESS_RULE_VIOLATION, 
                        ViolationSeverity.HIGH, 
                        "双考官要求应该是强制约束",
                        "请将此约束设置为强制约束"));
                }
                break;
        }

        return violations;
    }

    /**
     * 验证软约束业务规则
     */
    private List<ConstraintViolation> validateSoftConstraintBusinessRules(UnifiedConstraintConfiguration.SoftConstraint constraint) {
        List<ConstraintViolation> violations = new ArrayList<>();

        // 根据约束ID验证特定业务规则
        switch (constraint.getId()) {
            case "SC1_BACKUP_EXAMINER_DIFFERENT_DEPT":
                // 备份考官科室多样性的特定验证
                if (constraint.getWeight() > 90) {
                    violations.add(createViolation(constraint.getId(), ViolationType.BUSINESS_RULE_VIOLATION, 
                        ViolationSeverity.LOW, 
                        "备份考官科室多样性权重过高，可能影响其他重要软约束",
                        "建议将权重控制在90以内"));
                }
                break;

            case "SC4_WORKLOAD_BALANCE":
                // 工作负载均衡的特定验证
                if (constraint.getStatus() == UnifiedConstraintConfiguration.ConstraintStatus.DISABLED) {
                    violations.add(createViolation(constraint.getId(), ViolationType.BUSINESS_RULE_VIOLATION, 
                        ViolationSeverity.MEDIUM, 
                        "工作负载均衡对系统效率很重要，不建议禁用",
                        "建议启用此约束并适当调整权重"));
                }
                break;
        }

        return violations;
    }

    /**
     * 检测约束冲突
     */
    public ConstraintConflictDetection detectConstraintConflicts(UnifiedConstraintConfiguration config) {
        List<ConstraintConflict> conflicts = new ArrayList<>();

        // 检查硬约束之间的冲突
        conflicts.addAll(detectHardConstraintConflicts(config.getHardConstraints()));

        // 检查软约束之间的冲突
        conflicts.addAll(detectSoftConstraintConflicts(config.getSoftConstraints()));

        // 检查硬约束与软约束之间的冲突
        conflicts.addAll(detectHardSoftConstraintConflicts(config.getHardConstraints(), config.getSoftConstraints()));

        // 生成解决建议
        List<ConflictResolutionSuggestion> suggestions = generateResolutionSuggestions(conflicts);

        ConstraintConflictDetection detection = new ConstraintConflictDetection();
        detection.setHasConflicts(!conflicts.isEmpty());
        detection.setConflicts(conflicts);
        detection.setResolutionSuggestions(suggestions);
        detection.setLastDetectionTime(LocalDateTime.now());

        return detection;
    }

    /**
     * 检测硬约束冲突
     */
    private List<ConstraintConflict> detectHardConstraintConflicts(Map<String, UnifiedConstraintConfiguration.HardConstraint> hardConstraints) {
        List<ConstraintConflict> conflicts = new ArrayList<>();

        List<UnifiedConstraintConfiguration.HardConstraint> constraints = new ArrayList<>(hardConstraints.values());
        
        for (int i = 0; i < constraints.size(); i++) {
            for (int j = i + 1; j < constraints.size(); j++) {
                UnifiedConstraintConfiguration.HardConstraint constraint1 = constraints.get(i);
                UnifiedConstraintConfiguration.HardConstraint constraint2 = constraints.get(j);

                // 检查时间相关约束冲突
                if (isTimeRelatedConflict(constraint1, constraint2)) {
                    conflicts.add(createConflict(
                        Arrays.asList(constraint1.getId(), constraint2.getId()),
                        ConflictType.LOGICAL_CONFLICT,
                        ConflictSeverity.MEDIUM,
                        String.format("时间约束 '%s' 与 '%s' 可能存在逻辑冲突", constraint1.getName(), constraint2.getName()),
                        "请检查时间定义是否一致，或调整约束权重",
                        false
                    ));
                }

                // 检查资源相关约束冲突
                if (isResourceRelatedConflict(constraint1, constraint2)) {
                    conflicts.add(createConflict(
                        Arrays.asList(constraint1.getId(), constraint2.getId()),
                        ConflictType.RESOURCE_CONFLICT,
                        ConflictSeverity.HIGH,
                        String.format("资源约束 '%s' 与 '%s' 存在资源分配冲突", constraint1.getName(), constraint2.getName()),
                        "请重新评估资源分配策略或调整约束优先级",
                        false
                    ));
                }

                // 检查权重不平衡
                if (isWeightImbalanced(constraint1, constraint2)) {
                    conflicts.add(createConflict(
                        Arrays.asList(constraint1.getId(), constraint2.getId()),
                        ConflictType.WEIGHT_IMBALANCE,
                        ConflictSeverity.LOW,
                        String.format("约束 '%s' 与 '%s' 权重差异过大", constraint1.getName(), constraint2.getName()),
                        "建议调整权重比例，使其更加平衡",
                        true
                    ));
                }
            }
        }

        return conflicts;
    }

    /**
     * 检测软约束冲突
     */
    private List<ConstraintConflict> detectSoftConstraintConflicts(Map<String, UnifiedConstraintConfiguration.SoftConstraint> softConstraints) {
        List<ConstraintConflict> conflicts = new ArrayList<>();

        List<UnifiedConstraintConfiguration.SoftConstraint> constraints = new ArrayList<>(softConstraints.values());
        
        for (int i = 0; i < constraints.size(); i++) {
            for (int j = i + 1; j < constraints.size(); j++) {
                UnifiedConstraintConfiguration.SoftConstraint constraint1 = constraints.get(i);
                UnifiedConstraintConfiguration.SoftConstraint constraint2 = constraints.get(j);

                // 检查目标冲突（一个约束的满足可能导致另一个约束的违反）
                if (isObjectiveConflict(constraint1, constraint2)) {
                    conflicts.add(createConflict(
                        Arrays.asList(constraint1.getId(), constraint2.getId()),
                        ConflictType.OBJECTIVE_CONFLICT,
                        ConflictSeverity.MEDIUM,
                        String.format("软约束 '%s' 与 '%s' 存在目标冲突", constraint1.getName(), constraint2.getName()),
                        "请重新评估约束目标或调整权重分配",
                        false
                    ));
                }
            }
        }

        return conflicts;
    }

    /**
     * 检测硬约束与软约束之间的冲突
     */
    private List<ConstraintConflict> detectHardSoftConstraintConflicts(
            Map<String, UnifiedConstraintConfiguration.HardConstraint> hardConstraints,
            Map<String, UnifiedConstraintConfiguration.SoftConstraint> softConstraints) {
        
        List<ConstraintConflict> conflicts = new ArrayList<>();

        for (UnifiedConstraintConfiguration.HardConstraint hardConstraint : hardConstraints.values()) {
            for (UnifiedConstraintConfiguration.SoftConstraint softConstraint : softConstraints.values()) {
                
                // 检查硬约束是否使软约束无法满足
                if (isHardConstraintBlockingSoftConstraint(hardConstraint, softConstraint)) {
                    conflicts.add(createConflict(
                        Arrays.asList(hardConstraint.getId(), softConstraint.getId()),
                        ConflictType.HARD_SOFT_CONFLICT,
                        ConflictSeverity.MEDIUM,
                        String.format("硬约束 '%s' 可能阻止软约束 '%s' 的满足", hardConstraint.getName(), softConstraint.getName()),
                        "请考虑调整硬约束的严格程度或软约束的期望",
                        false
                    ));
                }
            }
        }

        return conflicts;
    }

    /**
     * 验证全局设置
     */
    private List<ConstraintViolation> validateGlobalSettings(UnifiedConstraintConfiguration.GlobalSettings globalSettings) {
        List<ConstraintViolation> violations = new ArrayList<>();

        if (globalSettings == null) {
            violations.add(createViolation("GLOBAL_SETTINGS", ViolationType.MISSING_REQUIRED_FIELD, 
                ViolationSeverity.HIGH, "缺少全局设置配置", null));
            return violations;
        }

        // 检查求解器超时时间
        if (globalSettings.getMaxSolverTime() <= 0) {
            violations.add(createViolation("GLOBAL_SETTINGS", ViolationType.INVALID_CONFIGURATION, 
                ViolationSeverity.HIGH, "求解器超时时间必须大于0", null));
        } else if (globalSettings.getMaxSolverTime() > 3600) {
            violations.add(createViolation("GLOBAL_SETTINGS", ViolationType.INVALID_CONFIGURATION, 
                ViolationSeverity.MEDIUM, "求解器超时时间过长，可能影响系统响应", "建议设置在300-1800秒之间"));
        }

        // 检查终止分数阈值
        if (globalSettings.getTerminationScoreThreshold() < 0) {
            violations.add(createViolation("GLOBAL_SETTINGS", ViolationType.INVALID_CONFIGURATION, 
                ViolationSeverity.LOW, "终止分数阈值不应为负数", null));
        }

        return violations;
    }

    /**
     * 生成配置警告
     */
    private List<ConstraintWarning> generateConfigurationWarnings(UnifiedConstraintConfiguration config) {
        List<ConstraintWarning> warnings = new ArrayList<>();

        // 检查禁用的重要约束
        long disabledHardConstraints = config.getHardConstraints().values().stream()
            .filter(c -> c.getStatus() == UnifiedConstraintConfiguration.ConstraintStatus.DISABLED)
            .count();
        
        if (disabledHardConstraints > 0) {
            warnings.add(createWarning("CONFIGURATION", WarningType.PERFORMANCE, 
                WarningSeverity.MEDIUM, 
                String.format("有 %d 个硬约束被禁用", disabledHardConstraints),
                "禁用硬约束可能导致不可行的调度结果"));
        }

        // 检查权重分布
        double avgHardWeight = config.getHardConstraints().values().stream()
            .filter(c -> c.getStatus() == UnifiedConstraintConfiguration.ConstraintStatus.ENABLED)
            .mapToInt(UnifiedConstraintConfiguration.HardConstraint::getWeight)
            .average().orElse(0);

        double avgSoftWeight = config.getSoftConstraints().values().stream()
            .filter(c -> c.getStatus() == UnifiedConstraintConfiguration.ConstraintStatus.ENABLED)
            .mapToInt(UnifiedConstraintConfiguration.SoftConstraint::getWeight)
            .average().orElse(0);

        if (avgSoftWeight > avgHardWeight * 0.1) {
            warnings.add(createWarning("CONFIGURATION", WarningType.CONFIGURATION, 
                WarningSeverity.LOW, 
                "软约束平均权重相对硬约束过高",
                "可能影响硬约束的优先级，建议调整权重比例"));
        }

        // 检查性能相关设置
        if (config.getGlobalSettings().getMaxSolverTime() > 600) {
            warnings.add(createWarning("GLOBAL_SETTINGS", WarningType.PERFORMANCE, 
                WarningSeverity.MEDIUM, 
                "求解器超时时间较长",
                "可能影响系统响应性能，建议根据实际需求调整"));
        }

        return warnings;
    }

    // 辅助方法

    private boolean isTimeRelatedConflict(UnifiedConstraintConfiguration.HardConstraint c1, UnifiedConstraintConfiguration.HardConstraint c2) {
        return (c1.getCategory() == UnifiedConstraintConfiguration.ConstraintCategory.TIME && 
                c2.getCategory() == UnifiedConstraintConfiguration.ConstraintCategory.TIME) &&
               (c1.getId().contains("WEEKDAY") && c2.getId().contains("SHIFT"));
    }

    private boolean isResourceRelatedConflict(UnifiedConstraintConfiguration.HardConstraint c1, UnifiedConstraintConfiguration.HardConstraint c2) {
        return (c1.getCategory() == UnifiedConstraintConfiguration.ConstraintCategory.RESOURCE && 
                c2.getCategory() == UnifiedConstraintConfiguration.ConstraintCategory.RESOURCE) &&
               (c1.getId().contains("EXAMINER") && c2.getId().contains("EXAMINER"));
    }

    private boolean isWeightImbalanced(UnifiedConstraintConfiguration.HardConstraint c1, UnifiedConstraintConfiguration.HardConstraint c2) {
        if (c1.getPriority() == c2.getPriority()) {
            double ratio = Math.max(c1.getWeight(), c2.getWeight()) / (double) Math.min(c1.getWeight(), c2.getWeight());
            return ratio > 3.0; // 权重差异超过3倍认为不平衡
        }
        return false;
    }

    private boolean isObjectiveConflict(UnifiedConstraintConfiguration.SoftConstraint c1, UnifiedConstraintConfiguration.SoftConstraint c2) {
        // 简化的目标冲突检测逻辑
        return (c1.getId().contains("WORKLOAD_BALANCE") && c2.getId().contains("PREFERRED_TIME")) ||
               (c1.getId().contains("MINIMIZE_TRAVEL") && c2.getId().contains("DEPARTMENT"));
    }

    private boolean isHardConstraintBlockingSoftConstraint(UnifiedConstraintConfiguration.HardConstraint hard, UnifiedConstraintConfiguration.SoftConstraint soft) {
        // 简化的硬软约束冲突检测逻辑
        return (hard.getId().contains("DEPARTMENT") && soft.getId().contains("WORKLOAD_BALANCE")) ||
               (hard.getId().contains("AVAILABILITY") && soft.getId().contains("PREFERRED_TIME"));
    }

    private boolean isVersionCompatible(String version) {
        // 简化的版本兼容性检查
        return version != null && version.matches("\\d+\\.\\d+\\.\\d+");
    }

    private ConstraintViolation createViolation(String constraintId, ViolationType type, ViolationSeverity severity, String message, String details) {
        ConstraintViolation violation = new ConstraintViolation();
        violation.setConstraintId(constraintId);
        violation.setViolationType(type);
        violation.setSeverity(severity);
        violation.setMessage(message);
        violation.setDetails(details);
        violation.setTimestamp(LocalDateTime.now());
        return violation;
    }

    private ConstraintWarning createWarning(String constraintId, WarningType type, WarningSeverity severity, String message, String suggestion) {
        ConstraintWarning warning = new ConstraintWarning();
        warning.setConstraintId(constraintId);
        warning.setWarningType(type);
        warning.setSeverity(severity);
        warning.setMessage(message);
        warning.setSuggestion(suggestion);
        warning.setTimestamp(LocalDateTime.now());
        return warning;
    }

    private ConstraintConflict createConflict(List<String> constraintIds, ConflictType type, ConflictSeverity severity, String description, String resolution, boolean autoResolvable) {
        ConstraintConflict conflict = new ConstraintConflict();
        conflict.setConstraintIds(constraintIds);
        conflict.setConflictType(type);
        conflict.setSeverity(severity);
        conflict.setDescription(description);
        conflict.setResolution(resolution);
        conflict.setAutoResolvable(autoResolvable);
        return conflict;
    }

    private List<ConstraintViolation> convertConflictsToViolations(List<ConstraintConflict> conflicts) {
        return conflicts.stream()
            .map(conflict -> {
                ConstraintViolation violation = new ConstraintViolation();
                violation.setConstraintId(String.join(",", conflict.getConstraintIds()));
                violation.setViolationType(ViolationType.CONFLICT);
                violation.setSeverity(convertConflictSeverityToViolationSeverity(conflict.getSeverity()));
                violation.setMessage(conflict.getDescription());
                violation.setDetails(conflict.getResolution());
                violation.setTimestamp(LocalDateTime.now());
                return violation;
            })
            .collect(Collectors.toList());
    }

    private ViolationSeverity convertConflictSeverityToViolationSeverity(ConflictSeverity conflictSeverity) {
        switch (conflictSeverity) {
            case HIGH: return ViolationSeverity.HIGH;
            case MEDIUM: return ViolationSeverity.MEDIUM;
            case LOW: return ViolationSeverity.LOW;
            default: return ViolationSeverity.MEDIUM;
        }
    }

    private List<ConflictResolutionSuggestion> generateResolutionSuggestions(List<ConstraintConflict> conflicts) {
        return conflicts.stream()
            .map(conflict -> {
                ConflictResolutionSuggestion suggestion = new ConflictResolutionSuggestion();
                suggestion.setConflictId(String.join("_", conflict.getConstraintIds()));
                suggestion.setSuggestion(conflict.getResolution());
                suggestion.setPriority(conflict.getSeverity().toString());
                suggestion.setAutoApplicable(conflict.isAutoResolvable());
                return suggestion;
            })
            .collect(Collectors.toList());
    }

    private String generateConfigurationHash(UnifiedConstraintConfiguration config) {
        // 简化的哈希生成
        return String.valueOf(config.toString().hashCode());
    }

    private String getStackTrace(Exception e) {
        java.io.StringWriter sw = new java.io.StringWriter();
        java.io.PrintWriter pw = new java.io.PrintWriter(sw);
        e.printStackTrace(pw);
        return sw.toString();
    }

    // 内部类定义

    @RegisterForReflection
    public static class ConstraintValidationResult {
        private boolean isValid;
        private List<ConstraintViolation> violations;
        private List<ConstraintWarning> warnings;
        private long validationTime;
        private LocalDateTime timestamp;
        private String configurationHash;

        // Getters and Setters
        public boolean isValid() { return isValid; }
        public void setValid(boolean valid) { isValid = valid; }

        public List<ConstraintViolation> getViolations() { return violations; }
        public void setViolations(List<ConstraintViolation> violations) { this.violations = violations; }

        public List<ConstraintWarning> getWarnings() { return warnings; }
        public void setWarnings(List<ConstraintWarning> warnings) { this.warnings = warnings; }

        public long getValidationTime() { return validationTime; }
        public void setValidationTime(long validationTime) { this.validationTime = validationTime; }

        public LocalDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

        public String getConfigurationHash() { return configurationHash; }
        public void setConfigurationHash(String configurationHash) { this.configurationHash = configurationHash; }
    }

    @RegisterForReflection
    public static class ConstraintViolation {
        private String constraintId;
        private ViolationType violationType;
        private ViolationSeverity severity;
        private String message;
        private String details;
        private LocalDateTime timestamp;

        // Getters and Setters
        public String getConstraintId() { return constraintId; }
        public void setConstraintId(String constraintId) { this.constraintId = constraintId; }

        public ViolationType getViolationType() { return violationType; }
        public void setViolationType(ViolationType violationType) { this.violationType = violationType; }

        public ViolationSeverity getSeverity() { return severity; }
        public void setSeverity(ViolationSeverity severity) { this.severity = severity; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public String getDetails() { return details; }
        public void setDetails(String details) { this.details = details; }

        public LocalDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    }

    @RegisterForReflection
    public static class ConstraintWarning {
        private String constraintId;
        private WarningType warningType;
        private WarningSeverity severity;
        private String message;
        private String suggestion;
        private LocalDateTime timestamp;

        // Getters and Setters
        public String getConstraintId() { return constraintId; }
        public void setConstraintId(String constraintId) { this.constraintId = constraintId; }

        public WarningType getWarningType() { return warningType; }
        public void setWarningType(WarningType warningType) { this.warningType = warningType; }

        public WarningSeverity getSeverity() { return severity; }
        public void setSeverity(WarningSeverity severity) { this.severity = severity; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public String getSuggestion() { return suggestion; }
        public void setSuggestion(String suggestion) { this.suggestion = suggestion; }

        public LocalDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    }

    @RegisterForReflection
    public static class ConstraintConflictDetection {
        private boolean hasConflicts;
        private List<ConstraintConflict> conflicts;
        private List<ConflictResolutionSuggestion> resolutionSuggestions;
        private LocalDateTime lastDetectionTime;

        // Getters and Setters
        public boolean isHasConflicts() { return hasConflicts; }
        public void setHasConflicts(boolean hasConflicts) { this.hasConflicts = hasConflicts; }

        public List<ConstraintConflict> getConflicts() { return conflicts; }
        public void setConflicts(List<ConstraintConflict> conflicts) { this.conflicts = conflicts; }

        public List<ConflictResolutionSuggestion> getResolutionSuggestions() { return resolutionSuggestions; }
        public void setResolutionSuggestions(List<ConflictResolutionSuggestion> resolutionSuggestions) { this.resolutionSuggestions = resolutionSuggestions; }

        public LocalDateTime getLastDetectionTime() { return lastDetectionTime; }
        public void setLastDetectionTime(LocalDateTime lastDetectionTime) { this.lastDetectionTime = lastDetectionTime; }
    }

    @RegisterForReflection
    public static class ConstraintConflict {
        private List<String> constraintIds;
        private ConflictType conflictType;
        private ConflictSeverity severity;
        private String description;
        private String resolution;
        private boolean autoResolvable;

        // Getters and Setters
        public List<String> getConstraintIds() { return constraintIds; }
        public void setConstraintIds(List<String> constraintIds) { this.constraintIds = constraintIds; }

        public ConflictType getConflictType() { return conflictType; }
        public void setConflictType(ConflictType conflictType) { this.conflictType = conflictType; }

        public ConflictSeverity getSeverity() { return severity; }
        public void setSeverity(ConflictSeverity severity) { this.severity = severity; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getResolution() { return resolution; }
        public void setResolution(String resolution) { this.resolution = resolution; }

        public boolean isAutoResolvable() { return autoResolvable; }
        public void setAutoResolvable(boolean autoResolvable) { this.autoResolvable = autoResolvable; }
    }

    @RegisterForReflection
    public static class ConflictResolutionSuggestion {
        private String conflictId;
        private String suggestion;
        private String priority;
        private boolean autoApplicable;

        // Getters and Setters
        public String getConflictId() { return conflictId; }
        public void setConflictId(String conflictId) { this.conflictId = conflictId; }

        public String getSuggestion() { return suggestion; }
        public void setSuggestion(String suggestion) { this.suggestion = suggestion; }

        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }

        public boolean isAutoApplicable() { return autoApplicable; }
        public void setAutoApplicable(boolean autoApplicable) { this.autoApplicable = autoApplicable; }
    }

    // 枚举定义
    public enum ViolationType {
        MISSING_REQUIRED_FIELD,
        INVALID_WEIGHT_RANGE,
        MANDATORY_CONSTRAINT_DISABLED,
        VERSION_INCOMPATIBLE,
        INVALID_DEGRADATION_CURVE,
        INVALID_SATISFACTION_REWARD,
        BUSINESS_RULE_VIOLATION,
        INVALID_CONFIGURATION,
        CONFLICT,
        SYSTEM_ERROR
    }

    public enum ViolationSeverity {
        CRITICAL, HIGH, MEDIUM, LOW
    }

    public enum WarningType {
        PERFORMANCE, CONFIGURATION, BUSINESS_RULE
    }

    public enum WarningSeverity {
        HIGH, MEDIUM, LOW
    }

    public enum ConflictType {
        LOGICAL_CONFLICT,
        RESOURCE_CONFLICT,
        WEIGHT_IMBALANCE,
        OBJECTIVE_CONFLICT,
        HARD_SOFT_CONFLICT
    }

    public enum ConflictSeverity {
        HIGH, MEDIUM, LOW
    }
}
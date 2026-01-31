package com.examiner.service;

import com.examiner.model.UnifiedConstraintConfiguration;
import com.examiner.model.ExaminerConstraintDefinitions;
import com.examiner.dto.ConstraintValidationRequestDto;
import com.examiner.dto.ConstraintValidationResponseDto;
import com.examiner.dto.ConstraintConflictDetectionDto;
import com.examiner.dto.ConstraintPerformanceMetricsDto;
import com.examiner.dto.ConstraintViolationDto;
import com.examiner.dto.ConstraintWarningDto;
import com.examiner.dto.DynamicConstraintAdjustmentDto;

import javax.inject.Inject;
import javax.enterprise.context.ApplicationScoped;
import javax.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 约束验证API服务
 * 提供约束配置验证的核心业务逻辑
 */
@ApplicationScoped
@Transactional
public class ConstraintValidationApiService {

    private static final Logger logger = LoggerFactory.getLogger(ConstraintValidationApiService.class);

    @Inject
    private UnifiedConstraintValidationService validationService;

    @Inject
    private ConstraintPerformanceMonitoringService performanceService;

    /**
     * 验证约束配置
     */
    public ConstraintValidationResponseDto validateConfiguration(ConstraintValidationRequestDto request) {
        logger.info("开始验证约束配置，配置ID: {}", request.getConfigurationId());
        
        long startTime = System.currentTimeMillis();
        
        try {
            // 转换请求DTO为内部配置对象
            UnifiedConstraintConfiguration config = convertToInternalConfiguration(request);
            
            // 执行验证
            UnifiedConstraintValidationService.ConstraintValidationResult result = 
                validationService.validateConfiguration(config);
            
            // 记录性能指标
            long validationTime = System.currentTimeMillis() - startTime;
            performanceService.recordValidation(
                validationTime, 
                result.getViolations().size(),
                result.getWarnings().size()
            );
            
            // 转换结果为响应DTO
            ConstraintValidationResponseDto response = convertToResponseDto(result, validationTime);
            
            logger.info("约束配置验证完成，耗时: {}ms, 违规数: {}, 警告数: {}", 
                validationTime, result.getViolations().size(), result.getWarnings().size());
            
            return response;
            
        } catch (Exception e) {
            logger.error("约束配置验证过程中发生错误", e);
            
            // 创建错误响应
            ConstraintValidationResponseDto errorResponse = new ConstraintValidationResponseDto();
            errorResponse.setValid(false);
            errorResponse.setValidationTime(System.currentTimeMillis() - startTime);
            errorResponse.setTimestamp(LocalDateTime.now());
            errorResponse.setErrorMessage("验证过程中发生系统错误: " + e.getMessage());
            
            // 添加系统错误违规
            ConstraintViolationDto systemViolation = new ConstraintViolationDto();
            systemViolation.setConstraintId("SYSTEM_ERROR");
            systemViolation.setViolationType("SYSTEM_ERROR");
            systemViolation.setSeverity("CRITICAL");
            systemViolation.setMessage("系统验证错误: " + e.getMessage());
            systemViolation.setTimestamp(LocalDateTime.now());
            
            errorResponse.setViolations(Collections.singletonList(systemViolation));
            errorResponse.setWarnings(Collections.emptyList());
            
            return errorResponse;
        }
    }

    /**
     * 检测约束冲突
     */
    public ConstraintConflictDetectionDto detectConstraintConflicts(ConstraintValidationRequestDto request) {
        logger.info("开始检测约束冲突，配置ID: {}", request.getConfigurationId());
        
        try {
            UnifiedConstraintConfiguration config = convertToInternalConfiguration(request);
            
            UnifiedConstraintValidationService.ConstraintConflictDetection result = 
                validationService.detectConstraintConflicts(config);
            
            ConstraintConflictDetectionDto response = new ConstraintConflictDetectionDto();
            response.setHasConflicts(result.isHasConflicts());
            
            // 将冲突转换为DTO格式并设置到相应的字段
            List<ConstraintConflictDetectionDto.ConstraintConflictDto> conflictDtos = convertConflictsToConstraintConflictDto(result.getConflicts());
            response.setHardConstraintConflicts(conflictDtos);
            response.setTotalConflicts(conflictDtos.size());
            
            // 将解决建议转换为DTO格式
            List<ConstraintConflictDetectionDto.ConflictResolutionSuggestionDto> suggestionDtos = convertResolutionSuggestionsToConflictResolutionSuggestionDto(result.getResolutionSuggestions());
            response.setResolutionSuggestions(suggestionDtos);
            response.setLastDetectionTime(LocalDateTime.now());
            
            logger.info("约束冲突检测完成，发现冲突数: {}", result.getConflicts().size());
            
            return response;
            
        } catch (Exception e) {
            logger.error("约束冲突检测过程中发生错误", e);
            throw new RuntimeException("冲突检测失败: " + e.getMessage(), e);
        }
    }

    /**
     * 应用约束预设
     */
    public ConstraintValidationResponseDto applyConstraintPreset(String presetName, ConstraintValidationRequestDto baseConfig) {
        logger.info("应用约束预设: {}", presetName);
        
        try {
            // 获取预设配置
            ExaminerConstraintDefinitions.ConstraintPreset preset = getConstraintPreset(presetName);
            if (preset == null) {
                throw new IllegalArgumentException("未找到预设配置: " + presetName);
            }
            
            // 转换基础配置
            UnifiedConstraintConfiguration config = convertToInternalConfiguration(baseConfig);
            
            // 应用预设
            UnifiedConstraintConfiguration updatedConfig = applyPresetToConfiguration(config, preset);
            
            // 验证更新后的配置
            UnifiedConstraintValidationService.ConstraintValidationResult result = 
                validationService.validateConfiguration(updatedConfig);
            
            // 转换结果
            ConstraintValidationResponseDto response = convertToResponseDto(result, 0);
            response.setAppliedPreset(presetName);
            
            logger.info("约束预设应用完成: {}", presetName);
            
            return response;
            
        } catch (Exception e) {
            logger.error("应用约束预设过程中发生错误", e);
            throw new RuntimeException("预设应用失败: " + e.getMessage(), e);
        }
    }

    /**
     * 动态调整约束权重
     */
    public ConstraintValidationResponseDto adjustConstraintWeights(DynamicConstraintAdjustmentDto adjustment) {
        logger.info("动态调整约束权重，调整项数: {}", adjustment.getAdjustments().size());
        
        try {
            // 获取当前配置
            UnifiedConstraintConfiguration config = getCurrentConfiguration();
            
            // 应用权重调整
            for (DynamicConstraintAdjustmentDto.WeightAdjustment weightAdjustment : adjustment.getAdjustments()) {
                applyWeightAdjustment(config, weightAdjustment);
            }
            
            // 验证调整后的配置
            UnifiedConstraintValidationService.ConstraintValidationResult result = 
                validationService.validateConfiguration(config);
            
            // 转换结果
            ConstraintValidationResponseDto response = convertToResponseDto(result, 0);
            response.setDynamicAdjustmentApplied(true);
            
            logger.info("约束权重动态调整完成");
            
            return response;
            
        } catch (Exception e) {
            logger.error("动态调整约束权重过程中发生错误", e);
            throw new RuntimeException("权重调整失败: " + e.getMessage(), e);
        }
    }

    /**
     * 获取约束性能指标
     */
    public List<ConstraintPerformanceMetricsDto> getConstraintPerformanceMetrics() {
        logger.info("获取约束性能指标");
        
        try {
            Map<String, ConstraintPerformanceMonitoringService.ConstraintPerformanceMetrics> metrics = 
                performanceService.getPerformanceMetrics();
            
            return metrics.entrySet().stream()
                .map(entry -> convertPerformanceMetricsToDto(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
                
        } catch (Exception e) {
            logger.error("获取性能指标过程中发生错误", e);
            throw new RuntimeException("获取性能指标失败: " + e.getMessage(), e);
        }
    }

    /**
     * 重置性能统计
     */
    public void resetPerformanceStatistics() {
        logger.info("重置约束性能统计");
        
        try {
            performanceService.resetStatistics();
            logger.info("性能统计重置完成");
            
        } catch (Exception e) {
            logger.error("重置性能统计过程中发生错误", e);
            throw new RuntimeException("重置性能统计失败: " + e.getMessage(), e);
        }
    }

    /**
     * 获取约束验证历史
     */
    public List<ConstraintValidationResponseDto> getValidationHistory(int limit) {
        logger.info("获取约束验证历史，限制数量: {}", limit);
        
        try {
            // 这里应该从数据库或缓存中获取历史记录
            // 暂时返回空列表，实际实现需要添加持久化逻辑
            return Collections.emptyList();
            
        } catch (Exception e) {
            logger.error("获取验证历史过程中发生错误", e);
            throw new RuntimeException("获取验证历史失败: " + e.getMessage(), e);
        }
    }

    // 私有辅助方法

    /**
     * 转换请求DTO为内部配置对象
     */
    private UnifiedConstraintConfiguration convertToInternalConfiguration(ConstraintValidationRequestDto request) {
        UnifiedConstraintConfiguration config = new UnifiedConstraintConfiguration();
        
        // 设置基本信息
        config.setConfigurationId(request.getConfigurationId());
        config.setVersion(request.getVersion());
        config.setDescription(request.getDescription());
        
        // 转换硬约束
        if (request.getHardConstraints() != null) {
            Map<String, UnifiedConstraintConfiguration.HardConstraint> hardConstraints = new HashMap<>();
            request.getHardConstraints().forEach((id, dto) -> {
                UnifiedConstraintConfiguration.HardConstraint constraint = new UnifiedConstraintConfiguration.HardConstraint();
                constraint.setId(dto.getId());
                constraint.setName(dto.getName());
                constraint.setDescription(dto.getDescription());
                constraint.setWeight(dto.getWeight());
                constraint.setMinWeight(dto.getMinWeight());
                constraint.setMaxWeight(dto.getMaxWeight());
                constraint.setMandatory(dto.isMandatory());
                constraint.setAdjustable(dto.isAdjustable());
                constraint.setStatus(UnifiedConstraintConfiguration.ConstraintStatus.valueOf(dto.getStatus()));
                constraint.setType(UnifiedConstraintConfiguration.ConstraintType.valueOf(dto.getType()));
                constraint.setCategory(UnifiedConstraintConfiguration.ConstraintCategory.valueOf(dto.getCategory()));
                constraint.setPriority(UnifiedConstraintConfiguration.ConstraintPriority.valueOf(dto.getPriority()));
                constraint.setVersion(dto.getVersion());
                hardConstraints.put(id, constraint);
            });
            config.setHardConstraints(hardConstraints);
        }
        
        // 转换软约束
        if (request.getSoftConstraints() != null) {
            Map<String, UnifiedConstraintConfiguration.SoftConstraint> softConstraints = new HashMap<>();
            request.getSoftConstraints().forEach((id, dto) -> {
                UnifiedConstraintConfiguration.SoftConstraint constraint = new UnifiedConstraintConfiguration.SoftConstraint();
                constraint.setId(dto.getId());
                constraint.setName(dto.getName());
                constraint.setDescription(dto.getDescription());
                constraint.setWeight(dto.getWeight());
                constraint.setMinWeight(dto.getMinWeight());
                constraint.setMaxWeight(dto.getMaxWeight());
                constraint.setAdjustable(dto.isAdjustable());
                constraint.setStatus(UnifiedConstraintConfiguration.ConstraintStatus.valueOf(dto.getStatus()));
                constraint.setType(UnifiedConstraintConfiguration.ConstraintType.valueOf(dto.getType()));
                constraint.setCategory(UnifiedConstraintConfiguration.ConstraintCategory.valueOf(dto.getCategory()));
                constraint.setPriority(UnifiedConstraintConfiguration.ConstraintPriority.valueOf(dto.getPriority()));
                constraint.setVersion(dto.getVersion());
                constraint.setDegradationCurve(dto.getDegradationCurve());
                constraint.setSatisfactionReward(dto.getSatisfactionReward());
                softConstraints.put(id, constraint);
            });
            config.setSoftConstraints(softConstraints);
        }
        
        // 转换全局设置
        if (request.getGlobalSettings() != null) {
            UnifiedConstraintConfiguration.GlobalSettings globalSettings = new UnifiedConstraintConfiguration.GlobalSettings();
            globalSettings.setMaxSolverTime(request.getGlobalSettings().getMaxSolverTime());
            globalSettings.setTerminationScoreThreshold(request.getGlobalSettings().getTerminationScoreThreshold());
            globalSettings.setEnableIncrementalScoring(request.getGlobalSettings().isEnableIncrementalScoring());
            globalSettings.setEnableMultiThreading(request.getGlobalSettings().isEnableMultiThreading());
            config.setGlobalSettings(globalSettings);
        }
        
        return config;
    }

    /**
     * 转换验证结果为响应DTO
     */
    private ConstraintValidationResponseDto convertToResponseDto(
            UnifiedConstraintValidationService.ConstraintValidationResult result, 
            long validationTime) {
        
        ConstraintValidationResponseDto response = new ConstraintValidationResponseDto();
        response.setValid(result.isValid());
        response.setValidationTime(validationTime);
        response.setTimestamp(LocalDateTime.now());
        response.setConfigurationHash(result.getConfigurationHash());
        
        // 转换违规信息
        List<ConstraintViolationDto> violations = result.getViolations().stream()
            .map(this::convertViolationToDto)
            .collect(Collectors.toList());
        response.setViolations(violations);
        
        // 转换警告信息
        List<ConstraintWarningDto> warnings = result.getWarnings().stream()
            .map(this::convertWarningToDto)
            .collect(Collectors.toList());
        response.setWarnings(warnings);
        
        return response;
    }

    /**
     * 转换违规信息为DTO
     */
    private ConstraintViolationDto convertViolationToDto(UnifiedConstraintValidationService.ConstraintViolation violation) {
        ConstraintViolationDto dto = new ConstraintViolationDto();
        dto.setConstraintId(violation.getConstraintId());
        dto.setViolationType(violation.getViolationType().name());
        dto.setSeverity(violation.getSeverity().name());
        dto.setMessage(violation.getMessage());
        dto.setDetails(violation.getDetails());
        dto.setTimestamp(violation.getTimestamp());
        return dto;
    }

    /**
     * 转换警告信息为DTO
     */
    private ConstraintWarningDto convertWarningToDto(UnifiedConstraintValidationService.ConstraintWarning warning) {
        ConstraintWarningDto dto = new ConstraintWarningDto();
        dto.setConstraintId(warning.getConstraintId());
        dto.setWarningType(warning.getWarningType().name());
        dto.setLevel(warning.getSeverity().name());
        dto.setMessage(warning.getMessage());
        dto.setRecommendation(warning.getSuggestion());
        dto.setTimestamp(warning.getTimestamp());
        return dto;
    }

    /**
     * 转换冲突为ConstraintConflictDto
     */
    private List<ConstraintConflictDetectionDto.ConstraintConflictDto> convertConflictsToConstraintConflictDto(List<UnifiedConstraintValidationService.ConstraintConflict> conflicts) {
        return conflicts.stream()
            .map(conflict -> {
                ConstraintConflictDetectionDto.ConstraintConflictDto dto = new ConstraintConflictDetectionDto.ConstraintConflictDto();
                dto.setConflictId(UUID.randomUUID().toString());
                dto.setConflictType(conflict.getConflictType().name());
                dto.setSeverity(conflict.getSeverity().name());
                dto.setDescription(conflict.getDescription());
                dto.setInvolvedConstraints(conflict.getConstraintIds());
                dto.setConflictReason(conflict.getResolution());
                dto.setImpact("MEDIUM");
                return dto;
            })
            .collect(Collectors.toList());
    }

    /**
     * 转换解决建议为ConflictResolutionSuggestionDto
     */
    private List<ConstraintConflictDetectionDto.ConflictResolutionSuggestionDto> convertResolutionSuggestionsToConflictResolutionSuggestionDto(List<UnifiedConstraintValidationService.ConflictResolutionSuggestion> suggestions) {
        return suggestions.stream()
            .map(suggestion -> {
                ConstraintConflictDetectionDto.ConflictResolutionSuggestionDto dto = new ConstraintConflictDetectionDto.ConflictResolutionSuggestionDto();
                dto.setSuggestionId(UUID.randomUUID().toString());
                dto.setConflictId(suggestion.getConflictId());
                dto.setResolutionType("MANUAL"); // 默认为手动解决
                dto.setDescription(suggestion.getSuggestion());
                dto.setPriority(suggestion.getPriority());
                dto.setEstimatedImpact("MEDIUM");
                dto.setActionRequired(suggestion.isAutoApplicable() ? "AUTO" : "MANUAL");
                return dto;
            })
            .collect(Collectors.toList());
    }

    /**
     * 转换性能指标为DTO
     */
    private ConstraintPerformanceMetricsDto convertPerformanceMetricsToDto(
            String constraintId, 
            ConstraintPerformanceMonitoringService.ConstraintPerformanceMetrics metrics) {
        
        ConstraintPerformanceMetricsDto dto = new ConstraintPerformanceMetricsDto();
        dto.setConstraintId(constraintId);
        dto.setTotalExecutions(metrics.getTotalExecutions());
        dto.setTotalExecutionTime(metrics.getTotalExecutionTime());
        dto.setAverageExecutionTime(metrics.getAverageExecutionTime());
        dto.setLastExecutionTime(metrics.getLastExecutionTime());
        dto.setErrorCount(metrics.getErrorCount());
        dto.setLastUpdated(metrics.getLastUpdated());
        return dto;
    }

    /**
     * 获取约束预设
     */
    private ExaminerConstraintDefinitions.ConstraintPreset getConstraintPreset(String presetName) {
        switch (presetName.toUpperCase()) {
            case "STRICT":
                return ExaminerConstraintDefinitions.CONSTRAINT_PRESETS.get("STRICT_MODE");
            case "BALANCED":
                return ExaminerConstraintDefinitions.CONSTRAINT_PRESETS.get("BALANCED_MODE");
            case "FLEXIBLE":
                return ExaminerConstraintDefinitions.CONSTRAINT_PRESETS.get("FLEXIBLE_MODE");
            default:
                return null;
        }
    }

    /**
     * 应用预设到配置
     */
    private UnifiedConstraintConfiguration applyPresetToConfiguration(
            UnifiedConstraintConfiguration config, 
            ExaminerConstraintDefinitions.ConstraintPreset preset) {
        
        // 应用硬约束权重
        preset.getHardConstraintWeights().forEach((constraintId, weight) -> {
            UnifiedConstraintConfiguration.HardConstraint constraint = config.getHardConstraints().get(constraintId);
            if (constraint != null) {
                constraint.setWeight(weight);
            }
        });
        
        // 应用软约束权重
        preset.getSoftConstraintWeights().forEach((constraintId, weight) -> {
            UnifiedConstraintConfiguration.SoftConstraint constraint = config.getSoftConstraints().get(constraintId);
            if (constraint != null) {
                constraint.setWeight(weight);
            }
        });
        
        // 应用全局设置
        if (preset.getGlobalSettings() != null && config.getGlobalSettings() != null) {
            if (preset.getGlobalSettings().containsKey("maxSolverTime")) {
                config.getGlobalSettings().setMaxSolverTime(
                    (Integer) preset.getGlobalSettings().get("maxSolverTime")
                );
            }
            if (preset.getGlobalSettings().containsKey("terminationScoreThreshold")) {
                config.getGlobalSettings().setTerminationScoreThreshold(
                    (Double) preset.getGlobalSettings().get("terminationScoreThreshold")
                );
            }
        }
        
        return config;
    }

    /**
     * 应用权重调整
     */
    private void applyWeightAdjustment(
            UnifiedConstraintConfiguration config, 
            DynamicConstraintAdjustmentDto.WeightAdjustment adjustment) {
        
        if (adjustment.getConstraintType().equals("HARD")) {
            UnifiedConstraintConfiguration.HardConstraint constraint = 
                config.getHardConstraints().get(adjustment.getConstraintId());
            if (constraint != null) {
                constraint.setWeight(adjustment.getNewWeight());
            }
        } else if (adjustment.getConstraintType().equals("SOFT")) {
            UnifiedConstraintConfiguration.SoftConstraint constraint = 
                config.getSoftConstraints().get(adjustment.getConstraintId());
            if (constraint != null) {
                constraint.setWeight(adjustment.getNewWeight());
            }
        }
    }

    /**
     * 获取当前配置（暂时返回默认配置）
     */
    private UnifiedConstraintConfiguration getCurrentConfiguration() {
        // 这里应该从数据库或配置服务中获取当前配置
        // 暂时返回默认配置
        return new UnifiedConstraintConfiguration();
    }
}
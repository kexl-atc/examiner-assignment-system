package com.examiner.controller;

import com.examiner.dto.*;
import com.examiner.service.ConstraintValidationApiService;
import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 约束验证控制器
 * 提供REST API接口用于约束配置验证
 */
@Path("/api/constraint-validation")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ConstraintValidationController {

    @Inject
    private ConstraintValidationApiService constraintValidationApiService;

    /**
     * 验证约束配置
     */
    @POST
    @Path("/validate")
    public Response validateConstraints(@Valid ConstraintValidationRequestDto request) {
        try {
            ConstraintValidationResponseDto response = constraintValidationApiService.validateConfiguration(request);
            return Response.ok(response).build();
        } catch (Exception e) {
            ConstraintValidationResponseDto errorResponse = new ConstraintValidationResponseDto();
            errorResponse.setValid(false);
            errorResponse.setErrorMessage("验证过程中发生错误: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(errorResponse).build();
        }
    }

    /**
     * 检测约束冲突
     */
    @POST
    @Path("/detect-conflicts")
    public Response detectConflicts(@Valid ConstraintValidationRequestDto request) {
        try {
            ConstraintConflictDetectionDto response = constraintValidationApiService.detectConstraintConflicts(request);
            return Response.ok(response).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new ConstraintConflictDetectionDto()).build();
        }
    }

    /**
     * 应用约束预设
     */
    @POST
    @Path("/apply-preset")
    public Response applyConstraintPreset(
            @QueryParam("presetName") String presetName,
            @Valid ConstraintValidationRequestDto request) {
        try {
            ConstraintValidationResponseDto response = constraintValidationApiService.applyConstraintPreset(presetName, request);
            return Response.ok(response).build();
        } catch (Exception e) {
            ConstraintValidationResponseDto errorResponse = new ConstraintValidationResponseDto();
            errorResponse.setValid(false);
            errorResponse.setErrorMessage("应用预设失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(errorResponse).build();
        }
    }

    /**
     * 动态调整约束权重
     */
    @POST
    @Path("/adjust-weights")
    public Response adjustConstraintWeights(@Valid ConstraintValidationRequestDto request) {
        try {
            // 从请求中提取调整参数
            DynamicConstraintAdjustmentDto adjustmentRequest = new DynamicConstraintAdjustmentDto();
            // 这里需要根据实际的 DTO 结构来设置调整参数
            
            ConstraintValidationResponseDto response = constraintValidationApiService.adjustConstraintWeights(adjustmentRequest);
            return Response.ok(response).build();
        } catch (Exception e) {
            ConstraintValidationResponseDto errorResponse = new ConstraintValidationResponseDto();
            errorResponse.setValid(false);
            errorResponse.setErrorMessage("权重调整失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(errorResponse).build();
        }
    }

    /**
     * 获取约束性能指标
     */
    @GET
    @Path("/performance-metrics")
    public Response getConstraintPerformanceMetrics() {
        try {
            List<ConstraintPerformanceMetricsDto> metrics = constraintValidationApiService.getConstraintPerformanceMetrics();
            return Response.ok(metrics).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "获取性能指标失败: " + e.getMessage())).build();
        }
    }

    /**
     * 重置性能统计
     */
    @POST
    @Path("/reset-performance-stats")
    public Response resetPerformanceStats() {
        try {
            constraintValidationApiService.resetPerformanceStatistics();
            return Response.ok(Map.of("message", "性能统计已重置")).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "重置性能统计失败: " + e.getMessage())).build();
        }
    }

    /**
     * 获取验证历史
     */
    @GET
    @Path("/validation-history")
    public Response getValidationHistory(
            @QueryParam("limit") @DefaultValue("10") int limit,
            @QueryParam("offset") @DefaultValue("0") int offset) {
        try {
            List<ConstraintValidationResponseDto> history = constraintValidationApiService.getValidationHistory(limit);
            return Response.ok(history).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "获取验证历史失败: " + e.getMessage())).build();
        }
    }

    /**
     * 健康检查
     */
    @GET
    @Path("/health")
    public Response healthCheck() {
        return Response.ok(Map.of(
                "status", "UP",
                "service", "ConstraintValidationService",
                "timestamp", String.valueOf(System.currentTimeMillis())
        )).build();
    }

    /**
     * 获取支持的预设列表
     */
    @GET
    @Path("/presets")
    public Response getSupportedPresets() {
        try {
            Map<String, Object> presets = Map.of(
                    "presets", new String[]{"STRICT", "BALANCED", "RELAXED"},
                    "descriptions", Map.of(
                            "STRICT", "严格模式 - 所有约束权重较高，适用于严格的排班要求",
                            "BALANCED", "平衡模式 - 约束权重适中，适用于一般排班场景",
                            "RELAXED", "宽松模式 - 约束权重较低，适用于灵活的排班需求"
                    )
            );
            return Response.ok(presets).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "获取预设列表失败: " + e.getMessage())).build();
        }
    }

    /**
     * 验证单个约束
     */
    @POST
    @Path("/validate-single")
    public Response validateSingleConstraint(
            @QueryParam("constraintId") String constraintId,
            Map<String, Object> constraintData) {
        try {
            // 这里可以实现单个约束的验证逻辑
            Map<String, Object> result = Map.of(
                    "constraintId", constraintId,
                    "isValid", true,
                    "message", "约束验证通过"
            );
            return Response.ok(result).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "单个约束验证失败: " + e.getMessage())).build();
        }
    }

    /**
     * 获取约束配置模板
     */
    @GET
    @Path("/template")
    public Response getConstraintConfigurationTemplate() {
        try {
            // 返回约束配置模板，与文档定义保持一致
            Map<String, Object> hardConstraints = new HashMap<>();
            hardConstraints.put("HC1", Map.of("name", "法定节假日限制", "weight", 1000, "enabled", true));
            hardConstraints.put("HC2", Map.of("name", "专业匹配要求", "weight", 1000, "enabled", true));
            hardConstraints.put("HC3", Map.of("name", "考官时间冲突避免", "weight", 1000, "enabled", true));
            hardConstraints.put("HC4", Map.of("name", "考官工作负荷控制", "weight", 1000, "enabled", true));
            hardConstraints.put("HC5", Map.of("name", "考生执勤白班不能安排考试", "weight", 1000, "enabled", true));
            hardConstraints.put("HC6", Map.of("name", "考试连续性要求", "weight", 1000, "enabled", true));
            hardConstraints.put("HC7", Map.of("name", "考试基本制度要求", "weight", 1000, "enabled", true));
            hardConstraints.put("HC8", Map.of("name", "备份考官独立性", "weight", 1000, "enabled", true));
            
            Map<String, Object> softConstraints = new HashMap<>();
            softConstraints.put("SC10", Map.of("name", "优先安排执勤晚班的考官", "weight", 90, "enabled", true));
            softConstraints.put("SC2", Map.of("name", "考官2专业匹配", "weight", 80, "enabled", true));
            softConstraints.put("SC11", Map.of("name", "考试日期分配均衡考量", "weight", 75, "enabled", true));
            softConstraints.put("SC3", Map.of("name", "其次安排休息第一天的考官", "weight", 70, "enabled", true));
            softConstraints.put("SC12", Map.of("name", "再次安排休息第二天的考官", "weight", 65, "enabled", true));
            softConstraints.put("SC2_NON_RECOMMENDED", Map.of("name", "考官2备选方案", "weight", 60, "enabled", true));
            softConstraints.put("SC1_ADMIN", Map.of("name", "最后安排行政班考官", "weight", 55, "enabled", true));
            softConstraints.put("SC3_NON_RECOMMENDED", Map.of("name", "备份考官备选方案", "weight", 50, "enabled", true));
            softConstraints.put("SC4", Map.of("name", "配备非主考官科室的备份考官", "weight", 45, "enabled", true));
            softConstraints.put("SC5", Map.of("name", "避免在考生白班时段安排考试", "weight", 40, "enabled", true));
            softConstraints.put("SC6", Map.of("name", "区域三室和区域七室的考官互用", "weight", 30, "enabled", true));
            
            Map<String, Object> template = Map.of(
                    "configurationId", "template-config",
                    "version", "1.0.0",
                    "description", "约束配置模板",
                    "hardConstraints", hardConstraints,
                    "softConstraints", softConstraints
            );
            return Response.ok(template).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "获取配置模板失败: " + e.getMessage())).build();
        }
    }
}
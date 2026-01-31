package com.examiner.scheduler.controller;

import com.examiner.scheduler.config.ConstraintMappingConfig;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import java.util.HashMap;
import java.util.Map;

/**
 * 约束映射API控制器
 * 提供前后端约束名称映射和权重转换的REST端点
 * 
 * @author OptaPlanner Team
 * @version 1.0
 */
@Path("/api/constraint-mapping")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ConstraintMappingController {

    /**
     * 获取所有约束映射信息
     * @return 包含硬约束和软约束映射的完整信息
     */
    @GET
    @Path("/all")
    public Response getAllMappings() {
        Map<String, Object> response = new HashMap<>();
        response.put("hardConstraints", ConstraintMappingConfig.getHardConstraintMappings());
        response.put("softConstraints", ConstraintMappingConfig.getSoftConstraintMappings());
        return Response.ok(response).build();
    }

    /**
     * 获取硬约束映射
     * @return 硬约束的前后端名称映射
     */
    @GET
    @Path("/hard-constraints")
    public Response getHardConstraintMappings() {
        return Response.ok(ConstraintMappingConfig.getHardConstraintMappings()).build();
    }

    /**
     * 获取软约束映射
     * @return 软约束的前后端名称映射
     */
    @GET
    @Path("/soft-constraints")
    public Response getSoftConstraintMappings() {
        return Response.ok(ConstraintMappingConfig.getSoftConstraintMappings()).build();
    }

    /**
     * 根据前端键获取后端约束名称
     * @param frontendKey 前端约束键
     * @return 后端约束名称和类型信息
     */
    @GET
    @Path("/backend-name/{frontendKey}")
    public Response getBackendName(@PathParam("frontendKey") String frontendKey) {
        Map<String, Object> response = new HashMap<>();
        String backendName = ConstraintMappingConfig.getBackendName(frontendKey);
        if (backendName != null) {
            response.put("backendName", backendName);
            response.put("constraintType", ConstraintMappingConfig.getConstraintType(frontendKey));
            response.put("success", true);
        } else {
            response.put("success", false);
            response.put("message", "未找到对应的后端约束名称");
        }
        return Response.ok(response).build();
    }

    /**
     * 根据后端约束名称获取前端键
     * @param backendName 后端约束名称
     * @return 前端键和类型信息
     */
    @GET
    @Path("/frontend-key")
    public Response getFrontendKey(@QueryParam("backendName") String backendName) {
        Map<String, Object> response = new HashMap<>();
        String frontendKey = ConstraintMappingConfig.getFrontendKey(backendName);
        if (frontendKey != null) {
            response.put("frontendKey", frontendKey);
            response.put("constraintType", ConstraintMappingConfig.getConstraintType(frontendKey));
            response.put("success", true);
        } else {
            response.put("success", false);
            response.put("message", "未找到对应的前端约束键");
        }
        return Response.ok(response).build();
    }

    /**
     * 将前端权重转换为后端权重
     * @param frontendWeight 前端权重值 (30-90)
     * @return 转换后的后端权重值 (150-700)
     */
    @GET
    @Path("/weight/frontend-to-backend/{frontendWeight}")
    public Response convertFrontendToBackendWeight(@PathParam("frontendWeight") int frontendWeight) {
        Map<String, Object> response = new HashMap<>();
        try {
            int backendWeight = ConstraintMappingConfig.convertFrontendToBackendWeight(frontendWeight);
            response.put("frontendWeight", frontendWeight);
            response.put("backendWeight", backendWeight);
            response.put("success", true);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            response.put("validRange", "30-90");
        }
        return Response.ok(response).build();
    }

    /**
     * 将后端权重转换为前端权重
     * @param backendWeight 后端权重值 (150-700)
     * @return 转换后的前端权重值 (30-90)
     */
    @GET
    @Path("/weight/backend-to-frontend/{backendWeight}")
    public Response convertBackendToFrontendWeight(@PathParam("backendWeight") int backendWeight) {
        Map<String, Object> response = new HashMap<>();
        try {
            int frontendWeight = ConstraintMappingConfig.convertBackendToFrontendWeight(backendWeight);
            response.put("backendWeight", backendWeight);
            response.put("frontendWeight", frontendWeight);
            response.put("success", true);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            response.put("validRange", "150-700");
        }
        return Response.ok(response).build();
    }

    /**
     * 批量转换前端权重到后端权重
     * @param frontendWeights 前端权重映射
     * @return 转换后的后端权重映射
     */
    @POST
    @Path("/weight/batch-frontend-to-backend")
    public Response batchConvertFrontendToBackend(Map<String, Integer> frontendWeights) {
        Map<String, Object> response = new HashMap<>();
        Map<String, Integer> backendWeights = new HashMap<>();
        Map<String, String> errors = new HashMap<>();
        
        for (Map.Entry<String, Integer> entry : frontendWeights.entrySet()) {
            try {
                int backendWeight = ConstraintMappingConfig.convertFrontendToBackendWeight(entry.getValue());
                backendWeights.put(entry.getKey(), backendWeight);
            } catch (IllegalArgumentException e) {
                errors.put(entry.getKey(), e.getMessage());
            }
        }
        
        response.put("backendWeights", backendWeights);
        response.put("errors", errors);
        response.put("success", errors.isEmpty());
        return Response.ok(response).build();
    }

    /**
     * 批量转换后端权重到前端权重
     * @param backendWeights 后端权重映射
     * @return 转换后的前端权重映射
     */
    @POST
    @Path("/weight/batch-backend-to-frontend")
    public Response batchConvertBackendToFrontend(Map<String, Integer> backendWeights) {
        Map<String, Object> response = new HashMap<>();
        Map<String, Integer> frontendWeights = new HashMap<>();
        Map<String, String> errors = new HashMap<>();
        
        for (Map.Entry<String, Integer> entry : backendWeights.entrySet()) {
            try {
                int frontendWeight = ConstraintMappingConfig.convertBackendToFrontendWeight(entry.getValue());
                frontendWeights.put(entry.getKey(), frontendWeight);
            } catch (IllegalArgumentException e) {
                errors.put(entry.getKey(), e.getMessage());
            }
        }
        
        response.put("frontendWeights", frontendWeights);
        response.put("errors", errors);
        response.put("success", errors.isEmpty());
        return Response.ok(response).build();
    }

    /**
     * 获取权重范围信息
     * @return 前端和后端权重的有效范围
     */
    @GET
    @Path("/weight/ranges")
    public Response getWeightRanges() {
        Map<String, Object> response = new HashMap<>();
        Map<String, Object> frontend = new HashMap<>();
        frontend.put("min", 30);
        frontend.put("max", 90);
        frontend.put("description", "前端权重范围");
        
        Map<String, Object> backend = new HashMap<>();
        backend.put("min", 150);
        backend.put("max", 700);
        backend.put("description", "后端权重范围");
        
        response.put("frontend", frontend);
        response.put("backend", backend);
        response.put("conversionFormula", "backend = (frontend - 30) * 550 / 60 + 150");
        return Response.ok(response).build();
    }

    /**
     * 获取映射统计信息
     * @return 约束映射的统计数据
     */
    @GET
    @Path("/statistics")
    public Response getStatistics() {
        return Response.ok(ConstraintMappingConfig.getStatistics()).build();
    }

    /**
     * 验证映射完整性
     * @return 映射完整性验证结果
     */
    @GET
    @Path("/validate")
    public Response validateMappings() {
        Map<String, Object> response = new HashMap<>();
        ConstraintMappingConfig.MappingStatistics stats = ConstraintMappingConfig.getStatistics();
        
        // 检查映射完整性
        boolean isComplete = stats.getTotalConstraintCount() >= 17; // 前端显示17个约束
        
        response.put("isComplete", isComplete);
        response.put("statistics", stats);
        response.put("message", isComplete ? "映射完整" : "映射不完整，请检查约束配置");
        
        return Response.ok(response).build();
    }
}
package com.examiner.controller;

import com.examiner.dto.ConstraintViolationReportDto;
import com.examiner.dto.ViolationDetailDto;
import com.examiner.dto.RepairSuggestionDto;
import com.examiner.dto.RepairResultDto;
import com.examiner.dto.ViolationStatisticsDto;
import com.examiner.dto.ManualRepairRequestDto;
import com.examiner.service.ConstraintViolationReportService;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * 约束违规报告控制器
 * 提供约束违规报告生成、修复建议和交互式修复功能的REST API
 */
@Path("/api/constraint-violations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ConstraintViolationReportController {

    @Inject
    private ConstraintViolationReportService constraintViolationReportService;

    /**
     * 生成约束违规报告
     */
    @POST
    @Path("/generate-report")
    public Response generateReport(Map<String, String> request) {
        try {
            String scheduleId = request.get("scheduleId");
            if (scheduleId == null || scheduleId.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "scheduleId is required"))
                        .build();
            }
            
            ConstraintViolationReportDto report = constraintViolationReportService.generateReport(scheduleId);
            return Response.ok(Map.of("data", report)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to generate report: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 获取现有报告
     */
    @GET
    @Path("/report/{scheduleId}")
    public Response getReport(@PathParam("scheduleId") String scheduleId) {
        try {
            ConstraintViolationReportDto report = constraintViolationReportService.getReport(scheduleId);
            if (report == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "Report not found for scheduleId: " + scheduleId))
                        .build();
            }
            return Response.ok(Map.of("data", report)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to get report: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 获取违规详情
     */
    @GET
    @Path("/violation/{violationId}")
    public Response getViolationDetail(@PathParam("violationId") String violationId) {
        try {
            ViolationDetailDto detail = constraintViolationReportService.getViolationDetail(violationId);
            if (detail == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "Violation not found: " + violationId))
                        .build();
            }
            return Response.ok(Map.of("data", detail)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to get violation detail: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 获取修复建议
     */
    @GET
    @Path("/repair-suggestions/{violationId}")
    public Response getRepairSuggestions(@PathParam("violationId") String violationId) {
        try {
            List<RepairSuggestionDto> suggestions = constraintViolationReportService.getRepairSuggestions(violationId);
            return Response.ok(Map.of("data", suggestions)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to get repair suggestions: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 应用自动修复
     */
    @POST
    @Path("/auto-repair")
    public Response applyAutoRepair(Map<String, String> request) {
        try {
            String violationId = request.get("violationId");
            if (violationId == null || violationId.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "violationId is required"))
                        .build();
            }
            
            RepairResultDto result = constraintViolationReportService.applyAutoRepair(violationId);
            return Response.ok(Map.of("data", result)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to apply auto repair: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 应用修复建议
     */
    @POST
    @Path("/apply-suggestion")
    public Response applySuggestion(Map<String, Object> request) {
        try {
            String suggestionId = (String) request.get("suggestionId");
            @SuppressWarnings("unchecked")
            Map<String, Object> parameters = (Map<String, Object>) request.get("parameters");
            
            if (suggestionId == null || suggestionId.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "suggestionId is required"))
                        .build();
            }
            
            RepairResultDto result = constraintViolationReportService.applySuggestion(suggestionId, parameters);
            return Response.ok(Map.of("data", result)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to apply suggestion: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 提交手动修复方案
     */
    @POST
    @Path("/manual-repair")
    public Response submitManualRepair(@Valid ManualRepairRequestDto request) {
        try {
            RepairResultDto result = constraintViolationReportService.submitManualRepair(request);
            return Response.ok(Map.of("data", result)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to submit manual repair: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 验证修复结果
     */
    @POST
    @Path("/validate-repair")
    public Response validateRepairResult(Map<String, String> request) {
        try {
            String scheduleId = request.get("scheduleId");
            if (scheduleId == null || scheduleId.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "scheduleId is required"))
                        .build();
            }
            
            ConstraintViolationReportDto report = constraintViolationReportService.validateRepairResult(scheduleId);
            return Response.ok(Map.of("data", report)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to validate repair result: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 导出报告
     */
    @GET
    @Path("/export/{scheduleId}")
    public Response exportReport(@PathParam("scheduleId") String scheduleId, 
                                @QueryParam("format") @DefaultValue("JSON") String format) {
        try {
            byte[] reportData = constraintViolationReportService.exportReport(scheduleId, format);
            
            String mediaType;
            String filename;
            switch (format.toUpperCase()) {
                case "PDF":
                    mediaType = "application/pdf";
                    filename = "constraint-violation-report-" + scheduleId + ".pdf";
                    break;
                case "EXCEL":
                    mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                    filename = "constraint-violation-report-" + scheduleId + ".xlsx";
                    break;
                default:
                    mediaType = "application/json";
                    filename = "constraint-violation-report-" + scheduleId + ".json";
                    break;
            }
            
            return Response.ok(reportData, mediaType)
                    .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to export report: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 获取约束统计信息
     */
    @GET
    @Path("/statistics/{scheduleId}")
    public Response getConstraintStatistics(@PathParam("scheduleId") String scheduleId) {
        try {
            ViolationStatisticsDto statistics = constraintViolationReportService.getConstraintStatistics(scheduleId);
            return Response.ok(Map.of("data", statistics)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to get constraint statistics: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 预览修复效果
     */
    @POST
    @Path("/preview-repair")
    public Response previewRepair(Map<String, String> request) {
        try {
            String violationId = request.get("violationId");
            String suggestionId = request.get("suggestionId");
            
            if (violationId == null || violationId.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "violationId is required"))
                        .build();
            }
            
            Map<String, Object> preview = constraintViolationReportService.previewRepair(violationId, suggestionId);
            return Response.ok(Map.of("data", preview)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to preview repair: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 获取修复建议的详细参数
     */
    @GET
    @Path("/suggestion-parameters/{suggestionId}")
    public Response getSuggestionParameters(@PathParam("suggestionId") String suggestionId) {
        try {
            Map<String, Object> parameters = constraintViolationReportService.getSuggestionParameters(suggestionId);
            return Response.ok(Map.of("data", parameters)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to get suggestion parameters: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 搜索类似违规
     */
    @GET
    @Path("/similar/{violationId}")
    public Response searchSimilarViolations(@PathParam("violationId") String violationId) {
        try {
            List<ViolationDetailDto> similarViolations = constraintViolationReportService.searchSimilarViolations(violationId);
            return Response.ok(Map.of("data", similarViolations)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to search similar violations: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 获取约束违规趋势
     */
    @GET
    @Path("/trends/{scheduleId}")
    public Response getViolationTrends(@PathParam("scheduleId") String scheduleId,
                                      @QueryParam("timeRange") @DefaultValue("7d") String timeRange) {
        try {
            Map<String, Object> trends = constraintViolationReportService.getViolationTrends(scheduleId, timeRange);
            return Response.ok(Map.of("data", trends)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to get violation trends: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 生成修复报告
     */
    @POST
    @Path("/repair-report")
    public Response generateRepairReport(Map<String, String> request) {
        try {
            String scheduleId = request.get("scheduleId");
            if (scheduleId == null || scheduleId.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "scheduleId is required"))
                        .build();
            }
            
            Map<String, Object> repairReport = constraintViolationReportService.generateRepairReport(scheduleId);
            return Response.ok(Map.of("data", repairReport)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Failed to generate repair report: " + e.getMessage()))
                    .build();
        }
    }
}
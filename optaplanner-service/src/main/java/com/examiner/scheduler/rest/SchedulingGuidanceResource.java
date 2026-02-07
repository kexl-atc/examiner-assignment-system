package com.examiner.scheduler.rest;

import com.examiner.scheduler.domain.ExamAssignment;
import com.examiner.scheduler.domain.Student;
import com.examiner.scheduler.domain.Teacher;
import com.examiner.scheduler.dto.SchedulingGuidanceDTO;
import com.examiner.scheduler.service.SchedulingGuidanceService;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * 排班指导信息REST API
 * 提供智能提示信息操作流程的接口
 */
@Path("/api/guidance")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class SchedulingGuidanceResource {
    
    private static final Logger LOGGER = Logger.getLogger(SchedulingGuidanceResource.class.getName());
    
    @Inject
    SchedulingGuidanceService guidanceService;
    
    /**
     * 生成排班指导信息
     * 基于当前排班结果生成完整的8步提示信息
     */
    @POST
    @Path("/generate")
    public Response generateGuidance(GuidanceRequest request) {
        try {
            LOGGER.info("📋 [指导信息] 生成排班指导信息...");
            
            SchedulingGuidanceDTO guidance = guidanceService.generateGuidance(
                request.getAssignments(),
                request.getStudents(),
                request.getTeachers(),
                request.getStartDate(),
                request.getEndDate(),
                request.getScheduleResponse()
            );
            
            LOGGER.info("✅ [指导信息] 生成完成，是否存在问题: " + guidance.isHasIssue());
            
            return Response.ok(guidance).build();
            
        } catch (Exception e) {
            LOGGER.severe("❌ [指导信息] 生成失败: " + e.getMessage());
            e.printStackTrace();
            return Response.serverError()
                .entity(Map.of(
                    "success", false,
                    "message", "生成指导信息失败: " + e.getMessage()
                ))
                .build();
        }
    }
    
    /**
     * 获取调整后的结果对比
     */
    @POST
    @Path("/compare-results")
    public Response compareResults(ResultComparisonRequest request) {
        try {
            LOGGER.info("📊 [指导信息] 生成结果对比...");
            
            SchedulingGuidanceDTO.ScheduleResultComparison comparison = 
                guidanceService.generateResultComparison(
                    request.getBeforeUnassigned(),
                    request.getAfterUnassigned(),
                    request.getBeforeViolations(),
                    request.getAfterViolations(),
                    request.getBeforeCompletionRate(),
                    request.getAfterCompletionRate()
                );
            
            return Response.ok(comparison).build();
            
        } catch (Exception e) {
            LOGGER.severe("❌ [指导信息] 生成对比失败: " + e.getMessage());
            return Response.serverError()
                .entity(Map.of(
                    "success", false,
                    "message", "生成结果对比失败: " + e.getMessage()
                ))
                .build();
        }
    }
    
    /**
     * 获取推荐的日期范围
     * 基于当前配置快速计算推荐的日期扩展方案
     */
    @POST
    @Path("/recommend-dates")
    public Response recommendDates(DateRecommendationRequest request) {
        try {
            LOGGER.info("📅 [指导信息] 计算推荐日期范围...");
            
            // 这里简化处理，实际应该调用完整分析逻辑
            int studentCount = request.getStudentCount();
            int teacherCount = request.getTeacherCount();
            int currentDays = request.getCurrentAvailableDays();
            
            // 计算需要的容量
            int requiredCapacity = studentCount * 2; // 每个学员2场考试
            int dailyCapacity = teacherCount; // 每天可以安排的考试数（简化计算）
            int requiredDays = (int) Math.ceil((double) requiredCapacity / dailyCapacity);
            
            int extensionDays = Math.max(0, requiredDays - currentDays);
            
            // 返回推荐信息
            Map<String, Object> recommendation = Map.of(
                "currentDays", currentDays,
                "requiredDays", requiredDays,
                "recommendedExtension", extensionDays + 2, // 加2天缓冲
                "reasoning", String.format(
                    "基于 %d 名学员和 %d 名考官，预计需要 %d 天，建议扩展 %d 天",
                    studentCount, teacherCount, requiredDays, extensionDays + 2
                )
            );
            
            return Response.ok(recommendation).build();
            
        } catch (Exception e) {
            LOGGER.severe("❌ [指导信息] 计算推荐日期失败: " + e.getMessage());
            return Response.serverError()
                .entity(Map.of(
                    "success", false,
                    "message", "计算推荐日期失败: " + e.getMessage()
                ))
                .build();
        }
    }
    
    // ========== 请求DTO ==========
    
    public static class GuidanceRequest {
        private List<ExamAssignment> assignments;
        private List<Student> students;
        private List<Teacher> teachers;
        private String startDate;
        private String endDate;
        private ScheduleResponse scheduleResponse;
        
        // Getters and Setters
        public List<ExamAssignment> getAssignments() { return assignments; }
        public void setAssignments(List<ExamAssignment> assignments) { this.assignments = assignments; }
        
        public List<Student> getStudents() { return students; }
        public void setStudents(List<Student> students) { this.students = students; }
        
        public List<Teacher> getTeachers() { return teachers; }
        public void setTeachers(List<Teacher> teachers) { this.teachers = teachers; }
        
        public String getStartDate() { return startDate; }
        public void setStartDate(String startDate) { this.startDate = startDate; }
        
        public String getEndDate() { return endDate; }
        public void setEndDate(String endDate) { this.endDate = endDate; }
        
        public ScheduleResponse getScheduleResponse() { return scheduleResponse; }
        public void setScheduleResponse(ScheduleResponse scheduleResponse) { this.scheduleResponse = scheduleResponse; }
    }
    
    public static class ResultComparisonRequest {
        private int beforeUnassigned;
        private int afterUnassigned;
        private int beforeViolations;
        private int afterViolations;
        private double beforeCompletionRate;
        private double afterCompletionRate;
        
        // Getters and Setters
        public int getBeforeUnassigned() { return beforeUnassigned; }
        public void setBeforeUnassigned(int beforeUnassigned) { this.beforeUnassigned = beforeUnassigned; }
        
        public int getAfterUnassigned() { return afterUnassigned; }
        public void setAfterUnassigned(int afterUnassigned) { this.afterUnassigned = afterUnassigned; }
        
        public int getBeforeViolations() { return beforeViolations; }
        public void setBeforeViolations(int beforeViolations) { this.beforeViolations = beforeViolations; }
        
        public int getAfterViolations() { return afterViolations; }
        public void setAfterViolations(int afterViolations) { this.afterViolations = afterViolations; }
        
        public double getBeforeCompletionRate() { return beforeCompletionRate; }
        public void setBeforeCompletionRate(double beforeCompletionRate) { this.beforeCompletionRate = beforeCompletionRate; }
        
        public double getAfterCompletionRate() { return afterCompletionRate; }
        public void setAfterCompletionRate(double afterCompletionRate) { this.afterCompletionRate = afterCompletionRate; }
    }
    
    public static class DateRecommendationRequest {
        private int studentCount;
        private int teacherCount;
        private int currentAvailableDays;
        private String currentStartDate;
        private String currentEndDate;
        
        // Getters and Setters
        public int getStudentCount() { return studentCount; }
        public void setStudentCount(int studentCount) { this.studentCount = studentCount; }
        
        public int getTeacherCount() { return teacherCount; }
        public void setTeacherCount(int teacherCount) { this.teacherCount = teacherCount; }
        
        public int getCurrentAvailableDays() { return currentAvailableDays; }
        public void setCurrentAvailableDays(int currentAvailableDays) { this.currentAvailableDays = currentAvailableDays; }
        
        public String getCurrentStartDate() { return currentStartDate; }
        public void setCurrentStartDate(String currentStartDate) { this.currentStartDate = currentStartDate; }
        
        public String getCurrentEndDate() { return currentEndDate; }
        public void setCurrentEndDate(String currentEndDate) { this.currentEndDate = currentEndDate; }
    }
}

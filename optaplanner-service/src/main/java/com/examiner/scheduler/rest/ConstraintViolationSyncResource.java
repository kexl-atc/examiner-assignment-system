package com.examiner.scheduler.rest;

import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.*;
import java.util.logging.Logger;

/**
 * 约束违反同步验证REST资源
 * 提供详细的约束违反信息，用于前后端约束验证结果同步
 */
@Path("/api/constraints/violations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ConstraintViolationSyncResource {
    
    private static final Logger LOGGER = Logger.getLogger(ConstraintViolationSyncResource.class.getName());
    
    /**
     * 约束违反详情DTO
     */
    public static class ConstraintViolationDetail {
        public String constraintId;
        public String constraintName;
        public String severity; // "hard" or "soft"
        public String studentName;
        public String studentDepartment;
        public String examDate;
        public String examType;
        public String violationType;
        public String description;
        public int penaltyScore;
        public Map<String, Object> additionalInfo;
        
        public ConstraintViolationDetail() {
            this.additionalInfo = new HashMap<>();
        }
        
        public ConstraintViolationDetail(String constraintId, String constraintName, String severity,
                                       String studentName, String studentDepartment, String examDate,
                                       String examType, String violationType, String description, int penaltyScore) {
            this();
            this.constraintId = constraintId;
            this.constraintName = constraintName;
            this.severity = severity;
            this.studentName = studentName;
            this.studentDepartment = studentDepartment;
            this.examDate = examDate;
            this.examType = examType;
            this.violationType = violationType;
            this.description = description;
            this.penaltyScore = penaltyScore;
        }
    }
    
    /**
     * 约束违反汇总DTO
     */
    public static class ConstraintViolationSummary {
        public int totalViolations;
        public int hardConstraintViolations;
        public int softConstraintViolations;
        public HardSoftScore totalScore;
        public Map<String, Integer> violationsByConstraint;
        public List<ConstraintViolationDetail> violations;
        public long lastUpdated;
        
        public ConstraintViolationSummary() {
            this.violationsByConstraint = new HashMap<>();
            this.violations = new ArrayList<>();
            this.lastUpdated = System.currentTimeMillis();
        }
    }
    
    // 存储最新的约束违反信息（实际应用中应该使用缓存或数据库）
    private static volatile ConstraintViolationSummary latestViolationSummary = new ConstraintViolationSummary();
    
    /**
     * 获取最新的约束违反汇总信息
     */
    @GET
    @Path("/summary")
    public Response getViolationSummary() {
        try {
            LOGGER.info("🔗 [约束同步] 前端请求约束违反汇总信息");
            
            // 返回最新的约束违反汇总
            return Response.ok(latestViolationSummary).build();
            
        } catch (Exception e) {
            LOGGER.severe("获取约束违反汇总失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                          .entity("获取约束违反汇总失败: " + e.getMessage())
                          .build();
        }
    }
    
    /**
     * 获取特定约束的详细违反信息
     */
    @GET
    @Path("/details/{constraintId}")
    public Response getConstraintViolationDetails(@PathParam("constraintId") String constraintId) {
        try {
                         LOGGER.info("🔍 [约束同步] 前端请求约束 " + constraintId + " 的详细违反信息");
            
            // 过滤出特定约束的违反信息
            List<ConstraintViolationDetail> constraintDetails = latestViolationSummary.violations.stream()
                    .filter(violation -> violation.constraintId.equals(constraintId))
                    .collect(java.util.stream.Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("constraintId", constraintId);
            response.put("violationCount", constraintDetails.size());
            response.put("violations", constraintDetails);
            response.put("lastUpdated", latestViolationSummary.lastUpdated);
            
            return Response.ok(response).build();
            
        } catch (Exception e) {
            LOGGER.severe("获取约束详细信息失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                          .entity("获取约束详细信息失败: " + e.getMessage())
                          .build();
        }
    }
    
    /**
     * 验证前端排班结果与后端约束
     */
    @POST
    @Path("/validate")
    public Response validateFrontendSchedule(List<Map<String, Object>> frontendSchedule) {
        try {
                         LOGGER.info("🔗 [约束同步] 验证前端排班结果，记录数: " + frontendSchedule.size());
            
            // 解析前端排班数据并进行约束验证
            List<ConstraintViolationDetail> frontendViolations = validateFrontendAssignments(frontendSchedule);
            
            // 对比前后端违反情况
            Map<String, Object> comparison = compareFrontendWithBackend(frontendViolations);
            
            return Response.ok(comparison).build();
            
        } catch (Exception e) {
            LOGGER.severe("验证前端排班结果失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                          .entity("验证前端排班结果失败: " + e.getMessage())
                          .build();
        }
    }
    
    /**
     * 更新约束违反汇总信息（由约束提供者调用）
     */
    public static void updateViolationSummary(HardSoftScore totalScore, 
                                            Map<String, Integer> violationCounts,
                                            List<ConstraintViolationDetail> violationDetails) {
        
        ConstraintViolationSummary newSummary = new ConstraintViolationSummary();
        newSummary.totalScore = totalScore;
        newSummary.violationsByConstraint.putAll(violationCounts);
        newSummary.violations.addAll(violationDetails);
        
        // 计算统计信息
        newSummary.totalViolations = violationDetails.size();
        newSummary.hardConstraintViolations = (int) violationDetails.stream()
                .filter(v -> "hard".equals(v.severity))
                .count();
        newSummary.softConstraintViolations = newSummary.totalViolations - newSummary.hardConstraintViolations;
        
        latestViolationSummary = newSummary;
        
                 LOGGER.info("🔄 [约束同步] 更新约束违反汇总: 总违反=" + newSummary.totalViolations + 
                    ", 硬约束=" + newSummary.hardConstraintViolations + ", 软约束=" + newSummary.softConstraintViolations);
    }
    
    /**
     * 验证前端排班分配
     */
    private List<ConstraintViolationDetail> validateFrontendAssignments(List<Map<String, Object>> frontendSchedule) {
        List<ConstraintViolationDetail> violations = new ArrayList<>();
        
        for (Map<String, Object> assignment : frontendSchedule) {
            // 提取排班信息
            String studentName = (String) assignment.get("studentName");
            String studentDept = (String) assignment.get("studentDepartment");
            String examDate = (String) assignment.get("examDate");
            
            @SuppressWarnings("unchecked")
            Map<String, Object> day1 = (Map<String, Object>) assignment.get("第一天");
            @SuppressWarnings("unchecked")
            Map<String, Object> day2 = (Map<String, Object>) assignment.get("第二天");
            
            // 验证HC2约束（科室匹配）
            violations.addAll(validateDepartmentMatching(studentName, studentDept, day1, examDate + "_day1"));
            violations.addAll(validateDepartmentMatching(studentName, studentDept, day2, examDate + "_day2"));
            
            // 验证HC6约束（连续两天）
            violations.addAll(validateConsecutiveDays(studentName, day1, day2));
        }
        
        return violations;
    }
    
    /**
     * 验证科室匹配约束
     */
    private List<ConstraintViolationDetail> validateDepartmentMatching(String studentName, String studentDept, 
                                                                       Map<String, Object> dayAssignment, String examId) {
        List<ConstraintViolationDetail> violations = new ArrayList<>();
        
        if (dayAssignment == null) return violations;
        
        String examiner1Dept = extractDepartment((String) dayAssignment.get("考官1"));
        String examiner2Dept = extractDepartment((String) dayAssignment.get("考官2"));
        
        // 检查考官1与学员科室匹配
        if (!isDepartmentMatch(studentDept, examiner1Dept)) {
            violations.add(new ConstraintViolationDetail(
                "HC2", "考官1与学员同科室约束", "hard",
                studentName, studentDept, examId, "day1",
                "DEPARTMENT_MISMATCH", 
                String.format("考官1科室不匹配: 学员%s vs 考官1%s", studentDept, examiner1Dept),
                3000
            ));
        }
        
        // 检查考官2与学员不同科室
        if (Objects.equals(studentDept, examiner2Dept)) {
            violations.add(new ConstraintViolationDetail(
                "HC2", "考官2与学员不同科室约束", "hard",
                studentName, studentDept, examId, "day1",
                "EXAMINER2_SAME_DEPT", 
                String.format("考官2与学员同科室: 学员%s = 考官2%s", studentDept, examiner2Dept),
                3000
            ));
        }
        
        return violations;
    }
    
    /**
     * 验证连续两天约束
     */
    private List<ConstraintViolationDetail> validateConsecutiveDays(String studentName, 
                                                                    Map<String, Object> day1, Map<String, Object> day2) {
        List<ConstraintViolationDetail> violations = new ArrayList<>();
        
        if (day1 == null || day2 == null) return violations;
        
        String date1 = (String) day1.get("日期");
        String date2 = (String) day2.get("日期");
        
        if (date1 != null && date2 != null) {
            try {
                java.time.LocalDate d1 = java.time.LocalDate.parse(date1);
                java.time.LocalDate d2 = java.time.LocalDate.parse(date2);
                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(d1, d2);
                
                if (daysBetween > 1) {
                    violations.add(new ConstraintViolationDetail(
                        "HC6", "连续两天考试约束", "hard",
                        studentName, "", date1 + "/" + date2, "consecutive",
                        "NON_CONSECUTIVE_DAYS", 
                        String.format("考试日期不连续: %s → %s (间隔%d天)", date1, date2, daysBetween),
                        2000
                    ));
                }
            } catch (Exception e) {
                LOGGER.warning("解析日期失败: " + e.getMessage());
            }
        }
        
        return violations;
    }
    
    /**
     * 对比前后端违反情况
     */
    private Map<String, Object> compareFrontendWithBackend(List<ConstraintViolationDetail> frontendViolations) {
        Map<String, Object> comparison = new HashMap<>();
        
        // 前端统计
        Map<String, Integer> frontendStats = new HashMap<>();
        frontendViolations.forEach(v -> 
            frontendStats.merge(v.constraintId, 1, Integer::sum)
        );
        
        // 后端统计
        Map<String, Integer> backendStats = latestViolationSummary.violationsByConstraint;
        
        // 差异分析
        Map<String, Object> differences = new HashMap<>();
        Set<String> allConstraints = new HashSet<>(frontendStats.keySet());
        allConstraints.addAll(backendStats.keySet());
        
        for (String constraintId : allConstraints) {
            int frontendCount = frontendStats.getOrDefault(constraintId, 0);
            int backendCount = backendStats.getOrDefault(constraintId, 0);
            int difference = Math.abs(frontendCount - backendCount);
            
            if (difference > 0) {
                Map<String, Integer> constraintDiff = new HashMap<>();
                constraintDiff.put("frontend", frontendCount);
                constraintDiff.put("backend", backendCount);
                constraintDiff.put("difference", difference);
                differences.put(constraintId, constraintDiff);
            }
        }
        
        comparison.put("frontendViolations", frontendViolations);
        comparison.put("backendViolations", latestViolationSummary.violations);
        comparison.put("frontendStats", frontendStats);
        comparison.put("backendStats", backendStats);
        comparison.put("differences", differences);
        comparison.put("isConsistent", differences.isEmpty());
        comparison.put("syncTimestamp", System.currentTimeMillis());
        
        return comparison;
    }
    
    /**
     * 提取科室信息
     */
    private String extractDepartment(String teacherInfo) {
        if (teacherInfo == null) return "";
        // 假设格式为 "姓名(科室)" 或 "姓名"
        int start = teacherInfo.indexOf('(');
        int end = teacherInfo.indexOf(')');
        if (start > 0 && end > start) {
            return teacherInfo.substring(start + 1, end);
        }
        return "";
    }
    
    /**
     * 检查科室匹配
     */
    private boolean isDepartmentMatch(String studentDept, String examinerDept) {
        if (studentDept == null || examinerDept == null) return false;
        
        // 标准化科室名称
        String normalizedStudent = normalizeDepartment(studentDept);
        String normalizedExaminer = normalizeDepartment(examinerDept);
        
        // 同科室匹配
        if (Objects.equals(normalizedStudent, normalizedExaminer)) {
            return true;
        }
        
        // 三七室互通
        if ((Objects.equals(normalizedStudent, "三") && Objects.equals(normalizedExaminer, "七")) ||
            (Objects.equals(normalizedStudent, "七") && Objects.equals(normalizedExaminer, "三"))) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 科室名称标准化
     */
    private String normalizeDepartment(String department) {
        if (department == null) return "";
        
        String normalized = department.trim();
        // 标准化映射（与前端保持完全一致，包括"第X科室"格式）
        if (normalized.contains("区域一室") || normalized.contains("一室") || normalized.contains("1室") || normalized.contains("第1科室")) return "一";
        if (normalized.contains("区域二室") || normalized.contains("二室") || normalized.contains("2室") || normalized.contains("第2科室")) return "二";
        if (normalized.contains("区域三室") || normalized.contains("三室") || normalized.contains("3室") || normalized.contains("第3科室")) return "三";
        if (normalized.contains("区域四室") || normalized.contains("四室") || normalized.contains("4室") || normalized.contains("第4科室")) return "四";
        if (normalized.contains("区域五室") || normalized.contains("五室") || normalized.contains("5室") || normalized.contains("第5科室")) return "五";
        if (normalized.contains("区域六室") || normalized.contains("六室") || normalized.contains("6室") || normalized.contains("第6科室")) return "六";
        if (normalized.contains("区域七室") || normalized.contains("七室") || normalized.contains("7室") || normalized.contains("第7科室")) return "七";
        if (normalized.contains("区域八室") || normalized.contains("八室") || normalized.contains("8室") || normalized.contains("第8科室")) return "八";
        if (normalized.contains("区域九室") || normalized.contains("九室") || normalized.contains("9室") || normalized.contains("第9科室")) return "九";
        if (normalized.contains("区域十室") || normalized.contains("十室") || normalized.contains("10室") || normalized.contains("第10科室")) return "十";
        
        return normalized;
    }
} 
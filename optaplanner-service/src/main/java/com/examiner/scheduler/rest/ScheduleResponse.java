package com.examiner.scheduler.rest;

import com.examiner.scheduler.domain.ExamAssignment;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;

import java.util.List;
import java.util.ArrayList;

/**
 * 排班响应DTO
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScheduleResponse {
    
    private boolean success;
    private String message;
    private String sessionId;  // WebSocket会话ID
    private List<ExamAssignment> assignments;
    private ScheduleStatistics statistics;
    private List<ConstraintViolation> conflicts;
    private List<String> warnings;
    private HardSoftScore score;
    private int totalAssignments;
    private int completeAssignments;
    private int incompleteAssignments;
    
    // 🆕 智能指导信息
    private com.examiner.scheduler.dto.SchedulingGuidanceDTO guidance;
    private boolean showGuidance;
    
    // 构造函数
    public ScheduleResponse() {
        this.assignments = new ArrayList<>();
        this.conflicts = new ArrayList<>();
        this.warnings = new ArrayList<>();
        this.showGuidance = false;
    }
    
    public ScheduleResponse(boolean success, String message, 
                           List<ExamAssignment> assignments, 
                           ScheduleStatistics statistics) {
        this();
        this.success = success;
        this.message = message;
        this.assignments = assignments != null ? assignments : new ArrayList<>();
        this.statistics = statistics;
    }
    
    // Getter和Setter方法
    public boolean isSuccess() {
        return success;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public String getSessionId() {
        return sessionId;
    }
    
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
    
    public List<ExamAssignment> getAssignments() {
        return assignments;
    }
    
    public void setAssignments(List<ExamAssignment> assignments) {
        this.assignments = assignments;
    }
    
    public ScheduleStatistics getStatistics() {
        return statistics;
    }
    
    public void setStatistics(ScheduleStatistics statistics) {
        this.statistics = statistics;
    }
    
    public List<ConstraintViolation> getConflicts() {
        return conflicts;
    }
    
    public void setConflicts(List<ConstraintViolation> conflicts) {
        this.conflicts = conflicts;
    }
    
    public List<String> getWarnings() {
        return warnings;
    }
    
    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }
    
    public HardSoftScore getScore() {
        return score;
    }
    
    public void setScore(HardSoftScore score) {
        this.score = score;
    }
    
    public int getTotalAssignments() {
        return totalAssignments;
    }
    
    public void setTotalAssignments(int totalAssignments) {
        this.totalAssignments = totalAssignments;
    }
    
    public int getCompleteAssignments() {
        return completeAssignments;
    }
    
    public void setCompleteAssignments(int completeAssignments) {
        this.completeAssignments = completeAssignments;
    }
    
    public int getIncompleteAssignments() {
        return incompleteAssignments;
    }
    
    public void setIncompleteAssignments(int incompleteAssignments) {
        this.incompleteAssignments = incompleteAssignments;
    }
    
    // 🆕 指导信息Getter和Setter
    public com.examiner.scheduler.dto.SchedulingGuidanceDTO getGuidance() {
        return guidance;
    }
    
    public void setGuidance(com.examiner.scheduler.dto.SchedulingGuidanceDTO guidance) {
        this.guidance = guidance;
    }
    
    public boolean isShowGuidance() {
        return showGuidance;
    }
    
    public void setShowGuidance(boolean showGuidance) {
        this.showGuidance = showGuidance;
    }
    
    @Override
    public String toString() {
        return "ScheduleResponse{" +
                "success=" + success +
                ", message='" + message + '\'' +
                ", assignments=" + (assignments != null ? assignments.size() : 0) +
                ", statistics=" + statistics +
                '}';
    }
    
    /**
     * 排班统计信息内部类
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ScheduleStatistics {
        private int totalStudents;
        private int assignedStudents;
        private int unassignedStudents;
        private int totalTeachers;
        private int activeTeachers;
        private double averageWorkload;
        private int maxWorkload;
        private HardSoftScore finalScore;
        private double completionPercentage;
        private long solvingTimeMillis;
        private int solvingTimeSeconds; // 新增求解时间（秒）
        private String solvingMode; // 新增求解模式
        private int hardConstraintViolations;
        private int softConstraintViolations;
        private int softConstraintsScore; // 软约束得分
        
        public ScheduleStatistics() {}
        
        public int getTotalStudents() {
            return totalStudents;
        }
        
        public void setTotalStudents(int totalStudents) {
            this.totalStudents = totalStudents;
        }
        
        public int getAssignedStudents() {
            return assignedStudents;
        }
        
        public void setAssignedStudents(int assignedStudents) {
            this.assignedStudents = assignedStudents;
        }
        
        public int getUnassignedStudents() {
            return unassignedStudents;
        }
        
        public void setUnassignedStudents(int unassignedStudents) {
            this.unassignedStudents = unassignedStudents;
        }
        
        public int getTotalTeachers() {
            return totalTeachers;
        }
        
        public void setTotalTeachers(int totalTeachers) {
            this.totalTeachers = totalTeachers;
        }
        
        public int getActiveTeachers() {
            return activeTeachers;
        }
        
        public void setActiveTeachers(int activeTeachers) {
            this.activeTeachers = activeTeachers;
        }
        
        public double getAverageWorkload() {
            return averageWorkload;
        }
        
        public void setAverageWorkload(double averageWorkload) {
            this.averageWorkload = averageWorkload;
        }
        
        public int getMaxWorkload() {
            return maxWorkload;
        }
        
        public void setMaxWorkload(int maxWorkload) {
            this.maxWorkload = maxWorkload;
        }
        
        public HardSoftScore getFinalScore() {
            return finalScore;
        }
        
        public void setFinalScore(HardSoftScore finalScore) {
            this.finalScore = finalScore;
        }
        
        public double getCompletionPercentage() {
            return completionPercentage;
        }
        
        public void setCompletionPercentage(double completionPercentage) {
            this.completionPercentage = completionPercentage;
        }
        
        public long getSolvingTimeMillis() {
            return solvingTimeMillis;
        }
        
        public void setSolvingTimeMillis(long solvingTimeMillis) {
            this.solvingTimeMillis = solvingTimeMillis;
        }
        
        public int getSolvingTimeSeconds() {
            return solvingTimeSeconds;
        }
        
        public void setSolvingTimeSeconds(int solvingTimeSeconds) {
            this.solvingTimeSeconds = solvingTimeSeconds;
        }
        
        public String getSolvingMode() {
            return solvingMode;
        }
        
        public void setSolvingMode(String solvingMode) {
            this.solvingMode = solvingMode;
        }
        
        public int getHardConstraintViolations() {
            return hardConstraintViolations;
        }
        
        public void setHardConstraintViolations(int hardConstraintViolations) {
            this.hardConstraintViolations = hardConstraintViolations;
        }
        
        public int getSoftConstraintViolations() {
            return softConstraintViolations;
        }
        
        public void setSoftConstraintViolations(int softConstraintViolations) {
            this.softConstraintViolations = softConstraintViolations;
        }
        
        public int getSoftConstraintsScore() {
            return softConstraintsScore;
        }
        
        public void setSoftConstraintsScore(int softConstraintsScore) {
            this.softConstraintsScore = softConstraintsScore;
        }
        
        @Override
        public String toString() {
            return "ScheduleStatistics{" +
                    "totalStudents=" + totalStudents +
                    ", assignedStudents=" + assignedStudents +
                    ", completionPercentage=" + completionPercentage +
                    ", finalScore=" + finalScore +
                    ", solvingTimeMillis=" + solvingTimeMillis +
                    '}';
        }
    }
    
    /**
     * 约束违反信息内部类
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ConstraintViolation {
        private String type; // "hard" 或 "soft"
        private String constraint;
        private String severity; // "low", "medium", "high"
        private String description;
        private List<String> affectedEntities;
        private String suggestion;
        
        public ConstraintViolation() {
            this.affectedEntities = new ArrayList<>();
        }
        
        public ConstraintViolation(String type, String constraint, String severity, 
                                 String description, List<String> affectedEntities) {
            this();
            this.type = type;
            this.constraint = constraint;
            this.severity = severity;
            this.description = description;
            this.affectedEntities = affectedEntities != null ? affectedEntities : new ArrayList<>();
        }
        
        public String getType() {
            return type;
        }
        
        public void setType(String type) {
            this.type = type;
        }
        
        public String getConstraint() {
            return constraint;
        }
        
        public void setConstraint(String constraint) {
            this.constraint = constraint;
        }
        
        public String getSeverity() {
            return severity;
        }
        
        public void setSeverity(String severity) {
            this.severity = severity;
        }
        
        public String getDescription() {
            return description;
        }
        
        public void setDescription(String description) {
            this.description = description;
        }
        
        public List<String> getAffectedEntities() {
            return affectedEntities;
        }
        
        public void setAffectedEntities(List<String> affectedEntities) {
            this.affectedEntities = affectedEntities;
        }
        
        public String getSuggestion() {
            return suggestion;
        }
        
        public void setSuggestion(String suggestion) {
            this.suggestion = suggestion;
        }
        
        @Override
        public String toString() {
            return "ConstraintViolation{" +
                    "type='" + type + '\'' +
                    ", constraint='" + constraint + '\'' +
                    ", description='" + description + '\'' +
                    '}';
        }
    }
}
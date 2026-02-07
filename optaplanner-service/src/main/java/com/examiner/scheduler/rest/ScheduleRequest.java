package com.examiner.scheduler.rest;

import com.examiner.scheduler.domain.OptimizedConstraintConfiguration;
import com.examiner.scheduler.domain.Student;
import com.examiner.scheduler.domain.Teacher;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * 排班请求DTO
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScheduleRequest {
    
    private List<Student> students;
    private List<Teacher> teachers;
    private String startDate;
    private String endDate;
    private List<String> examDates; // 🆕 前端计算好的可用日期（已排除不可用日期和周末）
    private OptimizedConstraintConfiguration constraints;
    private SolverConfiguration solverConfig;
    
    // 构造函数
    public ScheduleRequest() {}
    
    public ScheduleRequest(List<Student> students, List<Teacher> teachers, 
                          String startDate, String endDate) {
        this.students = students;
        this.teachers = teachers;
        this.startDate = startDate;
        this.endDate = endDate;
        this.constraints = new OptimizedConstraintConfiguration();
        this.solverConfig = new SolverConfiguration();
    }
    
    // Getter和Setter方法
    public List<Student> getStudents() {
        return students;
    }
    
    public void setStudents(List<Student> students) {
        this.students = students;
    }
    
    public List<Teacher> getTeachers() {
        return teachers;
    }
    
    public void setTeachers(List<Teacher> teachers) {
        this.teachers = teachers;
    }
    
    public String getStartDate() {
        return startDate;
    }
    
    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }
    
    public String getEndDate() {
        return endDate;
    }
    
    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }
    
    public List<String> getExamDates() {
        return examDates;
    }
    
    public void setExamDates(List<String> examDates) {
        this.examDates = examDates;
    }
    
    public OptimizedConstraintConfiguration getConstraints() {
        return constraints;
    }
    
    public void setConstraints(OptimizedConstraintConfiguration constraints) {
        this.constraints = constraints;
    }
    
    public SolverConfiguration getSolverConfig() {
        return solverConfig;
    }
    
    public void setSolverConfig(SolverConfiguration solverConfig) {
        this.solverConfig = solverConfig;
    }
    
    @Override
    public String toString() {
        return "ScheduleRequest{" +
                "students=" + (students != null ? students.size() : 0) +
                ", teachers=" + (teachers != null ? teachers.size() : 0) +
                ", startDate='" + startDate + '\'' +
                ", endDate='" + endDate + '\'' +
                '}';
    }
    
    /**
     * 求解器配置内部类
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SolverConfiguration {
        private long timeoutSeconds = 30;
        private int maxIterations = 1000;
        private boolean enableMultiThreading = true;
        private String mode = "balanced"; // 新增求解模式字段
        private String description;
        
        public SolverConfiguration() {}
        
        public long getTimeoutSeconds() {
            return timeoutSeconds;
        }
        
        public void setTimeoutSeconds(long timeoutSeconds) {
            this.timeoutSeconds = timeoutSeconds;
        }
        
        public int getMaxIterations() {
            return maxIterations;
        }
        
        public void setMaxIterations(int maxIterations) {
            this.maxIterations = maxIterations;
        }
        
        public boolean isEnableMultiThreading() {
            return enableMultiThreading;
        }
        
        public void setEnableMultiThreading(boolean enableMultiThreading) {
            this.enableMultiThreading = enableMultiThreading;
        }
        
        public String getMode() {
            return mode;
        }
        
        public void setMode(String mode) {
            this.mode = mode;
        }
        
        public String getDescription() {
            return description;
        }
        
        public void setDescription(String description) {
            this.description = description;
        }
        
        public String getSolvingMode() {
            return mode;
        }
        
        @Override
        public String toString() {
            return "SolverConfiguration{" +
                    "timeoutSeconds=" + timeoutSeconds +
                    ", maxIterations=" + maxIterations +
                    ", enableMultiThreading=" + enableMultiThreading +
                    '}';
        }
    }
}
package com.examiner.scheduler.dto;

import java.util.List;

/**
 * 排班分配数据传输对象
 * 用于WebSocket实时推送，避免循环引用和复杂对象序列化问题
 */
public class AssignmentDTO {
    
    private String id;
    
    // 学员信息
    private String studentId;
    private String studentName;
    private String studentDepartment;
    
    // 考试信息
    private String examDate;
    private String examType;
    private List<String> subjects;
    
    // 考官信息
    private TeacherDTO examiner1;
    private TeacherDTO examiner2;
    private TeacherDTO backupExaminer;
    
    // 其他信息
    private String location;
    private String timeSlot;
    
    public AssignmentDTO() {}
    
    // Getter和Setter方法
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getStudentId() {
        return studentId;
    }
    
    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }
    
    public String getStudentName() {
        return studentName;
    }
    
    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }
    
    public String getStudentDepartment() {
        return studentDepartment;
    }
    
    public void setStudentDepartment(String studentDepartment) {
        this.studentDepartment = studentDepartment;
    }
    
    public String getExamDate() {
        return examDate;
    }
    
    public void setExamDate(String examDate) {
        this.examDate = examDate;
    }
    
    public String getExamType() {
        return examType;
    }
    
    public void setExamType(String examType) {
        this.examType = examType;
    }
    
    public List<String> getSubjects() {
        return subjects;
    }
    
    public void setSubjects(List<String> subjects) {
        this.subjects = subjects;
    }
    
    public TeacherDTO getExaminer1() {
        return examiner1;
    }
    
    public void setExaminer1(TeacherDTO examiner1) {
        this.examiner1 = examiner1;
    }
    
    public TeacherDTO getExaminer2() {
        return examiner2;
    }
    
    public void setExaminer2(TeacherDTO examiner2) {
        this.examiner2 = examiner2;
    }
    
    public TeacherDTO getBackupExaminer() {
        return backupExaminer;
    }
    
    public void setBackupExaminer(TeacherDTO backupExaminer) {
        this.backupExaminer = backupExaminer;
    }
    
    public String getLocation() {
        return location;
    }
    
    public void setLocation(String location) {
        this.location = location;
    }
    
    public String getTimeSlot() {
        return timeSlot;
    }
    
    public void setTimeSlot(String timeSlot) {
        this.timeSlot = timeSlot;
    }
    
    /**
     * 简化的教员数据传输对象
     */
    public static class TeacherDTO {
        private String id;
        private String name;
        private String department;
        private String group;
        
        public TeacherDTO() {}
        
        public TeacherDTO(String id, String name, String department, String group) {
            this.id = id;
            this.name = name;
            this.department = department;
            this.group = group;
        }
        
        public String getId() {
            return id;
        }
        
        public void setId(String id) {
            this.id = id;
        }
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public String getDepartment() {
            return department;
        }
        
        public void setDepartment(String department) {
            this.department = department;
        }
        
        public String getGroup() {
            return group;
        }
        
        public void setGroup(String group) {
            this.group = group;
        }
    }
}

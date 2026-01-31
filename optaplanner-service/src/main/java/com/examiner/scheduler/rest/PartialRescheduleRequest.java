package com.examiner.scheduler.rest;

import java.util.List;

/**
 * 局部重新排班请求DTO
 * 
 * 用于固定部分排班，只重新排班未固定的部分
 * 
 * @author System
 * @version 5.6.0
 */
public class PartialRescheduleRequest {
    
    /**
     * 固定的排班ID列表
     * 这些排班的日期和考官分配将被保护，不会改变
     */
    private List<String> pinnedScheduleIds;
    
    /**
     * 现有的排班数据
     * 包含所有排班（固定的和未固定的）的当前状态
     */
    private List<ExistingAssignment> existingAssignments;
    
    /**
     * 所有学员列表
     */
    private List<StudentDTO> students;
    
    /**
     * 所有考官列表
     */
    private List<TeacherDTO> teachers;
    
    /**
     * 考试开始日期 (yyyy-MM-dd)
     */
    private String startDate;
    
    /**
     * 考试结束日期 (yyyy-MM-dd)
     */
    private String endDate;
    
    /**
     * 约束配置（使用Object以避免循环依赖，实际类型为约束配置对象）
     */
    private Object constraints;
    
    // Getters and Setters
    
    public List<String> getPinnedScheduleIds() {
        return pinnedScheduleIds;
    }
    
    public void setPinnedScheduleIds(List<String> pinnedScheduleIds) {
        this.pinnedScheduleIds = pinnedScheduleIds;
    }
    
    public List<ExistingAssignment> getExistingAssignments() {
        return existingAssignments;
    }
    
    public void setExistingAssignments(List<ExistingAssignment> existingAssignments) {
        this.existingAssignments = existingAssignments;
    }
    
    public List<StudentDTO> getStudents() {
        return students;
    }
    
    public void setStudents(List<StudentDTO> students) {
        this.students = students;
    }
    
    public List<TeacherDTO> getTeachers() {
        return teachers;
    }
    
    public void setTeachers(List<TeacherDTO> teachers) {
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
    
    public Object getConstraints() {
        return constraints;
    }
    
    public void setConstraints(Object constraints) {
        this.constraints = constraints;
    }
    
    /**
     * 现有排班数据DTO
     */
    public static class ExistingAssignment {
        private String id;
        private String studentId;
        private String studentName;
        private Integer examDays;
        private String date1;
        private String examiner1_1;
        private String examiner1_2;
        private String backup1;
        private String date2;
        private String examiner2_1;
        private String examiner2_2;
        private String backup2;
        private boolean pinned;  // 是否固定
        
        // Getters and Setters
        
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

        public Integer getExamDays() {
            return examDays != null ? examDays : 2;
        }

        public void setExamDays(Integer examDays) {
            this.examDays = examDays != null ? examDays : 2;
        }
        
        public String getDate1() {
            return date1;
        }
        
        public void setDate1(String date1) {
            this.date1 = date1;
        }
        
        public String getExaminer1_1() {
            return examiner1_1;
        }
        
        public void setExaminer1_1(String examiner1_1) {
            this.examiner1_1 = examiner1_1;
        }
        
        public String getExaminer1_2() {
            return examiner1_2;
        }
        
        public void setExaminer1_2(String examiner1_2) {
            this.examiner1_2 = examiner1_2;
        }
        
        public String getBackup1() {
            return backup1;
        }
        
        public void setBackup1(String backup1) {
            this.backup1 = backup1;
        }
        
        public String getDate2() {
            return date2;
        }
        
        public void setDate2(String date2) {
            this.date2 = date2;
        }
        
        public String getExaminer2_1() {
            return examiner2_1;
        }
        
        public void setExaminer2_1(String examiner2_1) {
            this.examiner2_1 = examiner2_1;
        }
        
        public String getExaminer2_2() {
            return examiner2_2;
        }
        
        public void setExaminer2_2(String examiner2_2) {
            this.examiner2_2 = examiner2_2;
        }
        
        public String getBackup2() {
            return backup2;
        }
        
        public void setBackup2(String backup2) {
            this.backup2 = backup2;
        }
        
        public boolean isPinned() {
            return pinned;
        }
        
        public void setPinned(boolean pinned) {
            this.pinned = pinned;
        }
    }
    
    /**
     * 学员DTO（简化）
     */
    public static class StudentDTO {
        private String id;
        private String name;
        private String department;
        private String group;
        private Integer examDays;
        private String day1Subjects;
        private String day2Subjects;
        private String recommendedExaminer1Dept;
        private String recommendedExaminer2Dept;
        private String recommendedBackupDept;
        
        // Getters and Setters (省略，参考现有的Student类)
        
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

        public Integer getExamDays() {
            return examDays != null ? examDays : 2;
        }

        public void setExamDays(Integer examDays) {
            this.examDays = examDays != null ? examDays : 2;
        }
        
        public String getDay1Subjects() {
            return day1Subjects;
        }
        
        public void setDay1Subjects(String day1Subjects) {
            this.day1Subjects = day1Subjects;
        }
        
        public String getDay2Subjects() {
            return day2Subjects;
        }
        
        public void setDay2Subjects(String day2Subjects) {
            this.day2Subjects = day2Subjects;
        }
        
        public String getRecommendedExaminer1Dept() {
            return recommendedExaminer1Dept;
        }
        
        public void setRecommendedExaminer1Dept(String recommendedExaminer1Dept) {
            this.recommendedExaminer1Dept = recommendedExaminer1Dept;
        }
        
        public String getRecommendedExaminer2Dept() {
            return recommendedExaminer2Dept;
        }
        
        public void setRecommendedExaminer2Dept(String recommendedExaminer2Dept) {
            this.recommendedExaminer2Dept = recommendedExaminer2Dept;
        }
        
        public String getRecommendedBackupDept() {
            return recommendedBackupDept;
        }
        
        public void setRecommendedBackupDept(String recommendedBackupDept) {
            this.recommendedBackupDept = recommendedBackupDept;
        }
    }
    
    /**
     * 考官DTO（简化）
     */
    public static class TeacherDTO {
        private String id;
        private String name;
        private String department;
        private String group;
        private List<String> skills;
        private int workload;
        private int consecutiveDays;
        private List<UnavailablePeriod> unavailablePeriods;
        
        // Getters and Setters (省略，参考现有的Teacher类)
        
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
        
        public List<String> getSkills() {
            return skills;
        }
        
        public void setSkills(List<String> skills) {
            this.skills = skills;
        }
        
        public int getWorkload() {
            return workload;
        }
        
        public void setWorkload(int workload) {
            this.workload = workload;
        }
        
        public int getConsecutiveDays() {
            return consecutiveDays;
        }
        
        public void setConsecutiveDays(int consecutiveDays) {
            this.consecutiveDays = consecutiveDays;
        }
        
        public List<UnavailablePeriod> getUnavailablePeriods() {
            return unavailablePeriods;
        }
        
        public void setUnavailablePeriods(List<UnavailablePeriod> unavailablePeriods) {
            this.unavailablePeriods = unavailablePeriods;
        }
        
        public static class UnavailablePeriod {
            private String startDate;
            private String endDate;
            private String reason;
            
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
            
            public String getReason() {
                return reason;
            }
            
            public void setReason(String reason) {
                this.reason = reason;
            }
        }
    }
}


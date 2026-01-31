package com.examiner.scheduler.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.optaplanner.core.api.domain.lookup.PlanningId;
import java.util.Objects;
import java.util.List;
import java.util.ArrayList;
import java.time.LocalDate;

/**
 * 考官实体类
 * 🔧 v7.1.2: 添加 @PlanningId 注解以支持多线程求解
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Teacher {
    
    @PlanningId
    private String id;
    private String name;
    private String department; // 一、二、三、四、五、六、七
    private String group;      // 一组、二组、三组、四组、无
    private int workload;
    private int consecutiveDays;
    
    // 🆕 不可用日期期间列表
    private List<UnavailablePeriod> unavailablePeriods = new ArrayList<>();
    
    /**
     * 不可用期类
     */
    public static class UnavailablePeriod {
        private String id;
        private String startDate;  // YYYY-MM-DD格式
        private String endDate;    // YYYY-MM-DD格式
        private String reason;     // 不可用原因
        
        public UnavailablePeriod() {}
        
        public UnavailablePeriod(String id, String startDate, String endDate, String reason) {
            this.id = id;
            this.startDate = startDate;
            this.endDate = endDate;
            this.reason = reason;
        }
        
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        
        public String getStartDate() { return startDate; }
        public void setStartDate(String startDate) { this.startDate = startDate; }
        
        public String getEndDate() { return endDate; }
        public void setEndDate(String endDate) { this.endDate = endDate; }
        
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        
        @Override
        public String toString() {
            return "UnavailablePeriod{" +
                    "startDate='" + startDate + '\'' +
                    ", endDate='" + endDate + '\'' +
                    ", reason='" + reason + '\'' +
                    '}';
        }
    }
    
    // 构造函数
    public Teacher() {}
    
    public Teacher(String id, String name, String department, String group) {
        this.id = id;
        this.name = name;
        this.department = department;
        this.group = group;
        this.workload = 0;
        this.consecutiveDays = 0;
    }
    
    // Getter和Setter方法
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
        this.unavailablePeriods = unavailablePeriods != null ? unavailablePeriods : new ArrayList<>();
    }
    
    /**
     * 🆕 检查考官在指定日期是否在不可用期内
     * @param date 日期字符串，格式：YYYY-MM-DD
     * @return true表示在不可用期内，false表示可用
     * 🔧 v5.5.5: 移除所有调试日志，减少日志输出
     */
    public boolean isUnavailableOnDate(String date) {
        if (date == null || unavailablePeriods == null || unavailablePeriods.isEmpty()) {
            return false;
        }
        
        try {
            LocalDate checkDate = LocalDate.parse(date);
            
            for (UnavailablePeriod period : unavailablePeriods) {
                if (period.getStartDate() == null || period.getEndDate() == null) {
                    continue;
                }
                
                LocalDate startDate = LocalDate.parse(period.getStartDate());
                LocalDate endDate = LocalDate.parse(period.getEndDate());
                
                // 检查日期是否在不可用期间内（包含起始和结束日期）
                if (!checkDate.isBefore(startDate) && !checkDate.isAfter(endDate)) {
                    return true;
                }
            }
        } catch (Exception e) {
            // 日期解析失败，静默忽略
        }
        
        return false;
    }
    
    /**
     * 🆕 获取考官在指定日期的不可用原因
     * @param date 日期字符串，格式：YYYY-MM-DD
     * @return 不可用原因，如果可用则返回null
     * 🔧 v5.5.5: 移除调试日志
     */
    public String getUnavailableReason(String date) {
        if (unavailablePeriods == null || unavailablePeriods.isEmpty() || date == null) {
            return null;
        }
        
        try {
            LocalDate checkDate = LocalDate.parse(date);
            
            for (UnavailablePeriod period : unavailablePeriods) {
                if (period.getStartDate() == null || period.getEndDate() == null) {
                    continue;
                }
                
                LocalDate startDate = LocalDate.parse(period.getStartDate());
                LocalDate endDate = LocalDate.parse(period.getEndDate());
                
                if (!checkDate.isBefore(startDate) && !checkDate.isAfter(endDate)) {
                    return period.getReason();
                }
            }
        } catch (Exception e) {
            // 日期解析失败，静默忽略
        }
        
        return null;
    }
    
    /**
     * 检查考官是否可用（不是白班且不在不可用期内）
     */
    public boolean isAvailableForDate(String date, DutySchedule dutySchedule) {
        // 首先检查是否在不可用期内
        if (isUnavailableOnDate(date)) {
            return false;
        }
        
        // 无班组的考官始终可用（如果不在不可用期内）
        // 修复：同时支持"无"和"行政班"
        if (this.group == null || this.group.trim().isEmpty() || "无".equals(this.group) || "行政班".equals(this.group)) {
            return true;
        }
        
        // 白班考官不可用作考官
        return !this.group.equals(dutySchedule.getDayShift());
    }

    /**
     * 获取考官在指定日期的优先级
     * 晚班 > 休息 > 无班组 > 白班（不可用）
     */
    public int getPriorityForDate(String date, DutySchedule dutySchedule) {
        if (this.group == null || this.group.trim().isEmpty() || "无".equals(this.group) || "行政班".equals(this.group)) {
            return 20; // 无班组考官中等优先级
        }

        if (this.group.equals(dutySchedule.getDayShift())) {
            return 0; // 白班不可用
        }

        if (this.group.equals(dutySchedule.getNightShift())) {
            return 40; // 晚班最高优先级
        }

        if (dutySchedule.getRestGroups() != null && dutySchedule.getRestGroups().contains(this.group)) {
            return 30; // 休息班组次高优先级
        }

        return 10; // 默认优先级
    }

    /**
     * 检查是否与学员同科室
     */
    public boolean isSameDepartment(Student student) {
        return student != null && Objects.equals(this.department, student.getDepartment());
    }

    /**
     * 检查是否与学员不同科室
     */
    public boolean isDifferentDepartment(Student student) {
        return student != null && !Objects.equals(this.department, student.getDepartment());
    }

    /**
     * 获取考官的班次类型
     */
    public String getShiftType() {
        if (this.group == null || this.group.trim().isEmpty() || "无".equals(this.group) || "行政班".equals(this.group)) {
            return "无班组";
        }
        return "未知";
    }

    /**
     * 获取考官的工作状态
     */
    public String getWorkStatus() {
        if (this.group == null || this.group.trim().isEmpty() || "无".equals(this.group) || "行政班".equals(this.group)) {
            return "无班组";
        }
        return "普通班";
    }

    public boolean canBeExaminer1(Student student, DutySchedule dutySchedule) {
        return isAvailableForDate(dutySchedule.getDate(), dutySchedule) && 
               isSameDepartment(student);
    }
    
    /**
     * 检查是否可以作为考官2（必须不同科室）
     */
    public boolean canBeExaminer2(Student student, DutySchedule dutySchedule) {
        return isAvailableForDate(dutySchedule.getDate(), dutySchedule) && 
               isDifferentDepartment(student);
    }
    
    /**
     * 检查是否可以作为备份考官（必须不同科室）
     */
    public boolean canBeBackupExaminer(Student student, DutySchedule dutySchedule) {
        return isAvailableForDate(dutySchedule.getDate(), dutySchedule) && 
               isDifferentDepartment(student);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Teacher teacher = (Teacher) o;
        return Objects.equals(id, teacher.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    @Override
    public String toString() {
        return "Teacher{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", department='" + department + '\'' +
                ", group='" + group + '\'' +
                ", workload=" + workload +
                '}';
    }
}
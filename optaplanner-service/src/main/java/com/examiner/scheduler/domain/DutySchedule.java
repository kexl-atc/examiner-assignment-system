package com.examiner.scheduler.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * 值班调度信息类
 * 基于四班组轮转制度计算每日的值班安排
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class DutySchedule {
    
    private String date;
    private String dayShift;    // 白班班组
    private String nightShift;  // 晚班班组
    private List<String> restGroups; // 休息班组
    private int cyclePosition;  // 循环位置 (0-3)
    private String teacherId;   // 考官ID
    private String shift;       // 值班类型
    
    // 基准日期：2025年9月4日（周四）
    private static final LocalDate BASE_DATE = LocalDate.of(2025, 9, 4);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    // 构造函数
    public DutySchedule() {}
    
    public DutySchedule(String date) {
        this.date = date;
        calculateDutySchedule();
    }
    
    /**
     * 计算指定日期的执勤状态
     * 轮班规律：
     * - 位置0: 白班-二组，晚班-一组
     * - 位置1: 白班-三组，晚班-二组  
     * - 位置2: 白班-四组，晚班-三组
     * - 位置3: 白班-一组，晚班-四组
     */
    private void calculateDutySchedule() {
        LocalDate targetDate;
        try {
            targetDate = parseFlexibleDate(this.date);
        } catch (Exception e) {
            // 如果日期解析失败，默认使用基准日期，避免系统崩溃
            System.err.println("⚠️ [DutySchedule] 日期解析失败: " + this.date + "，将使用默认日期。错误: " + e.getMessage());
            targetDate = BASE_DATE;
        }
        
        // 计算天数差
        long daysDiff = targetDate.toEpochDay() - BASE_DATE.toEpochDay();
        
        // 计算循环位置 (0-3)
        this.cyclePosition = (int) ((daysDiff % 4 + 4) % 4);
        
        // 根据循环位置设置值班安排
        switch (cyclePosition) {
            case 0:
                this.dayShift = "二组";
                this.nightShift = "一组";
                break;
            case 1:
                this.dayShift = "三组";
                this.nightShift = "二组";
                break;
            case 2:
                this.dayShift = "四组";
                this.nightShift = "三组";
                break;
            case 3:
                this.dayShift = "一组";
                this.nightShift = "四组";
                break;
        }
        
        // 计算休息班组
        List<String> allGroups = Arrays.asList("一组", "二组", "三组", "四组");
        this.restGroups = allGroups.stream()
                .filter(group -> !group.equals(dayShift) && !group.equals(nightShift))
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * 增强的日期解析方法，支持多种格式
     */
    private LocalDate parseFlexibleDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return BASE_DATE;
        }
        
        String cleanDate = dateStr.trim().replace("/", "-").replace(".", "-");
        
        // 尝试标准格式
        try {
            return LocalDate.parse(cleanDate, DATE_FORMATTER);
        } catch (Exception e) {
            // 忽略，尝试手动解析
        }
        
        // 手动解析 yyyy-M-d 格式
        try {
            String[] parts = cleanDate.split("-");
            if (parts.length == 3) {
                int year = Integer.parseInt(parts[0]);
                int month = Integer.parseInt(parts[1]);
                int day = Integer.parseInt(parts[2]);
                return LocalDate.of(year, month, day);
            }
        } catch (Exception e) {
            // 忽略
        }
        
        throw new IllegalArgumentException("无法识别的日期格式: " + dateStr);
    }
    
    /**
     * 静态工厂方法，根据日期创建DutySchedule
     */
    public static DutySchedule forDate(String date) {
        return new DutySchedule(date);
    }
    
    /**
     * 静态工厂方法，根据LocalDate创建DutySchedule
     */
    public static DutySchedule forDate(LocalDate date) {
        return new DutySchedule(date.format(DATE_FORMATTER));
    }
    
    // Getter和Setter方法
    public String getDate() {
        return date;
    }
    
    public void setDate(String date) {
        this.date = date;
        if (date != null) {
            calculateDutySchedule();
        }
    }
    
    public String getDayShift() {
        return dayShift;
    }
    
    public void setDayShift(String dayShift) {
        this.dayShift = dayShift;
    }
    
    public String getNightShift() {
        return nightShift;
    }
    
    public void setNightShift(String nightShift) {
        this.nightShift = nightShift;
    }
    
    public List<String> getRestGroups() {
        return restGroups;
    }
    
    public void setRestGroups(List<String> restGroups) {
        this.restGroups = restGroups;
    }
    
    public int getCyclePosition() {
        return cyclePosition;
    }
    
    public void setCyclePosition(int cyclePosition) {
        this.cyclePosition = cyclePosition;
    }
    
    public String getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(String teacherId) {
        this.teacherId = teacherId;
    }

    public String getShift() {
        return shift;
    }

    public void setShift(String shift) {
        this.shift = shift;
    }
    
    /**
     * 检查指定班组是否在休息
     */
    public boolean isGroupResting(String group) {
        return restGroups != null && restGroups.contains(group);
    }
    
    /**
     * 检查指定班组是否在值白班
     */
    public boolean isGroupOnDayShift(String group) {
        return Objects.equals(dayShift, group);
    }
    
    /**
     * 检查指定班组是否在值晚班
     */
    public boolean isGroupOnNightShift(String group) {
        return Objects.equals(nightShift, group);
    }
    
    /**
     * 获取晚班班组列表（为了兼容约束提供者的调用）
     */
    public List<String> getNightShiftGroups() {
        return nightShift != null ? Arrays.asList(nightShift) : Arrays.asList();
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DutySchedule that = (DutySchedule) o;
        return Objects.equals(date, that.date);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(date);
    }
    
    @Override
    public String toString() {
        return "DutySchedule{" +
                "date='" + date + '\'' +
                ", dayShift='" + dayShift + '\'' +
                ", nightShift='" + nightShift + '\'' +
                ", restGroups=" + restGroups +
                ", cyclePosition=" + cyclePosition +
                '}';
    }
}
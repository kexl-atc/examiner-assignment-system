package com.examiner.scheduler.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Objects;

/**
 * 时间段实体类
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class TimeSlot {
    
    private Long id;
    private String date;
    private String timeRange;
    private String start;
    private String end;
    private String period; // morning, afternoon, evening
    
    // 构造函数
    public TimeSlot() {}
    
    public TimeSlot(String start, String end, String period) {
        this.start = start;
        this.end = end;
        this.period = period;
    }
    
    // Getter和Setter方法
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getDate() {
        return date;
    }
    
    public void setDate(String date) {
        this.date = date;
    }
    
    public String getTimeRange() {
        return timeRange;
    }
    
    public void setTimeRange(String timeRange) {
        this.timeRange = timeRange;
    }
    
    public String getStart() {
        return start;
    }
    
    public void setStart(String start) {
        this.start = start;
    }
    
    public String getEnd() {
        return end;
    }
    
    public void setEnd(String end) {
        this.end = end;
    }
    
    public String getPeriod() {
        return period;
    }
    
    public void setPeriod(String period) {
        this.period = period;
    }
    
    /**
     * 检查是否为上午时段
     */
    public boolean isMorning() {
        return "morning".equals(period);
    }
    
    /**
     * 检查是否为下午时段
     */
    public boolean isAfternoon() {
        return "afternoon".equals(period);
    }
    
    /**
     * 检查是否为晚上时段
     */
    public boolean isEvening() {
        return "evening".equals(period);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TimeSlot timeSlot = (TimeSlot) o;
        return Objects.equals(start, timeSlot.start) &&
                Objects.equals(end, timeSlot.end) &&
                Objects.equals(period, timeSlot.period);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(start, end, period);
    }
    
    @Override
    public String toString() {
        return "TimeSlot{" +
                "start='" + start + '\'' +
                ", end='" + end + '\'' +
                ", period='" + period + '\'' +
                '}';
    }
}
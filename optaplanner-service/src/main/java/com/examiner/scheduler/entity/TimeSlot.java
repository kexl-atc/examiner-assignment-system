package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 时间段实体类
 */
@Entity
@Table(name = "time_slots", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"slot_date", "time_range"})
})
@JsonIgnoreProperties(ignoreUnknown = true)
public class TimeSlot extends PanacheEntity {
    
    @Column(name = "slot_date", nullable = false)
    public LocalDate slotDate;
    
    @Column(name = "time_range", nullable = false, length = 20)
    public String timeRange;
    
    @Column(name = "period", nullable = false, length = 10)
    public String period;
    
    @Column(name = "is_available")
    public Boolean isAvailable = true;
    
    @Column(name = "created_at")
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "timeSlot", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    public List<ExamAssignment> examAssignments;
    
    public TimeSlot() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public TimeSlot(LocalDate slotDate, String timeRange, String period) {
        this();
        this.slotDate = slotDate;
        this.timeRange = timeRange;
        this.period = period;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // 静态查询方法
    public static List<TimeSlot> findByDate(LocalDate date) {
        return find("slotDate = ?1 and isAvailable = true", date).list();
    }
    
    public static List<TimeSlot> findByDateRange(LocalDate startDate, LocalDate endDate) {
        return find("slotDate >= ?1 and slotDate <= ?2 and isAvailable = true", startDate, endDate).list();
    }
    
    public static TimeSlot findByDateAndTimeRange(LocalDate date, String timeRange) {
        return find("slotDate = ?1 and timeRange = ?2", date, timeRange).firstResult();
    }
    
    public static List<TimeSlot> findAllAvailable() {
        return find("isAvailable = true").list();
    }
    
    // 转换为原有的domain对象（用于OptaPlanner）
    public com.examiner.scheduler.domain.TimeSlot toDomainObject() {
        com.examiner.scheduler.domain.TimeSlot domainTimeSlot = new com.examiner.scheduler.domain.TimeSlot();
        domainTimeSlot.setId(this.id);
        domainTimeSlot.setDate(this.slotDate.toString());
        domainTimeSlot.setTimeRange(this.timeRange);
        domainTimeSlot.setPeriod(this.period);
        return domainTimeSlot;
    }
}
package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonBackReference;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 值班表实体类
 */
@Entity
@Table(name = "duty_schedules", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"teacher_id", "duty_date"})
})
@JsonIgnoreProperties(ignoreUnknown = true)
public class DutySchedule extends PanacheEntity {
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    @JsonBackReference
    public Teacher teacher;
    
    @Column(name = "duty_date", nullable = false)
    public LocalDate dutyDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "shift_type", nullable = false, length = 20)
    public ShiftType shiftType;
    
    @Column(name = "created_at")
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    public enum ShiftType {
        DAY("白班"),
        NIGHT("夜班"),
        OFF("休息");
        
        private final String displayName;
        
        ShiftType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    public DutySchedule() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public DutySchedule(Teacher teacher, LocalDate dutyDate, ShiftType shiftType) {
        this();
        this.teacher = teacher;
        this.dutyDate = dutyDate;
        this.shiftType = shiftType;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // 静态查询方法
    public static List<DutySchedule> findByTeacher(Teacher teacher) {
        return find("teacher", teacher).list();
    }
    
    public static List<DutySchedule> findByDate(LocalDate date) {
        return find("dutyDate", date).list();
    }
    
    public static List<DutySchedule> findByTeacherAndDateRange(Teacher teacher, LocalDate startDate, LocalDate endDate) {
        return find("teacher = ?1 and dutyDate >= ?2 and dutyDate <= ?3", teacher, startDate, endDate).list();
    }
    
    public static DutySchedule findByTeacherAndDate(Teacher teacher, LocalDate date) {
        return find("teacher = ?1 and dutyDate = ?2", teacher, date).firstResult();
    }
    
    public static List<DutySchedule> findDayShiftByDate(LocalDate date) {
        return find("dutyDate = ?1 and shiftType = ?2", date, ShiftType.DAY).list();
    }
    
    // 转换为原有的domain对象（用于OptaPlanner）
    public com.examiner.scheduler.domain.DutySchedule toDomainObject() {
        com.examiner.scheduler.domain.DutySchedule domainDuty = new com.examiner.scheduler.domain.DutySchedule();
        domainDuty.setTeacherId(this.teacher.teacherId);
        domainDuty.setDate(this.dutyDate.toString());
        domainDuty.setShift(this.shiftType.name());
        return domainDuty;
    }
}
package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * 排班历史实体类
 */
@Entity
@Table(name = "schedule_histories")
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScheduleHistory extends PanacheEntity {
    
    @Column(name = "schedule_name", length = 200)
    public String scheduleName;
    
    @Column(name = "total_students")
    public Integer totalStudents;
    
    @Column(name = "total_assignments")
    public Integer totalAssignments;
    
    @Column(name = "complete_assignments")
    public Integer completeAssignments;
    
    @Column(name = "score_hard")
    public Integer scoreHard;
    
    @Column(name = "score_soft")
    public Integer scoreSoft;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "constraint_config_id")
    public ConstraintConfiguration constraintConfig;
    
    @Column(name = "schedule_data", columnDefinition = "TEXT")
    public String scheduleData; // JSON格式的排班数据
    
    @Column(name = "created_at")
    public LocalDateTime createdAt;
    
    public ScheduleHistory() {
        this.createdAt = LocalDateTime.now();
    }
    
    public ScheduleHistory(String scheduleName, Integer totalStudents, Integer totalAssignments, 
                          Integer completeAssignments, Integer scoreHard, Integer scoreSoft,
                          ConstraintConfiguration constraintConfig, String scheduleData) {
        this();
        this.scheduleName = scheduleName;
        this.totalStudents = totalStudents;
        this.totalAssignments = totalAssignments;
        this.completeAssignments = completeAssignments;
        this.scoreHard = scoreHard;
        this.scoreSoft = scoreSoft;
        this.constraintConfig = constraintConfig;
        this.scheduleData = scheduleData;
    }
    
    // 静态查询方法
    public static java.util.List<ScheduleHistory> findByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return find("createdAt >= ?1 and createdAt <= ?2", startDate, endDate).list();
    }
    
    public static java.util.List<ScheduleHistory> findRecent(int limit) {
        return find("ORDER BY createdAt DESC").page(0, limit).list();
    }
    
    public static java.util.List<ScheduleHistory> findByConstraintConfig(ConstraintConfiguration config) {
        return find("constraintConfig", config).list();
    }
}
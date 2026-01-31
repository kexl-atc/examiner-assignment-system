package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 排班快照实体类
 * 用于保存历史排班记录，支持人工修改追踪
 */
@Entity
@Table(name = "schedule_snapshot")
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScheduleSnapshot extends PanacheEntity {
    // id字段由PanacheEntity提供，无需重复定义
    
    /**
     * 快照名称
     */
    @Column(nullable = false, length = 100)
    public String name;

    /**
     * 快照描述
     */
    @Column(length = 500)
    public String description;

    /**
     * 创建时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_at", nullable = false)
    public LocalDateTime createdAt;

    /**
     * 更新时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;

    /**
     * 排班数据（JSON格式存储）
     */
    @Column(name = "schedule_data", columnDefinition = "TEXT")
    public String scheduleData;

    /**
     * 元数据（JSON格式存储）
     * 包含学员数量、考官数量、日期范围、约束配置、修改统计等
     */
    @Column(name = "metadata", columnDefinition = "TEXT")
    public String metadata;

    /**
     * 总学员数
     */
    @Column(name = "total_students")
    public Integer totalStudents;

    /**
     * 总考官数
     */
    @Column(name = "total_teachers")
    public Integer totalTeachers;

    /**
     * 开始日期
     */
    @Column(name = "start_date")
    public String startDate;

    /**
     * 结束日期
     */
    @Column(name = "end_date")
    public String endDate;

    /**
     * 人工修改次数
     */
    @Column(name = "manual_edit_count")
    public Integer manualEditCount;

    /**
     * 自动分配次数
     */
    @Column(name = "auto_assigned_count")
    public Integer autoAssignedCount;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * 根据名称查找快照
     */
    public static List<ScheduleSnapshot> findByName(String name) {
        return list("name like ?1", "%" + name + "%");
    }

    /**
     * 获取最近的快照列表
     */
    public static List<ScheduleSnapshot> findRecent(int limit) {
        return list("order by createdAt desc", limit);
    }

    /**
     * 查找指定日期范围内的快照
     */
    public static List<ScheduleSnapshot> findByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return list("createdAt >= ?1 and createdAt <= ?2 order by createdAt desc", startDate, endDate);
    }

    /**
     * 统计快照数量
     */
    public static long countAll() {
        return count();
    }

    /**
     * 获取最旧的快照
     */
    public static ScheduleSnapshot findOldest() {
        return find("order by createdAt asc").firstResult();
    }

    /**
     * 获取最新的快照
     */
    public static ScheduleSnapshot findLatest() {
        return find("order by createdAt desc").firstResult();
    }

    /**
     * 删除超过指定天数的旧快照
     */
    public static long deleteOlderThan(int days) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(days);
        return delete("createdAt < ?1", cutoffDate);
    }
}


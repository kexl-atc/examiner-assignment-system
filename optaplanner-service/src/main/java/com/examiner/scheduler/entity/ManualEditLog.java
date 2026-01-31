package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 人工修改日志实体类
 * 用于记录用户的每次人工修改，以便系统学习和优化
 */
@Entity
@Table(name = "manual_edit_logs")
public class ManualEditLog extends PanacheEntity {
    
    /**
     * 修改时间
     */
    @Column(name = "edited_at", nullable = false)
    public LocalDateTime editedAt;
    
    /**
     * 修改人
     */
    @Column(name = "edited_by", length = 100)
    public String editedBy;
    
    // ==================== 编辑上下文 ====================
    
    /**
     * 学员姓名
     */
    @Column(name = "student_name", length = 100)
    public String studentName;
    
    /**
     * 科室
     */
    @Column(name = "department", length = 50)
    public String department;
    
    /**
     * 考试日期
     */
    @Column(name = "exam_date")
    public LocalDate examDate;
    
    /**
     * 字段名称 (examiner1_1, examiner1_2, backup1, examiner2_1, examiner2_2, backup2)
     */
    @Column(name = "field_name", length = 50)
    public String fieldName;
    
    /**
     * 时间段 (day1, day2)
     */
    @Column(name = "time_slot", length = 10)
    public String timeSlot;
    
    // ==================== 修改内容 ====================
    
    /**
     * 原始值（考官姓名）
     */
    @Column(name = "original_value", length = 100)
    public String originalValue;
    
    /**
     * 新值（考官姓名）
     */
    @Column(name = "new_value", length = 100)
    public String newValue;
    
    /**
     * 是否来自推荐列表
     */
    @Column(name = "was_recommended")
    public Boolean wasRecommended;
    
    /**
     * 推荐排名（如果来自推荐）
     */
    @Column(name = "recommendation_rank")
    public Integer recommendationRank;
    
    /**
     * 推荐分数（如果来自推荐）
     */
    @Column(name = "recommendation_score")
    public Double recommendationScore;
    
    // ==================== 修改原因 ====================
    
    /**
     * 原因分类
     */
    @Column(name = "reason_category", length = 100)
    public String reasonCategory;
    
    /**
     * 原因详细说明
     */
    @Column(name = "reason_detail", columnDefinition = "TEXT")
    public String reasonDetail;
    
    // ==================== 冲突信息 ====================
    
    /**
     * 是否存在冲突
     */
    @Column(name = "had_conflicts")
    public Boolean hadConflicts;
    
    /**
     * 冲突JSON数据
     */
    @Column(name = "conflicts_json", columnDefinition = "TEXT")
    public String conflictsJson;
    
    /**
     * 是否强制修改（有冲突仍然修改）
     */
    @Column(name = "is_forced")
    public Boolean isForced;
    
    // ==================== 结果评估 ====================
    
    /**
     * 满意度评分 (1-5)
     */
    @Column(name = "satisfaction_score")
    public Integer satisfactionScore;
    
    /**
     * 用户反馈
     */
    @Column(name = "feedback", columnDefinition = "TEXT")
    public String feedback;
    
    /**
     * 硬约束违反数量
     */
    @Column(name = "hard_violations")
    public Integer hardViolations;
    
    /**
     * 软约束违反数量
     */
    @Column(name = "soft_violations")
    public Integer softViolations;
    
    /**
     * 创建时间
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;
    
    /**
     * 构造函数
     */
    public ManualEditLog() {
        this.createdAt = LocalDateTime.now();
        this.editedAt = LocalDateTime.now();
    }
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (editedAt == null) {
            editedAt = LocalDateTime.now();
        }
    }
}


package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonBackReference;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * 考试分配实体类
 */
@Entity
@Table(name = "exam_assignments")
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExamAssignment extends PanacheEntity {
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @JsonBackReference
    public Student student;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "time_slot_id")
    @JsonBackReference
    public TimeSlot timeSlot;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examiner1_id")
    public Teacher examiner1;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examiner2_id")
    public Teacher examiner2;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examiner3_id")
    public Teacher examiner3;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    public AssignmentStatus status = AssignmentStatus.PENDING;
    
    @Column(name = "created_at")
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    public enum AssignmentStatus {
        PENDING("待分配"),
        ASSIGNED("已分配"),
        COMPLETED("已完成"),
        CANCELLED("已取消");
        
        private final String displayName;
        
        AssignmentStatus(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    public ExamAssignment() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public ExamAssignment(Student student) {
        this();
        this.student = student;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // 静态查询方法
    public static java.util.List<ExamAssignment> findByStudent(Student student) {
        return find("student", student).list();
    }
    
    public static java.util.List<ExamAssignment> findByTimeSlot(TimeSlot timeSlot) {
        return find("timeSlot", timeSlot).list();
    }
    
    public static java.util.List<ExamAssignment> findByStatus(AssignmentStatus status) {
        return find("status", status).list();
    }
    
    public static java.util.List<ExamAssignment> findByExaminer(Teacher examiner) {
        return find("examiner1 = ?1 or examiner2 = ?1 or backupExaminer = ?1", examiner).list();
    }
    
    // 转换为原有的domain对象（用于OptaPlanner）
    public com.examiner.scheduler.domain.ExamAssignment toDomainObject() {
        com.examiner.scheduler.domain.ExamAssignment domainAssignment = new com.examiner.scheduler.domain.ExamAssignment();
        domainAssignment.setStudent(this.student != null ? this.student.toDomainObject() : null);
        domainAssignment.setTimeSlot(this.timeSlot != null ? this.timeSlot.toDomainObject() : null);
        domainAssignment.setExaminer1(this.examiner1 != null ? this.examiner1.toDomainObject() : null);
        domainAssignment.setExaminer2(this.examiner2 != null ? this.examiner2.toDomainObject() : null);
        domainAssignment.setBackupExaminer(this.examiner3 != null ? this.examiner3.toDomainObject() : null);
        return domainAssignment;
    }
    
    // 从domain对象更新实体
    public void updateFromDomainObject(com.examiner.scheduler.domain.ExamAssignment domainAssignment) {
        // 注意：这里需要根据ID查找对应的实体对象
        if (domainAssignment.getTimeSlot() != null) {
            this.timeSlot = TimeSlot.findById(domainAssignment.getTimeSlot().getId());
        }
        if (domainAssignment.getExaminer1() != null) {
            this.examiner1 = Teacher.findByTeacherId(domainAssignment.getExaminer1().getId());
        }
        if (domainAssignment.getExaminer2() != null) {
            this.examiner2 = Teacher.findByTeacherId(domainAssignment.getExaminer2().getId());
        }
        if (domainAssignment.getBackupExaminer() != null) {
            this.examiner3 = Teacher.findByTeacherId(domainAssignment.getBackupExaminer().getId());
        }
        this.status = AssignmentStatus.ASSIGNED;
        this.updatedAt = LocalDateTime.now();
    }
}
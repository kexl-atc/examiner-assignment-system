package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 考官实体类 - JPA版本
 */
@Entity
@Table(name = "teachers")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Teacher extends PanacheEntity {
    
    @Column(name = "teacher_id", unique = true, nullable = false, length = 50)
    public String teacherId;
    
    @Column(name = "name", nullable = false, length = 100)
    public String name;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    public Department department;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    public Group group;
    
    @Column(name = "workload")
    public Integer workload = 0;
    
    @Column(name = "consecutive_days")
    public Integer consecutiveDays = 0;
    
    @Column(name = "is_active")
    public Boolean isActive = true;
    
    @Column(name = "created_at")
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "teacher", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    public List<DutySchedule> dutySchedules;
    
    public Teacher() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public Teacher(String teacherId, String name, Department department, Group group) {
        this();
        this.teacherId = teacherId;
        this.name = name;
        this.department = department;
        this.group = group;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // 静态查询方法
    public static Teacher findByTeacherId(String teacherId) {
        return find("teacherId", teacherId).firstResult();
    }
    
    public static List<Teacher> findByDepartment(Department department) {
        return find("department = ?1 and isActive = true", department).list();
    }
    
    public static List<Teacher> findByDepartmentCode(String departmentCode) {
        return find("department.code = ?1 and isActive = true", departmentCode).list();
    }
    
    public static List<Teacher> findByGroup(Group group) {
        return find("group = ?1 and isActive = true", group).list();
    }
    
    public static List<Teacher> findAllActive() {
        return find("isActive = true").list();
    }
    
    // 转换为原有的domain对象（用于OptaPlanner）
    public com.examiner.scheduler.domain.Teacher toDomainObject() {
        com.examiner.scheduler.domain.Teacher domainTeacher = new com.examiner.scheduler.domain.Teacher();
        domainTeacher.setId(this.teacherId);
        domainTeacher.setName(this.name);
        // 🔧 修复：使用标准化的科室简写格式，确保约束逻辑正确工作
        domainTeacher.setDepartment(this.department != null ? normalizeDepartmentName(this.department.name) : "");
        domainTeacher.setGroup(this.group != null ? this.group.name : "无");
        domainTeacher.setWorkload(this.workload != null ? this.workload : 0);
        domainTeacher.setConsecutiveDays(this.consecutiveDays != null ? this.consecutiveDays : 0);
        return domainTeacher;
    }
    
    /**
     * 科室名称标准化：完整名称 -> 简写格式
     */
    private String normalizeDepartmentName(String departmentName) {
        if (departmentName == null) return "";
        
        String normalized = departmentName.trim();
        
        // 标准化映射：完整名称转简写
        if (normalized.contains("区域一室") || normalized.contains("一室") || normalized.contains("1室")) return "一";
        if (normalized.contains("区域二室") || normalized.contains("二室") || normalized.contains("2室")) return "二";
        if (normalized.contains("区域三室") || normalized.contains("三室") || normalized.contains("3室")) return "三";
        if (normalized.contains("区域四室") || normalized.contains("四室") || normalized.contains("4室")) return "四";
        if (normalized.contains("区域五室") || normalized.contains("五室") || normalized.contains("5室")) return "五";
        if (normalized.contains("区域六室") || normalized.contains("六室") || normalized.contains("6室")) return "六";
        if (normalized.contains("区域七室") || normalized.contains("七室") || normalized.contains("7室")) return "七";
        if (normalized.contains("区域八室") || normalized.contains("八室") || normalized.contains("8室")) return "八";
        if (normalized.contains("区域九室") || normalized.contains("九室") || normalized.contains("9室")) return "九";
        if (normalized.contains("区域十室") || normalized.contains("十室") || normalized.contains("10室")) return "十";
        
        // 如果已经是简写格式，直接返回
        if (normalized.matches("^[一二三四五六七八九十]$")) {
            return normalized;
        }
        
        return normalized;
    }
    
    // 从domain对象更新实体
    public void updateFromDomainObject(com.examiner.scheduler.domain.Teacher domainTeacher) {
        this.workload = domainTeacher.getWorkload();
        this.consecutiveDays = domainTeacher.getConsecutiveDays();
        this.updatedAt = LocalDateTime.now();
    }
}
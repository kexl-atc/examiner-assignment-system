package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 学员实体类 - JPA版本
 */
@Entity
@Table(name = "students")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Student extends PanacheEntity {
    
    @Column(name = "student_id", unique = true, nullable = false, length = 50)
    public String studentId;
    
    @Column(name = "name", nullable = false, length = 100)
    public String name;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    public Department department;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    public Group group;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recommended_examiner1_dept_id")
    public Department recommendedExaminer1Dept;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recommended_examiner2_dept_id")
    public Department recommendedExaminer2Dept;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recommended_backup_dept_id")
    public Department recommendedBackupDept;
    
    // 🆕 考试天数：1天或2天（默认2天）
    @Column(name = "exam_days")
    public Integer examDays = 2;
    
    // 🆕 第一天考试科目（JSON格式存储，例如：["现场", "模拟机1"]）
    @Column(name = "day1_subjects", length = 200)
    public String day1Subjects;
    
    // 🆕 第二天考试科目（JSON格式存储，例如：["模拟机2", "口试"]，一天考试时为空）
    @Column(name = "day2_subjects", length = 200)
    public String day2Subjects;
    
    @Column(name = "is_active")
    public Boolean isActive = true;
    
    @Column(name = "created_at")
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    public List<ExamAssignment> examAssignments;
    
    public Student() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public Student(String studentId, String name, Department department, Group group) {
        this();
        this.studentId = studentId;
        this.name = name;
        this.department = department;
        this.group = group;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // 静态查询方法
    public static Student findByStudentId(String studentId) {
        return find("studentId", studentId).firstResult();
    }
    
    public static List<Student> findByDepartment(Department department) {
        return find("department = ?1 and isActive = true", department).list();
    }
    
    public static List<Student> findByDepartmentCode(String departmentCode) {
        return find("department.code = ?1 and isActive = true", departmentCode).list();
    }
    
    public static List<Student> findAllActive() {
        return find("isActive = true").list();
    }
    
    // 转换为原有的domain对象（用于OptaPlanner）
    public com.examiner.scheduler.domain.Student toDomainObject() {
        com.examiner.scheduler.domain.Student domainStudent = new com.examiner.scheduler.domain.Student();
        domainStudent.setId(this.studentId);
        domainStudent.setName(this.name);
        // 🔧 修复：使用标准化的科室简写格式，确保约束逻辑正确工作
        domainStudent.setDepartment(this.department != null ? normalizeDepartmentName(this.department.name) : "");
        // 🔧 关键修复：使用group.code转换为标准班组名称（"一组"、"二组"等），而不是group.name
        // 因为DutySchedule中使用的是标准班组名称进行白班/晚班判断
        domainStudent.setGroup(this.group != null ? convertGroupCodeToName(this.group.code) : "");
        domainStudent.setRecommendedExaminer1Dept(this.recommendedExaminer1Dept != null ? normalizeDepartmentName(this.recommendedExaminer1Dept.name) : "");
        domainStudent.setRecommendedExaminer2Dept(this.recommendedExaminer2Dept != null ? normalizeDepartmentName(this.recommendedExaminer2Dept.name) : "");
        domainStudent.setRecommendedBackupDept(this.recommendedBackupDept != null ? normalizeDepartmentName(this.recommendedBackupDept.name) : "");
        // 🆕 传递考试天数和科目信息
        domainStudent.setExamDays(this.examDays != null ? this.examDays : 2);
        domainStudent.setDay1Subjects(this.day1Subjects);
        domainStudent.setDay2Subjects(this.day2Subjects);
        return domainStudent;
    }
    
    /**
     * 🔧 关键修复：将班组代码转换为标准班组名称
     * 数据库中存储的是GROUP_1、GROUP_2等代码
     * 但DutySchedule中使用的是"一组"、"二组"等名称进行判断
     */
    private String convertGroupCodeToName(String groupCode) {
        if (groupCode == null) return "";
        switch (groupCode) {
            case "GROUP_1": return "一组";
            case "GROUP_2": return "二组";
            case "GROUP_3": return "三组";
            case "GROUP_4": return "四组";
            case "GROUP_NONE": return "";
            default: return "";
        }
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
}
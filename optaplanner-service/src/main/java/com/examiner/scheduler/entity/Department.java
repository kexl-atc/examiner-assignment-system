package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;


import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 科室实体类
 */
@Entity
@Table(name = "departments")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Department extends PanacheEntity {
    
    @Column(name = "code", unique = true, nullable = false, length = 10)
    public String code;
    
    @Column(name = "name", nullable = false, length = 50)
    public String name;
    
    @Column(name = "description", length = 200)
    public String description;
    
    @Column(name = "created_at")
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    // 关联关系通过外键维护，避免循环引用
    // @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // public List<Teacher> teachers;
    
    // @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // public List<Student> students;
    
    public Department() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public Department(String code, String name, String description) {
        this();
        this.code = code;
        this.name = name;
        this.description = description;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // 静态查询方法
    public static Department findByCode(String code) {
        return find("code", code).firstResult();
    }
    
    public static List<Department> findAllActive() {
        return listAll();
    }
}
package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 班组实体类
 */
@Entity
@Table(name = "groups")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Group extends PanacheEntity {
    
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
    // @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // public List<Teacher> teachers;
    
    // @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // public List<Student> students;
    
    public Group() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public Group(String code, String name, String description) {
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
    public static Group findByCode(String code) {
        return find("code", code).firstResult();
    }
    
    public static List<Group> findAllActive() {
        return listAll();
    }
}
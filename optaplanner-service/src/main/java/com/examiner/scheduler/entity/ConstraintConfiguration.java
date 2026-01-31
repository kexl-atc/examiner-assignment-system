package com.examiner.scheduler.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import javax.persistence.*;
import javax.transaction.Transactional;
import java.time.LocalDateTime;

/**
 * 约束配置实体类
 */
@Entity
@Table(name = "constraint_configurations")
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConstraintConfiguration extends PanacheEntity {
    
    @Column(name = "config_name", unique = true, nullable = false, length = 100)
    public String configName;
    
    @Column(name = "config_data", nullable = false, columnDefinition = "TEXT")
    public String configData; // JSON格式的配置数据
    
    @Column(name = "is_active")
    public Boolean isActive = false;
    
    @Column(name = "created_by", length = 100)
    public String createdBy;
    
    @Column(name = "created_at")
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    public ConstraintConfiguration() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public ConstraintConfiguration(String configName, String configData, String createdBy) {
        this();
        this.configName = configName;
        this.configData = configData;
        this.createdBy = createdBy;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // 静态查询方法
    public static ConstraintConfiguration findByName(String configName) {
        return find("configName", configName).firstResult();
    }
    
    public static ConstraintConfiguration findActiveConfig() {
        return find("isActive = true").firstResult();
    }
    
    public static java.util.List<ConstraintConfiguration> findAllConfigs() {
        return listAll();
    }
    
    // 激活当前配置（同时取消其他配置的激活状态）
    @Transactional
    public void activate() {
        // 先取消所有配置的激活状态
        update("isActive = false");
        // 激活当前配置
        this.isActive = true;
        this.updatedAt = LocalDateTime.now();
        this.persist();
    }
}
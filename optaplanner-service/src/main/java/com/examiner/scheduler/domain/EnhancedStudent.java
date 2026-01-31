package com.examiner.scheduler.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 增强的学员实体类
 * 支持推荐科室信息
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class EnhancedStudent {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("department")
    private String department;
    
    @JsonProperty("group")
    private String group;
    
    // 新增：推荐考官1科室（通常与学员同科室）
    @JsonProperty("recommendedExaminer1Dept")
    private String recommendedExaminer1Dept;
    
    // 新增：推荐考官2科室
    @JsonProperty("recommendedExaminer2Dept")
    private String recommendedExaminer2Dept;
    
    // 新增：推荐备份考官科室
    @JsonProperty("recommendedBackupDept")
    private String recommendedBackupDept;
    
    // 新增：原始推荐信息（用于解析和验证）
    @JsonProperty("originalRecommendation")
    private String originalRecommendation;
    
    // 新增：是否有特殊要求
    @JsonProperty("hasSpecialRequirements")
    private boolean hasSpecialRequirements;
    
    // 新增：特殊要求描述
    @JsonProperty("specialRequirements")
    private String specialRequirements;
    
    // 构造函数
    public EnhancedStudent() {}
    
    public EnhancedStudent(String id, String name, String department, String group) {
        this.id = id;
        this.name = name;
        this.department = department;
        this.group = group;
    }
    
    public EnhancedStudent(String id, String name, String department, String group,
                          String recommendedExaminer1Dept, String recommendedExaminer2Dept,
                          String recommendedBackupDept) {
        this.id = id;
        this.name = name;
        this.department = department;
        this.group = group;
        this.recommendedExaminer1Dept = recommendedExaminer1Dept;
        this.recommendedExaminer2Dept = recommendedExaminer2Dept;
        this.recommendedBackupDept = recommendedBackupDept;
    }
    
    // Getter和Setter方法
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDepartment() {
        return department;
    }
    
    public void setDepartment(String department) {
        this.department = department;
    }
    
    public String getGroup() {
        return group;
    }
    
    public void setGroup(String group) {
        this.group = group;
    }
    
    public String getRecommendedExaminer1Dept() {
        return recommendedExaminer1Dept;
    }
    
    public void setRecommendedExaminer1Dept(String recommendedExaminer1Dept) {
        this.recommendedExaminer1Dept = recommendedExaminer1Dept;
    }
    
    public String getRecommendedExaminer2Dept() {
        return recommendedExaminer2Dept;
    }
    
    public void setRecommendedExaminer2Dept(String recommendedExaminer2Dept) {
        this.recommendedExaminer2Dept = recommendedExaminer2Dept;
    }
    
    public String getRecommendedBackupDept() {
        return recommendedBackupDept;
    }
    
    public void setRecommendedBackupDept(String recommendedBackupDept) {
        this.recommendedBackupDept = recommendedBackupDept;
    }
    
    public String getOriginalRecommendation() {
        return originalRecommendation;
    }
    
    public void setOriginalRecommendation(String originalRecommendation) {
        this.originalRecommendation = originalRecommendation;
    }
    
    public boolean isHasSpecialRequirements() {
        return hasSpecialRequirements;
    }
    
    public void setHasSpecialRequirements(boolean hasSpecialRequirements) {
        this.hasSpecialRequirements = hasSpecialRequirements;
    }
    
    public String getSpecialRequirements() {
        return specialRequirements;
    }
    
    public void setSpecialRequirements(String specialRequirements) {
        this.specialRequirements = specialRequirements;
    }
    
    /**
     * 验证推荐科室信息是否有效
     */
    public boolean isRecommendationValid() {
        // 基本验证：推荐考官1科室应该与学员同科室（或3室7室互通）
        if (recommendedExaminer1Dept != null && department != null) {
            String normalizedStudentDept = normalizeDepartment(department);
            String normalizedRecommended1 = normalizeDepartment(recommendedExaminer1Dept);
            
            boolean sameDept = normalizedStudentDept.equals(normalizedRecommended1);
            boolean crossDept = (normalizedStudentDept.equals("三") && normalizedRecommended1.equals("七")) ||
                               (normalizedStudentDept.equals("七") && normalizedRecommended1.equals("三"));
            
            if (!sameDept && !crossDept) {
                return false;
            }
        }
        
        // 验证：推荐考官2科室应该与学员不同科室
        if (recommendedExaminer2Dept != null && department != null) {
            String normalizedStudentDept = normalizeDepartment(department);
            String normalizedRecommended2 = normalizeDepartment(recommendedExaminer2Dept);
            
            if (normalizedStudentDept.equals(normalizedRecommended2)) {
                return false;
            }
        }
        
        // 验证：推荐考官1和考官2应该来自不同科室
        if (recommendedExaminer1Dept != null && recommendedExaminer2Dept != null) {
            String normalizedRecommended1 = normalizeDepartment(recommendedExaminer1Dept);
            String normalizedRecommended2 = normalizeDepartment(recommendedExaminer2Dept);
            
            if (normalizedRecommended1.equals(normalizedRecommended2)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 科室名称标准化
     */
    private String normalizeDepartment(String department) {
        if (department == null) return "";
        
        String normalized = department.trim();
        
        // 标准化映射
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
        
        return normalized;
    }
    
    /**
     * 获取推荐信息摘要
     */
    public String getRecommendationSummary() {
        StringBuilder summary = new StringBuilder();
        
        if (recommendedExaminer1Dept != null) {
            summary.append("考官1: ").append(recommendedExaminer1Dept);
        }
        
        if (recommendedExaminer2Dept != null) {
            if (summary.length() > 0) summary.append(", ");
            summary.append("考官2: ").append(recommendedExaminer2Dept);
        }
        
        if (recommendedBackupDept != null) {
            if (summary.length() > 0) summary.append(", ");
            summary.append("备份: ").append(recommendedBackupDept);
        }
        
        return summary.toString();
    }
    
    @Override
    public String toString() {
        return "EnhancedStudent{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", department='" + department + '\'' +
                ", group='" + group + '\'' +
                ", recommendedExaminer1Dept='" + recommendedExaminer1Dept + '\'' +
                ", recommendedExaminer2Dept='" + recommendedExaminer2Dept + '\'' +
                ", recommendedBackupDept='" + recommendedBackupDept + '\'' +
                ", hasSpecialRequirements=" + hasSpecialRequirements +
                '}';
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        
        EnhancedStudent that = (EnhancedStudent) o;
        
        return id != null ? id.equals(that.id) : that.id == null;
    }
    
    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}
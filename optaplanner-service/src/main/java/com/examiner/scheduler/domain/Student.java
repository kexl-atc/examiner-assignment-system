package com.examiner.scheduler.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.optaplanner.core.api.domain.lookup.PlanningId;

import java.util.Objects;

/**
 * 学员实体类
 * 🔧 v7.1.2: 添加 @PlanningId 注解以支持多线程求解
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Student {
    
    @PlanningId
    private String id;
    private String name;
    private String department; // 一、二、三、四、五、六、七
    private String group;      // 一组、二组、三组、四组
    private String recommendedExaminer1Dept; // 推荐考官1科室
    private String recommendedExaminer2Dept; // 推荐考官2科室
    private String recommendedBackupDept;    // 推荐备份考官科室
    
    // ✨ 新增：前端智能日期选择推荐的考试日期
    private String recommendedExamDate1;     // 推荐考试日期1（第一天）
    private String recommendedExamDate2;     // 推荐考试日期2（第二天）
    
    // 🆕 考试天数和科目配置
    private Integer examDays = 2;            // 考试天数：1天或2天（默认2天）
    private String day1Subjects;             // 第一天考试科目（JSON格式）
    private String day2Subjects;             // 第二天考试科目（JSON格式）
    
    // 构造函数
    public Student() {}
    
    public Student(String id, String name, String department, String group) {
        this.id = id;
        this.name = name;
        this.department = department;
        this.group = group;
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
    
    // ✨ 智能日期推荐的Getter/Setter
    public String getRecommendedExamDate1() {
        return recommendedExamDate1;
    }
    
    public void setRecommendedExamDate1(String recommendedExamDate1) {
        this.recommendedExamDate1 = recommendedExamDate1;
    }
    
    public String getRecommendedExamDate2() {
        return recommendedExamDate2;
    }
    
    public void setRecommendedExamDate2(String recommendedExamDate2) {
        this.recommendedExamDate2 = recommendedExamDate2;
    }
    
    // 🆕 考试天数和科目的Getter/Setter
    public Integer getExamDays() {
        return examDays != null ? examDays : 2;
    }
    
    public void setExamDays(Integer examDays) {
        this.examDays = examDays != null ? examDays : 2;
    }
    
    public String getDay1Subjects() {
        return day1Subjects;
    }
    
    public void setDay1Subjects(String day1Subjects) {
        this.day1Subjects = day1Subjects;
    }
    
    public String getDay2Subjects() {
        return day2Subjects;
    }
    
    public void setDay2Subjects(String day2Subjects) {
        this.day2Subjects = day2Subjects;
    }
    
    /**
     * 🆕 判断学员是否需要进行第二天考试
     */
    public boolean needsDay2Exam() {
        return getExamDays() == 2;
    }
    
    /**
     * 检查是否属于优先科室（三室、七室）
     */
    public boolean isPriorityDepartment() {
        return "三".equals(this.department) || "七".equals(this.department);
    }
    
    /**
     * 获取学员优先级分数
     * 三室、七室学员优先级更高
     */
    public int getPriorityScore() {
        if (isPriorityDepartment()) {
            return 100; // 高优先级
        }
        return 50; // 普通优先级
    }
    
    /**
     * 检查学员是否可以在指定日期进行考试
     * 主要检查HC5约束：学员进行现场考试时，不能安排在学员本班组执勤白班的时间
     */
    public boolean canExamOnDate(String date, DutySchedule dutySchedule, String examType) {
        // HC5约束：现场考试时不能安排在学员本班组执勤白班的时间
        if ("现场".equals(examType) || "day1".equals(examType)) {
            return !this.group.equals(dutySchedule.getDayShift());
        }
        
        // 其他类型考试没有此限制
        return true;
    }
    
    /**
     * 获取推荐科室池（考官1推荐科室 + 考官2推荐科室）
     * 用于SC2、SC4、SC6、SC8约束
     * 🔧 说明：考官2和备份考官都使用这同一个推荐科室池
     * Excel中只有两列：考官一推荐科室、考官二推荐科室
     */
    public java.util.List<String> getExaminer2RecommendedDepartments() {
        java.util.List<String> departments = new java.util.ArrayList<>();
        if (recommendedExaminer1Dept != null && !recommendedExaminer1Dept.trim().isEmpty()) {
            departments.add(recommendedExaminer1Dept);
        }
        if (recommendedExaminer2Dept != null && !recommendedExaminer2Dept.trim().isEmpty()) {
            departments.add(recommendedExaminer2Dept);
        }
        return departments;
    }
    
    /**
     * 🆕 根据考试类型获取考官2的推荐科室
     * 新规则：
     * - 第一天（day1）：考官2应该来自考官1推荐科室
     * - 第二天（day2）：考官2应该来自考官2推荐科室
     * 
     * @param examType 考试类型："day1" 或 "day2"
     * @return 对应的推荐科室（单个科室，不是列表）
     */
    public String getExaminer2RecommendedDepartmentByExamType(String examType) {
        if ("day1".equals(examType)) {
            // 第一天：使用考官1推荐科室
            return recommendedExaminer1Dept;
        } else if ("day2".equals(examType)) {
            // 第二天：使用考官2推荐科室
            return recommendedExaminer2Dept;
        }
        // 默认返回null（不应该发生）
        return null;
    }
    
    // ==================== 🆕 三级降级匹配系统 ====================
    
    /**
     * 🆕 辅助方法：标准化科室名称
     * 确保比较时使用统一的格式
     */
    private String normalizeDept(String dept) {
        if (dept == null) return null;
        // 移除"室"、"科"等后缀，统一格式
        return dept.replace("室", "").replace("科", "").trim();
    }
    
    /**
     * 🆕 辅助方法：比较两个科室是否匹配（支持模糊匹配）
     * 例如："三室" 和 "三" 应该被认为是匹配的
     */
    private boolean deptMatches(String dept1, String dept2) {
        if (dept1 == null || dept2 == null) return false;
        String normalized1 = normalizeDept(dept1);
        String normalized2 = normalizeDept(dept2);
        return normalized1 != null && normalized1.equals(normalized2);
    }
    
    /**
     * 🆕 Level 1 - 理想状态：获取考官二的精确推荐科室
     * 规则：
     * - Day1考官二 → 转盘考官一（recommendedExaminer1Dept）
     * - Day2考官二 → 转盘考官一（recommendedExaminer1Dept）
     * 
     * @param examType 考试类型："day1" 或 "day2"
     * @return 考官二的精确推荐科室（已标准化）
     */
    public String getExaminer2IdealDept(String examType) {
        // Level 1：Day1和Day2的考官二都应该来自"转盘考官一"
        return normalizeDept(recommendedExaminer1Dept);
    }
    
    /**
     * 🆕 Level 1 - 理想状态：获取备份考官的精确推荐科室
     * 规则：
     * - Day1备份考官 → 转盘考官二（recommendedExaminer2Dept）
     * - Day2备份考官 → 转盘考官二（recommendedExaminer2Dept）
     * 
     * @param examType 考试类型："day1" 或 "day2"
     * @return 备份考官的精确推荐科室（已标准化）
     */
    public String getBackupIdealDept(String examType) {
        // Level 1：Day1和Day2的备份考官都应该来自"转盘考官二"
        return normalizeDept(recommendedExaminer2Dept);
    }
    
    /**
     * 🆕 Level 2 - 第一次降级：检查科室是否在推荐科室池中
     * 规则：转盘考官一或考官二 → 考官二或备份考官
     * 
     * @param dept 要检查的科室（应该已经被标准化）
     * @return 是否在推荐科室池中
     */
    public boolean isInRecommendedDeptPool(String dept) {
        if (dept == null) return false;
        String normalizedDept = normalizeDept(dept);
        return deptMatches(normalizedDept, recommendedExaminer1Dept) 
            || deptMatches(normalizedDept, recommendedExaminer2Dept);
    }
    
    /**
     * 🆕 计算考官二匹配的降级等级
     * @param examiner2Dept 考官二的科室（应该已经被标准化）
     * @param examType 考试类型
     * @return 匹配等级：1=理想, 2=降级, 0=不匹配
     */
    public int getExaminer2MatchLevel(String examiner2Dept, String examType) {
        if (examiner2Dept == null) return 0;
        
        String normalizedExaminer2Dept = normalizeDept(examiner2Dept);
        
        // Level 1: 精确匹配 - 考官二来自"转盘考官一"
        String idealDept = getExaminer2IdealDept(examType);
        if (idealDept != null && idealDept.equals(normalizedExaminer2Dept)) {
            return 1;
        }
        
        // Level 2: 降级匹配 - 考官二来自推荐科室池
        if (isInRecommendedDeptPool(examiner2Dept)) {
            return 2;
        }
        
        // 不匹配
        return 0;
    }
    
    /**
     * 🆕 计算备份考官匹配的降级等级
     * @param backupDept 备份考官的科室（应该已经被标准化）
     * @param examType 考试类型
     * @return 匹配等级：1=理想, 2=降级, 0=不匹配
     */
    public int getBackupMatchLevel(String backupDept, String examType) {
        if (backupDept == null) return 0;
        
        String normalizedBackupDept = normalizeDept(backupDept);
        
        // Level 1: 精确匹配 - 备份考官来自"转盘考官二"
        String idealDept = getBackupIdealDept(examType);
        if (idealDept != null && idealDept.equals(normalizedBackupDept)) {
            return 1;
        }
        
        // Level 2: 降级匹配 - 备份考官来自推荐科室池
        if (isInRecommendedDeptPool(backupDept)) {
            return 2;
        }
        
        // 不匹配
        return 0;
    }
    
    /**
     * 🆕 检查Day的整体匹配情况（用于Level 3判断）
     * Level 3规则：转盘考官一或二至少在该Day的考官二或备份考官中出现一次
     * 
     * @param examiner2Dept 考官二科室
     * @param backupDept 备份考官科室
     * @return 是否满足Level 3
     */
    public boolean isDayLevel3Satisfied(String examiner2Dept, String backupDept) {
        // 检查考官二是否在推荐池
        boolean examiner2InPool = isInRecommendedDeptPool(examiner2Dept);
        // 检查备份考官是否在推荐池
        boolean backupInPool = isInRecommendedDeptPool(backupDept);
        
        // Level 3：至少有一个在推荐池中
        return examiner2InPool || backupInPool;
    }
    
    /**
     * 🆕 计算单日的匹配奖励分数
     * @param examiner2Dept 考官二科室
     * @param backupDept 备份考官科室
     * @param examType 考试类型
     * @return 奖励分数
     */
    public int calculateDayMatchScore(String examiner2Dept, String backupDept, String examType) {
        int examiner2Level = getExaminer2MatchLevel(examiner2Dept, examType);
        int backupLevel = getBackupMatchLevel(backupDept, examType);
        
        int score = 0;
        
        // 考官二得分
        switch (examiner2Level) {
            case 1: score += 100; break;  // Level 1: 精确匹配
            case 2: score += 60; break;   // Level 2: 池内匹配
        }
        
        // 备份考官得分
        switch (backupLevel) {
            case 1: score += 80; break;   // Level 1: 精确匹配
            case 2: score += 50; break;   // Level 2: 池内匹配
        }
        
        // Level 3 额外奖励（如果至少有一个匹配）
        if (examiner2Level > 0 || backupLevel > 0) {
            score += 30;  // Level 3 基础分
        }
        
        return score;
    }
    
    /**
     * @deprecated 此方法已废弃。实际Excel中没有备份考官推荐科室这一列。
     * 备份考官也使用考官2推荐科室池（getExaminer2RecommendedDepartments()）
     * 保留此方法仅为兼容性，但实际值通常为null
     */
    @Deprecated
    public String getBackupRecommendedDepartment() {
        return recommendedBackupDept;
    }
    
    /**
     * @deprecated 此方法混淆了考官2和备份考官的推荐科室，建议使用：
     * - getExaminer2RecommendedDepartments() - 获取考官2推荐科室池
     * - getBackupRecommendedDepartment() - 获取备份考官推荐科室
     * 🔧 修复：为了向后兼容，保留此方法，但移除了备份考官推荐科室
     */
    @Deprecated
    public java.util.List<String> getRecommendedDepartments() {
        java.util.List<String> departments = new java.util.ArrayList<>();
        if (recommendedExaminer1Dept != null && !recommendedExaminer1Dept.trim().isEmpty()) {
            departments.add(recommendedExaminer1Dept);
        }
        if (recommendedExaminer2Dept != null && !recommendedExaminer2Dept.trim().isEmpty()) {
            departments.add(recommendedExaminer2Dept);
        }
        // 🔧 修复：移除备份考官推荐科室（不应该在推荐科室池中）
        return departments;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Student student = (Student) o;
        return Objects.equals(id, student.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    @Override
    public String toString() {
        return "Student{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", department='" + department + '\'' +
                ", group='" + group + '\'' +
                '}';
    }
}
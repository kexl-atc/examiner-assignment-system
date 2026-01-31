package com.examiner.scheduler.domain;

import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.examiner.scheduler.config.HardSoftScoreDeserializer;

/**
 * 优化后的约束配置类
 * 严格区分硬约束和软约束，简化权重管理
 * 
 * 硬约束（必须满足）：
 * 1. HC1: 考试时间仅限工作日（排除周末及法定节假日）
 * 2. HC2: 考官1必须与考生同科室，且考官1与考官2需来自不同科室
 * 3. HC3: 每场考试必须配备考官1和考官2各一名
 * 4. HC4: 每名考官每天只能监考一名考生
 * 
 * 软约束（优先满足）：
 * 1. SC9: 允许3室与7室考官资源互通使用
 * 2. SC8: 优先选择无班组考官担任备份考官
 * 3. SC1: 优先安排执勤晚班的考官（第一优先级）
 * 4. SC2: 优先安排休息第一天的考官（第二优先级）
 * 5. SC3: 优先安排休息第二天的考官（第三优先级）
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class OptimizedConstraintConfiguration {
    
    // ==================== 硬约束配置（不可关闭） ====================
    
    /**
     * HC1: 法定节假日不安排考试（周末可以考试但行政班考官不参与）
     * 法定节假日禁止考试，周末允许考试但行政班考官不能参与
     */
    private final boolean workdaysOnlyExam = true;
    
    /**
     * HC2: 考官1与学员同科室
     * 考官1必须与考生属于同一科室
     */
    private final boolean examinerDepartmentRules = true;
    
    /**
     * HC3: 每场考试必须配备考官1和考官2各一名
     * 确保考试规范性
     */
    private final boolean twoMainExaminersRequired = true;
    
    /**
     * HC4: 每名考官每天只能监考一名考生
     * 防止同一考官在同一天被分配到多场考试
     */
    private final boolean noDayShiftExaminer = true;
    
    /**
     * HC5: 考生执勤白班不能安排考试
     * 学员进行现场考试时，不能安排在学员本班组执勤白班的时间
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore noStudentDayShiftExamWeight = HardSoftScore.ofHard(6000);
    private boolean noStudentDayShiftExamEnabled = true;
    
    /**
     * HC6: 连续两天考试要求
     * 学员的两次考试必须安排在连续的工作日内
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore consecutiveTwoDaysExamWeight = HardSoftScore.ofHard(4000);
    private boolean consecutiveTwoDaysExamEnabled = true;
    
    /**
     * HC7: 必须有考官1和考官2两名考官，且不能同科室
     * 确保每场考试必须配备两名不同科室的考官
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore mustHaveTwoDifferentDepartmentExaminersWeight = HardSoftScore.ofHard(10000);
    private boolean mustHaveTwoDifferentDepartmentExaminersEnabled = true;
    
    /**
     * HC8: 备份考官不能与考官1和考官2是同一人
     * 确保备份考官必须是独立的第三人
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore backupExaminerMustBeDifferentPersonWeight = HardSoftScore.ofHard(3000);
    private boolean backupExaminerMustBeDifferentPersonEnabled = true;
    
    // ==================== 软约束权重配置 ====================
    
    /**
     * SC9: 区域三室和区域七室的考官互用
     * 3室与7室考官可以互相支援，增加资源灵活性
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore allowDept37CrossUseWeight = HardSoftScore.ofSoft(20);
    private boolean allowDept37CrossUseEnabled = true;
    
    /**
     * SC8: 优先选择无班组考官担任备份考官
     * 无班组考官作为备份考官的优先级更高
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore preferNoGroupTeachersWeight = HardSoftScore.ofSoft(250);
    
    /**
     * SC1: 执勤晚班考官优先约束（第一优先级）
     * 权重等级仅次于科室推荐，优先选择晚班考官作为考官2和备份考官
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore nightShiftTeacherPriorityWeight = HardSoftScore.ofSoft(100);
    private boolean nightShiftTeacherPriorityEnabled = true;
    
    /**
     * SC2: 休息第一天考官优先约束（第二优先级）
     * 在晚班考官之后，优先选择休息第一天的考官
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore firstRestDayTeacherPriorityWeight = HardSoftScore.ofSoft(80);
    private boolean firstRestDayTeacherPriorityEnabled = true;
    
    /**
     * SC3: 休息第二天考官优先约束（第三优先级）
     * 在休息第一天考官之后，优先选择休息第二天的考官
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore secondRestDayTeacherPriorityWeight = HardSoftScore.ofSoft(60);
    private boolean secondRestDayTeacherPriorityEnabled = true;
    
    // ==================== 新增软约束权重配置 ====================
    
    /**
     * SC5: 配备非主考官科室的备份考官
     * 备份考官与考官1来自不同科室，增强公正性
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore backupExaminerDiffDeptWeight = HardSoftScore.ofSoft(400);
    private boolean backupExaminerDiffDeptEnabled = true;
    
    /**
     * SC6: 避免在考生白班时段安排考试
     * 尽量避免在考生白班时段安排考试，减少冲突
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore avoidStudentDayShiftWeight = HardSoftScore.ofSoft(350);
    private boolean avoidStudentDayShiftEnabled = true;
    
    /**
     * SC7: 考官2和备份考官优先来自推荐科室
     * 优先选择推荐科室的考官，提高专业匹配度
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore preferRecommendedDeptsWeight = HardSoftScore.ofSoft(600);
    private boolean preferRecommendedDeptsEnabled = true;
    
    /**
     * SC10: 确保考生两天考试日期连续
     * 优先安排连续工作日的考试，便于考生安排
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore ensureConsecutiveDaysWeight = HardSoftScore.ofSoft(450);
    private boolean ensureConsecutiveDaysEnabled = true;
    
    /**
     * SC10: 考官工作量均衡考量
     * 平衡各考官的工作负荷，避免过度集中
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore balanceWorkloadWeight = HardSoftScore.ofSoft(10);
    private boolean balanceWorkloadEnabled = true;
    
    /**
     * SC11: 考试日期分配均衡考量
     * 平衡不同日期的考试安排，避免某些日期考试过于集中
     * ✨ 方案B：权重从5提升到50，强制驱动日期分散
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore preferLaterDatesWeight = HardSoftScore.ofSoft(50);
    private boolean preferLaterDatesEnabled = true;
    
    /**
     * SC12: 晚班考官推荐科室加分
     * 晚班考官来自推荐科室时给予额外加分
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore nightShiftTeacherRecommendedDepartmentBonusWeight = HardSoftScore.ofSoft(350);
    private boolean nightShiftTeacherRecommendedDepartmentBonusEnabled = true;
    
    /**
     * SC4: 最后安排行政班考官
     * 行政班考官日常工作较忙，优先级相对较低
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore adminTeacherPriorityWeight = HardSoftScore.ofSoft(40);
    private boolean adminTeacherPriorityEnabled = true;
    
    /**
     * SC16: 智能周末降级策略（避免周末排班）🌟🆕
     * - 优先使用工作日，只有在工作日不够时才使用周末
     * - 权重：500（高于大部分软约束，确保工作日优先）
     * - 配合HC1约束，行政班考官周末已被硬性禁止
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore avoidWeekendSchedulingWeight = HardSoftScore.ofSoft(500);
    private boolean avoidWeekendSchedulingEnabled = true;
    
    /**
     * SC17: 周末优先晚班考官策略🌟🆕
     * - 周末安排晚班考官（晚上值班，白天考试合理）→ 奖励分数
     * - 周末安排休息班组（专门过来不合理）→ 惩罚分数
     * - 权重：300（高优先级软约束）
     * - 配合SC16使用，当必须使用周末时才生效
     * 
     * 🔧 已优化：移除复杂逻辑和日志，确保线程安全
     */
    @JsonDeserialize(using = HardSoftScoreDeserializer.class)
    private HardSoftScore preferNightShiftOnWeekendWeight = HardSoftScore.ofSoft(300);
    private boolean preferNightShiftOnWeekendEnabled = true; // 🔧 已修复，可重新启用
    
    // ==================== 构造函数 ====================
    
    public OptimizedConstraintConfiguration() {}
    
    // ==================== 硬约束Getter方法（只读） ====================
    
    public boolean isWorkdaysOnlyExam() {
        return workdaysOnlyExam;
    }
    
    public boolean isExaminerDepartmentRules() {
        return examinerDepartmentRules;
    }
    
    public boolean isTwoMainExaminersRequired() {
        return twoMainExaminersRequired;
    }
    
    public boolean isNoDayShiftExaminer() {
        return noDayShiftExaminer;
    }
    
    // ==================== 软约束权重Getter和Setter方法 ====================
    
    public HardSoftScore getAllowDept37CrossUseWeight() {
        return allowDept37CrossUseWeight;
    }
    
    public void setAllowDept37CrossUseWeight(HardSoftScore allowDept37CrossUseWeight) {
        this.allowDept37CrossUseWeight = allowDept37CrossUseWeight;
    }
    
    public boolean isAllowDept37CrossUseEnabled() {
        return allowDept37CrossUseEnabled;
    }
    
    public void setAllowDept37CrossUseEnabled(boolean allowDept37CrossUseEnabled) {
        this.allowDept37CrossUseEnabled = allowDept37CrossUseEnabled;
    }
    
    public HardSoftScore getPreferNoGroupTeachersWeight() {
        return preferNoGroupTeachersWeight;
    }
    
    public void setPreferNoGroupTeachersWeight(HardSoftScore preferNoGroupTeachersWeight) {
        this.preferNoGroupTeachersWeight = preferNoGroupTeachersWeight;
    }
    
    // ==================== 新增优先级约束Getter和Setter方法 ====================
    
    public HardSoftScore getNightShiftTeacherPriorityWeight() {
        return nightShiftTeacherPriorityWeight;
    }
    
    public void setNightShiftTeacherPriorityWeight(HardSoftScore nightShiftTeacherPriorityWeight) {
        this.nightShiftTeacherPriorityWeight = nightShiftTeacherPriorityWeight;
    }
    
    public boolean isNightShiftTeacherPriorityEnabled() {
        return nightShiftTeacherPriorityEnabled;
    }
    
    public void setNightShiftTeacherPriorityEnabled(boolean nightShiftTeacherPriorityEnabled) {
        this.nightShiftTeacherPriorityEnabled = nightShiftTeacherPriorityEnabled;
    }
    
    public HardSoftScore getFirstRestDayTeacherPriorityWeight() {
        return firstRestDayTeacherPriorityWeight;
    }
    
    public void setFirstRestDayTeacherPriorityWeight(HardSoftScore firstRestDayTeacherPriorityWeight) {
        this.firstRestDayTeacherPriorityWeight = firstRestDayTeacherPriorityWeight;
    }
    
    public boolean isFirstRestDayTeacherPriorityEnabled() {
        return firstRestDayTeacherPriorityEnabled;
    }
    
    public void setFirstRestDayTeacherPriorityEnabled(boolean firstRestDayTeacherPriorityEnabled) {
        this.firstRestDayTeacherPriorityEnabled = firstRestDayTeacherPriorityEnabled;
    }
    
    public HardSoftScore getSecondRestDayTeacherPriorityWeight() {
        return secondRestDayTeacherPriorityWeight;
    }
    
    public void setSecondRestDayTeacherPriorityWeight(HardSoftScore secondRestDayTeacherPriorityWeight) {
        this.secondRestDayTeacherPriorityWeight = secondRestDayTeacherPriorityWeight;
    }
    
    public boolean isSecondRestDayTeacherPriorityEnabled() {
        return secondRestDayTeacherPriorityEnabled;
    }
    
    public void setSecondRestDayTeacherPriorityEnabled(boolean secondRestDayTeacherPriorityEnabled) {
        this.secondRestDayTeacherPriorityEnabled = secondRestDayTeacherPriorityEnabled;
    }
    
    // ==================== 新增软约束Getter和Setter方法 ====================
    
    public HardSoftScore getBackupExaminerDiffDeptWeight() {
        return backupExaminerDiffDeptWeight;
    }
    
    public void setBackupExaminerDiffDeptWeight(HardSoftScore backupExaminerDiffDeptWeight) {
        this.backupExaminerDiffDeptWeight = backupExaminerDiffDeptWeight;
    }
    
    public boolean isBackupExaminerDiffDeptEnabled() {
        return backupExaminerDiffDeptEnabled;
    }
    
    public void setBackupExaminerDiffDeptEnabled(boolean backupExaminerDiffDeptEnabled) {
        this.backupExaminerDiffDeptEnabled = backupExaminerDiffDeptEnabled;
    }
    
    public HardSoftScore getAvoidStudentDayShiftWeight() {
        return avoidStudentDayShiftWeight;
    }
    
    public void setAvoidStudentDayShiftWeight(HardSoftScore avoidStudentDayShiftWeight) {
        this.avoidStudentDayShiftWeight = avoidStudentDayShiftWeight;
    }
    
    public boolean isAvoidStudentDayShiftEnabled() {
        return avoidStudentDayShiftEnabled;
    }
    
    public void setAvoidStudentDayShiftEnabled(boolean avoidStudentDayShiftEnabled) {
        this.avoidStudentDayShiftEnabled = avoidStudentDayShiftEnabled;
    }
    
    public HardSoftScore getPreferRecommendedDeptsWeight() {
        return preferRecommendedDeptsWeight;
    }
    
    public void setPreferRecommendedDeptsWeight(HardSoftScore preferRecommendedDeptsWeight) {
        this.preferRecommendedDeptsWeight = preferRecommendedDeptsWeight;
    }
    
    public boolean isPreferRecommendedDeptsEnabled() {
        return preferRecommendedDeptsEnabled;
    }
    
    public void setPreferRecommendedDeptsEnabled(boolean preferRecommendedDeptsEnabled) {
        this.preferRecommendedDeptsEnabled = preferRecommendedDeptsEnabled;
    }
    
    public HardSoftScore getEnsureConsecutiveDaysWeight() {
        return ensureConsecutiveDaysWeight;
    }
    
    public void setEnsureConsecutiveDaysWeight(HardSoftScore ensureConsecutiveDaysWeight) {
        this.ensureConsecutiveDaysWeight = ensureConsecutiveDaysWeight;
    }
    
    public boolean isEnsureConsecutiveDaysEnabled() {
        return ensureConsecutiveDaysEnabled;
    }
    
    public void setEnsureConsecutiveDaysEnabled(boolean ensureConsecutiveDaysEnabled) {
        this.ensureConsecutiveDaysEnabled = ensureConsecutiveDaysEnabled;
    }
    
    public HardSoftScore getBalanceWorkloadWeight() {
        return balanceWorkloadWeight;
    }
    
    public void setBalanceWorkloadWeight(HardSoftScore balanceWorkloadWeight) {
        this.balanceWorkloadWeight = balanceWorkloadWeight;
    }
    
    public boolean isBalanceWorkloadEnabled() {
        return balanceWorkloadEnabled;
    }
    
    public void setBalanceWorkloadEnabled(boolean balanceWorkloadEnabled) {
        this.balanceWorkloadEnabled = balanceWorkloadEnabled;
    }
    
    public HardSoftScore getPreferLaterDatesWeight() {
        return preferLaterDatesWeight;
    }
    
    public void setPreferLaterDatesWeight(HardSoftScore preferLaterDatesWeight) {
        this.preferLaterDatesWeight = preferLaterDatesWeight;
    }
    
    public boolean isPreferLaterDatesEnabled() {
        return preferLaterDatesEnabled;
    }
    
    public void setPreferLaterDatesEnabled(boolean preferLaterDatesEnabled) {
        this.preferLaterDatesEnabled = preferLaterDatesEnabled;
    }
    
    public HardSoftScore getNightShiftTeacherRecommendedDepartmentBonusWeight() {
        return nightShiftTeacherRecommendedDepartmentBonusWeight;
    }
    
    public void setNightShiftTeacherRecommendedDepartmentBonusWeight(HardSoftScore nightShiftTeacherRecommendedDepartmentBonusWeight) {
        this.nightShiftTeacherRecommendedDepartmentBonusWeight = nightShiftTeacherRecommendedDepartmentBonusWeight;
    }
    
    public boolean isNightShiftTeacherRecommendedDepartmentBonusEnabled() {
        return nightShiftTeacherRecommendedDepartmentBonusEnabled;
    }
    
    public void setNightShiftTeacherRecommendedDepartmentBonusEnabled(boolean nightShiftTeacherRecommendedDepartmentBonusEnabled) {
        this.nightShiftTeacherRecommendedDepartmentBonusEnabled = nightShiftTeacherRecommendedDepartmentBonusEnabled;
    }
    
    public HardSoftScore getAdminTeacherPriorityWeight() {
        return adminTeacherPriorityWeight;
    }
    
    public void setAdminTeacherPriorityWeight(HardSoftScore adminTeacherPriorityWeight) {
        this.adminTeacherPriorityWeight = adminTeacherPriorityWeight;
    }
    
    public boolean isAdminTeacherPriorityEnabled() {
        return adminTeacherPriorityEnabled;
    }
    
    public void setAdminTeacherPriorityEnabled(boolean adminTeacherPriorityEnabled) {
        this.adminTeacherPriorityEnabled = adminTeacherPriorityEnabled;
    }
    
    // ==================== SC16约束的getter和setter方法 ====================
    
    public HardSoftScore getAvoidWeekendSchedulingWeight() {
        return avoidWeekendSchedulingWeight;
    }
    
    public void setAvoidWeekendSchedulingWeight(HardSoftScore avoidWeekendSchedulingWeight) {
        this.avoidWeekendSchedulingWeight = avoidWeekendSchedulingWeight;
    }
    
    public boolean isAvoidWeekendSchedulingEnabled() {
        return avoidWeekendSchedulingEnabled;
    }
    
    public void setAvoidWeekendSchedulingEnabled(boolean avoidWeekendSchedulingEnabled) {
        this.avoidWeekendSchedulingEnabled = avoidWeekendSchedulingEnabled;
    }
    
    // ==================== SC17约束的getter和setter方法 ====================
    
    public HardSoftScore getPreferNightShiftOnWeekendWeight() {
        return preferNightShiftOnWeekendWeight;
    }
    
    public void setPreferNightShiftOnWeekendWeight(HardSoftScore preferNightShiftOnWeekendWeight) {
        this.preferNightShiftOnWeekendWeight = preferNightShiftOnWeekendWeight;
    }
    
    public boolean isPreferNightShiftOnWeekendEnabled() {
        return preferNightShiftOnWeekendEnabled;
    }
    
    public void setPreferNightShiftOnWeekendEnabled(boolean preferNightShiftOnWeekendEnabled) {
        this.preferNightShiftOnWeekendEnabled = preferNightShiftOnWeekendEnabled;
    }
    
    // ==================== HC6约束的getter和setter方法 ====================
    
    public HardSoftScore getConsecutiveTwoDaysExamWeight() {
        return consecutiveTwoDaysExamWeight;
    }
    
    public void setConsecutiveTwoDaysExamWeight(HardSoftScore consecutiveTwoDaysExamWeight) {
        this.consecutiveTwoDaysExamWeight = consecutiveTwoDaysExamWeight;
    }
    
    public boolean isConsecutiveTwoDaysExamEnabled() {
        return consecutiveTwoDaysExamEnabled;
    }
    
    public void setConsecutiveTwoDaysExamEnabled(boolean consecutiveTwoDaysExamEnabled) {
        this.consecutiveTwoDaysExamEnabled = consecutiveTwoDaysExamEnabled;
    }
    
    public HardSoftScore getMustHaveTwoDifferentDepartmentExaminersWeight() {
        return mustHaveTwoDifferentDepartmentExaminersWeight;
    }
    
    public void setMustHaveTwoDifferentDepartmentExaminersWeight(HardSoftScore mustHaveTwoDifferentDepartmentExaminersWeight) {
        this.mustHaveTwoDifferentDepartmentExaminersWeight = mustHaveTwoDifferentDepartmentExaminersWeight;
    }
    
    public boolean isMustHaveTwoDifferentDepartmentExaminersEnabled() {
        return mustHaveTwoDifferentDepartmentExaminersEnabled;
    }
    
    public void setMustHaveTwoDifferentDepartmentExaminersEnabled(boolean mustHaveTwoDifferentDepartmentExaminersEnabled) {
        this.mustHaveTwoDifferentDepartmentExaminersEnabled = mustHaveTwoDifferentDepartmentExaminersEnabled;
    }

    public HardSoftScore getBackupExaminerMustBeDifferentPersonWeight() {
        return backupExaminerMustBeDifferentPersonWeight;
    }

    public void setBackupExaminerMustBeDifferentPersonWeight(HardSoftScore backupExaminerMustBeDifferentPersonWeight) {
        this.backupExaminerMustBeDifferentPersonWeight = backupExaminerMustBeDifferentPersonWeight;
    }

    public boolean isBackupExaminerMustBeDifferentPersonEnabled() {
        return backupExaminerMustBeDifferentPersonEnabled;
    }

    public void setBackupExaminerMustBeDifferentPersonEnabled(boolean backupExaminerMustBeDifferentPersonEnabled) {
        this.backupExaminerMustBeDifferentPersonEnabled = backupExaminerMustBeDifferentPersonEnabled;
    }

    public HardSoftScore getNoStudentDayShiftExamWeight() {
        return noStudentDayShiftExamWeight;
    }

    public void setNoStudentDayShiftExamWeight(HardSoftScore noStudentDayShiftExamWeight) {
        this.noStudentDayShiftExamWeight = noStudentDayShiftExamWeight;
    }

    public boolean isNoStudentDayShiftExamEnabled() {
        return noStudentDayShiftExamEnabled;
    }

    public void setNoStudentDayShiftExamEnabled(boolean noStudentDayShiftExamEnabled) {
        this.noStudentDayShiftExamEnabled = noStudentDayShiftExamEnabled;
    }
    
    // ==================== 工具方法 ====================
    
    /**
     * 获取所有硬约束的状态
     * @return 硬约束状态映射
     */
    public java.util.Map<String, Boolean> getHardConstraints() {
        java.util.Map<String, Boolean> hardConstraints = new java.util.HashMap<>();
        hardConstraints.put("workdaysOnlyExam", workdaysOnlyExam);
        hardConstraints.put("examinerDepartmentRules", examinerDepartmentRules);
        hardConstraints.put("twoMainExaminersRequired", twoMainExaminersRequired);
        hardConstraints.put("noDayShiftExaminer", noDayShiftExaminer);
        hardConstraints.put("consecutiveTwoDaysExam", consecutiveTwoDaysExamEnabled);
        return hardConstraints;
    }
    
    /**
     * 获取所有软约束的权重
     * @return 软约束权重映射
     */
    public java.util.Map<String, HardSoftScore> getSoftConstraintWeights() {
        java.util.Map<String, HardSoftScore> softWeights = new java.util.HashMap<>();
        softWeights.put("allowDept37CrossUse", allowDept37CrossUseWeight);
        softWeights.put("preferNoGroupTeachers", preferNoGroupTeachersWeight);
        // 新增优先级约束权重
        softWeights.put("nightShiftTeacherPriority", nightShiftTeacherPriorityWeight);
        softWeights.put("firstRestDayTeacherPriority", firstRestDayTeacherPriorityWeight);
        softWeights.put("secondRestDayTeacherPriority", secondRestDayTeacherPriorityWeight);
        // 新增软约束权重
        softWeights.put("backupExaminerDiffDept", backupExaminerDiffDeptWeight);
        softWeights.put("avoidStudentDayShift", avoidStudentDayShiftWeight);
        softWeights.put("preferRecommendedDepts", preferRecommendedDeptsWeight);
        softWeights.put("ensureConsecutiveDays", ensureConsecutiveDaysWeight);
        softWeights.put("balanceWorkload", balanceWorkloadWeight);
        softWeights.put("preferLaterDates", preferLaterDatesWeight);
        softWeights.put("nightShiftTeacherRecommendedDepartmentBonus", nightShiftTeacherRecommendedDepartmentBonusWeight);
        return softWeights;
    }
    
    /**
     * 批量更新软约束权重
     * @param weights 权重映射
     */
    public void updateSoftConstraintWeights(java.util.Map<String, Integer> weights) {
        if (weights.containsKey("allowDept37CrossUse")) {
            this.allowDept37CrossUseWeight = HardSoftScore.ofSoft(weights.get("allowDept37CrossUse"));
        }
        if (weights.containsKey("preferNoGroupTeachers")) {
            this.preferNoGroupTeachersWeight = HardSoftScore.ofSoft(weights.get("preferNoGroupTeachers"));
        }
        // 新增优先级约束权重更新
        if (weights.containsKey("nightShiftTeacherPriority")) {
            this.nightShiftTeacherPriorityWeight = HardSoftScore.ofSoft(weights.get("nightShiftTeacherPriority"));
        }
        if (weights.containsKey("firstRestDayTeacherPriority")) {
            this.firstRestDayTeacherPriorityWeight = HardSoftScore.ofSoft(weights.get("firstRestDayTeacherPriority"));
        }
        if (weights.containsKey("secondRestDayTeacherPriority")) {
            this.secondRestDayTeacherPriorityWeight = HardSoftScore.ofSoft(weights.get("secondRestDayTeacherPriority"));
        }
        // 新增软约束权重更新
        if (weights.containsKey("backupExaminerDiffDept")) {
            this.backupExaminerDiffDeptWeight = HardSoftScore.ofSoft(weights.get("backupExaminerDiffDept"));
        }
        if (weights.containsKey("avoidStudentDayShift")) {
            this.avoidStudentDayShiftWeight = HardSoftScore.ofSoft(weights.get("avoidStudentDayShift"));
        }
        if (weights.containsKey("preferRecommendedDepts")) {
            this.preferRecommendedDeptsWeight = HardSoftScore.ofSoft(weights.get("preferRecommendedDepts"));
        }
        if (weights.containsKey("ensureConsecutiveDays")) {
            this.ensureConsecutiveDaysWeight = HardSoftScore.ofSoft(weights.get("ensureConsecutiveDays"));
        }
        if (weights.containsKey("balanceWorkload")) {
            this.balanceWorkloadWeight = HardSoftScore.ofSoft(weights.get("balanceWorkload"));
        }
        if (weights.containsKey("preferLaterDates")) {
            this.preferLaterDatesWeight = HardSoftScore.ofSoft(weights.get("preferLaterDates"));
        }
        if (weights.containsKey("nightShiftTeacherRecommendedDepartmentBonus")) {
            this.nightShiftTeacherRecommendedDepartmentBonusWeight = HardSoftScore.ofSoft(weights.get("nightShiftTeacherRecommendedDepartmentBonus"));
        }
    }
    
    /**
     * 批量更新约束权重
     * @param weights 权重映射
     */
    public void updateWeights(java.util.Map<String, Integer> weights) {
        if (weights.containsKey("allowDept37CrossUse")) {
            this.allowDept37CrossUseWeight = HardSoftScore.ofSoft(weights.get("allowDept37CrossUse"));
        }
        if (weights.containsKey("preferNoGroupTeachers")) {
            this.preferNoGroupTeachersWeight = HardSoftScore.ofSoft(weights.get("preferNoGroupTeachers"));
        }
        if (weights.containsKey("nightShiftTeacherPriority")) {
            this.nightShiftTeacherPriorityWeight = HardSoftScore.ofSoft(weights.get("nightShiftTeacherPriority"));
        }
        if (weights.containsKey("firstRestDayTeacherPriority")) {
            this.firstRestDayTeacherPriorityWeight = HardSoftScore.ofSoft(weights.get("firstRestDayTeacherPriority"));
        }
        if (weights.containsKey("secondRestDayTeacherPriority")) {
            this.secondRestDayTeacherPriorityWeight = HardSoftScore.ofSoft(weights.get("secondRestDayTeacherPriority"));
        }
        if (weights.containsKey("backupExaminerDiffDept")) {
            this.backupExaminerDiffDeptWeight = HardSoftScore.ofSoft(weights.get("backupExaminerDiffDept"));
        }
        if (weights.containsKey("avoidStudentDayShift")) {
            this.avoidStudentDayShiftWeight = HardSoftScore.ofSoft(weights.get("avoidStudentDayShift"));
        }
        if (weights.containsKey("preferRecommendedDepts")) {
            this.preferRecommendedDeptsWeight = HardSoftScore.ofSoft(weights.get("preferRecommendedDepts"));
        }
        if (weights.containsKey("ensureConsecutiveDays")) {
            this.ensureConsecutiveDaysWeight = HardSoftScore.ofSoft(weights.get("ensureConsecutiveDays"));
        }
        if (weights.containsKey("balanceWorkload")) {
            this.balanceWorkloadWeight = HardSoftScore.ofSoft(weights.get("balanceWorkload"));
        }
        if (weights.containsKey("preferLaterDates")) {
            this.preferLaterDatesWeight = HardSoftScore.ofSoft(weights.get("preferLaterDates"));
        }
        if (weights.containsKey("nightShiftTeacherRecommendedDepartmentBonus")) {
            this.nightShiftTeacherRecommendedDepartmentBonusWeight = HardSoftScore.ofSoft(weights.get("nightShiftTeacherRecommendedDepartmentBonus"));
        }
        if (weights.containsKey("adminTeacherPriority")) {
            this.adminTeacherPriorityWeight = HardSoftScore.ofSoft(weights.get("adminTeacherPriority"));
        }
        if (weights.containsKey("consecutiveTwoDaysExam")) {
            this.consecutiveTwoDaysExamWeight = HardSoftScore.ofSoft(weights.get("consecutiveTwoDaysExam"));
        }
        if (weights.containsKey("mustHaveTwoDifferentDepartmentExaminers")) {
            this.mustHaveTwoDifferentDepartmentExaminersWeight = HardSoftScore.ofSoft(weights.get("mustHaveTwoDifferentDepartmentExaminers"));
        }
        if (weights.containsKey("backupExaminerMustBeDifferentPerson")) {
            this.backupExaminerMustBeDifferentPersonWeight = HardSoftScore.ofSoft(weights.get("backupExaminerMustBeDifferentPerson"));
        }
        if (weights.containsKey("noStudentDayShiftExam")) {
            this.noStudentDayShiftExamWeight = HardSoftScore.ofSoft(weights.get("noStudentDayShiftExam"));
        }
    }
    
    /**
     * 验证约束配置的有效性
     * @return 验证结果
     */
    public ConstraintValidationResult validate() {
        java.util.List<String> errors = new java.util.ArrayList<>();
        java.util.List<String> warnings = new java.util.ArrayList<>();
        
        // 检查软约束权重范围
        java.util.Map<String, HardSoftScore> weights = getSoftConstraintWeights();
        for (java.util.Map.Entry<String, HardSoftScore> entry : weights.entrySet()) {
            int weight = entry.getValue().softScore();
            if (weight < 0) {
                errors.add("软约束 " + entry.getKey() + " 的权重不能为负数: " + weight);
            } else if (weight > 150) {
                warnings.add("软约束 " + entry.getKey() + " 的权重过高，可能影响求解性能: " + weight);
            }
        }
        
        // 检查高权重约束数量
        long highWeightCount = weights.values().stream()
            .mapToInt(score -> score.softScore())
            .filter(weight -> weight > 80)
            .count();
        
        if (highWeightCount > 3) {
            warnings.add("高权重软约束过多(" + highWeightCount + "个)，可能导致求解困难");
        }
        
        return new ConstraintValidationResult(errors.isEmpty(), errors, warnings);
    }
    
    /**
     * 获取配置摘要信息
     * @return 配置摘要
     */
    public ConfigurationSummary getSummary() {
        java.util.Map<String, HardSoftScore> weights = getSoftConstraintWeights();
        
        int totalSoftConstraints = weights.size();
        int enabledSoftConstraints = (int) weights.values().stream()
            .mapToInt(score -> score.softScore())
            .filter(weight -> weight > 0)
            .count();
        
        int totalWeight = weights.values().stream()
            .mapToInt(score -> score.softScore())
            .sum();
        
        double avgWeight = enabledSoftConstraints > 0 ? (double) totalWeight / enabledSoftConstraints : 0;
        
        return new ConfigurationSummary(
            5, // 硬约束数量固定为5
            totalSoftConstraints,
            enabledSoftConstraints,
            totalWeight,
            avgWeight
        );
    }
    
    @Override
    public String toString() {
        return "OptimizedConstraintConfiguration{" +
                "hardConstraints=" + getHardConstraints().size() +
                ", softConstraints=" + getSoftConstraintWeights().size() +
                ", totalWeight=" + getSoftConstraintWeights().values().stream()
                    .mapToInt(score -> score.softScore()).sum() +
                '}';
    }
    
    /**
     * 检查约束是否启用
     */
    public boolean isConstraintEnabled(String constraintId) {
        switch (constraintId) {
            case "HC1": return isWorkdaysOnlyExam();
            case "HC2": return isExaminerDepartmentRules();
            case "HC3": return isTwoMainExaminersRequired();
            case "HC4": return isNoDayShiftExaminer();
            case "HC5": return isNoStudentDayShiftExamEnabled();
            case "HC6": return isConsecutiveTwoDaysExamEnabled();
            case "HC7": return isMustHaveTwoDifferentDepartmentExaminersEnabled();
            case "HC8": return isBackupExaminerMustBeDifferentPersonEnabled();
            
            case "SC1": return isNightShiftTeacherPriorityEnabled();
            case "SC2": return isFirstRestDayTeacherPriorityEnabled();
            case "SC3": return isSecondRestDayTeacherPriorityEnabled();
            case "SC4": return isAdminTeacherPriorityEnabled();
            case "SC5": return isPreferRecommendedDeptsEnabled();
            case "SC6": return true; // 非推荐科室池的考官2
            case "SC7": return true; // 推荐科室池内的备份考官
            case "SC8": return true; // 非推荐科室池的备份考官
            case "SC9": return isAllowDept37CrossUseEnabled();
            case "SC10": return isBalanceWorkloadEnabled();
            case "SC11": return isPreferLaterDatesEnabled();
            case "SC16": return isAvoidWeekendSchedulingEnabled();
            case "SC17": return isPreferNightShiftOnWeekendEnabled();
            
            default: return true;
        }
    }
    
    /**
     * 获取约束权重
     */
    public HardSoftScore getConstraintWeight(String constraintId) {
        switch (constraintId) {
            case "HC5": return getNoStudentDayShiftExamWeight();
            case "HC6": return getConsecutiveTwoDaysExamWeight();
            case "HC7": return getMustHaveTwoDifferentDepartmentExaminersWeight();
            case "HC8": return getBackupExaminerMustBeDifferentPersonWeight();
            
            case "SC1": return getNightShiftTeacherPriorityWeight();
            case "SC2": return getFirstRestDayTeacherPriorityWeight();
            case "SC3": return getSecondRestDayTeacherPriorityWeight();
            case "SC4": return getAdminTeacherPriorityWeight();
            case "SC5": return getPreferRecommendedDeptsWeight();
            case "SC6": return HardSoftScore.ofSoft(50); // 非推荐科室池的考官2
            case "SC7": return HardSoftScore.ofSoft(70); // 推荐科室池内的备份考官
            case "SC8": return HardSoftScore.ofSoft(30); // 非推荐科室池的备份考官
            case "SC9": return getAllowDept37CrossUseWeight();
            case "SC10": return getBalanceWorkloadWeight();
            case "SC11": return getPreferLaterDatesWeight();
            case "SC16": return getAvoidWeekendSchedulingWeight();
            case "SC17": return getPreferNightShiftOnWeekendWeight();
            
            default: return HardSoftScore.ofSoft(1);
        }
    }
    
    /**
     * 设置硬约束权重映射（测试用）
     */
    public void setHardConstraints(java.util.Map<String, Integer> hardConstraints) {
        // 这是一个测试辅助方法，实际约束权重通过具体的setter方法设置
        for (java.util.Map.Entry<String, Integer> entry : hardConstraints.entrySet()) {
            String constraintId = entry.getKey();
            Integer weight = entry.getValue();
            // 根据约束ID设置对应的硬约束权重
            switch (constraintId) {
                case "HC5":
                    this.noStudentDayShiftExamWeight = HardSoftScore.ofHard(weight);
                    break;
                case "HC6":
                    this.consecutiveTwoDaysExamWeight = HardSoftScore.ofHard(weight);
                    break;
                case "HC7":
                    this.mustHaveTwoDifferentDepartmentExaminersWeight = HardSoftScore.ofHard(weight);
                    break;
                case "HC8":
                    this.backupExaminerMustBeDifferentPersonWeight = HardSoftScore.ofHard(weight);
                    break;
                // 其他硬约束可以根据需要添加
            }
        }
    }
    
    /**
     * 设置软约束权重映射（测试用）
     */
    public void setSoftConstraints(java.util.Map<String, Integer> softConstraints) {
        // 这是一个测试辅助方法，实际约束权重通过具体的setter方法设置
        for (java.util.Map.Entry<String, Integer> entry : softConstraints.entrySet()) {
            String constraintId = entry.getKey();
            Integer weight = entry.getValue();
            // 根据约束ID设置对应的软约束权重
            switch (constraintId) {
                case "SC1":
                    this.nightShiftTeacherPriorityWeight = HardSoftScore.ofSoft(weight);
                    break;
                case "SC2":
                    this.firstRestDayTeacherPriorityWeight = HardSoftScore.ofSoft(weight);
                    break;
                case "SC3":
                    this.secondRestDayTeacherPriorityWeight = HardSoftScore.ofSoft(weight);
                    break;
                case "SC4":
                    this.adminTeacherPriorityWeight = HardSoftScore.ofSoft(weight);
                    break;
                case "SC5":
                    this.preferRecommendedDeptsWeight = HardSoftScore.ofSoft(weight);
                    break;
                case "SC9":
                    this.allowDept37CrossUseWeight = HardSoftScore.ofSoft(weight);
                    break;
                case "SC10":
                    this.balanceWorkloadWeight = HardSoftScore.ofSoft(weight);
                    break;
                case "SC11":
                    this.preferLaterDatesWeight = HardSoftScore.ofSoft(weight);
                    break;
                // 其他软约束可以根据需要添加
            }
        }
    }
    
    // ==================== 内部类 ====================
    
    /**
     * 约束验证结果
     */
    public static class ConstraintValidationResult {
        private final boolean valid;
        private final java.util.List<String> errors;
        private final java.util.List<String> warnings;
        
        public ConstraintValidationResult(boolean valid, java.util.List<String> errors, java.util.List<String> warnings) {
            this.valid = valid;
            this.errors = errors;
            this.warnings = warnings;
        }
        
        public boolean isValid() { return valid; }
        public java.util.List<String> getErrors() { return errors; }
        public java.util.List<String> getWarnings() { return warnings; }
    }
    
    /**
     * 配置摘要信息
     */
    public static class ConfigurationSummary {
        private final int hardConstraintCount;
        private final int totalSoftConstraintCount;
        private final int enabledSoftConstraintCount;
        private final int totalWeight;
        private final double averageWeight;
        
        public ConfigurationSummary(int hardConstraintCount, int totalSoftConstraintCount, 
                                  int enabledSoftConstraintCount, int totalWeight, double averageWeight) {
            this.hardConstraintCount = hardConstraintCount;
            this.totalSoftConstraintCount = totalSoftConstraintCount;
            this.enabledSoftConstraintCount = enabledSoftConstraintCount;
            this.totalWeight = totalWeight;
            this.averageWeight = averageWeight;
        }
        
        public int getHardConstraintCount() { return hardConstraintCount; }
        public int getTotalSoftConstraintCount() { return totalSoftConstraintCount; }
        public int getEnabledSoftConstraintCount() { return enabledSoftConstraintCount; }
        public int getTotalWeight() { return totalWeight; }
        public double getAverageWeight() { return averageWeight; }
    }
}
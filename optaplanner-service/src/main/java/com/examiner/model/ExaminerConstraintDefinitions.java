package com.examiner.model;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

/**
 * 考官排班系统专用约束定义
 * 基于 constraint-configuration-guide.md 文档中的具体约束条件
 * 与前端 examiner-constraints.ts 保持一致
 */
@RegisterForReflection
public class ExaminerConstraintDefinitions {

    // 硬约束标识符枚举
    public enum HardConstraintId {
        HC1_WEEKDAY_EXAMS_ONLY("HC1_WEEKDAY_EXAMS_ONLY"),
        HC2_EXAMINER_DEPARTMENT_RULE("HC2_EXAMINER_DEPARTMENT_RULE"),
        HC3_TWO_MAIN_EXAMINERS_REQUIRED("HC3_TWO_MAIN_EXAMINERS_REQUIRED"),
        HC4_NO_DAY_SHIFT_EXAMINER("HC4_NO_DAY_SHIFT_EXAMINER"),
        HC5_TWO_WORKDAYS_COMPLETION("HC5_TWO_WORKDAYS_COMPLETION"),
        HC6_CONSECUTIVE_TWO_DAYS_EXAM("HC6_CONSECUTIVE_TWO_DAYS_EXAM"),
        HC7_ROOM_CAPACITY("HC7_ROOM_CAPACITY"),
        HC8_EQUIPMENT_REQUIREMENTS("HC8_EQUIPMENT_REQUIREMENTS");

        private final String value;

        HardConstraintId(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }

    // 软约束标识符枚举
    public enum SoftConstraintId {
        SC1_BACKUP_EXAMINER_DIFFERENT_DEPT("SC1_BACKUP_EXAMINER_DIFFERENT_DEPT"),
        SC2_AVOID_STUDENT_DAY_SHIFT("SC2_AVOID_STUDENT_DAY_SHIFT"),
        SC3_EXAMINER2_RECOMMENDED_DEPT("SC3_EXAMINER2_RECOMMENDED_DEPT"),
        SC4_WORKLOAD_BALANCE("SC4_WORKLOAD_BALANCE"),
        SC5_MINIMIZE_EXAMINER_TRAVEL("SC5_MINIMIZE_EXAMINER_TRAVEL"),
        SC6_PREFERRED_TIME_SLOTS("SC6_PREFERRED_TIME_SLOTS");

        private final String value;

        SoftConstraintId(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }

    // 硬约束具体定义
    public static final Map<HardConstraintId, UnifiedConstraintConfiguration.HardConstraint> HARD_CONSTRAINTS = 
        new HashMap<HardConstraintId, UnifiedConstraintConfiguration.HardConstraint>() {{
            
        put(HardConstraintId.HC1_WEEKDAY_EXAMS_ONLY, new UnifiedConstraintConfiguration.HardConstraint(
            HardConstraintId.HC1_WEEKDAY_EXAMS_ONLY.getValue(),
            "工作日考试",
            "所有考试必须安排在工作日（周一至周五）进行，不得安排在周末或法定节假日",
            UnifiedConstraintConfiguration.ConstraintCategory.TIME,
            UnifiedConstraintConfiguration.ConstraintPriority.CRITICAL,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            1000000, 1000000, 1000000, 1000000, false, "1.0.0",
            Arrays.asList("时间", "工作日", "强制"),
            1000000, true
        ));

        put(HardConstraintId.HC2_EXAMINER_DEPARTMENT_RULE, new UnifiedConstraintConfiguration.HardConstraint(
            HardConstraintId.HC2_EXAMINER_DEPARTMENT_RULE.getValue(),
            "考官科室规则",
            "考官1必须来自考生所在科室，考官2必须来自不同科室",
            UnifiedConstraintConfiguration.ConstraintCategory.RESOURCE,
            UnifiedConstraintConfiguration.ConstraintPriority.CRITICAL,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            1000000, 1000000, 1000000, 1000000, false, "1.0.0",
            Arrays.asList("科室", "考官分配", "强制"),
            1000000, true
        ));

        put(HardConstraintId.HC3_TWO_MAIN_EXAMINERS_REQUIRED, new UnifiedConstraintConfiguration.HardConstraint(
            HardConstraintId.HC3_TWO_MAIN_EXAMINERS_REQUIRED.getValue(),
            "每场考试必须配备考官1和考官2各一名",
            "每场考试必须同时配备考官1和考官2各一名，不得缺少任何一方",
            UnifiedConstraintConfiguration.ConstraintCategory.RESOURCE,
            UnifiedConstraintConfiguration.ConstraintPriority.CRITICAL,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            1000000, 1000000, 1000000, 1000000, false, "1.0.0",
            Arrays.asList("考官配备", "人员要求", "强制"),
            1000000, true
        ));

        put(HardConstraintId.HC4_NO_DAY_SHIFT_EXAMINER, new UnifiedConstraintConfiguration.HardConstraint(
            HardConstraintId.HC4_NO_DAY_SHIFT_EXAMINER.getValue(),
            "考官执勤白班不能安排考试",
            "执勤白班的考官不能在当天安排考试任务（行政班考官除外）",
            UnifiedConstraintConfiguration.ConstraintCategory.RESOURCE,
            UnifiedConstraintConfiguration.ConstraintPriority.CRITICAL,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            1000000, 1000000, 1000000, 1000000, false, "1.0.0",
            Arrays.asList("值班制度", "白班限制", "强制"),
            1000000, true
        ));

        put(HardConstraintId.HC5_TWO_WORKDAYS_COMPLETION, new UnifiedConstraintConfiguration.HardConstraint(
            HardConstraintId.HC5_TWO_WORKDAYS_COMPLETION.getValue(),
            "每位考生必须在连续两个工作日内完成所有考试",
            "每位考生的所有考试科目必须在连续的两个工作日内完成",
            UnifiedConstraintConfiguration.ConstraintCategory.TIME,
            UnifiedConstraintConfiguration.ConstraintPriority.HIGH,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            400000, 200000, 600000, 400000, true, "1.0.0",
            Arrays.asList("考试周期", "连续性", "学生要求"),
            400000, true
        ));

        put(HardConstraintId.HC6_CONSECUTIVE_TWO_DAYS_EXAM, new UnifiedConstraintConfiguration.HardConstraint(
            HardConstraintId.HC6_CONSECUTIVE_TWO_DAYS_EXAM.getValue(),
            "考生需要在连续两天完成考试",
            "考生的考试必须安排在连续的两天内完成",
            UnifiedConstraintConfiguration.ConstraintCategory.TIME,
            UnifiedConstraintConfiguration.ConstraintPriority.HIGH,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            50000, 2000, 6000, 50000, true, "1.0.0",
            Arrays.asList("连续性", "考试周期", "考生要求"),
            4000, true
        ));

        put(HardConstraintId.HC7_ROOM_CAPACITY, new UnifiedConstraintConfiguration.HardConstraint(
            HardConstraintId.HC7_ROOM_CAPACITY.getValue(),
            "必须有考官1和考官2两名考官，且不能同科室",
            "每场考试必须配备两名不同科室的考官",
            UnifiedConstraintConfiguration.ConstraintCategory.RESOURCE,
            UnifiedConstraintConfiguration.ConstraintPriority.CRITICAL,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            10000, 8000, 12000, 10000, false, "1.0.0",
            Arrays.asList("考官配备", "科室要求", "公正性"),
            10000, true
        ));

        put(HardConstraintId.HC8_EQUIPMENT_REQUIREMENTS, new UnifiedConstraintConfiguration.HardConstraint(
            HardConstraintId.HC8_EQUIPMENT_REQUIREMENTS.getValue(),
            "备份考官不能与考官1和考官2是同一人",
            "备份考官必须是独立的第三人",
            UnifiedConstraintConfiguration.ConstraintCategory.RESOURCE,
            UnifiedConstraintConfiguration.ConstraintPriority.MEDIUM,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            3000, 2000, 4000, 3000, true, "1.0.0",
            Arrays.asList("备份考官", "人员独立性", "角色分离"),
            3000, true
        ));
    }};

    // 软约束具体定义
    public static final Map<SoftConstraintId, UnifiedConstraintConfiguration.SoftConstraint> SOFT_CONSTRAINTS = 
        new HashMap<SoftConstraintId, UnifiedConstraintConfiguration.SoftConstraint>() {{
            
        put(SoftConstraintId.SC1_BACKUP_EXAMINER_DIFFERENT_DEPT, new UnifiedConstraintConfiguration.SoftConstraint(
            SoftConstraintId.SC1_BACKUP_EXAMINER_DIFFERENT_DEPT.getValue(),
            "配备非主考官科室的备份考官",
            "优先为每场考试配备来自非主考官科室的备份考官，提高考试的公正性",
            UnifiedConstraintConfiguration.ConstraintCategory.QUALITY,
            UnifiedConstraintConfiguration.ConstraintPriority.HIGH,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            90, 30, 90, 90, true, "1.0.0",
            Arrays.asList("备份考官", "科室多样性", "公正性"),
            90, "linear"
        ));

        put(SoftConstraintId.SC2_AVOID_STUDENT_DAY_SHIFT, new UnifiedConstraintConfiguration.SoftConstraint(
            SoftConstraintId.SC2_AVOID_STUDENT_DAY_SHIFT.getValue(),
            "避免考生白班时段安排考试",
            "尽量避免在考生白班工作时段安排考试，减少对其正常工作的影响",
            UnifiedConstraintConfiguration.ConstraintCategory.PREFERENCE,
            UnifiedConstraintConfiguration.ConstraintPriority.HIGH,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            80, 30, 90, 80, true, "1.0.0",
            Arrays.asList("学生偏好", "时间安排", "工作影响"),
            80, "exponential"
        ));

        put(SoftConstraintId.SC3_EXAMINER2_RECOMMENDED_DEPT, new UnifiedConstraintConfiguration.SoftConstraint(
            SoftConstraintId.SC3_EXAMINER2_RECOMMENDED_DEPT.getValue(),
            "考官2和备份考官优先来自推荐科室",
            "考官2和备份考官优先从推荐科室中选择，提高专业匹配度",
            UnifiedConstraintConfiguration.ConstraintCategory.QUALITY,
            UnifiedConstraintConfiguration.ConstraintPriority.MEDIUM,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            70, 30, 90, 70, true, "1.0.0",
            Arrays.asList("推荐科室", "专业匹配", "质量优化"),
            70, "linear"
        ));

        put(SoftConstraintId.SC4_WORKLOAD_BALANCE, new UnifiedConstraintConfiguration.SoftConstraint(
            SoftConstraintId.SC4_WORKLOAD_BALANCE.getValue(),
            "工作负载均衡",
            "尽量平衡各考官的工作负载，避免个别考官过度繁忙或空闲",
            UnifiedConstraintConfiguration.ConstraintCategory.WORKLOAD,
            UnifiedConstraintConfiguration.ConstraintPriority.MEDIUM,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            60, 30, 90, 60, true, "1.0.0",
            Arrays.asList("负载均衡", "公平分配", "效率优化"),
            60, "logarithmic"
        ));

        put(SoftConstraintId.SC5_MINIMIZE_EXAMINER_TRAVEL, new UnifiedConstraintConfiguration.SoftConstraint(
            SoftConstraintId.SC5_MINIMIZE_EXAMINER_TRAVEL.getValue(),
            "最小化考官移动距离",
            "尽量减少考官在不同考场间的移动距离和时间",
            UnifiedConstraintConfiguration.ConstraintCategory.PREFERENCE,
            UnifiedConstraintConfiguration.ConstraintPriority.LOW,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            50, 30, 90, 50, true, "1.0.0",
            Arrays.asList("移动优化", "效率", "便利性"),
            50, "linear"
        ));

        put(SoftConstraintId.SC6_PREFERRED_TIME_SLOTS, new UnifiedConstraintConfiguration.SoftConstraint(
            SoftConstraintId.SC6_PREFERRED_TIME_SLOTS.getValue(),
            "偏好时间段",
            "尽量在考官和考生的偏好时间段安排考试",
            UnifiedConstraintConfiguration.ConstraintCategory.PREFERENCE,
            UnifiedConstraintConfiguration.ConstraintPriority.LOW,
            UnifiedConstraintConfiguration.ConstraintStatus.ENABLED,
            40, 30, 90, 40, true, "1.0.0",
            Arrays.asList("时间偏好", "满意度", "个性化"),
            40, "linear"
        ));
    }};

    // 约束权重映射配置
    public static final Map<String, UnifiedConstraintConfiguration.ConstraintWeightMapping> CONSTRAINT_WEIGHT_MAPPING = 
        new HashMap<String, UnifiedConstraintConfiguration.ConstraintWeightMapping>() {{
            
        put("hardConstraints", new UnifiedConstraintConfiguration.ConstraintWeightMapping(
            new UnifiedConstraintConfiguration.ConstraintWeightMapping.WeightRange(30, 90),
            new UnifiedConstraintConfiguration.ConstraintWeightMapping.WeightRange(150000, 1000000),
            "exponential",
            2.5
        ));

        put("softConstraints", new UnifiedConstraintConfiguration.ConstraintWeightMapping(
            new UnifiedConstraintConfiguration.ConstraintWeightMapping.WeightRange(30, 90),
            new UnifiedConstraintConfiguration.ConstraintWeightMapping.WeightRange(150, 700),
            "linear",
            1.0
        ));
    }};

    // 约束预设配置
    @RegisterForReflection
    public static class ConstraintPreset {
        private String id;
        private String name;
        private String description;
        private Map<String, UnifiedConstraintConfiguration.HardConstraint> hardConstraints;
        private Map<String, UnifiedConstraintConfiguration.SoftConstraint> softConstraints;
        private Map<String, Object> globalSettings;

        public ConstraintPreset() {}

        public ConstraintPreset(String id, String name, String description,
                              Map<String, UnifiedConstraintConfiguration.HardConstraint> hardConstraints,
                              Map<String, UnifiedConstraintConfiguration.SoftConstraint> softConstraints) {
            this.id = id;
            this.name = name;
            this.description = description;
            this.hardConstraints = hardConstraints;
            this.softConstraints = softConstraints;
        }

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public Map<String, UnifiedConstraintConfiguration.HardConstraint> getHardConstraints() { return hardConstraints; }
        public void setHardConstraints(Map<String, UnifiedConstraintConfiguration.HardConstraint> hardConstraints) { this.hardConstraints = hardConstraints; }

        public Map<String, UnifiedConstraintConfiguration.SoftConstraint> getSoftConstraints() { return softConstraints; }
        public void setSoftConstraints(Map<String, UnifiedConstraintConfiguration.SoftConstraint> softConstraints) { this.softConstraints = softConstraints; }

        public Map<String, Object> getGlobalSettings() { return globalSettings; }
        public void setGlobalSettings(Map<String, Object> globalSettings) { this.globalSettings = globalSettings; }
        
        // 为了兼容性，添加权重映射方法
        public Map<String, Integer> getHardConstraintWeights() {
            Map<String, Integer> weights = new HashMap<>();
            if (hardConstraints != null) {
                hardConstraints.forEach((key, constraint) -> weights.put(key, constraint.getWeight()));
            }
            return weights;
        }
        
        public Map<String, Integer> getSoftConstraintWeights() {
            Map<String, Integer> weights = new HashMap<>();
            if (softConstraints != null) {
                softConstraints.forEach((key, constraint) -> weights.put(key, constraint.getWeight()));
            }
            return weights;
        }
    }

    // 预设配置实例
    public static final Map<String, ConstraintPreset> CONSTRAINT_PRESETS = new HashMap<String, ConstraintPreset>() {{
        
        // 严格模式
        Map<String, UnifiedConstraintConfiguration.HardConstraint> strictHardConstraints = new HashMap<>();
        HARD_CONSTRAINTS.forEach((key, constraint) -> {
            UnifiedConstraintConfiguration.HardConstraint copy = new UnifiedConstraintConfiguration.HardConstraint();
            copy.setId(constraint.getId());
            copy.setName(constraint.getName());
            copy.setDescription(constraint.getDescription());
            copy.setCategory(constraint.getCategory());
            copy.setPriority(constraint.getPriority());
            copy.setStatus(constraint.getStatus());
            copy.setWeight(constraint.getMaxWeight());
            copy.setMinWeight(constraint.getMinWeight());
            copy.setMaxWeight(constraint.getMaxWeight());
            copy.setDefaultWeight(constraint.getDefaultWeight());
            copy.setAdjustable(constraint.isAdjustable());
            copy.setVersion(constraint.getVersion());
            copy.setTags(constraint.getTags());
            copy.setViolationPenalty(constraint.getViolationPenalty());
            copy.setMandatory(constraint.isMandatory());
            strictHardConstraints.put(key.getValue(), copy);
        });

        Map<String, UnifiedConstraintConfiguration.SoftConstraint> strictSoftConstraints = new HashMap<>();
        SOFT_CONSTRAINTS.forEach((key, constraint) -> {
            UnifiedConstraintConfiguration.SoftConstraint copy = new UnifiedConstraintConfiguration.SoftConstraint();
            copy.setId(constraint.getId());
            copy.setName(constraint.getName());
            copy.setDescription(constraint.getDescription());
            copy.setCategory(constraint.getCategory());
            copy.setPriority(constraint.getPriority());
            copy.setStatus(constraint.getStatus());
            copy.setWeight(constraint.getMaxWeight());
            copy.setMinWeight(constraint.getMinWeight());
            copy.setMaxWeight(constraint.getMaxWeight());
            copy.setDefaultWeight(constraint.getDefaultWeight());
            copy.setAdjustable(constraint.isAdjustable());
            copy.setVersion(constraint.getVersion());
            copy.setTags(constraint.getTags());
            copy.setSatisfactionReward(constraint.getSatisfactionReward());
            copy.setDegradationCurve(constraint.getDegradationCurve());
            strictSoftConstraints.put(key.getValue(), copy);
        });

        put("STRICT_MODE", new ConstraintPreset(
            "STRICT_MODE",
            "严格模式",
            "所有约束都设置为最高权重，确保最严格的调度规则",
            strictHardConstraints,
            strictSoftConstraints
        ));

        // 平衡模式
        Map<String, UnifiedConstraintConfiguration.HardConstraint> balancedHardConstraints = new HashMap<>();
        HARD_CONSTRAINTS.forEach((key, constraint) -> {
            UnifiedConstraintConfiguration.HardConstraint copy = new UnifiedConstraintConfiguration.HardConstraint();
            copy.setId(constraint.getId());
            copy.setName(constraint.getName());
            copy.setDescription(constraint.getDescription());
            copy.setCategory(constraint.getCategory());
            copy.setPriority(constraint.getPriority());
            copy.setStatus(constraint.getStatus());
            copy.setWeight(constraint.getDefaultWeight());
            copy.setMinWeight(constraint.getMinWeight());
            copy.setMaxWeight(constraint.getMaxWeight());
            copy.setDefaultWeight(constraint.getDefaultWeight());
            copy.setAdjustable(constraint.isAdjustable());
            copy.setVersion(constraint.getVersion());
            copy.setTags(constraint.getTags());
            copy.setViolationPenalty(constraint.getViolationPenalty());
            copy.setMandatory(constraint.isMandatory());
            balancedHardConstraints.put(key.getValue(), copy);
        });

        Map<String, UnifiedConstraintConfiguration.SoftConstraint> balancedSoftConstraints = new HashMap<>();
        SOFT_CONSTRAINTS.forEach((key, constraint) -> {
            UnifiedConstraintConfiguration.SoftConstraint copy = new UnifiedConstraintConfiguration.SoftConstraint();
            copy.setId(constraint.getId());
            copy.setName(constraint.getName());
            copy.setDescription(constraint.getDescription());
            copy.setCategory(constraint.getCategory());
            copy.setPriority(constraint.getPriority());
            copy.setStatus(constraint.getStatus());
            copy.setWeight(constraint.getDefaultWeight());
            copy.setMinWeight(constraint.getMinWeight());
            copy.setMaxWeight(constraint.getMaxWeight());
            copy.setDefaultWeight(constraint.getDefaultWeight());
            copy.setAdjustable(constraint.isAdjustable());
            copy.setVersion(constraint.getVersion());
            copy.setTags(constraint.getTags());
            copy.setSatisfactionReward(constraint.getSatisfactionReward());
            copy.setDegradationCurve(constraint.getDegradationCurve());
            balancedSoftConstraints.put(key.getValue(), copy);
        });

        put("BALANCED_MODE", new ConstraintPreset(
            "BALANCED_MODE",
            "平衡模式",
            "在严格性和灵活性之间取得平衡的约束配置",
            balancedHardConstraints,
            balancedSoftConstraints
        ));

        // 宽松模式
        Map<String, UnifiedConstraintConfiguration.HardConstraint> flexibleHardConstraints = new HashMap<>();
        HARD_CONSTRAINTS.forEach((key, constraint) -> {
            UnifiedConstraintConfiguration.HardConstraint copy = new UnifiedConstraintConfiguration.HardConstraint();
            copy.setId(constraint.getId());
            copy.setName(constraint.getName());
            copy.setDescription(constraint.getDescription());
            copy.setCategory(constraint.getCategory());
            copy.setPriority(constraint.getPriority());
            copy.setStatus(constraint.getStatus());
            copy.setWeight(constraint.isAdjustable() ? constraint.getMinWeight() : constraint.getWeight());
            copy.setMinWeight(constraint.getMinWeight());
            copy.setMaxWeight(constraint.getMaxWeight());
            copy.setDefaultWeight(constraint.getDefaultWeight());
            copy.setAdjustable(constraint.isAdjustable());
            copy.setVersion(constraint.getVersion());
            copy.setTags(constraint.getTags());
            copy.setViolationPenalty(constraint.getViolationPenalty());
            copy.setMandatory(constraint.isMandatory());
            flexibleHardConstraints.put(key.getValue(), copy);
        });

        Map<String, UnifiedConstraintConfiguration.SoftConstraint> flexibleSoftConstraints = new HashMap<>();
        SOFT_CONSTRAINTS.forEach((key, constraint) -> {
            UnifiedConstraintConfiguration.SoftConstraint copy = new UnifiedConstraintConfiguration.SoftConstraint();
            copy.setId(constraint.getId());
            copy.setName(constraint.getName());
            copy.setDescription(constraint.getDescription());
            copy.setCategory(constraint.getCategory());
            copy.setPriority(constraint.getPriority());
            copy.setStatus(constraint.getStatus());
            copy.setWeight(constraint.getMinWeight());
            copy.setMinWeight(constraint.getMinWeight());
            copy.setMaxWeight(constraint.getMaxWeight());
            copy.setDefaultWeight(constraint.getDefaultWeight());
            copy.setAdjustable(constraint.isAdjustable());
            copy.setVersion(constraint.getVersion());
            copy.setTags(constraint.getTags());
            copy.setSatisfactionReward(constraint.getSatisfactionReward());
            copy.setDegradationCurve(constraint.getDegradationCurve());
            flexibleSoftConstraints.put(key.getValue(), copy);
        });

        put("FLEXIBLE_MODE", new ConstraintPreset(
            "FLEXIBLE_MODE",
            "宽松模式",
            "降低约束权重，提供更大的调度灵活性",
            flexibleHardConstraints,
            flexibleSoftConstraints
        ));
    }};

    // 工具方法
    public static UnifiedConstraintConfiguration createDefaultConfiguration() {
        UnifiedConstraintConfiguration config = new UnifiedConstraintConfiguration();
        
        // 设置硬约束
        Map<String, UnifiedConstraintConfiguration.HardConstraint> hardConstraints = new HashMap<>();
        HARD_CONSTRAINTS.forEach((key, constraint) -> hardConstraints.put(key.getValue(), constraint));
        config.setHardConstraints(hardConstraints);
        
        // 设置软约束
        Map<String, UnifiedConstraintConfiguration.SoftConstraint> softConstraints = new HashMap<>();
        SOFT_CONSTRAINTS.forEach((key, constraint) -> softConstraints.put(key.getValue(), constraint));
        config.setSoftConstraints(softConstraints);
        
        // 设置权重映射
        config.setWeightMapping(CONSTRAINT_WEIGHT_MAPPING);
        
        // 设置元数据
        UnifiedConstraintConfiguration.ConfigurationMetadata metadata = new UnifiedConstraintConfiguration.ConfigurationMetadata();
        metadata.setConfigVersion("1.0.0");
        metadata.setEnvironment("development");
        metadata.setCreatedBy("system");
        config.setMetadata(metadata);
        
        return config;
    }

    public static boolean validateWeightRange(String constraintId, int weight) {
        // 检查硬约束
        for (UnifiedConstraintConfiguration.HardConstraint constraint : HARD_CONSTRAINTS.values()) {
            if (constraint.getId().equals(constraintId)) {
                return weight >= constraint.getMinWeight() && weight <= constraint.getMaxWeight();
            }
        }
        
        // 检查软约束
        for (UnifiedConstraintConfiguration.SoftConstraint constraint : SOFT_CONSTRAINTS.values()) {
            if (constraint.getId().equals(constraintId)) {
                return weight >= constraint.getMinWeight() && weight <= constraint.getMaxWeight();
            }
        }
        
        return false;
    }
}
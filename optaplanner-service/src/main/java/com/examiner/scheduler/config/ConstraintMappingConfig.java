package com.examiner.scheduler.config;

import java.util.HashMap;
import java.util.Map;
import java.util.Collections;

/**
 * 前后端约束名称映射配置类
 * 建立前端界面约束标识与后端约束提供者约束名称的统一映射关系
 * 
 * @author OptaPlanner Team
 * @version 1.0
 */
public class ConstraintMappingConfig {
    
    // ==================== 硬约束映射 ====================
    
    /**
     * 硬约束前后端映射关系
     * Key: 前端约束标识, Value: 后端约束名称
     */
    private static final Map<String, String> HARD_CONSTRAINT_MAPPING = new HashMap<>();
    
    static {
        // 硬约束映射 - 按照文档HC1-HC8
        HARD_CONSTRAINT_MAPPING.put("HC1", "法定节假日不安排考试（周六周日可以考试，但行政班考官周末不参加考试）");
        HARD_CONSTRAINT_MAPPING.put("HC2", "考官1与学员同科室");
        HARD_CONSTRAINT_MAPPING.put("HC3", "考官执勤白班不能安排考试（行政班考官除外）");
        HARD_CONSTRAINT_MAPPING.put("HC4", "每名考官每天只能监考一名考生");
        HARD_CONSTRAINT_MAPPING.put("HC5", "考生执勤白班不能安排考试");
        HARD_CONSTRAINT_MAPPING.put("HC6", "考生需要在连续两天完成考试");
        HARD_CONSTRAINT_MAPPING.put("HC7", "必须有考官1和考官2两名考官，且不能同科室");
        HARD_CONSTRAINT_MAPPING.put("HC8", "备份考官不能与考官1和考官2是同一人");
    }
    
    // ==================== 软约束映射 ====================
    
    /**
     * 软约束前后端映射关系
     * Key: 前端约束标识, Value: 后端约束名称
     */
    private static final Map<String, String> SOFT_CONSTRAINT_MAPPING = new HashMap<>();
    
    static {
        // 软约束映射 - 按照文档SC1-SC11重新编号
        SOFT_CONSTRAINT_MAPPING.put("SC1", "晚班考官优先级最高权重");
        SOFT_CONSTRAINT_MAPPING.put("SC2", "考官2专业匹配");
        SOFT_CONSTRAINT_MAPPING.put("SC3", "休息第一天考官优先级次高权重");
        SOFT_CONSTRAINT_MAPPING.put("SC4", "备份考官专业匹配");
        SOFT_CONSTRAINT_MAPPING.put("SC5", "休息第二天考官优先级中等权重");
        SOFT_CONSTRAINT_MAPPING.put("SC6", "考官2备选方案");
        SOFT_CONSTRAINT_MAPPING.put("SC7", "行政班考官优先级最低权重");
        SOFT_CONSTRAINT_MAPPING.put("SC8", "备份考官备选方案");
        SOFT_CONSTRAINT_MAPPING.put("SC9", "区域协作鼓励");
        SOFT_CONSTRAINT_MAPPING.put("SC10", "工作量均衡");
        SOFT_CONSTRAINT_MAPPING.put("SC11", "日期分配均衡");
    }
    
    // ==================== 权重范围映射 ====================
    
    /**
     * 前端权重范围到后端权重范围的映射配置
     */
    public static class WeightRangeMapping {
        // 前端权重范围：30-90
        public static final int FRONTEND_MIN_WEIGHT = 30;
        public static final int FRONTEND_MAX_WEIGHT = 90;
        
        // 后端权重范围：150-700
        public static final int BACKEND_MIN_WEIGHT = 150;
        public static final int BACKEND_MAX_WEIGHT = 700;
        
        /**
         * 将前端权重转换为后端权重
         * @param frontendWeight 前端权重值 (30-90)
         * @return 后端权重值 (150-700)
         */
        public static int frontendToBackend(int frontendWeight) {
            if (frontendWeight < FRONTEND_MIN_WEIGHT) {
                frontendWeight = FRONTEND_MIN_WEIGHT;
            }
            if (frontendWeight > FRONTEND_MAX_WEIGHT) {
                frontendWeight = FRONTEND_MAX_WEIGHT;
            }
            
            // 线性映射公式：backend = (frontend - 30) * (700-150) / (90-30) + 150
            double ratio = (double)(frontendWeight - FRONTEND_MIN_WEIGHT) / (FRONTEND_MAX_WEIGHT - FRONTEND_MIN_WEIGHT);
            return (int)(ratio * (BACKEND_MAX_WEIGHT - BACKEND_MIN_WEIGHT) + BACKEND_MIN_WEIGHT);
        }
        
        /**
         * 将后端权重转换为前端权重
         * @param backendWeight 后端权重值 (150-700)
         * @return 前端权重值 (30-90)
         */
        public static int backendToFrontend(int backendWeight) {
            if (backendWeight < BACKEND_MIN_WEIGHT) {
                backendWeight = BACKEND_MIN_WEIGHT;
            }
            if (backendWeight > BACKEND_MAX_WEIGHT) {
                backendWeight = BACKEND_MAX_WEIGHT;
            }
            
            // 反向映射公式：frontend = (backend - 150) * (90-30) / (700-150) + 30
            double ratio = (double)(backendWeight - BACKEND_MIN_WEIGHT) / (BACKEND_MAX_WEIGHT - BACKEND_MIN_WEIGHT);
            return (int)(ratio * (FRONTEND_MAX_WEIGHT - FRONTEND_MIN_WEIGHT) + FRONTEND_MIN_WEIGHT);
        }
    }
    
    // ==================== 公共访问方法 ====================
    
    /**
     * 获取硬约束映射关系（只读）
     * @return 硬约束映射Map
     */
    public static Map<String, String> getHardConstraintMapping() {
        return Collections.unmodifiableMap(HARD_CONSTRAINT_MAPPING);
    }
    
    /**
     * 获取硬约束映射关系
     * @return 硬约束映射Map
     */
    public static Map<String, String> getHardConstraintMappings() {
        return Collections.unmodifiableMap(HARD_CONSTRAINT_MAPPING);
    }
    
    /**
     * 获取软约束映射关系
     * @return 软约束映射Map
     */
    public static Map<String, String> getSoftConstraintMappings() {
        return Collections.unmodifiableMap(SOFT_CONSTRAINT_MAPPING);
    }
    
    /**
     * 获取软约束映射关系
     * @return 软约束映射Map
     */
    public static Map<String, String> getSoftConstraintMapping() {
        return Collections.unmodifiableMap(SOFT_CONSTRAINT_MAPPING);
    }
    
    /**
     * 根据前端约束标识获取后端约束名称
     * @param frontendKey 前端约束标识
     * @return 后端约束名称，如果未找到返回null
     */
    public static String getBackendName(String frontendKey) {
        return getBackendConstraintName(frontendKey);
    }
    
    /**
     * 根据后端约束名称获取前端约束标识
     * @param backendName 后端约束名称
     * @return 前端约束标识，如果未找到返回null
     */
    public static String getFrontendKey(String backendName) {
        return getFrontendConstraintKey(backendName);
    }
    
    /**
     * 根据前端约束标识获取后端约束名称
     * @param frontendKey 前端约束标识
     * @return 后端约束名称，如果未找到返回null
     */
    public static String getBackendConstraintName(String frontendKey) {
        String hardConstraintName = HARD_CONSTRAINT_MAPPING.get(frontendKey);
        if (hardConstraintName != null) {
            return hardConstraintName;
        }
        return SOFT_CONSTRAINT_MAPPING.get(frontendKey);
    }
    
    /**
     * 根据后端约束名称获取前端约束标识
     * @param backendName 后端约束名称
     * @return 前端约束标识，如果未找到返回null
     */
    public static String getFrontendConstraintKey(String backendName) {
        // 搜索硬约束
        for (Map.Entry<String, String> entry : HARD_CONSTRAINT_MAPPING.entrySet()) {
            if (entry.getValue().equals(backendName)) {
                return entry.getKey();
            }
        }
        
        // 搜索软约束
        for (Map.Entry<String, String> entry : SOFT_CONSTRAINT_MAPPING.entrySet()) {
            if (entry.getValue().equals(backendName)) {
                return entry.getKey();
            }
        }
        
        return null;
    }
    
    /**
     * 检查前端约束标识是否为硬约束
     * @param frontendKey 前端约束标识
     * @return true如果是硬约束，false如果是软约束或不存在
     */
    public static boolean isHardConstraint(String frontendKey) {
        return HARD_CONSTRAINT_MAPPING.containsKey(frontendKey);
    }
    
    /**
     * 获取约束类型（硬约束或软约束）
     * @param constraintName 约束名称（前端标识或后端名称）
     * @return "HARD" 或 "SOFT"，如果不存在返回 "UNKNOWN"
     */
    public static String getConstraintType(String constraintName) {
        if (HARD_CONSTRAINT_MAPPING.containsKey(constraintName) || 
            HARD_CONSTRAINT_MAPPING.containsValue(constraintName)) {
            return "HARD";
        } else if (SOFT_CONSTRAINT_MAPPING.containsKey(constraintName) || 
                   SOFT_CONSTRAINT_MAPPING.containsValue(constraintName)) {
            return "SOFT";
        }
        return "UNKNOWN";
    }
    
    /**
     * 将前端权重值转换为后端权重值
     * 前端使用1-10的简化权重，后端使用实际的分数权重
     * @param frontendWeight 前端权重值(1-10)
     * @return 后端权重值
     */
    public static int convertFrontendToBackendWeight(int frontendWeight) {
        // 将1-10的前端权重映射到后端权重
        // 1 -> 1, 5 -> 50, 10 -> 100
        return frontendWeight * 10;
    }
    
    /**
     * 将前端权重值转换为后端权重值（Integer版本）
     * @param frontendWeight 前端权重值(1-10)
     * @return 后端权重值
     */
    public static int convertFrontendToBackendWeight(Integer frontendWeight) {
        if (frontendWeight == null) {
            return 10; // 默认权重
        }
        return convertFrontendToBackendWeight(frontendWeight.intValue());
    }
    
    /**
     * 将后端权重值转换为前端权重值
     * @param backendWeight 后端权重值
     * @return 前端权重值(1-10)
     */
    public static int convertBackendToFrontendWeight(int backendWeight) {
        // 将后端权重映射到1-10的前端权重
        int frontendWeight = backendWeight / 10;
        return Math.max(1, Math.min(10, frontendWeight)); // 确保在1-10范围内
    }
    
    /**
     * 将后端权重值转换为前端权重值（Integer版本）
     * @param backendWeight 后端权重值
     * @return 前端权重值(1-10)
     */
    public static int convertBackendToFrontendWeight(Integer backendWeight) {
        if (backendWeight == null) {
            return 1; // 默认权重
        }
        return convertBackendToFrontendWeight(backendWeight.intValue());
    }
    
    /**
     * 检查前端约束标识是否为软约束
     * @param frontendKey 前端约束标识
     * @return true如果是软约束，false如果是硬约束或不存在
     */
    public static boolean isSoftConstraint(String frontendKey) {
        return SOFT_CONSTRAINT_MAPPING.containsKey(frontendKey);
    }
    
    /**
     * 获取所有约束的前端标识列表
     * @return 包含所有硬约束和软约束前端标识的列表
     */
    public static java.util.List<String> getAllFrontendKeys() {
        java.util.List<String> allKeys = new java.util.ArrayList<>();
        allKeys.addAll(HARD_CONSTRAINT_MAPPING.keySet());
        allKeys.addAll(SOFT_CONSTRAINT_MAPPING.keySet());
        return allKeys;
    }
    
    /**
     * 获取约束映射统计信息
     * @return 映射统计信息
     */
    public static MappingStatistics getStatistics() {
        return new MappingStatistics(
            HARD_CONSTRAINT_MAPPING.size(),
            SOFT_CONSTRAINT_MAPPING.size(),
            HARD_CONSTRAINT_MAPPING.size() + SOFT_CONSTRAINT_MAPPING.size()
        );
    }
    
    /**
     * 映射统计信息类
     */
    public static class MappingStatistics {
        private final int hardConstraintCount;
        private final int softConstraintCount;
        private final int totalConstraintCount;
        
        public MappingStatistics(int hardConstraintCount, int softConstraintCount, int totalConstraintCount) {
            this.hardConstraintCount = hardConstraintCount;
            this.softConstraintCount = softConstraintCount;
            this.totalConstraintCount = totalConstraintCount;
        }
        
        public int getHardConstraintCount() { return hardConstraintCount; }
        public int getSoftConstraintCount() { return softConstraintCount; }
        public int getTotalConstraintCount() { return totalConstraintCount; }
        
        @Override
        public String toString() {
            return String.format("MappingStatistics{硬约束=%d, 软约束=%d, 总计=%d}", 
                hardConstraintCount, softConstraintCount, totalConstraintCount);
        }
    }
}
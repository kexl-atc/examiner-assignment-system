package com.examiner.scheduler.optimizer;

import com.examiner.scheduler.domain.*;
import com.examiner.scheduler.config.HolidayConfig;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 🚀 高性能缓存约束评估器
 * 
 * 优化策略：
 * 1. 使用缓存避免重复计算
 * 2. 预计算静态约束（节假日、日期相关）
 * 3. 使用HashMap加速查找
 * 4. 最小化对象创建
 * 
 * 参考OptaPlanner最佳实践：
 * - 避免在约束流中重复计算
 * - 使用Lookup优化多对多关系
 * - 缓存不变的计算结果
 */
public class CachedConstraintEvaluator {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(CachedConstraintEvaluator.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    // ========================== 缓存层 ==========================
    
    // 🟡 短期优化：添加缓存大小限制
    private static final int MAX_DATE_DIFF_CACHE = 5000;
    private static final int MAX_DEPT_CACHE = 2000;
    
    // 日期相关缓存（静态，整个排班周期不变）
    private final Map<String, Boolean> holidayCache = new ConcurrentHashMap<>();
    private final Map<String, Integer> dayOfWeekCache = new ConcurrentHashMap<>();
    private final Map<String, Boolean> isWeekendCache = new ConcurrentHashMap<>();
    
    // 考官相关缓存（静态）
    private final Map<String, Boolean> isAdminTeacherCache = new ConcurrentHashMap<>();
    
    // 科室匹配缓存（静态）- 添加LRU策略
    private final Map<String, Boolean> sameDepartmentCache = new ConcurrentHashMap<>();
    private final Map<String, Boolean> differentDepartmentCache = new ConcurrentHashMap<>();
    
    // 考官可用性缓存（动态，随解变化需要失效）
    private final Map<String, Set<String>> examinerDateAssignmentsIndex = new ConcurrentHashMap<>();
    
    // 日期连续性缓存 - 限制大小
    private final Map<String, Long> dateDiffCache = new ConcurrentHashMap<>();
    
    private final HolidayConfig holidayConfig;
    
    public CachedConstraintEvaluator() {
        this.holidayConfig = new HolidayConfig();
        LOGGER.info("🚀 [性能优化] CachedConstraintEvaluator 初始化完成");
    }
    
    // ========================== 节假日和日期检查（高性能缓存版本） ==========================
    
    /**
     * 检查是否为节假日（缓存版本）
     * 避免重复解析和查询
     */
    public boolean isHoliday(String dateStr) {
        return holidayCache.computeIfAbsent(dateStr, date -> {
            try {
                LocalDate localDate = LocalDate.parse(date, DATE_FORMATTER);
                return holidayConfig.isHoliday(localDate);
            } catch (Exception e) {
                LOGGER.error("日期解析错误: {}", date);
                return false;
            }
        });
    }
    
    /**
     * 获取星期几（1-7, 缓存版本）
     */
    public int getDayOfWeek(String dateStr) {
        return dayOfWeekCache.computeIfAbsent(dateStr, date -> {
            try {
                LocalDate localDate = LocalDate.parse(date, DATE_FORMATTER);
                return localDate.getDayOfWeek().getValue();
            } catch (Exception e) {
                LOGGER.error("日期解析错误: {}", date);
                return 0;
            }
        });
    }
    
    /**
     * 检查是否为周末（缓存版本）
     */
    public boolean isWeekend(String dateStr) {
        return isWeekendCache.computeIfAbsent(dateStr, date -> {
            int dayOfWeek = getDayOfWeek(date);
            return dayOfWeek == 6 || dayOfWeek == 7;
        });
    }
    
    /**
     * 检查是否为工作日（非节假日且非周末）
     */
    public boolean isWorkday(String dateStr) {
        return !isHoliday(dateStr) && !isWeekend(dateStr);
    }
    
    // ========================== 考官相关检查（高性能缓存版本） ==========================
    
    /**
     * 检查是否为行政班考官（缓存版本）
     */
    public boolean isAdminTeacher(Teacher teacher) {
        if (teacher == null) return false;
        return isAdminTeacherCache.computeIfAbsent(teacher.getId(), id -> {
            String group = teacher.getGroup();
            return group == null || group.trim().isEmpty() || "无".equals(group) || "行政班".equals(group);
        });
    }
    
    /**
     * 检查科室是否相同（缓存版本，带大小限制）
     */
    public boolean isSameDepartment(Teacher teacher, Student student) {
        if (teacher == null || student == null) return false;
        
        // 🟡 短期优化：检查缓存大小，防止无限增长
        if (sameDepartmentCache.size() > MAX_DEPT_CACHE) {
            LOGGER.warn("⚠️ sameDepartmentCache达到上限，清理50%的缓存");
            clearOldestCacheEntries(sameDepartmentCache, MAX_DEPT_CACHE / 2);
        }
        
        String key = teacher.getId() + "_" + student.getId() + "_same";
        return sameDepartmentCache.computeIfAbsent(key, k -> {
            return Objects.equals(normalizeDepartment(teacher.getDepartment()), 
                                normalizeDepartment(student.getDepartment()));
        });
    }
    
    /**
     * 检查科室是否不同（缓存版本，带大小限制）
     */
    public boolean isDifferentDepartment(Teacher teacher, Student student) {
        if (teacher == null || student == null) return false;
        
        // 🟡 短期优化：检查缓存大小
        if (differentDepartmentCache.size() > MAX_DEPT_CACHE) {
            LOGGER.warn("⚠️ differentDepartmentCache达到上限，清理50%的缓存");
            clearOldestCacheEntries(differentDepartmentCache, MAX_DEPT_CACHE / 2);
        }
        
        String key = teacher.getId() + "_" + student.getId() + "_diff";
        return differentDepartmentCache.computeIfAbsent(key, k -> {
            return !Objects.equals(normalizeDepartment(teacher.getDepartment()), 
                                  normalizeDepartment(student.getDepartment()));
        });
    }
    
    // ========================== 日期相关计算 ==========================
    
    /**
     * 计算两个日期之间的天数差（缓存版本）
     */
    public long daysBetween(String date1, String date2) {
        if (date1 == null || date2 == null) return Long.MAX_VALUE;
        String key = date1 + "_" + date2;
        return dateDiffCache.computeIfAbsent(key, k -> {
            try {
                LocalDate d1 = LocalDate.parse(date1, DATE_FORMATTER);
                LocalDate d2 = LocalDate.parse(date2, DATE_FORMATTER);
                return Math.abs(d1.until(d2, java.time.temporal.ChronoUnit.DAYS));
            } catch (Exception e) {
                LOGGER.error("日期计算错误: {} - {}", date1, date2);
                return Long.MAX_VALUE;
            }
        });
    }
    
    /**
     * 检查两个日期是否连续
     */
    public boolean areConsecutiveDates(String date1, String date2) {
        return daysBetween(date1, date2) == 1;
    }
    
    // ========================== 索引构建（用于快速查找） ==========================
    
    /**
     * 为ExamSchedule构建索引
     * 在求解开始前调用一次，大幅提升查找性能
     */
    public void buildIndexes(ExamSchedule schedule) {
        LOGGER.info("🔧 [性能优化] 开始构建查找索引...");
        long startTime = System.currentTimeMillis();
        
        // 清空旧索引
        examinerDateAssignmentsIndex.clear();
        
        // 构建考官-日期分配索引
        if (schedule.getExamAssignments() != null) {
            for (ExamAssignment assignment : schedule.getExamAssignments()) {
                if (assignment.getExamDate() != null) {
                    // 考官1的分配
                    if (assignment.getExaminer1() != null) {
                        addToIndex(assignment.getExaminer1().getId(), assignment.getExamDate());
                    }
                    // 考官2的分配
                    if (assignment.getExaminer2() != null) {
                        addToIndex(assignment.getExaminer2().getId(), assignment.getExamDate());
                    }
                    // 备份考官的分配
                    if (assignment.getBackupExaminer() != null) {
                        addToIndex(assignment.getBackupExaminer().getId(), assignment.getExamDate());
                    }
                }
            }
        }
        
        long duration = System.currentTimeMillis() - startTime;
        LOGGER.info("✅ [性能优化] 索引构建完成，耗时: {}ms, 索引数量: {}", 
                   duration, examinerDateAssignmentsIndex.size());
    }
    
    /**
     * 添加到索引
     */
    private void addToIndex(String examinerId, String date) {
        examinerDateAssignmentsIndex
            .computeIfAbsent(examinerId, k -> ConcurrentHashMap.newKeySet())
            .add(date);
    }
    
    /**
     * 检查考官在某天是否已被分配（使用索引）
     * O(1) 复杂度，而不是 O(n)
     */
    public boolean isExaminerAssignedOnDate(String examinerId, String date) {
        Set<String> dates = examinerDateAssignmentsIndex.get(examinerId);
        return dates != null && dates.contains(date);
    }
    
    /**
     * 获取考官在某天的分配次数
     */
    public int getExaminerAssignmentCount(String examinerId, String date) {
        // 简化版本：返回0或1（每天最多一次）
        return isExaminerAssignedOnDate(examinerId, date) ? 1 : 0;
    }
    
    // ========================== 工具方法 ==========================
    
    /**
     * 标准化科室名称
     */
    private String normalizeDepartment(String dept) {
        if (dept == null) return "";
        String normalized = dept.trim();

        String[] illegalKeywords = {"模拟机", "现场", "口试", "理论", "实操", "实践", "笔试"};
        for (String keyword : illegalKeywords) {
            if (normalized.contains(keyword)) {
                return "__INVALID_DEPARTMENT__";
            }
        }

        if (normalized.contains("区域一室") || normalized.contains("一室") || normalized.contains("1室") || normalized.contains("第1科室") || normalized.equals("一")) return "一";
        if (normalized.contains("区域二室") || normalized.contains("二室") || normalized.contains("2室") || normalized.contains("第2科室") || normalized.equals("二")) return "二";
        if (normalized.contains("区域三室") || normalized.contains("三室") || normalized.contains("3室") || normalized.contains("第3科室") || normalized.equals("三")) return "三";
        if (normalized.contains("区域四室") || normalized.contains("四室") || normalized.contains("4室") || normalized.contains("第4科室") || normalized.equals("四")) return "四";
        if (normalized.contains("区域五室") || normalized.contains("五室") || normalized.contains("5室") || normalized.contains("第5科室") || normalized.equals("五")) return "五";
        if (normalized.contains("区域六室") || normalized.contains("六室") || normalized.contains("6室") || normalized.contains("第6科室") || normalized.equals("六")) return "六";
        if (normalized.contains("区域七室") || normalized.contains("七室") || normalized.contains("7室") || normalized.contains("第7科室") || normalized.equals("七")) return "七";
        if (normalized.contains("区域八室") || normalized.contains("八室") || normalized.contains("8室") || normalized.contains("第8科室") || normalized.equals("八")) return "八";
        if (normalized.contains("区域九室") || normalized.contains("九室") || normalized.contains("9室") || normalized.contains("第9科室") || normalized.equals("九")) return "九";
        if (normalized.contains("区域十室") || normalized.contains("十室") || normalized.contains("10室") || normalized.contains("第10科室") || normalized.equals("十")) return "十";

        return normalized;
    }
    
    /**
     * 清空所有缓存
     */
    public void clearAllCaches() {
        holidayCache.clear();
        dayOfWeekCache.clear();
        isWeekendCache.clear();
        isAdminTeacherCache.clear();
        sameDepartmentCache.clear();
        differentDepartmentCache.clear();
        examinerDateAssignmentsIndex.clear();
        dateDiffCache.clear();
        LOGGER.info("🧹 [内存管理] 所有缓存已清空");
    }
    
    /**
     * 获取缓存统计信息
     */
    public Map<String, Integer> getCacheStatistics() {
        Map<String, Integer> stats = new HashMap<>();
        stats.put("holidayCache", holidayCache.size());
        stats.put("dayOfWeekCache", dayOfWeekCache.size());
        stats.put("isWeekendCache", isWeekendCache.size());
        stats.put("isAdminTeacherCache", isAdminTeacherCache.size());
        stats.put("sameDepartmentCache", sameDepartmentCache.size());
        stats.put("differentDepartmentCache", differentDepartmentCache.size());
        stats.put("examinerDateAssignmentsIndex", examinerDateAssignmentsIndex.size());
        stats.put("dateDiffCache", dateDiffCache.size());
        return stats;
    }
    
    /**
     * 打印缓存统计
     */
    public void printCacheStatistics() {
        Map<String, Integer> stats = getCacheStatistics();
        LOGGER.info("📊 [缓存统计]:");
        stats.forEach((name, size) -> LOGGER.info("  {} : {} 条记录", name, size));
    }
    
    /**
     * 🟡 短期优化：清理最旧的缓存条目
     * 简单策略：随机清理，因为ConcurrentHashMap不保证顺序
     */
    private <K, V> void clearOldestCacheEntries(Map<K, V> cache, int targetSize) {
        if (cache.size() <= targetSize) {
            return;
        }
        
        int toRemove = cache.size() - targetSize;
        int removed = 0;
        
        for (K key : cache.keySet()) {
            if (removed >= toRemove) {
                break;
            }
            cache.remove(key);
            removed++;
        }
        
        LOGGER.info("🧹 清理了 {} 条缓存记录，剩余 {} 条", removed, cache.size());
    }
    
    /**
     * 🟡 短期优化：检查并清理过大的缓存
     */
    public void checkAndCleanupLargeCaches() {
        if (dateDiffCache.size() > MAX_DATE_DIFF_CACHE) {
            LOGGER.warn("⚠️ dateDiffCache过大 ({}), 清理50%", dateDiffCache.size());
            clearOldestCacheEntries(dateDiffCache, MAX_DATE_DIFF_CACHE / 2);
        }
        
        if (sameDepartmentCache.size() > MAX_DEPT_CACHE) {
            LOGGER.warn("⚠️ sameDepartmentCache过大 ({}), 清理50%", sameDepartmentCache.size());
            clearOldestCacheEntries(sameDepartmentCache, MAX_DEPT_CACHE / 2);
        }
        
        if (differentDepartmentCache.size() > MAX_DEPT_CACHE) {
            LOGGER.warn("⚠️ differentDepartmentCache过大 ({}), 清理50%", differentDepartmentCache.size());
            clearOldestCacheEntries(differentDepartmentCache, MAX_DEPT_CACHE / 2);
        }
    }
}


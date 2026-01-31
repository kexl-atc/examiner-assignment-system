package com.examiner.scheduler.solver;

import com.examiner.scheduler.domain.*;
import com.examiner.scheduler.config.HolidayConfig;
import com.examiner.scheduler.websocket.WebSocketLogPusher;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;
import org.optaplanner.core.api.score.stream.Constraint;
import org.optaplanner.core.api.score.stream.ConstraintFactory;
import org.optaplanner.core.api.score.stream.ConstraintProvider;
import org.optaplanner.core.api.score.stream.ConstraintCollectors;
import org.optaplanner.core.api.score.stream.Joiners;
import com.examiner.model.UnifiedConstraintConfiguration;
import com.examiner.model.UnifiedConstraintConfiguration.HardConstraint;
import com.examiner.model.UnifiedConstraintConfiguration.SoftConstraint;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.List;
import java.util.ArrayList;
import com.examiner.scheduler.rest.ConstraintViolationSyncResource;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 优化后的考试排班约束提供者
 * 集成统一约束配置系统，支持动态约束管理
 * 
 * 硬约束（必须满足）：
 * - HC1: 法定节假日不安排考试（周六周日可以考试，但行政班考官周末不参加考试）（权重：1000000）🔥
 * - HC2: 考官1与学员同科室（权重：1000000）🔥
 * - HC3: 考官执勤白班不能安排考试（行政班考官除外）（权重：1000000）🔥
 * - HC4: 每名考官每天只能监考一名考生（权重：1000000）🔥
 * - HC5: 考生执勤白班不能安排考试（已合并到HC6）
 * - HC6: 考生需要在连续两天完成考试（权重：1000000）🔥
 * - HC7: 必须有考官1和考官2两名考官，且不能同科室（权重：1000000）🔥
 * - HC8: 备份考官不能与考官1和考官2是同一人（权重：1000000）🔥
 * - HC8b: 备份考官不能与考官1和考官2同科室（权重：1000000）🔥🆕
 * - HC9: 考官不可用期不能安排考试（权重：1000000）🔥🆕
 * 
 * 🔧 所有硬约束权重统一设置为1000000，确保绝对优先级，远高于所有软约束之和
 * 
 * 软约束（优先满足）：
 * 🆕 v3.0优化：考官一和考官二都一定参与考试，权重相同；备份考官可能不参与，权重较低
 * - SC1: 晚班考官优先（考官一+200，考官二+200，备份考官+80）
 * - SC2: 考官2专业匹配（权重：100）
 * - SC3: 休息第一天考官优先（考官一+120，考官二+120，备份考官+40）
 * - SC4: 备份考官专业匹配（权重：80）🔧
 * - SC5: 休息第二天考官优先（考官一+80，考官二+80，备份考官+30）
 * - SC6: 考官2备选方案（权重：50）
 * - SC7: 行政班备份考官优先（权重：60）🔧
 * - SC8: 备份考官备选方案（权重：30）
 * - SC9: 区域协作鼓励（权重：20）
 * - SC10: 工作量均衡（权重：400）
 * - SC11: 日期分配均衡（权重：50）🔧
 * - SC14: 同一学员Day1和Day2考官二应来自推荐科室池中的不同科室（权重：110）🆕
 * - SC15: 鼓励同一学员两天考试使用不同考官1（权重：60）🆕
 * - SC16: 智能周末降级策略（权重：500）🆕
 * - SC17: 周末优先晚班考官（权重：300）🆕
 */
public class OptimizedExamScheduleConstraintProvider implements ConstraintProvider {
    
    private static final Logger logger = LoggerFactory.getLogger(OptimizedExamScheduleConstraintProvider.class);
    private final HolidayConfig holidayConfig;
    
    // 🚀 性能优化：预定义权重常量，避免重复创建对象
    // 🔧 注意：这些常量目前未使用，但保留用于未来扩展
    @SuppressWarnings("unused")
    private static final HardSoftScore HC_WEIGHT = HardSoftScore.ofHard(1000000);  // 所有硬约束统一权重
    
    // 软约束权重分级（按重要性递减）
    @SuppressWarnings("unused")
    private static final HardSoftScore SC_CRITICAL = HardSoftScore.ofSoft(150);      // SC1 晚班考官优先
    @SuppressWarnings("unused")
    private static final HardSoftScore SC_HIGH = HardSoftScore.ofSoft(100);          // SC2 考官2专业匹配
    @SuppressWarnings("unused")
    private static final HardSoftScore SC_MEDIUM_HIGH = HardSoftScore.ofSoft(85);    // SC14 Day1/Day2互斥
    @SuppressWarnings("unused")
    private static final HardSoftScore SC_MEDIUM = HardSoftScore.ofSoft(60);         // SC15 不同考官1
    @SuppressWarnings("unused")
    private static final HardSoftScore SC_LOW_MEDIUM = HardSoftScore.ofSoft(40);     // SC5/SC7
    @SuppressWarnings("unused")
    private static final HardSoftScore SC_LOW = HardSoftScore.ofSoft(20);            // SC9 区域协作
    @SuppressWarnings("unused")
    private static final HardSoftScore SC_MINIMAL = HardSoftScore.ofSoft(500);       // SC10 工作量均衡（特殊权重）
    @SuppressWarnings("unused")
    private static final HardSoftScore SC_TRIVIAL = HardSoftScore.ofSoft(5);         // SC11 日期均衡
    
    // 🚀 性能优化：约束统计功能开关（生产环境建议关闭）
    @SuppressWarnings("unused")
    private static final boolean ENABLE_STATISTICS = 
        Boolean.parseBoolean(System.getProperty("optaplanner.statistics.enabled", "false"));
    
    // 🚀 v5.6.1 性能模式开关（生产环境建议开启）
    // 开启后将禁用约束评估中的详细日志输出，提升性能20-30%
    private static final boolean PERFORMANCE_MODE = 
        Boolean.parseBoolean(System.getProperty("optaplanner.performance.mode", "true"));
    
    // 🚀 性能模式下的日志辅助方法
    private static void logDebug(String format, Object... args) {
        if (!PERFORMANCE_MODE && logger.isDebugEnabled()) {
            logger.debug(format, args);
        }
    }
    
    private static void logInfo(String format, Object... args) {
        if (!PERFORMANCE_MODE && logger.isInfoEnabled()) {
            logger.info(format, args);
        }
    }
    
    private static void logWarn(String format, Object... args) {
        // 警告始终输出，但在性能模式下降级为debug
        if (PERFORMANCE_MODE) {
            if (logger.isDebugEnabled()) {
                logger.debug(format, args);
            }
        } else {
            logger.warn(format, args);
        }
    }
    
    // 🚀 v5.5.6 性能优化：DutySchedule缓存（避免重复计算）
    private static final Map<String, DutySchedule> dutyScheduleCache = new ConcurrentHashMap<>();
    
    // 🚀 性能优化：日期解析缓存（避免频繁的 LocalDate.parse）
    private static final Map<String, LocalDate> parsedDateCache = new ConcurrentHashMap<>();
    
    // 🚀 v7.1.0: 科室名称标准化缓存（高频调用优化）
    private static final Map<String, String> normalizedDepartmentCache = new ConcurrentHashMap<>();
    
    // 🚀 性能优化：获取缓存的解析日期
    private static LocalDate getCachedParsedDate(String dateStr) {
        if (dateStr == null) return null;
        return parsedDateCache.computeIfAbsent(dateStr, s -> {
            try {
                return LocalDate.parse(s);
            } catch (Exception e) {
                return null;
            }
        });
    }
    
    // 🚀 v7.1.0: 清理所有缓存
    public static void clearAllCaches() {
        dutyScheduleCache.clear();
        parsedDateCache.clear();
        normalizedDepartmentCache.clear();
        logger.debug("🔄 [性能优化] 已清理所有约束计算缓存");
    }
    
    // 当前约束配置（传统配置）
    private static OptimizedConstraintConfiguration currentConstraintConfig;
    
    // 统一约束配置（新配置系统）
    private UnifiedConstraintConfiguration unifiedConstraintConfig;
    
    // 约束统计信息
    private static final Map<String, AtomicInteger> constraintExecutionCount = new HashMap<>();
    private static final Map<String, AtomicInteger> constraintMatchCount = new HashMap<>();
    private static final Map<String, AtomicInteger> constraintTotalScore = new HashMap<>();
    
    // 初始化约束统计
    static {
        String[] hardConstraints = {"HC1", "HC2", "HC3", "HC4", "HC6", "HC7", "HC8", "HC8b", "HC9"}; // HC5已合并到HC6
        String[] softConstraints = {
            "SC1", "SC2", "SC3", "SC4", "SC5", "SC6", "SC7", "SC8", "SC9", 
            "SC10", "SC10b", "SC10c",  // 工作量均衡系列
            "SC11", "SC12", "SC13", "SC14", "SC15", "SC16", "SC17"  // 🔧 添加完整的软约束列表
        };

        // 初始化硬约束统计
        for (String constraint : hardConstraints) {
            constraintExecutionCount.put(constraint, new AtomicInteger(0));
            constraintMatchCount.put(constraint, new AtomicInteger(0));
            constraintTotalScore.put(constraint, new AtomicInteger(0));
        }

        // 初始化软约束统计
        for (String constraint : softConstraints) {
            constraintExecutionCount.put(constraint, new AtomicInteger(0));
            constraintMatchCount.put(constraint, new AtomicInteger(0));
            constraintTotalScore.put(constraint, new AtomicInteger(0));
        }
    }
    
    public OptimizedExamScheduleConstraintProvider() {
        this.holidayConfig = new HolidayConfig();
        logger.info("🚀 [约束系统] 约束提供者初始化完成，准备执行约束评估");
    }
    
    /**
     * 设置当前约束配置（传统配置）
     */
    public static void setConstraintConfiguration(OptimizedConstraintConfiguration config) {
        currentConstraintConfig = config;
        logger.info("约束配置已更新: {}", config != null ? "已设置" : "已清空");
    }
    
    /**
     * 获取当前约束配置（传统配置）
     */
    public static OptimizedConstraintConfiguration getConstraintConfiguration() {
        return currentConstraintConfig;
    }
    
    /**
     * 设置统一约束配置（新配置系统）
     */
    public void setUnifiedConstraintConfiguration(UnifiedConstraintConfiguration config) {
        this.unifiedConstraintConfig = config;
        logger.info("统一约束配置已更新: {}", config != null ? config.getConfigurationId() : "已清空");
    }
    
    /**
     * 获取统一约束配置（新配置系统）
     */
    public UnifiedConstraintConfiguration getUnifiedConstraintConfiguration() {
        return unifiedConstraintConfig;
    }
    
    /**
     * 检查约束是否启用（优先使用统一配置）
     */
    private boolean isConstraintEnabled(String constraintId) {
        // 优先使用统一约束配置
        if (unifiedConstraintConfig != null) {
            // 检查硬约束
            if (unifiedConstraintConfig.getHardConstraints() != null) {
                for (UnifiedConstraintConfiguration.HardConstraint hc : unifiedConstraintConfig.getHardConstraints().values()) {
                    if (constraintId.equals(hc.getId())) {
                        return hc.getStatus() == UnifiedConstraintConfiguration.ConstraintStatus.ENABLED;
                    }
                }
            }
            // 检查软约束
            if (unifiedConstraintConfig.getSoftConstraints() != null) {
                for (UnifiedConstraintConfiguration.SoftConstraint sc : unifiedConstraintConfig.getSoftConstraints().values()) {
                    if (constraintId.equals(sc.getId())) {
                        return sc.getStatus() == UnifiedConstraintConfiguration.ConstraintStatus.ENABLED;
                    }
                }
            }
        }
        
        // 🔧 关键修复：强制启用所有硬约束，不依赖配置
        // 硬约束是必须满足的规则，不应该被禁用
        // 回退到传统配置
        if (currentConstraintConfig != null) {
            switch (constraintId) {
                // 🔧 修复：所有硬约束强制启用 - 硬约束不应该被禁用!
                case "HC1": return true; // HC1: 法定节假日不安排考试 🔧 强制启用
                case "HC2": return true; // HC2: 考官1与学员同科室 🔧 强制启用 (关键!)
                case "HC3": return true; // HC3: 考官执勤白班不能安排考试 🔧 强制启用
                case "HC4": return true; // HC4: 每名考官每天只能监考一名考生 🔧 强制启用
                // HC5已合并到HC6中
                case "HC6": return true; // HC6: 学员连续两天考试+白班限制约束 🔧 强制启用
                case "HC7": return true; // HC7: 必须有考官1和考官2两名考官 🔧 强制启用 (关键!)
                case "HC8": return true; // HC8: 备份考官不能与考官1和考官2是同一人 🔧 强制启用
                case "HC8b": return true; // HC8b: 备份考官不能与考官1和考官2同科室 🔧 强制启用 🆕
                case "HC9": return true; // HC9: 考官不可用期不能安排考试 🔧 强制启用 🆕
                
                // 🔧 修复：软约束启用状态映射 - 强制启用所有软约束以确保执行
                case "SC1": return true; // SC1: 晚班考官优先级最高权重 🔧 强制启用
                case "SC2": return true; // SC2: 考官2专业匹配 🔧 强制启用
                case "SC3": return true; // SC3: 休息第一天考官优先级次高权重 🔧 强制启用
                case "SC4": return true; // SC4: 备份考官专业匹配 🔧 强制启用
                case "SC5": return true; // SC5: 休息第二天考官优先级中等权重 🔧 强制启用
                case "SC6": return true; // SC6: 考官2备选方案 🔧 强制启用
                case "SC7": return true; // SC7: 行政班考官优先级最低权重 🔧 强制启用
                case "SC8": return true; // SC8: 备份考官备选方案 🔧 强制启用
                case "SC9": return true; // SC9: 区域协作鼓励 🔧 强制启用
                case "SC10": return true; // SC10: 工作量均衡 🔧 强制启用
                case "SC11": return true; // SC11: 日期分配均衡 🔧 强制启用
                case "SC12": return true; // SC12: 🔧 备份考官工作量均衡（默认启用）
                case "SC13": return true; // SC13: 🔧 限制行政班担任主考官（默认启用）
                case "SC14": return true; // SC14: 🔧 Day1/Day2考官二科室互斥（默认启用）🆕
                case "SC16": return true; // SC16: 🔧 智能周末降级策略（默认启用）🌟🆕
                case "SC17": return true; // SC17: 🔧 周末优先晚班考官（默认启用）🌟🆕
            }
        }
        
        // 默认启用
        return true;
    }
    
    /**
     * 获取约束权重（优先使用统一配置）
     */
    @SuppressWarnings("unused")
    private HardSoftScore getConstraintWeight(String constraintId) {
        return getConstraintWeight(constraintId, HardSoftScore.ofSoft(1));
    }
    
    /**
     * 获取约束权重（带默认权重参数）
     */
    private HardSoftScore getConstraintWeight(String constraintId, HardSoftScore defaultWeight) {
        HardSoftScore finalWeight;
        String weightSource = "默认权重";
        
        // 优先使用统一约束配置
        if (unifiedConstraintConfig != null) {
            // 检查硬约束
            for (HardConstraint hc : unifiedConstraintConfig.getHardConstraints().values()) {
                if (constraintId.equals(hc.getId())) {
                    finalWeight = HardSoftScore.ofHard(hc.getWeight());
                    weightSource = "统一配置-硬约束";
                    logger.debug("🎯 [权重计算] {} 使用{}: {}", constraintId, weightSource, finalWeight);
                    return finalWeight;
                }
            }
            // 检查软约束
            for (SoftConstraint sc : unifiedConstraintConfig.getSoftConstraints().values()) {
                if (constraintId.equals(sc.getId())) {
                    finalWeight = HardSoftScore.ofSoft(sc.getWeight());
                    weightSource = "统一配置-软约束";
                    logger.debug("🎯 [权重计算] {} 使用{}: {}", constraintId, weightSource, finalWeight);
                    return finalWeight;
                }
            }
        }
        
        // 🔧 修复：无论配置是否为null，都使用传统权重作为后备
        // 回退到传统配置（无论currentConstraintConfig是否为null）
        {
            weightSource = "传统配置";
            switch (constraintId) {
                // 🔧 优化：统一所有硬约束权重为1000000，确保硬约束绝对优先级
                // 1000000 >> 所有软约束总和(~2000)，避免硬约束被软约束"压制"
                case "HC1": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🔧 优化: 100000→1000000 (绝对优先级)
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (法定节假日限制)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "HC2": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🔧 优化: 100000→1000000 (绝对优先级)
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (考官1与学员同科室)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "HC3": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🔧 优化: 100000→1000000 (绝对优先级)
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (考官执勤白班限制)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "HC4": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🔧 优化: 100000→1000000 (绝对优先级)
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (每名考官每天只能监考一名考生)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "HC5": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🔧 优化: 100000→1000000 (绝对优先级)
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (考生执勤白班限制)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "HC6": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🔧 优化: 100000→1000000 (绝对优先级)
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (考生连续两天完成考试)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "HC7": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🔧 优化: 100000→1000000 (绝对优先级)
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (考官1和考官2且不能同科室)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "HC8": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🔧 优化: 100000→1000000 (绝对优先级)
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (备份考官不能重复)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "HC8b": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🆕 备份考官不能与考官1/2同科室
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (备份考官科室不同)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "HC9": 
                    finalWeight = HardSoftScore.ofHard(1000000);  // 🔧 优化: 100000→1000000 (绝对优先级)
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (考官不可用期限制)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                
                // 软约束权重映射 - 🔧 优化权重配置，确保更好的约束平衡
                case "SC1": 
                    finalWeight = HardSoftScore.ofSoft(150);  // 🔧 从100提升到150
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (晚班考官优先级-高)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC2": 
                    finalWeight = HardSoftScore.ofSoft(100);  // 🔧 从90提升到100
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (考官2专业匹配-高)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC3": 
                    finalWeight = HardSoftScore.ofSoft(120);  // 保持
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (休息第一天考官优先级次高)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC4": 
                    finalWeight = HardSoftScore.ofSoft(80);  // 🔧 从70提升到80
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (备份考官专业匹配-中高)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC5": 
                    finalWeight = HardSoftScore.ofSoft(40);  // 保持
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (休息第二天考官优先级中等)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC6": 
                    finalWeight = HardSoftScore.ofSoft(50);  // 保持
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (考官2备选方案)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC7": 
                    finalWeight = HardSoftScore.ofSoft(60);  // 保持
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (行政班备份考官优先)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC8": 
                    finalWeight = HardSoftScore.ofSoft(30);  // 保持
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (备份考官备选方案)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC9": 
                    finalWeight = HardSoftScore.ofSoft(20);  // 保持
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (区域协作鼓励)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC14":
                    finalWeight = HardSoftScore.ofSoft(110);  // 🆕 高优先级：Day1和Day2考官二来自不同推荐科室
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (Day1/Day2考官二科室互斥)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC15":
                    finalWeight = HardSoftScore.ofSoft(60);  // 🆕 中等优先级：鼓励同一学员两天考试使用不同考官1
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (鼓励考官1多样性)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC10":
                    finalWeight = HardSoftScore.ofSoft(400);  // 🔧 从500降低到400，避免过度关注
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (工作量均衡-高优先级)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC11": 
                    finalWeight = HardSoftScore.ofSoft(50);  // 🔧 统一为50（与preferLaterDates实际使用一致）
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (日期分配均衡)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC12": 
                    finalWeight = HardSoftScore.ofSoft(50);  // 保持
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (备份考官工作量均衡)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC13": 
                    finalWeight = HardSoftScore.ofSoft(80);  // 🔧 优化: 30→80 (确保限制行政班担任主考官)
                    logger.debug("🎯 [权重计算] {} 使用{}: {} (限制行政班担任主考官)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC16":
                    finalWeight = HardSoftScore.ofSoft(500);  // 🔧 智能周末降级：高权重确保工作日优先
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (智能周末降级)", constraintId, weightSource, finalWeight);
                    return finalWeight;
                case "SC17":
                    finalWeight = HardSoftScore.ofSoft(300);  // 🔧 周末晚班优先：必须周末时优先晚班考官
                    logger.debug("⚖️ [权重计算] {} 使用{}: {} (周末晚班优先)", constraintId, weightSource, finalWeight);
                    return finalWeight;
            }
        }
        
        // 🔧 修复：返回默认权重时不再警告，因为传统配置已涵盖所有约束
        logger.debug("🔧 [权重计算] {} 使用最终默认权重: {} (未在传统配置中定义)", constraintId, defaultWeight);
        return defaultWeight;
    }

    @Override
    public Constraint[] defineConstraints(ConstraintFactory constraintFactory) {
        
        // 返回所有硬约束和软约束
        Constraint[] constraints = new Constraint[]{
            // 硬约束 HC1-HC10（所有硬约束权重统一为1000000，确保绝对优先级）
            consecutiveTwoDaysExam(constraintFactory),              // HC6: 考生需要在连续两天完成考试（权重：1000000）🔥
            consecutiveDaysCheck(constraintFactory),                // 🆕 HC6b: 检查日期连续性（修复版）
            noExaminerTimeConflict(constraintFactory),              // HC4: 每名考官每天只能监考一名考生（权重：1000000）🔥
            examinerDepartmentRules(constraintFactory),             // HC2: 考官1与学员同科室（权重：1000000）🔥
            mustHaveTwoDifferentDepartmentExaminers(constraintFactory), // HC7: 必须有考官1和考官2两名考官，且不能同科室（权重：1000000）🔥
            noDayShiftExaminerConstraint(constraintFactory),        // HC3: 考官执勤白班不能安排考试（行政班考官除外）（权重：1000000）🔥
            workdaysOnlyExam(constraintFactory),                    // HC1: 法定节假日不安排考试（权重：1000000）🔥
            backupExaminerMustBeDifferentPerson(constraintFactory), // HC8: 备份考官不能与考官1和考官2是同一人（权重：1000000）🔥
            backupExaminerMustBeDifferentDepartment(constraintFactory), // HC8b: 备份考官不能与考官1和考官2同科室（权重：1000000）🔥🆕
            noUnavailableExaminer(constraintFactory),               // HC9: 考官不可用期不能安排考试（权重：1000000）🔥🆕
            // 🔧 暂时禁用HC10，调试Drools编译问题
            // pinnedAssignmentMustNotChange(constraintFactory),    // 🆕 HC10: 固定的排班不能改变（用于局部重排）（权重：1000000）🔥
            
            // 软约束 SC1-SC17（按权重从高到低排序）
            avoidWeekendScheduling(constraintFactory),              // SC16: 智能周末降级策略（权重：500）🌟🆕
            preferNightShiftOnWeekend(constraintFactory),           // SC17: 周末优先晚班考官（权重：300）🌟🆕 - 🔧 已修复
            preferNightShiftTeachers(constraintFactory),            // SC1: 晚班考官优先级最高权重（权重：150）
            preferDifferentRecommendedDeptsForDay1Day2(constraintFactory), // SC14: Day1/Day2考官二来自不同推荐科室（权重：110）🆕
            preferRecommendedExaminer2(constraintFactory),          // SC2: 考官2专业匹配（权重：100）
            preferFirstRestDayTeachers(constraintFactory),          // SC3: 休息第一天考官优先级次高权重（权重：120）
            preferRecommendedBackupExaminer(constraintFactory),     // SC4: 备份考官专业匹配（权重：70）
            encourageDifferentExaminer1ForTwoDays(constraintFactory), // SC15: 鼓励同一学员两天考试使用不同考官1（权重：60）🆕
            preferSecondRestDayTeachers(constraintFactory),         // SC5: 休息第二天考官优先级中等权重（权重：60）
            balanceBackupExaminerWorkload(constraintFactory),       // SC12: 🔧 备份考官工作量均衡（权重：50）
            preferNonRecommendedExaminer2(constraintFactory),       // SC6: 考官2备选方案（权重：50）
            preferAdminTeachers(constraintFactory),                 // SC7: 行政班备份考官优先（权重：60）
            limitAdminAsMainExaminers(constraintFactory),        // SC13: 限制行政班担任主考官（权重：30）
            preferNonRecommendedBackupExaminer(constraintFactory),  // SC8: 备份考官备选方案（权重：30）
            allowDept37CrossUse(constraintFactory),                 // SC9: 区域协作鼓励（权重：20）
            // 🔧 v5.5.8: 重新启用SC10约束系列（用户反馈：考官连续工作问题）
            balanceWorkload(constraintFactory),                     // SC10: 考官1工作量均衡+连续工作惩罚（权重：400）✅ 已启用
            balanceExaminer2Workload(constraintFactory),            // SC10b: 考官2连续工作惩罚（权重：400）✅ 已启用
            balanceBackupWorkload(constraintFactory),               // SC10c: 备份考官连续工作惩罚（权重：400）✅ 已启用
            preferLaterDates(constraintFactory)                     // SC11: 日期分配均衡（权重：5）
        };
        
        for (int i = 0; i < constraints.length; i++) {
        }
        
        return constraints;
    }

    // ==================== 硬约束实现 ====================
    
    /**
     * 🆕 HC10: 固定的排班不能改变（用于局部重排）
     * 
     * 在局部重排场景中，用户固定的排班必须保持不变
     * - 考官1不能改变
     * - 考官2不能改变
     * - 备份考官不能改变
     * - 考试日期不能改变
     * 
     * @param constraintFactory 约束工厂
     * @return 约束
     */
    /**
     * HC1: 法定节假日不安排考试（周六周日可以考试，但行政班考官周末不参加考试）
     * - 法定节假日（如春节、国庆节等）禁止安排考试
     * - 周六、周日可以安排考试
     * - 行政班考官（当日执勤白班的班组）在周末不能参与考试
     * - 夜班考官和休息班组考官可以在周末参与考试
     * - 权重：5000（硬约束）
     */
    private Constraint workdaysOnlyExam(ConstraintFactory constraintFactory) {
        logger.info("🚫 [HC1约束] 初始化: 法定节假日不安排考试约束 (权重:5000)");
        
        if (!isConstraintEnabled("HC1")) {
            logger.warn("⚠️ [HC1约束] 约束已禁用，跳过执行");
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("workdaysOnlyExam");
        }
        
        logger.info("✅ [HC1约束] 约束已启用，开始检查节假日和周末限制");
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    // 🚀 性能优化：移除所有日志，直接检查
                    if (assignment.getExamDate() == null) {
                        return false;
                    }
                    
                    try {
                        LocalDate date = LocalDate.parse(assignment.getExamDate(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                        int dayOfWeek = date.getDayOfWeek().getValue();
                        
                        // 法定节假日禁止排班
                        if (holidayConfig.isHoliday(date)) {
                            return true;
                        }
                        
                        // 周末时，检查是否有行政班考官参与
                        if (dayOfWeek == 6 || dayOfWeek == 7) {
                            // 检查考官1、考官2、备份考官是否为行政班考官
                            if (assignment.getExaminer1() != null && isAdminTeacher(assignment.getExaminer1())) {
                                return true;
                            }
                            if (assignment.getExaminer2() != null && isAdminTeacher(assignment.getExaminer2())) {
                                return true;
                            }
                            if (assignment.getBackupExaminer() != null && isAdminTeacher(assignment.getBackupExaminer())) {
                                return true;
                            }
                        }
                        
                        return false; // 不违反约束
                    } catch (Exception e) {
                        return true; // 日期格式错误也视为违反
                    }
                })
                .penalize(getConstraintWeight("HC1", HardSoftScore.ofHard(1000000))) // HC1权重：1000000 🔥 硬约束绝对优先
                .asConstraint("workdaysOnlyExam");
    }
    
    
    /**
     * HC2: 考官1与学员同科室
     * - 考官1必须与考生同科室（或3室7室互通）
     * 🔧 修复：HC2只检查"考官1与学员同科室"，其他检查移到HC7
     */
    private Constraint examinerDepartmentRules(ConstraintFactory constraintFactory) {
        logger.info("🏢 [HC2约束] 初始化: 考官1与学员同科室约束");
        
        if (!isConstraintEnabled("HC2")) {
            logger.warn("⚠️ [HC2约束] 约束已禁用，跳过执行");
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("examinerDepartmentRules");
        }
        
        logger.info("✅ [HC2约束] 约束已启用，开始检查考官1与学员同科室规则");
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    // 🚀 性能优化：移除所有日志，直接计算约束违反
                    // 只有当考官1和学员都已分配时才检查
                    if (assignment.getExaminer1() == null || assignment.getStudent() == null) {
                        return false; // 未分配时跳过检查，由HC7约束处理
                    }
                    
                    String studentDept = normalizeDepartment(assignment.getStudent().getDepartment());
                    String examiner1Dept = normalizeDepartment(assignment.getExaminer1().getDepartment());
                    
                    // 检测null（数据错误）- 强制违反
                    if (studentDept == null || examiner1Dept == null) {
                        return true;
                    }
                    
                    // 🔧 修复：HC2只检查"考官1与学员同科室（或3室7室互通）"
                    boolean examiner1Valid = isValidExaminer1Department(studentDept, examiner1Dept);
                    
                    // #region agent log - 追踪HC2约束评估（仅在违反时记录）
                    if (!examiner1Valid) {
                        logger.warn("[HC2-CONSTRAINT-VIOLATED] Student:{} dept:{} Examiner1:{} dept:{} - PENALTY APPLIED", 
                            assignment.getStudent().getName(), studentDept,
                            assignment.getExaminer1().getName(), examiner1Dept);
                    }
                    // #endregion
                    
                    // 返回是否违反约束
                    return !examiner1Valid;
                })
                .penalize(getConstraintWeight("HC2", HardSoftScore.ofHard(1000000))) // 🔧 HC2权重：1000000，绝对优先
                .asConstraint("examinerDepartmentRules");
    }
    
    /**
     * HC3: 考官执勤白班不能安排考试（行政班考官除外）
     * - 权重：7000（硬约束）
     * - 检查考官1、考官2、备份考官的工作安排
     * - 如果任一考官在考试日期执勤白班，则不能安排考试
     * - 行政班考官不受四班组轮班制度限制，可以在任何时间安排考试（除法定节假日和周末）
     */
    private Constraint noDayShiftExaminerConstraint(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("HC3")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("noDayShiftExaminerConstraint");
        }
        
        // 🚀 性能优化：仅保留初始化日志
        logger.info("✅ [HC3约束] 考官执勤白班不能安排考试约束已启用");
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    if (assignment.getExamDate() == null) {
                        return false;
                    }
                    
                    // 🚀 v5.5.6 性能优化：使用缓存的 DutySchedule
                    com.examiner.scheduler.domain.DutySchedule dutySchedule = 
                        getCachedDutySchedule(assignment.getExamDate());
                    
                    // 🚀 性能优化：直接检查，无日志开销
                    // 检查考官1（行政班除外）
                    if (assignment.getExaminer1() != null) {
                        if (!isAdminTeacher(assignment.getExaminer1()) &&
                            Objects.equals(assignment.getExaminer1().getGroup(), dutySchedule.getDayShift())) {
                            return true;  // 违反约束
                        }
                    }
                    
                    // 检查考官2（行政班除外）
                    if (assignment.getExaminer2() != null) {
                        if (!isAdminTeacher(assignment.getExaminer2()) &&
                            Objects.equals(assignment.getExaminer2().getGroup(), dutySchedule.getDayShift())) {
                            return true;
                        }
                    }
                    
                    // 检查备份考官（行政班除外）
                    if (assignment.getBackupExaminer() != null) {
                        if (!isAdminTeacher(assignment.getBackupExaminer()) &&
                            Objects.equals(assignment.getBackupExaminer().getGroup(), dutySchedule.getDayShift())) {
                            return true;
                        }
                    }
                    
                    return false;  // 无违反
                })
                .penalize(getConstraintWeight("HC3", HardSoftScore.ofHard(1000000))) // HC3权重：1000000 🔥 硬约束绝对优先
                .asConstraint("noDayShiftExaminerConstraint");
    }
    
    /**
     * 🆕 修复版 HC6: 考生需要在连续两天完成考试
     * 
     * 修复内容:
     * 1. 检查学员在白班执勤 (原有逻辑)
     * 2. 检查两天考试是否连续 (新增逻辑)
     * 
     * 注意：此约束只处理白班检查，连续日期检查由 consecutiveDaysCheck 处理
     */
    public Constraint consecutiveTwoDaysExam(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("HC6")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("consecutiveTwoDaysExam");
        }
        
        logger.info("✅ [HC6约束] 学员连续两天考试约束已启用（已修复）");
        
        return constraintFactory.forEach(ExamAssignment.class)
                .filter(assignment -> {
                    Student student = assignment.getStudent();
                    String examDate = assignment.getExamDate();
                    
                    if (student == null || examDate == null) {
                        return false;
                    }
                    
                    // 检查白班执勤
                    DutySchedule dutySchedule = getCachedDutySchedule(examDate);
                    boolean isStudentOnDayShift = Objects.equals(student.getGroup(), dutySchedule.getDayShift());
                    
                    if (isStudentOnDayShift) {
                        return true; // 违反约束：白班执勤
                    }
                    
                    return false; // 符合约束
                })
                .penalize(getConstraintWeight("HC6", HardSoftScore.ofHard(1000000)))
                .asConstraint("consecutiveTwoDaysExam");
    }
    
    /**
     * 🆕 新增 HC6b: 检查连续两天考试约束
     * 
     * 确保同一学员的day1和day2考试在连续两天进行
     */
    private Constraint consecutiveDaysCheck(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("HC6")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("consecutiveDaysCheck");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(a -> a.getStudent() != null && a.getExamDate() != null)
                .join(ExamAssignment.class,
                    Joiners.equal(ExamAssignment::getStudent),
                    Joiners.greaterThan(ExamAssignment::getId))
                .filter((a1, a2) -> {
                    // 检查是否一个是day1，一个是day2
                    boolean isDay1AndDay2 = 
                        ("day1".equals(a1.getExamType()) && "day2".equals(a2.getExamType())) ||
                        ("day2".equals(a1.getExamType()) && "day1".equals(a2.getExamType()));
                    
                    if (!isDay1AndDay2) {
                        return false;
                    }
                    
                    // 检查日期是否连续
                    LocalDate date1 = getCachedParsedDate(a1.getExamDate());
                    LocalDate date2 = getCachedParsedDate(a2.getExamDate());
                    
                    if (date1 == null || date2 == null) {
                        return true; // 日期无效，视为违反
                    }
                    
                    long daysBetween = ChronoUnit.DAYS.between(date1, date2);
                    boolean isConsecutive = Math.abs(daysBetween) == 1;
                    
                    // #region agent log - 记录违反情况
                    if (!isConsecutive) {
                        logger.warn("[HC6b-CONSTRAINT-VIOLATED] Student:{} Day1:{} Day2:{} DaysBetween:{} - PENALTY APPLIED",
                            a1.getStudent().getName(), date1, date2, daysBetween);
                    }
                    // #endregion
                    
                    return !isConsecutive; // 不连续则违反约束
                })
                .penalize(getConstraintWeight("HC6", HardSoftScore.ofHard(1000000)))
                .asConstraint("consecutiveDaysCheck");
    }
    
    /**
     * 🔧 修复：使用现有的DutySchedule算法判断学员在指定日期是否为白班执勤
     */
    @SuppressWarnings("unused")
    private boolean isStudentOnDayShiftDuty(Student student, String examDate) {
        try {
            String studentGroup = student.getGroup();
            if (studentGroup == null) {
                return false; // 没有班组信息，不认为违反约束
            }
            
            // 🎯 使用现有的DutySchedule算法进行准确计算
            DutySchedule dutySchedule = DutySchedule.forDate(examDate);
            boolean isOnDayShift = dutySchedule.isGroupOnDayShift(studentGroup);
            
            if (isOnDayShift) {
                logger.debug("🔍 [HC6检查] 学员 {} (班组:{}) 在 {} 为白班执勤 → 违反约束", 
                        student.getName(), studentGroup, examDate);
            } else {
                logger.debug("✅ [HC6检查] 学员 {} (班组:{}) 在 {} 非白班执勤 → 符合要求", 
                        student.getName(), studentGroup, examDate);
            }
            
            return isOnDayShift;
            
        } catch (Exception e) {
            logger.warn("⚠️ 无法判断学员班组状态: {}", e.getMessage());
            return false; // 异常时不认为违反约束
        }
    }
    
    /**
     * 🔧 新增：判断是否为法定节假日
     */
    @SuppressWarnings("unused")
    private boolean isHoliday(LocalDate date) {
        try {
            // 使用HolidayConfig来判断是否为节假日
            if (holidayConfig != null) {
                // 如果不是工作日，但是周末，则不是节假日
                if (!holidayConfig.isWorkingDay(date)) {
                    DayOfWeek dayOfWeek = date.getDayOfWeek();
                    if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
                        return false; // 周末不算节假日
                    }
                    return true; // 非工作日且非周末，认为是节假日
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * 🔧 新增：验证学员连续考试天数是否合理
     */
    @SuppressWarnings("unused")
    private boolean isValidConsecutiveDays(Student student, LocalDate date1, LocalDate date2) {
        logger.debug("=== isValidConsecutiveDays 开始检查 ===");
        logger.debug("学员: {}, 组别: {}", student.getName(), student.getGroup());
        logger.debug("首次考试日期: {}, 最后考试日期: {}", date1, date2);
        
        // �� 修复关键错误：同一天考试是违反约束的！
        if (date1.equals(date2)) {
            logger.warn("❌ 硬约束违反: 学员 {} 的两次考试安排在同一天 {}", student.getName(), date1);
            return false;  // 同一天考试违反连续两天约束
        }
        
        // 检查是否在连续的两天内
        long daysBetween = ChronoUnit.DAYS.between(date1, date2);
        logger.debug("间隔天数: {}", daysBetween);
        
        // 🔧 修复：连续两天考试的约束很简单，间隔必须正好是1天
        boolean isValid = (daysBetween == 1);
        
        if (isValid) {
            logger.debug("✅ 约束满足: 考试间隔正好1天");
        } else {
            logger.warn("❌ 硬约束违反: 学员 {} 考试间隔为{}天，不符合连续两天要求", 
                       student.getName(), daysBetween);
        }
        
        logger.debug("=== isValidConsecutiveDays 检查结束，结果: {} ===", isValid);
        return isValid;
    }
    
    /**
     * HC4: 每名考官每天只能监考一名考生
     * - 权重：9000（硬约束）
     * - 防止考官工作负荷过重
     * - 确保考试质量和公平性
     * - 检查所有考官角色（考官1、考官2、备份考官）
     * 
     * 🚀 性能优化：使用Joiners.filtering()和辅助方法简化逻辑
     */
    public Constraint noExaminerTimeConflict(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("HC4")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("noExaminerTimeConflict");
        }
        
        logger.info("✅ [HC4约束] 每名考官每天只能监考一名考生约束已启用");
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .join(ExamAssignment.class,
                    Joiners.equal(ExamAssignment::getExamDate),  // 同一天
                    Joiners.lessThan(ExamAssignment::getId),     // 避免重复
                    // 🚀 优化：在joiner中过滤，减少tuple创建
                    Joiners.filtering((a1, a2) -> hasExaminerConflict(a1, a2)))
                .penalize(getConstraintWeight("HC4", HardSoftScore.ofHard(1000000)))
                .asConstraint("noExaminerTimeConflict");
    }
    
    /**
     * 🚀 辅助方法：检查两个assignment之间是否存在考官冲突
     * 性能优化：使用提前返回减少不必要的检查
     */
    private boolean hasExaminerConflict(ExamAssignment a1, ExamAssignment a2) {
        // 检查考官1冲突
        if (examinerConflicts(a1.getExaminer1(), a2)) return true;
        // 检查考官2冲突
        if (examinerConflicts(a1.getExaminer2(), a2)) return true;
        // 检查备份考官冲突
        if (examinerConflicts(a1.getBackupExaminer(), a2)) return true;
        
        return false;
    }
    
    /**
     * 🚀 辅助方法：检查一个考官是否与另一个assignment的任何考官冲突
     * 性能优化：使用提前返回，减少不必要的ID比较
     */
    private boolean examinerConflicts(Teacher teacher, ExamAssignment assignment) {
        if (teacher == null) return false;
        
        String teacherId = teacher.getId();
        
        // 检查与考官1冲突
        if (assignment.getExaminer1() != null && 
            Objects.equals(teacherId, assignment.getExaminer1().getId())) {
            return true;
        }
        
        // 检查与考官2冲突
        if (assignment.getExaminer2() != null && 
            Objects.equals(teacherId, assignment.getExaminer2().getId())) {
            return true;
        }
        
        // 检查与备份考官冲突
        if (assignment.getBackupExaminer() != null && 
            Objects.equals(teacherId, assignment.getBackupExaminer().getId())) {
            return true;
        }
        
        return false;
    }
    

    
    /**
     * HC7: 必须有考官1和考官2两名考官，且不能同科室
     * 🔧 修复：HC7包含所有相关检查：
     * 1. 是否缺少考官1或考官2
     * 2. 考官2与学员不同科室
     * 3. 考官1和考官2不同科室
     */
    private Constraint mustHaveTwoDifferentDepartmentExaminers(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("HC7")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("mustHaveTwoDifferentDepartmentExaminers");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    // 检查是否缺少考官1或考官2
                    if (assignment.getExaminer1() == null || assignment.getExaminer2() == null) {
                        return true; // 缺少考官违反约束
                    }
                    
                    if (assignment.getStudent() == null) {
                        return false; // 学员未分配，跳过检查
                    }
                    
                    String studentDept = normalizeDepartment(assignment.getStudent().getDepartment());
                    String examiner1Dept = normalizeDepartment(assignment.getExaminer1().getDepartment());
                    String examiner2Dept = normalizeDepartment(assignment.getExaminer2().getDepartment());
                    
                    // 检测null（数据错误）- 强制违反
                    if (studentDept == null || examiner1Dept == null || examiner2Dept == null) {
                        return true;
                    }
                    
                    // 🔧 修复：HC7包含所有相关检查
                    // 1. 考官2与学员不同科室
                    boolean examiner2Valid = !Objects.equals(studentDept, examiner2Dept);
                    if (!examiner2Valid) {
                        return true; // 考官2与学员同科室，违反约束
                    }
                    
                    // 2. 考官1和考官2不同科室
                    boolean differentExaminers = !Objects.equals(examiner1Dept, examiner2Dept);
                    if (!differentExaminers) {
                        return true; // 考官1和考官2同科室，违反约束
                    }
                    
                    return false; // 无违反
                })
                .penalize(getConstraintWeight("HC7", HardSoftScore.ofHard(1000000))) // HC7权重：1000000 🔥 硬约束绝对优先
                .asConstraint("mustHaveTwoDifferentDepartmentExaminers");
    }
    
    /**
     * HC8: 备份考官不能与考官1和考官2是同一人
     */
    private Constraint backupExaminerMustBeDifferentPerson(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("HC8")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("backupExaminerMustBeDifferentPerson");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    // 如果没有备份考官，不违反约束
                    if (assignment.getBackupExaminer() == null) {
                        return false;
                    }
                    
                    // 检查备份考官是否与考官1是同一人
                    if (assignment.getExaminer1() != null &&
                        Objects.equals(assignment.getBackupExaminer().getId(), assignment.getExaminer1().getId())) {
                        return true;
                    }
                    
                    // 检查备份考官是否与考官2是同一人
                    if (assignment.getExaminer2() != null &&
                        Objects.equals(assignment.getBackupExaminer().getId(), assignment.getExaminer2().getId())) {
                        return true;
                    }
                    
                    return false;
                })
                .penalize(getConstraintWeight("HC8", HardSoftScore.ofHard(1000000))) // HC8权重：1000000 🔥 硬约束绝对优先
                .asConstraint("backupExaminerMustBeDifferentPerson");
    }
    
    /**
     * HC8b: 备份考官不能与考官1和考官2同科室 🆕
     * 
     * 业务规则：
     * - 考官一与考生同科室
     * - 考官二不能跟考官一同科室（HC7已覆盖）
     * - 备份考官不能跟考官一同科室
     * - 备份考官不能跟考官二同科室
     * 
     * 这样确保三名考官都来自不同的科室，增加评审的多样性
     */
    private Constraint backupExaminerMustBeDifferentDepartment(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("HC8b")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("backupExaminerMustBeDifferentDepartment");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    // 如果没有备份考官，不违反约束
                    if (assignment.getBackupExaminer() == null) {
                        return false;
                    }
                    
                    String backupDept = normalizeDepartment(assignment.getBackupExaminer().getDepartment());
                    if (backupDept == null) {
                        return false; // 无法判断科室，不违反约束
                    }
                    
                    // 检查备份考官是否与考官1同科室
                    if (assignment.getExaminer1() != null) {
                        String examiner1Dept = normalizeDepartment(assignment.getExaminer1().getDepartment());
                        if (Objects.equals(backupDept, examiner1Dept)) {
                            if (!PERFORMANCE_MODE) {
                                logger.info("❌ [HC8b约束] 违反: 备份考官 {} (科室:{}) 与考官1 {} (科室:{}) 同科室",
                                        assignment.getBackupExaminer().getName(), backupDept,
                                        assignment.getExaminer1().getName(), examiner1Dept);
                            }
                            return true;
                        }
                    }
                    
                    // 检查备份考官是否与考官2同科室
                    if (assignment.getExaminer2() != null) {
                        String examiner2Dept = normalizeDepartment(assignment.getExaminer2().getDepartment());
                        if (Objects.equals(backupDept, examiner2Dept)) {
                            if (!PERFORMANCE_MODE) {
                                logger.info("❌ [HC8b约束] 违反: 备份考官 {} (科室:{}) 与考官2 {} (科室:{}) 同科室",
                                        assignment.getBackupExaminer().getName(), backupDept,
                                        assignment.getExaminer2().getName(), examiner2Dept);
                            }
                            return true;
                        }
                    }
                    
                    return false;
                })
                .penalize(getConstraintWeight("HC8b", HardSoftScore.ofHard(1000000))) // HC8b权重：1000000 🔥 硬约束绝对优先
                .asConstraint("backupExaminerMustBeDifferentDepartment");
    }
    
    /**
     * HC9: 考官不可用期不能安排考试 🆕
     * - 检查考官1、考官2、备份考官是否在不可用期内
     * - 如果考官设置了不可用日期区间，在该期间内不能被分配
     * - 权重：100000（硬约束，必须满足）
     */
    private Constraint noUnavailableExaminer(ConstraintFactory constraintFactory) {
        logger.info("🚫 [HC9约束] 初始化: 考官不可用期不能安排考试约束 (权重:100000)");
        
        if (!isConstraintEnabled("HC9")) {
            logger.warn("⚠️ [HC9约束] 约束已禁用，跳过执行");
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("noUnavailableExaminer");
        }
        
        logger.info("✅ [HC9约束] 约束已启用，开始检查考官不可用期");
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    // 🚀 性能优化：直接检查，无日志
                    if (assignment.getExamDate() == null) {
                        return false;
                    }
                    
                    String examDate = assignment.getExamDate();
                    
                    // 检查考官1是否在不可用期内
                    if (assignment.getExaminer1() != null && 
                        assignment.getExaminer1().isUnavailableOnDate(examDate)) {
                        return true;
                    }
                    
                    // 检查考官2是否在不可用期内
                    if (assignment.getExaminer2() != null && 
                        assignment.getExaminer2().isUnavailableOnDate(examDate)) {
                        return true;
                    }
                    
                    // 检查备份考官是否在不可用期内
                    if (assignment.getBackupExaminer() != null && 
                        assignment.getBackupExaminer().isUnavailableOnDate(examDate)) {
                        return true;
                    }
                    
                    return false;
                })
                .penalize(getConstraintWeight("HC9", HardSoftScore.ofHard(1000000))) // HC9权重：1000000 🔥 硬约束绝对优先
                .asConstraint("noUnavailableExaminer");
    }

    
    // ==================== 软约束实现 ====================
    

    

    

    

    
    /**
     * SC10: 考官工作量均衡考量（包含连续工作惩罚）
     * 🔧 v5.5.8: 重新启用并优化性能
     */
    private Constraint balanceWorkload(ConstraintFactory constraintFactory) {
        // 🔧 修复：使用正确的约束ID SC10
        if (!isConstraintEnabled("SC10")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("balanceWorkload");
        }
        
        // 使用考官1的分配来检查连续工作模式
        return constraintFactory
                .forEach(ExamAssignment.class)
                .groupBy(assignment -> assignment.getExaminer1(), 
                        ConstraintCollectors.toList())
                .filter((teacher, assignments) -> teacher != null && assignments.size() >= 1)
                .penalize(getConstraintWeight("SC10", HardSoftScore.ofSoft(400)),
                    (teacher, assignments) -> {
                        // 🎯 v5.5.8: 优化惩罚计算，重点关注连续工作
                        int totalCount = assignments.size();
                        // 基础负荷惩罚（温和）：工作3次以上开始惩罚
                        int basePenalty = totalCount > 3 ? (totalCount - 3) * 5 : 0;
                        // 连续工作惩罚（重点）：强力惩罚连续工作
                        int consecutivePenalty = calculateConsecutiveWorkPenalty(teacher, assignments);
                        return basePenalty + consecutivePenalty;
                    })
                .asConstraint("balanceWorkload");
    }
    
    /**
     * 计算连续工作天数的惩罚分数
     * 🔧 v5.5.8: 优化性能，增强连续工作惩罚
     * 🚀 v7.1.0: 使用日期缓存进一步优化性能
     */
    private int calculateConsecutiveWorkPenalty(Teacher teacher, java.util.List<ExamAssignment> assignments) {
        int size = assignments.size();
        if (size < 2) {
            return 0; // 少于2次工作不构成连续性问题
        }
        
        // 🚀 性能优化：使用TreeSet自动排序且去重，避免额外的stream操作
        java.util.TreeSet<Long> epochDays = new java.util.TreeSet<>();
        for (int i = 0; i < size; i++) {
            String dateStr = assignments.get(i).getExamDate();
            if (dateStr != null) {
                LocalDate date = getCachedParsedDate(dateStr);
                if (date != null) {
                    epochDays.add(date.toEpochDay());
                }
            }
        }
        
        if (epochDays.size() < 2) {
            return 0;
        }
        
        int penalty = 0;
        Long prevDay = null;
        
        // 🚀 性能优化：TreeSet已排序，直接遍历
        for (Long currentDay : epochDays) {
            if (prevDay != null) {
                long daysBetween = currentDay - prevDay;
                
                // 🎯 v5.5.8: 强化间隔时间惩罚
                if (daysBetween == 1) {
                    penalty += 50;  // 连续两天：强力惩罚
                } else if (daysBetween <= 3) {
                    penalty += 20;  // 间隔2-3天：重度惩罚
                } else if (daysBetween <= 5) {
                    penalty += 8;   // 间隔4-5天：中度惩罚
                }
            }
            prevDay = currentDay;
        }
        
        return penalty;
    }
     
     /**
      * SC10b: 考官2连续工作惩罚
      * 🔧 v5.5.8: 重新启用
      */
     private Constraint balanceExaminer2Workload(ConstraintFactory constraintFactory) {
         if (!isConstraintEnabled("SC10")) {
             return constraintFactory.forEach(ExamAssignment.class)
                     .filter(assignment -> false)
                     .penalize(HardSoftScore.ZERO)
                     .asConstraint("balanceExaminer2Workload");
         }
         
         return constraintFactory
                .forEach(ExamAssignment.class)
                .groupBy(assignment -> assignment.getExaminer2(), 
                        ConstraintCollectors.toList())
                .filter((teacher, assignments) -> teacher != null && assignments.size() >= 2)
                .penalize(getConstraintWeight("SC10", HardSoftScore.ofSoft(400)),
                    (teacher, assignments) -> calculateConsecutiveWorkPenalty(teacher, assignments))
                .asConstraint("balanceExaminer2Workload");
     }
     
     /**
      * SC10c: 备份考官连续工作惩罚
      * 🔧 v5.5.8: 重新启用
      */
     private Constraint balanceBackupWorkload(ConstraintFactory constraintFactory) {
         if (!isConstraintEnabled("SC10")) {
             return constraintFactory.forEach(ExamAssignment.class)
                     .filter(assignment -> false)
                     .penalize(HardSoftScore.ZERO)
                     .asConstraint("balanceBackupWorkload");
         }
         
         return constraintFactory
                .forEach(ExamAssignment.class)
                .groupBy(assignment -> assignment.getBackupExaminer(), 
                        ConstraintCollectors.toList())
                .filter((teacher, assignments) -> teacher != null && assignments.size() >= 2)
                .penalize(getConstraintWeight("SC10", HardSoftScore.ofSoft(400)),
                    (teacher, assignments) -> calculateConsecutiveWorkPenalty(teacher, assignments))
                .asConstraint("balanceBackupWorkload");
     }
     
     /**
      * SC12: 备份考官工作量均衡考量
      * 🔧 新增：确保备份考官分配均匀，避免某个考官被过度分配为备份考官
      */
    private Constraint balanceBackupExaminerWorkload(ConstraintFactory constraintFactory) {
        // 🔧 修复：使用正确的约束ID SC12 (但在约束注册中是SC12，所以保持不变)
        if (!isConstraintEnabled("SC12")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("balanceBackupExaminerWorkload");
        }
        
        logger.info("🔧 执行备份考官工作量均衡约束 SC12");
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> assignment.getBackupExaminer() != null)
                .groupBy(ExamAssignment::getBackupExaminer, ConstraintCollectors.count())
                .penalize(getConstraintWeight("SC12", HardSoftScore.ofSoft(150)),  // 🔧 优化: 50→150 (备份考官公平性提升)
                    (backupExaminer, count) -> {
                        // 计算惩罚分数：分配次数的平方，鼓励均匀分布
                        int penalty = (int) Math.pow(count - 1, 2);
                        logger.info("🎯 备份考官 {} 被分配 {} 次，惩罚分数: {}", 
                                backupExaminer.getName(), count, penalty);
                        return penalty;
                    })
                .asConstraint("balanceBackupExaminerWorkload");
    }
    
    /**
     * SC11: 考试日期分配均衡考量
     * 尽量将考试时间均匀分配，避免集中在某些日期
     * 
     * 🔧 修复：改进日期均衡算法
     * - 计算每天的考试数量
     * - 惩罚偏离平均值的情况
     * - 权重提升到200，确保日期分布均匀
     */
    private Constraint preferLaterDates(ConstraintFactory constraintFactory) {
        // 🔧 修复：使用正确的约束ID SC11
        if (!isConstraintEnabled("SC11")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferLaterDates");
        }
        
        // 🔧 改进的日期均衡算法
        // 惩罚每天考试数量超过4个的情况（假设理想分配是每天2-4个）
        return constraintFactory
                .forEach(ExamAssignment.class)
                .groupBy(ExamAssignment::getExamDate, ConstraintCollectors.count())
                .filter((examDate, examCount) -> examCount > 4)  // 🔧 只惩罚明显过多的情况
                .penalize(getConstraintWeight("SC11", HardSoftScore.ofSoft(50)),  // 🔧 使用getConstraintWeight统一权重管理
                    (examDate, examCount) -> {
                        // 🔧 改进的惩罚函数：超过4个后，每多一个惩罚指数增加
                        int excess = examCount - 4;  // 超出的数量
                        return excess * excess * examCount;  // 指数惩罚，越集中惩罚越重
                    })
                .asConstraint("preferLaterDates");
    }
    

    
    /**
     * SC16: 智能周末降级策略（避免周末排班）
     * - 优先使用工作日，只有在工作日不够时才使用周末
     * - 权重：500（高于大部分软约束，确保工作日优先）
     * - 配合HC1约束，行政班考官周末已被硬性禁止
     * 
     * 工作原理：
     * 1. 对每个周末的排班增加500分惩罚
     * 2. OptaPlanner会优先尝试所有工作日组合
     * 3. 只有工作日确实不够时，才会使用周末
     * 4. 使用周末时，非行政班考官优先（HC1保证）
     */
    private Constraint avoidWeekendScheduling(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("SC16")) {
            logger.info("⚠️ [SC16约束] 约束已禁用，跳过执行");
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("avoidWeekendScheduling");
        }
        
        logger.info("✅ [SC16约束] 智能周末降级策略已启用 (权重:500)");
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    if (assignment.getExamDate() == null) {
                        return false;
                    }
                    
                    try {
                        LocalDate date = LocalDate.parse(assignment.getExamDate(), 
                                                        DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                        int dayOfWeek = date.getDayOfWeek().getValue();
                        
                        // 周六(6)或周日(7)返回true，触发惩罚
                        boolean isWeekend = dayOfWeek == 6 || dayOfWeek == 7;
                        
                        if (isWeekend) {
                            logger.debug("🔍 [SC16约束] 检测到周末排班: {} ({}) - 学员: {}", 
                                assignment.getExamDate(), 
                                dayOfWeek == 6 ? "周六" : "周日",
                                assignment.getStudent() != null ? assignment.getStudent().getName() : "未知");
                        }
                        
                        return isWeekend;
                    } catch (Exception e) {
                        logger.warn("⚠️ [SC16约束] 日期解析失败: {}", assignment.getExamDate());
                        return false;
                    }
                })
                .penalize(getConstraintWeight("SC16", HardSoftScore.ofSoft(500)))
                .asConstraint("avoidWeekendScheduling");
    }
    
    /**
     * SC17: 周末优先晚班考官策略
     * 
     * 业务规则：
     * - 周末安排晚班考官 → 奖励分数（晚班考官晚上值班，白天考试合理）
     * - 周末安排休息班组 → 惩罚分数（休息考官专门过来不合理）
     * - 只在周末生效
     * - 配合 SC16 使用，当必须使用周末时才生效
     * 
     * 权重：300（高优先级软约束）
     * 
     * 🔧 重要：此方法必须是纯函数，不使用logger，避免线程安全问题
     */
    private Constraint preferNightShiftOnWeekend(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("SC17")) {
            logger.info("⚠️ [SC17约束] 约束已禁用，跳过执行");
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferNightShiftOnWeekend");
        }
        
        logger.info("✅ [SC17约束] 周末优先晚班考官策略已启用 (权重:300)");
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> isWeekendAssignment(assignment))
                .reward(HardSoftScore.ofSoft(1),
                       assignment -> calculateWeekendScoreSafely(assignment))
                .asConstraint("preferNightShiftOnWeekend");
    }
    
    /**
     * 判断是否为周末排班
     * 🔧 纯函数，无副作用，无日志
     */
    private boolean isWeekendAssignment(ExamAssignment assignment) {
        if (assignment == null || assignment.getExamDate() == null) {
            return false;
        }
        
        try {
            LocalDate date = LocalDate.parse(assignment.getExamDate());
            int dayOfWeek = date.getDayOfWeek().getValue();
            return dayOfWeek == 6 || dayOfWeek == 7;
        } catch (Throwable t) {
            return false; // 静默失败
        }
    }
    
    /**
     * 计算周末考官分数 - 简化版
     * 
     * 🔧 关键改进：
     * 1. 完全无日志（避免线程安全问题）
     * 2. 简化逻辑（减少出错可能）
     * 3. 限制返回值范围（避免溢出）
     * 4. 纯函数（相同输入相同输出）
     * 
     * 评分规则：
     * - 晚班考官（考官1/2）: +300 分/人
     * - 晚班考官（备份）: +200 分
     * - 其他情况: 0 分
     */
    private int calculateWeekendScoreSafely(ExamAssignment assignment) {
        // 多层防御 - 静默失败
        if (assignment == null) return 0;
        if (assignment.getExamDate() == null) return 0;
        
        int score = 0;
        
        try {
            String dateStr = assignment.getExamDate();
            
            // 简单验证日期格式
            if (!dateStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return 0;
            }
            
            LocalDate date = LocalDate.parse(dateStr);
            
            // 检查考官1
            score += scoreExaminerSafely(assignment.getExaminer1(), date, 300);
            
            // 检查考官2
            score += scoreExaminerSafely(assignment.getExaminer2(), date, 300);
            
            // 检查备份考官
            score += scoreExaminerSafely(assignment.getBackupExaminer(), date, 200);
            
            // 限制分数范围，避免异常值
            return Math.max(-1000, Math.min(1000, score));
            
        } catch (Throwable t) {
            return 0; // 完全静默异常
        }
    }
    
    /**
     * 安全评分单个考官
     * 🔧 纯函数，无日志
     */
    private int scoreExaminerSafely(Teacher teacher, LocalDate date, int baseScore) {
        if (teacher == null || date == null) {
            return 0;
        }
        
        try {
            String group = teacher.getGroup();
            if (group == null || group.isEmpty()) {
                return 0;
            }
            
            // 检查是否为晚班考官
            if (isNightShiftGroupSafely(group, date)) {
                return baseScore; // 奖励分数
            }
            
            return 0;
            
        } catch (Throwable t) {
            return 0;
        }
    }
    
    /**
     * 判断班组在指定日期是否执勤晚班 - 简化版
     * 🔧 修复关键点：
     * 1. 无日志（避免线程安全问题）
     * 2. 精确匹配（避免字符串操作复杂性）
     * 3. 简单逻辑（减少出错可能）
     * 4. 纯函数（无副作用）
     */
    private boolean isNightShiftGroupSafely(String group, LocalDate date) {
        if (group == null || date == null) {
            return false;
        }
        
        // 行政班和无班组不参与轮转
        if ("行政班".equals(group) || "无".equals(group)) {
            return false;
        }
        
        try {
            // 基准日期：2025年9月4日（周四）
            LocalDate baseDate = LocalDate.of(2025, 9, 4);
            long daysDiff = date.toEpochDay() - baseDate.toEpochDay();
            
            // 计算循环位置 (0-3)
            int cyclePosition = (int) ((daysDiff % 4 + 4) % 4);
            
            // 精确匹配，不使用字符串操作
            switch (cyclePosition) {
                case 0: return "一组".equals(group);
                case 1: return "二组".equals(group);
                case 2: return "三组".equals(group);
                case 3: return "四组".equals(group);
                default: return false;
            }
        } catch (Throwable t) {
            return false; // 静默失败
        }
    }
    
    /**
     * 旧的方法保留但不再使用 - 移除复杂逻辑
     */
    @Deprecated
    /**
     * SC9: 允许3室与7室考官资源互通使用
     */
    private Constraint allowDept37CrossUse(ConstraintFactory constraintFactory) {
        // 🔧 修复：使用正确的约束ID SC9
        if (!isConstraintEnabled("SC9")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("allowDept37CrossUse");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    if (assignment.getStudent() == null || assignment.getExaminer1() == null) {
                        return false;
                    }
                    
                    String studentDept = normalizeDepartment(assignment.getStudent().getDepartment());
                    String examiner1Dept = normalizeDepartment(assignment.getExaminer1().getDepartment());
                    
                    // 奖励条件：3室7室互通使用
                    return (Objects.equals(studentDept, "三") && Objects.equals(examiner1Dept, "七")) ||
                           (Objects.equals(studentDept, "七") && Objects.equals(examiner1Dept, "三"));
                })
                .reward(getConstraintWeight("SC9", HardSoftScore.ofSoft(20)))  // SC9: 区域协作鼓励
                .asConstraint("allowDept37CrossUse");
    }
    

    
    // ==================== 辅助方法 ====================
    
    /**
     * 🚀 v5.5.6 性能优化：获取缓存的 DutySchedule 对象
     * 避免重复计算班次轮换，提升约束计算速度
     */
    private static DutySchedule getCachedDutySchedule(String date) {
        return dutyScheduleCache.computeIfAbsent(date, DutySchedule::forDate);
    }
    
    /**
     * 🚀 v5.5.6 性能优化：清理 DutySchedule 缓存
     * 在求解开始时调用，释放旧缓存
     */
    public static void clearDutyScheduleCache() {
        dutyScheduleCache.clear();
        logger.debug("🔄 [性能优化] 已清理 DutySchedule 缓存");
    }
    
    /**
     * 判断是否为行政班考官
     * 行政班考官：工作日上班的考官，不受四班组轮班制度限制
     * 特征：group = "行政班" 或 "无" 或为空值
     */
    private boolean isAdminTeacher(Teacher teacher) {
        if (teacher == null) {
            return false;
        }
        String group = teacher.getGroup();
        // 🔧 修复：同时支持前端的"行政班"和后端的"无"
        return group == null || "无".equals(group) || "行政班".equals(group) || group.trim().isEmpty();
    }
    
    /**
     * 科室名称标准化
     * 🔧 增强版：检测非法科室名称（考试科目等）
     * 🚀 v7.1.0: 使用缓存优化高频调用性能
     */
    private String normalizeDepartment(String department) {
        if (department == null) return null;
        
        // 🚀 性能优化：使用缓存避免重复计算
        return normalizedDepartmentCache.computeIfAbsent(department, this::doNormalizeDepartment);
    }
    
    /**
     * 科室名称标准化的实际实现
     * 🔧 从 normalizeDepartment 分离出来，用于缓存
     */
    private String doNormalizeDepartment(String department) {
        String normalized = department.trim();
        
        // 🔧 检测非法科室名称（考试科目关键词）- 使用数组静态化
        if (normalized.contains("模拟机") || normalized.contains("现场") || 
            normalized.contains("口试") || normalized.contains("理论") ||
            normalized.contains("实操") || normalized.contains("实践") || 
            normalized.contains("笔试")) {
            if (!PERFORMANCE_MODE) {
                logger.error("🚨 [数据错误] 检测到非法科室名称: \"{}\" - 这可能是考试科目，不是科室！", normalized);
            }
            return null;
        }
        
        // 🚀 优化：使用 switch 表达式替代多个 if 判断
        // 先尝试精确匹配常见格式
        // 🔧 v7.1.2修复：添加对单字符数字的支持（与ExamScheduleService保持一致）
        switch (normalized) {
            case "一": case "一室": case "1室": case "区域一室": case "第1科室": case "1": return "一";
            case "二": case "二室": case "2室": case "区域二室": case "第2科室": case "2": return "二";
            case "三": case "三室": case "3室": case "区域三室": case "第3科室": case "3": return "三";
            case "四": case "四室": case "4室": case "区域四室": case "第4科室": case "4": return "四";
            case "五": case "五室": case "5室": case "区域五室": case "第5科室": case "5": return "五";
            case "六": case "六室": case "6室": case "区域六室": case "第6科室": case "6": return "六";
            case "七": case "七室": case "7室": case "区域七室": case "第7科室": case "7": return "七";
            case "八": case "八室": case "8室": case "区域八室": case "第8科室": case "8": return "八";
            case "九": case "九室": case "9室": case "区域九室": case "第9科室": case "9": return "九";
            case "十": case "十室": case "10室": case "区域十室": case "第10科室": case "10": return "十";
        }
        
        // 回退：模糊匹配（处理非标准格式）
        if (normalized.contains("一室") || normalized.contains("1室")) return "一";
        if (normalized.contains("二室") || normalized.contains("2室")) return "二";
        if (normalized.contains("三室") || normalized.contains("3室")) return "三";
        if (normalized.contains("四室") || normalized.contains("4室")) return "四";
        if (normalized.contains("五室") || normalized.contains("5室")) return "五";
        if (normalized.contains("六室") || normalized.contains("6室")) return "六";
        if (normalized.contains("七室") || normalized.contains("7室")) return "七";
        if (normalized.contains("八室") || normalized.contains("8室")) return "八";
        if (normalized.contains("九室") || normalized.contains("9室")) return "九";
        if (normalized.contains("十室") || normalized.contains("10室")) return "十";
        
        // 🔧 如果没有匹配任何已知科室，记录警告（仅在非性能模式）
        if (!PERFORMANCE_MODE && !normalized.isEmpty() && 
            !normalized.equals("无") && !normalized.equals("未分配")) {
            logger.warn("⚠️ [数据警告] 未识别的科室名称: \"{}\" - 请检查数据是否正确", normalized);
        }
        
        return normalized;
    }
    
    /**
     * 验证考官1科室是否有效
     * 优化：增强三室七室互通机制，解决科室匹配过严问题
     */
    private boolean isValidExaminer1Department(String studentDept, String examiner1Dept) {
        if (studentDept == null || examiner1Dept == null) return false;
        
        // 同科室（优先匹配）
        if (Objects.equals(studentDept, examiner1Dept)) {
            logger.debug("✅ [HC2-MATCH] 同科室匹配: 学员{} = 考官1{}", studentDept, examiner1Dept);
            return true;
        }
        
        // 三室七室互通（特殊规则）
        if ((Objects.equals(studentDept, "三") && Objects.equals(examiner1Dept, "七")) ||
            (Objects.equals(studentDept, "七") && Objects.equals(examiner1Dept, "三"))) {
            logger.debug("✅ [HC2-CROSS] 三七室互通匹配: 学员{} ↔ 考官1{}", studentDept, examiner1Dept);
            return true;
        }
        
        logger.debug("❌ [HC2-FAIL] 科室不匹配: 学员{} vs 考官1{}", studentDept, examiner1Dept);
        return false;
    }
    
    /**
     * 🔧 优化: 考官2科室特殊匹配检查，专门针对三室七室互通
     */
    @SuppressWarnings("unused")
    private boolean isSpecialDepartmentCombination(String studentDept, String examiner2Dept) {
        if (studentDept == null || examiner2Dept == null) return false;
        
        // 考官2需要与学员不同科室，但允许三室七室特殊互通情况
        // 例如：学员在三室，考官2可以来自七室（但不能同科室）
        boolean isDifferentDept = !Objects.equals(studentDept, examiner2Dept);
        
        if (!isDifferentDept) {
            logger.debug("❌ [HC2-E2] 考官2与学员同科室，违反规则: 学员{} = 考官2{}", studentDept, examiner2Dept);
            return false; // 考官2不能与学员同科室
        }
        
        // 三室七室互通：允许更灵活的考官2分配
        if ((Objects.equals(studentDept, "三") || Objects.equals(studentDept, "七")) &&
            (Objects.equals(examiner2Dept, "三") || Objects.equals(examiner2Dept, "七"))) {
            logger.debug("✅ [HC2-E2-CROSS] 三七室区域考官2匹配: 学员{} → 考官2{}", studentDept, examiner2Dept);
            return true;
        }
        
        // 其他科室：正常的不同科室规则
        logger.debug("✅ [HC2-E2-NORMAL] 正常不同科室匹配: 学员{} → 考官2{}", studentDept, examiner2Dept);
        return true;
    }
    
    // ==================== 新增优先级约束实现 ====================
    
    /**
     * SC1: 优先安排执勤晚班的考官（第一优先级）
     * 🔧 v3.0优化：考官二的晚班优先权重更高
     * 
     * 业务规则：
     * - 考官二一定会参加考试，所以考官二满足晚班优先约束更重要
     * - 备份考官只在考官二无法参加时启用，优先级较低
     * 
     * 权重分配：
     * - 考官二晚班: +200分（最高优先，因为一定参与考试）
     * - 考官一晚班: +150分（次高优先）
     * - 备份考官晚班: +80分（较低优先，因为可能不参与）
     */
    private Constraint preferNightShiftTeachers(ConstraintFactory constraintFactory) {
        // 🔧 修复：使用正确的约束ID
        if (!isConstraintEnabled("SC1")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferNightShiftTeachers");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> assignment.getExamDate() != null)
                .reward(HardSoftScore.ofSoft(1),
                    assignment -> {
                        int totalScore = 0;
                        
                        // 🚀 v5.5.6 性能优化：使用缓存版本
                        com.examiner.scheduler.domain.DutySchedule dutySchedule = 
                            getCachedDutySchedule(assignment.getExamDate());
                        String nightShiftGroup = dutySchedule.getNightShift();
                        
                        // 🔧 检查考官1是否为晚班考官 - 权重200（考官一一定参与考试）
                        if (assignment.getExaminer1() != null && 
                            assignment.getExaminer1().getGroup() != null &&
                            Objects.equals(assignment.getExaminer1().getGroup(), nightShiftGroup)) {
                            totalScore += 200;  // 🆕 考官一和考官二权重相同
                            if (!PERFORMANCE_MODE) {
                                String logMsg = String.format("优先级决策 - 晚班考官: 考官1 %s (班组: %s) 在 %s 为晚班考官，获得+200分", 
                                        assignment.getExaminer1().getName(), 
                                        assignment.getExaminer1().getGroup(), 
                                        assignment.getExamDate());
                                logger.info(logMsg);
                                WebSocketLogPusher.logInfo(logMsg);
                            }
                        }
                        
                        // 🔧 检查考官2是否为晚班考官 - 权重200（考官二一定参与考试）
                        if (assignment.getExaminer2() != null && 
                            assignment.getExaminer2().getGroup() != null &&
                            Objects.equals(assignment.getExaminer2().getGroup(), nightShiftGroup)) {
                            totalScore += 200;  // 🆕 考官一和考官二权重相同
                            if (!PERFORMANCE_MODE) {
                                String logMsg = String.format("优先级决策 - 晚班考官: 考官2 %s (班组: %s) 在 %s 为晚班考官，获得+200分", 
                                        assignment.getExaminer2().getName(), 
                                        assignment.getExaminer2().getGroup(), 
                                        assignment.getExamDate());
                                logger.info(logMsg);
                                WebSocketLogPusher.logInfo(logMsg);
                            }
                        }
                        
                        // 🔧 检查备份考官是否为晚班考官 - 权重80（较低，因为可能不参与）
                        if (assignment.getBackupExaminer() != null &&
                            assignment.getBackupExaminer().getGroup() != null &&
                            Objects.equals(assignment.getBackupExaminer().getGroup(), nightShiftGroup)) {
                            totalScore += 80;  // 🆕 备份考官晚班权重较低
                            if (!PERFORMANCE_MODE) {
                                logger.info("优先级决策 - 晚班考官: 备份考官 {} (班组: {}) 在 {} 为晚班考官，获得+80分", 
                                        assignment.getBackupExaminer().getName(), 
                                        assignment.getBackupExaminer().getGroup(), 
                                        assignment.getExamDate());
                            }
                        }
                        
                        return totalScore;
                    })
                .asConstraint("preferNightShiftTeachers");
    }
    
    /**
     * SC3: 优先安排休息第一天的考官（第二优先级）
     * 🔧 v3.0优化：考官二的休息优先权重更高
     * 
     * 业务规则：
     * - 在晚班考官之后，优先选择休息第一天的考官
     * - 考官二一定参与考试，所以考官二满足约束更重要
     * 
     * 权重分配：
     * - 考官二休息第一天: +120分（最高优先）
     * - 考官一休息第一天: +80分（次高优先）
     * - 备份考官休息第一天: +40分（较低优先）
     */
    private Constraint preferFirstRestDayTeachers(ConstraintFactory constraintFactory) {
        // 🔧 修复：使用正确的约束ID SC3
        if (!isConstraintEnabled("SC3")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferFirstRestDayTeachers");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> assignment.getExamDate() != null)
                .reward(HardSoftScore.ofSoft(1),
                    assignment -> {
                        int totalScore = 0;
                        
                        // 🚀 v5.5.6 性能优化：使用缓存版本
                        com.examiner.scheduler.domain.DutySchedule dutySchedule = 
                            getCachedDutySchedule(assignment.getExamDate());
                        List<String> restGroups = dutySchedule.getRestGroups();
                        if (restGroups == null || restGroups.isEmpty()) {
                            return 0;
                        }
                        
                        String firstRestGroup = restGroups.get(0); // 休息第一天的班组
                        
                        // 🔧 检查考官1是否为休息第一天考官 - 权重120（考官一一定参与考试）
                        if (assignment.getExaminer1() != null && 
                            assignment.getExaminer1().getGroup() != null &&
                            Objects.equals(assignment.getExaminer1().getGroup(), firstRestGroup)) {
                            totalScore += 120;  // 🆕 考官一和考官二权重相同
                            if (!PERFORMANCE_MODE) {
                                logger.info("优先级决策 - 休息第一天考官: 考官1 {} (班组: {}) 在 {} 为休息第一天，获得+120分", 
                                        assignment.getExaminer1().getName(), 
                                        assignment.getExaminer1().getGroup(), 
                                        assignment.getExamDate());
                            }
                        }
                        
                        // 🔧 检查考官2是否为休息第一天考官 - 权重120（考官二一定参与考试）
                        if (assignment.getExaminer2() != null && 
                            assignment.getExaminer2().getGroup() != null &&
                            Objects.equals(assignment.getExaminer2().getGroup(), firstRestGroup)) {
                            totalScore += 120;  // 🆕 考官一和考官二权重相同
                            if (!PERFORMANCE_MODE) {
                                logger.info("优先级决策 - 休息第一天考官: 考官2 {} (班组: {}) 在 {} 为休息第一天，获得+120分", 
                                        assignment.getExaminer2().getName(), 
                                        assignment.getExaminer2().getGroup(), 
                                        assignment.getExamDate());
                            }
                        }
                        
                        // 🔧 检查备份考官是否为休息第一天考官 - 权重40（较低，因为可能不参与）
                        if (assignment.getBackupExaminer() != null && 
                            assignment.getBackupExaminer().getGroup() != null &&
                            Objects.equals(assignment.getBackupExaminer().getGroup(), firstRestGroup)) {
                            totalScore += 40;  // 🆕 备份考官休息权重较低
                            if (!PERFORMANCE_MODE) {
                                logger.info("优先级决策 - 休息第一天考官: 备份考官 {} (班组: {}) 在 {} 为休息第一天，获得+40分", 
                                        assignment.getBackupExaminer().getName(), 
                                        assignment.getBackupExaminer().getGroup(), 
                                        assignment.getExamDate());
                            }
                        }
                        
                        return totalScore;
                    })
                .asConstraint("preferFirstRestDayTeachers");
    }
    
    /**
     * SC5: 优先安排休息第二天的考官（第三优先级）
     * 🔧 v3.0优化：考官二的休息优先权重更高
     * 
     * 业务规则：
     * - 在休息第一天考官之后，优先选择休息第二天的考官
     * - 考官二一定参与考试，所以考官二满足约束更重要
     * 
     * 权重分配：
     * - 考官二休息第二天: +80分（最高优先）
     * - 考官一休息第二天: +60分（次高优先）
     * - 备份考官休息第二天: +30分（较低优先）
     */
    private Constraint preferSecondRestDayTeachers(ConstraintFactory constraintFactory) {
        // 🔧 修复：使用正确的约束ID SC5
        if (!isConstraintEnabled("SC5")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferSecondRestDayTeachers");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> assignment.getExamDate() != null)
                .reward(HardSoftScore.ofSoft(1),
                    assignment -> {
                        int totalScore = 0;
                        
                        // 🚀 v5.5.6 性能优化：使用缓存版本
                        com.examiner.scheduler.domain.DutySchedule dutySchedule = 
                            getCachedDutySchedule(assignment.getExamDate());
                        
                        List<String> restGroups = dutySchedule.getRestGroups();
                        if (restGroups == null || restGroups.size() < 2) {
                            return 0;
                        }
                        
                        String secondRestGroup = restGroups.get(1); // 休息第二天的班组
                        
                        // 🔧 检查考官1是否为休息第二天考官 - 权重80（考官一一定参与考试）
                        if (assignment.getExaminer1() != null && 
                            assignment.getExaminer1().getGroup() != null &&
                            Objects.equals(assignment.getExaminer1().getGroup(), secondRestGroup)) {
                            totalScore += 80;  // 🆕 考官一和考官二权重相同
                            if (!PERFORMANCE_MODE) {
                                logger.info("🎯 [SC5约束] 考官1 {} (班组:{}) 在 {} 为休息第二天，获得+80分", 
                                        assignment.getExaminer1().getName(), 
                                        assignment.getExaminer1().getGroup(), 
                                        assignment.getExamDate());
                            }
                        }
                        
                        // 🔧 检查考官2是否为休息第二天考官 - 权重80（考官二一定参与考试）
                        if (assignment.getExaminer2() != null && 
                            assignment.getExaminer2().getGroup() != null &&
                            Objects.equals(assignment.getExaminer2().getGroup(), secondRestGroup)) {
                            totalScore += 80;  // 🆕 考官一和考官二权重相同
                            if (!PERFORMANCE_MODE) {
                                logger.info("🎯 [SC5约束] 考官2 {} (班组:{}) 在 {} 为休息第二天，获得+80分", 
                                        assignment.getExaminer2().getName(), 
                                        assignment.getExaminer2().getGroup(), 
                                        assignment.getExamDate());
                            }
                        }
                        
                        // 🔧 检查备份考官是否为休息第二天考官 - 权重30（较低，因为可能不参与）
                        if (assignment.getBackupExaminer() != null &&
                            assignment.getBackupExaminer().getGroup() != null &&
                            Objects.equals(assignment.getBackupExaminer().getGroup(), secondRestGroup)) {
                            totalScore += 30;  // 🆕 备份考官休息权重较低
                            if (!PERFORMANCE_MODE) {
                                logger.info("🎯 [SC5约束] 备份考官 {} (班组:{}) 在 {} 为休息第二天，获得+30分", 
                                        assignment.getBackupExaminer().getName(), 
                                        assignment.getBackupExaminer().getGroup(), 
                                        assignment.getExamDate());
                            }
                        }
                        
                        return totalScore;
                    })
                .asConstraint("preferSecondRestDayTeachers");
    }
    
    /**
     * SC7: 行政班考官作为备份考官优先级
     * 🎯 新规则: 行政班考官优先担任备份考官，推荐科室的行政班考官优先
     */
    private Constraint preferAdminTeachers(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("SC7")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferAdminTeachers");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    if (assignment.getBackupExaminer() == null) {
                        return false;
                    }
                    
                    // 只检查备份考官是否为行政班考官
                    boolean isAdminBackup = isAdminTeacher(assignment.getBackupExaminer());
                    if (isAdminBackup) {
                        // 检查是否在推荐科室池中
                        boolean isRecommended = isInRecommendedDepartments(assignment.getBackupExaminer(), assignment.getStudent());
                        int score = isRecommended ? 80 : 40; // 推荐科室的行政班考官获得更高分
                        
                        logger.info("✅ [SC7约束] 行政班备份考官: {} (科室: {}) 推荐: {} 分数: {}", 
                                assignment.getBackupExaminer().getName(), 
                                assignment.getBackupExaminer().getDepartment(),
                                isRecommended ? "是" : "否", score);
                        return true;
                    }
                    
                    return false;
                })
                .reward(getConstraintWeight("SC7", HardSoftScore.ofSoft(60))) // 提高行政班备份考官的奖励
                .asConstraint("preferAdminTeachers");
    }
    
    /**
     * 检查考官是否在学员的推荐科室池中
     */
    private boolean isInRecommendedDepartments(Teacher teacher, Student student) {
        if (teacher == null || student == null) {
            return false;
        }
        
        String teacherDept = normalizeDepartment(teacher.getDepartment());
        
        // 检查备份考官推荐科室
        if (student.getRecommendedBackupDept() != null) {
            String backupDept = normalizeDepartment(student.getRecommendedBackupDept());
            if (Objects.equals(teacherDept, backupDept)) {
                return true;
            }
        }
        
        // 检查考官2推荐科室（行政班也可能作为考官2）
        if (student.getRecommendedExaminer2Dept() != null) {
            String examiner2Dept = normalizeDepartment(student.getRecommendedExaminer2Dept());
            if (Objects.equals(teacherDept, examiner2Dept)) {
                return true;
            }
        }
        
        // 检查考官1推荐科室（资源紧张时可能用到）
        if (student.getRecommendedExaminer1Dept() != null) {
            String examiner1Dept = normalizeDepartment(student.getRecommendedExaminer1Dept());
            if (Objects.equals(teacherDept, examiner1Dept)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * SC13: 限制行政班考官担任考官一和考官二
     * 🎯 新规则: 行政班考官优先担任备份考官，只有资源紧张时才担任主考官
     */
    private Constraint limitAdminAsMainExaminers(ConstraintFactory constraintFactory) {
        // 这是一个软约束，用于引导算法优先让行政班考官担任备份考官
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    boolean hasAdminAsMain = false;
                    
                    // 检查考官1是否为行政班考官
                    if (assignment.getExaminer1() != null && isAdminTeacher(assignment.getExaminer1())) {
                        logger.warn("⚠️ [SC13约束] 行政班考官 {} 担任考官1，建议优先安排为备份考官", 
                                assignment.getExaminer1().getName());
                        hasAdminAsMain = true;
                    }
                    
                    // 检查考官2是否为行政班考官
                    if (assignment.getExaminer2() != null && isAdminTeacher(assignment.getExaminer2())) {
                        logger.warn("⚠️ [SC13约束] 行政班考官 {} 担任考官2，建议优先安排为备份考官", 
                                assignment.getExaminer2().getName());
                        hasAdminAsMain = true;
                    }
                    
                    return hasAdminAsMain;
                })
                .penalize(getConstraintWeight("SC13", HardSoftScore.ofSoft(30))) // 适中的惩罚，允许资源紧张时使用
                .asConstraint("limitAdminAsMainExaminers");
    }
    
    /**
     * SC4: 备份考官三级降级匹配约束 🆕
     * 
     * 三级降级策略：
     * - Level 1 (理想状态): 转盘考官二 → 备份考官（精确匹配）
     * - Level 2 (第一次降级): 转盘考官一或二 → 备份考官（池内匹配）
     * - Level 3 (第二次降级): 在SC-L3约束中统一处理（Day级别至少匹配一个）
     * 
     * 权重设计：
     * - Level 1: 基础分80 + 优先级分数
     * - Level 2: 基础分50 + 优先级分数
     */
    private Constraint preferRecommendedBackupExaminer(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("SC4")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferRecommendedBackupExaminer");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    if (assignment.getStudent() == null || assignment.getBackupExaminer() == null) {
                        return false;
                    }
                    
                    String backupDept = normalizeDepartment(assignment.getBackupExaminer().getDepartment());
                    // 使用新的三级降级匹配方法
                    int matchLevel = assignment.getStudent().getBackupMatchLevel(
                        backupDept, assignment.getExamType());
                    
                    // Level 1 或 Level 2 都奖励
                    return matchLevel > 0;
                })
                .reward(getConstraintWeight("SC4", HardSoftScore.ofSoft(80)), assignment -> {
                    String backupDept = normalizeDepartment(assignment.getBackupExaminer().getDepartment());
                    int matchLevel = assignment.getStudent().getBackupMatchLevel(
                        backupDept, assignment.getExamType());
                    
                    // 根据匹配等级计算基础分
                    int baseScore;
                    switch (matchLevel) {
                        case 1:  // Level 1: 精确匹配 - 转盘考官二 → 备份考官
                            baseScore = 80;
                            break;
                        case 2:  // Level 2: 池内匹配 - 转盘考官一或二 → 备份考官
                            baseScore = 50;
                            break;
                        default:
                            baseScore = 0;
                    }
                    
                    // 叠加优先级分数
                    // 🔧 v7.1.2修复：检查日期是否为null
                    String examDateStr = assignment.getExamDate();
                    if (examDateStr == null || examDateStr.isEmpty()) {
                        return baseScore;
                    }
                    LocalDate examDate = LocalDate.parse(examDateStr);
                    int priorityScore = calculatePriorityScore(assignment.getBackupExaminer(), examDate);
                    
                    return baseScore + priorityScore;
                })
                .asConstraint("preferRecommendedBackupExaminer");
    }
    
    /**
     * SC8/SC-L3: Day级别推荐科室池匹配约束（三级降级的最低保障）🆕
     * 
     * Level 3 规则：转盘考官一或二至少在该Day的考官二或备份考官中出现一次
     * 
     * 这是三级降级策略的最后保障：
     * - 即使考官二和备份考官都没有达到L1或L2的精确/池内匹配
     * - 只要考官二或备份考官有一个在推荐科室池中，就给予基础奖励
     * 
     * 权重设计：
     * - 基础分30（低于L1和L2，但仍有激励作用）
     */
    private Constraint preferNonRecommendedBackupExaminer(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("SC8")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferNonRecommendedBackupExaminer");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    if (assignment.getStudent() == null) {
                        return false;
                    }
                    
                    // 获取考官二和备份考官的科室
                    String examiner2Dept = assignment.getExaminer2() != null 
                        ? normalizeDepartment(assignment.getExaminer2().getDepartment()) : null;
                    String backupDept = assignment.getBackupExaminer() != null 
                        ? normalizeDepartment(assignment.getBackupExaminer().getDepartment()) : null;
                    
                    // 检查是否满足Level 3：至少有一个在推荐池中
                    boolean level3Satisfied = assignment.getStudent().isDayLevel3Satisfied(examiner2Dept, backupDept);
                    
                    // 排除已经被SC2/SC4奖励的情况（L1和L2精确匹配）
                    // 只奖励那些不满足L1/L2但满足L3的情况
                    int examiner2Level = examiner2Dept != null 
                        ? assignment.getStudent().getExaminer2MatchLevel(examiner2Dept, assignment.getExamType()) : 0;
                    int backupLevel = backupDept != null 
                        ? assignment.getStudent().getBackupMatchLevel(backupDept, assignment.getExamType()) : 0;
                    
                    // 如果考官二和备份考官都没有L1/L2匹配，但整体满足L3
                    // 或者只有其中一个有L1/L2匹配，另一个在池中（提供额外激励）
                    boolean needL3Reward = level3Satisfied && (examiner2Level == 0 || backupLevel == 0);
                    
                    return needL3Reward;
                })
                .reward(getConstraintWeight("SC8", HardSoftScore.ofSoft(30)), assignment -> {
                    // Level 3: 基础分30 + 优先级分数（取考官二或备份考官中较高的）
                    int baseScore = 30;
                    
                    // 🔧 v7.1.2修复：检查日期是否为null
                    String examDateStr = assignment.getExamDate();
                    if (examDateStr == null || examDateStr.isEmpty()) {
                        return baseScore;
                    }
                    LocalDate examDate = LocalDate.parse(examDateStr);
                    
                    int priorityScore = 0;
                    if (assignment.getExaminer2() != null) {
                        priorityScore = Math.max(priorityScore, 
                            calculatePriorityScore(assignment.getExaminer2(), examDate));
                    }
                    if (assignment.getBackupExaminer() != null) {
                        priorityScore = Math.max(priorityScore, 
                            calculatePriorityScore(assignment.getBackupExaminer(), examDate));
                    }
                    
                    return baseScore + priorityScore;
                })
                .asConstraint("preferNonRecommendedBackupExaminer");
    }
    
    /**
     * SC1: 备份考官不能与考官1和考官2是同一人（软约束版本）
     * 注意：此方法已被硬约束版本 backupExaminerMustBeDifferentPerson 替代
     * 保留此方法以备将来可能的软约束需求
     */
    @SuppressWarnings("unused")
    private Constraint backupExaminerMustBeDifferentPersonSoft(ConstraintFactory constraintFactory) {
        // 🔧 修复：这个约束似乎没有在注册中使用，暂时保持SC1
        if (!isConstraintEnabled("SC1")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("backupExaminerMustBeDifferentPersonSoft");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    // 如果没有备份考官，不违反约束
                    if (assignment.getBackupExaminer() == null) {
                        return false;
                    }
                    
                    // 检查备份考官是否与考官1是同一人
                    if (assignment.getExaminer1() != null &&
                        Objects.equals(assignment.getBackupExaminer().getId(), assignment.getExaminer1().getId())) {
                        return true;
                    }
                    
                    // 检查备份考官是否与考官2是同一人
                    if (assignment.getExaminer2() != null &&
                        Objects.equals(assignment.getBackupExaminer().getId(), assignment.getExaminer2().getId())) {
                        return true;
                    }
                    
                    return false;
                })
                .penalize(getConstraintWeight("SC1", HardSoftScore.ofSoft(100))) // SC1权重：100（这是一个错误的约束，应该删除）
                .asConstraint("backupExaminerMustBeDifferentPersonSoft");
    }
    
    /**
     * 计算考官的SC1-SC4优先级分数
     * @param examiner 考官
     * @param examDate 考试日期
     * @return 优先级分数
     */
    private int calculatePriorityScore(Teacher examiner, LocalDate examDate) {
        if (examiner == null || examDate == null) {
            return 0;
        }
        
        // 🔧 修复：使用DutySchedule动态计算班组轮换状态
        String examDateStr = examDate.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        com.examiner.scheduler.domain.DutySchedule dutySchedule = 
            com.examiner.scheduler.domain.DutySchedule.forDate(examDateStr);
        
        String examinerGroup = examiner.getGroup();
        if (examinerGroup == null) {
            return 0;
        }
        
        // 🚀 性能优化：移除所有日志，直接计算
        // SC1: 晚班考官 (+100) - 最高优先级
        if (Objects.equals(examinerGroup, dutySchedule.getNightShift())) {
            return 100;
        }
        
        // SC3: 休息第一天 (+80) - 次高优先级
        List<String> restGroups = dutySchedule.getRestGroups();
        if (restGroups != null && restGroups.size() >= 1 && Objects.equals(examinerGroup, restGroups.get(0))) {
            return 80;
        }
        
        // SC5: 休息第二天 (+60) - 中等优先级
        if (restGroups != null && restGroups.size() >= 2 && Objects.equals(examinerGroup, restGroups.get(1))) {
            return 60;
        }
        
        // SC7: 行政班 (+40)
        if (isAdminTeacher(examiner)) {
            return 40;
        }
        
        return 0;
    }

    /**
     * SC2: 考官二三级降级匹配约束 🆕
     * 
     * 三级降级策略：
     * - Level 1 (理想状态): 转盘考官一 → 考官二（精确匹配）
     * - Level 2 (第一次降级): 转盘考官一或二 → 考官二（池内匹配）
     * - Level 3 (第二次降级): 在SC-L3约束中统一处理（Day级别至少匹配一个）
     * 
     * 权重设计：
     * - Level 1: 基础分100 + 优先级分数
     * - Level 2: 基础分60 + 优先级分数
     */
    private Constraint preferRecommendedExaminer2(ConstraintFactory constraintFactory) {
        if (!isConstraintEnabled("SC2")) {
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferRecommendedExaminer2");
        }
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    if (assignment.getStudent() == null || assignment.getExaminer2() == null) {
                        return false;
                    }
                    
                    String examiner2Dept = normalizeDepartment(assignment.getExaminer2().getDepartment());
                    // 使用新的三级降级匹配方法
                    int matchLevel = assignment.getStudent().getExaminer2MatchLevel(
                        examiner2Dept, assignment.getExamType());
                    
                    // Level 1 或 Level 2 都奖励
                    return matchLevel > 0;
                })
                .reward(getConstraintWeight("SC2", HardSoftScore.ofSoft(100)), assignment -> {
                    String examiner2Dept = normalizeDepartment(assignment.getExaminer2().getDepartment());
                    int matchLevel = assignment.getStudent().getExaminer2MatchLevel(
                        examiner2Dept, assignment.getExamType());
                    
                    // 根据匹配等级计算基础分
                    int baseScore;
                    switch (matchLevel) {
                        case 1:  // Level 1: 精确匹配 - 转盘考官一 → 考官二
                            baseScore = 100;
                            break;
                        case 2:  // Level 2: 池内匹配 - 转盘考官一或二 → 考官二
                            baseScore = 60;
                            break;
                        default:
                            baseScore = 0;
                    }
                    
                    // 叠加优先级分数（SC1晚班+100, SC3休息第一天+80等）
                    // 🔧 v7.1.2修复：检查日期是否为null
                    String examDateStr = assignment.getExamDate();
                    if (examDateStr == null || examDateStr.isEmpty()) {
                        return baseScore;
                    }
                    LocalDate examDate = LocalDate.parse(examDateStr);
                    int priorityScore = calculatePriorityScore(assignment.getExaminer2(), examDate);
                    
                    return baseScore + priorityScore;
                })
                .asConstraint("preferRecommendedExaminer2");
    }
    
    /**
     * SC14: 同一学员Day1和Day2考官二应来自推荐科室池中的不同科室 🆕
     * 
     * 业务规则：
     * - 如果Day1考官二选择了推荐科室池中的某一个科室（考官1推荐科室）
     * - 那么Day2考官二应该选择推荐科室池中的另一个科室（考官2推荐科室）
     * - 这样可以让学员体验到不同科室考官的评审风格
     * 
     * 实现方式：
     * - 使用join将同一学员的Day1和Day2 assignment配对
     * - 检查两个考官二的科室是否都在推荐科室池中且不同
     * - 如果满足条件，给予奖励
     * 
     * 权重：110（高优先级，仅次于SC1晚班考官和SC3休息第一天）
     * 
     * 注意：备份考官不受此约束影响，可以来自推荐科室池中的任意科室
     */
    private Constraint preferDifferentRecommendedDeptsForDay1Day2(ConstraintFactory constraintFactory) {
        logger.info("💡 [SC14约束] 初始化: Day1/Day2考官二科室互斥约束 (权重:110)");
        
        // 检查约束是否启用
        if (!isConstraintEnabled("SC14")) {
            logger.warn("⚠️ [SC14约束] 约束已禁用，跳过执行");
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferDifferentRecommendedDeptsForDay1Day2");
        }
        
        logger.info("✅ [SC14约束] 约束已启用，开始执行");
        
        // 使用join将同一学员的Day1和Day2 assignment配对
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> "day1".equals(assignment.getExamType()))  // 只处理Day1
                .join(ExamAssignment.class,
                      // 连接条件：同一个学员，但考试类型为day2
                      Joiners.equal(assignment -> assignment.getStudent().getId(), 
                                   assignment -> assignment.getStudent().getId()),
                      Joiners.filtering((day1, day2) -> "day2".equals(day2.getExamType())))
                .filter((day1Assignment, day2Assignment) -> {
                    // 检查两个assignment的考官二是否都存在
                    if (day1Assignment.getExaminer2() == null || day2Assignment.getExaminer2() == null) {
                        return false;
                    }
                    
                    Student student = day1Assignment.getStudent();
                    String day1Examiner2Dept = normalizeDepartment(day1Assignment.getExaminer2().getDepartment());
                    String day2Examiner2Dept = normalizeDepartment(day2Assignment.getExaminer2().getDepartment());
                    
                    // 获取推荐科室
                    String examiner1RecommendedDept = student.getRecommendedExaminer1Dept() != null 
                        ? normalizeDepartment(student.getRecommendedExaminer1Dept()) : null;
                    String examiner2RecommendedDept = student.getRecommendedExaminer2Dept() != null 
                        ? normalizeDepartment(student.getRecommendedExaminer2Dept()) : null;
                    
                    // 检查两个推荐科室是否都存在且不同
                    if (examiner1RecommendedDept == null || examiner2RecommendedDept == null) {
                        logger.debug("❌ [SC14约束] 学员 {} 推荐科室不完整：考官1推荐={}, 考官2推荐={}", 
                                    student.getName(), examiner1RecommendedDept, examiner2RecommendedDept);
                        return false;
                    }
                    
                    // 检查Day1考官二是否来自推荐科室池
                    boolean day1InRecommendedPool = Objects.equals(day1Examiner2Dept, examiner1RecommendedDept) || 
                                                   Objects.equals(day1Examiner2Dept, examiner2RecommendedDept);
                    
                    // 检查Day2考官二是否来自推荐科室池
                    boolean day2InRecommendedPool = Objects.equals(day2Examiner2Dept, examiner1RecommendedDept) || 
                                                   Objects.equals(day2Examiner2Dept, examiner2RecommendedDept);
                    
                    // 检查两个考官二的科室是否不同
                    boolean differentDepts = !Objects.equals(day1Examiner2Dept, day2Examiner2Dept);
                    
                    // 只有当两个考官二都来自推荐科室池，且科室不同时才奖励
                    boolean matched = day1InRecommendedPool && day2InRecommendedPool && differentDepts;
                    
                    if (matched) {
                        logger.info("✅ [SC14匹配] 学员 {} Day1考官二:{} vs Day2考官二:{} (来自不同推荐科室) | 推荐池:[{}, {}]", 
                                   student.getName(),
                                   day1Assignment.getExaminer2().getName() + "(" + day1Examiner2Dept + ")",
                                   day2Assignment.getExaminer2().getName() + "(" + day2Examiner2Dept + ")",
                                   examiner1RecommendedDept,
                                   examiner2RecommendedDept);
                        recordConstraintExecution("SC14", true, 110);
                    } else {
                        logger.debug("❌ [SC14不匹配] 学员 {} Day1考官二:{} Day2考官二:{} | " +
                                   "Day1在池中:{} Day2在池中:{} 科室不同:{}", 
                                   student.getName(),
                                   day1Examiner2Dept, day2Examiner2Dept,
                                   day1InRecommendedPool, day2InRecommendedPool, differentDepts);
                        recordConstraintExecution("SC14", false, 0);
                    }
                    
                    return matched;
                })
                .reward(getConstraintWeight("SC14", HardSoftScore.ofSoft(110)))
                .asConstraint("preferDifferentRecommendedDeptsForDay1Day2");
    }

    /**
     * SC15: 鼓励同一学员两天考试使用不同考官1 🆕
     *
     * 业务规则：
     * - 如果资源充足，优先为同一学员的两天考试分配不同的考官1
     * - 这样可以减少单个考官的连续工作压力
     * - 同时让学员体验不同考官的评审风格
     *
     * 实现方式：
     * - 使用join将同一学员的Day1和Day2 assignment配对
     * - 检查两个考官1是否为同一人
     * - 如果是同一人，给予惩罚（鼓励使用不同考官）
     *
     * 权重：60（中等优先级，低于工作量均衡但高于日期分配）
     *
     * 注意：
     * - 这是软约束，不会强制要求使用不同考官1
     * - 如果资源不足或会导致硬约束违反，OptaPlanner会保持使用同一个考官1
     * - 考官1仍然必须满足HC2约束（与学员同科室）
     */
    private Constraint encourageDifferentExaminer1ForTwoDays(ConstraintFactory constraintFactory) {
        logger.info("💡 [SC15约束] 初始化: 鼓励考官1多样性约束 (权重:60)");

        // 检查约束是否启用
        if (!isConstraintEnabled("SC15")) {
            logger.warn("⚠️ [SC15约束] 约束已禁用，跳过执行");
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("encourageDifferentExaminer1ForTwoDays");
        }

        logger.info("✅ [SC15约束] 约束已启用，开始执行");

        // 使用join将同一学员的Day1和Day2 assignment配对
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> "day1".equals(assignment.getExamType()))  // 只处理Day1
                .join(ExamAssignment.class,
                      // 连接条件：同一个学员，但考试类型为day2
                      Joiners.equal(assignment -> assignment.getStudent().getId(),
                                   assignment -> assignment.getStudent().getId()),
                      Joiners.filtering((day1, day2) -> "day2".equals(day2.getExamType())))
                .filter((day1Assignment, day2Assignment) -> {
                    // 检查两个assignment的考官1是否都存在
                    if (day1Assignment.getExaminer1() == null || day2Assignment.getExaminer1() == null) {
                        logger.debug("⚠️ [SC15约束] 学员 {} 考官1未完全分配，跳过检查",
                                    day1Assignment.getStudent().getName());
                        return false;
                    }

                    Student student = day1Assignment.getStudent();
                    Teacher day1Examiner1 = day1Assignment.getExaminer1();
                    Teacher day2Examiner1 = day2Assignment.getExaminer1();

                    // 检查两天的考官1是否为同一人
                    boolean sameExaminer = Objects.equals(day1Examiner1.getId(), day2Examiner1.getId());

                    if (sameExaminer) {
                        logger.info("⚠️ [SC15检测] 学员 {} 两天考试使用同一考官1: {} (科室:{})",
                                   student.getName(),
                                   day1Examiner1.getName(),
                                   day1Examiner1.getDepartment());
                        recordConstraintExecution("SC15", true, 60);
                    } else {
                        logger.info("✅ [SC15满足] 学员 {} 两天考试使用不同考官1: Day1={} vs Day2={}",
                                   student.getName(),
                                   day1Examiner1.getName(),
                                   day2Examiner1.getName());
                        recordConstraintExecution("SC15", false, 0);
                    }

                    return sameExaminer;
                })
                .penalize(getConstraintWeight("SC15", HardSoftScore.ofSoft(60)))
                .asConstraint("encourageDifferentExaminer1ForTwoDays");
    }

    /**
     * SC6: 其次安排非推荐科室池的考官2
     * 考官2备选方案 + SC1-SC4优先级分数叠加
     *
     * 🆕 新规则（2025-10-07）：
     * - 第一天（day1）：如果不是考官1推荐科室，则作为备选方案
     * - 第二天（day2）：如果不是考官2推荐科室，则作为备选方案
     */
    private Constraint preferNonRecommendedExaminer2(ConstraintFactory constraintFactory) {
        logger.info("💡 [SC6约束] 初始化: 考官2备选方案约束 (权重:50+优先级分)");
        
        // 🔧 修复：使用正确的约束ID SC6
        if (!isConstraintEnabled("SC6")) {
            logger.warn("⚠️ [SC6约束] 约束已禁用，跳过执行");
            return constraintFactory.forEach(ExamAssignment.class)
                    .filter(assignment -> false)
                    .penalize(HardSoftScore.ZERO)
                    .asConstraint("preferNonRecommendedExaminer2");
        }
        
        logger.info("✅ [SC6约束] 约束已启用，开始执行");
        
        return constraintFactory
                .forEach(ExamAssignment.class)
                .filter(assignment -> {
                    logger.debug("🔍 [SC6约束] 检查学员: {} 考官2: {} 考试类型: {}", 
                            assignment.getStudent() != null ? assignment.getStudent().getName() : "未知",
                            assignment.getExaminer2() != null ? assignment.getExaminer2().getName() : "未分配",
                            assignment.getExamType());
                    
                    if (assignment.getStudent() == null || assignment.getExaminer2() == null) {
                        logger.debug("❌ [SC6约束] 学员或考官2为空，跳过");
                        return false;
                    }
                    
                    String examiner2Dept = normalizeDepartment(assignment.getExaminer2().getDepartment());
                    
                    // 🆕 新逻辑：根据考试类型获取对应的推荐科室
                    String recommendedDept = assignment.getStudent().getExaminer2RecommendedDepartmentByExamType(assignment.getExamType());
                    String normalizedRecommendedDept = recommendedDept != null ? normalizeDepartment(recommendedDept) : null;
                    
                    logger.debug("🔍 [SC6约束] 考试类型: {} 推荐科室: {} 考官2科室: {}", 
                            assignment.getExamType(), normalizedRecommendedDept, examiner2Dept);
                    
                    if (normalizedRecommendedDept != null) {
                        boolean isRecommended = Objects.equals(normalizedRecommendedDept, examiner2Dept);
                        
                        if (!isRecommended) {
                            logger.info("🎯 [SC6约束] 匹配! 考官2 {} (科室:{}) 不匹配 {} 推荐科室 {}，提供备选方案", 
                                    assignment.getExaminer2().getName(), 
                                    assignment.getExaminer2().getDepartment(),
                                    assignment.getExamType(),
                                    normalizedRecommendedDept);
                            
                            // 记录匹配的统计信息
                            recordConstraintExecution("SC6", true, 50); // 基础分数，实际分数在reward中计算
                            return true;
                        } else {
                            logger.debug("❌ [SC6约束] 考官2匹配推荐科室，不符合备选方案条件");
                            recordConstraintExecution("SC6", false, 0);
                        }
                    } else {
                        logger.debug("⚠️ [SC6约束] 学员无推荐科室信息");
                        recordConstraintExecution("SC6", false, 0);
                    }
                    
                    return false;
                })
                .reward(getConstraintWeight("SC6", HardSoftScore.ofSoft(50)), assignment -> {
                    // SC6: 考官2备选方案 基础分数50 + SC1-SC5优先级分数
                    int baseScore = 50;
                    
                    // 🔧 v7.1.2修复：检查日期是否为null，避免NullPointerException
                    String examDateStr = assignment.getExamDate();
                    if (examDateStr == null || examDateStr.isEmpty()) {
                        logger.warn("⚠️ [SC6约束] 跳过计分：考试日期为空");
                        return baseScore; // 返回基础分数
                    }
                    
                    LocalDate examDate = LocalDate.parse(examDateStr);
                    int priorityScore = calculatePriorityScore(assignment.getExaminer2(), examDate);
                    int totalScore = baseScore + priorityScore;
                    
                    logger.info("📊 [SC6约束] 计分详情: 考官2 {} | 基础分数={} | 优先级分数={} | 总分数={} | 日期={}", 
                            assignment.getExaminer2().getName(), baseScore, priorityScore, totalScore, examDateStr);
                    
                    return totalScore;
                })
                .asConstraint("preferNonRecommendedExaminer2");
    }
    
    /**
     * 记录约束执行统计信息
     */
    private static void recordConstraintExecution(String constraintId, boolean matched, int score) {
        constraintExecutionCount.get(constraintId).incrementAndGet();
        if (matched) {
            constraintMatchCount.get(constraintId).incrementAndGet();
            constraintTotalScore.get(constraintId).addAndGet(score);
        }
    }
    
    /**
     * 获取约束统计汇总
     */
    public static void logConstraintStatistics() {
        logger.info("📊 [约束统计] =================== 约束执行统计汇总 ===================");
        
        String[] hardConstraints = {"HC1", "HC2", "HC3", "HC4", "HC5", "HC6", "HC7", "HC8"};
        String[] softConstraints = {"SC1", "SC2", "SC3", "SC4", "SC5", "SC6", "SC7", "SC8", "SC9", "SC10", "SC11", "SC14"};
        
        int totalExecutions = 0;
        int totalScore = 0;
        
        // 硬约束统计
        logger.info("🚫 [硬约束统计] --------------------------------");
        int hardViolations = 0;
        for (String constraint : hardConstraints) {
            int executions = constraintExecutionCount.get(constraint).get();
            int matches = constraintMatchCount.get(constraint).get();
            int score = constraintTotalScore.get(constraint).get();
            
            totalExecutions += executions;
            totalScore += score;
            hardViolations += matches;
            
            double matchRate = executions > 0 ? (double) matches / executions * 100 : 0;
            double avgScore = matches > 0 ? (double) score / matches : 0;
            
            logger.info("📊 [{}] 执行:{} 次 | 违反:{} 次 | 违反率:{:.1f}% | 总分:{} | 平均分:{:.1f}", 
                    constraint, executions, matches, matchRate, score, avgScore);
        }
        logger.info("🚫 [硬约束汇总] 总违反:{} 次", hardViolations);
        
        // 软约束统计
        logger.info("🎯 [软约束统计] --------------------------------");
        int softMatches = 0;
        for (String constraint : softConstraints) {
            int executions = constraintExecutionCount.get(constraint).get();
            int matches = constraintMatchCount.get(constraint).get();
            int score = constraintTotalScore.get(constraint).get();
            
            totalExecutions += executions;
            totalScore += score;
            softMatches += matches;
            
            double matchRate = executions > 0 ? (double) matches / executions * 100 : 0;
            double avgScore = matches > 0 ? (double) score / matches : 0;
            
            logger.info("📊 [{}] 执行:{} 次 | 匹配:{} 次 | 匹配率:{:.1f}% | 总分:{} | 平均分:{:.1f}", 
                    constraint, executions, matches, matchRate, score, avgScore);
        }
        logger.info("🎯 [软约束汇总] 总匹配:{} 次", softMatches);
        
        logger.info("📊 [总计] 约束总执行:{} 次 | 硬约束违反:{} 次 | 软约束匹配:{} 次 | 总分数:{}", 
                totalExecutions, hardViolations, softMatches, totalScore);
        logger.info("📊 [约束统计] ============================================");
        
        // 🔗 同步约束违反信息到前端
        syncConstraintViolationsToFrontend(hardViolations, softMatches, totalScore);
    }
    
    /**
     * 重置约束统计
     */
    public static void resetConstraintStatistics() {
        logger.info("🔄 [约束统计] 重置所有约束统计数据");
        String[] hardConstraints = {"HC1", "HC2", "HC3", "HC4", "HC5", "HC6", "HC7", "HC8"};
        String[] softConstraints = {"SC1", "SC2", "SC3", "SC4", "SC5", "SC6", "SC7", "SC8", "SC9", "SC10", "SC11"};
        
        // 重置硬约束统计
        for (String constraint : hardConstraints) {
            constraintExecutionCount.get(constraint).set(0);
            constraintMatchCount.get(constraint).set(0);
            constraintTotalScore.get(constraint).set(0);
        }
        
        // 重置软约束统计
        for (String constraint : softConstraints) {
            constraintExecutionCount.get(constraint).set(0);
            constraintMatchCount.get(constraint).set(0);
            constraintTotalScore.get(constraint).set(0);
        }
    }
    
    /**
     * 🔗 同步约束违反信息到前端
     */
    private static void syncConstraintViolationsToFrontend(int hardViolations, int softMatches, int totalScore) {
        try {
            // 构建约束违反统计
            Map<String, Integer> violationCounts = new HashMap<>();
            String[] hardConstraints = {"HC1", "HC2", "HC3", "HC4", "HC6", "HC7", "HC8"};
            
            for (String constraint : hardConstraints) {
                int violations = constraintMatchCount.get(constraint).get();
                if (violations > 0) {
                    violationCounts.put(constraint, violations);
                }
            }
            
            // 创建模拟的HardSoftScore（实际应用中从算法结果获取）
            HardSoftScore score = HardSoftScore.of(-Math.abs(totalScore), Math.abs(softMatches));
            
            // 构建详细违反信息（这里简化为汇总，实际可以收集具体违反案例）
            List<ConstraintViolationSyncResource.ConstraintViolationDetail> details = new ArrayList<>();
            
            // 同步到前端API
            ConstraintViolationSyncResource.updateViolationSummary(score, violationCounts, details);
            
            logger.info("🔗 [约束同步] 已同步约束违反信息到前端API");
            
        } catch (Exception e) {
            logger.warn("🔗 [约束同步] 同步约束违反信息失败: {}", e.getMessage());
        }
    }
    
    /**
     * 约束执行开始标记
     */
    public void markConstraintExecutionStart() {
        logger.info("⏱️ [算法执行] OptaPlanner约束求解开始执行");
        logger.info("🔧 [算法配置] 当前启用的约束配置:");
        
        // 记录当前启用的约束
        String[] hardConstraints = {"HC1", "HC2", "HC3", "HC4", "HC5", "HC6", "HC7", "HC8"};
        String[] softConstraints = {"SC1", "SC2", "SC3", "SC4", "SC5", "SC6", "SC7", "SC8", "SC9", "SC10", "SC11"};
        
        logger.info("📋 [硬约束配置]:");
        for (String constraint : hardConstraints) {
            boolean enabled = isConstraintEnabled(constraint);
            String status = enabled ? "✅ 启用" : "❌ 禁用";
            logger.info("  {} {}", constraint, status);
        }
        
        logger.info("📋 [软约束配置]:");
        for (String constraint : softConstraints) {
            boolean enabled = isConstraintEnabled(constraint);
            String status = enabled ? "✅ 启用" : "❌ 禁用";
            logger.info("  {} {}", constraint, status);
        }
        
        resetConstraintStatistics();
    }
    
    /**
     * 约束执行结束标记
     */
    public void markConstraintExecutionEnd() {
        logger.info("✅ [算法执行] OptaPlanner约束求解执行完毕");
        logConstraintStatistics();
    }
}
package com.examiner.scheduler.optimizer;

import com.examiner.scheduler.domain.ExamSchedule;
import org.optaplanner.core.api.solver.Solver;
import org.optaplanner.core.config.solver.SolverConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 🚀 OptaPlanner 优化使用示例
 * 
 * 演示如何使用新的优化组件来提升性能
 */
public class OptimizationExample {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(OptimizationExample.class);
    
    /**
     * 示例 1: 基础优化使用
     */
    public static ExamSchedule basicOptimizationExample(ExamSchedule problem, int studentCount) {
        LOGGER.info("🚀 [示例1] 基础优化使用");
        
        // 1. 创建高性能配置
        HighPerformanceSolverConfig hpConfig = new HighPerformanceSolverConfig();
        SolverConfig solverConfig = hpConfig.createAdaptiveSolverConfig(studentCount);
        
        // 2. 求解并生成报告
        ExamSchedule solution = hpConfig.solveWithReport(problem, solverConfig);
        
        return solution;
    }
    
    /**
     * 示例 2: 带性能监控的优化
     */
    public static ExamSchedule monitoredOptimizationExample(ExamSchedule problem, int studentCount) {
        LOGGER.info("🚀 [示例2] 带性能监控的优化");
        
        // 1. 创建配置
        HighPerformanceSolverConfig hpConfig = new HighPerformanceSolverConfig();
        SolverConfig solverConfig = hpConfig.createAdaptiveSolverConfig(studentCount);
        
        // 2. 创建性能监控器
        PerformanceMonitor<ExamSchedule> monitor = new PerformanceMonitor<>();
        monitor.startMonitoring();
        
        // 3. 创建求解器并添加监听器
        Solver<ExamSchedule> solver = hpConfig.createMonitoredSolver(solverConfig);
        solver.addEventListener(monitor);
        
        // 4. 求解前进行内存清理
        MemoryLeakPreventer.adaptiveCleanup();
        
        // 5. 求解
        ExamSchedule solution = solver.solve(problem);
        
        // 6. 打印性能报告
        monitor.printReport();
        monitor.printConstraintPerformance();
        
        // 7. 求解后清理
        MemoryLeakPreventer.manualCleanup();
        MemoryLeakPreventer.printMemoryStatistics();
        
        return solution;
    }
    
    /**
     * 示例 3: 使用缓存评估器优化约束检查
     */
    public static void cachedEvaluatorExample(ExamSchedule schedule) {
        LOGGER.info("🚀 [示例3] 缓存评估器使用");
        
        // 1. 创建缓存评估器
        CachedConstraintEvaluator evaluator = new CachedConstraintEvaluator();
        
        // 2. 构建索引（在求解前调用）
        evaluator.buildIndexes(schedule);
        
        // 3. 高性能查询
        String date = "2024-10-14";
        
        // 检查是否为节假日（缓存查询，O(1)）
        boolean isHoliday = evaluator.isHoliday(date);
        LOGGER.info("日期 {} 是否为节假日: {}", date, isHoliday);
        
        // 检查是否为周末（缓存查询，O(1)）
        boolean isWeekend = evaluator.isWeekend(date);
        LOGGER.info("日期 {} 是否为周末: {}", date, isWeekend);
        
        // 检查是否为工作日（组合查询）
        boolean isWorkday = evaluator.isWorkday(date);
        LOGGER.info("日期 {} 是否为工作日: {}", date, isWorkday);
        
        // 4. 打印缓存统计
        evaluator.printCacheStatistics();
        
        // 5. 清理缓存（可选，在不再需要时）
        evaluator.clearAllCaches();
    }
    
    /**
     * 示例 4: 内存泄漏预防
     */
    public static void memoryLeakPreventionExample() {
        LOGGER.info("🚀 [示例4] 内存泄漏预防");
        
        // 1. 存储对象到弱引用缓存
        Object heavyObject = new Object();
        MemoryLeakPreventer.putWeak("heavy_object", heavyObject);
        
        // 2. 获取对象（可能已被GC回收）
        Object retrieved = MemoryLeakPreventer.getWeak("heavy_object");
        if (retrieved != null) {
            LOGGER.info("对象仍在缓存中");
        } else {
            LOGGER.info("对象已被GC回收");
        }
        
        // 3. 检查是否需要清理
        if (MemoryLeakPreventer.needsCleanup()) {
            LOGGER.info("检测到内存压力，执行自适应清理");
            MemoryLeakPreventer.adaptiveCleanup();
        }
        
        // 4. 打印内存统计
        MemoryLeakPreventer.printMemoryStatistics();
        
        // 5. 手动触发GC（在内存紧张时）
        if (MemoryLeakPreventer.needsCleanup()) {
            MemoryLeakPreventer.suggestGC();
        }
        
        // 6. 获取缓存统计
        var stats = MemoryLeakPreventer.getCacheStatistics();
        LOGGER.info("缓存命中率: {}%", stats.get("hitRate"));
    }
    
    /**
     * 示例 5: 基准测试不同配置
     */
    public static void benchmarkExample(ExamSchedule problem) {
        LOGGER.info("🚀 [示例5] 性能基准测试");
        
        HighPerformanceSolverConfig hpConfig = new HighPerformanceSolverConfig();
        hpConfig.benchmark(problem);
    }
    
    /**
     * 示例 6: 完整的优化流程
     */
    public static ExamSchedule completeOptimizationFlow(ExamSchedule problem, int studentCount) {
        LOGGER.info("🚀 [示例6] 完整优化流程");
        
        // =============== 阶段 1: 准备 ===============
        LOGGER.info("━━━ 阶段 1: 准备 ━━━");
        
        // 1.1 清理内存
        MemoryLeakPreventer.adaptiveCleanup();
        
        // 1.2 创建缓存评估器
        CachedConstraintEvaluator evaluator = new CachedConstraintEvaluator();
        evaluator.buildIndexes(problem);
        
        // 1.3 打印初始内存状态
        MemoryLeakPreventer.printMemoryStatistics();
        
        // =============== 阶段 2: 配置 ===============
        LOGGER.info("━━━ 阶段 2: 配置求解器 ━━━");
        
        // 2.1 创建高性能配置
        HighPerformanceSolverConfig hpConfig = new HighPerformanceSolverConfig();
        SolverConfig solverConfig = hpConfig.createAdaptiveSolverConfig(studentCount);
        
        // 2.2 创建性能监控器
        PerformanceMonitor<ExamSchedule> monitor = new PerformanceMonitor<>();
        monitor.startMonitoring();
        
        // =============== 阶段 3: 求解 ===============
        LOGGER.info("━━━ 阶段 3: 求解 ━━━");
        
        // 3.1 创建求解器
        Solver<ExamSchedule> solver = hpConfig.createMonitoredSolver(solverConfig);
        solver.addEventListener(monitor);
        
        // 3.2 开始求解
        long startTime = System.currentTimeMillis();
        ExamSchedule solution = solver.solve(problem);
        long duration = System.currentTimeMillis() - startTime;
        
        LOGGER.info("✅ 求解完成，耗时: {}ms", duration);
        LOGGER.info("✅ 最终分数: {}", solution.getScore());
        
        // =============== 阶段 4: 分析 ===============
        LOGGER.info("━━━ 阶段 4: 性能分析 ━━━");
        
        // 4.1 打印性能报告
        monitor.printReport();
        monitor.printConstraintPerformance();
        
        // 4.2 打印缓存统计
        evaluator.printCacheStatistics();
        
        // 4.3 打印内存统计
        MemoryLeakPreventer.printMemoryStatistics();
        
        // =============== 阶段 5: 清理 ===============
        LOGGER.info("━━━ 阶段 5: 清理 ━━━");
        
        // 5.1 清理缓存
        evaluator.clearAllCaches();
        
        // 5.2 清理内存
        MemoryLeakPreventer.manualCleanup();
        
        // 5.3 重置监控器
        monitor.reset();
        
        LOGGER.info("✅ 完整优化流程完成");
        
        return solution;
    }
    
    /**
     * 示例 7: 快速模式 vs 标准模式 vs 精细模式
     */
    public static void compareModesExample(ExamSchedule problem) {
        LOGGER.info("🚀 [示例7] 不同模式对比");
        
        HighPerformanceSolverConfig hpConfig = new HighPerformanceSolverConfig();
        
        // 测试快速模式（3-5秒）
        LOGGER.info("━━━ 测试快速模式 ━━━");
        SolverConfig fastConfig = hpConfig.createFastSolverConfig();
        ExamSchedule fastSolution = hpConfig.solveWithReport(problem, fastConfig);
        LOGGER.info("快速模式分数: {}", fastSolution.getScore());
        
        // 测试标准模式（30-60秒）
        LOGGER.info("━━━ 测试标准模式 ━━━");
        SolverConfig standardConfig = hpConfig.createStandardSolverConfig();
        ExamSchedule standardSolution = hpConfig.solveWithReport(problem, standardConfig);
        LOGGER.info("标准模式分数: {}", standardSolution.getScore());
        
        // 测试精细模式（2-5分钟）
        LOGGER.info("━━━ 测试精细模式 ━━━");
        SolverConfig intensiveConfig = hpConfig.createIntensiveSolverConfig();
        ExamSchedule intensiveSolution = hpConfig.solveWithReport(problem, intensiveConfig);
        LOGGER.info("精细模式分数: {}", intensiveSolution.getScore());
        
        // 对比结果
        LOGGER.info("╔════════════════════════════════════════╗");
        LOGGER.info("║          模式对比结果                  ║");
        LOGGER.info("╠════════════════════════════════════════╣");
        LOGGER.info("║  快速模式: {}", fastSolution.getScore());
        LOGGER.info("║  标准模式: {}", standardSolution.getScore());
        LOGGER.info("║  精细模式: {}", intensiveSolution.getScore());
        LOGGER.info("╚════════════════════════════════════════╝");
    }
}


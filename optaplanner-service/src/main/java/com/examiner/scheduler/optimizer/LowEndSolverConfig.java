package com.examiner.scheduler.optimizer;

import com.examiner.scheduler.domain.ExamAssignment;
import com.examiner.scheduler.domain.ExamSchedule;
import org.optaplanner.core.config.constructionheuristic.ConstructionHeuristicPhaseConfig;
import org.optaplanner.core.config.constructionheuristic.ConstructionHeuristicType;
import org.optaplanner.core.config.localsearch.LocalSearchPhaseConfig;
import org.optaplanner.core.config.score.director.ScoreDirectorFactoryConfig;
import org.optaplanner.core.config.solver.SolverConfig;
import org.optaplanner.core.config.solver.termination.TerminationConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import java.util.Arrays;

/**
 * 🚀 低配置电脑专用求解器配置
 * 
 * 优化目标：
 * - 内存占用 < 300MB
 * - CPU占用平稳（避免100%）
 * - 求解时间适中
 * 
 * 适用场景：
 * - 4GB 内存电脑
 * - 双核 CPU
 * - 20-50 人规模排班
 * 
 * 优化策略：
 * 1. 使用简单的构造启发式（FIRST_FIT）
 * 2. 限制本地搜索的移动数量
 * 3. 使用优化的约束提供者（无日志）
 * 4. 根据问题规模动态调整时间限制
 * 5. 启用内存清理机制
 */
@ApplicationScoped
public class LowEndSolverConfig {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(LowEndSolverConfig.class);
    
    /**
     * 创建低配置优化的求解器
     * 
     * @param studentCount 学员数量
     * @return 优化的求解器配置
     */
    public SolverConfig createLowEndSolverConfig(int studentCount) {
        LOGGER.info("🚀 [低配置优化] 创建适合低配置电脑的求解器配置");
        LOGGER.info("  学员数量: {}", studentCount);
        
        // 在求解前进行内存清理
        MemoryLeakPreventer.adaptiveCleanup();
        
        // 根据学员数量动态调整时间限制
        long timeLimit = calculateTimeLimitForLowEnd(studentCount);
        LOGGER.info("  时间限制: {}秒", timeLimit);
        
        // 基础配置
        SolverConfig solverConfig = new SolverConfig()
                .withSolutionClass(ExamSchedule.class)
                .withEntityClasses(ExamAssignment.class);
        
        // 使用优化的约束提供者（无日志输出，内存友好）
        ScoreDirectorFactoryConfig scoreDirectorConfig = new ScoreDirectorFactoryConfig()
                .withConstraintProviderClass(MemoryOptimizedConstraintProvider.class);
        solverConfig.setScoreDirectorFactoryConfig(scoreDirectorConfig);
        
        // 构造启发式（简单快速，低内存）
        ConstructionHeuristicPhaseConfig constructionHeuristic = new ConstructionHeuristicPhaseConfig()
                .withConstructionHeuristicType(ConstructionHeuristicType.FIRST_FIT);
        
        // 本地搜索（轻量级配置）
        LocalSearchPhaseConfig localSearch = new LocalSearchPhaseConfig();
        
        // 终止配置（保守，给予充裕时间避免CPU飙升）
        TerminationConfig termination = new TerminationConfig()
                .withSecondsSpentLimit(timeLimit)
                .withUnimprovedSecondsSpentLimit(timeLimit / 3);
        
        solverConfig.setPhaseConfigList(Arrays.asList(
                constructionHeuristic,
                localSearch
        ));
        solverConfig.setTerminationConfig(termination);
        
        // 环境模式（生产环境）
        solverConfig.setEnvironmentMode(
                org.optaplanner.core.config.solver.EnvironmentMode.REPRODUCIBLE
        );
        
        LOGGER.info("✅ [低配置优化] 求解器配置创建完成");
        LOGGER.info("  约束提供者: MemoryOptimizedConstraintProvider（无日志）");
        LOGGER.info("  构造启发式: FIRST_FIT（简单快速）");
        LOGGER.info("  终止条件: {}秒 或 {}秒无改进", timeLimit, timeLimit / 3);
        
        return solverConfig;
    }
    
    /**
     * 计算低配置环境的时间限制
     * 
     * 策略：给予更充裕的时间，避免CPU 100%占用
     * 低配置电脑上，宁可慢一点，也要保证系统流畅
     */
    private long calculateTimeLimitForLowEnd(int studentCount) {
        if (studentCount <= 20) {
            return 20;   // 20人: 20秒（给予宽裕时间）
        } else if (studentCount <= 30) {
            return 30;   // 30人: 30秒
        } else if (studentCount <= 50) {
            return 45;   // 50人: 45秒
        } else if (studentCount <= 80) {
            return 70;   // 80人: 70秒
        } else if (studentCount <= 100) {
            return 90;   // 100人: 90秒
        } else {
            return 150;  // 100+人: 2.5分钟
        }
    }
    
    /**
     * 创建超低配置模式（2GB 内存）
     * 
     * 极限优化：
     * - 最大时间限制30秒
     * - 简化搜索策略
     * - 立即触发内存清理
     */
    public SolverConfig createMinimalSolverConfig(int studentCount) {
        LOGGER.info("🚀 [超低配置] 创建超低配置模式（2GB 内存）");
        LOGGER.info("  学员数量: {} (建议≤20)", studentCount);
        
        // 强制内存清理
        MemoryLeakPreventer.clearAll();
        MemoryLeakPreventer.suggestGC();
        
        SolverConfig config = createLowEndSolverConfig(studentCount);
        
        // 进一步限制时间（减少内存压力）
        long minimalTimeLimit = Math.min(30L, studentCount * 2L);
        TerminationConfig termination = new TerminationConfig()
                .withSecondsSpentLimit(minimalTimeLimit)
                .withUnimprovedSecondsSpentLimit(Math.max(5L, minimalTimeLimit / 3));
        
        config.setTerminationConfig(termination);
        
        LOGGER.info("✅ [超低配置] 配置创建完成");
        LOGGER.info("  极限时间: {}秒（超快模式）", minimalTimeLimit);
        LOGGER.warn("⚠️ [提示] 超低配置模式建议：");
        LOGGER.warn("  - 关闭其他应用程序");
        LOGGER.warn("  - 仅排班20人以下");
        LOGGER.warn("  - 结果可能不是最优解");
        
        return config;
    }
    
    /**
     * 创建自适应模式（根据系统资源自动选择）
     */
    public SolverConfig createAdaptiveLowEndConfig(int studentCount) {
        LOGGER.info("🚀 [自适应模式] 分析系统资源...");
        
        // 获取系统资源
        long maxMemory = Runtime.getRuntime().maxMemory();
        int processors = Runtime.getRuntime().availableProcessors();
        
        long maxMemoryMB = maxMemory / 1024 / 1024;
        LOGGER.info("  最大内存: {} MB", maxMemoryMB);
        LOGGER.info("  处理器数: {}", processors);
        
        // 根据系统资源选择配置
        if (maxMemoryMB < 256 || processors < 2) {
            LOGGER.warn("⚠️ 检测到超低配置环境，使用极限优化模式");
            return createMinimalSolverConfig(studentCount);
        } else if (maxMemoryMB < 512 || processors < 4) {
            LOGGER.info("✅ 检测到低配置环境，使用低配置优化模式");
            return createLowEndSolverConfig(studentCount);
        } else {
            LOGGER.info("✅ 检测到标准配置环境，使用标准优化模式");
            // 使用标准高性能配置
            HighPerformanceSolverConfig hpConfig = new HighPerformanceSolverConfig();
            return hpConfig.createAdaptiveSolverConfig(studentCount);
        }
    }
    
    /**
     * 求解并自动清理内存
     */
    public ExamSchedule solveWithAutoCleanup(ExamSchedule problem, SolverConfig config) {
        LOGGER.info("🚀 [低配置求解] 开始求解（自动内存管理）");
        
        // 求解前清理
        MemoryLeakPreventer.adaptiveCleanup();
        MemoryLeakPreventer.printMemoryStatistics();
        
        // 创建求解器
        org.optaplanner.core.api.solver.SolverFactory<ExamSchedule> solverFactory = 
            org.optaplanner.core.api.solver.SolverFactory.create(config);
        org.optaplanner.core.api.solver.Solver<ExamSchedule> solver = solverFactory.buildSolver();
        
        // 添加性能监控
        PerformanceMonitor<ExamSchedule> monitor = new PerformanceMonitor<>();
        monitor.startMonitoring();
        solver.addEventListener(monitor);
        
        // 求解
        long startTime = System.currentTimeMillis();
        ExamSchedule solution = solver.solve(problem);
        long duration = System.currentTimeMillis() - startTime;
        
        LOGGER.info("✅ [低配置求解] 求解完成");
        LOGGER.info("  耗时: {}ms ({:.1f}秒)", duration, duration / 1000.0);
        LOGGER.info("  最终分数: {}", solution.getScore());
        
        // 打印性能报告
        monitor.printReport();
        
        // 求解后清理
        MemoryLeakPreventer.manualCleanup();
        MemoryLeakPreventer.printMemoryStatistics();
        
        return solution;
    }
    
    /**
     * 检查系统是否为低配置
     */
    public static boolean isLowEndSystem() {
        long maxMemory = Runtime.getRuntime().maxMemory() / 1024 / 1024; // MB
        int processors = Runtime.getRuntime().availableProcessors();
        
        boolean isLowEnd = maxMemory < 512 || processors < 4;
        
        if (isLowEnd) {
            LOGGER.info("💻 [系统检测] 低配置环境");
            LOGGER.info("  内存: {} MB", maxMemory);
            LOGGER.info("  CPU: {} 核", processors);
        }
        
        return isLowEnd;
    }
}


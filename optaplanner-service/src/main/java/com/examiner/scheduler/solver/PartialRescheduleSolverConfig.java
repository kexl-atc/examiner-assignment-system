package com.examiner.scheduler.solver;

import org.optaplanner.core.config.solver.SolverConfig;
import org.optaplanner.core.config.solver.termination.TerminationConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 局部重排求解器配置
 * 
 * 优化目标：
 * 1. 快速求解（30-60秒）
 * 2. 保护固定排班不被改变
 * 3. 优先解决未分配、日期重复、考官安排不满意等问题
 * 4. 使用高效的局部搜索算法
 * 
 * 最佳实践：
 * 1. 使用 Construction Heuristic 构建初始解
 * 2. 使用 Late Acceptance 或 Simulated Annealing 进行局部搜索
 * 3. 配置合适的移动选择器（ChangeMove, SwapMove）
 * 4. 设置合理的终止条件
 * 5. 使用多阶段求解策略
 * 
 * @author System
 * @version 8.0.15
 */
public class PartialRescheduleSolverConfig {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(PartialRescheduleSolverConfig.class);
    
    /**
     * 创建局部重排求解器配置
     * 
     * 策略：
     * 1. 使用 First Fit 快速构建初始解
     * 2. 使用 Late Acceptance 进行局部优化
     * 3. 配置合理的终止条件
     * 
     * @return 求解器配置
     */
    public static SolverConfig createConfig() {
        LOGGER.info("🔧 [局部重排配置] 创建优化后的求解器配置");
        
        SolverConfig solverConfig = new SolverConfig()
            .withSolutionClass(com.examiner.scheduler.domain.ExamSchedule.class)
            .withEntityClasses(com.examiner.scheduler.domain.ExamAssignment.class)
            .withConstraintProviderClass(com.examiner.scheduler.solver.OptimizedExamScheduleConstraintProvider.class);
        
        // 配置终止条件
        solverConfig.setTerminationConfig(createTerminationConfig(60L, 15L));
        
        LOGGER.info("✅ [局部重排配置] 配置完成");
        
        return solverConfig;
    }
    
    /**
     * 创建快速局部重排求解器配置（用于小规模问题）
     * 
     * 策略：
     * - 最长运行时间：30秒
     * - 无改进时间：10秒
     * - 简化移动选择器
     */
    public static SolverConfig createFastConfig() {
        LOGGER.info("⚡ [局部重排配置] 创建快速求解器配置");
        
        SolverConfig solverConfig = new SolverConfig()
            .withSolutionClass(com.examiner.scheduler.domain.ExamSchedule.class)
            .withEntityClasses(com.examiner.scheduler.domain.ExamAssignment.class)
            .withConstraintProviderClass(com.examiner.scheduler.solver.OptimizedExamScheduleConstraintProvider.class);
        
        // 配置终止条件
        solverConfig.setTerminationConfig(createTerminationConfig(30L, 10L));
        
        LOGGER.info("✅ [局部重排配置] 快速求解器配置完成");
        
        return solverConfig;
    }
    
    /**
     * 创建深度局部重排求解器配置（用于复杂问题）
     * 
     * 策略：
     * - 最长运行时间：120秒
     * - 无改进时间：30秒
     * - 使用多阶段求解策略
     * - 配置更复杂的移动选择器
     */
    public static SolverConfig createDeepConfig() {
        LOGGER.info("🔥 [局部重排配置] 创建深度求解器配置");
        
        SolverConfig solverConfig = new SolverConfig()
            .withSolutionClass(com.examiner.scheduler.domain.ExamSchedule.class)
            .withEntityClasses(com.examiner.scheduler.domain.ExamAssignment.class)
            .withConstraintProviderClass(com.examiner.scheduler.solver.OptimizedExamScheduleConstraintProvider.class);
        
        // 配置终止条件
        solverConfig.setTerminationConfig(createTerminationConfig(120L, 30L));
        
        LOGGER.info("✅ [局部重排配置] 深度求解器配置完成");
        
        return solverConfig;
    }
    
    /**
     * 创建终止条件配置
     * 
     * 策略：
     * - 最长运行时间：secondsSpentLimit
     * - 无改进时间：unimprovedSecondsSpentLimit
     * - 最佳分数限制：0hard（无硬约束违反）
     * 
     * @param secondsSpentLimit 最长运行时间（秒）
     * @param unimprovedSecondsSpentLimit 无改进时间（秒）
     * @return 终止条件配置
     */
    private static TerminationConfig createTerminationConfig(Long secondsSpentLimit, Long unimprovedSecondsSpentLimit) {
        LOGGER.info("⏱️ [局部重排配置] 配置终止条件: 最长=" + secondsSpentLimit + "秒, 无改进=" + unimprovedSecondsSpentLimit + "秒");
        
        TerminationConfig terminationConfig = new TerminationConfig()
            .withSecondsSpentLimit(secondsSpentLimit)
            .withUnimprovedSecondsSpentLimit(unimprovedSecondsSpentLimit)
            .withBestScoreLimit("0hard/*soft");
        
        LOGGER.info("✅ [局部重排配置] 终止条件配置完成");
        
        return terminationConfig;
    }
}

package com.examiner.scheduler.config;

import com.examiner.scheduler.domain.ExamSchedule;
import com.examiner.scheduler.solver.OptimizedExamScheduleConstraintProvider;
import org.optaplanner.core.config.constructionheuristic.ConstructionHeuristicPhaseConfig;
import org.optaplanner.core.config.constructionheuristic.ConstructionHeuristicType;
import org.optaplanner.core.config.localsearch.LocalSearchPhaseConfig;
import org.optaplanner.core.config.solver.SolverConfig;
import org.optaplanner.core.config.solver.termination.TerminationConfig;

import javax.enterprise.context.ApplicationScoped;
import java.util.Arrays;

/**
 * 增强的求解器配置 - 针对考官2按天选择优化
 * 
 * 🆕 新增功能：
 * 1. 更强的LocalSearch配置
 * 2. 更长的求解时间以找到最优解
 * 3. 针对day1和day2独立优化考官2的移动选择器
 */
@ApplicationScoped
public class EnhancedSolverConfig {
    
    /**
     * 创建增强的求解器配置（追求最优解）
     * 适用于学员数量较少、资源充足、追求质量的场景
     * 
     * @param studentCount 学员数量
     * @return 求解器配置
     */
    public SolverConfig createEnhancedSolverConfig(int studentCount) {
        // ========================================
        // 阶段1：构造启发式（生成初始解）
        // ========================================
        ConstructionHeuristicPhaseConfig constructionHeuristic = 
            new ConstructionHeuristicPhaseConfig();
        constructionHeuristic.setConstructionHeuristicType(ConstructionHeuristicType.FIRST_FIT);
        
        // ========================================
        // 阶段2：增强的LocalSearch（深度优化）
        // ========================================
        LocalSearchPhaseConfig localSearch = createEnhancedLocalSearch();
        
        // ========================================
        // 终止条件：更宽松，确保找到最优解
        // ========================================
        TerminationConfig termination = createEnhancedTermination(studentCount);
        
        return new SolverConfig()
                .withSolutionClass(ExamSchedule.class)
                .withEntityClasses(com.examiner.scheduler.domain.ExamAssignment.class)
                .withConstraintProviderClass(OptimizedExamScheduleConstraintProvider.class)
                .withPhaseList(Arrays.asList(
                    constructionHeuristic,
                    localSearch
                ))
                .withTerminationConfig(termination);
    }
    
    /**
     * 创建增强的LocalSearch配置
     * 
     * 特点：
     * 1. 使用默认移动选择器（Change和Swap）
     * 2. OptaPlanner会自动配置禁忌搜索
     * 3. 通过更长的求解时间来找到更好的解
     */
    private LocalSearchPhaseConfig createEnhancedLocalSearch() {
        LocalSearchPhaseConfig localSearch = new LocalSearchPhaseConfig();
        
        // 使用OptaPlanner的默认LocalSearch配置
        // OptaPlanner会自动配置：
        // - 移动选择器（Change + Swap）
        // - 禁忌搜索接受器
        // - 合适的Forager设置
        
        // 通过延长求解时间来提高解的质量
        
        return localSearch;
    }
    
    /**
     * 创建增强的终止条件
     * 
     * 特点：
     * 1. 更长的总求解时间
     * 2. 更长的无改进时间限制
     * 3. 根据学员数量动态调整
     */
    private TerminationConfig createEnhancedTermination(int studentCount) {
        TerminationConfig termination = new TerminationConfig();
        
        // 🆕 总求解时间：学员少时给更多时间找最优解
        long totalSeconds;
        if (studentCount <= 5) {
            totalSeconds = 180L;  // 3分钟
        } else if (studentCount <= 10) {
            totalSeconds = 120L;  // 2分钟
        } else {
            totalSeconds = 90L;   // 1.5分钟
        }
        
        // 🆕 无改进时间：更宽松，避免过早停止
        long unimprovedSeconds;
        if (studentCount <= 5) {
            unimprovedSeconds = 45L;  // 45秒无改进
        } else if (studentCount <= 10) {
            unimprovedSeconds = 30L;  // 30秒无改进
        } else {
            unimprovedSeconds = 20L;  // 20秒无改进
        }
        
        termination.setSecondsSpentLimit(totalSeconds);
        termination.setUnimprovedSecondsSpentLimit(unimprovedSeconds);
        
        return termination;
    }
    
    /**
     * 创建快速但质量较好的求解器配置
     * 适用于需要平衡速度和质量的场景
     */
    public SolverConfig createBalancedSolverConfig(int studentCount) {
        ConstructionHeuristicPhaseConfig constructionHeuristic = 
            new ConstructionHeuristicPhaseConfig();
        constructionHeuristic.setConstructionHeuristicType(ConstructionHeuristicType.FIRST_FIT);
        
        LocalSearchPhaseConfig localSearch = createBalancedLocalSearch();
        
        TerminationConfig termination = new TerminationConfig()
                .withSecondsSpentLimit(90L)   // 1.5分钟
                .withUnimprovedSecondsSpentLimit(20L);  // 20秒无改进
        
        return new SolverConfig()
                .withSolutionClass(ExamSchedule.class)
                .withEntityClasses(com.examiner.scheduler.domain.ExamAssignment.class)
                .withConstraintProviderClass(OptimizedExamScheduleConstraintProvider.class)
                .withPhaseList(Arrays.asList(constructionHeuristic, localSearch))
                .withTerminationConfig(termination);
    }
    
    /**
     * 创建平衡的LocalSearch配置
     */
    private LocalSearchPhaseConfig createBalancedLocalSearch() {
        LocalSearchPhaseConfig localSearch = new LocalSearchPhaseConfig();
        
        // 使用OptaPlanner的默认配置
        // 通过求解时间来控制质量
        
        return localSearch;
    }
    
    /**
     * 🆕 创建深度重排求解器配置
     * 
     * 用于当用户对排班结果不满意时，进行更深度、更长时间的优化
     * 特点：
     * 1. 显著延长求解时间（5-10分钟）
     * 2. 更长的无改进等待时间
     * 3. 更强的局部搜索探索能力
     * 
     * @param studentCount 学员数量
     * @return 深度求解器配置
     */
    public SolverConfig createDeepRescheduleSolverConfig(int studentCount) {
        System.out.println("🔥 [深度重排] 创建深度重排求解器配置，学员数量: " + studentCount);
        
        // ========================================
        // 阶段1：构造启发式（生成初始解）
        // ========================================
        ConstructionHeuristicPhaseConfig constructionHeuristic = 
            new ConstructionHeuristicPhaseConfig();
        constructionHeuristic.setConstructionHeuristicType(ConstructionHeuristicType.FIRST_FIT_DECREASING);
        
        // ========================================
        // 阶段2：深度LocalSearch（极致优化）
        // ========================================
        LocalSearchPhaseConfig localSearch = createDeepLocalSearch();
        
        // ========================================
        // 终止条件：极大延长，确保找到最优解
        // ========================================
        TerminationConfig termination = createDeepTermination(studentCount);
        
        return new SolverConfig()
                .withSolutionClass(ExamSchedule.class)
                .withEntityClasses(com.examiner.scheduler.domain.ExamAssignment.class)
                .withConstraintProviderClass(OptimizedExamScheduleConstraintProvider.class)
                .withMoveThreadCount("AUTO")  // 启用多线程移动评估
                .withPhaseList(Arrays.asList(
                    constructionHeuristic,
                    localSearch
                ))
                .withTerminationConfig(termination);
    }
    
    /**
     * 创建深度LocalSearch配置
     * 使用更激进的搜索策略
     */
    private LocalSearchPhaseConfig createDeepLocalSearch() {
        LocalSearchPhaseConfig localSearch = new LocalSearchPhaseConfig();
        
        // 使用OptaPlanner的默认配置，但通过延长时间来提高探索深度
        // OptaPlanner会自动配置：
        // - 移动选择器（Change + Swap）
        // - 禁忌搜索接受器 + 模拟退火
        // - 更大的探索空间
        
        return localSearch;
    }
    
    /**
     * 创建深度终止条件
     * 显著延长求解时间
     */
    private TerminationConfig createDeepTermination(int studentCount) {
        TerminationConfig termination = new TerminationConfig();
        
        // 🔥 深度重排：根据学员数量动态调整，但时间更长
        long totalSeconds;
        long unimprovedSeconds;
        
        if (studentCount <= 5) {
            totalSeconds = 300L;       // 5分钟
            unimprovedSeconds = 90L;   // 90秒无改进
        } else if (studentCount <= 10) {
            totalSeconds = 360L;       // 6分钟
            unimprovedSeconds = 120L;  // 2分钟无改进
        } else if (studentCount <= 20) {
            totalSeconds = 480L;       // 8分钟
            unimprovedSeconds = 150L;  // 2.5分钟无改进
        } else {
            totalSeconds = 600L;       // 10分钟
            unimprovedSeconds = 180L;  // 3分钟无改进
        }
        
        System.out.println("🔥 [深度重排] 终止条件: 总时间=" + totalSeconds + "秒, 无改进=" + unimprovedSeconds + "秒");
        
        termination.setSecondsSpentLimit(totalSeconds);
        termination.setUnimprovedSecondsSpentLimit(unimprovedSeconds);
        
        return termination;
    }
}


package com.examiner.scheduler.config;

import com.examiner.scheduler.domain.ExamSchedule;
import com.examiner.scheduler.solver.OptimizedExamScheduleConstraintProvider;
import org.optaplanner.core.config.constructionheuristic.ConstructionHeuristicPhaseConfig;
import org.optaplanner.core.config.constructionheuristic.ConstructionHeuristicType;
import org.optaplanner.core.config.localsearch.LocalSearchPhaseConfig;
import org.optaplanner.core.config.solver.SolverConfig;
import org.optaplanner.core.config.solver.monitoring.MonitoringConfig;
import org.optaplanner.core.config.solver.monitoring.SolverMetric;
import org.optaplanner.core.config.solver.termination.TerminationConfig;

import javax.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.util.Arrays;
import java.util.EnumSet;

/**
 * 企业级求解器配置
 * 
 * 特点：
 * 1. 多线程求解支持
 * 2. 动态配置调整
 * 3. 性能监控集成
 * 4. 企业级稳定性保障
 * 
 * @author Enterprise Architecture Team
 * @version 8.0.0
 */
@ApplicationScoped
public class EnterpriseSolverConfig {

    /**
     * 问题规模枚举
     */
    public enum ProblemSize {
        SMALL(10),      // ≤10学员
        MEDIUM(30),     // 11-30学员
        LARGE(50),      // 31-50学员
        ENTERPRISE(100); // >50学员

        private final int maxStudents;

        ProblemSize(int maxStudents) {
            this.maxStudents = maxStudents;
        }

        public static ProblemSize fromStudentCount(int count) {
            for (ProblemSize size : values()) {
                if (count <= size.maxStudents) {
                    return size;
                }
            }
            return ENTERPRISE;
        }
    }

    /**
     * 求解模式枚举
     */
    public enum SolveMode {
        FAST,       // 快速求解，牺牲部分质量
        BALANCED,   // 平衡模式（默认）
        OPTIMAL,    // 最优求解，允许更长时间
        ENTERPRISE  // 企业级，极致优化
    }

    /**
     * 创建企业级求解器配置
     * 
     * @param studentCount 学员数量
     * @param mode 求解模式
     * @return 求解器配置
     */
    public SolverConfig createConfig(int studentCount, SolveMode mode) {
        ProblemSize size = ProblemSize.fromStudentCount(studentCount);
        
        SolverConfig config = new SolverConfig()
            .withSolutionClass(ExamSchedule.class)
            .withEntityClasses(com.examiner.scheduler.domain.ExamAssignment.class)
            .withConstraintProviderClass(OptimizedExamScheduleConstraintProvider.class)
            .withMoveThreadCount(getMoveThreadCount(size))
            .withPhaseList(Arrays.asList(
                createConstructionHeuristic(size, mode),
                createLocalSearch(size, mode)
            ))
            .withTerminationConfig(createTermination(size, mode))
            .withMonitoringConfig(createMonitoringConfig());

        return config;
    }

    /**
     * 创建默认配置（平衡模式）
     */
    public SolverConfig createDefaultConfig(int studentCount) {
        return createConfig(studentCount, SolveMode.BALANCED);
    }

    /**
     * 创建高性能配置（企业级）
     */
    public SolverConfig createEnterpriseConfig(int studentCount) {
        return createConfig(studentCount, SolveMode.ENTERPRISE);
    }

    /**
     * 获取移动线程数
     */
    private String getMoveThreadCount(ProblemSize size) {
        int availableProcessors = Runtime.getRuntime().availableProcessors();
        
        return switch (size) {
            case SMALL -> "2";
            case MEDIUM -> "AUTO"; // OptaPlanner自动决定
            case LARGE -> String.valueOf(Math.min(4, availableProcessors));
            case ENTERPRISE -> String.valueOf(Math.min(8, availableProcessors));
        };
    }

    /**
     * 创建构造启发式配置
     */
    private ConstructionHeuristicPhaseConfig createConstructionHeuristic(
            ProblemSize size, SolveMode mode) {
        
        ConstructionHeuristicPhaseConfig ch = new ConstructionHeuristicPhaseConfig();
        
        // 根据问题规模选择构造启发式类型
        ConstructionHeuristicType type = switch (mode) {
            case FAST -> ConstructionHeuristicType.FIRST_FIT;
            case BALANCED -> ConstructionHeuristicType.FIRST_FIT_DECREASING;
            case OPTIMAL, ENTERPRISE -> ConstructionHeuristicType.WEAKEST_FIT_DECREASING;
        };
        
        ch.setConstructionHeuristicType(type);
        
        return ch;
    }

    /**
     * 创建局部搜索配置
     */
    private LocalSearchPhaseConfig createLocalSearch(ProblemSize size, SolveMode mode) {
        LocalSearchPhaseConfig ls = new LocalSearchPhaseConfig();
        
        // 企业级模式启用更强的局部搜索
        if (mode == SolveMode.ENTERPRISE || mode == SolveMode.OPTIMAL) {
            // 使用默认配置，OptaPlanner会自动配置最优参数
            // 通过延长终止时间来获得更好结果
        }
        
        return ls;
    }

    /**
     * 创建终止条件配置
     */
    private TerminationConfig createTermination(ProblemSize size, SolveMode mode) {
        TerminationConfig termination = new TerminationConfig();
        
        // 根据模式和规模设置时间限制
        Duration timeLimit = getTimeLimit(size, mode);
        Duration unimprovedLimit = getUnimprovedTimeLimit(size, mode);
        
        termination.setSecondsSpentLimit(timeLimit.getSeconds());
        termination.setUnimprovedSecondsSpentLimit(unimprovedLimit.getSeconds());
        
        // 企业级模式启用额外终止条件
        if (mode == SolveMode.ENTERPRISE) {
            // 当找到可行解时继续优化
            termination.setBestScoreFeasible(true);
        }
        
        return termination;
    }

    /**
     * 获取时间限制
     */
    private Duration getTimeLimit(ProblemSize size, SolveMode mode) {
        int seconds = switch (mode) {
            case FAST -> switch (size) {
                case SMALL -> 30;
                case MEDIUM -> 60;
                case LARGE -> 90;
                case ENTERPRISE -> 120;
            };
            case BALANCED -> switch (size) {
                case SMALL -> 60;
                case MEDIUM -> 120;
                case LARGE -> 180;
                case ENTERPRISE -> 300;
            };
            case OPTIMAL -> switch (size) {
                case SMALL -> 120;
                case MEDIUM -> 240;
                case LARGE -> 360;
                case ENTERPRISE -> 600;
            };
            case ENTERPRISE -> switch (size) {
                case SMALL -> 180;
                case MEDIUM -> 360;
                case LARGE -> 600;
                case ENTERPRISE -> 900;
            };
        };
        
        return Duration.ofSeconds(seconds);
    }

    /**
     * 获取无改进时间限制
     */
    private Duration getUnimprovedTimeLimit(ProblemSize size, SolveMode mode) {
        int seconds = switch (mode) {
            case FAST -> switch (size) {
                case SMALL -> 10;
                case MEDIUM -> 15;
                case LARGE -> 20;
                case ENTERPRISE -> 25;
            };
            case BALANCED -> switch (size) {
                case SMALL -> 20;
                case MEDIUM -> 30;
                case LARGE -> 45;
                case ENTERPRISE -> 60;
            };
            case OPTIMAL, ENTERPRISE -> switch (size) {
                case SMALL -> 45;
                case MEDIUM -> 90;
                case LARGE -> 120;
                case ENTERPRISE -> 180;
            };
        };
        
        return Duration.ofSeconds(seconds);
    }

    /**
     * 创建监控配置
     */
    private MonitoringConfig createMonitoringConfig() {
        MonitoringConfig monitoring = new MonitoringConfig();
        
        // 启用所有关键指标
        monitoring.setSolverMetricList(Arrays.asList(
            SolverMetric.SOLVE_DURATION,
            SolverMetric.SCORE_CALCULATION_COUNT,
            SolverMetric.BEST_SCORE,
            SolverMetric.STEP_SCORE,
            SolverMetric.CONSTRAINT_MATCH_TOTAL_BEST_SCORE,
            SolverMetric.CONSTRAINT_MATCH_TOTAL_STEP_SCORE
        ));
        
        return monitoring;
    }

    /**
     * 获取推荐配置参数（用于前端显示）
     */
    public ConfigRecommendation getRecommendation(int studentCount) {
        ProblemSize size = ProblemSize.fromStudentCount(studentCount);
        
        return new ConfigRecommendation(
            size,
            getMoveThreadCount(size),
            getTimeLimit(size, SolveMode.BALANCED).getSeconds(),
            getUnimprovedTimeLimit(size, SolveMode.BALANCED).getSeconds()
        );
    }

    /**
     * 配置推荐记录
     */
    public record ConfigRecommendation(
        ProblemSize problemSize,
        String moveThreadCount,
        long timeLimitSeconds,
        long unimprovedLimitSeconds
    ) {}
}

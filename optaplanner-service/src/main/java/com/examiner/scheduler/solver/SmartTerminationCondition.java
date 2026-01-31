package com.examiner.scheduler.solver;

import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;
import org.optaplanner.core.impl.solver.scope.SolverScope;
import org.optaplanner.core.impl.phase.scope.AbstractPhaseScope;
import org.optaplanner.core.impl.solver.termination.AbstractTermination;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * 智能终止条件
 * 根据解的质量和收敛情况动态决定何时停止计算
 */
public class SmartTerminationCondition extends AbstractTermination<Object> {
    
    private static final long MAX_RUNTIME_MILLIS = 60000; // 60秒最大运行时间
    private static final long MIN_RUNTIME_MILLIS = 3000;  // 3秒最小运行时间
    private static final long STAGNATION_MILLIS = 10000;  // 10秒无改进停止
    private static final int SCORE_HISTORY_SIZE = 10;     // 记录最近10个分数
    
    private Instant startTime;
    private Instant lastImprovementTime;
    private final Deque<HardSoftScore> recentScores = new ArrayDeque<>();
    private HardSoftScore bestScore = null;
    
    @Override
    public boolean isSolverTerminated(SolverScope<Object> solverScope) {
        if (startTime == null) {
            startTime = Instant.now();
            lastImprovementTime = startTime;
        }
        
        Instant now = Instant.now();
        long runtimeMillis = Duration.between(startTime, now).toMillis();
        
        // 获取当前最佳分数
        HardSoftScore currentScore = (HardSoftScore) solverScope.getBestScore();
        
        // 检查是否有改进
        if (bestScore == null || currentScore.compareTo(bestScore) > 0) {
            bestScore = currentScore;
            lastImprovementTime = now;
            
            // 记录分数历史
            recentScores.addLast(currentScore);
            if (recentScores.size() > SCORE_HISTORY_SIZE) {
                recentScores.removeFirst();
            }
        }
        
        // 终止条件检查
        return shouldTerminate(currentScore, runtimeMillis, now);
    }
    
    private boolean shouldTerminate(HardSoftScore currentScore, long runtimeMillis, Instant now) {
        // 条件1：找到完美解，立即停止
        if (currentScore.hardScore() >= 0 && currentScore.softScore() >= 0) {
            logTermination("找到完美解", currentScore, runtimeMillis);
            return true;
        }
        
        // 条件2：找到可接受的解（无硬约束违反，软约束违反较少）
        if (currentScore.hardScore() >= 0 && currentScore.softScore() >= -500 && runtimeMillis >= MIN_RUNTIME_MILLIS) {
            logTermination("找到可接受解", currentScore, runtimeMillis);
            return true;
        }
        
        // 条件3：达到最大运行时间
        if (runtimeMillis >= MAX_RUNTIME_MILLIS) {
            logTermination("达到最大运行时间", currentScore, runtimeMillis);
            return true;
        }
        
        // 条件4：长时间无改进且已运行足够时间
        long stagnationMillis = Duration.between(lastImprovementTime, now).toMillis();
        if (stagnationMillis >= STAGNATION_MILLIS && runtimeMillis >= MIN_RUNTIME_MILLIS) {
            logTermination("长时间无改进", currentScore, runtimeMillis);
            return true;
        }
        
        // 条件5：智能收敛检测
        if (isConverged() && runtimeMillis >= MIN_RUNTIME_MILLIS * 2) {
            logTermination("算法已收敛", currentScore, runtimeMillis);
            return true;
        }
        
        return false;
    }
    
    /**
     * 检测算法是否已收敛
     * 通过分析最近的分数变化趋势来判断
     */
    private boolean isConverged() {
        if (recentScores.size() < SCORE_HISTORY_SIZE) {
            return false;
        }
        
        // 检查最近的分数是否变化很小
        HardSoftScore first = recentScores.peekFirst();
        HardSoftScore last = recentScores.peekLast();
        
        if (first == null || last == null) {
            return false;
        }
        
        // 如果硬约束分数没有改进且软约束改进很小，认为已收敛
        int hardImprovement = last.hardScore() - first.hardScore();
        int softImprovement = last.softScore() - first.softScore();
        
        return hardImprovement == 0 && Math.abs(softImprovement) < 100;
    }
    
    private void logTermination(String reason, HardSoftScore score, long runtimeMillis) {
        System.out.println(String.format(
            "🎯 [智能终止] %s - 分数: %s, 运行时间: %.1f秒 ⚡", 
            reason, score, runtimeMillis / 1000.0
        ));
    }
    
    @Override
    public boolean isPhaseTerminated(AbstractPhaseScope<Object> phaseScope) {
        // 阶段级别的终止条件，暂时返回false
        return false;
    }
    
    @Override
    public double calculateSolverTimeGradient(SolverScope<Object> solverScope) {
        if (startTime == null) {
            return 0.0;
        }
        
        long runtimeMillis = Duration.between(startTime, Instant.now()).toMillis();
        return Math.min(1.0, (double) runtimeMillis / MAX_RUNTIME_MILLIS);
    }
    
    @Override
    public double calculatePhaseTimeGradient(AbstractPhaseScope<Object> phaseScope) {
        // 阶段时间梯度，返回0表示不限制
        return 0.0;
    }
} 
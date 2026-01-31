package com.examiner.scheduler.solver;

import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;
import org.optaplanner.core.impl.solver.scope.SolverScope;

import java.time.Duration;
import java.time.Instant;

/**
 * 智能进度跟踪器
 * 提供更准确的进度计算和预估完成时间
 */
public class SmartProgressTracker {
    
    private final Instant startTime;
    private HardSoftScore initialScore;
    private HardSoftScore targetScore = HardSoftScore.of(0, 0); // 目标是完美解
    private HardSoftScore acceptableScore = HardSoftScore.of(0, -1000); // 可接受的解
    
    public SmartProgressTracker() {
        this.startTime = Instant.now();
    }
    
    /**
     * 计算智能进度百分比
     */
    public int calculateSmartProgress(SolverScope<?> solverScope) {
        HardSoftScore currentScore = (HardSoftScore) solverScope.getBestScore();
        
        if (initialScore == null) {
            initialScore = currentScore;
        }
        
        // 如果已经达到目标分数，返回100%
        if (currentScore.compareTo(targetScore) >= 0) {
            return 100;
        }
        
        // 如果达到可接受分数，返回95%+
        if (currentScore.compareTo(acceptableScore) >= 0) {
            return Math.min(95 + (int)(getTimeProgress() * 5), 100);
        }
        
        // 基于分数改进计算进度
        double scoreProgress = calculateScoreProgress(currentScore);
        
        // 基于时间计算进度
        double timeProgress = getTimeProgress();
        
        // 综合计算进度（分数权重70%，时间权重30%）
        double combinedProgress = scoreProgress * 0.7 + timeProgress * 0.3;
        
        return Math.min((int)(combinedProgress * 100), 95); // 最多95%，留5%给最终优化
    }
    
    /**
     * 基于分数改进计算进度
     */
    private double calculateScoreProgress(HardSoftScore currentScore) {
        if (initialScore == null || initialScore.equals(currentScore)) {
            return 0.0;
        }
        
        // 硬约束进度
        double hardProgress = 0.0;
        if (initialScore.hardScore() < 0) {
            if (currentScore.hardScore() >= 0) {
                hardProgress = 1.0; // 硬约束全部解决
            } else {
                hardProgress = (double)(currentScore.hardScore() - initialScore.hardScore()) / 
                              Math.abs(initialScore.hardScore());
            }
        } else {
            hardProgress = 1.0; // 初始就没有硬约束违反
        }
        
        // 软约束进度
        double softProgress = 0.0;
        if (initialScore.softScore() < 0) {
            if (currentScore.softScore() >= 0) {
                softProgress = 1.0; // 软约束全部解决
            } else {
                softProgress = (double)(currentScore.softScore() - initialScore.softScore()) / 
                              Math.abs(initialScore.softScore());
            }
        } else {
            softProgress = 1.0; // 初始就没有软约束违反
        }
        
        // 硬约束权重80%，软约束权重20%
        return Math.max(0.0, hardProgress * 0.8 + softProgress * 0.2);
    }
    
    /**
     * 基于时间计算进度
     */
    private double getTimeProgress() {
        long elapsedMillis = Duration.between(startTime, Instant.now()).toMillis();
        long maxTimeMillis = 45000; // 45秒最大时间
        return Math.min(1.0, (double) elapsedMillis / maxTimeMillis);
    }
    
    /**
     * 估算剩余时间（秒）
     */
    public long estimateRemainingSeconds(SolverScope<?> solverScope) {
        HardSoftScore currentScore = (HardSoftScore) solverScope.getBestScore();
        long elapsedSeconds = Duration.between(startTime, Instant.now()).toSeconds();
        
        // 如果已经找到很好的解，估算很快完成
        if (currentScore.compareTo(acceptableScore) >= 0) {
            return Math.min(5, 45 - elapsedSeconds);
        }
        
        // 基于当前进度估算
        double progress = calculateScoreProgress(currentScore);
        if (progress > 0.1) { // 有明显进展
            long estimatedTotal = (long)(elapsedSeconds / progress);
            return Math.max(0, Math.min(estimatedTotal - elapsedSeconds, 45 - elapsedSeconds));
        }
        
        // 默认估算
        return Math.max(0, 30 - elapsedSeconds);
    }
    
    /**
     * 获取当前阶段描述
     */
    public String getCurrentPhaseDescription(SolverScope<?> solverScope) {
        HardSoftScore currentScore = (HardSoftScore) solverScope.getBestScore();
        long elapsedSeconds = Duration.between(startTime, Instant.now()).toSeconds();
        
        if (currentScore.compareTo(targetScore) >= 0) {
            return "已找到完美解";
        }
        
        if (currentScore.compareTo(acceptableScore) >= 0) {
            return "正在优化细节";
        }
        
        if (currentScore.hardScore() < 0) {
            return "正在解决硬约束违反";
        }
        
        if (elapsedSeconds < 10) {
            return "正在构建初始解";
        } else if (elapsedSeconds < 25) {
            return "正在优化排班方案";
        } else {
            return "正在进行最终优化";
        }
    }
} 
package com.examiner.scheduler.optimizer;

import org.optaplanner.core.api.score.Score;
import org.optaplanner.core.api.solver.event.BestSolutionChangedEvent;
import org.optaplanner.core.api.solver.event.SolverEventListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 🎯 性能监控器
 * 
 * 功能：
 * 1. 监控求解器性能指标
 * 2. 追踪分数改进趋势
 * 3. 检测收敛状态
 * 4. 识别性能瓶颈
 * 5. 生成性能报告
 * 
 * 基于OptaPlanner BenchmarkAggregator和航空排班经验
 */
public class PerformanceMonitor<Solution_> implements SolverEventListener<Solution_> {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(PerformanceMonitor.class);
    
    // 性能指标
    private final AtomicLong scoreCalculationCount = new AtomicLong(0);
    private final AtomicLong improvementCount = new AtomicLong(0);
    private final List<ScoreImprovement> improvements = Collections.synchronizedList(new ArrayList<>());
    
    // 时间统计
    private long solverStartTime = 0;
    private long lastImprovementTime = 0;
    private Score<?> bestScore = null;
    private Score<?> initialScore = null;
    
    // 收敛检测
    private static final int CONVERGENCE_WINDOW = 10; // 最近10次改进
    private final Deque<Long> improvementTimeGaps = new LinkedList<>();
    
    // 性能基准
    private final Map<String, Long> phaseTimings = new ConcurrentHashMap<>();
    private final Map<String, Long> constraintEvaluationTimes = new ConcurrentHashMap<>();
    
    /**
     * 分数改进记录
     */
    public static class ScoreImprovement {
        public final long timestamp;
        public final long elapsedMs;
        public final Score<?> score;
        public final long calculationCount;
        
        public ScoreImprovement(long timestamp, long elapsedMs, Score<?> score, long calculationCount) {
            this.timestamp = timestamp;
            this.elapsedMs = elapsedMs;
            this.score = score;
            this.calculationCount = calculationCount;
        }
    }
    
    /**
     * 开始监控
     */
    public void startMonitoring() {
        solverStartTime = System.currentTimeMillis();
        lastImprovementTime = solverStartTime;
        LOGGER.info("🎯 [性能监控] 开始监控求解器性能");
    }
    
    @Override
    public void bestSolutionChanged(BestSolutionChangedEvent<Solution_> event) {
        long now = System.currentTimeMillis();
        Score<?> newScore = event.getNewBestScore();
        
        // 记录初始分数
        if (initialScore == null) {
            initialScore = newScore;
            LOGGER.info("📊 [性能监控] 初始分数: {}", initialScore);
        }
        
        // 检查是否有改进
        boolean improved = false;
        if (bestScore == null) {
            improved = true;
        } else {
            // 使用字符串比较作为简化方案
            try {
                String newScoreStr = newScore.toString();
                String bestScoreStr = bestScore.toString();
                // 简单的启发式：比较分数字符串
                improved = newScoreStr.compareTo(bestScoreStr) > 0;
            } catch (Exception e) {
                // 如果比较失败，假设有改进
                improved = true;
            }
        }
        
        if (improved) {
            long timeSinceLastImprovement = now - lastImprovementTime;
            long elapsedTotal = now - solverStartTime;
            
            improvements.add(new ScoreImprovement(
                now, elapsedTotal, newScore, scoreCalculationCount.get()
            ));
            
            improvementCount.incrementAndGet();
            lastImprovementTime = now;
            
            // 记录时间间隔用于收敛检测
            improvementTimeGaps.addLast(timeSinceLastImprovement);
            if (improvementTimeGaps.size() > CONVERGENCE_WINDOW) {
                improvementTimeGaps.removeFirst();
            }
            
            LOGGER.debug("✅ [性能监控] 分数改进: {} -> {} (耗时: {}ms, 间隔: {}ms)", 
                        bestScore, newScore, elapsedTotal, timeSinceLastImprovement);
            
            bestScore = newScore;
        }
        
        scoreCalculationCount.incrementAndGet();
    }
    
    /**
     * 检查是否已收敛
     * 收敛判断：最近N次改进的时间间隔越来越长，且变化率递减
     */
    public boolean hasConverged() {
        if (improvementTimeGaps.size() < CONVERGENCE_WINDOW) {
            return false;
        }
        
        // 计算最近几次改进的平均间隔
        long recentAvg = 0;
        int count = 0;
        for (Long gap : improvementTimeGaps) {
            recentAvg += gap;
            count++;
        }
        recentAvg /= count;
        
        // 如果平均间隔超过5秒，认为已收敛
        return recentAvg > 5000;
    }
    
    /**
     * 计算改进速率（每秒改进次数）
     */
    public double getImprovementRate() {
        long elapsedSeconds = (System.currentTimeMillis() - solverStartTime) / 1000;
        if (elapsedSeconds == 0) return 0;
        return (double) improvementCount.get() / elapsedSeconds;
    }
    
    /**
     * 获取自上次改进以来的时间（秒）
     */
    public long getSecondsSinceLastImprovement() {
        return (System.currentTimeMillis() - lastImprovementTime) / 1000;
    }
    
    /**
     * 获取总耗时（秒）
     */
    public long getTotalElapsedSeconds() {
        return (System.currentTimeMillis() - solverStartTime) / 1000;
    }
    
    /**
     * 生成性能报告
     */
    public PerformanceReport generateReport() {
        long totalTimeMs = System.currentTimeMillis() - solverStartTime;
        
        return new PerformanceReport(
            totalTimeMs,
            scoreCalculationCount.get(),
            improvementCount.get(),
            initialScore,
            bestScore,
            getImprovementRate(),
            hasConverged(),
            new ArrayList<>(improvements)
        );
    }
    
    /**
     * 打印性能报告
     */
    public void printReport() {
        PerformanceReport report = generateReport();
        LOGGER.info("╔════════════════════════════════════════════════════════════╗");
        LOGGER.info("║          🎯 OptaPlanner 性能监控报告                        ║");
        LOGGER.info("╠════════════════════════════════════════════════════════════╣");
        LOGGER.info("║  总耗时: {}ms ({:.2f}秒)", report.totalTimeMs, report.totalTimeMs / 1000.0);
        LOGGER.info("║  分数计算次数: {}", report.scoreCalculationCount);
        LOGGER.info("║  改进次数: {}", report.improvementCount);
        LOGGER.info("║  改进速率: {:.2f} 次/秒", report.improvementRate);
        LOGGER.info("║  初始分数: {}", report.initialScore);
        LOGGER.info("║  最终分数: {}", report.bestScore);
        
        if (report.initialScore != null && report.bestScore != null) {
            String improvement = calculateScoreImprovement(report.initialScore, report.bestScore);
            LOGGER.info("║  分数改进: {}", improvement);
        }
        
        LOGGER.info("║  收敛状态: {}", report.hasConverged ? "已收敛 ✅" : "未收敛 ⏳");
        LOGGER.info("╚════════════════════════════════════════════════════════════╝");
        
        // 打印改进历史（最近10次）
        if (!report.improvements.isEmpty()) {
            LOGGER.info("📈 [改进历史] 最近{}次分数改进:", 
                       Math.min(10, report.improvements.size()));
            
            int start = Math.max(0, report.improvements.size() - 10);
            for (int i = start; i < report.improvements.size(); i++) {
                ScoreImprovement imp = report.improvements.get(i);
                LOGGER.info("  [{}] {}ms: {} (计算次数: {})", 
                           i + 1, imp.elapsedMs, imp.score, imp.calculationCount);
            }
        }
    }
    
    /**
     * 计算分数改进百分比
     */
    private String calculateScoreImprovement(Score<?> initial, Score<?> best) {
        // 简化版本：仅比较分数字符串
        return String.format("%s -> %s", initial, best);
    }
    
    /**
     * 记录阶段耗时
     */
    public void recordPhaseTime(String phaseName, long durationMs) {
        phaseTimings.put(phaseName, durationMs);
        LOGGER.debug("⏱️ [阶段耗时] {}: {}ms", phaseName, durationMs);
    }
    
    /**
     * 记录约束评估耗时
     */
    public void recordConstraintTime(String constraintName, long durationNs) {
        constraintEvaluationTimes.merge(constraintName, durationNs, Long::sum);
    }
    
    /**
     * 打印约束评估性能
     */
    public void printConstraintPerformance() {
        if (constraintEvaluationTimes.isEmpty()) {
            return;
        }
        
        LOGGER.info("🔍 [约束性能] 各约束评估耗时:");
        
        // 按耗时排序
        constraintEvaluationTimes.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(10)
            .forEach(entry -> {
                long timeMs = entry.getValue() / 1_000_000; // ns to ms
                LOGGER.info("  {}: {}ms", entry.getKey(), timeMs);
            });
    }
    
    /**
     * 重置监控数据
     */
    public void reset() {
        scoreCalculationCount.set(0);
        improvementCount.set(0);
        improvements.clear();
        improvementTimeGaps.clear();
        phaseTimings.clear();
        constraintEvaluationTimes.clear();
        solverStartTime = 0;
        lastImprovementTime = 0;
        bestScore = null;
        initialScore = null;
        LOGGER.info("🔄 [性能监控] 监控数据已重置");
    }
    
    /**
     * 性能报告
     */
    public static class PerformanceReport {
        public final long totalTimeMs;
        public final long scoreCalculationCount;
        public final long improvementCount;
        public final Score<?> initialScore;
        public final Score<?> bestScore;
        public final double improvementRate;
        public final boolean hasConverged;
        public final List<ScoreImprovement> improvements;
        
        public PerformanceReport(
                long totalTimeMs,
                long scoreCalculationCount,
                long improvementCount,
                Score<?> initialScore,
                Score<?> bestScore,
                double improvementRate,
                boolean hasConverged,
                List<ScoreImprovement> improvements) {
            this.totalTimeMs = totalTimeMs;
            this.scoreCalculationCount = scoreCalculationCount;
            this.improvementCount = improvementCount;
            this.initialScore = initialScore;
            this.bestScore = bestScore;
            this.improvementRate = improvementRate;
            this.hasConverged = hasConverged;
            this.improvements = improvements;
        }
        
        public Map<String, Object> toMap() {
            Map<String, Object> map = new HashMap<>();
            map.put("totalTimeMs", totalTimeMs);
            map.put("scoreCalculationCount", scoreCalculationCount);
            map.put("improvementCount", improvementCount);
            map.put("initialScore", initialScore != null ? initialScore.toString() : null);
            map.put("bestScore", bestScore != null ? bestScore.toString() : null);
            map.put("improvementRate", improvementRate);
            map.put("hasConverged", hasConverged);
            return map;
        }
    }
}


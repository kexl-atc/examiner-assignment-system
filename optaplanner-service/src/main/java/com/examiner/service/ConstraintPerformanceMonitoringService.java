package com.examiner.service;

import io.quarkus.runtime.annotations.RegisterForReflection;
import javax.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * 约束性能监控服务
 * 提供约束验证和求解性能的监控、统计和分析功能
 */
@ApplicationScoped
@RegisterForReflection
public class ConstraintPerformanceMonitoringService {

    private static final Logger logger = LoggerFactory.getLogger(ConstraintPerformanceMonitoringService.class);

    // 性能指标存储
    private final Map<String, ConstraintPerformanceMetrics> constraintMetrics = new ConcurrentHashMap<>();
    private final List<ValidationRecord> validationHistory = Collections.synchronizedList(new ArrayList<>());
    private final List<SolverPerformanceRecord> solverHistory = Collections.synchronizedList(new ArrayList<>());
    
    // 统计计数器
    private final AtomicLong totalValidations = new AtomicLong(0);
    private final AtomicLong totalViolations = new AtomicLong(0);
    private final AtomicLong totalWarnings = new AtomicLong(0);
    private final AtomicLong totalSolverRuns = new AtomicLong(0);

    // 配置参数
    private static final int MAX_HISTORY_SIZE = 1000;
    private static final long PERFORMANCE_ALERT_THRESHOLD = 5000; // 5秒

    /**
     * 记录约束验证性能
     */
    public void recordValidation(long validationTime, int violationCount, int warningCount) {
        try {
            ValidationRecord record = new ValidationRecord();
            record.setTimestamp(LocalDateTime.now());
            record.setValidationTime(validationTime);
            record.setViolationCount(violationCount);
            record.setWarningCount(warningCount);

            // 添加到历史记录
            addToHistory(validationHistory, record, MAX_HISTORY_SIZE);

            // 更新统计计数器
            totalValidations.incrementAndGet();
            totalViolations.addAndGet(violationCount);
            totalWarnings.addAndGet(warningCount);

            // 检查性能警告
            if (validationTime > PERFORMANCE_ALERT_THRESHOLD) {
                logger.warn("约束验证性能警告: 验证耗时 {}ms 超过阈值 {}ms", validationTime, PERFORMANCE_ALERT_THRESHOLD);
            }

            logger.debug("记录约束验证性能: 耗时={}ms, 违规={}个, 警告={}个", validationTime, violationCount, warningCount);

        } catch (Exception e) {
            logger.error("记录约束验证性能时发生错误", e);
        }
    }

    /**
     * 记录求解器性能
     */
    public void recordSolverPerformance(String solverId, long solverTime, String bestScore, int constraintMatchCount) {
        try {
            SolverPerformanceRecord record = new SolverPerformanceRecord();
            record.setSolverId(solverId);
            record.setTimestamp(LocalDateTime.now());
            record.setSolverTime(solverTime);
            record.setBestScore(bestScore);
            record.setConstraintMatchCount(constraintMatchCount);

            // 添加到历史记录
            addToHistory(solverHistory, record, MAX_HISTORY_SIZE);

            // 更新统计计数器
            totalSolverRuns.incrementAndGet();

            logger.debug("记录求解器性能: ID={}, 耗时={}ms, 最佳分数={}, 约束匹配={}个", 
                        solverId, solverTime, bestScore, constraintMatchCount);

        } catch (Exception e) {
            logger.error("记录求解器性能时发生错误", e);
        }
    }

    /**
     * 记录单个约束性能
     */
    public void recordConstraintPerformance(String constraintId, long executionTime, int matchCount, double averageWeight) {
        try {
            ConstraintPerformanceMetrics metrics = constraintMetrics.computeIfAbsent(constraintId, 
                k -> new ConstraintPerformanceMetrics(constraintId));

            metrics.addExecution(executionTime, matchCount, averageWeight);

            logger.debug("记录约束性能: ID={}, 执行时间={}ms, 匹配数={}个, 平均权重={}", 
                        constraintId, executionTime, matchCount, averageWeight);

        } catch (Exception e) {
            logger.error("记录约束性能时发生错误: constraintId={}", constraintId, e);
        }
    }

    /**
     * 获取性能统计报告
     */
    public PerformanceReport getPerformanceReport() {
        try {
            PerformanceReport report = new PerformanceReport();
            report.setGeneratedAt(LocalDateTime.now());

            // 基础统计
            report.setTotalValidations(totalValidations.get());
            report.setTotalViolations(totalViolations.get());
            report.setTotalWarnings(totalWarnings.get());
            report.setTotalSolverRuns(totalSolverRuns.get());

            // 验证性能统计
            if (!validationHistory.isEmpty()) {
                ValidationStatistics validationStats = calculateValidationStatistics();
                report.setValidationStatistics(validationStats);
            }

            // 求解器性能统计
            if (!solverHistory.isEmpty()) {
                SolverStatistics solverStats = calculateSolverStatistics();
                report.setSolverStatistics(solverStats);
            }

            // 约束性能统计
            Map<String, ConstraintPerformanceMetrics> constraintStats = new HashMap<>(constraintMetrics);
            report.setConstraintMetrics(constraintStats);

            // 性能趋势分析
            PerformanceTrend trend = analyzePerformanceTrend();
            report.setPerformanceTrend(trend);

            logger.info("生成性能报告: 验证={}次, 违规={}个, 警告={}个, 求解={}次", 
                       report.getTotalValidations(), report.getTotalViolations(), 
                       report.getTotalWarnings(), report.getTotalSolverRuns());

            return report;

        } catch (Exception e) {
            logger.error("生成性能报告时发生错误", e);
            
            // 返回基础报告
            PerformanceReport errorReport = new PerformanceReport();
            errorReport.setGeneratedAt(LocalDateTime.now());
            errorReport.setTotalValidations(totalValidations.get());
            errorReport.setTotalViolations(totalViolations.get());
            errorReport.setTotalWarnings(totalWarnings.get());
            errorReport.setTotalSolverRuns(totalSolverRuns.get());
            
            return errorReport;
        }
    }

    /**
     * 获取约束性能排名
     */
    public List<ConstraintPerformanceRanking> getConstraintPerformanceRanking() {
        try {
            return constraintMetrics.values().stream()
                .map(metrics -> {
                    ConstraintPerformanceRanking ranking = new ConstraintPerformanceRanking();
                    ranking.setConstraintId(metrics.getConstraintId());
                    ranking.setAverageExecutionTime(metrics.getAverageExecutionTime());
                    ranking.setTotalExecutions(metrics.getTotalExecutions());
                    ranking.setAverageMatchCount(metrics.getAverageMatchCount());
                    ranking.setPerformanceScore(calculatePerformanceScore(metrics));
                    return ranking;
                })
                .sorted((r1, r2) -> Double.compare(r2.getPerformanceScore(), r1.getPerformanceScore()))
                .collect(Collectors.toList());

        } catch (Exception e) {
            logger.error("获取约束性能排名时发生错误", e);
            return new ArrayList<>();
        }
    }

    /**
     * 获取性能指标
     */
    public Map<String, ConstraintPerformanceMetrics> getPerformanceMetrics() {
        try {
            return new HashMap<>(constraintMetrics);
        } catch (Exception e) {
            logger.error("获取性能指标时发生错误", e);
            return new HashMap<>();
        }
    }

    /**
     * 清理历史数据
     */
    public void cleanupHistory(int daysToKeep) {
        try {
            LocalDateTime cutoffTime = LocalDateTime.now().minusDays(daysToKeep);

            // 清理验证历史
            validationHistory.removeIf(record -> record.getTimestamp().isBefore(cutoffTime));

            // 清理求解器历史
            solverHistory.removeIf(record -> record.getTimestamp().isBefore(cutoffTime));

            // 清理约束指标历史
            constraintMetrics.values().forEach(metrics -> metrics.cleanupHistory(cutoffTime));

            logger.info("清理历史数据完成: 保留{}天内的数据", daysToKeep);

        } catch (Exception e) {
            logger.error("清理历史数据时发生错误", e);
        }
    }

    /**
     * 重置所有统计数据
     */
    public void resetStatistics() {
        try {
            validationHistory.clear();
            solverHistory.clear();
            constraintMetrics.clear();
            
            totalValidations.set(0);
            totalViolations.set(0);
            totalWarnings.set(0);
            totalSolverRuns.set(0);

            logger.info("重置所有统计数据完成");

        } catch (Exception e) {
            logger.error("重置统计数据时发生错误", e);
        }
    }

    // 私有辅助方法

    private <T> void addToHistory(List<T> history, T record, int maxSize) {
        history.add(record);
        if (history.size() > maxSize) {
            history.remove(0);
        }
    }

    private ValidationStatistics calculateValidationStatistics() {
        ValidationStatistics stats = new ValidationStatistics();
        
        List<Long> validationTimes = validationHistory.stream()
            .map(ValidationRecord::getValidationTime)
            .collect(Collectors.toList());

        stats.setAverageValidationTime(validationTimes.stream().mapToLong(Long::longValue).average().orElse(0));
        stats.setMinValidationTime(validationTimes.stream().mapToLong(Long::longValue).min().orElse(0));
        stats.setMaxValidationTime(validationTimes.stream().mapToLong(Long::longValue).max().orElse(0));

        List<Integer> violationCounts = validationHistory.stream()
            .map(ValidationRecord::getViolationCount)
            .collect(Collectors.toList());

        stats.setAverageViolationCount(violationCounts.stream().mapToInt(Integer::intValue).average().orElse(0));
        stats.setMaxViolationCount(violationCounts.stream().mapToInt(Integer::intValue).max().orElse(0));

        return stats;
    }

    private SolverStatistics calculateSolverStatistics() {
        SolverStatistics stats = new SolverStatistics();
        
        List<Long> solverTimes = solverHistory.stream()
            .map(SolverPerformanceRecord::getSolverTime)
            .collect(Collectors.toList());

        stats.setAverageSolverTime(solverTimes.stream().mapToLong(Long::longValue).average().orElse(0));
        stats.setMinSolverTime(solverTimes.stream().mapToLong(Long::longValue).min().orElse(0));
        stats.setMaxSolverTime(solverTimes.stream().mapToLong(Long::longValue).max().orElse(0));

        List<Integer> constraintMatchCounts = solverHistory.stream()
            .map(SolverPerformanceRecord::getConstraintMatchCount)
            .collect(Collectors.toList());

        stats.setAverageConstraintMatchCount(constraintMatchCounts.stream().mapToInt(Integer::intValue).average().orElse(0));

        return stats;
    }

    private PerformanceTrend analyzePerformanceTrend() {
        PerformanceTrend trend = new PerformanceTrend();
        
        if (validationHistory.size() >= 2) {
            // 分析验证时间趋势
            List<ValidationRecord> recentRecords = validationHistory.subList(
                Math.max(0, validationHistory.size() - 10), validationHistory.size());
            
            double recentAvg = recentRecords.stream()
                .mapToLong(ValidationRecord::getValidationTime)
                .average().orElse(0);

            List<ValidationRecord> olderRecords = validationHistory.subList(0, 
                Math.min(10, validationHistory.size() - 10));
            
            if (!olderRecords.isEmpty()) {
                double olderAvg = olderRecords.stream()
                    .mapToLong(ValidationRecord::getValidationTime)
                    .average().orElse(0);

                if (recentAvg > olderAvg * 1.2) {
                    trend.setValidationTimeTrend("DEGRADING");
                } else if (recentAvg < olderAvg * 0.8) {
                    trend.setValidationTimeTrend("IMPROVING");
                } else {
                    trend.setValidationTimeTrend("STABLE");
                }
            }
        }

        return trend;
    }

    private double calculatePerformanceScore(ConstraintPerformanceMetrics metrics) {
        // 综合性能评分算法
        double timeScore = Math.max(0, 100 - metrics.getAverageExecutionTime() / 10.0);
        double matchScore = Math.min(100, metrics.getAverageMatchCount() * 2);
        double executionScore = Math.min(100, metrics.getTotalExecutions() / 10.0);
        
        return (timeScore * 0.4 + matchScore * 0.3 + executionScore * 0.3);
    }

    // 内部类定义

    @RegisterForReflection
    public static class ValidationRecord {
        private LocalDateTime timestamp;
        private long validationTime;
        private int violationCount;
        private int warningCount;

        // Getters and Setters
        public LocalDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

        public long getValidationTime() { return validationTime; }
        public void setValidationTime(long validationTime) { this.validationTime = validationTime; }

        public int getViolationCount() { return violationCount; }
        public void setViolationCount(int violationCount) { this.violationCount = violationCount; }

        public int getWarningCount() { return warningCount; }
        public void setWarningCount(int warningCount) { this.warningCount = warningCount; }
    }

    @RegisterForReflection
    public static class SolverPerformanceRecord {
        private String solverId;
        private LocalDateTime timestamp;
        private long solverTime;
        private String bestScore;
        private int constraintMatchCount;

        // Getters and Setters
        public String getSolverId() { return solverId; }
        public void setSolverId(String solverId) { this.solverId = solverId; }

        public LocalDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

        public long getSolverTime() { return solverTime; }
        public void setSolverTime(long solverTime) { this.solverTime = solverTime; }

        public String getBestScore() { return bestScore; }
        public void setBestScore(String bestScore) { this.bestScore = bestScore; }

        public int getConstraintMatchCount() { return constraintMatchCount; }
        public void setConstraintMatchCount(int constraintMatchCount) { this.constraintMatchCount = constraintMatchCount; }
    }

    @RegisterForReflection
    public static class ConstraintPerformanceMetrics {
        private String constraintId;
        private long totalExecutions;
        private long totalExecutionTime;
        private long totalMatchCount;
        private double totalWeight;
        private List<ExecutionRecord> executionHistory;

        public ConstraintPerformanceMetrics(String constraintId) {
            this.constraintId = constraintId;
            this.totalExecutions = 0;
            this.totalExecutionTime = 0;
            this.totalMatchCount = 0;
            this.totalWeight = 0;
            this.executionHistory = Collections.synchronizedList(new ArrayList<>());
        }

        public void addExecution(long executionTime, int matchCount, double weight) {
            totalExecutions++;
            totalExecutionTime += executionTime;
            totalMatchCount += matchCount;
            totalWeight += weight;

            ExecutionRecord record = new ExecutionRecord();
            record.setTimestamp(LocalDateTime.now());
            record.setExecutionTime(executionTime);
            record.setMatchCount(matchCount);
            record.setWeight(weight);

            executionHistory.add(record);
            
            // 限制历史记录大小
            if (executionHistory.size() > 100) {
                executionHistory.remove(0);
            }
        }

        public void cleanupHistory(LocalDateTime cutoffTime) {
            executionHistory.removeIf(record -> record.getTimestamp().isBefore(cutoffTime));
        }

        public double getAverageExecutionTime() {
            return totalExecutions > 0 ? (double) totalExecutionTime / totalExecutions : 0;
        }

        public double getAverageMatchCount() {
            return totalExecutions > 0 ? (double) totalMatchCount / totalExecutions : 0;
        }

        public double getAverageWeight() {
            return totalExecutions > 0 ? totalWeight / totalExecutions : 0;
        }

        // Getters and Setters
        public String getConstraintId() { return constraintId; }
        public long getTotalExecutions() { return totalExecutions; }
        public long getTotalExecutionTime() { return totalExecutionTime; }
        public long getTotalMatchCount() { return totalMatchCount; }
        public double getTotalWeight() { return totalWeight; }
        public List<ExecutionRecord> getExecutionHistory() { return executionHistory; }
        
        // 为兼容性添加的方法
        public long getLastExecutionTime() {
            return executionHistory.isEmpty() ? 0 : 
                executionHistory.get(executionHistory.size() - 1).getExecutionTime();
        }
        
        public long getErrorCount() {
            // 简单实现，可以根据需要扩展
            return 0;
        }
        
        public LocalDateTime getLastUpdated() {
            return executionHistory.isEmpty() ? LocalDateTime.now() : 
                executionHistory.get(executionHistory.size() - 1).getTimestamp();
        }

        @RegisterForReflection
        public static class ExecutionRecord {
            private LocalDateTime timestamp;
            private long executionTime;
            private int matchCount;
            private double weight;

            // Getters and Setters
            public LocalDateTime getTimestamp() { return timestamp; }
            public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

            public long getExecutionTime() { return executionTime; }
            public void setExecutionTime(long executionTime) { this.executionTime = executionTime; }

            public int getMatchCount() { return matchCount; }
            public void setMatchCount(int matchCount) { this.matchCount = matchCount; }

            public double getWeight() { return weight; }
            public void setWeight(double weight) { this.weight = weight; }
        }
    }

    @RegisterForReflection
    public static class PerformanceReport {
        private LocalDateTime generatedAt;
        private long totalValidations;
        private long totalViolations;
        private long totalWarnings;
        private long totalSolverRuns;
        private ValidationStatistics validationStatistics;
        private SolverStatistics solverStatistics;
        private Map<String, ConstraintPerformanceMetrics> constraintMetrics;
        private PerformanceTrend performanceTrend;

        // Getters and Setters
        public LocalDateTime getGeneratedAt() { return generatedAt; }
        public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }

        public long getTotalValidations() { return totalValidations; }
        public void setTotalValidations(long totalValidations) { this.totalValidations = totalValidations; }

        public long getTotalViolations() { return totalViolations; }
        public void setTotalViolations(long totalViolations) { this.totalViolations = totalViolations; }

        public long getTotalWarnings() { return totalWarnings; }
        public void setTotalWarnings(long totalWarnings) { this.totalWarnings = totalWarnings; }

        public long getTotalSolverRuns() { return totalSolverRuns; }
        public void setTotalSolverRuns(long totalSolverRuns) { this.totalSolverRuns = totalSolverRuns; }

        public ValidationStatistics getValidationStatistics() { return validationStatistics; }
        public void setValidationStatistics(ValidationStatistics validationStatistics) { this.validationStatistics = validationStatistics; }

        public SolverStatistics getSolverStatistics() { return solverStatistics; }
        public void setSolverStatistics(SolverStatistics solverStatistics) { this.solverStatistics = solverStatistics; }

        public Map<String, ConstraintPerformanceMetrics> getConstraintMetrics() { return constraintMetrics; }
        public void setConstraintMetrics(Map<String, ConstraintPerformanceMetrics> constraintMetrics) { this.constraintMetrics = constraintMetrics; }

        public PerformanceTrend getPerformanceTrend() { return performanceTrend; }
        public void setPerformanceTrend(PerformanceTrend performanceTrend) { this.performanceTrend = performanceTrend; }
    }

    @RegisterForReflection
    public static class ValidationStatistics {
        private double averageValidationTime;
        private long minValidationTime;
        private long maxValidationTime;
        private double averageViolationCount;
        private int maxViolationCount;

        // Getters and Setters
        public double getAverageValidationTime() { return averageValidationTime; }
        public void setAverageValidationTime(double averageValidationTime) { this.averageValidationTime = averageValidationTime; }

        public long getMinValidationTime() { return minValidationTime; }
        public void setMinValidationTime(long minValidationTime) { this.minValidationTime = minValidationTime; }

        public long getMaxValidationTime() { return maxValidationTime; }
        public void setMaxValidationTime(long maxValidationTime) { this.maxValidationTime = maxValidationTime; }

        public double getAverageViolationCount() { return averageViolationCount; }
        public void setAverageViolationCount(double averageViolationCount) { this.averageViolationCount = averageViolationCount; }

        public int getMaxViolationCount() { return maxViolationCount; }
        public void setMaxViolationCount(int maxViolationCount) { this.maxViolationCount = maxViolationCount; }
    }

    @RegisterForReflection
    public static class SolverStatistics {
        private double averageSolverTime;
        private long minSolverTime;
        private long maxSolverTime;
        private double averageConstraintMatchCount;

        // Getters and Setters
        public double getAverageSolverTime() { return averageSolverTime; }
        public void setAverageSolverTime(double averageSolverTime) { this.averageSolverTime = averageSolverTime; }

        public long getMinSolverTime() { return minSolverTime; }
        public void setMinSolverTime(long minSolverTime) { this.minSolverTime = minSolverTime; }

        public long getMaxSolverTime() { return maxSolverTime; }
        public void setMaxSolverTime(long maxSolverTime) { this.maxSolverTime = maxSolverTime; }

        public double getAverageConstraintMatchCount() { return averageConstraintMatchCount; }
        public void setAverageConstraintMatchCount(double averageConstraintMatchCount) { this.averageConstraintMatchCount = averageConstraintMatchCount; }
    }

    @RegisterForReflection
    public static class PerformanceTrend {
        private String validationTimeTrend;
        private String solverTimeTrend;
        private String violationCountTrend;

        // Getters and Setters
        public String getValidationTimeTrend() { return validationTimeTrend; }
        public void setValidationTimeTrend(String validationTimeTrend) { this.validationTimeTrend = validationTimeTrend; }

        public String getSolverTimeTrend() { return solverTimeTrend; }
        public void setSolverTimeTrend(String solverTimeTrend) { this.solverTimeTrend = solverTimeTrend; }

        public String getViolationCountTrend() { return violationCountTrend; }
        public void setViolationCountTrend(String violationCountTrend) { this.violationCountTrend = violationCountTrend; }
    }

    @RegisterForReflection
    public static class ConstraintPerformanceRanking {
        private String constraintId;
        private double averageExecutionTime;
        private long totalExecutions;
        private double averageMatchCount;
        private double performanceScore;

        // Getters and Setters
        public String getConstraintId() { return constraintId; }
        public void setConstraintId(String constraintId) { this.constraintId = constraintId; }

        public double getAverageExecutionTime() { return averageExecutionTime; }
        public void setAverageExecutionTime(double averageExecutionTime) { this.averageExecutionTime = averageExecutionTime; }

        public long getTotalExecutions() { return totalExecutions; }
        public void setTotalExecutions(long totalExecutions) { this.totalExecutions = totalExecutions; }

        public double getAverageMatchCount() { return averageMatchCount; }
        public void setAverageMatchCount(double averageMatchCount) { this.averageMatchCount = averageMatchCount; }

        public double getPerformanceScore() { return performanceScore; }
        public void setPerformanceScore(double performanceScore) { this.performanceScore = performanceScore; }
    }
}
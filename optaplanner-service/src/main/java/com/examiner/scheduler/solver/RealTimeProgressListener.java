package com.examiner.scheduler.solver;

import com.examiner.scheduler.rest.ScheduleProgressResource;
import com.examiner.scheduler.websocket.ScheduleProgressWebSocket;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;
import org.optaplanner.core.api.solver.event.BestSolutionChangedEvent;
import org.optaplanner.core.api.solver.event.SolverEventListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 🎯 实时进度监听器
 * 在求解过程中实时推送进度更新到前端，提供流畅的用户体验
 * 
 * 核心设计：
 * 1. 基于时间 + 分数改进的双重进度计算
 * 2. 限制推送频率，避免过度消耗WebSocket
 * 3. 平滑进度增长，避免倒退
 * 4. 支持多级求解模式的进度范围设置
 */
public class RealTimeProgressListener<Solution_> implements SolverEventListener<Solution_> {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(RealTimeProgressListener.class);
    
    // WebSocket会话ID
    private final String sessionId;
    
    // 求解级别信息
    private final int level;              // 当前级别 (1=闪电, 2=标准, 3=精细)
    private final String levelName;       // 级别名称
    private final int progressStart;      // 进度起始值 (%)
    private final int progressEnd;        // 进度结束值 (%)
    private final long estimatedDuration; // 预估持续时间 (ms)
    
    // 时间追踪
    private final Instant startTime;
    private final AtomicLong lastUpdateTime = new AtomicLong(0);
    private static final long UPDATE_INTERVAL_MS = 300; // 🔧 优化：每300ms最多更新一次（更流畅）
    private static final long HEARTBEAT_INTERVAL_MS = 2000; // 🔧 新增：每2秒发送一次心跳（即使进度未变化）
    
    // 进度追踪
    private final AtomicInteger lastReportedProgress; // 🔧 修复：将在构造函数中初始化为 progressStart
    private HardSoftScore initialScore;
    private HardSoftScore bestScore;
    
    // 分数改进追踪
    private final AtomicLong improvementCount = new AtomicLong(0);
    private final AtomicLong eventCount = new AtomicLong(0);
    
    /**
     * 构造函数
     * 
     * @param sessionId WebSocket会话ID
     * @param level 求解级别 (1=闪电, 2=标准, 3=精细)
     * @param levelName 级别名称
     * @param progressStart 进度起始值 (例如: Level1=0, Level2=30, Level3=60)
     * @param progressEnd 进度结束值 (例如: Level1=30, Level2=60, Level3=95)
     * @param estimatedDuration 预估持续时间 (毫秒)
     */
    public RealTimeProgressListener(String sessionId, int level, String levelName, 
                                   int progressStart, int progressEnd, long estimatedDuration) {
        this.sessionId = sessionId;
        this.level = level;
        this.levelName = levelName;
        this.progressStart = progressStart;
        this.progressEnd = progressEnd;
        this.estimatedDuration = estimatedDuration;
        this.startTime = Instant.now();
        // 🔧 修复：将 lastReportedProgress 初始化为 progressStart，避免阶段切换时进度回退
        this.lastReportedProgress = new AtomicInteger(progressStart);
        
        LOGGER.info("📊 [进度监听器] 已创建 - Level {}: {}, 进度范围 {}%-{}%, 预估时长 {}ms", 
                   level, levelName, progressStart, progressEnd, estimatedDuration);
        
        // 🆕 推送启动日志到前端
        String startLogMsg = String.format("🚀 开始 %s 求解 - 预估时长: %d秒", 
                                          levelName, estimatedDuration / 1000);
        com.examiner.scheduler.websocket.WebSocketLogPusher.logInfo(startLogMsg);
    }
    
    @Override
    public void bestSolutionChanged(BestSolutionChangedEvent<Solution_> event) {
        try {
            eventCount.incrementAndGet();
            long currentTime = System.currentTimeMillis();
            
            // 限制更新频率，避免WebSocket过载
            if (currentTime - lastUpdateTime.get() < UPDATE_INTERVAL_MS) {
                return;
            }
            
            HardSoftScore newScore = (HardSoftScore) event.getNewBestScore();
            
            // 记录初始分数
            if (initialScore == null) {
                initialScore = newScore;
                LOGGER.info("📊 [进度监听器] 初始分数: {}", initialScore);
            }
            
            // 检查是否有改进
            if (bestScore == null || newScore.compareTo(bestScore) > 0) {
                bestScore = newScore;
                improvementCount.incrementAndGet();
            }
            
            // 计算当前进度
            int currentProgress = calculateProgress(newScore);
            
            // 🔧 优化：确保进度单调递增，不允许回退
            int lastProgress = lastReportedProgress.get();
            
            // 🔧 修复：强制进度单调递增，彻底避免回退
            if (currentProgress < lastProgress) {
                // 如果计算出的进度小于上次进度，强制保持上次进度
                currentProgress = lastProgress;
                LOGGER.debug("🔒 [进度保护] 阻止进度回退: 计算值={}%, 保持上次={}%", 
                           currentProgress, lastProgress);
            } else if (currentProgress == lastProgress && improvementCount.get() > 0) {
                // 如果有分数改进但进度未变化，允许小幅增长
                currentProgress = lastProgress + 1;
            }
            
            // 🔧 优化：如果时间已经超过预估时间，强制进度增长
            long elapsedTimeMs = Duration.between(startTime, Instant.now()).toMillis();
            if (elapsedTimeMs >= estimatedDuration && currentProgress < progressEnd - 5) {
                // 超时后，强制进度增长到至少 progressEnd - 5
                currentProgress = Math.max(currentProgress, progressEnd - 5);
            }
            
            // 确保不超过结束值
            currentProgress = Math.min(currentProgress, progressEnd);
            
            // 🔧 优化：即使进度没有变化，也定期推送（每2秒一次），让用户知道系统还在工作
            boolean shouldPush = currentProgress > lastProgress || 
                                (currentTime - lastUpdateTime.get() >= HEARTBEAT_INTERVAL_MS); // 2秒无更新时也推送
            
            // 更新并推送进度
            if (shouldPush && currentProgress >= lastProgress) {
                lastReportedProgress.set(currentProgress);
                lastUpdateTime.set(currentTime);
                
                long remaining = Math.max(0, estimatedDuration - elapsedTimeMs);
                
                // 🔧 修复：计算实际的分配数量和迭代次数
                int actualAssignmentCount = 0;
                int actualIterationCount = (int) eventCount.get();
                
                // 尝试计算已分配的考官数量
                try {
                    Solution_ solution = event.getNewBestSolution();
                    if (solution != null && solution instanceof com.examiner.scheduler.domain.ExamSchedule) {
                        com.examiner.scheduler.domain.ExamSchedule examSchedule = 
                            (com.examiner.scheduler.domain.ExamSchedule) solution;
                        if (examSchedule.getExamAssignments() != null) {
                            actualAssignmentCount = (int) examSchedule.getExamAssignments().stream()
                                .filter(assignment -> assignment.getExaminer1() != null || 
                                                    assignment.getExaminer2() != null || 
                                                    assignment.getBackupExaminer() != null)
                                .count();
                        }
                    }
                } catch (Exception e) {
                    // 忽略类型转换异常，保持 actualAssignmentCount = 0
                }
                
                // 推送进度更新到前端（WebSocket + HTTP 轮询）
                ScheduleProgressWebSocket.ProgressUpdate update = new ScheduleProgressWebSocket.ProgressUpdate(
                    level,
                    levelName,
                    elapsedTimeMs,
                    remaining,
                    currentProgress,
                    newScore.toString(),
                    actualIterationCount,      // 🔧 修复：使用实际迭代次数
                    actualAssignmentCount     // 🔧 修复：使用实际分配数量
                );
                ScheduleProgressWebSocket.sendProgressUpdate(sessionId, update);
                // 🔧 同时更新 HTTP 轮询缓存
                ScheduleProgressResource.updateProgress(sessionId, update);
                
                // 每5%输出一次日志
                if (currentProgress % 5 == 0 && currentProgress != lastProgress) {
                    LOGGER.info("📈 [进度更新] {}% - {} - 分数: {} (改进次数: {}, 事件总数: {})", 
                               currentProgress, levelName, newScore, 
                               improvementCount.get(), eventCount.get());
                    
                    // 🆕 推送进度日志到前端
                    String progressLogMsg = String.format("求解进度: %d%% - %s - 分数: %s (改进: %d次)", 
                                                         currentProgress, levelName, newScore, 
                                                         improvementCount.get());
                    com.examiner.scheduler.websocket.WebSocketLogPusher.logInfo(progressLogMsg);
                }
            }
            
        } catch (Exception e) {
            LOGGER.error("❌ [进度监听器] 更新进度时出错: {}", e.getMessage(), e);
        }
    }
    
    /**
     * 计算当前进度百分比
     * 
     * 🔧 优化策略：
     * 1. 基于时间进度（权重30%）- 确保进度不会卡住
     * 2. 基于分数改进进度（权重50%）- 反映实际优化进展
     * 3. 基于事件计数进度（权重20%）- 反映求解器活跃度
     * 4. 使用更平滑的曲线，避免进度跳跃
     */
    private int calculateProgress(HardSoftScore currentScore) {
        // 1. 计算时间进度（确保进度不会卡住）
        long elapsed = Duration.between(startTime, Instant.now()).toMillis();
        double timeRatio = Math.min(1.0, (double) elapsed / estimatedDuration);
        
        // 🔧 优化：使用更平滑的曲线 (easeInOutCubic)
        // 前期和后期都较慢，中期较快，更符合实际求解过程
        double timeProgress;
        if (timeRatio < 0.5) {
            // 前半段：easeInCubic
            timeProgress = 4 * timeRatio * timeRatio * timeRatio;
        } else {
            // 后半段：easeOutCubic
            double t = 2 * timeRatio - 1;
            timeProgress = 1 - 0.5 * (1 - t) * (1 - t) * (1 - t);
        }
        
        // 2. 计算分数进度
        double scoreProgress = calculateScoreProgress(currentScore);
        
        // 3. 🔧 新增：计算事件计数进度（反映求解器活跃度）
        long totalEvents = eventCount.get();
        double eventProgress = 0.0;
        if (totalEvents > 0) {
            // 假设每个级别至少需要1000个事件才能完成
            // 事件越多，进度越高（但不超过80%，因为事件可能持续产生）
            eventProgress = Math.min(0.8, Math.log1p(totalEvents / 100.0) / Math.log1p(10.0));
        }
        
        // 4. 综合计算进度
        // 时间权重30%，分数权重50%，事件权重20%
        double combinedProgress = timeProgress * 0.3 + scoreProgress * 0.5 + eventProgress * 0.2;
        
        // 🔧 优化：确保进度至少随时间增长（防止卡住）
        // 如果时间已经超过预估时间，强制进度增长
        if (timeRatio >= 1.0) {
            // 超时后，至少达到90%
            combinedProgress = Math.max(combinedProgress, 0.9);
        } else if (timeRatio >= 0.8) {
            // 接近超时时，至少达到70%
            combinedProgress = Math.max(combinedProgress, 0.7);
        }
        
        // 映射到进度范围
        int progressRange = progressEnd - progressStart;
        int calculatedProgress = progressStart + (int) (combinedProgress * progressRange);
        
        // 确保不超过范围
        return Math.max(progressStart, Math.min(progressEnd, calculatedProgress));
    }
    
    /**
     * 计算分数改进进度
     */
    private double calculateScoreProgress(HardSoftScore currentScore) {
        if (initialScore == null) {
            return 0.0;
        }
        
        // 硬约束进度 (权重80%)
        double hardProgress = 0.0;
        if (currentScore.hardScore() >= 0) {
            hardProgress = 1.0; // 硬约束全部解决
        } else if (initialScore.hardScore() < currentScore.hardScore()) {
            // 有改进
            long hardImprovement = currentScore.hardScore() - initialScore.hardScore();
            long hardGap = 0 - initialScore.hardScore();
            hardProgress = Math.min(1.0, (double) hardImprovement / hardGap);
        }
        
        // 软约束进度 (权重20%)
        double softProgress = 0.0;
        if (currentScore.hardScore() >= 0) {
            // 只有硬约束满足后，才考虑软约束
            if (currentScore.softScore() >= 0) {
                softProgress = 1.0; // 软约束全部解决
            } else if (initialScore.softScore() < currentScore.softScore()) {
                long softImprovement = currentScore.softScore() - initialScore.softScore();
                long softGap = 0 - initialScore.softScore();
                softProgress = Math.min(1.0, (double) softImprovement / softGap);
            }
        }
        
        // 综合分数进度
        return hardProgress * 0.8 + softProgress * 0.2;
    }
    
    /**
     * 强制推送最终进度（到达progressEnd）
     */
    public void pushFinalProgress() {
        try {
            lastReportedProgress.set(progressEnd);
            
            long elapsed = Duration.between(startTime, Instant.now()).toMillis();
            String scoreStr = bestScore != null ? bestScore.toString() : "N/A";
            
            // 🔧 修复：使用实际的迭代次数
            ScheduleProgressWebSocket.ProgressUpdate finalUpdate = new ScheduleProgressWebSocket.ProgressUpdate(
                level,
                levelName,
                elapsed,
                0, // 无剩余时间
                progressEnd,
                scoreStr,
                (int) eventCount.get(),  // 🔧 修复：使用事件计数作为迭代次数
                0                        // 分配数量（最终进度无法获取，保持0）
            );
            ScheduleProgressWebSocket.sendProgressUpdate(sessionId, finalUpdate);
            // 🔧 同时更新 HTTP 轮询缓存
            ScheduleProgressResource.updateProgress(sessionId, finalUpdate);
            
            LOGGER.info("✅ [进度监听器] 已推送最终进度 {}% - {}", progressEnd, levelName);
            
            // 🆕 推送完成日志到前端
            String completionLogMsg = String.format("✅ %s 求解完成 - 耗时: %d秒, 最终分数: %s", 
                                                   levelName, elapsed / 1000, scoreStr);
            com.examiner.scheduler.websocket.WebSocketLogPusher.logSuccess(completionLogMsg);
            
        } catch (Exception e) {
            LOGGER.error("❌ [进度监听器] 推送最终进度时出错: {}", e.getMessage(), e);
        }
    }
    
    /**
     * 获取统计信息
     */
    public String getStatistics() {
        long elapsed = Duration.between(startTime, Instant.now()).toMillis();
        return String.format(
            "Level %d (%s): 进度 %d%%, 耗时 %dms, 改进次数 %d, 事件总数 %d, 最佳分数 %s",
            level, levelName, lastReportedProgress.get(), elapsed, 
            improvementCount.get(), eventCount.get(),
            bestScore != null ? bestScore.toString() : "N/A"
        );
    }
}


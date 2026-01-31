package com.examiner.scheduler.service;

import com.examiner.scheduler.config.EnterpriseSolverConfig;
import com.examiner.scheduler.domain.ExamSchedule;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.quarkus.scheduler.Scheduled;
import io.smallrye.mutiny.Uni;
import org.optaplanner.core.api.solver.Solver;
import org.optaplanner.core.api.solver.SolverFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 异步求解服务
 * 
 * 企业级特性：
 * 1. 异步非阻塞求解
 * 2. 任务队列管理
 * 3. 并发控制
 * 4. 进度追踪
 * 5. 自动清理
 * 6. 指标监控
 * 
 * @author Enterprise Architecture Team
 * @version 8.0.0
 */
@ApplicationScoped
public class AsyncSolverService {

    private static final Logger logger = LoggerFactory.getLogger(AsyncSolverService.class);

    @Inject
    EnterpriseSolverConfig solverConfig;

    @Inject
    MeterRegistry meterRegistry;

    // 求解器线程池
    private final ThreadPoolExecutor solverExecutor;
    
    // 任务管理
    private final Map<String, SolverTask> tasks = new ConcurrentHashMap<>();
    
    // 统计
    private final AtomicInteger activeSolvers = new AtomicInteger(0);
    private final AtomicInteger queuedTasks = new AtomicInteger(0);
    private final AtomicInteger completedTasks = new AtomicInteger(0);
    private final AtomicInteger failedTasks = new AtomicInteger(0);

    public AsyncSolverService() {
        // 创建自定义线程池
        int corePoolSize = 2;
        int maxPoolSize = 5;
        long keepAliveTime = 60L;
        
        this.solverExecutor = new ThreadPoolExecutor(
            corePoolSize,
            maxPoolSize,
            keepAliveTime,
            TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(10), // 队列容量
            new SolverThreadFactory(),
            new ThreadPoolExecutor.CallerRunsPolicy()
        );
        
        logger.info("🚀 异步求解服务初始化完成，核心线程:{}, 最大线程:{}, 队列容量:10", 
            corePoolSize, maxPoolSize);
    }

    /**
     * 提交求解请求
     * 
     * @param problem 问题实例
     * @param mode 求解模式
     * @return 任务ID
     */
    public String submitSolveRequest(ExamSchedule problem, EnterpriseSolverConfig.SolveMode mode) {
        String taskId = UUID.randomUUID().toString();
        
        // 检查队列是否已满
        if (solverExecutor.getQueue().size() >= 10) {
            throw new RejectedExecutionException("求解队列已满，请稍后重试");
        }

        SolverTask task = new SolverTask(taskId, problem, mode);
        tasks.put(taskId, task);
        queuedTasks.incrementAndGet();

        // 异步执行求解
        CompletableFuture<ExamSchedule> future = CompletableFuture
            .supplyAsync(() -> {
                queuedTasks.decrementAndGet();
                activeSolvers.incrementAndGet();
                task.markStarted();
                
                try {
                    logger.info("▶️ 开始求解任务 {}，学员数:{}, 模式:{}", 
                        taskId, problem.getStudents().size(), mode);
                    
                    return solveInternal(problem, mode, task);
                } finally {
                    activeSolvers.decrementAndGet();
                }
            }, solverExecutor)
            .orTimeout(getTimeoutSeconds(problem, mode), TimeUnit.SECONDS)
            .whenComplete((result, error) -> {
                if (error != null) {
                    task.markFailed(error);
                    failedTasks.incrementAndGet();
                    logger.error("❌ 求解任务 {} 失败: {}", taskId, error.getMessage());
                } else {
                    task.markCompleted(result);
                    completedTasks.incrementAndGet();
                    logger.info("✅ 求解任务 {} 完成，得分:{}, 耗时:{}ms", 
                        taskId, result.getScore(), task.getDurationMs());
                }
            });

        task.setFuture(future);
        
        logger.info("📋 求解任务 {} 已提交，当前队列:{}, 活跃:{}", 
            taskId, queuedTasks.get(), activeSolvers.get());
        
        return taskId;
    }

    /**
     * 获取任务状态
     */
    public TaskStatus getTaskStatus(String taskId) {
        SolverTask task = tasks.get(taskId);
        if (task == null) {
            return null;
        }
        return task.toStatus();
    }

    /**
     * 获取任务结果
     */
    public Uni<ExamSchedule> getResult(String taskId) {
        SolverTask task = tasks.get(taskId);
        if (task == null) {
            return Uni.createFrom().failure(
                new IllegalArgumentException("任务不存在: " + taskId));
        }
        
        return Uni.createFrom().completionStage(task.getFuture());
    }

    /**
     * 取消任务
     */
    public boolean cancelTask(String taskId) {
        SolverTask task = tasks.get(taskId);
        if (task == null) {
            return false;
        }
        
        boolean cancelled = task.cancel();
        if (cancelled) {
            logger.info("🛑 任务 {} 已取消", taskId);
        }
        return cancelled;
    }

    /**
     * 获取统计信息
     */
    public SolverStatistics getStatistics() {
        return new SolverStatistics(
            activeSolvers.get(),
            queuedTasks.get(),
            completedTasks.get(),
            failedTasks.get(),
            solverExecutor.getPoolSize(),
            solverExecutor.getActiveCount()
        );
    }

    /**
     * 列出所有任务
     */
    public Map<String, TaskStatus> listTasks() {
        Map<String, TaskStatus> result = new ConcurrentHashMap<>();
        tasks.forEach((id, task) -> result.put(id, task.toStatus()));
        return result;
    }

    /**
     * 内部求解方法
     */
    private ExamSchedule solveInternal(ExamSchedule problem, 
                                       EnterpriseSolverConfig.SolveMode mode,
                                       SolverTask task) {
        
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            // 创建求解器
            SolverFactory<ExamSchedule> solverFactory = SolverFactory
                .create(solverConfig.createConfig(problem.getStudents().size(), mode));
            Solver<ExamSchedule> solver = solverFactory.buildSolver();
            
            // 添加进度监听器
            solver.addEventListener(event -> {
                task.updateProgress(
                    event.getTimeMillisSpent(),
                    event.getNewBestScore(),
                    event.getNewBestSolution().getExamAssignments().size()
                );
            });

            // 执行求解
            ExamSchedule solution = solver.solve(problem);
            
            // 记录指标
            sample.stop(meterRegistry.timer("solver.duration", 
                "mode", mode.name(),
                "students", String.valueOf(problem.getStudents().size())));
            
            meterRegistry.counter("solver.completed", 
                "mode", mode.name()).increment();
            
            return solution;
            
        } catch (Exception e) {
            meterRegistry.counter("solver.errors", 
                "type", e.getClass().getSimpleName()).increment();
            throw e;
        }
    }

    /**
     * 获取超时时间
     */
    private long getTimeoutSeconds(ExamSchedule problem, EnterpriseSolverConfig.SolveMode mode) {
        // 基础超时 + 每个学员额外时间
        int baseTimeout = switch (mode) {
            case FAST -> 60;
            case BALANCED -> 180;
            case OPTIMAL -> 360;
            case ENTERPRISE -> 600;
        };
        
        int studentBonus = problem.getStudents().size() * 10;
        return baseTimeout + studentBonus;
    }

    /**
     * 定期清理已完成任务
     */
    @Scheduled(every = "10m")
    void cleanupCompletedTasks() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(1));
        int cleaned = 0;
        
        for (Map.Entry<String, SolverTask> entry : tasks.entrySet()) {
            SolverTask task = entry.getValue();
            if (task.isCompleted() && task.getCompletedAt().isBefore(cutoff)) {
                tasks.remove(entry.getKey());
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            logger.debug("🧹 清理了 {} 个过期任务", cleaned);
        }
    }

    // ==================== 内部类 ====================

    /**
     * 求解器任务
     */
    private static class SolverTask {
        private final String id;
        private final ExamSchedule problem;
        private final EnterpriseSolverConfig.SolveMode mode;
        private final Instant createdAt;
        
        private volatile TaskState state = TaskState.PENDING;
        private volatile Instant startedAt;
        private volatile Instant completedAt;
        private volatile ExamSchedule result;
        private volatile Throwable error;
        private volatile long progressTimeMillis;
        private volatile Object progressScore;
        private volatile int progressAssignments;
        
        private CompletableFuture<ExamSchedule> future;

        SolverTask(String id, ExamSchedule problem, EnterpriseSolverConfig.SolveMode mode) {
            this.id = id;
            this.problem = problem;
            this.mode = mode;
            this.createdAt = Instant.now();
        }

        void setFuture(CompletableFuture<ExamSchedule> future) {
            this.future = future;
        }

        CompletableFuture<ExamSchedule> getFuture() {
            return future;
        }

        void markStarted() {
            this.state = TaskState.RUNNING;
            this.startedAt = Instant.now();
        }

        void markCompleted(ExamSchedule result) {
            this.state = TaskState.COMPLETED;
            this.result = result;
            this.completedAt = Instant.now();
        }

        void markFailed(Throwable error) {
            this.state = TaskState.FAILED;
            this.error = error;
            this.completedAt = Instant.now();
        }

        void updateProgress(long timeMillis, Object score, int assignments) {
            this.progressTimeMillis = timeMillis;
            this.progressScore = score;
            this.progressAssignments = assignments;
        }

        boolean cancel() {
            if (future != null) {
                return future.cancel(true);
            }
            return false;
        }

        boolean isCompleted() {
            return state == TaskState.COMPLETED || state == TaskState.FAILED;
        }

        long getDurationMs() {
            if (completedAt != null && startedAt != null) {
                return Duration.between(startedAt, completedAt).toMillis();
            }
            return 0;
        }

        TaskStatus toStatus() {
            return new TaskStatus(
                id,
                state,
                createdAt,
                startedAt,
                completedAt,
                mode,
                progressTimeMillis,
                progressScore != null ? progressScore.toString() : null,
                progressAssignments,
                result != null ? result.getScore() != null : false,
                error != null ? error.getMessage() : null
            );
        }

        Instant getCompletedAt() {
            return completedAt;
        }
    }

    /**
     * 任务状态枚举
     */
    public enum TaskState {
        PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    }

    /**
     * 任务状态记录
     */
    public record TaskStatus(
        String id,
        TaskState state,
        Instant createdAt,
        Instant startedAt,
        Instant completedAt,
        EnterpriseSolverConfig.SolveMode mode,
        long progressTimeMillis,
        String currentScore,
        int assignedCount,
        boolean hasResult,
        String errorMessage
    ) {
        public long getDurationMs() {
            if (completedAt != null && startedAt != null) {
                return Duration.between(startedAt, completedAt).toMillis();
            }
            return 0;
        }
    }

    /**
     * 求解器统计记录
     */
    public record SolverStatistics(
        int activeSolvers,
        int queuedTasks,
        int completedTasks,
        int failedTasks,
        int poolSize,
        int activeThreads
    ) {}

    /**
     * 求解器线程工厂
     */
    private static class SolverThreadFactory implements ThreadFactory {
        private final AtomicInteger counter = new AtomicInteger(0);

        @Override
        public Thread newThread(Runnable r) {
            Thread thread = new Thread(r, "solver-" + counter.incrementAndGet());
            thread.setDaemon(true);
            thread.setPriority(Thread.NORM_PRIORITY);
            return thread;
        }
    }
}

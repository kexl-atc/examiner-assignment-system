package com.examiner.scheduler.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.PreDestroy;
import javax.enterprise.context.ApplicationScoped;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 🟡 短期优化：并发控制服务
 * 
 * 功能：
 * 1. 限制同时进行的求解任务数量
 * 2. 防止系统过载
 * 3. 提供请求队列管理
 * 4. 监控并发状态
 */
@ApplicationScoped
public class ConcurrencyControlService {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(ConcurrencyControlService.class);
    
    // 最大并发求解数
    private static final int MAX_CONCURRENT_SOLVES = 2;
    
    // 最大等待队列长度
    private static final int MAX_QUEUE_SIZE = 5;
    
    // 信号量：控制并发数
    private final Semaphore solveSemaphore = new Semaphore(MAX_CONCURRENT_SOLVES, true);
    
    // 线程池：使用有界队列防止内存溢出
    private final ExecutorService executorService = new ThreadPoolExecutor(
        2,  // 核心线程数
        4,  // 最大线程数
        60L, TimeUnit.SECONDS,  // 空闲线程存活时间
        new ArrayBlockingQueue<>(MAX_QUEUE_SIZE),  // 有界队列
        new ThreadFactory() {
            private final AtomicInteger threadNumber = new AtomicInteger(1);
            @Override
            public Thread newThread(Runnable r) {
                Thread t = new Thread(r, "Solver-Worker-" + threadNumber.getAndIncrement());
                t.setDaemon(false);
                return t;
            }
        },
        new ThreadPoolExecutor.CallerRunsPolicy()  // 拒绝策略：由调用线程执行
    );

    // 超时调度器：单例，避免每个请求创建线程
    private final ScheduledExecutorService timeoutScheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "Solver-Timeout-Scheduler");
        t.setDaemon(true);
        return t;
    });
    
    // 统计信息
    private final AtomicInteger totalRequests = new AtomicInteger(0);
    private final AtomicInteger activeRequests = new AtomicInteger(0);
    private final AtomicInteger rejectedRequests = new AtomicInteger(0);
    
    /**
     * 尝试获取求解许可
     * 
     * @return true如果获取成功，false如果超过并发限制
     */
    public boolean tryAcquire() {
        boolean acquired = solveSemaphore.tryAcquire();
        if (acquired) {
            int active = activeRequests.incrementAndGet();
            int total = totalRequests.incrementAndGet();
            LOGGER.info("🔓 获取求解许可成功 [活跃: {}, 总计: {}]", active, total);
        } else {
            int rejected = rejectedRequests.incrementAndGet();
            LOGGER.warn("⚠️ 求解许可获取失败，已达并发上限 [拒绝: {}]", rejected);
        }
        return acquired;
    }
    
    /**
     * 尝试获取求解许可（带超时）
     * 
     * @param timeout 超时时间
     * @param unit 时间单位
     * @return true如果获取成功
     */
    public boolean tryAcquire(long timeout, TimeUnit unit) {
        try {
            boolean acquired = solveSemaphore.tryAcquire(timeout, unit);
            if (acquired) {
                int active = activeRequests.incrementAndGet();
                int total = totalRequests.incrementAndGet();
                LOGGER.info("🔓 获取求解许可成功（超时等待） [活跃: {}, 总计: {}]", active, total);
            } else {
                int rejected = rejectedRequests.incrementAndGet();
                LOGGER.warn("⚠️ 求解许可获取超时 [拒绝: {}]", rejected);
            }
            return acquired;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOGGER.error("获取求解许可被中断", e);
            return false;
        }
    }
    
    /**
     * 释放求解许可
     */
    public void release() {
        solveSemaphore.release();
        int active = activeRequests.decrementAndGet();
        LOGGER.info("🔒 释放求解许可 [活跃: {}]", active);
    }
    
    /**
     * 提交异步任务
     * 
     * @param task 任务
     * @return CompletableFuture
     */
    public <T> CompletableFuture<T> submitTask(Callable<T> task) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return task.call();
            } catch (Exception e) {
                throw new CompletionException(e);
            }
        }, executorService);
    }
    
    /**
     * 提交带超时的异步任务
     * 
     * @param task 任务
     * @param timeout 超时时间
     * @param unit 时间单位
     * @return CompletableFuture
     */
    public <T> CompletableFuture<T> submitTaskWithTimeout(Callable<T> task, long timeout, TimeUnit unit) {
        CompletableFuture<T> future = CompletableFuture.supplyAsync(() -> {
            try {
                return task.call();
            } catch (Exception e) {
                throw new CompletionException(e);
            }
        }, executorService);
        
        // 超时处理
        CompletableFuture<T> timeoutFuture = new CompletableFuture<>();
        ScheduledFuture<?> timeoutHandle = timeoutScheduler.schedule(() -> {
            if (!future.isDone()) {
                LOGGER.warn("⏰ 任务执行超时，尝试取消");
                future.cancel(true);
                timeoutFuture.completeExceptionally(new TimeoutException("Task timeout after " + timeout + " " + unit));
            }
        }, timeout, unit);
        
        future.whenComplete((result, error) -> {
            timeoutHandle.cancel(false);
            if (error == null) {
                timeoutFuture.complete(result);
            } else {
                timeoutFuture.completeExceptionally(error);
            }
        });
        
        return timeoutFuture;
    }
    
    /**
     * 获取并发状态
     */
    public ConcurrencyStatus getStatus() {
        return new ConcurrencyStatus(
            activeRequests.get(),
            totalRequests.get(),
            rejectedRequests.get(),
            solveSemaphore.availablePermits(),
            MAX_CONCURRENT_SOLVES,
            ((ThreadPoolExecutor) executorService).getActiveCount(),
            ((ThreadPoolExecutor) executorService).getPoolSize(),
            ((ThreadPoolExecutor) executorService).getQueue().size()
        );
    }
    
    /**
     * 打印并发状态
     */
    public void printStatus() {
        ConcurrencyStatus status = getStatus();
        LOGGER.info("📊 [并发状态] 活跃: {}, 总计: {}, 拒绝: {}, 可用许可: {}/{}, 线程池: {}/{}, 队列: {}",
            status.activeRequests,
            status.totalRequests,
            status.rejectedRequests,
            status.availablePermits,
            status.maxPermits,
            status.activeThreads,
            status.poolSize,
            status.queueSize
        );
    }
    
    /**
     * 关闭服务
     */
    @PreDestroy
    public void shutdown() {
        LOGGER.info("🛑 关闭并发控制服务...");
        executorService.shutdown();
        timeoutScheduler.shutdown();
        try {
            if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
            if (!timeoutScheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                timeoutScheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            timeoutScheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
        LOGGER.info("✅ 并发控制服务已关闭");
    }
    
    /**
     * 并发状态类
     */
    public static class ConcurrencyStatus {
        public final int activeRequests;
        public final int totalRequests;
        public final int rejectedRequests;
        public final int availablePermits;
        public final int maxPermits;
        public final int activeThreads;
        public final int poolSize;
        public final int queueSize;
        
        public ConcurrencyStatus(int activeRequests, int totalRequests, int rejectedRequests,
                                int availablePermits, int maxPermits, int activeThreads,
                                int poolSize, int queueSize) {
            this.activeRequests = activeRequests;
            this.totalRequests = totalRequests;
            this.rejectedRequests = rejectedRequests;
            this.availablePermits = availablePermits;
            this.maxPermits = maxPermits;
            this.activeThreads = activeThreads;
            this.poolSize = poolSize;
            this.queueSize = queueSize;
        }
    }
}

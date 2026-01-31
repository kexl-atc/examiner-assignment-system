package com.examiner.scheduler.rest;

import com.examiner.scheduler.cache.EnterpriseCacheManager;
import com.examiner.scheduler.service.AsyncSolverService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.search.Search;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 企业级监控指标API
 * 
 * 提供：
 * 1. 求解器统计
 * 2. 缓存统计
 * 3. JVM指标
 * 4. 系统健康度
 * 
 * @author Enterprise Architecture Team
 * @version 8.0.0
 */
@Path("/api/metrics")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class MetricsResource {

    private static final Logger logger = LoggerFactory.getLogger(MetricsResource.class);

    @Inject
    MeterRegistry meterRegistry;

    @Inject
    AsyncSolverService solverService;

    @Inject
    EnterpriseCacheManager cacheManager;

    /**
     * 获取完整监控仪表板数据
     */
    @GET
    @Path("/dashboard")
    public Response getDashboard() {
        Map<String, Object> dashboard = new HashMap<>();
        
        dashboard.put("solver", buildSolverMetrics());
        dashboard.put("cache", buildCacheMetrics());
        dashboard.put("jvm", buildJvmMetrics());
        dashboard.put("system", buildSystemMetrics());
        dashboard.put("health", getHealthStatus());
        
        return Response.ok(dashboard).build();
    }

    /**
     * 获取求解器指标
     */
    @GET
    @Path("/solver")
    public Response getSolverMetrics() {
        AsyncSolverService.SolverStatistics stats = solverService.getStatistics();
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("activeSolvers", stats.activeSolvers());
        metrics.put("queuedTasks", stats.queuedTasks());
        metrics.put("completedTasks", stats.completedTasks());
        metrics.put("failedTasks", stats.failedTasks());
        metrics.put("poolSize", stats.poolSize());
        metrics.put("activeThreads", stats.activeThreads());
        
        // Micrometer指标
        metrics.put("totalDuration", getTimerValue("solver.duration"));
        metrics.put("solveCount", getCounterValue("solver.completed"));
        metrics.put("errorCount", getCounterValue("solver.errors"));
        
        return Response.ok(metrics).build();
    }

    /**
     * 获取缓存指标
     */
    @GET
    @Path("/cache")
    public Response getCacheMetrics() {
        EnterpriseCacheManager.CacheStats stats = cacheManager.getStats();
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("l1Size", stats.l1Size());
        metrics.put("l2Size", stats.l2Size());
        metrics.put("hits", stats.hits());
        metrics.put("misses", stats.misses());
        metrics.put("evictions", stats.evictions());
        metrics.put("hitRate", String.format("%.2f%%", stats.hitRate() * 100));
        
        return Response.ok(metrics).build();
    }

    /**
     * 获取JVM指标
     */
    @GET
    @Path("/jvm")
    public Response getJvmMetrics() {
        Runtime runtime = Runtime.getRuntime();
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("heapUsedMB", (runtime.totalMemory() - runtime.freeMemory()) / 1024 / 1024);
        metrics.put("heapCommittedMB", runtime.totalMemory() / 1024 / 1024);
        metrics.put("heapMaxMB", runtime.maxMemory() / 1024 / 1024);
        metrics.put("freeMemoryMB", runtime.freeMemory() / 1024 / 1024);
        
        // GC指标
        metrics.put("gcInfo", getGcInfo());
        
        return Response.ok(metrics).build();
    }

    /**
     * 获取系统指标
     */
    @GET
    @Path("/system")
    public Response getSystemMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        metrics.put("availableProcessors", Runtime.getRuntime().availableProcessors());
        metrics.put("systemLoad", getSystemLoad());
        
        return Response.ok(metrics).build();
    }

    /**
     * 获取健康状态
     */
    @GET
    @Path("/health")
    public Response getHealth() {
        Map<String, Object> health = getHealthStatus();
        
        boolean isHealthy = (boolean) health.get("overall");
        int status = isHealthy ? 200 : 503;
        
        return Response.status(status).entity(health).build();
    }

    /**
     * 获取活跃任务列表
     */
    @GET
    @Path("/tasks")
    public Response getActiveTasks() {
        return Response.ok(solverService.listTasks()).build();
    }

    /**
     * 重置统计
     */
    @POST
    @Path("/reset")
    public Response resetMetrics() {
        // 清空缓存统计
        cacheManager.clearAll();
        
        logger.info("🔄 监控指标已重置");
        return Response.ok(Map.of("message", "Metrics reset successfully")).build();
    }

    // ==================== 私有方法 ====================

    private Map<String, Object> buildSolverMetrics() {
        AsyncSolverService.SolverStatistics stats = solverService.getStatistics();
        Map<String, Object> metrics = new HashMap<>();
        
        metrics.put("active", stats.activeSolvers());
        metrics.put("queued", stats.queuedTasks());
        metrics.put("completed", stats.completedTasks());
        metrics.put("failed", stats.failedTasks());
        metrics.put("threadPoolSize", stats.poolSize());
        
        return metrics;
    }

    private Map<String, Object> buildCacheMetrics() {
        EnterpriseCacheManager.CacheStats stats = cacheManager.getStats();
        Map<String, Object> metrics = new HashMap<>();
        
        metrics.put("l1Size", stats.l1Size());
        metrics.put("l2Size", stats.l2Size());
        metrics.put("hitRate", stats.hitRate());
        
        return metrics;
    }

    private Map<String, Object> buildJvmMetrics() {
        Runtime runtime = Runtime.getRuntime();
        Map<String, Object> metrics = new HashMap<>();
        
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        double usagePercent = (double) usedMemory / maxMemory * 100;
        
        metrics.put("heapUsedMB", usedMemory / 1024 / 1024);
        metrics.put("heapMaxMB", maxMemory / 1024 / 1024);
        metrics.put("heapUsagePercent", String.format("%.1f%%", usagePercent));
        
        return metrics;
    }

    private Map<String, Object> buildSystemMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("processors", Runtime.getRuntime().availableProcessors());
        return metrics;
    }

    private Map<String, Object> getHealthStatus() {
        Map<String, Object> health = new HashMap<>();
        
        // 检查JVM内存
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        double memoryUsage = (double) usedMemory / maxMemory;
        boolean memoryHealthy = memoryUsage < 0.9;
        
        // 检查线程池
        AsyncSolverService.SolverStatistics stats = solverService.getStatistics();
        boolean threadPoolHealthy = stats.queuedTasks() < 10;
        
        // 整体健康状态
        boolean overallHealthy = memoryHealthy && threadPoolHealthy;
        
        health.put("overall", overallHealthy);
        health.put("memory", Map.of(
            "status", memoryHealthy ? "UP" : "WARNING",
            "usage", String.format("%.1f%%", memoryUsage * 100)
        ));
        health.put("threadPool", Map.of(
            "status", threadPoolHealthy ? "UP" : "WARNING",
            "queuedTasks", stats.queuedTasks()
        ));
        
        return health;
    }

    private Map<String, Object> getGcInfo() {
        Map<String, Object> gcInfo = new HashMap<>();
        
        for (java.lang.management.GarbageCollectorMXBean gcBean : 
             java.lang.management.ManagementFactory.getGarbageCollectorMXBeans()) {
            gcInfo.put(gcBean.getName(), Map.of(
                "count", gcBean.getCollectionCount(),
                "timeMs", gcBean.getCollectionTime()
            ));
        }
        
        return gcInfo;
    }

    private double getSystemLoad() {
        java.lang.management.OperatingSystemMXBean osBean = 
            java.lang.management.ManagementFactory.getOperatingSystemMXBean();
        return osBean.getSystemLoadAverage();
    }

    private double getTimerValue(String name) {
        try {
            return Search.in(meterRegistry)
                .name(name)
                .timers()
                .stream()
                .findFirst()
                .map(t -> t.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS))
                .orElse(0.0);
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double getCounterValue(String name) {
        try {
            return Search.in(meterRegistry)
                .name(name)
                .counters()
                .stream()
                .findFirst()
                .map(c -> c.count())
                .orElse(0.0);
        } catch (Exception e) {
            return 0.0;
        }
    }
}

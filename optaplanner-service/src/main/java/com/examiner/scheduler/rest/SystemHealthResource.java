package com.examiner.scheduler.rest;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.ThreadMXBean;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 🔴 立即修复：系统健康检查和内存监控端点
 * 
 * 功能：
 * 1. 检查系统内存使用情况
 * 2. 监控JVM堆内存
 * 3. 检查线程状态
 * 4. 提供健康检查接口
 */
@Path("/api/health")
@Produces(MediaType.APPLICATION_JSON)
public class SystemHealthResource {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(SystemHealthResource.class);
    private static final long MEMORY_WARNING_THRESHOLD = 80; // 内存使用率警告阈值（%）
    private static final long MEMORY_CRITICAL_THRESHOLD = 90; // 内存使用率严重阈值（%）
    
    /**
     * 获取系统健康状态
     */
    @GET
    @Path("/status")
    public Response getHealthStatus() {
        try {
            Map<String, Object> health = new HashMap<>();
            
            // JVM内存信息
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            long heapUsed = memoryBean.getHeapMemoryUsage().getUsed();
            long heapMax = memoryBean.getHeapMemoryUsage().getMax();
            long heapCommitted = memoryBean.getHeapMemoryUsage().getCommitted();
            long nonHeapUsed = memoryBean.getNonHeapMemoryUsage().getUsed();
            
            double heapUsagePercent = (heapMax > 0) ? (double) heapUsed / heapMax * 100 : 0;
            
            Map<String, Object> memory = new HashMap<>();
            memory.put("heapUsedMB", heapUsed / 1024 / 1024);
            memory.put("heapMaxMB", heapMax / 1024 / 1024);
            memory.put("heapCommittedMB", heapCommitted / 1024 / 1024);
            memory.put("heapUsagePercent", Math.round(heapUsagePercent * 100) / 100.0);
            memory.put("nonHeapUsedMB", nonHeapUsed / 1024 / 1024);
            
            // 线程信息
            ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
            Map<String, Object> threads = new HashMap<>();
            threads.put("threadCount", threadBean.getThreadCount());
            threads.put("peakThreadCount", threadBean.getPeakThreadCount());
            threads.put("daemonThreadCount", threadBean.getDaemonThreadCount());
            
            // 运行时信息
            Runtime runtime = Runtime.getRuntime();
            Map<String, Object> runtimeInfo = new HashMap<>();
            runtimeInfo.put("availableProcessors", runtime.availableProcessors());
            runtimeInfo.put("freeMemoryMB", runtime.freeMemory() / 1024 / 1024);
            runtimeInfo.put("totalMemoryMB", runtime.totalMemory() / 1024 / 1024);
            runtimeInfo.put("maxMemoryMB", runtime.maxMemory() / 1024 / 1024);
            
            // 系统运行时间
            long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
            Map<String, Object> uptime = new HashMap<>();
            uptime.put("uptimeSeconds", uptimeMs / 1000);
            uptime.put("uptimeMinutes", uptimeMs / 1000 / 60);
            uptime.put("uptimeHours", uptimeMs / 1000 / 60 / 60);
            
            // 判断健康状态
            String status;
            String level;
            if (heapUsagePercent >= MEMORY_CRITICAL_THRESHOLD) {
                status = "CRITICAL";
                level = "error";
                LOGGER.error("🚨 系统内存严重不足! 堆使用率: {}%", heapUsagePercent);
            } else if (heapUsagePercent >= MEMORY_WARNING_THRESHOLD) {
                status = "WARNING";
                level = "warning";
                LOGGER.warn("⚠️ 系统内存偏高! 堆使用率: {}%", heapUsagePercent);
            } else {
                status = "HEALTHY";
                level = "info";
            }
            
            health.put("status", status);
            health.put("level", level);
            health.put("memory", memory);
            health.put("threads", threads);
            health.put("runtime", runtimeInfo);
            health.put("uptime", uptime);
            health.put("timestamp", System.currentTimeMillis());
            
            return Response.ok(health).build();
            
        } catch (Exception e) {
            LOGGER.error("获取健康状态失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("message", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(error).build();
        }
    }
    
    /**
     * 简单的健康检查（用于负载均衡器）
     */
    @GET
    @Path("/ping")
    public Response ping() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        response.put("timestamp", String.valueOf(System.currentTimeMillis()));
        return Response.ok(response).build();
    }
    
    /**
     * 获取详细的内存统计
     */
    @GET
    @Path("/memory")
    public Response getMemoryDetails() {
        try {
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            
            Map<String, Object> memoryDetails = new HashMap<>();
            
            // 堆内存详情
            Map<String, Object> heap = new HashMap<>();
            heap.put("init", memoryBean.getHeapMemoryUsage().getInit() / 1024 / 1024);
            heap.put("used", memoryBean.getHeapMemoryUsage().getUsed() / 1024 / 1024);
            heap.put("committed", memoryBean.getHeapMemoryUsage().getCommitted() / 1024 / 1024);
            heap.put("max", memoryBean.getHeapMemoryUsage().getMax() / 1024 / 1024);
            
            // 非堆内存详情
            Map<String, Object> nonHeap = new HashMap<>();
            nonHeap.put("init", memoryBean.getNonHeapMemoryUsage().getInit() / 1024 / 1024);
            nonHeap.put("used", memoryBean.getNonHeapMemoryUsage().getUsed() / 1024 / 1024);
            nonHeap.put("committed", memoryBean.getNonHeapMemoryUsage().getCommitted() / 1024 / 1024);
            nonHeap.put("max", memoryBean.getNonHeapMemoryUsage().getMax() / 1024 / 1024);
            
            memoryDetails.put("heap", heap);
            memoryDetails.put("nonHeap", nonHeap);
            memoryDetails.put("objectPendingFinalizationCount", memoryBean.getObjectPendingFinalizationCount());
            
            return Response.ok(memoryDetails).build();
            
        } catch (Exception e) {
            LOGGER.error("获取内存详情失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }
    
    /**
     * 触发垃圾回收（谨慎使用）
     */
    @GET
    @Path("/gc")
    public Response triggerGC() {
        try {
            LOGGER.info("🧹 手动触发垃圾回收...");
            long beforeGC = Runtime.getRuntime().freeMemory();
            
            System.gc();
            System.runFinalization();
            
            // 等待GC完成
            Thread.sleep(500);
            
            long afterGC = Runtime.getRuntime().freeMemory();
            long freedMemory = afterGC - beforeGC;
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("freedMemoryMB", freedMemory / 1024 / 1024);
            result.put("message", "GC completed, freed " + (freedMemory / 1024 / 1024) + " MB");
            
            LOGGER.info("✅ GC完成，释放内存: {} MB", freedMemory / 1024 / 1024);
            
            return Response.ok(result).build();
            
        } catch (Exception e) {
            LOGGER.error("触发GC失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("success", false, "error", e.getMessage()))
                    .build();
        }
    }
}

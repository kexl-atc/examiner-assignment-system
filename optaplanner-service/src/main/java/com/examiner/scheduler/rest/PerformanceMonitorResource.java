package com.examiner.scheduler.rest;

import com.examiner.scheduler.service.ConcurrencyControlService;
import com.examiner.scheduler.optimizer.MemoryLeakPreventer;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.lang.management.*;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 🟢 长期改进：性能监控资源
 * 
 * 提供系统性能指标、缓存统计、并发状态等信息
 */
@Path("/api/monitor")
@Produces(MediaType.APPLICATION_JSON)
public class PerformanceMonitorResource {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(PerformanceMonitorResource.class);
    
    @Inject
    private ConcurrencyControlService concurrencyService;
    
    /**
     * 获取完整的性能指标
     */
    @GET
    @Path("/metrics")
    public Response getPerformanceMetrics() {
        try {
            Map<String, Object> metrics = new HashMap<>();
            
            // 1. JVM内存指标
            metrics.put("memory", getMemoryMetrics());
            
            // 2. 线程指标
            metrics.put("threads", getThreadMetrics());
            
            // 3. GC指标
            metrics.put("gc", getGCMetrics());
            
            // 4. 并发控制状态
            if (concurrencyService != null) {
                ConcurrencyControlService.ConcurrencyStatus status = concurrencyService.getStatus();
                Map<String, Object> concurrency = new HashMap<>();
                concurrency.put("activeRequests", status.activeRequests);
                concurrency.put("totalRequests", status.totalRequests);
                concurrency.put("rejectedRequests", status.rejectedRequests);
                concurrency.put("availablePermits", status.availablePermits);
                concurrency.put("maxPermits", status.maxPermits);
                concurrency.put("activeThreads", status.activeThreads);
                concurrency.put("poolSize", status.poolSize);
                concurrency.put("queueSize", status.queueSize);
                metrics.put("concurrency", concurrency);
            }
            
            // 5. 缓存统计（从MemoryLeakPreventer获取）
            metrics.put("cache", MemoryLeakPreventer.getCacheStatistics());
            
            // 6. 系统运行时间
            metrics.put("uptime", ManagementFactory.getRuntimeMXBean().getUptime());
            
            // 7. 时间戳
            metrics.put("timestamp", System.currentTimeMillis());
            
            return Response.ok(metrics).build();
            
        } catch (Exception e) {
            LOGGER.error("获取性能指标失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }
    
    /**
     * 获取内存指标
     */
    private Map<String, Object> getMemoryMetrics() {
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        Map<String, Object> memory = new HashMap<>();
        
        // 堆内存
        MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
        Map<String, Long> heap = new HashMap<>();
        heap.put("init", heapUsage.getInit() / 1024 / 1024);
        heap.put("used", heapUsage.getUsed() / 1024 / 1024);
        heap.put("committed", heapUsage.getCommitted() / 1024 / 1024);
        heap.put("max", heapUsage.getMax() / 1024 / 1024);
        heap.put("usagePercent", heapUsage.getMax() > 0 
            ? (long) ((double) heapUsage.getUsed() / heapUsage.getMax() * 100) 
            : 0);
        memory.put("heap", heap);
        
        // 非堆内存
        MemoryUsage nonHeapUsage = memoryBean.getNonHeapMemoryUsage();
        Map<String, Long> nonHeap = new HashMap<>();
        nonHeap.put("init", nonHeapUsage.getInit() / 1024 / 1024);
        nonHeap.put("used", nonHeapUsage.getUsed() / 1024 / 1024);
        nonHeap.put("committed", nonHeapUsage.getCommitted() / 1024 / 1024);
        nonHeap.put("max", nonHeapUsage.getMax() / 1024 / 1024);
        memory.put("nonHeap", nonHeap);
        
        return memory;
    }
    
    /**
     * 获取线程指标
     */
    private Map<String, Object> getThreadMetrics() {
        ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
        Map<String, Object> threads = new HashMap<>();
        
        threads.put("count", threadBean.getThreadCount());
        threads.put("peak", threadBean.getPeakThreadCount());
        threads.put("daemon", threadBean.getDaemonThreadCount());
        threads.put("totalStarted", threadBean.getTotalStartedThreadCount());
        
        // 死锁检测
        long[] deadlockedThreads = threadBean.findDeadlockedThreads();
        threads.put("deadlocked", deadlockedThreads != null ? deadlockedThreads.length : 0);
        
        return threads;
    }
    
    /**
     * 获取GC指标
     */
    private Map<String, Object> getGCMetrics() {
        List<Map<String, Object>> gcList = new ArrayList<>();
        
        for (GarbageCollectorMXBean gcBean : ManagementFactory.getGarbageCollectorMXBeans()) {
            Map<String, Object> gc = new HashMap<>();
            gc.put("name", gcBean.getName());
            gc.put("collectionCount", gcBean.getCollectionCount());
            gc.put("collectionTime", gcBean.getCollectionTime());
            gcList.add(gc);
        }
        
        Map<String, Object> gcMetrics = new HashMap<>();
        gcMetrics.put("collectors", gcList);
        
        return gcMetrics;
    }
    
    /**
     * 获取类加载指标
     */
    @GET
    @Path("/classloading")
    public Response getClassLoadingMetrics() {
        try {
            ClassLoadingMXBean classLoadingBean = ManagementFactory.getClassLoadingMXBean();
            Map<String, Object> classLoading = new HashMap<>();
            
            classLoading.put("loadedClassCount", classLoadingBean.getLoadedClassCount());
            classLoading.put("totalLoadedClassCount", classLoadingBean.getTotalLoadedClassCount());
            classLoading.put("unloadedClassCount", classLoadingBean.getUnloadedClassCount());
            
            return Response.ok(classLoading).build();
            
        } catch (Exception e) {
            LOGGER.error("获取类加载指标失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }
    
    /**
     * 获取编译器指标
     */
    @GET
    @Path("/compilation")
    public Response getCompilationMetrics() {
        try {
            CompilationMXBean compilationBean = ManagementFactory.getCompilationMXBean();
            Map<String, Object> compilation = new HashMap<>();
            
            compilation.put("name", compilationBean.getName());
            compilation.put("totalCompilationTime", compilationBean.getTotalCompilationTime());
            
            return Response.ok(compilation).build();
            
        } catch (Exception e) {
            LOGGER.error("获取编译器指标失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }
    
    /**
     * 获取操作系统指标
     */
    @GET
    @Path("/os")
    public Response getOSMetrics() {
        try {
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
            Map<String, Object> os = new HashMap<>();
            
            os.put("name", osBean.getName());
            os.put("arch", osBean.getArch());
            os.put("version", osBean.getVersion());
            os.put("availableProcessors", osBean.getAvailableProcessors());
            os.put("systemLoadAverage", osBean.getSystemLoadAverage());
            
            return Response.ok(os).build();
            
        } catch (Exception e) {
            LOGGER.error("获取操作系统指标失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }
    
    /**
     * 获取所有指标（完整版）
     */
    @GET
    @Path("/all")
    public Response getAllMetrics() {
        try {
            Map<String, Object> allMetrics = new HashMap<>();
            
            allMetrics.put("performance", getPerformanceMetrics().getEntity());
            allMetrics.put("classLoading", getClassLoadingMetrics().getEntity());
            allMetrics.put("compilation", getCompilationMetrics().getEntity());
            allMetrics.put("os", getOSMetrics().getEntity());
            
            return Response.ok(allMetrics).build();
            
        } catch (Exception e) {
            LOGGER.error("获取所有指标失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }
}

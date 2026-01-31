package com.examiner.scheduler.optimizer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.ref.WeakReference;
import java.util.*;
import java.util.concurrent.*;

/**
 * 🛡️ 内存泄漏预防器
 * 
 * 功能：
 * 1. 自动清理长时间未使用的缓存
 * 2. 使用WeakReference管理临时对象
 * 3. 监控内存使用情况
 * 4. 防止静态集合无限增长
 * 5. 提供定期GC提示
 * 
 * 基于OptaPlanner最佳实践和JVM内存管理
 */
public class MemoryLeakPreventer {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(MemoryLeakPreventer.class);
    
    // 使用WeakReference管理缓存，允许GC回收
    private static final Map<String, WeakReference<Object>> weakCache = new ConcurrentHashMap<>();
    
    // 时间戳缓存，用于清理过期数据
    private static final Map<String, Long> accessTimestamps = new ConcurrentHashMap<>();
    
    // 自动清理任务
    private static ScheduledExecutorService cleanupExecutor;
    
    // 配置参数
    private static final long CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5分钟
    private static final long CLEANUP_INTERVAL_MS = 60 * 1000; // 1分钟
    private static final int MAX_CACHE_SIZE = 10000; // 最大缓存条目数
    
    // 内存统计
    private static volatile long totalCacheHits = 0;
    private static volatile long totalCacheMisses = 0;
    private static volatile long totalCacheCleanups = 0;
    
    static {
        // 启动定期清理任务
        startCleanupTask();
        
        // 注册JVM关闭钩子
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            LOGGER.info("🛡️ [内存管理] 执行关闭清理...");
            shutdown();
        }));
    }
    
    /**
     * 启动自动清理任务
     */
    private static void startCleanupTask() {
        if (cleanupExecutor == null || cleanupExecutor.isShutdown()) {
            cleanupExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "MemoryLeakPreventer-Cleanup");
                t.setDaemon(true); // 设置为守护线程
                return t;
            });
            
            cleanupExecutor.scheduleAtFixedRate(
                MemoryLeakPreventer::performCleanup,
                CLEANUP_INTERVAL_MS,
                CLEANUP_INTERVAL_MS,
                TimeUnit.MILLISECONDS
            );
            
            LOGGER.info("🛡️ [内存管理] 自动清理任务已启动，间隔: {}ms", CLEANUP_INTERVAL_MS);
        }
    }
    
    /**
     * 执行清理任务
     */
    private static void performCleanup() {
        try {
            long now = System.currentTimeMillis();
            int removedCount = 0;
            
            // 清理过期的缓存条目
            Iterator<Map.Entry<String, Long>> iterator = accessTimestamps.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<String, Long> entry = iterator.next();
                if (now - entry.getValue() > CACHE_EXPIRY_MS) {
                    iterator.remove();
                    weakCache.remove(entry.getKey());
                    removedCount++;
                }
            }
            
            // 清理已被GC回收的WeakReference
            int nullRefCount = 0;
            Iterator<Map.Entry<String, WeakReference<Object>>> weakIterator = weakCache.entrySet().iterator();
            while (weakIterator.hasNext()) {
                Map.Entry<String, WeakReference<Object>> entry = weakIterator.next();
                if (entry.getValue().get() == null) {
                    weakIterator.remove();
                    accessTimestamps.remove(entry.getKey());
                    nullRefCount++;
                }
            }
            
            // 如果缓存过大，强制清理最旧的条目
            if (weakCache.size() > MAX_CACHE_SIZE) {
                List<Map.Entry<String, Long>> sortedEntries = new ArrayList<>(accessTimestamps.entrySet());
                sortedEntries.sort(Map.Entry.comparingByValue());
                
                int toRemove = weakCache.size() - MAX_CACHE_SIZE;
                for (int i = 0; i < toRemove && i < sortedEntries.size(); i++) {
                    String key = sortedEntries.get(i).getKey();
                    weakCache.remove(key);
                    accessTimestamps.remove(key);
                    removedCount++;
                }
            }
            
            totalCacheCleanups++;
            
            if (removedCount > 0 || nullRefCount > 0) {
                LOGGER.info("🧹 [内存清理] 清理完成: 过期条目={}, GC回收={}, 总缓存={}", 
                           removedCount, nullRefCount, weakCache.size());
            }
            
            // 定期打印内存统计
            if (totalCacheCleanups % 10 == 0) {
                printMemoryStatistics();
            }
            
        } catch (Exception e) {
            LOGGER.error("🚨 [内存清理] 清理任务出错: {}", e.getMessage(), e);
        }
    }
    
    /**
     * 存储对象到弱引用缓存
     */
    public static void putWeak(String key, Object value) {
        if (key == null || value == null) return;
        
        weakCache.put(key, new WeakReference<>(value));
        accessTimestamps.put(key, System.currentTimeMillis());
    }
    
    /**
     * 从弱引用缓存获取对象
     */
    @SuppressWarnings("unchecked")
    public static <T> T getWeak(String key) {
        if (key == null) return null;
        
        WeakReference<Object> ref = weakCache.get(key);
        if (ref != null) {
            Object value = ref.get();
            if (value != null) {
                // 更新访问时间
                accessTimestamps.put(key, System.currentTimeMillis());
                totalCacheHits++;
                return (T) value;
            } else {
                // 引用已被回收
                weakCache.remove(key);
                accessTimestamps.remove(key);
            }
        }
        
        totalCacheMisses++;
        return null;
    }
    
    /**
     * 清空所有缓存
     */
    public static void clearAll() {
        weakCache.clear();
        accessTimestamps.clear();
        LOGGER.info("🧹 [内存管理] 所有缓存已清空");
    }
    
    /**
     * 手动触发清理
     */
    public static void manualCleanup() {
        performCleanup();
    }
    
    /**
     * 打印内存统计信息
     */
    public static void printMemoryStatistics() {
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        long maxMemory = runtime.maxMemory();
        
        double cacheHitRate = totalCacheHits + totalCacheMisses > 0 
            ? (double) totalCacheHits / (totalCacheHits + totalCacheMisses) * 100 
            : 0;
        
        LOGGER.info("📊 [内存统计]:");
        LOGGER.info("  ├─ 已用内存: {} MB / {} MB", usedMemory / 1024 / 1024, totalMemory / 1024 / 1024);
        LOGGER.info("  ├─ 最大内存: {} MB", maxMemory / 1024 / 1024);
        LOGGER.info("  ├─ 内存使用率: {:.2f}%", (double) usedMemory / maxMemory * 100);
        LOGGER.info("  ├─ 缓存条目数: {}", weakCache.size());
        LOGGER.info("  ├─ 缓存命中率: {:.2f}% (命中:{}, 未命中:{})", 
                   cacheHitRate, totalCacheHits, totalCacheMisses);
        LOGGER.info("  └─ 清理次数: {}", totalCacheCleanups);
        
        // 如果内存使用率超过80%，建议GC
        if ((double) usedMemory / maxMemory > 0.8) {
            LOGGER.warn("⚠️ [内存警告] 内存使用率超过80%，建议进行GC");
            suggestGC();
        }
    }
    
    /**
     * 建议JVM进行垃圾回收
     */
    public static void suggestGC() {
        LOGGER.info("🧹 [内存管理] 建议JVM进行垃圾回收...");
        long beforeGC = Runtime.getRuntime().freeMemory();
        System.gc();
        System.runFinalization();
        
        // 等待一小段时间让GC完成
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        long afterGC = Runtime.getRuntime().freeMemory();
        long freedMemory = afterGC - beforeGC;
        LOGGER.info("✅ [内存管理] GC完成，释放内存: {} MB", freedMemory / 1024 / 1024);
    }
    
    /**
     * 获取缓存统计信息
     */
    public static Map<String, Object> getCacheStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("cacheSize", weakCache.size());
        stats.put("cacheHits", totalCacheHits);
        stats.put("cacheMisses", totalCacheMisses);
        stats.put("cleanupCount", totalCacheCleanups);
        
        double hitRate = totalCacheHits + totalCacheMisses > 0 
            ? (double) totalCacheHits / (totalCacheHits + totalCacheMisses) * 100 
            : 0;
        stats.put("hitRate", hitRate);
        
        return stats;
    }
    
    /**
     * 重置统计信息
     */
    public static void resetStatistics() {
        totalCacheHits = 0;
        totalCacheMisses = 0;
        totalCacheCleanups = 0;
        LOGGER.info("🔄 [内存管理] 统计信息已重置");
    }
    
    /**
     * 关闭清理任务
     */
    public static void shutdown() {
        if (cleanupExecutor != null && !cleanupExecutor.isShutdown()) {
            cleanupExecutor.shutdown();
            try {
                if (!cleanupExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                    cleanupExecutor.shutdownNow();
                }
            } catch (InterruptedException e) {
                cleanupExecutor.shutdownNow();
                Thread.currentThread().interrupt();
            }
            LOGGER.info("🛡️ [内存管理] 清理任务已关闭");
        }
        clearAll();
    }
    
    /**
     * 检查是否需要进行内存清理
     */
    public static boolean needsCleanup() {
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        return (double) usedMemory / maxMemory > 0.75; // 超过75%触发清理
    }
    
    /**
     * 自适应清理：根据内存压力调整清理策略
     */
    public static void adaptiveCleanup() {
        if (needsCleanup()) {
            LOGGER.info("🧹 [自适应清理] 检测到内存压力，执行清理...");
            
            // 1. 清理过期缓存
            performCleanup();
            
            // 2. 如果仍然内存紧张，建议GC
            if (needsCleanup()) {
                suggestGC();
            }
            
            // 3. 如果还是紧张，清空所有缓存
            if (needsCleanup()) {
                LOGGER.warn("⚠️ [内存警告] 内存仍然紧张，清空所有缓存");
                clearAll();
            }
        }
    }
}


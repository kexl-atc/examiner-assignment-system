package com.examiner.scheduler.cache;

import com.examiner.scheduler.domain.DutySchedule;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Gauge;
import io.quarkus.scheduler.Scheduled;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.PostConstruct;
import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.lang.ref.SoftReference;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 企业级缓存管理器
 * 
 * 功能特性：
 * 1. 多级缓存（内存 + 软引用）
 * 2. 自动过期清理
 * 3. 内存压力感知
 * 4. 命中率监控
 * 5. 线程安全
 * 
 * @author Enterprise Architecture Team
 * @version 8.0.1
 */
@ApplicationScoped
public class EnterpriseCacheManager {

    private static final Logger logger = LoggerFactory.getLogger(EnterpriseCacheManager.class);

    @Inject
    MeterRegistry meterRegistry;

    // 一级缓存：强引用，高频访问数据
    private final Map<String, CacheEntry<?>> l1Cache = new ConcurrentHashMap<>();
    
    // 二级缓存：软引用，低频访问数据
    private final Map<String, SoftReference<CacheEntry<?>>> l2Cache = new ConcurrentHashMap<>();
    
    // 统计
    private final AtomicLong hitCount = new AtomicLong(0);
    private final AtomicLong missCount = new AtomicLong(0);
    private final AtomicLong evictionCount = new AtomicLong(0);

    // 配置参数
    private static final long DEFAULT_TTL_SECONDS = 300; // 5分钟
    private static final int L1_MAX_SIZE = 1000;
    private static final double L1_EVICTION_RATIO = 0.25; // 淘汰25%

    @PostConstruct
    void init() {
        // 注册监控指标
        Gauge.builder("cache.l1.size", l1Cache, Map::size)
            .description("L1缓存大小")
            .register(meterRegistry);
        
        Gauge.builder("cache.l2.size", l2Cache, Map::size)
            .description("L2缓存大小")
            .register(meterRegistry);
        
        Gauge.builder("cache.hit.rate", this, EnterpriseCacheManager::getHitRate)
            .description("缓存命中率")
            .register(meterRegistry);
        
        logger.info("🚀 企业级缓存管理器初始化完成");
    }

    /**
     * 获取或计算值
     */
    public <T> T getOrCompute(String key, CacheLoader<T> loader) {
        return getOrCompute(key, loader, DEFAULT_TTL_SECONDS);
    }

    /**
     * 获取或计算值（指定TTL）
     */
    @SuppressWarnings("unchecked")
    public <T> T getOrCompute(String key, CacheLoader<T> loader, long ttlSeconds) {
        // 1. 尝试从L1缓存获取
        CacheEntry<T> l1Entry = (CacheEntry<T>) l1Cache.get(key);
        if (l1Entry != null && !l1Entry.isExpired()) {
            hitCount.incrementAndGet();
            return l1Entry.getValue();
        }

        // 2. 尝试从L2缓存获取
        SoftReference<CacheEntry<?>> l2Ref = l2Cache.get(key);
        if (l2Ref != null) {
            CacheEntry<T> l2Entry = (CacheEntry<T>) l2Ref.get();
            if (l2Entry != null && !l2Entry.isExpired()) {
                hitCount.incrementAndGet();
                // 提升到L1
                promoteToL1(key, l2Entry);
                return l2Entry.getValue();
            }
        }

        // 3. 加载数据
        missCount.incrementAndGet();
        T value = loader.load();
        
        // 4. 存入缓存
        put(key, value, ttlSeconds);
        
        return value;
    }

    /**
     * 存入缓存
     */
    public <T> void put(String key, T value) {
        put(key, value, DEFAULT_TTL_SECONDS);
    }

    /**
     * 存入缓存（指定TTL）
     */
    public <T> void put(String key, T value, long ttlSeconds) {
        CacheEntry<T> entry = new CacheEntry<>(value, ttlSeconds);
        
        // L1缓存大小控制
        if (l1Cache.size() >= L1_MAX_SIZE) {
            evictL1Entries();
        }
        
        l1Cache.put(key, entry);
    }

    /**
     * 获取缓存值（可能返回null）
     */
    @SuppressWarnings("unchecked")
    public <T> T get(String key) {
        CacheEntry<T> entry = (CacheEntry<T>) l1Cache.get(key);
        if (entry != null && !entry.isExpired()) {
            hitCount.incrementAndGet();
            return entry.getValue();
        }
        
        SoftReference<CacheEntry<?>> ref = l2Cache.get(key);
        if (ref != null) {
            CacheEntry<T> l2Entry = (CacheEntry<T>) ref.get();
            if (l2Entry != null && !l2Entry.isExpired()) {
                hitCount.incrementAndGet();
                return l2Entry.getValue();
            }
        }
        
        missCount.incrementAndGet();
        return null;
    }

    /**
     * 使缓存项失效
     */
    public void invalidate(String key) {
        l1Cache.remove(key);
        l2Cache.remove(key);
    }

    /**
     * 使匹配前缀的所有缓存项失效
     */
    public void invalidateByPrefix(String prefix) {
        l1Cache.keySet().removeIf(key -> key.startsWith(prefix));
        l2Cache.keySet().removeIf(key -> key.startsWith(prefix));
    }

    /**
     * 清空所有缓存
     */
    public void clearAll() {
        l1Cache.clear();
        l2Cache.clear();
        logger.info("🧹 所有缓存已清空");
    }

    /**
     * 获取缓存统计
     */
    public CacheStats getStats() {
        return new CacheStats(
            l1Cache.size(),
            l2Cache.size(),
            hitCount.get(),
            missCount.get(),
            evictionCount.get(),
            getHitRate()
        );
    }

    /**
     * 获取命中率
     */
    public double getHitRate() {
        long hits = hitCount.get();
        long misses = missCount.get();
        long total = hits + misses;
        return total == 0 ? 0.0 : (double) hits / total;
    }

    /**
     * 定期清理过期缓存
     */
    @Scheduled(every = "5m")
    void cleanupExpiredEntries() {
        int l1Removed = 0;
        int l2Removed = 0;

        // 清理L1过期项
        for (Map.Entry<String, CacheEntry<?>> entry : l1Cache.entrySet()) {
            if (entry.getValue().isExpired()) {
                l1Cache.remove(entry.getKey());
                l1Removed++;
            }
        }

        // 清理L2过期项和已回收的软引用
        for (Map.Entry<String, SoftReference<CacheEntry<?>>> entry : l2Cache.entrySet()) {
            SoftReference<CacheEntry<?>> ref = entry.getValue();
            CacheEntry<?> cached = ref.get();
            if (cached == null || cached.isExpired()) {
                l2Cache.remove(entry.getKey());
                l2Removed++;
            }
        }

        if (l1Removed > 0 || l2Removed > 0) {
            logger.debug("🧹 清理缓存: L1={}, L2={}", l1Removed, l2Removed);
        }
    }

    /**
     * 提升到L1缓存
     */
    private <T> void promoteToL1(String key, CacheEntry<T> entry) {
        if (l1Cache.size() >= L1_MAX_SIZE) {
            evictL1Entries();
        }
        l1Cache.put(key, entry);
    }

    /**
     * 淘汰L1缓存项（移到L2）
     */
    private void evictL1Entries() {
        int toEvict = (int) (L1_MAX_SIZE * L1_EVICTION_RATIO);
        int evicted = 0;

        // 简单的FIFO淘汰策略
        for (String key : l1Cache.keySet()) {
            if (evicted >= toEvict) break;
            
            CacheEntry<?> entry = l1Cache.remove(key);
            if (entry != null) {
                // 移到L2
                l2Cache.put(key, new SoftReference<>(entry));
                evicted++;
            }
        }

        evictionCount.addAndGet(evicted);
        logger.debug("📤 淘汰L1缓存项: {} 个 -> L2", evicted);
    }

    // ==================== 专用缓存方法 ====================

    /**
     * 获取DutySchedule（专用缓存方法）
     */
    public DutySchedule getDutySchedule(String date) {
        return getOrCompute("duty:" + date, () -> DutySchedule.forDate(date));
    }

    /**
     * 获取解析后的日期（专用缓存方法）
     */
    public LocalDate getParsedDate(String dateStr) {
        return getOrCompute("date:" + dateStr, () -> LocalDate.parse(dateStr));
    }

    // ==================== 内部类 ====================

    /**
     * 缓存条目
     */
    private static class CacheEntry<T> {
        private final T value;
        private final LocalDateTime expireAt;

        CacheEntry(T value, long ttlSeconds) {
            this.value = value;
            this.expireAt = LocalDateTime.now().plusSeconds(ttlSeconds);
        }

        T getValue() {
            return value;
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(expireAt);
        }
    }

    /**
     * 缓存加载器接口
     */
    @FunctionalInterface
    public interface CacheLoader<T> {
        T load();
    }

    /**
     * 缓存统计记录
     */
    public record CacheStats(
        int l1Size,
        int l2Size,
        long hits,
        long misses,
        long evictions,
        double hitRate
    ) {
        @Override
        public String toString() {
            return String.format(
                "CacheStats{L1=%d, L2=%d, hits=%d, misses=%d, rate=%.2f%%}",
                l1Size, l2Size, hits, misses, hitRate * 100
            );
        }
    }
}

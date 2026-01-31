package com.examiner.scheduler.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket日志推送器
 * 用于将OptaPlanner约束检查日志实时推送到前端
 * 🔧 v5.5.5: 移除所有 System.out.println，使用 LOGGER (DEBUG级别)
 */
public class WebSocketLogPusher {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(WebSocketLogPusher.class);
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    
    // 当前活跃的sessionId（使用静态变量，支持多线程）
    private static final ThreadLocal<String> currentSessionId = new ThreadLocal<>();
    
    // 🔧 v5.5.5: 缓存会话活跃状态，避免重复警告
    private static final ThreadLocal<Boolean> sessionInactiveWarned = ThreadLocal.withInitial(() -> false);
    
    /**
     * 设置当前求解会话的sessionId
     * 🔧 v5.5.5: 移除打印语句，使用 DEBUG 日志
     */
    public static void setSessionId(String sessionId) {
        currentSessionId.set(sessionId);
        sessionInactiveWarned.set(false); // 重置警告标志
        if (LOGGER.isDebugEnabled()) {
            LOGGER.debug("设置sessionId: {}", sessionId);
        }
    }
    
    /**
     * 清除sessionId
     * 🔧 v5.5.5: 移除打印语句，使用 DEBUG 日志
     */
    public static void clearSessionId() {
        if (LOGGER.isDebugEnabled()) {
            LOGGER.debug("清除sessionId: {}", currentSessionId.get());
        }
        currentSessionId.remove();
        sessionInactiveWarned.remove(); // 重置警告标志
    }
    
    /**
     * 获取当前sessionId
     */
    public static String getSessionId() {
        return currentSessionId.get();
    }
    
    /**
     * 推送INFO级别日志
     */
    public static void logInfo(String message) {
        pushLog("info", message);
    }
    
    /**
     * 推送SUCCESS级别日志
     */
    public static void logSuccess(String message) {
        pushLog("success", message);
    }
    
    /**
     * 推送WARNING级别日志
     */
    public static void logWarning(String message) {
        pushLog("warning", message);
    }
    
    /**
     * 推送ERROR级别日志
     */
    public static void logError(String message) {
        pushLog("error", message);
    }
    
    /**
     * 推送日志到WebSocket
     * 🔧 v5.5.5: 完全移除打印语句，减少日志输出
     */
    private static void pushLog(String type, String message) {
        String sessionId = currentSessionId.get();
        
        // 🔧 静默失败，不输出任何日志
        if (sessionId == null) {
            return;
        }
        
        // 🔧 检查会话活跃状态，只在第一次失败时警告
        if (!ScheduleProgressWebSocket.isSessionActive(sessionId)) {
            if (!Boolean.TRUE.equals(sessionInactiveWarned.get())) {
                LOGGER.warn("WebSocket会话不活跃，停止推送日志: {}", sessionId);
                sessionInactiveWarned.set(true);
            }
            return;
        }
        
        try {
            // 构建日志数据
            Map<String, Object> logData = new HashMap<>();
            logData.put("time", LocalTime.now().format(TIME_FORMATTER));
            logData.put("type", type);
            logData.put("message", message);
            
            // 🔧 只在 TRACE 级别记录详细推送信息
            if (LOGGER.isTraceEnabled()) {
                LOGGER.trace("推送日志: sessionId={}, type={}, message={}", sessionId, type, message);
            }
            
            // 通过WebSocket推送
            ScheduleProgressWebSocket.sendLogMessage(sessionId, logData);
        } catch (Exception e) {
            // 🔧 只记录ERROR级别异常
            LOGGER.error("日志推送失败: {}", e.getMessage());
        }
    }
}


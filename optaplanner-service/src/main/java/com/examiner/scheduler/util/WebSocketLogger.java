package com.examiner.scheduler.util;

import com.examiner.scheduler.websocket.ScheduleProgressWebSocket;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

/**
 * WebSocket日志工具类
 * 将日志同时输出到控制台和WebSocket客户端
 */
public class WebSocketLogger {
    
    private static final Logger LOGGER = Logger.getLogger(WebSocketLogger.class.getName());
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    
    private static final ThreadLocal<String> currentSessionId = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> enabled = ThreadLocal.withInitial(() -> false);
    
    /**
     * 启用WebSocket日志推送
     */
    public static void enable(String sessionId) {
        currentSessionId.set(sessionId);
        enabled.set(true);
        LOGGER.info("📡 [WebSocket日志] 已启用，sessionId=" + sessionId);
    }
    
    /**
     * 禁用WebSocket日志推送
     */
    public static void disable() {
        enabled.set(false);
        currentSessionId.remove();
        LOGGER.info("📡 [WebSocket日志] 已禁用");
    }
    
    /**
     * 发送INFO级别日志
     */
    public static void info(String message) {
        log(message, "info");
    }
    
    /**
     * 发送SUCCESS级别日志
     */
    public static void success(String message) {
        log(message, "success");
    }
    
    /**
     * 发送WARNING级别日志
     */
    public static void warning(String message) {
        log(message, "warning");
    }
    
    /**
     * 发送ERROR级别日志
     */
    public static void error(String message) {
        log(message, "error");
    }
    
    /**
     * 通用日志方法
     */
    private static void log(String message, String type) {
        // 总是输出到控制台
        String prefix = getPrefix(type);
        System.out.println(prefix + " " + message);
        
        // 如果启用了WebSocket推送，则推送到前端
        String sessionId = currentSessionId.get();
        if (Boolean.TRUE.equals(enabled.get()) && sessionId != null) {
            try {
                Map<String, Object> logData = new HashMap<>();
                logData.put("time", LocalTime.now().format(TIME_FORMATTER));
                logData.put("message", message);
                logData.put("type", type);
                
                ScheduleProgressWebSocket.sendLogMessage(sessionId, logData);
            } catch (Exception e) {
                // 忽略推送失败，不影响主流程
            }
        }
    }
    
    /**
     * 获取日志前缀
     */
    private static String getPrefix(String type) {
        switch (type) {
            case "success":
                return "✅";
            case "warning":
                return "⚠️";
            case "error":
                return "❌";
            case "info":
            default:
                return "ℹ️";
        }
    }
    
    /**
     * 检查是否启用
     */
    public static boolean isEnabled() {
        return Boolean.TRUE.equals(enabled.get());
    }
}


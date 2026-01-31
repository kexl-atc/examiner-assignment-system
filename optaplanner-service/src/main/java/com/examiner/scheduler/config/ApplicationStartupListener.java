package com.examiner.scheduler.config;

import com.examiner.scheduler.util.WebSocketLogger;
import com.examiner.scheduler.websocket.WebSocketLogPusher;
import io.quarkus.runtime.StartupEvent;
import org.jboss.logging.Logger;

import javax.enterprise.context.ApplicationScoped;
import javax.enterprise.event.Observes;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * 应用启动监听器
 * 在应用启动时初始化WebSocket日志推送，确保前端能够接收到系统启动日志
 */
@ApplicationScoped
public class ApplicationStartupListener {
    
    private static final Logger LOGGER = Logger.getLogger(ApplicationStartupListener.class);
    
    // 应用启动时的默认会话ID
    private static final String STARTUP_SESSION_ID = "startup-" + UUID.randomUUID().toString().substring(0, 8);
    
    /**
     * 应用启动事件处理
     */
    void onStart(@Observes StartupEvent ev) {
        LOGGER.info("🚀 应用启动监听器：开始初始化WebSocket日志推送");
        
        try {
            Path logsDir = Paths.get("logs");
            Files.createDirectories(logsDir);
            String current = System.getProperty("app.log.path");
            if (current == null || current.trim().isEmpty()) {
                String profile = System.getProperty("quarkus.profile");
                String defaultLogFile = "production".equalsIgnoreCase(profile)
                        ? "examiner-scheduler.log"
                        : "backend.log";
                System.setProperty("app.log.path", logsDir.resolve(defaultLogFile).toString());
            }
        } catch (Exception e) {
            LOGGER.error("❌ 初始化日志目录失败", e);
        }
        
        try {
            // 启用WebSocket日志推送
            WebSocketLogger.enable(STARTUP_SESSION_ID);
            WebSocketLogPusher.setSessionId(STARTUP_SESSION_ID);
            
            // 推送应用启动日志
            WebSocketLogger.info("🎯 教员排班系统后端服务已启动");
            WebSocketLogger.info("📡 WebSocket日志推送已启用");
            WebSocketLogger.info("🔧 系统正在初始化数据库连接...");
            WebSocketLogger.info("⚡ OptaPlanner约束求解引擎已就绪");
            WebSocketLogger.success("✅ 后端服务启动完成，等待前端连接");
            
            LOGGER.info("✅ WebSocket日志推送初始化完成，sessionId: " + STARTUP_SESSION_ID);
            
        } catch (Exception e) {
            LOGGER.error("❌ WebSocket日志推送初始化失败", e);
        }
    }
    
    /**
     * 获取启动会话ID
     */
    public static String getStartupSessionId() {
        return STARTUP_SESSION_ID;
    }
}
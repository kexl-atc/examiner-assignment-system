package com.examiner.scheduler.websocket;

import javax.annotation.PreDestroy;
import javax.enterprise.context.ApplicationScoped;
import javax.websocket.*;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * 统计信息WebSocket端点
 * 实时广播系统统计信息
 */
@ServerEndpoint(
    value = "/ws/statistics",
    configurator = WebSocketOriginConfigurator.class
)
@ApplicationScoped
public class StatisticsWebSocket {
    
    private static final Logger LOGGER = Logger.getLogger(StatisticsWebSocket.class.getName());
    private static final Set<Session> sessions = Collections.synchronizedSet(new HashSet<>());
    private static final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private static final ScheduledFuture<?> broadcastTask;
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    static {
        // 启动定时任务，每5秒发送一次统计信息
        broadcastTask = scheduler.scheduleAtFixedRate(() -> {
            try {
                broadcastStatistics();
            } catch (Exception e) {
                LOGGER.severe("发送统计信息失败: " + e.getMessage());
            }
        }, 0, 5, TimeUnit.SECONDS);
    }

    @PreDestroy
    void shutdown() {
        try {
            broadcastTask.cancel(false);
        } catch (Exception e) {
            LOGGER.severe("取消统计定时任务失败: " + e.getMessage());
        }

        synchronized (sessions) {
            sessions.removeIf(session -> {
                try {
                    if (session != null && session.isOpen()) {
                        session.close();
                    }
                } catch (Exception e) {
                    LOGGER.severe("关闭WebSocket会话失败: " + e.getMessage());
                }
                return true;
            });
        }

        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
    
    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
        // 移除日志调用
        
        // 立即发送当前统计信息
        try {
            sendStatistics(session);
        } catch (IOException e) {
            // 移除日志调用
        }
    }
    
    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
        // 移除日志调用
    }
    
    @OnError
    public void onError(Session session, Throwable throwable) {
        // 只记录严重错误
        if (throwable != null) {
            LOGGER.severe("WebSocket错误: " + throwable.getMessage());
        }
        sessions.remove(session);
    }
    
    @OnMessage
    public void onMessage(String message, Session session) {
        // 移除日志调用
        // 可以根据消息类型处理不同的请求
        try {
            sendStatistics(session);
        } catch (IOException e) {
            // 移除日志调用
        }
    }
    
    /**
     * 向所有连接的客户端广播统计信息
     */
    private static void broadcastStatistics() {
        if (sessions.isEmpty()) {
            return;
        }
        
        try {
            ObjectNode statistics = generateStatistics();
            String message = objectMapper.writeValueAsString(statistics);
            
            synchronized (sessions) {
                sessions.removeIf(session -> {
                    try {
                        if (session.isOpen()) {
                            session.getBasicRemote().sendText(message);
                            return false;
                        } else {
                            return true;
                        }
                    } catch (IOException e) {
                        // 移除日志调用
                        return true;
                    }
                });
            }
        } catch (Exception e) {
            LOGGER.severe("生成统计信息失败: " + e.getMessage());
        }
    }
    
    /**
     * 向指定会话发送统计信息
     */
    private void sendStatistics(Session session) throws IOException {
        if (session.isOpen()) {
            ObjectNode statistics = generateStatistics();
            String message = objectMapper.writeValueAsString(statistics);
            session.getBasicRemote().sendText(message);
        }
    }
    
    /**
     * 生成模拟的统计信息
     */
    private static ObjectNode generateStatistics() {
        ObjectNode stats = objectMapper.createObjectNode();
        
        // 基本统计信息
        stats.put("timestamp", System.currentTimeMillis());
        stats.put("activeConnections", sessions.size());
        stats.put("serverStatus", "RUNNING");
        
        // 排班统计信息
        ObjectNode scheduling = objectMapper.createObjectNode();
        scheduling.put("totalStudents", 25);
        scheduling.put("assignedStudents", (int)(Math.random() * 25) + 20);
        scheduling.put("totalTeachers", 15);
        scheduling.put("activeTeachers", (int)(Math.random() * 15) + 10);
        scheduling.put("successRate", Math.round((Math.random() * 20 + 80) * 100) / 100.0);
        scheduling.put("averageWorkload", Math.round((Math.random() * 10 + 15) * 100) / 100.0);
        
        stats.set("scheduling", scheduling);
        
        // 约束统计信息
        ObjectNode constraints = objectMapper.createObjectNode();
        constraints.put("hardConstraintViolations", (int)(Math.random() * 3));
        constraints.put("softConstraintViolations", (int)(Math.random() * 10) + 5);
        constraints.put("totalConstraints", 18);
        constraints.put("satisfiedConstraints", 18 - (int)(Math.random() * 3));
        
        stats.set("constraints", constraints);
        
        // 性能统计信息
        ObjectNode performance = objectMapper.createObjectNode();
        performance.put("lastSolveTime", (int)(Math.random() * 5000) + 1000);
        performance.put("averageSolveTime", (int)(Math.random() * 3000) + 2000);
        performance.put("memoryUsage", Math.round((Math.random() * 30 + 40) * 100) / 100.0);
        performance.put("cpuUsage", Math.round((Math.random() * 20 + 30) * 100) / 100.0);
        
        stats.set("performance", performance);
        
        return stats;
    }
    
    /**
     * 手动触发统计信息广播（供其他服务调用）
     */
    public static void triggerStatisticsBroadcast() {
        broadcastStatistics();
    }
    
    /**
     * 获取当前连接数
     */
    public static int getActiveConnections() {
        return sessions.size();
    }
}
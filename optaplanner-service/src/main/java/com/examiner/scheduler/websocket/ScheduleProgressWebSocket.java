package com.examiner.scheduler.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.websocket.*;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 排班进度WebSocket端点
 * 实时推送求解器的中间结果和进度信息
 */
@ServerEndpoint(
    value = "/ws/schedule-progress/{sessionId}",
    configurator = WebSocketOriginConfigurator.class
)
@ApplicationScoped
public class ScheduleProgressWebSocket {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(ScheduleProgressWebSocket.class);
    private static final ObjectMapper objectMapper = createObjectMapper();
    
    // 存储所有活跃的会话
    private static final Map<String, Session> sessions = new ConcurrentHashMap<>();
    
    /**
     * 创建配置了UTF-8编码的ObjectMapper
     */
    private static ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // 配置JSON生成器使用UTF-8编码，确保中文字符正确序列化
        @SuppressWarnings("deprecation")
        var feature = JsonGenerator.Feature.ESCAPE_NON_ASCII;
        mapper.getFactory().configure(feature, false);
        return mapper;
    }
    
    @OnOpen
    public void onOpen(Session session, @PathParam("sessionId") String sessionId) {
        try {
            // 🔧 设置WebSocket超时时间为10分钟（600秒），足够长时间的求解过程
            session.setMaxIdleTimeout(600000); // 10分钟 = 600,000毫秒
            
            // 🔧 移除所有日志调用，防止大量日志文件产生
            
            sessions.put(sessionId, session);
            
            // 发送连接确认消息
            sendMessage(sessionId, new ProgressMessage(
                "connected",
                "WebSocket连接已建立",
                null
            ));
        } catch (Exception e) {
            LOGGER.error("📡 [WebSocket] ❌ 连接失败: sessionId={}, error={}", sessionId, e.getMessage(), e);
            throw e;
        }
    }
    
    @OnClose
    public void onClose(Session session, @PathParam("sessionId") String sessionId) {
        sessions.remove(sessionId);
        // 移除日志调用
    }
    
    @OnError
    public void onError(Session session, @PathParam("sessionId") String sessionId, Throwable throwable) {
        LOGGER.error("📡 [WebSocket] 连接错误: sessionId={}, error={}", sessionId, throwable.getMessage());
        sessions.remove(sessionId);
    }
    
    /**
     * 发送进度更新消息
     */
    public static void sendProgressUpdate(String sessionId, ProgressUpdate update) {
        ProgressMessage message = new ProgressMessage(
            "progress",
            "求解进度更新",
            update
        );
        sendMessage(sessionId, message);
    }
    
    /**
     * 🔧 发送心跳消息保持连接活跃
     */
    public static void sendHeartbeat(String sessionId) {
        ProgressMessage message = new ProgressMessage(
            "heartbeat",
            "保持连接",
            null
        );
        sendMessage(sessionId, message);
    }
    
    /**
     * 发送中间结果
     */
    public static void sendIntermediateResult(String sessionId, IntermediateResult result) {
        ProgressMessage message = new ProgressMessage(
            "intermediate_result",
            "中间结果",
            result
        );
        sendMessage(sessionId, message);
    }
    
    /**
     * 发送分数改进通知
     */
    public static void sendScoreImprovement(String sessionId, ScoreUpdate scoreUpdate) {
        ProgressMessage message = new ProgressMessage(
            "score_improvement",
            "分数改进",
            scoreUpdate
        );
        sendMessage(sessionId, message);
    }
    
    /**
     * 发送级别升级通知
     */
    public static void sendLevelUpgrade(String sessionId, LevelUpgrade upgrade) {
        ProgressMessage message = new ProgressMessage(
            "level_upgrade",
            "级别升级",
            upgrade
        );
        sendMessage(sessionId, message);
    }
    
    /**
     * 发送最终结果
     */
    public static void sendFinalResult(String sessionId, Object result) {
        ProgressMessage message = new ProgressMessage(
            "final_result",
            "求解完成",
            result
        );
        sendMessage(sessionId, message);
    }
    
    /**
     * 发送错误消息
     */
    public static void sendError(String sessionId, String error) {
        ProgressMessage message = new ProgressMessage(
            "error",
            error,
            null
        );
        sendMessage(sessionId, message);
    }
    
    /**
     * 🆕 发送日志消息
     * 用于实时推送后端日志到前端界面
     */
    public static void sendLogMessage(String sessionId, Object logData) {
        ProgressMessage message = new ProgressMessage(
            "log",
            "实时日志",
            logData
        );
        sendMessage(sessionId, message);
    }
    
    /**
     * 通用消息发送方法
     */
    private static void sendMessage(String sessionId, ProgressMessage message) {
        Session session = sessions.get(sessionId);
        if (session != null && session.isOpen()) {
            try {
                String json = objectMapper.writeValueAsString(message);
                session.getAsyncRemote().sendText(json);
                // 移除所有日志调用，防止大量日志
            } catch (Exception e) {
                // 只在真正出错时记录
                LOGGER.error("📡 [WebSocket] 发送消息失败: sessionId={}, error={}", sessionId, e.getMessage());
            }
        }
        // 移除 warn 日志
    }
    
    /**
     * 检查会话是否活跃
     */
    public static boolean isSessionActive(String sessionId) {
        Session session = sessions.get(sessionId);
        return session != null && session.isOpen();
    }
    
    /**
     * 🆕 v5.6.0: 广播自定义消息（用于局部重排等新功能）
     * 
     * @param sessionId 会话ID
     * @param data 消息数据
     */
    public static void broadcast(String sessionId, Map<String, Object> data) {
        try {
            String type = (String) data.getOrDefault("type", "custom");
            String message = (String) data.getOrDefault("message", "");
            
            ProgressMessage progressMessage = new ProgressMessage(type, message, data);
            sendMessage(sessionId, progressMessage);
            
        } catch (Exception e) {
            LOGGER.error("📡 [WebSocket] 广播消息失败: sessionId={}, error={}", sessionId, e.getMessage());
        }
    }
    
    // ========== 数据传输对象 ==========
    
    public static class ProgressMessage {
        public String type;
        public String message;
        public Object data;
        public long timestamp;
        
        public ProgressMessage(String type, String message, Object data) {
            this.type = type;
            this.message = message;
            this.data = data;
            this.timestamp = System.currentTimeMillis();
        }
    }
    
    public static class ProgressUpdate {
        public int currentLevel;          // 当前级别 (1=闪电, 2=标准, 3=精细)
        public String levelName;          // 级别名称
        public long elapsedTime;          // 已用时间（毫秒）
        public long estimatedRemaining;   // 预计剩余时间（毫秒）
        public int progressPercentage;    // 进度百分比
        public String currentScore;       // 当前分数
        public int iterationCount;        // 迭代次数
        public int assignmentCount;       // 🔧 新增：当前分配数量
        
        public ProgressUpdate(int currentLevel, String levelName, long elapsedTime, 
                            long estimatedRemaining, int progressPercentage, 
                            String currentScore, int iterationCount) {
            this.currentLevel = currentLevel;
            this.levelName = levelName;
            this.elapsedTime = elapsedTime;
            this.estimatedRemaining = estimatedRemaining;
            this.progressPercentage = progressPercentage;
            this.currentScore = currentScore;
            this.iterationCount = iterationCount;
            this.assignmentCount = 0;  // 默认值
        }
        
        // 🆕 带assignmentCount的构造函数
        public ProgressUpdate(int currentLevel, String levelName, long elapsedTime, 
                            long estimatedRemaining, int progressPercentage, 
                            String currentScore, int iterationCount, int assignmentCount) {
            this.currentLevel = currentLevel;
            this.levelName = levelName;
            this.elapsedTime = elapsedTime;
            this.estimatedRemaining = estimatedRemaining;
            this.progressPercentage = progressPercentage;
            this.currentScore = currentScore;
            this.iterationCount = iterationCount;
            this.assignmentCount = assignmentCount;
        }
    }
    
    public static class IntermediateResult {
        public String score;
        public int assignmentCount;
        public double confidence;         // 置信度 (0-1)
        public String quality;            // 质量评估
        public long elapsedTime;
        public Object assignments;        // 🆕 实际的排班分配数据
        
        public IntermediateResult(String score, int assignmentCount, double confidence, 
                                String quality, long elapsedTime) {
            this.score = score;
            this.assignmentCount = assignmentCount;
            this.confidence = confidence;
            this.quality = quality;
            this.elapsedTime = elapsedTime;
            this.assignments = null;
        }
        
        // 🆕 带排班数据的构造函数
        public IntermediateResult(String score, int assignmentCount, double confidence, 
                                String quality, long elapsedTime, Object assignments) {
            this.score = score;
            this.assignmentCount = assignmentCount;
            this.confidence = confidence;
            this.quality = quality;
            this.elapsedTime = elapsedTime;
            this.assignments = assignments;
        }
    }
    
    public static class ScoreUpdate {
        public String oldScore;
        public String newScore;
        public long improvementAmount;
        public long elapsedTime;
        
        public ScoreUpdate(String oldScore, String newScore, long improvementAmount, long elapsedTime) {
            this.oldScore = oldScore;
            this.newScore = newScore;
            this.improvementAmount = improvementAmount;
            this.elapsedTime = elapsedTime;
        }
    }
    
    public static class LevelUpgrade {
        public int fromLevel;
        public int toLevel;
        public String fromLevelName;
        public String toLevelName;
        public String reason;
        public String previousScore;
        
        public LevelUpgrade(int fromLevel, int toLevel, String fromLevelName, 
                          String toLevelName, String reason, String previousScore) {
            this.fromLevel = fromLevel;
            this.toLevel = toLevel;
            this.fromLevelName = fromLevelName;
            this.toLevelName = toLevelName;
            this.reason = reason;
            this.previousScore = previousScore;
        }
    }
}
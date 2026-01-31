package com.examiner.scheduler.rest;

import com.examiner.scheduler.websocket.ScheduleProgressWebSocket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

/**
 * 🔧 新增：排班进度 REST 接口
 * 用于 HTTP 轮询替代 WebSocket（解决 403 问题）
 */
@Path("/api/schedule/progress")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ScheduleProgressResource {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(ScheduleProgressResource.class);
    
    // 存储每个 sessionId 的最新进度信息
    private static final Map<String, ProgressSnapshot> progressCache = new HashMap<>();
    
    /**
     * 获取指定 session 的最新进度
     */
    @GET
    @Path("/{sessionId}")
    public Response getProgress(@PathParam("sessionId") String sessionId) {
        try {
            ProgressSnapshot snapshot = progressCache.get(sessionId);
            
            if (snapshot == null) {
                return Response.ok(Map.of(
                    "type", "not_found",
                    "message", "未找到该排班任务",
                    "sessionId", sessionId
                )).build();
            }
            
            return Response.ok(snapshot).build();
            
        } catch (Exception e) {
            LOGGER.error("获取进度失败: sessionId={}, error={}", sessionId, e.getMessage(), e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Map.of("error", e.getMessage()))
                .build();
        }
    }
    
    /**
     * 更新进度（由排班服务调用）
     * 🔧 v5.5.4.1: 增加全局进度回退保护
     */
    public static void updateProgress(String sessionId, ScheduleProgressWebSocket.ProgressUpdate update) {
        // 🔧 关键修复：检查是否存在旧的进度记录
        ProgressSnapshot oldSnapshot = progressCache.get(sessionId);
        int oldProgress = oldSnapshot != null ? oldSnapshot.progressPercentage : 0;
        int newProgress = update.progressPercentage;
        
        // 🔧 严格的进度回退保护：新进度必须 >= 旧进度
        if (newProgress < oldProgress) {
            LOGGER.debug("🔒 [进度保护] 阻止进度回退: sessionId={}, 旧进度={}%, 新进度={}%, 已忽略", 
                        sessionId, oldProgress, newProgress);
            // 保持旧进度，不更新
            return;
        }
        
        // 🔧 如果进度相同，但其他信息有更新（如分数、迭代次数），仍然更新
        ProgressSnapshot snapshot = new ProgressSnapshot();
        snapshot.sessionId = sessionId;
        snapshot.level = update.currentLevel; // 🔧 修复：使用正确的字段名
        snapshot.levelName = update.levelName;
        snapshot.progressPercentage = newProgress;  // 🔧 使用检查后的进度
        snapshot.currentScore = update.currentScore;
        snapshot.assignmentCount = update.assignmentCount;
        snapshot.iterationCount = update.iterationCount;  // 🔧 新增：迭代次数
        snapshot.totalAssignments = 0; // 🔧 ProgressUpdate 没有此字段
        snapshot.timestamp = System.currentTimeMillis();
        
        progressCache.put(sessionId, snapshot);
        
        // 🔧 关键日志：记录进度更新
        if (newProgress % 5 == 0 || newProgress > oldProgress) {
            LOGGER.info("📊 [进度更新] sessionId={}, 进度: {}% → {}%, 级别: {}, 分数: {}", 
                       sessionId, oldProgress, newProgress, update.levelName, update.currentScore);
        }
    }
    
    /**
     * 标记任务完成
     */
    public static void markCompleted(String sessionId) {
        ProgressSnapshot snapshot = progressCache.get(sessionId);
        if (snapshot != null) {
            snapshot.progressPercentage = 100;
            snapshot.levelName = "已完成";
        }
    }
    
    /**
     * 标记任务失败
     */
    public static void markFailed(String sessionId, String errorMessage) {
        ProgressSnapshot snapshot = new ProgressSnapshot();
        snapshot.sessionId = sessionId;
        snapshot.progressPercentage = 0;
        snapshot.levelName = "失败";
        snapshot.errorMessage = errorMessage;
        snapshot.timestamp = System.currentTimeMillis();
        
        progressCache.put(sessionId, snapshot);
    }
    
    /**
     * 清理过期的进度记录（超过 1 小时）
     */
    @GET
    @Path("/cleanup")
    public Response cleanup() {
        long now = System.currentTimeMillis();
        long oneHour = 60 * 60 * 1000;
        
        progressCache.entrySet().removeIf(entry -> 
            (now - entry.getValue().timestamp) > oneHour
        );
        
        return Response.ok(Map.of(
            "message", "清理完成",
            "remaining", progressCache.size()
        )).build();
    }
    
    /**
     * 进度快照
     */
    public static class ProgressSnapshot {
        public String sessionId;
        public int level;
        public String levelName;
        public int progressPercentage;
        public String currentScore;
        public int assignmentCount;
        public int iterationCount;      // 🔧 新增：迭代次数
        public int totalAssignments;
        public long timestamp;
        public String errorMessage;
    }
}


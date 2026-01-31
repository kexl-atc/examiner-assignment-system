package com.examiner.scheduler.service;

import com.examiner.scheduler.domain.ResourceShortageRecord;
import javax.inject.Singleton;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 资源不足通知服务
 * 支持SC13约束：管理资源不足记录，生成用户提醒
 */
@Singleton
public class ResourceShortageNotificationService {
    
    // 存储资源不足记录
    private final Map<String, ResourceShortageRecord> shortageRecords = new ConcurrentHashMap<>();
    
    // 存储用户通知消息
    private final List<UserNotificationMessage> notifications = new ArrayList<>();
    
    /**
     * 记录资源不足情况
     */
    public void recordResourceShortage(ResourceShortageRecord record) {
        String key = record.getStudentId() + "_" + record.getExamDate();
        shortageRecords.put(key, record);
        
        // 生成用户通知消息
        UserNotificationMessage notification = createNotificationMessage(record);
        notifications.add(notification);
        
        // 输出日志
        System.out.println(String.format("📢 SC13用户提醒: %s", notification.getMessage()));
    }
    
    /**
     * 获取所有资源不足记录
     */
    public List<ResourceShortageRecord> getAllShortageRecords() {
        return new ArrayList<>(shortageRecords.values());
    }
    
    /**
     * 获取指定学员的资源不足记录
     */
    public ResourceShortageRecord getShortageRecord(String studentId, String examDate) {
        String key = studentId + "_" + examDate;
        return shortageRecords.get(key);
    }
    
    /**
     * 获取所有用户通知消息
     */
    public List<UserNotificationMessage> getAllNotifications() {
        return new ArrayList<>(notifications);
    }
    
    /**
     * 获取严重资源不足的通知（需要用户立即关注）
     */
    public List<UserNotificationMessage> getSevereNotifications() {
        return notifications.stream()
                .filter(notification -> notification.getLevel() == NotificationLevel.CRITICAL)
                .toList();
    }
    
    /**
     * 清理过期的记录和通知
     */
    public void cleanupExpiredRecords(long maxAgeMillis) {
        long currentTime = System.currentTimeMillis();
        
        // 清理过期的资源不足记录
        shortageRecords.entrySet().removeIf(entry -> 
            currentTime - entry.getValue().getTimestamp() > maxAgeMillis);
        
        // 清理过期的通知消息
        notifications.removeIf(notification -> 
            currentTime - notification.getTimestamp() > maxAgeMillis);
    }
    
    /**
     * 创建用户通知消息
     */
    private UserNotificationMessage createNotificationMessage(ResourceShortageRecord record) {
        UserNotificationMessage notification = new UserNotificationMessage();
        notification.setTitle("推荐科室资源不足提醒");
        notification.setMessage(record.generateUserNotificationMessage());
        notification.setLevel(record.isSevereShortage() ? NotificationLevel.CRITICAL : NotificationLevel.WARNING);
        notification.setStudentId(record.getStudentId());
        notification.setStudentName(record.getStudentName());
        notification.setExamDate(record.getExamDate());
        notification.setTimestamp(System.currentTimeMillis());
        
        // 添加操作建议
        notification.addAction("扩展日期范围", "建议将考试日期范围扩展3-5天");
        notification.addAction("调整推荐科室", "考虑修改部分学员的推荐考官科室设置");
        notification.addAction("查看重新分配", "查看系统自动重新分配的结果");
        
        return notification;
    }
    
    /**
     * 用户通知消息类
     */
    public static class UserNotificationMessage {
        private String title;
        private String message;
        private NotificationLevel level;
        private String studentId;
        private String studentName;
        private String examDate;
        private long timestamp;
        private List<NotificationAction> actions;
        
        public UserNotificationMessage() {
            this.actions = new ArrayList<>();
            this.timestamp = System.currentTimeMillis();
        }
        
        public void addAction(String actionName, String actionDescription) {
            NotificationAction action = new NotificationAction();
            action.setName(actionName);
            action.setDescription(actionDescription);
            this.actions.add(action);
        }
        
        // Getters and Setters
        
        public String getTitle() {
            return title;
        }
        
        public void setTitle(String title) {
            this.title = title;
        }
        
        public String getMessage() {
            return message;
        }
        
        public void setMessage(String message) {
            this.message = message;
        }
        
        public NotificationLevel getLevel() {
            return level;
        }
        
        public void setLevel(NotificationLevel level) {
            this.level = level;
        }
        
        public String getStudentId() {
            return studentId;
        }
        
        public void setStudentId(String studentId) {
            this.studentId = studentId;
        }
        
        public String getStudentName() {
            return studentName;
        }
        
        public void setStudentName(String studentName) {
            this.studentName = studentName;
        }
        
        public String getExamDate() {
            return examDate;
        }
        
        public void setExamDate(String examDate) {
            this.examDate = examDate;
        }
        
        public long getTimestamp() {
            return timestamp;
        }
        
        public void setTimestamp(long timestamp) {
            this.timestamp = timestamp;
        }
        
        public List<NotificationAction> getActions() {
            return actions;
        }
        
        public void setActions(List<NotificationAction> actions) {
            this.actions = actions;
        }
    }
    
    /**
     * 通知操作类
     */
    public static class NotificationAction {
        private String name;
        private String description;
        
        // Getters and Setters
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public String getDescription() {
            return description;
        }
        
        public void setDescription(String description) {
            this.description = description;
        }
    }
    
    /**
     * 通知级别枚举
     */
    public enum NotificationLevel {
        INFO,     // 信息
        WARNING,  // 警告
        CRITICAL  // 严重
    }
}
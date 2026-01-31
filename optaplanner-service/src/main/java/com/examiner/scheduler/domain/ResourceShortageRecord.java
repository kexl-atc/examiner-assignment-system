package com.examiner.scheduler.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * 资源不足记录类
 * 用于SC13约束：记录推荐科室资源不足情况，生成用户提醒
 */
public class ResourceShortageRecord {
    
    private String studentId;
    private String studentName;
    private String examDate;
    private List<ResourceShortageDetail> shortages;
    private List<String> suggestions;
    private long timestamp;
    
    public ResourceShortageRecord() {
        this.shortages = new ArrayList<>();
        this.suggestions = new ArrayList<>();
        this.timestamp = System.currentTimeMillis();
    }
    
    /**
     * 添加资源不足详情
     */
    public void addShortage(String resourceType, String department, int demand, int available) {
        ResourceShortageDetail detail = new ResourceShortageDetail();
        detail.setResourceType(resourceType);
        detail.setDepartment(department);
        detail.setDemand(demand);
        detail.setAvailable(available);
        detail.setShortage(demand - available);
        this.shortages.add(detail);
    }
    
    /**
     * 添加解决建议
     */
    public void addSuggestion(String suggestion) {
        this.suggestions.add(suggestion);
    }
    
    /**
     * 生成用户友好的提醒消息
     */
    public String generateUserNotificationMessage() {
        StringBuilder message = new StringBuilder();
        message.append(String.format("学员 %s 在 %s 的考试安排检测到推荐科室资源不足：\n\n", 
            studentName, examDate));
        
        // 详细资源不足情况
        for (ResourceShortageDetail shortage : shortages) {
            message.append(String.format("• %s (%s)：需要 %d 个，可用 %d 个，缺少 %d 个\n",
                shortage.getResourceType(),
                shortage.getDepartment(),
                shortage.getDemand(),
                shortage.getAvailable(),
                shortage.getShortage()));
        }
        
        message.append("\n建议解决方案：\n");
        for (int i = 0; i < suggestions.size(); i++) {
            message.append(String.format("%d. %s\n", i + 1, suggestions.get(i)));
        }
        
        message.append("\n系统将根据约束条件自动进行最优重新分配。");
        
        return message.toString();
    }
    
    /**
     * 检查是否为严重资源不足（需要用户立即关注）
     */
    public boolean isSevereShortage() {
        return shortages.stream().anyMatch(shortage -> shortage.getShortage() >= 2);
    }
    
    /**
     * 获取总缺少的资源数量
     */
    public int getTotalShortage() {
        return shortages.stream().mapToInt(ResourceShortageDetail::getShortage).sum();
    }
    
    // Getters and Setters
    
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
    
    public List<ResourceShortageDetail> getShortages() {
        return shortages;
    }
    
    public void setShortages(List<ResourceShortageDetail> shortages) {
        this.shortages = shortages;
    }
    
    public List<String> getSuggestions() {
        return suggestions;
    }
    
    public void setSuggestions(List<String> suggestions) {
        this.suggestions = suggestions;
    }
    
    public long getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
    
    /**
     * 资源不足详情内部类
     */
    public static class ResourceShortageDetail {
        private String resourceType;  // 资源类型：推荐考官2科室、推荐备份考官科室
        private String department;    // 科室名称
        private int demand;          // 需求量
        private int available;       // 可用量
        private int shortage;        // 缺少量
        
        // Getters and Setters
        
        public String getResourceType() {
            return resourceType;
        }
        
        public void setResourceType(String resourceType) {
            this.resourceType = resourceType;
        }
        
        public String getDepartment() {
            return department;
        }
        
        public void setDepartment(String department) {
            this.department = department;
        }
        
        public int getDemand() {
            return demand;
        }
        
        public void setDemand(int demand) {
            this.demand = demand;
        }
        
        public int getAvailable() {
            return available;
        }
        
        public void setAvailable(int available) {
            this.available = available;
        }
        
        public int getShortage() {
            return shortage;
        }
        
        public void setShortage(int shortage) {
            this.shortage = shortage;
        }
    }
}
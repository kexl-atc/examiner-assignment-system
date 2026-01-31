package com.examiner.scheduler.rest;

import com.examiner.scheduler.service.ResourceShortageNotificationService;
import com.examiner.scheduler.service.ResourceShortageNotificationService.UserNotificationMessage;
import com.examiner.scheduler.domain.ResourceShortageRecord;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.List;

/**
 * 资源不足提醒REST控制器
 * 支持SC13约束：提供资源不足检测和用户提醒的API接口
 */
@Path("/api/resource-shortage")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ResourceShortageController {
    
    @Inject
    ResourceShortageNotificationService notificationService;
    
    /**
     * 获取所有资源不足记录
     */
    @GET
    @Path("/records")
    public Response getAllShortageRecords() {
        try {
            List<ResourceShortageRecord> records = notificationService.getAllShortageRecords();
            return Response.ok(records).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取资源不足记录失败: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * 获取指定学员的资源不足记录
     */
    @GET
    @Path("/records/{studentId}/{examDate}")
    public Response getShortageRecord(@PathParam("studentId") String studentId, 
                                    @PathParam("examDate") String examDate) {
        try {
            ResourceShortageRecord record = notificationService.getShortageRecord(studentId, examDate);
            if (record != null) {
                return Response.ok(record).build();
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("未找到指定学员的资源不足记录")
                        .build();
            }
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取资源不足记录失败: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * 获取所有用户通知消息
     */
    @GET
    @Path("/notifications")
    public Response getAllNotifications() {
        try {
            List<UserNotificationMessage> notifications = notificationService.getAllNotifications();
            return Response.ok(notifications).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取通知消息失败: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * 获取严重资源不足的通知（需要用户立即关注）
     */
    @GET
    @Path("/notifications/severe")
    public Response getSevereNotifications() {
        try {
            List<UserNotificationMessage> severeNotifications = notificationService.getSevereNotifications();
            return Response.ok(severeNotifications).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取严重通知失败: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * 清理过期的记录和通知
     */
    @DELETE
    @Path("/cleanup")
    public Response cleanupExpiredRecords(@QueryParam("maxAgeHours") @DefaultValue("24") int maxAgeHours) {
        try {
            long maxAgeMillis = maxAgeHours * 60 * 60 * 1000L; // 转换为毫秒
            notificationService.cleanupExpiredRecords(maxAgeMillis);
            return Response.ok("清理完成").build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("清理失败: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * 获取资源不足统计信息
     */
    @GET
    @Path("/statistics")
    public Response getShortageStatistics() {
        try {
            List<ResourceShortageRecord> records = notificationService.getAllShortageRecords();
            List<UserNotificationMessage> notifications = notificationService.getAllNotifications();
            List<UserNotificationMessage> severeNotifications = notificationService.getSevereNotifications();
            
            ShortageStatistics statistics = new ShortageStatistics();
            statistics.setTotalRecords(records.size());
            statistics.setTotalNotifications(notifications.size());
            statistics.setSevereNotifications(severeNotifications.size());
            statistics.setTotalShortage(records.stream().mapToInt(ResourceShortageRecord::getTotalShortage).sum());
            
            return Response.ok(statistics).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取统计信息失败: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * 资源不足统计信息类
     */
    public static class ShortageStatistics {
        private int totalRecords;
        private int totalNotifications;
        private int severeNotifications;
        private int totalShortage;
        
        // Getters and Setters
        
        public int getTotalRecords() {
            return totalRecords;
        }
        
        public void setTotalRecords(int totalRecords) {
            this.totalRecords = totalRecords;
        }
        
        public int getTotalNotifications() {
            return totalNotifications;
        }
        
        public void setTotalNotifications(int totalNotifications) {
            this.totalNotifications = totalNotifications;
        }
        
        public int getSevereNotifications() {
            return severeNotifications;
        }
        
        public void setSevereNotifications(int severeNotifications) {
            this.severeNotifications = severeNotifications;
        }
        
        public int getTotalShortage() {
            return totalShortage;
        }
        
        public void setTotalShortage(int totalShortage) {
            this.totalShortage = totalShortage;
        }
    }
}
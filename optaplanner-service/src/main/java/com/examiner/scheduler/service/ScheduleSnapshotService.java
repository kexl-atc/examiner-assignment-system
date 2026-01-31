package com.examiner.scheduler.service;

import com.examiner.scheduler.entity.ScheduleSnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import org.jboss.logging.Logger;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 排班快照服务
 * 处理排班快照的业务逻辑
 */
@ApplicationScoped
public class ScheduleSnapshotService {

    private static final Logger LOG = Logger.getLogger(ScheduleSnapshotService.class);

    @Inject
    ObjectMapper objectMapper;

    /**
     * 创建排班快照
     */
    public ScheduleSnapshot createSnapshot(Map<String, Object> request) throws Exception {
        ScheduleSnapshot snapshot = new ScheduleSnapshot();
        
        // 基本信息
        snapshot.name = (String) request.get("name");
        snapshot.description = (String) request.get("description");
        
        // 排班数据
        Object scheduleDataObj = request.get("scheduleData");
        snapshot.scheduleData = objectMapper.writeValueAsString(scheduleDataObj);
        
        // 元数据
        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) request.get("metadata");
        
        if (metadata != null) {
            snapshot.metadata = objectMapper.writeValueAsString(metadata);
            
            // 提取常用字段以便查询
            snapshot.totalStudents = (Integer) metadata.get("totalStudents");
            snapshot.totalTeachers = (Integer) metadata.get("totalTeachers");
            snapshot.manualEditCount = (Integer) metadata.get("manualEditCount");
            snapshot.autoAssignedCount = (Integer) metadata.get("autoAssignedCount");
            
            @SuppressWarnings("unchecked")
            Map<String, String> dateRange = (Map<String, String>) metadata.get("dateRange");
            if (dateRange != null) {
                snapshot.startDate = dateRange.get("start");
                snapshot.endDate = dateRange.get("end");
            }
        }
        
        snapshot.persist();
        
        LOG.info("✅ 创建排班快照成功: " + snapshot.name + " (ID: " + snapshot.id + ")");
        return snapshot;
    }

    /**
     * 获取排班快照列表（不反序列化完整数据，只返回基本信息）
     */
    public Map<String, Object> getSnapshotList(
            int page,
            int pageSize,
            String sortBy,
            String sortOrder,
            String nameFilter,
            String startDate,
            String endDate
    ) throws Exception {
        // 构建查询
        StringBuilder query = new StringBuilder("1=1");
        
        if (nameFilter != null && !nameFilter.isEmpty()) {
            query.append(" and name like '%").append(nameFilter).append("%'");
        }
        
        if (startDate != null && !startDate.isEmpty()) {
            query.append(" and createdAt >= '").append(startDate).append("'");
        }
        
        if (endDate != null && !endDate.isEmpty()) {
            query.append(" and createdAt <= '").append(endDate).append("'");
        }
        
        // 排序
        String orderBy = sortBy + " " + sortOrder;
        
        // 查询 - 使用 find() 方法支持分页
        List<ScheduleSnapshot> snapshotEntities = ScheduleSnapshot
                .find(query.toString() + " order by " + orderBy)
                .page(io.quarkus.panache.common.Page.of(page, pageSize))
                .list();
        
        // 转换为前端需要的格式（反序列化JSON字符串）
        List<Map<String, Object>> snapshots = new java.util.ArrayList<>();
        for (ScheduleSnapshot entity : snapshotEntities) {
            Map<String, Object> snapshot = new HashMap<>();
            snapshot.put("id", entity.id);
            snapshot.put("name", entity.name);
            snapshot.put("description", entity.description);
            snapshot.put("createdAt", entity.createdAt);
            snapshot.put("updatedAt", entity.updatedAt);
            
            // 反序列化scheduleData为数组，获取长度
            if (entity.scheduleData != null) {
                try {
                    java.util.List<?> scheduleDataList = objectMapper.readValue(
                        entity.scheduleData, 
                        java.util.List.class
                    );
                    snapshot.put("scheduleData", scheduleDataList);
                } catch (Exception e) {
                    LOG.warn("⚠️ 解析scheduleData失败: " + e.getMessage());
                    snapshot.put("scheduleData", new java.util.ArrayList<>());
                }
            } else {
                snapshot.put("scheduleData", new java.util.ArrayList<>());
            }
            
            // 反序列化metadata为对象
            if (entity.metadata != null) {
                try {
                    Map<?, ?> metadataMap = objectMapper.readValue(
                        entity.metadata, 
                        Map.class
                    );
                    snapshot.put("metadata", metadataMap);
                } catch (Exception e) {
                    LOG.warn("⚠️ 解析metadata失败: " + e.getMessage());
                    snapshot.put("metadata", new HashMap<>());
                }
            } else {
                snapshot.put("metadata", new HashMap<>());
            }
            
            // 添加统计字段
            snapshot.put("totalStudents", entity.totalStudents);
            snapshot.put("totalTeachers", entity.totalTeachers);
            snapshot.put("startDate", entity.startDate);
            snapshot.put("endDate", entity.endDate);
            snapshot.put("manualEditCount", entity.manualEditCount);
            snapshot.put("autoAssignedCount", entity.autoAssignedCount);
            
            snapshots.add(snapshot);
        }
        
        // 统计总数
        long total = ScheduleSnapshot.count(query.toString());
        
        // 构建响应
        Map<String, Object> result = new HashMap<>();
        result.put("snapshots", snapshots);
        result.put("total", total);
        result.put("page", page);
        result.put("pageSize", pageSize);
        result.put("totalPages", (int) Math.ceil((double) total / pageSize));
        
        return result;
    }

    /**
     * 获取排班快照（包含反序列化的JSON数据）
     */
    public Map<String, Object> getSnapshot(Long id) throws Exception {
        ScheduleSnapshot snapshot = ScheduleSnapshot.findById(id);
        
        if (snapshot == null) {
            return null;
        }
        
        // 构建返回对象，将JSON字符串反序列化为对象
        Map<String, Object> result = new HashMap<>();
        result.put("id", snapshot.id);
        result.put("name", snapshot.name);
        result.put("description", snapshot.description);
        result.put("createdAt", snapshot.createdAt);
        result.put("updatedAt", snapshot.updatedAt);
        
        // 反序列化scheduleData
        if (snapshot.scheduleData != null) {
            Object scheduleData = objectMapper.readValue(snapshot.scheduleData, Object.class);
            result.put("scheduleData", scheduleData);
        }
        
        // 反序列化metadata
        if (snapshot.metadata != null) {
            Object metadata = objectMapper.readValue(snapshot.metadata, Object.class);
            result.put("metadata", metadata);
        }
        
        // 添加统计字段
        result.put("totalStudents", snapshot.totalStudents);
        result.put("totalTeachers", snapshot.totalTeachers);
        result.put("startDate", snapshot.startDate);
        result.put("endDate", snapshot.endDate);
        result.put("manualEditCount", snapshot.manualEditCount);
        result.put("autoAssignedCount", snapshot.autoAssignedCount);
        
        return result;
    }

    /**
     * 更新排班快照
     */
    public ScheduleSnapshot updateSnapshot(Long id, Map<String, Object> request) throws Exception {
        ScheduleSnapshot snapshot = ScheduleSnapshot.findById(id);
        
        if (snapshot == null) {
            return null;
        }
        
        // 更新排班数据
        Object scheduleDataObj = request.get("scheduleData");
        if (scheduleDataObj != null) {
            snapshot.scheduleData = objectMapper.writeValueAsString(scheduleDataObj);
        }
        
        // 更新元数据
        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) request.get("metadata");
        
        if (metadata != null) {
            snapshot.metadata = objectMapper.writeValueAsString(metadata);
            
            // 更新常用字段
            snapshot.totalStudents = (Integer) metadata.get("totalStudents");
            snapshot.totalTeachers = (Integer) metadata.get("totalTeachers");
            snapshot.manualEditCount = (Integer) metadata.get("manualEditCount");
            snapshot.autoAssignedCount = (Integer) metadata.get("autoAssignedCount");
            
            @SuppressWarnings("unchecked")
            Map<String, String> dateRange = (Map<String, String>) metadata.get("dateRange");
            if (dateRange != null) {
                snapshot.startDate = dateRange.get("start");
                snapshot.endDate = dateRange.get("end");
            }
        }
        
        snapshot.updatedAt = LocalDateTime.now();
        
        LOG.info("✅ 更新排班快照成功: " + snapshot.name + " (ID: " + snapshot.id + ")");
        return snapshot;
    }

    /**
     * 删除过期快照
     */
    public long deleteExpiredSnapshots(int daysToKeep) {
        long deleted = ScheduleSnapshot.deleteOlderThan(daysToKeep);
        LOG.info("✅ 删除过期快照成功，共删除 " + deleted + " 条记录");
        return deleted;
    }

    /**
     * 获取需要清理的快照数量
     */
    public long getCleanupRecommendation(int daysThreshold) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysThreshold);
        return ScheduleSnapshot.count("createdAt < ?1", cutoffDate);
    }
}


package com.examiner.scheduler.rest;

import com.examiner.scheduler.entity.ScheduleSnapshot;
import com.examiner.scheduler.service.ScheduleSnapshotService;
import com.examiner.scheduler.service.ExcelExportService;
import javax.inject.Inject;
import javax.transaction.Transactional;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 排班快照REST API
 * 提供历史排班的保存、查询、删除等功能
 */
@Path("/api/schedule-snapshots")  // 🔧 修复：添加 /api 前缀，与其他API保持一致
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ScheduleSnapshotResource {

    private static final Logger LOG = Logger.getLogger(ScheduleSnapshotResource.class);

    @Inject
    ScheduleSnapshotService snapshotService;

    @Inject
    ExcelExportService excelExportService;

    /**
     * 创建新的排班快照
     */
    @POST
    @Transactional
    public Response createSnapshot(Map<String, Object> request) {
        try {
            LOG.info("📥 接收到创建排班快照请求");
            
            ScheduleSnapshot snapshot = snapshotService.createSnapshot(request);
            
            LOG.info("✅ 排班快照创建成功，ID: " + snapshot.id);
            return Response.ok(snapshot).build();
        } catch (Exception e) {
            LOG.error("❌ 创建排班快照失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "创建快照失败: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 获取排班快照列表
     */
    @GET
    public Response getSnapshotList(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("pageSize") @DefaultValue("100") int pageSize,
            @QueryParam("sortBy") @DefaultValue("createdAt") String sortBy,
            @QueryParam("sortOrder") @DefaultValue("desc") String sortOrder,
            @QueryParam("nameFilter") String nameFilter,
            @QueryParam("startDate") String startDate,
            @QueryParam("endDate") String endDate
    ) {
        try {
            LOG.info("📥 接收到查询排班快照列表请求");
            
            Map<String, Object> result = snapshotService.getSnapshotList(
                    page, pageSize, sortBy, sortOrder, nameFilter, startDate, endDate
            );
            
            LOG.info("✅ 查询成功，返回 " + ((List<?>) result.get("snapshots")).size() + " 条记录");
            return Response.ok(result).build();
        } catch (Exception e) {
            LOG.error("❌ 查询排班快照列表失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "查询失败: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 获取单个排班快照（包含反序列化的JSON数据）
     */
    @GET
    @Path("/{id}")
    public Response getSnapshot(@PathParam("id") Long id) {
        try {
            LOG.info("📥 接收到查询排班快照请求，ID: " + id);
            
            Map<String, Object> snapshot = snapshotService.getSnapshot(id);
            
            if (snapshot == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "快照不存在"))
                        .build();
            }
            
            LOG.info("✅ 查询成功，包含 " + 
                (snapshot.get("scheduleData") != null ? 
                    ((List<?>) snapshot.get("scheduleData")).size() + " 条排班记录" : "0 条记录"));
            return Response.ok(snapshot).build();
        } catch (Exception e) {
            LOG.error("❌ 查询排班快照失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "查询失败: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 更新排班快照
     */
    @PUT
    @Path("/{id}")
    @Transactional
    public Response updateSnapshot(@PathParam("id") Long id, Map<String, Object> request) {
        try {
            LOG.info("📥 接收到更新排班快照请求，ID: " + id);
            
            ScheduleSnapshot snapshot = snapshotService.updateSnapshot(id, request);
            
            if (snapshot == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "快照不存在"))
                        .build();
            }
            
            LOG.info("✅ 更新成功");
            return Response.ok(snapshot).build();
        } catch (Exception e) {
            LOG.error("❌ 更新排班快照失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "更新失败: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 删除排班快照
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response deleteSnapshot(@PathParam("id") Long id) {
        try {
            LOG.info("📥 接收到删除排班快照请求，ID: " + id);
            
            boolean deleted = ScheduleSnapshot.deleteById(id);
            
            if (!deleted) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "快照不存在"))
                        .build();
            }
            
            LOG.info("✅ 删除成功");
            return Response.ok(Map.of("message", "删除成功")).build();
        } catch (Exception e) {
            LOG.error("❌ 删除排班快照失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "删除失败: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 批量删除排班快照
     */
    @POST
    @Path("/batch-delete")
    @Transactional
    public Response batchDeleteSnapshots(Map<String, Object> request) {
        try {
            LOG.info("📥 接收到批量删除排班快照请求");
            
            @SuppressWarnings("unchecked")
            List<Object> idsObj = (List<Object>) request.get("ids");
            
            if (idsObj == null || idsObj.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "请提供要删除的ID列表"))
                        .build();
            }
            
            int deletedCount = 0;
            for (Object idObj : idsObj) {
                Long id;
                if (idObj instanceof Integer) {
                    id = ((Integer) idObj).longValue();
                } else if (idObj instanceof Long) {
                    id = (Long) idObj;
                } else if (idObj instanceof String) {
                    id = Long.parseLong((String) idObj);
                } else {
                    LOG.warn("⚠️ 无法识别的ID类型: " + idObj.getClass().getName());
                    continue;
                }
                
                if (ScheduleSnapshot.deleteById(id)) {
                    deletedCount++;
                }
            }
            
            LOG.info("✅ 批量删除成功，共删除 " + deletedCount + " 条记录");
            return Response.ok(Map.of(
                    "message", "批量删除成功",
                    "deletedCount", deletedCount
            )).build();
        } catch (Exception e) {
            LOG.error("❌ 批量删除排班快照失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "批量删除失败: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 获取存储统计信息
     */
    @GET
    @Path("/statistics")
    public Response getStatistics() {
        try {
            LOG.info("📥 接收到查询存储统计请求");
            
            long totalSnapshots = ScheduleSnapshot.countAll();
            ScheduleSnapshot oldest = ScheduleSnapshot.findOldest();
            ScheduleSnapshot newest = ScheduleSnapshot.findLatest();
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalSnapshots", totalSnapshots);
            stats.put("totalSize", 0); // 可以根据需要计算实际大小
            stats.put("oldestSnapshot", oldest != null ? oldest.createdAt.toString() : null);
            stats.put("newestSnapshot", newest != null ? newest.createdAt.toString() : null);
            
            LOG.info("✅ 查询成功");
            return Response.ok(stats).build();
        } catch (Exception e) {
            LOG.error("❌ 查询存储统计失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "查询失败: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * 导出排班快照为Excel
     */
    @GET
    @Path("/{id}/export")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportSnapshot(@PathParam("id") Long id) {
        try {
            LOG.info("📥 接收到导出排班快照请求，ID: " + id);
            
            ScheduleSnapshot snapshot = ScheduleSnapshot.findById(id);
            
            if (snapshot == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "快照不存在"))
                        .build();
            }
            
            // 使用ExcelExportService导出Excel
            byte[] excelData = excelExportService.exportScheduleSnapshot(snapshot);
            String filename = excelExportService.generateFileName(snapshot);
            
            return Response.ok(excelData)
                    .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .build();
            
        } catch (Exception e) {
            LOG.error("❌ 导出排班快照失败", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "导出失败: " + e.getMessage()))
                    .build();
        }
    }
}


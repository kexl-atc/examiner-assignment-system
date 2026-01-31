package com.examiner.scheduler.rest;

import javax.inject.Singleton;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
// import java.time.ZoneId; // 未使用，已移除
// import java.time.format.DateTimeFormatter; // 未使用，已移除
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
// import java.util.stream.Stream; // 未使用，已移除

/**
 * 日志资源接口
 * 提供日志文件的读取、查询和清理功能
 */
@Path("/api/logs")
@Singleton
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class LogResource {

    // 从系统属性获取日志路径，如果未设置则尝试默认位置
    private String getLogPath() {
        String logPath = System.getProperty("app.log.path");
        if (logPath == null || logPath.trim().isEmpty()) {
            return Paths.get("logs").resolve("backend.log").toString();
        }
        return logPath.trim();
    }

    private static final Object FRONTEND_LOG_LOCK = new Object();

    public static class FrontendLogRequest {
        public String level;
        public String message;
        public String timestamp;
        public String sessionId;
        public String context;
    }

    @POST
    @Path("/frontend")
    public Response appendFrontendLog(FrontendLogRequest request) {
        try {
            String msg = request != null ? request.message : null;
            if (msg == null || msg.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new ErrorResponse("message不能为空"))
                        .build();
            }

            String level = request.level != null ? request.level : "INFO";
            String ts = request.timestamp != null ? request.timestamp : Instant.now().toString();
            String sid = request.sessionId != null ? request.sessionId : "";
            String ctx = request.context != null ? request.context : "";

            if (msg.length() > 8000) {
                msg = msg.substring(0, 8000);
            }
            if (ctx.length() > 8000) {
                ctx = ctx.substring(0, 8000);
            }

            java.nio.file.Path logsDir = Paths.get("logs");
            Files.createDirectories(logsDir);
            java.nio.file.Path frontendLog = logsDir.resolve("frontend.log");

            String line = "[" + ts + "] [" + level + "]" + (sid.isEmpty() ? "" : " [" + sid + "]") + " " + msg;
            if (!ctx.isEmpty()) {
                line = line + " | " + ctx;
            }
            line = line + System.lineSeparator();

            synchronized (FRONTEND_LOG_LOCK) {
                Files.writeString(frontendLog, line, StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE, StandardOpenOption.WRITE, StandardOpenOption.APPEND);
            }

            return Response.ok(java.util.Map.of("success", true)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new ErrorResponse("写入前端日志失败: " + e.getMessage()))
                    .build();
        }
    }

    private static final Pattern LOG_PATTERN = Pattern.compile("^\\[(.*?)\\] (.*)$");

    @GET
    @Path("/recent")
    public Response getRecentLogs(@QueryParam("limit") @DefaultValue("100") int limit,
                                  @QueryParam("level") @DefaultValue("ALL") String level) {
        String logPathStr = getLogPath();
        java.nio.file.Path logPath = Paths.get(logPathStr);

        LogResponse response = new LogResponse();
        response.timestamp = Instant.now().toString();

        if (!Files.exists(logPath)) {
            // 文件不存在时不报错，返回空列表
            response.success = true;
            response.logs = Collections.emptyList();
            response.total = 0;
            return Response.ok(response).build();
        }

        try {
            List<LogEntry> logs = readLastLinesSafe(logPath.toFile(), limit * 2); // 读取多一点以便过滤
            
            // 过滤和解析
            List<LogEntry> filteredLogs = logs.stream()
                .filter(log -> filterByLevel(log, level))
                .limit(limit)
                .collect(Collectors.toList());

            response.success = true;
            response.logs = filteredLogs;
            response.total = filteredLogs.size();
            
        } catch (Exception e) {
            response.success = false;
            response.error = "读取日志失败: " + e.getMessage();
            response.logs = Collections.emptyList();
            e.printStackTrace();
        }

        return Response.ok(response).build();
    }

    @GET
    @Path("/info")
    public Response getLogInfo() {
        String logPathStr = getLogPath();
        File logFile = new File(logPathStr);
        
        LogInfo info = new LogInfo();
        info.logFile = logPathStr;
        
        if (logFile.exists()) {
            info.success = true;
            info.exists = true;
            info.size = logFile.length();
            info.lastModified = Instant.ofEpochMilli(logFile.lastModified()).toString();
        } else {
            info.success = false;
            info.exists = false;
            info.error = "文件不存在";
        }
        
        return Response.ok(info).build();
    }

    @DELETE
    @Path("/cleanup")
    public Response cleanupLogs(@QueryParam("days") @DefaultValue("7") int days) {
        // 在Electron架构中，日志清理主要由Node.js层(LogRotator)处理
        // 这里仅提供一个占位符或简单实现
        // 实际上，由于日志轮转机制，Java端不应该随意删除正在写入的文件
        
        return Response.status(Response.Status.NOT_IMPLEMENTED)
                .entity(new ErrorResponse("请通过Electron主进程清理日志"))
                .build();
    }

    /**
     * 安全读取最后N行（支持UTF-8）
     */
    private List<LogEntry> readLastLinesSafe(File file, int numLines) throws IOException {
        // 估算：假设平均每行200字节
        long avgLineBytes = 200;
        long bytesToRead = numLines * avgLineBytes;
        long fileLength = file.length();
        
        if (bytesToRead > fileLength) {
            bytesToRead = fileLength;
        }
        
        // 限制最大读取量，防止内存溢出（例如最大读取1MB）
        long maxRead = 1024 * 1024; 
        if (bytesToRead > maxRead) {
            bytesToRead = maxRead;
        }
        
        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            raf.seek(fileLength - bytesToRead);
            byte[] buffer = new byte[(int) bytesToRead];
            raf.readFully(buffer);
            
            String content = new String(buffer, StandardCharsets.UTF_8);
            String[] rawLines = content.split("\\r?\\n");
            
            List<LogEntry> result = new ArrayList<>();
            // 取最后N行
            int start = Math.max(0, rawLines.length - numLines);
            for (int i = start; i < rawLines.length; i++) {
                String line = rawLines[i];
                if (!line.trim().isEmpty()) {
                    result.add(parseLogLine(line));
                }
            }
            // 结果需要是时间倒序（最新的在前）
            Collections.reverse(result);
            return result;
        }
    }

    private LogEntry parseLogLine(String line) {
        LogEntry entry = new LogEntry();
        entry.message = line;
        entry.type = "info"; // 默认
        
        Matcher matcher = LOG_PATTERN.matcher(line);
        if (matcher.find()) {
            entry.time = matcher.group(1);
            String content = matcher.group(2);
            entry.message = content;
            
            // 简单推断类型
            if (content.contains("ERROR") || content.contains("Exception") || content.contains("Error") || content.contains("❌")) {
                entry.type = "error";
            } else if (content.contains("WARN") || content.contains("⚠️")) {
                entry.type = "warning";
            } else if (content.contains("SUCCESS") || content.contains("✅")) {
                entry.type = "success";
            }
        } else {
            // 尝试查找时间戳
            entry.time = Instant.now().toString(); // 如果没找到时间戳，暂时用当前时间或留空
        }
        
        return entry;
    }
    
    private boolean filterByLevel(LogEntry log, String level) {
        if ("ALL".equalsIgnoreCase(level)) return true;
        if (log.type == null) return true;
        
        if ("ERROR".equalsIgnoreCase(level)) {
            return "error".equals(log.type);
        }
        if ("WARN".equalsIgnoreCase(level)) {
            return "error".equals(log.type) || "warning".equals(log.type);
        }
        return true;
    }

    // DTO Classes
    public static class LogResponse {
        public boolean success;
        public List<LogEntry> logs;
        public int total;
        public String timestamp;
        public String error;
    }

    public static class LogEntry {
        public String time;
        public String message;
        public String type;
        public String level;
        public String thread;
        public String logger;
    }
    
    public static class LogInfo {
        public boolean success;
        public String logFile;
        public boolean exists;
        public long size;
        public String lastModified;
        public String error;
    }
    
    public static class ErrorResponse {
        public String message;
        public ErrorResponse(String message) { this.message = message; }
    }
}

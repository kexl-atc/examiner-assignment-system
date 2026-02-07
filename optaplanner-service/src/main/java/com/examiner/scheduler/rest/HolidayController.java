package com.examiner.scheduler.rest;

import com.examiner.scheduler.config.HolidayConfig;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.logging.Logger;

/**
 * 节假日查询REST控制器
 * 提供节假日相关的API接口
 */
@Path("/api/holidays")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class HolidayController {
    
    private static final Logger LOGGER = Logger.getLogger(HolidayController.class.getName());
    
    @Inject
    HolidayConfig holidayConfig;
    
    /**
     * 获取指定年份的所有节假日
     */
    @GET
    public Response getHolidays(@QueryParam("year") Integer year) {
        try {
            LOGGER.info("获取节假日请求，年份: " + year);
            
            Set<LocalDate> holidays = holidayConfig.getHolidays();
            Set<LocalDate> workdays = holidayConfig.getWorkdays();
            
            // 如果指定了年份，过滤对应年份的数据
            if (year != null) {
                holidays = holidays.stream()
                    .filter(date -> date.getYear() == year)
                    .collect(Collectors.toSet());
                    
                workdays = workdays.stream()
                    .filter(date -> date.getYear() == year)
                    .collect(Collectors.toSet());
            }
            
            HolidayResponse response = new HolidayResponse();
            response.setSuccess(true);
            response.setHolidays(holidays.stream()
                .map(date -> {
                    HolidayInfo info = new HolidayInfo();
                    info.setDate(date.toString());
                    info.setName(getHolidayName(date));
                    info.setType("national");
                    info.setDescription(getHolidayDescription(date));
                    return info;
                })
                .collect(Collectors.toList()));
                
            response.setWorkdays(workdays.stream()
                .map(LocalDate::toString)
                .collect(Collectors.toList()));
            
            LOGGER.info("返回节假日数据: " + holidays.size() + "个节假日, " + workdays.size() + "个调休工作日");
            return Response.ok(response).build();
            
        } catch (Exception e) {
            LOGGER.severe("获取节假日数据失败: " + e.getMessage());
            e.printStackTrace();
            
            HolidayResponse errorResponse = new HolidayResponse();
            errorResponse.setSuccess(false);
            errorResponse.setMessage("获取节假日数据失败: " + e.getMessage());
            
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(errorResponse)
                    .build();
        }
    }
    
    /**
     * 检查指定日期是否为节假日
     */
    @GET
    @Path("/check")
    public Response checkHoliday(@QueryParam("date") String dateStr) {
        try {
            LOGGER.info("检查节假日请求，日期: " + dateStr);
            
            if (dateStr == null || dateStr.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"success\":false,\"message\":\"日期参数不能为空\"}")
                        .build();
            }
            
            LocalDate date = LocalDate.parse(dateStr);
            boolean isHoliday = holidayConfig.isHoliday(date);
            boolean isWorkday = holidayConfig.isWorkday(date);
            boolean isWorkingDay = holidayConfig.isWorkingDay(date);
            
            HolidayCheckResponse response = new HolidayCheckResponse();
            response.setSuccess(true);
            response.setDate(dateStr);
            response.setIsHoliday(isHoliday);
            response.setIsWorkday(isWorkday);
            response.setIsWorkingDay(isWorkingDay);
            
            if (isHoliday) {
                response.setHolidayName(getHolidayName(date));
                response.setDescription(getHolidayDescription(date));
            } else if (isWorkday) {
                response.setDescription("调休工作日");
            }
            
            LOGGER.info("节假日检查结果: " + dateStr + " -> 节假日:" + isHoliday + ", 工作日:" + isWorkingDay);
            return Response.ok(response).build();
            
        } catch (Exception e) {
            LOGGER.severe("检查节假日失败: " + e.getMessage());
            e.printStackTrace();
            
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"success\":false,\"message\":\"检查节假日失败: " + e.getMessage() + "\"}")
                    .build();
        }
    }
    
    /**
     * 获取节假日名称
     */
    private String getHolidayName(LocalDate date) {
        String dateStr = date.toString();
        
        // 元旦
        if (dateStr.equals("2025-01-01")) return "元旦";
        
        // 春节
        if (dateStr.matches("2025-01-(28|29|30|31)")||dateStr.matches("2025-02-0[1-3]")) return "春节";
        
        // 清明节
        if (dateStr.matches("2025-04-0[5-7]")) return "清明节";
        
        // 劳动节
        if (dateStr.matches("2025-05-0[1-5]")) return "劳动节";
        
        // 端午节
        if (dateStr.matches("2025-06-(09|10|11)")) return "端午节";
        
        // 国庆节/中秋节
        if (dateStr.matches("2025-10-0[1-7]")) {
            if (dateStr.equals("2025-10-06")) return "中秋节";
            return "国庆节";
        }
        
        return "法定节假日";
    }
    
    /**
     * 🆕 检查日期范围是否包含节假日（支持方案1：前端阻止在节假日添加不可用日期）
     */
    @GET
    @Path("/check-range")
    public Response checkHolidayRange(@QueryParam("startDate") String startDate, 
                                       @QueryParam("endDate") String endDate) {
        try {
            LOGGER.info("检查日期范围节假日请求，开始: " + startDate + ", 结束: " + endDate);
            
            if (startDate == null || startDate.trim().isEmpty() || endDate == null || endDate.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"success\":false,\"message\":\"开始日期和结束日期不能为空\"}")
                        .build();
            }
            
            LocalDate start = LocalDate.parse(startDate);
            LocalDate end = LocalDate.parse(endDate);
            
            // 检查日期范围内的所有节假日
            List<String> holidaysInRange = new java.util.ArrayList<>();
            LocalDate current = start;
            while (!current.isAfter(end)) {
                if (holidayConfig.isHoliday(current)) {
                    holidaysInRange.add(current.toString());
                }
                current = current.plusDays(1);
            }
            
            HolidayRangeCheckResponse response = new HolidayRangeCheckResponse();
            response.setSuccess(true);
            response.setStartDate(startDate);
            response.setEndDate(endDate);
            response.setContainsHolidays(!holidaysInRange.isEmpty());
            response.setHolidayDates(holidaysInRange);
            response.setHolidayCount(holidaysInRange.size());
            
            if (!holidaysInRange.isEmpty()) {
                response.setMessage("该日期范围包含 " + holidaysInRange.size() + " 个节假日，不建议设置为不可用日期");
            } else {
                response.setMessage("该日期范围不包含节假日");
            }
            
            LOGGER.info("日期范围检查结果: " + holidaysInRange.size() + " 个节假日");
            return Response.ok(response).build();
            
        } catch (Exception e) {
            LOGGER.severe("检查日期范围失败: " + e.getMessage());
            e.printStackTrace();
            
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"success\":false,\"message\":\"检查日期范围失败: " + e.getMessage() + "\"}")
                    .build();
        }
    }
    
    /**
     * 获取节假日描述
     */
    private String getHolidayDescription(LocalDate date) {
        String dateStr = date.toString();
        
        // 元旦
        if (dateStr.equals("2025-01-01")) return "元旦节";
        
        // 春节
        if (dateStr.equals("2025-01-28")) return "除夕";
        if (dateStr.equals("2025-01-29")) return "春节初一";
        if (dateStr.equals("2025-01-30")) return "春节初二";
        if (dateStr.equals("2025-01-31")) return "春节初三";
        if (dateStr.equals("2025-02-01")) return "春节初四";
        if (dateStr.equals("2025-02-02")) return "春节初五";
        if (dateStr.equals("2025-02-03")) return "春节初六";
        
        // 清明节
        if (dateStr.equals("2025-04-05")) return "清明节";
        if (dateStr.matches("2025-04-0[6-7]")) return "清明节假期";
        
        // 劳动节
        if (dateStr.equals("2025-05-01")) return "劳动节";
        if (dateStr.matches("2025-05-0[2-5]")) return "劳动节假期";
        
        // 端午节
        if (dateStr.equals("2025-06-09")) return "端午节";
        if (dateStr.matches("2025-06-(10|11)")) return "端午节假期";
        
        // 国庆节/中秋节
        if (dateStr.equals("2025-10-01")) return "国庆节";
        if (dateStr.equals("2025-10-06")) return "中秋节（与国庆合并）";
        if (dateStr.matches("2025-10-0[2-57]")) return "国庆节假期";
        
        return "法定节假日";
    }
    
    /**
     * 节假日响应DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HolidayResponse {
        private boolean success;
        private String message;
        private List<HolidayInfo> holidays;
        private List<String> workdays;
        
        // Getter和Setter方法
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        
        public List<HolidayInfo> getHolidays() { return holidays; }
        public void setHolidays(List<HolidayInfo> holidays) { this.holidays = holidays; }
        
        public List<String> getWorkdays() { return workdays; }
        public void setWorkdays(List<String> workdays) { this.workdays = workdays; }
    }
    
    /**
     * 节假日信息DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HolidayInfo {
        private String date;
        private String name;
        private String type;
        private String description;
        
        // Getter和Setter方法
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }
    
    /**
     * 节假日检查响应DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HolidayCheckResponse {
        private boolean success;
        private String message;
        private String date;
        private boolean isHoliday;
        private boolean isWorkday;
        private boolean isWorkingDay;
        private String holidayName;
        private String description;
        
        // Getter和Setter方法
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        
        public boolean getIsHoliday() { return isHoliday; }
        public void setIsHoliday(boolean isHoliday) { this.isHoliday = isHoliday; }
        
        public boolean getIsWorkday() { return isWorkday; }
        public void setIsWorkday(boolean isWorkday) { this.isWorkday = isWorkday; }
        
        public boolean getIsWorkingDay() { return isWorkingDay; }
        public void setIsWorkingDay(boolean isWorkingDay) { this.isWorkingDay = isWorkingDay; }
        
        public String getHolidayName() { return holidayName; }
        public void setHolidayName(String holidayName) { this.holidayName = holidayName; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }
    
    /**
     * 🆕 日期范围节假日检查响应DTO
     * 支持方案1：前端阻止在节假日添加不可用日期
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HolidayRangeCheckResponse {
        private boolean success;
        private String message;
        private String startDate;
        private String endDate;
        private boolean containsHolidays;
        private List<String> holidayDates;
        private int holidayCount;
        
        // Getter和Setter方法
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        
        public String getStartDate() { return startDate; }
        public void setStartDate(String startDate) { this.startDate = startDate; }
        
        public String getEndDate() { return endDate; }
        public void setEndDate(String endDate) { this.endDate = endDate; }
        
        public boolean isContainsHolidays() { return containsHolidays; }
        public void setContainsHolidays(boolean containsHolidays) { this.containsHolidays = containsHolidays; }
        
        public List<String> getHolidayDates() { return holidayDates; }
        public void setHolidayDates(List<String> holidayDates) { this.holidayDates = holidayDates; }
        
        public int getHolidayCount() { return holidayCount; }
        public void setHolidayCount(int holidayCount) { this.holidayCount = holidayCount; }
    }
}
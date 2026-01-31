package com.examiner.scheduler.service;

import com.examiner.scheduler.entity.ScheduleSnapshot;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.jboss.logging.Logger;

import javax.enterprise.context.ApplicationScoped;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.Iterator;

/**
 * Excel导出服务
 * 提供排班快照的Excel导出功能
 */
@ApplicationScoped
public class ExcelExportService {

    private static final Logger LOG = Logger.getLogger(ExcelExportService.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 导出排班快照为Excel字节数组
     */
    public byte[] exportScheduleSnapshot(ScheduleSnapshot snapshot) throws IOException {
        LOG.info("📊 开始导出排班快照为Excel，ID: " + snapshot.id);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            // 创建工作表
            Sheet sheet = workbook.createSheet("排班表");

            // 解析快照数据
            JsonNode scheduleData = objectMapper.readTree(snapshot.scheduleData);
            JsonNode assignments = scheduleData.get("assignments");

            if (assignments == null || !assignments.isArray()) {
                throw new IllegalArgumentException("快照数据格式错误：缺少assignments数组");
            }

            // 创建表头
            createHeader(sheet, workbook);

            // 填充数据
            fillData(sheet, assignments, workbook);

            // 自动调整列宽
            autoSizeColumns(sheet);

            // 写入输出流
            workbook.write(outputStream);
            
            LOG.info("✅ 排班快照Excel导出成功，数据行数: " + assignments.size());
            return outputStream.toByteArray();

        } catch (Exception e) {
            LOG.error("❌ 导出排班快照Excel失败", e);
            throw new IOException("导出Excel失败: " + e.getMessage(), e);
        }
    }

    /**
     * 创建Excel表头
     */
    private void createHeader(Sheet sheet, Workbook workbook) {
        Row headerRow = sheet.createRow(0);
        
        // 创建表头样式
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);

        // 设置边框
        setBorders(headerStyle);

        // 定义表头
        String[] headers = {
            "所在科室", "学员", "第一天日期", "第一天类型", 
            "第一天考官一", "第一天考官二", "第一天备份考官",
            "第二天日期", "第二天类型", 
            "第二天考官一", "第二天考官二", "第二天备份考官"
        };

        // 创建表头单元格
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // 设置表头行高
        headerRow.setHeight((short) 500);
    }

    /**
     * 填充数据行
     */
    private void fillData(Sheet sheet, JsonNode assignments, Workbook workbook) {
        // 创建数据样式
        CellStyle dataStyle = workbook.createCellStyle();
        dataStyle.setAlignment(HorizontalAlignment.CENTER);
        dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorders(dataStyle);

        // 创建交替行样式
        CellStyle alternateStyle = workbook.createCellStyle();
        alternateStyle.setAlignment(HorizontalAlignment.CENTER);
        alternateStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        alternateStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        alternateStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        setBorders(alternateStyle);

        int rowIndex = 1;
        Iterator<JsonNode> assignmentIterator = assignments.elements();

        while (assignmentIterator.hasNext()) {
            JsonNode assignment = assignmentIterator.next();
            Row row = sheet.createRow(rowIndex);

            // 选择样式（交替行颜色）
            CellStyle currentStyle = (rowIndex % 2 == 0) ? alternateStyle : dataStyle;

            // 填充数据
            createCell(row, 0, getStringValue(assignment, "department"), currentStyle);
            createCell(row, 1, getStringValue(assignment, "student"), currentStyle);
            createCell(row, 2, getStringValue(assignment, "date1"), currentStyle);
            createCell(row, 3, getStringValue(assignment, "type1"), currentStyle);
            createCell(row, 4, getStringValue(assignment, "examiner1_1"), currentStyle);
            createCell(row, 5, getStringValue(assignment, "examiner1_2"), currentStyle);
            createCell(row, 6, getStringValue(assignment, "backup1"), currentStyle);
            createCell(row, 7, getStringValue(assignment, "date2"), currentStyle);
            createCell(row, 8, getStringValue(assignment, "type2"), currentStyle);
            createCell(row, 9, getStringValue(assignment, "examiner2_1"), currentStyle);
            createCell(row, 10, getStringValue(assignment, "examiner2_2"), currentStyle);
            createCell(row, 11, getStringValue(assignment, "backup2"), currentStyle);

            // 设置行高
            row.setHeight((short) 400);
            rowIndex++;
        }
    }

    /**
     * 创建单元格并设置值和样式
     */
    private void createCell(Row row, int columnIndex, String value, CellStyle style) {
        Cell cell = row.createCell(columnIndex);
        cell.setCellValue(value != null ? value : "-");
        cell.setCellStyle(style);
    }

    /**
     * 从JsonNode中安全获取字符串值
     */
    private String getStringValue(JsonNode node, String fieldName) {
        JsonNode fieldNode = node.get(fieldName);
        if (fieldNode == null || fieldNode.isNull()) {
            return "-";
        }
        return fieldNode.asText();
    }

    /**
     * 设置单元格边框
     */
    private void setBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setBottomBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setLeftBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setRightBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
    }

    /**
     * 自动调整列宽
     */
    private void autoSizeColumns(Sheet sheet) {
        // 设置合理的列宽
        int[] columnWidths = {
            15, 12, 12, 12, 12, 12, 14, 12, 12, 12, 12, 14
        };

        for (int i = 0; i < columnWidths.length; i++) {
            sheet.setColumnWidth(i, columnWidths[i] * 256); // POI使用256为单位
        }
    }

    /**
     * 生成Excel文件名
     */
    public String generateFileName(ScheduleSnapshot snapshot) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
        String timestamp = snapshot.createdAt.format(formatter);
        return String.format("排班表_%s_%s.xlsx", snapshot.name, timestamp);
    }
}
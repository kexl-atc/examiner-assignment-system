package com.examiner.scheduler.service;

import com.examiner.dto.InstructorAssignmentRequestDto;
import com.examiner.dto.InstructorAssignmentResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 考官分配服务
 * 实现Python脚本的功能，提供考官分配建议和验证
 */
@ApplicationScoped
public class InstructorAssignmentService {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(InstructorAssignmentService.class);
    
    // 前端代码到科室名称的映射（A->一室, B->二室等）
    private static final Map<String, String> FRONTEND_CODE_TO_DEPT = new HashMap<>();
    private static final Map<String, String> DEPT_TO_FRONTEND_CODE = new HashMap<>();
    
    // 科室互通组配置（根据实际业务需求配置）
    // 例如：一室和三室互通，二室和四室互通
    private static final List<Set<String>> INTERCONNECTED_GROUPS = new ArrayList<>();
    
    static {
        // 初始化前端代码映射
        FRONTEND_CODE_TO_DEPT.put("A", "一室");
        FRONTEND_CODE_TO_DEPT.put("B", "二室");
        FRONTEND_CODE_TO_DEPT.put("C", "三室");
        FRONTEND_CODE_TO_DEPT.put("D", "四室");
        FRONTEND_CODE_TO_DEPT.put("E", "五室");
        FRONTEND_CODE_TO_DEPT.put("F", "六室");
        FRONTEND_CODE_TO_DEPT.put("G", "七室");
        
        // 反向映射
        for (Map.Entry<String, String> entry : FRONTEND_CODE_TO_DEPT.entrySet()) {
            DEPT_TO_FRONTEND_CODE.put(entry.getValue(), entry.getKey());
            // 也支持"区域一室"格式
            DEPT_TO_FRONTEND_CODE.put("区域" + entry.getValue(), entry.getKey());
        }
        
        // 初始化互通组（根据实际业务需求配置）
        // 示例：一室和三室互通，二室和四室互通
        Set<String> group1 = new HashSet<>(Arrays.asList("一室", "三室"));
        Set<String> group2 = new HashSet<>(Arrays.asList("二室", "四室"));
        INTERCONNECTED_GROUPS.add(group1);
        INTERCONNECTED_GROUPS.add(group2);
        
        LOGGER.info("InstructorAssignmentService initialized with {} interconnected groups", INTERCONNECTED_GROUPS.size());
    }
    
    /**
     * 处理分配请求
     */
    public InstructorAssignmentResultDto processRequest(InstructorAssignmentRequestDto request) {
        LOGGER.info("Processing instructor assignment request: action={}", request.action);
        
        try {
            if ("suggest_assignment".equals(request.action)) {
                return suggestAssignment(
                    request.student_dept,
                    request.available_rooms != null ? request.available_rooms : Collections.emptyList(),
                    request.exclude_examiner,
                    request.assignment_type != null ? request.assignment_type : 1
                );
            } else if ("validate_complete".equals(request.action)) {
                return validateCompleteAssignment(
                    request.student_dept,
                    request.examiner1,
                    request.examiner2
                );
            } else if ("get_interconnected".equals(request.action)) {
                return getInterconnectedDepartmentsResult(request.department);
            } else {
                InstructorAssignmentResultDto result = new InstructorAssignmentResultDto();
                result.success = false;
                result.error = "Unknown action: " + request.action;
                return result;
            }
        } catch (Exception e) {
            LOGGER.error("Error processing instructor assignment request", e);
            InstructorAssignmentResultDto result = new InstructorAssignmentResultDto();
            result.success = false;
            result.error = e.getMessage();
            return result;
        }
    }
    
    /**
     * 获取分配建议
     */
    private InstructorAssignmentResultDto suggestAssignment(
            String studentDeptCode,
            List<String> availableRoomCodes,
            String excludeExaminerCode,
            int assignmentType) {
        
        LOGGER.info("Getting assignment suggestion: studentDept={}, availableRooms={}, excludeExaminer={}, type={}",
            studentDeptCode, availableRoomCodes, excludeExaminerCode, assignmentType);
        
        InstructorAssignmentResultDto result = new InstructorAssignmentResultDto();
        
        try {
            // 解码前端代码为科室名称
            String studentDept = decodeFrontendCode(studentDeptCode);
            List<String> availableRooms = availableRoomCodes.stream()
                .map(this::decodeFrontendCode)
                .collect(Collectors.toList());
            String excludeExaminer = excludeExaminerCode != null && !excludeExaminerCode.isEmpty() && !"-".equals(excludeExaminerCode)
                ? decodeFrontendCode(excludeExaminerCode) : null;
            
            LOGGER.info("Decoded: studentDept={}, availableRooms={}, excludeExaminer={}",
                studentDept, availableRooms, excludeExaminer);
            
            // 查找有效分配
            List<String> validRooms = findValidAssignment(studentDept, availableRooms, excludeExaminer);
            
            if (!validRooms.isEmpty()) {
                // 随机选择一个有效科室
                Random random = new Random();
                String suggestedRoom = validRooms.get(random.nextInt(validRooms.size()));
                
                // 编码回前端代码
                String suggestedRoomCode = encodeToFrontendCode(suggestedRoom);
                
                result.success = true;
                result.suggested_room = suggestedRoomCode;
                result.available_count = validRooms.size();
                result.reason = "";
                
                LOGGER.info("Assignment suggestion: {} (decoded: {}), available count: {}",
                    suggestedRoomCode, suggestedRoom, validRooms.size());
            } else {
                result.success = false;
                result.suggested_room = "";
                result.available_count = 0;
                result.reason = String.format("没有可用的科室满足约束条件（考生科室=%s，总科室数=%d）",
                    studentDept, availableRooms.size());
                
                LOGGER.warn("No valid assignment found: studentDept={}, availableRooms={}",
                    studentDept, availableRooms);
            }
            
        } catch (Exception e) {
            LOGGER.error("Error in suggestAssignment", e);
            result.success = false;
            result.error = "获取分配建议时发生异常: " + e.getMessage();
        }
        
        return result;
    }
    
    /**
     * 验证完整分配
     */
    private InstructorAssignmentResultDto validateCompleteAssignment(
            String studentDeptCode,
            String examiner1Code,
            String examiner2Code) {
        
        InstructorAssignmentResultDto result = new InstructorAssignmentResultDto();
        result.valid = true;
        result.errors = new ArrayList<>();
        result.warnings = new ArrayList<>();
        result.details = new HashMap<>();
        
        try {
            String studentDept = decodeFrontendCode(studentDeptCode);
            String examiner1 = decodeFrontendCode(examiner1Code);
            String examiner2 = examiner2Code != null && !examiner2Code.isEmpty() && !"-".equals(examiner2Code)
                ? decodeFrontendCode(examiner2Code) : null;
            
            // 验证考官一
            Set<String> studentInterconnected = getInterconnectedDepartmentsSet(studentDept);
            if (studentInterconnected.contains(examiner1)) {
                result.valid = false;
                result.errors.add(String.format("考官一(%s)与考生科室(%s)互通", examiner1, studentDept));
            }
            
            // 验证考官二
            if (examiner2 != null) {
                if (studentInterconnected.contains(examiner2)) {
                    result.valid = false;
                    result.errors.add(String.format("考官二(%s)与考生科室(%s)互通", examiner2, studentDept));
                }
                
                Set<String> examiner1Interconnected = getInterconnectedDepartmentsSet(examiner1);
                if (examiner1Interconnected.contains(examiner2)) {
                    result.valid = false;
                    result.errors.add(String.format("考官二(%s)与考官一(%s)互通", examiner2, examiner1));
                }
            }
            
            result.details.put("student_dept", studentDept);
            result.details.put("examiner1", examiner1);
            result.details.put("examiner2", examiner2);
            
        } catch (Exception e) {
            LOGGER.error("Error in validateCompleteAssignment", e);
            result.valid = false;
            result.errors.add("验证过程发生异常: " + e.getMessage());
        }
        
        return result;
    }
    
    /**
     * 获取互通科室（返回DTO）
     */
    private InstructorAssignmentResultDto getInterconnectedDepartmentsResult(String deptCode) {
        InstructorAssignmentResultDto result = new InstructorAssignmentResultDto();
        
        try {
            String dept = decodeFrontendCode(deptCode);
            Set<String> interconnected = getInterconnectedDepartmentsSet(dept);
            
            result.success = true;
            result.interconnected = interconnected.stream()
                .map(this::encodeToFrontendCode)
                .collect(Collectors.toList());
            result.details = new HashMap<>();
            result.details.put("department", dept);
            
        } catch (Exception e) {
            LOGGER.error("Error in getInterconnectedDepartmentsResult", e);
            result.success = false;
            result.error = e.getMessage();
        }
        
        return result;
    }
    
    /**
     * 查找有效分配
     */
    private List<String> findValidAssignment(String studentDept, List<String> availableRooms, String excludeExaminer) {
        // 标准化科室名称
        String normalizedStudent = normalizeDeptName(studentDept);
        String normalizedExclude = excludeExaminer != null ? normalizeDeptName(excludeExaminer) : null;
        
        // 获取考生科室的互通组
        Set<String> studentInterconnected = getInterconnectedDepartmentsSet(normalizedStudent);
        
        // 获取排除考官的互通组
        Set<String> excludeInterconnected = normalizedExclude != null 
            ? getInterconnectedDepartmentsSet(normalizedExclude) : Collections.emptySet();
        
        // 筛选可用科室
        List<String> validRooms = new ArrayList<>();
        for (String room : availableRooms) {
            String normalizedRoom = normalizeDeptName(room);
            if (!studentInterconnected.contains(normalizedRoom) 
                && !excludeInterconnected.contains(normalizedRoom)) {
                validRooms.add(room);
            }
        }
        
        LOGGER.info("Found {} valid rooms out of {} available rooms", validRooms.size(), availableRooms.size());
        
        return validRooms;
    }
    
    /**
     * 获取科室的互通组（返回Set）
     */
    private Set<String> getInterconnectedDepartmentsSet(String dept) {
        String normalized = normalizeDeptName(dept);
        Set<String> interconnected = new HashSet<>();
        interconnected.add(normalized); // 包含自己
        
        // 查找该科室所在的互通组
        for (Set<String> group : INTERCONNECTED_GROUPS) {
            if (group.contains(normalized)) {
                interconnected.addAll(group);
                break;
            }
        }
        
        return interconnected;
    }
    
    /**
     * 标准化科室名称
     */
    private String normalizeDeptName(String dept) {
        if (dept == null || dept.trim().isEmpty()) {
            return "";
        }
        
        String normalized = dept.trim();
        
        // 去除"区域"前缀
        if (normalized.startsWith("区域")) {
            normalized = normalized.substring(2);
        }
        
        // 确保以"室"结尾（如果是单个字符，添加"室"）
        if (normalized.length() == 1 && !normalized.endsWith("室")) {
            normalized = normalized + "室";
        }
        
        return normalized;
    }
    
    /**
     * 解码前端代码为科室名称
     */
    private String decodeFrontendCode(String code) {
        if (code == null || code.trim().isEmpty()) {
            return "";
        }
        
        String normalized = code.trim().toUpperCase();
        String dept = FRONTEND_CODE_TO_DEPT.get(normalized);
        
        if (dept == null) {
            // 如果不是前端代码，可能是科室名称，直接返回标准化后的名称
            return normalizeDeptName(code);
        }
        
        return dept;
    }
    
    /**
     * 编码科室名称为前端代码
     */
    private String encodeToFrontendCode(String dept) {
        if (dept == null || dept.trim().isEmpty()) {
            return "";
        }
        
        String normalized = normalizeDeptName(dept);
        String code = DEPT_TO_FRONTEND_CODE.get(normalized);
        
        if (code == null) {
            // 如果找不到映射，检查原始输入是否是单字母代码
            String trimmed = dept.trim();
            if (trimmed.length() == 1 && Character.isLetter(trimmed.charAt(0))) {
                // 单字母直接作为代码返回（前端自定义代码场景）
                LOGGER.info("Using original single letter as code: {}", trimmed.toUpperCase());
                return trimmed.toUpperCase();
            }
            // 如果是 "X室" 格式，提取前面的字母作为代码
            if (trimmed.endsWith("室") && trimmed.length() == 2) {
                String letterPart = trimmed.substring(0, 1);
                if (Character.isLetter(letterPart.charAt(0))) {
                    LOGGER.info("Extracting letter from X室 format: {}", letterPart.toUpperCase());
                    return letterPart.toUpperCase();
                }
            }
            LOGGER.warn("No frontend code mapping found for department: {}", dept);
            return normalized;
        }
        
        return code;
    }
}


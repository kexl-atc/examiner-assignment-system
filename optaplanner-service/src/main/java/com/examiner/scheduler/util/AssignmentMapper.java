package com.examiner.scheduler.util;

import com.examiner.scheduler.domain.ExamAssignment;
import com.examiner.scheduler.domain.Teacher;
import com.examiner.scheduler.dto.AssignmentDTO;
import com.examiner.scheduler.dto.AssignmentDTO.TeacherDTO;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 排班分配映射工具类
 * 用于将领域对象转换为DTO，避免WebSocket序列化问题
 */
public class AssignmentMapper {
    
    /**
     * 将ExamAssignment转换为AssignmentDTO
     */
    public static AssignmentDTO toDTO(ExamAssignment assignment) {
        if (assignment == null) {
            return null;
        }
        
        AssignmentDTO dto = new AssignmentDTO();
        dto.setId(assignment.getId());
        
        // 学员信息
        if (assignment.getStudent() != null) {
            dto.setStudentId(assignment.getStudent().getId());
            dto.setStudentName(assignment.getStudent().getName());
            dto.setStudentDepartment(assignment.getStudent().getDepartment());
        }
        
        // 考试信息
        dto.setExamDate(assignment.getExamDate());
        dto.setExamType(assignment.getExamType());
        dto.setSubjects(assignment.getSubjects());
        
        // 考官信息
        dto.setExaminer1(toTeacherDTO(assignment.getExaminer1()));
        dto.setExaminer2(toTeacherDTO(assignment.getExaminer2()));
        dto.setBackupExaminer(toTeacherDTO(assignment.getBackupExaminer()));
        
        // 其他信息
        dto.setLocation(assignment.getLocation());
        dto.setTimeSlot(assignment.getTimeSlot() != null ? assignment.getTimeSlot().toString() : null);
        
        return dto;
    }
    
    /**
     * 将Teacher转换为TeacherDTO
     */
    private static TeacherDTO toTeacherDTO(Teacher teacher) {
        if (teacher == null) {
            return null;
        }
        
        return new TeacherDTO(
            teacher.getId(),
            teacher.getName(),
            teacher.getDepartment(),
            teacher.getGroup()
        );
    }
    
    /**
     * 批量转换ExamAssignment列表为AssignmentDTO列表
     */
    public static List<AssignmentDTO> toDTOList(List<ExamAssignment> assignments) {
        if (assignments == null) {
            return null;
        }
        
        return assignments.stream()
            .map(AssignmentMapper::toDTO)
            .collect(Collectors.toList());
    }
}

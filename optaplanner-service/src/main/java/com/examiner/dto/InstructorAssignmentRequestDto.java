package com.examiner.dto;

import java.util.List;

public class InstructorAssignmentRequestDto {
    public String action;
    public String student_dept;
    public List<String> available_rooms;
    public String exclude_examiner;
    public Integer assignment_type;
    public String examiner1;
    public String examiner2;
    public String department; // For get_interconnected
}

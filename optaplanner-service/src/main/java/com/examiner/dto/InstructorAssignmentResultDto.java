package com.examiner.dto;

import java.util.List;
import java.util.Map;

public class InstructorAssignmentResultDto {
    public boolean success;
    public String error;
    
    // Suggestion fields
    public String suggested_room;
    public String reason;
    public Integer available_count;
    
    // Validation fields
    public Boolean valid;
    public List<String> errors;
    public List<String> warnings;
    public Map<String, Object> details;
    
    // Interconnected fields
    public List<String> interconnected;
}

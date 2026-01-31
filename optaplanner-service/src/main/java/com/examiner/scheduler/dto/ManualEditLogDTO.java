package com.examiner.scheduler.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * 人工修改日志DTO
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ManualEditLogDTO {
    
    public String editedBy;
    
    public ContextDTO context;
    public OriginalDTO original;
    public SelectedDTO selected;
    public ReasonDTO reason;
    
    public Boolean hadConflicts;
    public List<ConflictDTO> conflicts;
    public Boolean isForced;
    
    // 可选的评估信息
    public Integer satisfactionScore;
    public String feedback;
    public Integer hardViolations;
    public Integer softViolations;
    
    /**
     * 上下文信息
     */
    public static class ContextDTO {
        public String studentName;
        public String department;
        public String examDate;
        public String fieldName;
        public String timeSlot;
    }
    
    /**
     * 原始值信息
     */
    public static class OriginalDTO {
        public String value;
    }
    
    /**
     * 选择值信息
     */
    public static class SelectedDTO {
        public String value;
        public Boolean wasRecommended;
        public Integer recommendationRank;
        public Double recommendationScore;
    }
    
    /**
     * 原因信息
     */
    public static class ReasonDTO {
        public String category;
        public String detail;
    }
    
    /**
     * 冲突信息
     */
    public static class ConflictDTO {
        public String type;
        public String severity;
        public String title;
        public String description;
    }
}


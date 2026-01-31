package com.examiner.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;

/**
 * 修复结果DTO
 */
@RegisterForReflection
public class RepairResultDto {
    
    private boolean success;
    private String message;
    private List<String> affectedViolations;
    private List<ViolationDetailDto> newViolations;
    private Integer updatedScore;

    // 默认构造函数
    public RepairResultDto() {}

    // Getter和Setter方法
    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<String> getAffectedViolations() {
        return affectedViolations;
    }

    public void setAffectedViolations(List<String> affectedViolations) {
        this.affectedViolations = affectedViolations;
    }

    public List<ViolationDetailDto> getNewViolations() {
        return newViolations;
    }

    public void setNewViolations(List<ViolationDetailDto> newViolations) {
        this.newViolations = newViolations;
    }

    public Integer getUpdatedScore() {
        return updatedScore;
    }

    public void setUpdatedScore(Integer updatedScore) {
        this.updatedScore = updatedScore;
    }
}
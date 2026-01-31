package com.examiner.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.Map;

/**
 * 手动修复请求DTO
 */
@RegisterForReflection
public class ManualRepairRequestDto {
    
    private String violationId;
    private String repairType;
    private Map<String, Object> parameters;

    // 默认构造函数
    public ManualRepairRequestDto() {}

    // Getter和Setter方法
    public String getViolationId() {
        return violationId;
    }

    public void setViolationId(String violationId) {
        this.violationId = violationId;
    }

    public String getRepairType() {
        return repairType;
    }

    public void setRepairType(String repairType) {
        this.repairType = repairType;
    }

    public Map<String, Object> getParameters() {
        return parameters;
    }

    public void setParameters(Map<String, Object> parameters) {
        this.parameters = parameters;
    }
}
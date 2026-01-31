package com.examiner.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;

/**
 * 批量修复请求DTO
 */
@RegisterForReflection
public class BatchRepairRequestDto {
    
    private List<String> violationIds;
    private String repairStrategy;

    // 默认构造函数
    public BatchRepairRequestDto() {}

    // Getter和Setter方法
    public List<String> getViolationIds() {
        return violationIds;
    }

    public void setViolationIds(List<String> violationIds) {
        this.violationIds = violationIds;
    }

    public String getRepairStrategy() {
        return repairStrategy;
    }

    public void setRepairStrategy(String repairStrategy) {
        this.repairStrategy = repairStrategy;
    }
}
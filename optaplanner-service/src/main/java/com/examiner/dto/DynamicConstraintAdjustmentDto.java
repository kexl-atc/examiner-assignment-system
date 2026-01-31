package com.examiner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.util.List;

/**
 * 动态约束调整DTO
 * 用于传输约束权重动态调整请求
 */
public class DynamicConstraintAdjustmentDto {

    @JsonProperty("adjustmentId")
    private String adjustmentId;

    @JsonProperty("reason")
    private String reason;

    @JsonProperty("adjustments")
    @NotNull(message = "调整列表不能为空")
    private List<WeightAdjustment> adjustments;

    @JsonProperty("applyImmediately")
    private boolean applyImmediately = true;

    @JsonProperty("validationRequired")
    private boolean validationRequired = true;

    // 构造函数
    public DynamicConstraintAdjustmentDto() {}

    public DynamicConstraintAdjustmentDto(String adjustmentId, String reason, List<WeightAdjustment> adjustments) {
        this.adjustmentId = adjustmentId;
        this.reason = reason;
        this.adjustments = adjustments;
    }

    // Getter和Setter方法
    public String getAdjustmentId() { return adjustmentId; }
    public void setAdjustmentId(String adjustmentId) { this.adjustmentId = adjustmentId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public List<WeightAdjustment> getAdjustments() { return adjustments; }
    public void setAdjustments(List<WeightAdjustment> adjustments) { this.adjustments = adjustments; }

    public boolean isApplyImmediately() { return applyImmediately; }
    public void setApplyImmediately(boolean applyImmediately) { this.applyImmediately = applyImmediately; }

    public boolean isValidationRequired() { return validationRequired; }
    public void setValidationRequired(boolean validationRequired) { this.validationRequired = validationRequired; }

    /**
     * 权重调整内部类
     */
    public static class WeightAdjustment {
        @JsonProperty("constraintId")
        @NotBlank(message = "约束ID不能为空")
        private String constraintId;

        @JsonProperty("constraintType")
        @NotBlank(message = "约束类型不能为空")
        private String constraintType; // "hard" 或 "soft"

        @JsonProperty("adjustmentType")
        @NotBlank(message = "调整类型不能为空")
        private String adjustmentType; // "set", "add", "multiply"

        @JsonProperty("adjustmentValue")
        @NotNull(message = "调整值不能为空")
        private Double adjustmentValue;

        @JsonProperty("newWeight")
        private Integer newWeight;

        @JsonProperty("reason")
        private String reason;

        // 构造函数
        public WeightAdjustment() {}

        public WeightAdjustment(String constraintId, String constraintType, String adjustmentType, Double adjustmentValue) {
            this.constraintId = constraintId;
            this.constraintType = constraintType;
            this.adjustmentType = adjustmentType;
            this.adjustmentValue = adjustmentValue;
        }

        // Getter和Setter方法
        public String getConstraintId() { return constraintId; }
        public void setConstraintId(String constraintId) { this.constraintId = constraintId; }

        public String getConstraintType() { return constraintType; }
        public void setConstraintType(String constraintType) { this.constraintType = constraintType; }

        public String getAdjustmentType() { return adjustmentType; }
        public void setAdjustmentType(String adjustmentType) { this.adjustmentType = adjustmentType; }

        public Double getAdjustmentValue() { return adjustmentValue; }
        public void setAdjustmentValue(Double adjustmentValue) { this.adjustmentValue = adjustmentValue; }

        public Integer getNewWeight() { return newWeight; }
        public void setNewWeight(Integer newWeight) { this.newWeight = newWeight; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}
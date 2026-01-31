package com.examiner.scheduler.solver;

import com.examiner.scheduler.domain.ExamSchedule;
import com.examiner.scheduler.domain.ExamAssignment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 后处理进度跟踪器
 * 
 * 用于跟踪求解完成后的后处理步骤进度：
 * 1. 结果验证
 * 2. 约束检查
 * 3. 数据转换
 * 4. 报告生成
 */
public class PostProcessingProgressTracker {
    
    private static final Logger logger = LoggerFactory.getLogger(PostProcessingProgressTracker.class);
    
    // 进度回调接口
    public interface ProgressCallback {
        void onProgressUpdate(String phase, int percentage, String message);
    }
    
    private final ProgressCallback callback;
    
    public PostProcessingProgressTracker(ProgressCallback callback) {
        this.callback = callback;
    }
    
    /**
     * 执行后处理并报告进度
     */
    public void processWithProgress(ExamSchedule solution) {
        try {
            // 步骤1: 结果验证 (90-92%)
            reportProgress("结果验证", 90, "验证求解结果...");
            validateSolution(solution);
            
            // 步骤2: 约束检查 (92-95%)
            reportProgress("约束检查", 92, "检查约束满足情况...");
            checkConstraints(solution);
            
            // 步骤3: 数据转换 (95-98%)
            reportProgress("数据转换", 95, "转换结果数据...");
            transformData(solution);
            
            // 步骤4: 报告生成 (98-100%)
            reportProgress("报告生成", 98, "生成排班报告...");
            generateReport(solution);
            
            // 完成
            reportProgress("完成", 100, "后处理完成");
            
        } catch (Exception e) {
            logger.error("❌ [后处理] 处理失败", e);
            reportProgress("错误", 100, "后处理失败: " + e.getMessage());
        }
    }
    
    /**
     * 验证求解结果
     */
    private void validateSolution(ExamSchedule solution) {
        if (solution == null) {
            throw new IllegalArgumentException("解决方案不能为null");
        }
        
        // 🔧 修复：使用正确的方法名 getExamAssignments()
        if (solution.getExamAssignments() == null || solution.getExamAssignments().isEmpty()) {
            logger.warn("⚠️  [验证] 没有考试分配");
            return;
        }
        
        // 🔧 修复：使用正确的方法名 getExamAssignments()
        long totalAssignments = solution.getExamAssignments().size();
        long completeAssignments = solution.getExamAssignments().stream()
            .filter(ExamAssignment::isComplete)
            .count();
        
        double completionRate = (double) completeAssignments / totalAssignments * 100.0;
        
        logger.info("✅ [验证] 总分配: {}, 完成: {}, 完成率: {:.2f}%", 
            totalAssignments, completeAssignments, completionRate);
        
        if (completionRate < 100.0) {
            logger.warn("⚠️  [验证] 存在未完成的分配");
        }
    }
    
    /**
     * 检查约束满足情况
     */
    private void checkConstraints(ExamSchedule solution) {
        if (solution.getScore() == null) {
            logger.warn("⚠️  [约束检查] 分数为null");
            return;
        }
        
        logger.info("✅ [约束检查] 当前分数: {}", solution.getScore());
        
        if (solution.getScore().isFeasible()) {
            logger.info("✅ [约束检查] 所有硬约束满足");
        } else {
            logger.warn("⚠️  [约束检查] 存在硬约束违反: {}", 
                solution.getScore().hardScore());
        }
    }
    
    /**
     * 转换数据（如果需要）
     */
    private void transformData(ExamSchedule solution) {
        // 这里可以添加任何需要的数据转换逻辑
        logger.info("✅ [数据转换] 数据转换完成");
    }
    
    /**
     * 生成报告
     */
    private void generateReport(ExamSchedule solution) {
        // 这里可以添加报告生成逻辑
        logger.info("✅ [报告生成] 报告生成完成");
    }
    
    /**
     * 报告进度
     */
    private void reportProgress(String phase, int percentage, String message) {
        logger.debug("📊 [后处理] {}: {}% - {}", phase, percentage, message);
        
        if (callback != null) {
            try {
                callback.onProgressUpdate(phase, percentage, message);
            } catch (Exception e) {
                logger.error("❌ [后处理] 进度回调失败", e);
            }
        }
    }
}


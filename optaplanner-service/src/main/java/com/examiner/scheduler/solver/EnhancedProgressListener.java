package com.examiner.scheduler.solver;

import com.examiner.scheduler.domain.ExamSchedule;
import com.examiner.scheduler.domain.ExamAssignment;
import org.optaplanner.core.api.solver.event.BestSolutionChangedEvent;
import org.optaplanner.core.api.solver.event.SolverEventListener;
import org.optaplanner.core.impl.phase.event.PhaseLifecycleListener;
import org.optaplanner.core.impl.phase.scope.AbstractPhaseScope;
import org.optaplanner.core.impl.solver.scope.SolverScope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 增强的进度监听器 - 支持阶段感知的进度更新
 * 
 * 基于大厂实践的进度显示优化：
 * 1. 阶段感知：区分构造启发式和局部搜索阶段
 * 2. 准确计算：基于实际工作量而非时间估算
 * 3. 不确定性表示：长时间运行时显示"正在优化"而不是虚假的100%
 */
public class EnhancedProgressListener implements SolverEventListener<ExamSchedule>, PhaseLifecycleListener<ExamSchedule> {
    
    private static final Logger logger = LoggerFactory.getLogger(EnhancedProgressListener.class);
    
    // 进度回调接口
    public interface ProgressCallback {
        void onProgressUpdate(ProgressInfo progressInfo);
    }
    
    // 进度信息类
    public static class ProgressInfo {
        private final String phase;
        private final int progressPercentage;
        private final String message;
        private final boolean isDeterministic;
        private final long stepCount;
        private final String currentScore;
        
        public ProgressInfo(String phase, int progressPercentage, String message, 
                           boolean isDeterministic, long stepCount, String currentScore) {
            this.phase = phase;
            this.progressPercentage = progressPercentage;
            this.message = message;
            this.isDeterministic = isDeterministic;
            this.stepCount = stepCount;
            this.currentScore = currentScore;
        }
        
        public String getPhase() { return phase; }
        public int getProgressPercentage() { return progressPercentage; }
        public String getMessage() { return message; }
        public boolean isDeterministic() { return isDeterministic; }
        public long getStepCount() { return stepCount; }
        public String getCurrentScore() { return currentScore; }
    }
    
    private final ProgressCallback callback;
    private String currentPhase = "初始化";
    private long totalAssignments = 0;
    private long stepCount = 0;
    private long phaseStartTime = 0;
    private boolean isConstructionPhase = true;
    
    public EnhancedProgressListener(ProgressCallback callback) {
        this.callback = callback;
    }
    
    @Override
    public void bestSolutionChanged(BestSolutionChangedEvent<ExamSchedule> event) {
        stepCount++;
        ExamSchedule solution = event.getNewBestSolution();
        
        if (solution == null) {
            return;
        }
        
        // 🔧 修复：使用正确的方法名 getExamAssignments()
        if (totalAssignments == 0 && solution.getExamAssignments() != null) {
            totalAssignments = solution.getExamAssignments().size();
        }
        
        // 计算进度
        ProgressInfo progressInfo = calculateProgress(solution);
        
        // 回调通知
        if (callback != null) {
            callback.onProgressUpdate(progressInfo);
        }
    }
    
    @Override
    public void phaseStarted(AbstractPhaseScope<ExamSchedule> phaseScope) {
        phaseStartTime = System.currentTimeMillis();
        
        // 🔧 修复：通过类名判断阶段类型，而不是调用不存在的getSolverPhase()方法
        String phaseClassName = phaseScope.getClass().getSimpleName();
        
        if (phaseClassName.contains("ConstructionHeuristic")) {
            currentPhase = "构造初始解";
            isConstructionPhase = true;
            logger.info("📝 [阶段] 开始构造启发式阶段");
        } else if (phaseClassName.contains("LocalSearch")) {
            currentPhase = "局部搜索优化";
            isConstructionPhase = false;
            logger.info("🔍 [阶段] 开始局部搜索阶段");
        } else {
            currentPhase = "求解中";
            isConstructionPhase = false;
            logger.info("⚙️  [阶段] 开始求解阶段: {}", phaseClassName);
        }
    }
    
    @Override
    public void phaseEnded(AbstractPhaseScope<ExamSchedule> phaseScope) {
        long duration = System.currentTimeMillis() - phaseStartTime;
        logger.info("✅ [阶段] {} 完成，耗时: {}ms", currentPhase, duration);
    }
    
    @Override
    public void stepStarted(org.optaplanner.core.impl.phase.scope.AbstractStepScope<ExamSchedule> stepScope) {
        // 步骤开始时的处理（如果需要）
    }
    
    @Override
    public void stepEnded(org.optaplanner.core.impl.phase.scope.AbstractStepScope<ExamSchedule> stepScope) {
        // 步骤结束时的处理（如果需要）
    }
    
    @Override
    public void solvingStarted(SolverScope<ExamSchedule> solverScope) {
        logger.info("🚀 [求解器] 开始求解");
        stepCount = 0;
    }
    
    @Override
    public void solvingEnded(SolverScope<ExamSchedule> solverScope) {
        logger.info("🏁 [求解器] 求解完成，总步数: {}", stepCount);
        
        // 发送完成通知
        if (callback != null) {
            ExamSchedule solution = solverScope.getBestSolution();
            String score = solution != null && solution.getScore() != null 
                ? solution.getScore().toString() 
                : "未知";
                
            ProgressInfo completionInfo = new ProgressInfo(
                "完成",
                100,
                "求解完成",
                true,
                stepCount,
                score
            );
            callback.onProgressUpdate(completionInfo);
        }
    }
    
    /**
     * 计算进度信息
     */
    private ProgressInfo calculateProgress(ExamSchedule solution) {
        int progressPercentage;
        String message;
        boolean isDeterministic;
        
        // 🔧 修复：使用正确的方法名 getExamAssignments()
        long assignedCount = 0;
        if (solution.getExamAssignments() != null) {
            assignedCount = solution.getExamAssignments().stream()
                .filter(ExamAssignment::isComplete)
                .count();
        }
        
        if (isConstructionPhase) {
            // 构造阶段：基于已分配数量计算进度（确定性）
            if (totalAssignments > 0) {
                progressPercentage = (int) ((assignedCount * 100.0) / totalAssignments);
                // 构造阶段占40%
                progressPercentage = Math.min(40, (progressPercentage * 40) / 100);
            } else {
                progressPercentage = 0;
            }
            message = String.format("构造初始解... (%d/%d)", assignedCount, totalAssignments);
            isDeterministic = true;
            
        } else {
            // 局部搜索阶段：基于步数估算（不确定性）
            // 40%-90% 之间，但显示为"正在优化"
            long estimatedSteps = totalAssignments * 100; // 估计需要的步数
            if (estimatedSteps > 0) {
                double searchProgress = Math.min(1.0, (double) stepCount / estimatedSteps);
                progressPercentage = 40 + (int) (searchProgress * 50); // 40% 到 90%
            } else {
                progressPercentage = 40;
            }
            
            // 超过1分钟后，不再显示具体百分比，而是显示"正在深度优化"
            long elapsedTime = System.currentTimeMillis() - phaseStartTime;
            if (elapsedTime > 60000) {
                message = "正在深度优化中...";
                isDeterministic = false;
                progressPercentage = Math.min(90, progressPercentage); // 最多到90%
            } else {
                message = String.format("局部搜索优化中... (步数: %d)", stepCount);
                isDeterministic = false;
            }
        }
        
        String currentScore = solution.getScore() != null 
            ? solution.getScore().toString() 
            : "计算中";
        
        return new ProgressInfo(
            currentPhase,
            progressPercentage,
            message,
            isDeterministic,
            stepCount,
            currentScore
        );
    }
}


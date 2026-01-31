package com.examiner.scheduler.solver;

import com.examiner.scheduler.domain.ExamAssignment;
import com.examiner.scheduler.domain.Teacher;
import org.optaplanner.core.impl.heuristic.selector.common.nearby.NearbyDistanceMeter;

import java.util.Objects;

/**
 * 考官科室距离度量器
 * 用于近邻选择（Nearby Selection）优化
 * 
 * 🚀 性能优化：帮助OptaPlanner优先选择"接近"的考官
 * - 推荐科室的考官距离最近（距离=0）
 * - 同科室的考官距离较近（距离=1）
 * - 不同科室的考官距离较远（距离=2）
 * 
 * 参考OptaPlanner最佳实践：
 * - NearbySelection显著提升大规模问题的求解速度
 * - 通过聚焦在更有可能改善得分的移动上，减少无效搜索
 */
public class TeacherDepartmentDistanceMeter implements NearbyDistanceMeter<Teacher, ExamAssignment> {
    
    @Override
    public double getNearbyDistance(Teacher origin, ExamAssignment destination) {
        // 基本验证
        if (origin == null || destination == null || destination.getStudent() == null) {
            return Double.MAX_VALUE;
        }
        
        String originDept = normalizeDepartment(origin.getDepartment());
        String studentDept = normalizeDepartment(destination.getStudent().getDepartment());
        
        // 获取推荐科室（根据考试类型）
        String recommendedDept = destination.getStudent().getExaminer2RecommendedDepartmentByExamType(
            destination.getExamType()
        );
        String normalizedRecommendedDept = recommendedDept != null ? normalizeDepartment(recommendedDept) : null;
        
        // 距离计算：推荐科室=0（最优），不同科室=1（次优），同科室=10（最差，避免违反硬约束）
        if (normalizedRecommendedDept != null && Objects.equals(originDept, normalizedRecommendedDept)) {
            return 0.0; // 推荐科室，最优选择
        } else if (Objects.equals(originDept, studentDept)) {
            return 10.0; // 同科室，最差选择（因为HC7要求考官2必须不同科室）
        } else {
            return 1.0; // 不同科室，次优选择
        }
    }
    
    /**
     * 科室名称标准化
     * 复制自OptimizedExamScheduleConstraintProvider的normalizeDepartment方法
     */
    private String normalizeDepartment(String dept) {
        if (dept == null) {
            return null;
        }
        // 去除空格和特殊字符，统一格式
        String normalized = dept.trim()
                .replace(" ", "")
                .replace("　", "") // 全角空格
                .replace("\t", "")
                .toLowerCase();
        
        // 空字符串视为null
        if (normalized.isEmpty()) {
            return null;
        }
        
        return normalized;
    }
}


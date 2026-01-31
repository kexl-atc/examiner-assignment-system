package com.examiner.scheduler.solver;

import com.examiner.scheduler.domain.Teacher;

import java.util.Comparator;

/**
 * 考官强度比较器
 * 用于确定哪些考官更"优秀"（更适合被选择）
 * 
 * 性能优化：通过合理的排序，OptaPlanner 可以更快地选择好的考官
 * 
 * 排序逻辑（从强到弱）：
 * 1. 晚班考官优先（软约束SC1权重最高: 150）
 * 2. 休息第一天考官次优（软约束SC3权重: 120）
 * 3. 休息第二天考官中等（软约束SC5权重: 40）
 * 4. 行政班考官最低（软约束SC7权重: 40）
 * 5. 工作量少的优先
 * 6. 有不可用期的考官降低优先级
 */
public class TeacherStrengthComparator implements Comparator<Teacher> {
    
    // 当前日期（用于计算班组优先级，可以通过ThreadLocal或其他方式传递）
    // 这里简化处理，优先级基于考官的一般属性
    
    @Override
    public int compare(Teacher t1, Teacher t2) {
        // 🔧 防御性编程：处理null值
        if (t1 == null && t2 == null) return 0;
        if (t1 == null) return -1;
        if (t2 == null) return 1;

        // 1. 根据班组类型确定优先级
        int shiftPriority1 = getShiftPriority(t1.getGroup());
        int shiftPriority2 = getShiftPriority(t2.getGroup());
        if (shiftPriority1 != shiftPriority2) {
            return Integer.compare(shiftPriority2, shiftPriority1); // 降序：优先级高的优先
        }
        
        // 2. 不可用期少的优先（可用性高）
        int unavailableCount1 = t1.getUnavailablePeriods() != null ? t1.getUnavailablePeriods().size() : 0;
        int unavailableCount2 = t2.getUnavailablePeriods() != null ? t2.getUnavailablePeriods().size() : 0;
        if (unavailableCount1 != unavailableCount2) {
            return Integer.compare(unavailableCount1, unavailableCount2); // 升序：不可用期少的优先
        }
        
        // 3. 按ID排序（保证稳定性）
        String id1 = t1.getId() != null ? t1.getId() : "";
        String id2 = t2.getId() != null ? t2.getId() : "";
        return id1.compareTo(id2);
    }
    
    /**
     * 获取班组的优先级
     * 返回值越大，优先级越高
     * 
     * 基于软约束权重：
     * - 晚班: 150 (SC1)
     * - 休息第一天: 120 (SC3)
     * - 休息第二天: 40 (SC5)
     * - 行政班: 40 (SC7)
     */
    private int getShiftPriority(String group) {
        if (group == null) {
            return 0;
        }
        
        String normalized = group.trim();
        
        // 晚班优先级最高
        if (normalized.contains("晚")) {
            return 150;
        }
        
        // 休息班次优先级中等（无法区分第一天/第二天，统一给中等优先级）
        if (normalized.contains("休")) {
            return 80; // 平均值 (120 + 40) / 2
        }
        
        // 行政班优先级最低
        if (normalized.contains("行政")) {
            return 40;
        }
        
        // 其他情况（白班等）
        return 50;
    }
}


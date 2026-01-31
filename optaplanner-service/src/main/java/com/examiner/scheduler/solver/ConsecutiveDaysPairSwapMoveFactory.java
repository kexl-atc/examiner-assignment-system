package com.examiner.scheduler.solver;

import com.examiner.scheduler.domain.ExamAssignment;
import com.examiner.scheduler.domain.ExamSchedule;
import org.optaplanner.core.impl.heuristic.move.Move;
import org.optaplanner.core.impl.heuristic.selector.move.factory.MoveListFactory;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 🔧 连续日期对交换Move工厂
 * 
 * 为每个学员生成可能的连续日期对：
 * - 找到学员的day1和day2 assignment
 * - 生成所有可能的连续日期对(d, d+1)
 * - 每个日期对作为一个Move
 */
public class ConsecutiveDaysPairSwapMoveFactory implements MoveListFactory<ExamSchedule> {
    
    @Override
    public List<Move<ExamSchedule>> createMoveList(ExamSchedule solution) {
        List<Move<ExamSchedule>> moves = new ArrayList<>();
        List<String> availableDates = solution.getAvailableDates();
        
        // 按学员分组assignments
        Map<String, ExamAssignment> day1Map = new HashMap<>();
        Map<String, ExamAssignment> day2Map = new HashMap<>();
        
        for (ExamAssignment assignment : solution.getExamAssignments()) {
            String studentId = assignment.getStudent().getId();
            if ("day1".equals(assignment.getExamType())) {
                day1Map.put(studentId, assignment);
            } else if ("day2".equals(assignment.getExamType())) {
                day2Map.put(studentId, assignment);
            }
        }
        
        // 为每个学员生成连续日期对的Moves
        for (String studentId : day1Map.keySet()) {
            ExamAssignment day1 = day1Map.get(studentId);
            ExamAssignment day2 = day2Map.get(studentId);
            
            if (day1 != null && day2 != null) {
                // 遍历所有可能的day1日期
                for (int i = 0; i < availableDates.size() - 1; i++) {
                    String date1 = availableDates.get(i);
                    
                    // 检查date1的下一天是否也在可用日期中
                    try {
                        LocalDate d1 = LocalDate.parse(date1);
                        LocalDate d2 = d1.plusDays(1);
                        String date2 = d2.toString();
                        
                        if (availableDates.contains(date2)) {
                            // 创建一个Move，将学员的两天考试设置为这个连续日期对
                            moves.add(new ConsecutiveDaysPairSwapMove(day1, day2, date1));
                        }
                    } catch (Exception e) {
                        // 日期解析失败，跳过
                    }
                }
            }
        }
        
        return moves;
    }
} 
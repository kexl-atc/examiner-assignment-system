package com.examiner.scheduler.solver;

import com.examiner.scheduler.domain.ExamAssignment;
import com.examiner.scheduler.domain.ExamSchedule;
import org.optaplanner.core.api.score.director.ScoreDirector;
import org.optaplanner.core.impl.heuristic.move.AbstractMove;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;

/**
 * 🔧 自定义Move：同时改变学员的day1和day2日期，确保连续性
 * 
 * 这个Move解决了OptaPlanner无法协调两个独立变量的问题：
 * - day1和day2是两个独立的ExamAssignment
 * - 标准的Local Search每次只改变一个变量
 * - 这个Custom Move同时改变两个变量，确保它们相差1天
 */
public class ConsecutiveDaysPairSwapMove extends AbstractMove<ExamSchedule> {
    
    private final ExamAssignment day1Assignment;
    private final ExamAssignment day2Assignment;
    private final String newDay1Date;
    private final String newDay2Date;
    private final String oldDay1Date;
    private final String oldDay2Date;
    
    public ConsecutiveDaysPairSwapMove(ExamAssignment day1Assignment, 
                                       ExamAssignment day2Assignment,
                                       String newDay1Date) {
        this.day1Assignment = day1Assignment;
        this.day2Assignment = day2Assignment;
        this.newDay1Date = newDay1Date;
        
        // 计算day2的日期（day1的下一天）
        String calculatedDay2;
        try {
            LocalDate day1 = LocalDate.parse(newDay1Date);
            LocalDate day2 = day1.plusDays(1);
            calculatedDay2 = day2.format(DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e) {
            calculatedDay2 = null;
        }
        this.newDay2Date = calculatedDay2;
        
        // 保存旧日期用于undo
        this.oldDay1Date = day1Assignment.getExamDate();
        this.oldDay2Date = day2Assignment.getExamDate();
    }
    
    @Override
    public boolean isMoveDoable(ScoreDirector<ExamSchedule> scoreDirector) {
        // 检查新日期是否有效
        if (newDay2Date == null) {
            return false;
        }
        
        ExamSchedule schedule = scoreDirector.getWorkingSolution();
        List<String> availableDates = schedule.getAvailableDates();
        
        // 两个日期都必须在可用日期列表中
        return availableDates.contains(newDay1Date) && availableDates.contains(newDay2Date);
    }
    
    @Override
    protected AbstractMove<ExamSchedule> createUndoMove(ScoreDirector<ExamSchedule> scoreDirector) {
        return new ConsecutiveDaysPairSwapMove(day1Assignment, day2Assignment, oldDay1Date);
    }
    
    @Override
    protected void doMoveOnGenuineVariables(ScoreDirector<ExamSchedule> scoreDirector) {
        // 同时改变day1和day2的日期
        scoreDirector.beforeVariableChanged(day1Assignment, "examDate");
        day1Assignment.setExamDate(newDay1Date);
        scoreDirector.afterVariableChanged(day1Assignment, "examDate");
        
        scoreDirector.beforeVariableChanged(day2Assignment, "examDate");
        day2Assignment.setExamDate(newDay2Date);
        scoreDirector.afterVariableChanged(day2Assignment, "examDate");
    }
    
    @Override
    public Collection<?> getPlanningEntities() {
        return List.of(day1Assignment, day2Assignment);
    }
    
    @Override
    public Collection<?> getPlanningValues() {
        return List.of(newDay1Date, newDay2Date);
    }
    
    @Override
    public String toString() {
        return "ConsecutiveDaysPairSwapMove{" +
                "student=" + day1Assignment.getStudent().getName() +
                ", oldDates=[" + oldDay1Date + ", " + oldDay2Date + "]" +
                ", newDates=[" + newDay1Date + ", " + newDay2Date + "]" +
                '}';
    }
} 
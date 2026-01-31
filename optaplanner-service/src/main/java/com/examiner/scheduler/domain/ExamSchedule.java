package com.examiner.scheduler.domain;

import com.examiner.scheduler.config.HolidayConfig;
import org.optaplanner.core.api.domain.solution.PlanningEntityCollectionProperty;
import org.optaplanner.core.api.domain.solution.PlanningScore;
import org.optaplanner.core.api.domain.solution.PlanningSolution;
import org.optaplanner.core.api.domain.solution.ProblemFactCollectionProperty;
import org.optaplanner.core.api.domain.valuerange.ValueRangeProvider;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 考试排班解决方案类 - OptaPlanner主要解决方案实体
 */
@PlanningSolution
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExamSchedule {
    
    // 问题事实（输入数据）
    @ProblemFactCollectionProperty
    private List<Student> students;
    
    @ProblemFactCollectionProperty
    @ValueRangeProvider(id = "teacherRange")
    private List<Teacher> teachers;
    
    @ProblemFactCollectionProperty
    @ValueRangeProvider(id = "examDateRange")
    private List<String> availableDates;
    
    @ProblemFactCollectionProperty
    private List<DutySchedule> dutySchedules;
    
    @ProblemFactCollectionProperty
    private List<TimeSlot> timeSlots;
    
    // 规划实体集合
    @PlanningEntityCollectionProperty
    private List<ExamAssignment> examAssignments;
    
    // 分数
    @PlanningScore
    private HardSoftScore score;
    
    // 约束配置
    private OptimizedConstraintConfiguration constraintConfig;
    
    // 节假日配置
    private HolidayConfig holidayConfig;
    
    // 构造函数
    public ExamSchedule() {
        this.students = new ArrayList<>();
        this.teachers = new ArrayList<>();
        this.availableDates = new ArrayList<>();
        this.dutySchedules = new ArrayList<>();
        this.timeSlots = new ArrayList<>();
        this.examAssignments = new ArrayList<>();
        this.constraintConfig = new OptimizedConstraintConfiguration();
    }
    
    public ExamSchedule(List<Student> students, List<Teacher> teachers, 
                       String startDate, String endDate) {
        this();
        this.students = students;
        this.teachers = teachers;
        generateAvailableDates(startDate, endDate);
        generateDutySchedules();
        generateExamAssignments();
    }
    
    /**
     * 生成可用日期列表（仅工作日，考虑节假日和调休）
     */
    private void generateAvailableDates(String startDate, String endDate) {
        LocalDate start = LocalDate.parse(startDate);
        LocalDate end = LocalDate.parse(endDate);
        
        // 如果没有注入HolidayConfig，创建一个新实例
        if (holidayConfig == null) {
            holidayConfig = new HolidayConfig();
        }
        
        this.availableDates = start.datesUntil(end.plusDays(1))
                .filter(date -> {
                    // 使用HolidayConfig判断是否为工作日
                    return holidayConfig.isWorkingDay(date);
                })
                .map(date -> date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                .collect(Collectors.toList());
        
        System.out.println("生成可用日期数量: " + availableDates.size());
        System.out.println("可用日期范围: " + (availableDates.isEmpty() ? "无" : 
            availableDates.get(0) + " 到 " + availableDates.get(availableDates.size() - 1)));
    }
    
    /**
     * 生成值班调度信息
     */
    private void generateDutySchedules() {
        this.dutySchedules = availableDates.stream()
                .map(DutySchedule::new)
                .collect(Collectors.toList());
    }
    
    /**
     * 生成考试分配实体（每个学员1或2次考试，根据examDays决定）
     */
    private void generateExamAssignments() {
        this.examAssignments = new ArrayList<>();
        
        for (Student student : students) {
            // 第一天考试：现场 + 模拟机1
            ExamAssignment day1Assignment = new ExamAssignment(
                student.getId() + "_day1",
                student,
                "day1",
                List.of("现场", "模拟机1")
            );
            this.examAssignments.add(day1Assignment);
            
            // 🆕 根据学员考试天数决定是否创建第二天考试
            if (student.needsDay2Exam()) {
                // 第二天考试：模拟机2 + 口试
                ExamAssignment day2Assignment = new ExamAssignment(
                    student.getId() + "_day2",
                    student,
                    "day2",
                    List.of("模拟机2", "口试")
                );
                this.examAssignments.add(day2Assignment);
            }
        }
    }
    
    // Getter和Setter方法
    public List<Student> getStudents() {
        return students;
    }
    
    public void setStudents(List<Student> students) {
        this.students = students;
    }
    
    public List<Teacher> getTeachers() {
        return teachers;
    }
    
    public void setTeachers(List<Teacher> teachers) {
        this.teachers = teachers;
    }
    
    public List<String> getAvailableDates() {
        return availableDates;
    }
    
    public void setAvailableDates(List<String> availableDates) {
        this.availableDates = availableDates;
    }
    
    public List<DutySchedule> getDutySchedules() {
        return dutySchedules;
    }
    
    public void setDutySchedules(List<DutySchedule> dutySchedules) {
        this.dutySchedules = dutySchedules;
    }
    
    public List<ExamAssignment> getExamAssignments() {
        return examAssignments;
    }
    
    public void setExamAssignments(List<ExamAssignment> examAssignments) {
        this.examAssignments = examAssignments;
    }
    
    public HardSoftScore getScore() {
        return score;
    }
    
    public void setScore(HardSoftScore score) {
        this.score = score;
    }
    
    public OptimizedConstraintConfiguration getConstraintConfig() {
        return constraintConfig;
    }
    
    public void setConstraintConfig(OptimizedConstraintConfiguration constraintConfig) {
        this.constraintConfig = constraintConfig;
    }
    
    public List<TimeSlot> getTimeSlots() {
        return timeSlots;
    }
    
    public void setTimeSlots(List<TimeSlot> timeSlots) {
        this.timeSlots = timeSlots;
    }
    
    /**
     * 设置约束配置（别名方法，用于兼容性）
     */
    public void setConstraintConfiguration(OptimizedConstraintConfiguration constraintConfiguration) {
        this.constraintConfig = constraintConfiguration;
    }
    
    /**
     * 获取约束配置（别名方法，用于兼容性）
     */
    public OptimizedConstraintConfiguration getConstraintConfiguration() {
        return this.constraintConfig;
    }
    
    /**
     * 根据日期获取值班调度信息
     */
    public DutySchedule getDutyScheduleForDate(String date) {
        return dutySchedules.stream()
                .filter(ds -> ds.getDate().equals(date))
                .findFirst()
                .orElse(DutySchedule.forDate(date));
    }
    
    /**
     * 获取指定学员的考试分配
     */
    public List<ExamAssignment> getAssignmentsForStudent(String studentId) {
        return examAssignments.stream()
                .filter(assignment -> studentId.equals(assignment.getStudentId()))
                .collect(Collectors.toList());
    }
    
    /**
     * 获取指定日期的考试分配
     */
    public List<ExamAssignment> getAssignmentsForDate(String date) {
        return examAssignments.stream()
                .filter(assignment -> date.equals(assignment.getExamDate()))
                .collect(Collectors.toList());
    }
    
    /**
     * 获取指定考官的考试分配
     */
    public List<ExamAssignment> getAssignmentsForTeacher(String teacherId) {
        return examAssignments.stream()
                .filter(assignment -> 
                    (assignment.getExaminer1() != null && teacherId.equals(assignment.getExaminer1().getId())) ||
                    (assignment.getExaminer2() != null && teacherId.equals(assignment.getExaminer2().getId())) ||
                    (assignment.getBackupExaminer() != null && teacherId.equals(assignment.getBackupExaminer().getId()))
                )
                .collect(Collectors.toList());
    }
    
    /**
     * 检查解决方案是否完整
     */
    public boolean isComplete() {
        return examAssignments.stream().allMatch(ExamAssignment::isComplete);
    }
    
    /**
     * 获取完成度百分比
     */
    public double getCompletionPercentage() {
        if (examAssignments.isEmpty()) {
            return 0.0;
        }
        
        long completeAssignments = examAssignments.stream()
                .mapToLong(assignment -> assignment.isComplete() ? 1 : 0)
                .sum();
        
        return (double) completeAssignments / examAssignments.size() * 100.0;
    }
    
    @Override
    public String toString() {
        return "ExamSchedule{" +
                "students=" + students.size() +
                ", teachers=" + teachers.size() +
                ", availableDates=" + availableDates.size() +
                ", examAssignments=" + examAssignments.size() +
                ", score=" + score +
                ", completion=" + String.format("%.1f%%", getCompletionPercentage()) +
                '}';
    }
}
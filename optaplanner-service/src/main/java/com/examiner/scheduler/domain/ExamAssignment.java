package com.examiner.scheduler.domain;

import org.optaplanner.core.api.domain.entity.PlanningEntity;
import org.optaplanner.core.api.domain.entity.PlanningPin;
import org.optaplanner.core.api.domain.variable.PlanningVariable;
import org.optaplanner.core.api.domain.lookup.PlanningId;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Objects;

/**
 * 考试分配实体类 - OptaPlanner规划实体
 * 每个实例代表一个学员的一次考试安排
 * 
 * 🚀 性能优化：添加难度比较器优先处理困难的分配
 */
@PlanningEntity(difficultyComparatorClass = com.examiner.scheduler.solver.ExamAssignmentDifficultyComparator.class)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExamAssignment {
    
    @PlanningId
    private String id;
    private Student student;        // 学员（固定）
    private String examType;        // 考试类型：day1 或 day2（固定）
    private List<String> subjects;  // 考试科目（固定）
    
    // ⚠️ 固定标志：当为true时，OptaPlanner不会修改此assignment的规划变量
    @PlanningPin
    private boolean pinned = false;
    
    // 🆕 v5.6.0: 原始分配值（用于局部重排时验证固定排班未被改变）
    private String originalExaminer1Name;    // 原始考官1姓名
    private String originalExaminer2Name;    // 原始考官2姓名
    private String originalBackupExaminerName;  // 原始备份考官姓名
    private String originalExamDate;         // 原始考试日期
    
    // OptaPlanner规划变量
    // 🔒 日期不作为规划变量（在初始解中已确定连续性）
    private String examDate;        // 考试日期（初始解固定，不再是@PlanningVariable）
    
    // 🔧 关键修复：examiner1 恢复为规划变量，允许 OptaPlanner 自动优化
    // HC2约束（权重1,000,000）将确保考官1必须与学员同科室
    @PlanningVariable(
        valueRangeProviderRefs = "teacherRange", 
        nullable = false,
        strengthComparatorClass = com.examiner.scheduler.solver.TeacherStrengthComparator.class
    )
    private Teacher examiner1;      // 考官1 - 同科室（规划变量，不允许为null）
    
    @PlanningVariable(
        valueRangeProviderRefs = "teacherRange", 
        nullable = false,
        strengthComparatorClass = com.examiner.scheduler.solver.TeacherStrengthComparator.class
    )
    private Teacher examiner2;      // 考官2 - 不同科室（规划变量，不允许为null）
    
    @PlanningVariable(
        valueRangeProviderRefs = "teacherRange", 
        nullable = true,
        strengthComparatorClass = com.examiner.scheduler.solver.TeacherStrengthComparator.class
    )
    private Teacher backupExaminer; // 备份考官 - 不同科室（规划变量，备份可选）
    
    // 其他属性
    private String location;
    private TimeSlot timeSlot;
    
    // 构造函数
    public ExamAssignment() {
        // 确保无参构造函数也初始化必要的字段
        this.location = "考试室";
        this.timeSlot = new TimeSlot("08:00", "12:00", "morning");
    }
    
    public ExamAssignment(String id, Student student, String examType, List<String> subjects) {
        this(); // 调用无参构造函数确保基本字段初始化
        this.id = id;
        this.student = student;
        this.examType = examType;
        this.subjects = subjects;
    }
    
    // Getter和Setter方法
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public Student getStudent() {
        return student;
    }
    
    public void setStudent(Student student) {
        this.student = student;
    }
    
    public String getExamType() {
        return examType;
    }
    
    public void setExamType(String examType) {
        this.examType = examType;
    }
    
    public List<String> getSubjects() {
        return subjects;
    }
    
    public void setSubjects(List<String> subjects) {
        this.subjects = subjects;
    }
    
    public String getExamDate() {
        return examDate;
    }
    
    public void setExamDate(String examDate) {
        this.examDate = examDate;
    }
    
    public Teacher getExaminer1() {
        return examiner1;
    }
    
    public void setExaminer1(Teacher examiner1) {
        this.examiner1 = examiner1;
    }
    
    public Teacher getExaminer2() {
        return examiner2;
    }
    
    public void setExaminer2(Teacher examiner2) {
        this.examiner2 = examiner2;
    }
    
    public Teacher getBackupExaminer() {
        return backupExaminer;
    }
    
    public void setBackupExaminer(Teacher backupExaminer) {
        this.backupExaminer = backupExaminer;
    }
    
    public String getLocation() {
        return location;
    }
    
    public void setLocation(String location) {
        this.location = location;
    }
    
    public TimeSlot getTimeSlot() {
        return timeSlot;
    }
    
    public void setTimeSlot(TimeSlot timeSlot) {
        this.timeSlot = timeSlot;
    }
    
    public boolean isPinned() {
        return pinned;
    }
    
    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }
    
    /**
     * 检查分配是否完整（所有规划变量都已分配）
     */
    public boolean isComplete() {
        return examDate != null && 
               examiner1 != null && 
               examiner2 != null && 
               backupExaminer != null;
    }
    
    /**
     * 获取学员ID（便于访问）
     */
    public String getStudentId() {
        return student != null ? student.getId() : null;
    }
    
    /**
     * 获取学员姓名（便于访问）
     */
    public String getStudentName() {
        return student != null ? student.getName() : "未知学员";
    }
    
    /**
     * 获取学员科室（便于访问）
     */
    public String getStudentDepartment() {
        return student != null ? student.getDepartment() : null;
    }
    
    /**
     * 检查是否为第一天考试
     */
    public boolean isDay1Exam() {
        return "day1".equals(examType);
    }
    
    /**
     * 检查是否为第二天考试
     */
    public boolean isDay2Exam() {
        return "day2".equals(examType);
    }
    
    /**
     * 检查是否包含现场考试
     */
    public boolean hasFieldExam() {
        return subjects != null && subjects.contains("现场");
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ExamAssignment that = (ExamAssignment) o;
        return Objects.equals(id, that.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    // 🆕 v5.6.0: 原始分配值的getter和setter
    public String getOriginalExaminer1Name() {
        return originalExaminer1Name;
    }
    
    public void setOriginalExaminer1Name(String originalExaminer1Name) {
        this.originalExaminer1Name = originalExaminer1Name;
    }
    
    public String getOriginalExaminer2Name() {
        return originalExaminer2Name;
    }
    
    public void setOriginalExaminer2Name(String originalExaminer2Name) {
        this.originalExaminer2Name = originalExaminer2Name;
    }
    
    public String getOriginalBackupExaminerName() {
        return originalBackupExaminerName;
    }
    
    public void setOriginalBackupExaminerName(String originalBackupExaminerName) {
        this.originalBackupExaminerName = originalBackupExaminerName;
    }
    
    public String getOriginalExamDate() {
        return originalExamDate;
    }
    
    public void setOriginalExamDate(String originalExamDate) {
        this.originalExamDate = originalExamDate;
    }
    
    /**
     * 🆕 v5.6.0: 检查是否与原始分配一致
     * 用于局部重排场景，验证固定的排班未被改变
     * 
     * @return true表示一致，false表示被改变
     */
    public boolean matchesOriginal() {
        if (!pinned) {
            return true;  // 未固定的排班不需要检查
        }
        
        // 检查考官1
        boolean examiner1Match = Objects.equals(
            examiner1 != null ? examiner1.getName() : null,
            originalExaminer1Name
        );
        
        // 检查考官2
        boolean examiner2Match = Objects.equals(
            examiner2 != null ? examiner2.getName() : null,
            originalExaminer2Name
        );
        
        // 检查备份考官
        boolean backupMatch = Objects.equals(
            backupExaminer != null ? backupExaminer.getName() : null,
            originalBackupExaminerName
        );
        
        // 检查日期
        boolean dateMatch = Objects.equals(examDate, originalExamDate);
        
        return examiner1Match && examiner2Match && backupMatch && dateMatch;
    }
    
    /**
     * 🆕 v5.6.0: 设置原始分配值
     * 便捷方法，一次性设置所有原始值
     */
    public void setOriginalAssignment() {
        this.originalExaminer1Name = examiner1 != null ? examiner1.getName() : null;
        this.originalExaminer2Name = examiner2 != null ? examiner2.getName() : null;
        this.originalBackupExaminerName = backupExaminer != null ? backupExaminer.getName() : null;
        this.originalExamDate = examDate;
    }
    
    @Override
    public String toString() {
        return "ExamAssignment{" +
                "id='" + id + '\'' +
                ", student=" + (student != null ? student.getName() : "未知学员") +
                ", examType='" + examType + '\'' +
                ", examDate='" + examDate + '\'' +
                ", examiner1=" + (examiner1 != null ? examiner1.getName() : "未知考官") +
                ", examiner2=" + (examiner2 != null ? examiner2.getName() : "未知考官") +
                ", backupExaminer=" + (backupExaminer != null ? backupExaminer.getName() : "未知考官") +
                ", pinned=" + pinned +
                '}';
    }
}
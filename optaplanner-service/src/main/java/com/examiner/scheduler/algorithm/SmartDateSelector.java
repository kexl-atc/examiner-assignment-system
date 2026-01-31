package com.examiner.scheduler.algorithm;

import com.examiner.scheduler.domain.*;
import com.examiner.scheduler.config.HolidayConfig;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.logging.Logger;

/**
 * 智能日期选择算法
 * 基于班组轮值情况分析，智能推荐最优考试日期安排
 */
public class SmartDateSelector {
    
    private static final Logger LOGGER = Logger.getLogger(SmartDateSelector.class.getName());
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    private final HolidayConfig holidayConfig;
    
    public SmartDateSelector() {
        this.holidayConfig = new HolidayConfig();
    }
    
    /**
     * 智能分析并推荐最优考试日期安排
     * @param students 学员列表
     * @param teachers 考官列表
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @return 智能推荐结果
     */
    public SmartDateRecommendation analyzeOptimalDates(List<Student> students, List<Teacher> teachers, 
                                                       String startDate, String endDate) {
        LOGGER.info("开始智能日期分析: 学员=" + students.size() + ", 考官=" + teachers.size() + 
                   ", 日期范围=" + startDate + "~" + endDate);
        
        // 1. 获取可用工作日
        List<LocalDate> availableDates = getAvailableWorkdays(startDate, endDate);
        LOGGER.info("可用工作日数量: " + availableDates.size());
        
        // 2. 分析每个日期的轮值冲突情况
        List<DateAnalysis> dateAnalyses = new ArrayList<>();
        for (LocalDate date : availableDates) {
            DateAnalysis analysis = analyzeDateConflicts(date, students, teachers);
            dateAnalyses.add(analysis);
        }
        
        // 3. 按冲突程度排序，选择最优日期
        dateAnalyses.sort(Comparator.comparingDouble(DateAnalysis::getConflictScore));
        
        // 4. 生成推荐结果
        SmartDateRecommendation recommendation = generateRecommendation(dateAnalyses, students.size());
        
        LOGGER.info("智能日期分析完成: 推荐日期数=" + recommendation.getRecommendedDates().size());
        return recommendation;
    }
    
    /**
     * 获取指定范围内的可用工作日
     */
    private List<LocalDate> getAvailableWorkdays(String startDate, String endDate) {
        LocalDate start = LocalDate.parse(startDate, DATE_FORMATTER);
        LocalDate end = LocalDate.parse(endDate, DATE_FORMATTER);
        
        List<LocalDate> workdays = new ArrayList<>();
        LocalDate current = start;
        
        while (!current.isAfter(end)) {
            // 排除周末和节假日
            if (current.getDayOfWeek() != DayOfWeek.SATURDAY && 
                current.getDayOfWeek() != DayOfWeek.SUNDAY && 
                !holidayConfig.isHoliday(current)) {
                workdays.add(current);
            }
            current = current.plusDays(1);
        }
        
        return workdays;
    }
    
    /**
     * 分析指定日期的轮值冲突情况
     */
    private DateAnalysis analyzeDateConflicts(LocalDate date, List<Student> students, List<Teacher> teachers) {
        String dateStr = date.format(DATE_FORMATTER);
        DutySchedule dutySchedule = DutySchedule.forDate(date);
        
        DateAnalysis analysis = new DateAnalysis(dateStr);
        
        // 1. 分析学员轮值冲突
        int studentConflicts = 0;
        Map<String, Integer> conflictsByGroup = new HashMap<>();
        
        for (Student student : students) {
            if (dutySchedule.isGroupOnDayShift(student.getGroup())) {
                studentConflicts++;
                conflictsByGroup.merge(student.getGroup(), 1, Integer::sum);
                analysis.addConflictDetail("学员轮值冲突", 
                    student.getName() + "(" + student.getGroup() + ")在" + dateStr + "值白班");
            }
        }
        
        // 2. 分析考官资源可用性
        int availableTeachers = 0;
        int conflictedTeachers = 0;
        
        for (Teacher teacher : teachers) {
            if (dutySchedule.isGroupOnDayShift(teacher.getGroup())) {
                conflictedTeachers++;
                analysis.addConflictDetail("考官轮值冲突", 
                    teacher.getName() + "(" + teacher.getDepartment() + "," + teacher.getGroup() + ")在" + dateStr + "值白班");
            } else {
                availableTeachers++;
            }
        }
        
        // 3. 计算资源充足度
        double resourceSufficiency = calculateResourceSufficiency(students, teachers, dutySchedule);
        
        // 4. 计算综合冲突评分
        double conflictScore = calculateConflictScore(studentConflicts, conflictedTeachers, 
                                                     students.size(), teachers.size(), resourceSufficiency);
        
        analysis.setStudentConflicts(studentConflicts);
        analysis.setTeacherConflicts(conflictedTeachers);
        analysis.setAvailableTeachers(availableTeachers);
        analysis.setResourceSufficiency(resourceSufficiency);
        analysis.setConflictScore(conflictScore);
        analysis.setDutyInfo(dutySchedule.getDayShift() + "值白班, " + dutySchedule.getNightShift() + "值晚班");
        
        return analysis;
    }
    
    /**
     * 计算资源充足度
     */
    private double calculateResourceSufficiency(List<Student> students, List<Teacher> teachers, DutySchedule dutySchedule) {
        // 统计各科室可用考官数量
        Map<String, Long> availableTeachersByDept = teachers.stream()
            .filter(teacher -> !dutySchedule.isGroupOnDayShift(teacher.getGroup()))
            .collect(Collectors.groupingBy(Teacher::getDepartment, Collectors.counting()));
        
        // 统计各科室学员数量
        Map<String, Long> studentsByDept = students.stream()
            .collect(Collectors.groupingBy(Student::getDepartment, Collectors.counting()));
        
        double totalSufficiency = 0.0;
        int deptCount = 0;
        
        for (Map.Entry<String, Long> entry : studentsByDept.entrySet()) {
            String dept = entry.getKey();
            long studentCount = entry.getValue();
            
            // 考虑三室七室互借
            long availableTeachers = availableTeachersByDept.getOrDefault(dept, 0L);
            if ("三".equals(dept) || "七".equals(dept)) {
                availableTeachers += availableTeachersByDept.getOrDefault("三".equals(dept) ? "七" : "三", 0L);
            }
            
            // 每个学员需要2次考试，每个考官每天最多监考2次
            double requiredCapacity = studentCount * 2.0;
            double availableCapacity = availableTeachers * 2.0;
            
            double deptSufficiency = availableCapacity > 0 ? 
                Math.min(1.0, availableCapacity / requiredCapacity) : 0.0;
            
            totalSufficiency += deptSufficiency;
            deptCount++;
        }
        
        return deptCount > 0 ? totalSufficiency / deptCount : 0.0;
    }
    
    /**
     * 计算综合冲突评分（越低越好）
     */
    private double calculateConflictScore(int studentConflicts, int teacherConflicts, 
                                        int totalStudents, int totalTeachers, double resourceSufficiency) {
        // 学员冲突权重更高，因为HC5约束是硬约束
        double studentConflictRatio = (double) studentConflicts / totalStudents;
        double teacherConflictRatio = (double) teacherConflicts / totalTeachers;
        
        // 综合评分：学员冲突(权重0.5) + 考官冲突(权重0.3) + 资源不足(权重0.2)
        double score = studentConflictRatio * 0.5 + 
                      teacherConflictRatio * 0.3 + 
                      (1.0 - resourceSufficiency) * 0.2;
        
        return score;
    }
    
    /**
     * 生成智能推荐结果
     */
    private SmartDateRecommendation generateRecommendation(List<DateAnalysis> dateAnalyses, int studentCount) {
        SmartDateRecommendation recommendation = new SmartDateRecommendation();
        
        // 需要的考试日数量（每个学员2天考试）
        int requiredDays = Math.min(studentCount * 2, dateAnalyses.size());
        
        // 选择冲突最少的日期
        List<DateAnalysis> recommendedAnalyses = dateAnalyses.stream()
            .limit(requiredDays)
            .collect(Collectors.toList());
        
        List<String> recommendedDates = recommendedAnalyses.stream()
            .map(DateAnalysis::getDate)
            .collect(Collectors.toList());
        
        recommendation.setRecommendedDates(recommendedDates);
        recommendation.setDateAnalyses(dateAnalyses);
        
        // 生成推荐理由
        StringBuilder reason = new StringBuilder();
        reason.append("基于轮值冲突分析，推荐以下日期：\n");
        
        for (int i = 0; i < Math.min(5, recommendedAnalyses.size()); i++) {
            DateAnalysis analysis = recommendedAnalyses.get(i);
            reason.append(String.format("• %s: 学员冲突%d人，考官冲突%d人，资源充足度%.1f%%\n",
                analysis.getDate(), analysis.getStudentConflicts(), 
                analysis.getTeacherConflicts(), analysis.getResourceSufficiency() * 100));
        }
        
        recommendation.setRecommendationReason(reason.toString());
        
        // 计算整体质量评估
        double avgConflictScore = recommendedAnalyses.stream()
            .mapToDouble(DateAnalysis::getConflictScore)
            .average().orElse(1.0);
        
        String qualityLevel;
        if (avgConflictScore < 0.1) {
            qualityLevel = "优秀";
        } else if (avgConflictScore < 0.3) {
            qualityLevel = "良好";
        } else if (avgConflictScore < 0.5) {
            qualityLevel = "一般";
        } else {
            qualityLevel = "较差";
        }
        
        recommendation.setQualityAssessment(qualityLevel);
        recommendation.setOverallScore(1.0 - avgConflictScore);
        
        return recommendation;
    }
    
    /**
     * 日期分析结果
     */
    public static class DateAnalysis {
        private String date;
        private int studentConflicts;
        private int teacherConflicts;
        private int availableTeachers;
        private double resourceSufficiency;
        private double conflictScore;
        private String dutyInfo;
        private List<String> conflictDetails = new ArrayList<>();
        
        public DateAnalysis(String date) {
            this.date = date;
        }
        
        public void addConflictDetail(String type, String detail) {
            conflictDetails.add(type + ": " + detail);
        }
        
        // Getters and Setters
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        
        public int getStudentConflicts() { return studentConflicts; }
        public void setStudentConflicts(int studentConflicts) { this.studentConflicts = studentConflicts; }
        
        public int getTeacherConflicts() { return teacherConflicts; }
        public void setTeacherConflicts(int teacherConflicts) { this.teacherConflicts = teacherConflicts; }
        
        public int getAvailableTeachers() { return availableTeachers; }
        public void setAvailableTeachers(int availableTeachers) { this.availableTeachers = availableTeachers; }
        
        public double getResourceSufficiency() { return resourceSufficiency; }
        public void setResourceSufficiency(double resourceSufficiency) { this.resourceSufficiency = resourceSufficiency; }
        
        public double getConflictScore() { return conflictScore; }
        public void setConflictScore(double conflictScore) { this.conflictScore = conflictScore; }
        
        public String getDutyInfo() { return dutyInfo; }
        public void setDutyInfo(String dutyInfo) { this.dutyInfo = dutyInfo; }
        
        public List<String> getConflictDetails() { return conflictDetails; }
        public void setConflictDetails(List<String> conflictDetails) { this.conflictDetails = conflictDetails; }
    }
    
    /**
     * 智能推荐结果
     */
    public static class SmartDateRecommendation {
        private List<String> recommendedDates;
        private List<DateAnalysis> dateAnalyses;
        private String recommendationReason;
        private String qualityAssessment;
        private double overallScore;
        
        // Getters and Setters
        public List<String> getRecommendedDates() { return recommendedDates; }
        public void setRecommendedDates(List<String> recommendedDates) { this.recommendedDates = recommendedDates; }
        
        public List<DateAnalysis> getDateAnalyses() { return dateAnalyses; }
        public void setDateAnalyses(List<DateAnalysis> dateAnalyses) { this.dateAnalyses = dateAnalyses; }
        
        public String getRecommendationReason() { return recommendationReason; }
        public void setRecommendationReason(String recommendationReason) { this.recommendationReason = recommendationReason; }
        
        public String getQualityAssessment() { return qualityAssessment; }
        public void setQualityAssessment(String qualityAssessment) { this.qualityAssessment = qualityAssessment; }
        
        public double getOverallScore() { return overallScore; }
        public void setOverallScore(double overallScore) { this.overallScore = overallScore; }
    }
}
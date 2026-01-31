package com.examiner.scheduler.service;

import com.examiner.scheduler.algorithm.SmartDateSelector;
import com.examiner.scheduler.domain.*;

import javax.enterprise.context.ApplicationScoped;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * 最优时间段推荐服务
 * 基于轮值冲突分析提供智能的考试时间段建议
 */
@ApplicationScoped
public class OptimalTimeSlotRecommendationService {
    
    private static final Logger LOGGER = Logger.getLogger(OptimalTimeSlotRecommendationService.class.getName());
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    private final SmartDateSelector smartDateSelector;
    
    public OptimalTimeSlotRecommendationService() {
        this.smartDateSelector = new SmartDateSelector();
    }
    
    /**
     * 生成最优时间段推荐
     * @param students 学员列表
     * @param teachers 考官列表
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @return 时间段推荐结果
     */
    public TimeSlotRecommendation generateOptimalTimeSlots(List<Student> students, List<Teacher> teachers,
                                                          String startDate, String endDate) {
        LOGGER.info("开始生成最优时间段推荐: 学员=" + students.size() + ", 考官=" + teachers.size());
        
        // 1. 使用智能日期选择器分析最优日期
        SmartDateSelector.SmartDateRecommendation dateRecommendation = 
            smartDateSelector.analyzeOptimalDates(students, teachers, startDate, endDate);
        
        // 2. 基于日期分析结果生成时间段推荐
        TimeSlotRecommendation recommendation = new TimeSlotRecommendation();
        
        // 3. 分析连续时间段
        List<TimeSlotGroup> timeSlotGroups = analyzeConsecutiveTimeSlots(dateRecommendation.getDateAnalyses());
        
        // 4. 为每个学员推荐最优的两天考试时间段
        List<StudentTimeSlotRecommendation> studentRecommendations = 
            generateStudentSpecificRecommendations(students, timeSlotGroups, dateRecommendation.getDateAnalyses());
        
        // 5. 生成整体推荐策略
        OverallStrategy overallStrategy = generateOverallStrategy(timeSlotGroups, students.size());
        
        recommendation.setDateRecommendation(dateRecommendation);
        recommendation.setTimeSlotGroups(timeSlotGroups);
        recommendation.setStudentRecommendations(studentRecommendations);
        recommendation.setOverallStrategy(overallStrategy);
        recommendation.setGeneratedAt(new Date());
        
        LOGGER.info("时间段推荐生成完成: 推荐组数=" + timeSlotGroups.size() + 
                   ", 学员推荐数=" + studentRecommendations.size());
        
        return recommendation;
    }
    
    /**
     * 分析连续时间段组合
     */
    private List<TimeSlotGroup> analyzeConsecutiveTimeSlots(List<SmartDateSelector.DateAnalysis> dateAnalyses) {
        List<TimeSlotGroup> groups = new ArrayList<>();
        
        // 按日期排序
        List<SmartDateSelector.DateAnalysis> sortedAnalyses = dateAnalyses.stream()
            .sorted(Comparator.comparing(SmartDateSelector.DateAnalysis::getDate))
            .collect(Collectors.toList());
        
        // 寻找连续的优质日期组合
        for (int i = 0; i < sortedAnalyses.size() - 1; i++) {
            SmartDateSelector.DateAnalysis current = sortedAnalyses.get(i);
            SmartDateSelector.DateAnalysis next = sortedAnalyses.get(i + 1);
            
            // 检查是否为连续工作日
            if (isConsecutiveWorkdays(current.getDate(), next.getDate())) {
                TimeSlotGroup group = new TimeSlotGroup();
                group.setStartDate(current.getDate());
                group.setEndDate(next.getDate());
                group.setDay1Analysis(current);
                group.setDay2Analysis(next);
                
                // 计算组合质量评分
                double combinedScore = calculateCombinedScore(current, next);
                group.setQualityScore(combinedScore);
                
                // 生成推荐理由
                String reason = generateGroupRecommendationReason(current, next, combinedScore);
                group.setRecommendationReason(reason);
                
                // 计算适合的学员数量
                int suitableStudentCount = calculateSuitableStudentCount(current, next);
                group.setSuitableStudentCount(suitableStudentCount);
                
                groups.add(group);
            }
        }
        
        // 按质量评分排序
        groups.sort(Comparator.comparingDouble(TimeSlotGroup::getQualityScore).reversed());
        
        return groups;
    }
    
    /**
     * 检查两个日期是否为连续工作日
     */
    private boolean isConsecutiveWorkdays(String date1, String date2) {
        try {
            LocalDate d1 = LocalDate.parse(date1, DATE_FORMATTER);
            LocalDate d2 = LocalDate.parse(date2, DATE_FORMATTER);
            
            // 检查是否相差1-3个自然日（考虑周末）
            long daysBetween = Math.abs(d2.toEpochDay() - d1.toEpochDay());
            return daysBetween >= 1 && daysBetween <= 3;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * 计算两天组合的质量评分
     */
    private double calculateCombinedScore(SmartDateSelector.DateAnalysis day1, SmartDateSelector.DateAnalysis day2) {
        // 综合考虑两天的冲突情况
        double day1Score = 1.0 - day1.getConflictScore();
        double day2Score = 1.0 - day2.getConflictScore();
        
        // 加权平均，第一天权重稍高（因为HC5约束）
        double combinedScore = day1Score * 0.6 + day2Score * 0.4;
        
        // 如果两天都很优秀，给予额外加分
        if (day1Score > 0.8 && day2Score > 0.8) {
            combinedScore += 0.1;
        }
        
        return Math.min(1.0, combinedScore);
    }
    
    /**
     * 生成时间段组合推荐理由
     */
    private String generateGroupRecommendationReason(SmartDateSelector.DateAnalysis day1, 
                                                   SmartDateSelector.DateAnalysis day2, 
                                                   double combinedScore) {
        StringBuilder reason = new StringBuilder();
        
        reason.append(String.format("两天组合质量评分: %.1f%%\n", combinedScore * 100));
        reason.append(String.format("第一天(%s): %s, 学员冲突%d人, 资源充足度%.1f%%\n", 
            day1.getDate(), day1.getDutyInfo(), day1.getStudentConflicts(), day1.getResourceSufficiency() * 100));
        reason.append(String.format("第二天(%s): %s, 学员冲突%d人, 资源充足度%.1f%%\n", 
            day2.getDate(), day2.getDutyInfo(), day2.getStudentConflicts(), day2.getResourceSufficiency() * 100));
        
        if (day1.getStudentConflicts() == 0 && day2.getStudentConflicts() == 0) {
            reason.append("✅ 两天均无学员轮值冲突，排班成功率极高\n");
        } else if (day1.getStudentConflicts() == 0) {
            reason.append("✅ 第一天无学员轮值冲突，满足HC5硬约束\n");
        }
        
        if (day1.getResourceSufficiency() > 0.8 && day2.getResourceSufficiency() > 0.8) {
            reason.append("✅ 两天考官资源充足，可满足所有约束需求\n");
        }
        
        return reason.toString();
    }
    
    /**
     * 计算适合的学员数量
     */
    private int calculateSuitableStudentCount(SmartDateSelector.DateAnalysis day1, SmartDateSelector.DateAnalysis day2) {
        // 基于资源充足度和冲突情况估算
        double avgResourceSufficiency = (day1.getResourceSufficiency() + day2.getResourceSufficiency()) / 2.0;
        int avgAvailableTeachers = (day1.getAvailableTeachers() + day2.getAvailableTeachers()) / 2;
        
        // 每个考官每天最多监考2次，每个学员需要2天考试
        int maxCapacity = avgAvailableTeachers / 3; // 保守估计，考虑约束限制
        
        return (int) (maxCapacity * avgResourceSufficiency);
    }
    
    /**
     * 为每个学员生成个性化时间段推荐
     */
    private List<StudentTimeSlotRecommendation> generateStudentSpecificRecommendations(
            List<Student> students, List<TimeSlotGroup> timeSlotGroups, 
            List<SmartDateSelector.DateAnalysis> dateAnalyses) {
        
        List<StudentTimeSlotRecommendation> recommendations = new ArrayList<>();
        
        for (Student student : students) {
            StudentTimeSlotRecommendation recommendation = new StudentTimeSlotRecommendation();
            recommendation.setStudentId(student.getId());
            recommendation.setStudentName(student.getName());
            recommendation.setStudentGroup(student.getGroup());
            recommendation.setStudentDepartment(student.getDepartment());
            
            // 为该学员找到最适合的时间段
            TimeSlotGroup bestGroup = findBestTimeSlotForStudent(student, timeSlotGroups, dateAnalyses);
            recommendation.setRecommendedTimeSlot(bestGroup);
            
            // 生成个性化推荐理由
            String personalizedReason = generatePersonalizedReason(student, bestGroup);
            recommendation.setRecommendationReason(personalizedReason);
            
            // 计算该学员在此时间段的成功概率
            double successProbability = calculateStudentSuccessProbability(student, bestGroup);
            recommendation.setSuccessProbability(successProbability);
            
            recommendations.add(recommendation);
        }
        
        return recommendations;
    }
    
    /**
     * 为学员找到最佳时间段
     */
    private TimeSlotGroup findBestTimeSlotForStudent(Student student, List<TimeSlotGroup> timeSlotGroups,
                                                   List<SmartDateSelector.DateAnalysis> dateAnalyses) {
        if (timeSlotGroups.isEmpty()) {
            // 如果没有连续时间段，创建一个基于最优单日的组合
            return createFallbackTimeSlot(student, dateAnalyses);
        }
        
        // 为该学员评估每个时间段的适合度
        TimeSlotGroup bestGroup = null;
        double bestScore = -1.0;
        
        for (TimeSlotGroup group : timeSlotGroups) {
            double score = evaluateTimeSlotForStudent(student, group);
            if (score > bestScore) {
                bestScore = score;
                bestGroup = group;
            }
        }
        
        return bestGroup != null ? bestGroup : timeSlotGroups.get(0);
    }
    
    /**
     * 评估时间段对特定学员的适合度
     */
    private double evaluateTimeSlotForStudent(Student student, TimeSlotGroup group) {
        double score = group.getQualityScore();
        
        // 检查学员在这两天是否有轮值冲突
        DutySchedule day1Duty = DutySchedule.forDate(group.getStartDate());
        DutySchedule day2Duty = DutySchedule.forDate(group.getEndDate());
        
        // 第一天轮值冲突严重扣分（HC5硬约束）
        if (day1Duty.isGroupOnDayShift(student.getGroup())) {
            score -= 0.8; // 严重扣分
        }
        
        // 第二天轮值冲突轻微扣分
        if (day2Duty.isGroupOnDayShift(student.getGroup())) {
            score -= 0.2; // 轻微扣分
        }
        
        return Math.max(0.0, score);
    }
    
    /**
     * 创建备用时间段（当没有理想连续时间段时）
     */
    private TimeSlotGroup createFallbackTimeSlot(Student student, List<SmartDateSelector.DateAnalysis> dateAnalyses) {
        // 选择冲突最少的两个日期
        List<SmartDateSelector.DateAnalysis> sortedByConflict = dateAnalyses.stream()
            .sorted(Comparator.comparingDouble(SmartDateSelector.DateAnalysis::getConflictScore))
            .limit(2)
            .collect(Collectors.toList());
        
        if (sortedByConflict.size() >= 2) {
            TimeSlotGroup fallback = new TimeSlotGroup();
            fallback.setStartDate(sortedByConflict.get(0).getDate());
            fallback.setEndDate(sortedByConflict.get(1).getDate());
            fallback.setDay1Analysis(sortedByConflict.get(0));
            fallback.setDay2Analysis(sortedByConflict.get(1));
            fallback.setQualityScore(calculateCombinedScore(sortedByConflict.get(0), sortedByConflict.get(1)));
            fallback.setRecommendationReason("基于最低冲突原则的备用方案");
            return fallback;
        }
        
        return null;
    }
    
    /**
     * 生成个性化推荐理由
     */
    private String generatePersonalizedReason(Student student, TimeSlotGroup timeSlot) {
        if (timeSlot == null) {
            return "暂无合适的时间段推荐";
        }
        
        StringBuilder reason = new StringBuilder();
        reason.append(String.format("为学员%s(%s,%s)推荐时间段:\n", 
            student.getName(), student.getDepartment(), student.getGroup()));
        
        DutySchedule day1Duty = DutySchedule.forDate(timeSlot.getStartDate());
        DutySchedule day2Duty = DutySchedule.forDate(timeSlot.getEndDate());
        
        if (!day1Duty.isGroupOnDayShift(student.getGroup())) {
            reason.append("✅ 第一天无轮值冲突，满足HC5硬约束\n");
        } else {
            reason.append("⚠️ 第一天存在轮值冲突，需要特别关注\n");
        }
        
        if (!day2Duty.isGroupOnDayShift(student.getGroup())) {
            reason.append("✅ 第二天无轮值冲突\n");
        }
        
        reason.append(String.format("时间段质量评分: %.1f%%", timeSlot.getQualityScore() * 100));
        
        return reason.toString();
    }
    
    /**
     * 计算学员在指定时间段的成功概率
     */
    private double calculateStudentSuccessProbability(Student student, TimeSlotGroup timeSlot) {
        if (timeSlot == null) {
            return 0.0;
        }
        
        double baseProbability = timeSlot.getQualityScore();
        
        // 根据学员轮值情况调整概率
        DutySchedule day1Duty = DutySchedule.forDate(timeSlot.getStartDate());
        if (day1Duty.isGroupOnDayShift(student.getGroup())) {
            baseProbability *= 0.3; // 第一天轮值冲突严重影响成功率
        }
        
        DutySchedule day2Duty = DutySchedule.forDate(timeSlot.getEndDate());
        if (day2Duty.isGroupOnDayShift(student.getGroup())) {
            baseProbability *= 0.8; // 第二天轮值冲突轻微影响
        }
        
        return Math.min(1.0, baseProbability);
    }
    
    /**
     * 生成整体推荐策略
     */
    private OverallStrategy generateOverallStrategy(List<TimeSlotGroup> timeSlotGroups, int totalStudents) {
        OverallStrategy strategy = new OverallStrategy();
        
        if (timeSlotGroups.isEmpty()) {
            strategy.setStrategyType("分散安排");
            strategy.setDescription("由于缺乏理想的连续时间段，建议采用分散安排策略");
            strategy.setExpectedSuccessRate(0.6);
            return strategy;
        }
        
        // 计算总体可容纳学员数
        int totalCapacity = timeSlotGroups.stream()
            .mapToInt(TimeSlotGroup::getSuitableStudentCount)
            .sum();
        
        if (totalCapacity >= totalStudents) {
            strategy.setStrategyType("集中优化安排");
            strategy.setDescription("推荐的时间段可满足所有学员需求，建议集中安排以获得最佳效果");
            strategy.setExpectedSuccessRate(0.9);
        } else {
            strategy.setStrategyType("混合安排");
            strategy.setDescription("部分学员安排在优质时间段，其余学员采用备用方案");
            strategy.setExpectedSuccessRate(0.75);
        }
        
        // 推荐具体的分配方案
        List<String> recommendations = new ArrayList<>();
        recommendations.add("优先安排轮值冲突较多的学员到最优时间段");
        recommendations.add("确保每个时间段的学员数量不超过考官资源限制");
        recommendations.add("预留10%的资源作为应急调整空间");
        
        strategy.setRecommendations(recommendations);
        
        return strategy;
    }
    
    // 内部类定义
    
    /**
     * 时间段推荐结果
     */
    public static class TimeSlotRecommendation {
        private SmartDateSelector.SmartDateRecommendation dateRecommendation;
        private List<TimeSlotGroup> timeSlotGroups;
        private List<StudentTimeSlotRecommendation> studentRecommendations;
        private OverallStrategy overallStrategy;
        private Date generatedAt;
        
        // Getters and Setters
        public SmartDateSelector.SmartDateRecommendation getDateRecommendation() { return dateRecommendation; }
        public void setDateRecommendation(SmartDateSelector.SmartDateRecommendation dateRecommendation) { this.dateRecommendation = dateRecommendation; }
        
        public List<TimeSlotGroup> getTimeSlotGroups() { return timeSlotGroups; }
        public void setTimeSlotGroups(List<TimeSlotGroup> timeSlotGroups) { this.timeSlotGroups = timeSlotGroups; }
        
        public List<StudentTimeSlotRecommendation> getStudentRecommendations() { return studentRecommendations; }
        public void setStudentRecommendations(List<StudentTimeSlotRecommendation> studentRecommendations) { this.studentRecommendations = studentRecommendations; }
        
        public OverallStrategy getOverallStrategy() { return overallStrategy; }
        public void setOverallStrategy(OverallStrategy overallStrategy) { this.overallStrategy = overallStrategy; }
        
        public Date getGeneratedAt() { return generatedAt; }
        public void setGeneratedAt(Date generatedAt) { this.generatedAt = generatedAt; }
    }
    
    /**
     * 时间段组合
     */
    public static class TimeSlotGroup {
        private String startDate;
        private String endDate;
        private SmartDateSelector.DateAnalysis day1Analysis;
        private SmartDateSelector.DateAnalysis day2Analysis;
        private double qualityScore;
        private String recommendationReason;
        private int suitableStudentCount;
        
        // Getters and Setters
        public String getStartDate() { return startDate; }
        public void setStartDate(String startDate) { this.startDate = startDate; }
        
        public String getEndDate() { return endDate; }
        public void setEndDate(String endDate) { this.endDate = endDate; }
        
        public SmartDateSelector.DateAnalysis getDay1Analysis() { return day1Analysis; }
        public void setDay1Analysis(SmartDateSelector.DateAnalysis day1Analysis) { this.day1Analysis = day1Analysis; }
        
        public SmartDateSelector.DateAnalysis getDay2Analysis() { return day2Analysis; }
        public void setDay2Analysis(SmartDateSelector.DateAnalysis day2Analysis) { this.day2Analysis = day2Analysis; }
        
        public double getQualityScore() { return qualityScore; }
        public void setQualityScore(double qualityScore) { this.qualityScore = qualityScore; }
        
        public String getRecommendationReason() { return recommendationReason; }
        public void setRecommendationReason(String recommendationReason) { this.recommendationReason = recommendationReason; }
        
        public int getSuitableStudentCount() { return suitableStudentCount; }
        public void setSuitableStudentCount(int suitableStudentCount) { this.suitableStudentCount = suitableStudentCount; }
    }
    
    /**
     * 学员个性化时间段推荐
     */
    public static class StudentTimeSlotRecommendation {
        private String studentId;
        private String studentName;
        private String studentGroup;
        private String studentDepartment;
        private TimeSlotGroup recommendedTimeSlot;
        private String recommendationReason;
        private double successProbability;
        
        // Getters and Setters
        public String getStudentId() { return studentId; }
        public void setStudentId(String studentId) { this.studentId = studentId; }
        
        public String getStudentName() { return studentName; }
        public void setStudentName(String studentName) { this.studentName = studentName; }
        
        public String getStudentGroup() { return studentGroup; }
        public void setStudentGroup(String studentGroup) { this.studentGroup = studentGroup; }
        
        public String getStudentDepartment() { return studentDepartment; }
        public void setStudentDepartment(String studentDepartment) { this.studentDepartment = studentDepartment; }
        
        public TimeSlotGroup getRecommendedTimeSlot() { return recommendedTimeSlot; }
        public void setRecommendedTimeSlot(TimeSlotGroup recommendedTimeSlot) { this.recommendedTimeSlot = recommendedTimeSlot; }
        
        public String getRecommendationReason() { return recommendationReason; }
        public void setRecommendationReason(String recommendationReason) { this.recommendationReason = recommendationReason; }
        
        public double getSuccessProbability() { return successProbability; }
        public void setSuccessProbability(double successProbability) { this.successProbability = successProbability; }
    }
    
    /**
     * 整体推荐策略
     */
    public static class OverallStrategy {
        private String strategyType;
        private String description;
        private double expectedSuccessRate;
        private List<String> recommendations;
        
        // Getters and Setters
        public String getStrategyType() { return strategyType; }
        public void setStrategyType(String strategyType) { this.strategyType = strategyType; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public double getExpectedSuccessRate() { return expectedSuccessRate; }
        public void setExpectedSuccessRate(double expectedSuccessRate) { this.expectedSuccessRate = expectedSuccessRate; }
        
        public List<String> getRecommendations() { return recommendations; }
        public void setRecommendations(List<String> recommendations) { this.recommendations = recommendations; }
    }
}
package com.examiner.scheduler.validation;

import com.examiner.scheduler.domain.Student;
import com.examiner.scheduler.domain.Teacher;
import com.examiner.scheduler.domain.OptimizedConstraintConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.DayOfWeek;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 排班数据验证器
 * 在开始排班前进行智能检查，预防无解情况
 * 
 * 🔧 v5.5.7: 放宽验证阈值，区分error和warning
 * - error: 绝对无法排班（考官数 < 学员数）
 * - warning: 可能困难但可尝试（考官数 < 学员数 × 1.5）
 * - ok: 考官充足（考官数 >= 学员数 × 1.5）
 * 
 * @version 5.5.7
 * @author AI Assistant
 */
public class ScheduleDataValidator {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(ScheduleDataValidator.class);
    
    /**
     * 验证结果
     */
    public static class ValidationResult {
        private boolean valid;
        private String severity; // "ok", "warning", "error"
        private List<String> messages;
        private List<String> suggestions;
        
        public ValidationResult() {
            this.valid = true;
            this.severity = "ok";
            this.messages = new ArrayList<>();
            this.suggestions = new ArrayList<>();
        }
        
        public void addWarning(String message, String suggestion) {
            this.messages.add("⚠️ " + message);
            if (suggestion != null) {
                this.suggestions.add("💡 " + suggestion);
            }
            if (!"error".equals(this.severity)) {
                this.severity = "warning";
            }
        }
        
        public void addError(String message, String suggestion) {
            this.valid = false;
            this.severity = "error";
            this.messages.add("❌ " + message);
            if (suggestion != null) {
                this.suggestions.add("🔧 " + suggestion);
            }
        }
        
        public void addInfo(String message) {
            this.messages.add("ℹ️ " + message);
        }
        
        // Getters and setters
        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
        public List<String> getMessages() { return messages; }
        public void setMessages(List<String> messages) { this.messages = messages; }
        public List<String> getSuggestions() { return suggestions; }
        public void setSuggestions(List<String> suggestions) { this.suggestions = suggestions; }
    }
    
    /**
     * 验证排班数据
     * 
     * @param students 学员列表
     * @param teachers 考官列表
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @param constraints 约束配置
     * @return 验证结果
     */
    public static ValidationResult validate(
            List<Student> students,
            List<Teacher> teachers,
            LocalDate startDate,
            LocalDate endDate,
            OptimizedConstraintConfiguration constraints) {
        
        ValidationResult result = new ValidationResult();
        
        LOGGER.info("🔍 [数据验证] 开始验证排班数据...");
        
        // 基础数据检查
        if (students == null || students.isEmpty()) {
            result.addError("学员列表为空", "请添加至少1名学员");
            return result;
        }
        
        if (teachers == null || teachers.isEmpty()) {
            result.addError("考官列表为空", "请添加至少3名考官");
            return result;
        }
        
        if (startDate == null || endDate == null) {
            result.addError("日期范围无效", "请设置有效的开始和结束日期");
            return result;
        }
        
        if (endDate.isBefore(startDate)) {
            result.addError("结束日期早于开始日期", "请调整日期范围");
            return result;
        }

        validateDepartmentFieldIntegrity(result, students, teachers);
        if (!result.isValid()) {
            return result;
        }
        
        int studentCount = students.size();
        int teacherCount = teachers.size();
        long dayCount = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
        
        result.addInfo(String.format("数据概览：%d名学员，%d名考官，%d天", 
            studentCount, teacherCount, dayCount));
        
        // 1. 检查考官数量是否充足（🔧 v5.5.7: 考虑时间因素）
        validateTeacherCount(result, studentCount, teacherCount, dayCount);
        
        // 2. 检查科室匹配情况
        validateDepartmentMatch(result, students, teachers, constraints);
        
        // 3. 检查日期范围
        validateDateRange(result, startDate, endDate, dayCount);
        
        // 4. 检查周末和行政班冲突
        validateAdministrativeTeachers(result, teachers, startDate, endDate);
        
        // 5. 检查考官不可用时间
        validateTeacherAvailability(result, teachers, startDate, endDate, studentCount);
        
        LOGGER.info("🔍 [数据验证] 验证完成 - 严重程度: {}, 消息数: {}", 
            result.getSeverity(), result.getMessages().size());
        
        return result;
    }

    private static boolean isInvalidDepartmentValue(String dept) {
        if (dept == null) return true;
        String s = dept.trim();
        if (s.isEmpty()) return true;
        return "-".equals(s) || "—".equals(s) || "未分组".equals(s) || "未知科室".equals(s);
    }

    private static String normalizeDepartment(String department) {
        if (department == null) return null;
        String normalized = department.trim();
        if (normalized.isEmpty()) return null;
        if (normalized.contains("区域一室") || normalized.contains("一室") || normalized.contains("1室") || normalized.contains("第1科室")) return "一";
        if (normalized.contains("区域二室") || normalized.contains("二室") || normalized.contains("2室") || normalized.contains("第2科室")) return "二";
        if (normalized.contains("区域三室") || normalized.contains("三室") || normalized.contains("3室") || normalized.contains("第3科室")) return "三";
        if (normalized.contains("区域四室") || normalized.contains("四室") || normalized.contains("4室") || normalized.contains("第4科室")) return "四";
        if (normalized.contains("区域五室") || normalized.contains("五室") || normalized.contains("5室") || normalized.contains("第5科室")) return "五";
        if (normalized.contains("区域六室") || normalized.contains("六室") || normalized.contains("6室") || normalized.contains("第6科室")) return "六";
        if (normalized.contains("区域七室") || normalized.contains("七室") || normalized.contains("7室") || normalized.contains("第7科室")) return "七";
        if (normalized.contains("区域八室") || normalized.contains("八室") || normalized.contains("8室") || normalized.contains("第8科室")) return "八";
        if (normalized.contains("区域九室") || normalized.contains("九室") || normalized.contains("9室") || normalized.contains("第9科室")) return "九";
        if (normalized.contains("区域十室") || normalized.contains("十室") || normalized.contains("10室") || normalized.contains("第10科室")) return "十";
        if (normalized.matches("^[一二三四五六七八九十]$")) return normalized;
        return normalized;
    }

    private static void validateDepartmentFieldIntegrity(
            ValidationResult result,
            List<Student> students,
            List<Teacher> teachers) {

        List<String> badTeachers = new ArrayList<>();
        for (Teacher t : teachers) {
            String dept = t != null ? t.getDepartment() : null;
            if (isInvalidDepartmentValue(dept)) {
                badTeachers.add(String.format("%s(id=%s, 科室=%s)",
                        t != null ? t.getName() : "NULL",
                        t != null ? t.getId() : "NULL",
                        dept == null ? "null" : dept));
            }
        }

        List<String> badStudents = new ArrayList<>();
        for (Student s : students) {
            String dept = s != null ? s.getDepartment() : null;
            if (isInvalidDepartmentValue(dept)) {
                badStudents.add(String.format("%s(id=%s, 科室=%s)",
                        s != null ? s.getName() : "NULL",
                        s != null ? s.getId() : "NULL",
                        dept == null ? "null" : dept));
            }
        }

        if (!badTeachers.isEmpty()) {
            String preview = badTeachers.stream().limit(10).collect(Collectors.joining(", "));
            result.addError(
                    "考官科室字段存在非法值（如 — / - / 未分组 / 空）: " + preview + (badTeachers.size() > 10 ? " ..." : ""),
                    "请检查上传的考官名单：确保每位考官的科室列填写为“区域X室/第X科室/一二三…”，不要使用—或空值"
            );
        }

        if (!badStudents.isEmpty()) {
            String preview = badStudents.stream().limit(10).collect(Collectors.joining(", "));
            result.addError(
                    "学员科室字段存在非法值（如 — / - / 未分组 / 空）: " + preview + (badStudents.size() > 10 ? " ..." : ""),
                    "请检查上传的学员名单：确保每位学员的科室列填写为“区域X室/第X科室/一二三…”，不要使用—或空值"
            );
        }
    }
    
    /**
     * 验证考官数量
     * 🔧 v5.5.7: 优化阈值逻辑，考虑时间因素
     * 
     * 核心公式：
     * 每天平均考试学员数 = 学员总数 × 2天 / 日期范围天数
     * 理论最少考官数 = 每天平均考试学员数 × 3（考官1+考官2+备份）
     * 
     * 三档阈值：
     * - 绝对最小：理论最少考官数
     * - 建议最小：理论最少考官数 × 1.5（考虑班次冲突、不可用时间）
     * - 理想数量：理论最少考官数 × 2（高质量排班）
     */
    private static void validateTeacherCount(ValidationResult result, int studentCount, int teacherCount, long dayCount) {
        // 🔧 v5.5.7: 考虑时间因素的动态阈值计算
        // 每个学员需要2天考试，计算每天平均有多少学员在考试
        double avgStudentsPerDay = (studentCount * 2.0) / dayCount;
        
        // 每天需要的理论最少考官数（考官1+考官2+备份 = 3倍）
        int theoreticalMinimum = (int) Math.ceil(avgStudentsPerDay * 3);
        
        // 但绝对不能少于学员总数（否则无法为每个学员分配考官）
        int absoluteMinimum = Math.max(theoreticalMinimum, studentCount);
        
        // 三档阈值（基于时间因素动态计算）
        int recommendedMinimum = (int) Math.ceil(theoreticalMinimum * 1.5);    // 1.5倍 - 建议最小
        int idealCount = (int) Math.ceil(theoreticalMinimum * 2);              // 2倍 - 理想数量
        
        // 记录计算过程（调试用）
        LOGGER.info("📊 [动态阈值] 学员={}, 天数={}, 每天平均{}名学员, 理论最少{}名考官, 建议{}名, 理想{}名",
            studentCount, dayCount, String.format("%.1f", avgStudentsPerDay), 
            theoreticalMinimum, recommendedMinimum, idealCount);
        
        if (teacherCount < absoluteMinimum) {
            // ❌ 致命错误：考官数少于绝对最小值
            result.addError(
                String.format("考官数量严重不足（当前%d名，至少需要%d名）", teacherCount, absoluteMinimum),
                String.format("请增加至少%d名考官。考虑到%d天内%d名学员每人2天考试，每天平均%.1f名学员，理论最少需要%d名考官", 
                    absoluteMinimum - teacherCount, dayCount, studentCount, avgStudentsPerDay, theoreticalMinimum)
            );
        } else if (teacherCount < recommendedMinimum) {
            // ⚠️ 警告：考官数少于建议值，可能困难但可尝试
            result.addWarning(
                String.format("考官数量略不足（当前%d名，建议至少%d名）", teacherCount, recommendedMinimum),
                String.format("考虑到%d天排班周期，每天平均%.1f名学员考试，建议增加%d名考官以应对班次冲突和不可用时间", 
                    dayCount, avgStudentsPerDay, recommendedMinimum - teacherCount)
            );
        } else if (teacherCount < idealCount) {
            // 💡 提示：考官数介于建议值和理想值之间，基本够用
            result.addInfo(
                String.format("考官数量基本满足（当前%d名，理想%d名）。在%d天内为%d名学员排班，每天平均%.1f名学员，当前考官配置基本够用", 
                    teacherCount, idealCount, dayCount, studentCount, avgStudentsPerDay)
            );
            LOGGER.info("✅ 考官数量基本满足: {} (理想: {}, 每天平均{}名学员)", 
                teacherCount, idealCount, String.format("%.1f", avgStudentsPerDay));
        } else {
            // ✅ 完美：考官数 >= 理想值
            result.addInfo(
                String.format("考官数量充足（%d名）。在%d天内为%d名学员排班（每天平均%.1f名学员），当前配置可以获得高质量排班", 
                    teacherCount, dayCount, studentCount, avgStudentsPerDay)
            );
            LOGGER.info("✅ 考官数量充足: {} (理想: {}, 每天平均{}名学员)", 
                teacherCount, idealCount, String.format("%.1f", avgStudentsPerDay));
        }
    }
    
    /**
     * 验证科室匹配
     * 🔧 v5.5.7: 优化科室级别的阈值逻辑
     * - 绝对最小：科室考官数 >= 科室学员数（至少1:1）
     * - 建议最小：科室考官数 >= 科室学员数 × 1.5
     * - 理想数量：科室考官数 >= 科室学员数 × 2
     */
    private static void validateDepartmentMatch(
            ValidationResult result, 
            List<Student> students, 
            List<Teacher> teachers,
            OptimizedConstraintConfiguration constraints) {
        
        // 统计各科室的学员和考官数量
        Map<String, Long> studentsByDept = students.stream()
            .filter(s -> s.getDepartment() != null)
            .collect(Collectors.groupingBy(s -> normalizeDepartment(s.getDepartment()), Collectors.counting()));
        
        Map<String, Long> teachersByDept = teachers.stream()
            .filter(t -> t.getDepartment() != null)
            .collect(Collectors.groupingBy(t -> normalizeDepartment(t.getDepartment()), Collectors.counting()));
        
        LOGGER.info("📊 [科室分布] 学员: {}, 考官: {}", studentsByDept, teachersByDept);
        
        // 检查每个科室
        for (Map.Entry<String, Long> entry : studentsByDept.entrySet()) {
            String dept = entry.getKey();
            long studentCountInDept = entry.getValue();
            long teacherCountInDept = teachersByDept.getOrDefault(dept, 0L);
            
            // 🔧 v5.5.7最终版：更宽松的科室验证逻辑
            // 只有0考官或极度不足（< 50%）才error，其他都warning
            long criticalMinimum = (long) Math.ceil(studentCountInDept * 0.5);   // 0.5:1 - 严重不足阈值
            long absoluteMinimum = studentCountInDept;                           // 1:1 - 基本需求
            long recommendedMinimum = (long) Math.ceil(studentCountInDept * 1.5); // 1.5:1 - 建议
            long idealTeacherCount = studentCountInDept * 2;                     // 2:1 - 理想
            
            if (teacherCountInDept == 0) {
                // ❌ 致命错误：该科室完全没有考官
                result.addError(
                    String.format("科室【%s】有%d名学员但没有考官", dept, studentCountInDept),
                    String.format("请为科室【%s】增加至少%d名考官，或临时禁用\"考官1同科室\"约束（HC2）", 
                        dept, absoluteMinimum)
                );
            } else if (teacherCountInDept < criticalMinimum) {
                // ❌ 严重不足：考官数少于学员数的50%（确实太少）
                result.addError(
                    String.format("科室【%s】考官严重不足（%d名学员，只有%d名考官，至少需要%d名）", 
                        dept, studentCountInDept, teacherCountInDept, criticalMinimum),
                    String.format("请为科室【%s】增加%d名考官，或考虑调整学员科室分配", 
                        dept, criticalMinimum - teacherCountInDept)
                );
            } else if (teacherCountInDept < absoluteMinimum) {
                // ⚠️ 警告：考官数少于学员数，但考虑到时间因素可以尝试
                result.addWarning(
                    String.format("科室【%s】考官略不足（%d名学员，%d名考官，建议至少%d名）", 
                        dept, studentCountInDept, teacherCountInDept, absoluteMinimum),
                    String.format("建议为科室【%s】增加%d名考官。当前配置下考官需要轮换监考，可能增加排班难度", 
                        dept, absoluteMinimum - teacherCountInDept)
                );
            } else if (teacherCountInDept < recommendedMinimum) {
                // ⚠️ 警告：考官数少于1.5倍，可以尝试但可能困难
                result.addWarning(
                    String.format("科室【%s】考官略不足（%d名学员，%d名考官，建议至少%d名）", 
                        dept, studentCountInDept, teacherCountInDept, recommendedMinimum),
                    String.format("建议为科室【%s】增加%d名考官以提高排班质量", 
                        dept, recommendedMinimum - teacherCountInDept)
                );
            } else if (teacherCountInDept < idealTeacherCount) {
                // 💡 提示：考官数介于1.5-2倍，基本够用
                LOGGER.info("✅ 科室【{}】考官基本满足: {} / {} 学员 (理想: {})", 
                    dept, teacherCountInDept, studentCountInDept, idealTeacherCount);
            } else {
                // ✅ 完美：考官数 >= 2倍
                LOGGER.info("✅ 科室【{}】考官充足: {} / {} 学员", 
                    dept, teacherCountInDept, studentCountInDept);
            }
        }
    }
    
    /**
     * 验证日期范围
     */
    private static void validateDateRange(ValidationResult result, LocalDate startDate, LocalDate endDate, long dayCount) {
        if (dayCount < 2) {
            result.addError(
                "日期范围过短（每个学员需要2天考试）",
                "请至少设置2天的日期范围"
            );
        } else if (dayCount > 60) {
            result.addWarning(
                String.format("日期范围过长（%d天），可能影响排班性能", dayCount),
                "建议将日期范围控制在30天以内"
            );
        } else {
            LOGGER.info("✅ 日期范围合理: {} 天", dayCount);
        }
    }
    
    /**
     * 验证行政班考官和周末冲突
     */
    private static void validateAdministrativeTeachers(
            ValidationResult result,
            List<Teacher> teachers,
            LocalDate startDate,
            LocalDate endDate) {
        
        // 统计行政班考官数量
        long adminTeacherCount = teachers.stream()
            .filter(t -> "行政班".equals(t.getGroup()))
            .count();
        
        if (adminTeacherCount == 0) {
            LOGGER.info("✅ 无行政班考官，无周末冲突问题");
            return;
        }
        
        // 统计周末天数
        long weekendDays = 0;
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            if (current.getDayOfWeek() == DayOfWeek.SATURDAY || 
                current.getDayOfWeek() == DayOfWeek.SUNDAY) {
                weekendDays++;
            }
            current = current.plusDays(1);
        }
        
        long totalDays = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
        double weekendRatio = (double) weekendDays / totalDays;
        
        LOGGER.info("📊 [行政班检查] 行政班考官: {}, 周末天数: {} / {} ({}%)", 
            adminTeacherCount, weekendDays, totalDays, (int)(weekendRatio * 100));
        
        if (weekendDays > 0 && adminTeacherCount > teachers.size() * 0.5) {
            result.addWarning(
                String.format("有%d名行政班考官（占%.0f%%）且日期范围包含%d个周末", 
                    adminTeacherCount, (double)adminTeacherCount / teachers.size() * 100, weekendDays),
                "行政班考官不能在周末工作。建议：1) 调整日期避开周末；2) 增加非行政班考官；3) 临时禁用行政班约束"
            );
        }
    }
    
    /**
     * 验证考官不可用时间
     */
    private static void validateTeacherAvailability(
            ValidationResult result,
            List<Teacher> teachers,
            LocalDate startDate,
            LocalDate endDate,
            int studentCount) {
        
        // 统计每天可用的考官数量
        Map<LocalDate, Long> availableTeachersPerDay = new HashMap<>();
        
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            final LocalDate date = current;
            
            long availableCount = teachers.stream()
                .filter(t -> {
                    // 检查是否在不可用期内
                    if (t.getUnavailablePeriods() != null) {
                        for (Teacher.UnavailablePeriod period : t.getUnavailablePeriods()) {
                            try {
                                LocalDate periodStart = LocalDate.parse(period.getStartDate());
                                LocalDate periodEnd = LocalDate.parse(period.getEndDate());
                                if (!date.isBefore(periodStart) && !date.isAfter(periodEnd)) {
                                    return false; // 不可用
                                }
                            } catch (Exception e) {
                                // 日期解析失败，跳过此期间
                            }
                        }
                    }
                    
                    // 检查行政班周末限制
                    if ("行政班".equals(t.getGroup())) {
                        if (date.getDayOfWeek() == DayOfWeek.SATURDAY || 
                            date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                            return false; // 行政班周末不可用
                        }
                    }
                    
                    return true; // 可用
                })
                .count();
            
            availableTeachersPerDay.put(date, availableCount);
            current = current.plusDays(1);
        }
        
        // 找出可用考官最少的日期
        Map.Entry<LocalDate, Long> minEntry = availableTeachersPerDay.entrySet().stream()
            .min(Map.Entry.comparingByValue())
            .orElse(null);
        
        if (minEntry != null) {
            long minAvailable = minEntry.getValue();
            LocalDate minDate = minEntry.getKey();
            
            // 每天理想至少需要 (学员数 / 2) 名考官可用
            // 因为不是所有学员都在同一天考试
            long idealMinimum = (long) Math.ceil(studentCount / 2.0);
            
            LOGGER.info("📊 [可用性检查] 最少可用考官: {} 在 {} (建议: {})", 
                minAvailable, minDate, idealMinimum);
            
            if (minAvailable < 3) {
                result.addError(
                    String.format("日期 %s 只有 %d 名考官可用（太少！）", minDate, minAvailable),
                    "请调整考官的不可用时间，或缩短日期范围"
                );
            } else if (minAvailable < idealMinimum) {
                result.addWarning(
                    String.format("日期 %s 只有 %d 名考官可用（建议至少 %d 名）", 
                        minDate, minAvailable, idealMinimum),
                    "部分日期可用考官较少，可能影响排班质量"
                );
            }
        }
    }
}


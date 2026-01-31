package com.examiner.scheduler.config;

import javax.enterprise.context.ApplicationScoped;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * 节假日配置类
 * 管理法定节假日和调休日期
 */
@ApplicationScoped
public class HolidayConfig {
    
    private final Set<LocalDate> holidays;
    private final Set<LocalDate> workdays; // 调休工作日
    
    public HolidayConfig() {
        this.holidays = new HashSet<>();
        this.workdays = new HashSet<>();
        initializeHolidays();
    }
    
    /**
     * 初始化2025-2026年法定节假日
     */
    private void initializeHolidays() {
        // 2025年法定节假日
        holidays.addAll(Arrays.asList(
            // 元旦
            LocalDate.of(2025, 1, 1),
            
            // 春节假期
            LocalDate.of(2025, 1, 28),  // 除夕
            LocalDate.of(2025, 1, 29),  // 初一
            LocalDate.of(2025, 1, 30),  // 初二
            LocalDate.of(2025, 1, 31),  // 初三
            LocalDate.of(2025, 2, 1),   // 初四
            LocalDate.of(2025, 2, 2),   // 初五
            LocalDate.of(2025, 2, 3),   // 初六
            
            // 清明节
            LocalDate.of(2025, 4, 5),
            LocalDate.of(2025, 4, 6),
            LocalDate.of(2025, 4, 7),
            
            // 劳动节
            LocalDate.of(2025, 5, 1),
            LocalDate.of(2025, 5, 2),
            LocalDate.of(2025, 5, 3),
            LocalDate.of(2025, 5, 4),
            LocalDate.of(2025, 5, 5),
            
            // 端午节（5月31日至6月2日）
            LocalDate.of(2025, 5, 31),
            LocalDate.of(2025, 6, 1),
            LocalDate.of(2025, 6, 2),
            
            // 中秋节与国庆节合并放假（10月1日至8日，共8天）
            LocalDate.of(2025, 10, 1),
            LocalDate.of(2025, 10, 2),
            LocalDate.of(2025, 10, 3),
            LocalDate.of(2025, 10, 4),
            LocalDate.of(2025, 10, 5),
            LocalDate.of(2025, 10, 6),
            LocalDate.of(2025, 10, 7),
            LocalDate.of(2025, 10, 8),
            
            // 2026年法定节假日
            // 元旦
            LocalDate.of(2026, 1, 1),
            
            // 春节假期（2026年2月17日春节）
            LocalDate.of(2026, 2, 16),  // 除夕
            LocalDate.of(2026, 2, 17),  // 初一
            LocalDate.of(2026, 2, 18),  // 初二
            LocalDate.of(2026, 2, 19),  // 初三
            LocalDate.of(2026, 2, 20),  // 初四
            LocalDate.of(2026, 2, 21),  // 初五
            LocalDate.of(2026, 2, 22),  // 初六
            
            // 清明节（2026年4月5日）
            LocalDate.of(2026, 4, 5),
            LocalDate.of(2026, 4, 6),
            LocalDate.of(2026, 4, 7),
            
            // 劳动节
            LocalDate.of(2026, 5, 1),
            LocalDate.of(2026, 5, 2),
            LocalDate.of(2026, 5, 3),
            LocalDate.of(2026, 5, 4),
            LocalDate.of(2026, 5, 5),
            
            // 端午节（2026年6月19日）
            LocalDate.of(2026, 6, 19),
            LocalDate.of(2026, 6, 20),
            LocalDate.of(2026, 6, 21),
            
            // 中秋节（2026年9月25日）
            LocalDate.of(2026, 9, 25),
            LocalDate.of(2026, 9, 26),
            LocalDate.of(2026, 9, 27),
            
            // 国庆节
            LocalDate.of(2026, 10, 1),
            LocalDate.of(2026, 10, 2),
            LocalDate.of(2026, 10, 3),
            LocalDate.of(2026, 10, 4),
            LocalDate.of(2026, 10, 5),
            LocalDate.of(2026, 10, 6),
            LocalDate.of(2026, 10, 7)
        ));
        
        // 2025年调休工作日（周末上班）
        workdays.addAll(Arrays.asList(
            LocalDate.of(2025, 1, 26),  // 春节调休
            LocalDate.of(2025, 2, 8),   // 春节调休
            LocalDate.of(2025, 4, 27),  // 劳动节调休
            LocalDate.of(2025, 9, 28),  // 国庆节调休
            LocalDate.of(2025, 10, 11), // 国庆节调休
            
            // 2026年调休工作日（预估，待官方通知确认）
            LocalDate.of(2026, 2, 15),  // 春节调休（预估）
            LocalDate.of(2026, 2, 23),  // 春节调休（预估）
            LocalDate.of(2026, 4, 26),  // 劳动节调休（预估）
            LocalDate.of(2026, 9, 27),  // 国庆节调休（预估）
            LocalDate.of(2026, 10, 10)  // 国庆节调休（预估）
        ));
    }
    
    /**
     * 判断指定日期是否为节假日
     * @param date 日期
     * @return true表示是节假日，false表示不是
     */
    public boolean isHoliday(LocalDate date) {
        return holidays.contains(date);
    }
    
    /**
     * 判断指定日期是否为调休工作日
     * @param date 日期
     * @return true表示是调休工作日，false表示不是
     */
    public boolean isWorkday(LocalDate date) {
        return workdays.contains(date);
    }
    
    /**
     * 判断指定日期是否为工作日
     * 考虑周末、节假日和调休
     * @param date 日期
     * @return true表示是工作日，false表示不是
     */
    public boolean isWorkingDay(LocalDate date) {
        // 如果是调休工作日，则为工作日
        if (isWorkday(date)) {
            return true;
        }
        
        // 如果是节假日，则不是工作日
        if (isHoliday(date)) {
            return false;
        }
        
        // 如果是周末，则不是工作日
        int dayOfWeek = date.getDayOfWeek().getValue();
        if (dayOfWeek == 6 || dayOfWeek == 7) { // 周六或周日
            return false;
        }
        
        // 其他情况为工作日
        return true;
    }
    
    /**
     * 获取所有节假日
     * @return 节假日集合
     */
    public Set<LocalDate> getHolidays() {
        return new HashSet<>(holidays);
    }
    
    /**
     * 获取所有调休工作日
     * @return 调休工作日集合
     */
    public Set<LocalDate> getWorkdays() {
        return new HashSet<>(workdays);
    }
    
    /**
     * 添加节假日
     * @param date 节假日日期
     */
    public void addHoliday(LocalDate date) {
        holidays.add(date);
    }
    
    /**
     * 添加调休工作日
     * @param date 调休工作日日期
     */
    public void addWorkday(LocalDate date) {
        workdays.add(date);
    }
}
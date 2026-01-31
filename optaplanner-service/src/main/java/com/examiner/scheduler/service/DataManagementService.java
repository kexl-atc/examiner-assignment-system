package com.examiner.scheduler.service;

import com.examiner.scheduler.entity.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.transaction.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * 数据管理服务类
 * 提供考官、学员、值班等数据的CRUD操作
 */
@ApplicationScoped
public class DataManagementService {
    
    private static final Logger LOGGER = Logger.getLogger(DataManagementService.class.getName());
    
    @Inject
    ObjectMapper objectMapper;
    
    // ==================== 考官管理 ====================
    
    @Transactional
    public Teacher saveTeacher(Teacher teacher) {
        if (teacher.id == null) {
            // 新增考官
            Teacher existing = Teacher.findByTeacherId(teacher.teacherId);
            if (existing != null) {
                throw new IllegalArgumentException("考官ID已存在: " + teacher.teacherId);
            }
            teacher.persist();
            LOGGER.info("新增考官: " + teacher.name + " (" + teacher.teacherId + ")");
        } else {
            // 更新考官
            teacher.preUpdate();
            teacher.persist();
            LOGGER.info("更新考官: " + teacher.name + " (" + teacher.teacherId + ")");
        }
        return teacher;
    }
    
    @Transactional
    public void deleteTeacher(Long teacherId) {
        Teacher teacher = Teacher.findById(teacherId);
        if (teacher != null) {
            teacher.isActive = false;
            teacher.preUpdate();
            teacher.persist();
            LOGGER.info("删除考官: " + teacher.name + " (" + teacher.teacherId + ")");
        }
    }
    
    public List<Teacher> getAllActiveTeachers() {
        return Teacher.findAllActive();
    }
    
    public List<Teacher> getTeachersByDepartment(String departmentCode) {
        return Teacher.findByDepartmentCode(departmentCode);
    }
    
    // ==================== 学员管理 ====================
    
    @Transactional
    public Student saveStudent(Student student) {
        if (student.id == null) {
            // 新增学员
            Student existing = Student.findByStudentId(student.studentId);
            if (existing != null) {
                throw new IllegalArgumentException("学员ID已存在: " + student.studentId);
            }
            student.persist();
            LOGGER.info("新增学员: " + student.name + " (" + student.studentId + ")");
        } else {
            // 更新学员
            student.preUpdate();
            student.persist();
            LOGGER.info("更新学员: " + student.name + " (" + student.studentId + ")");
        }
        return student;
    }
    
    @Transactional
    public void deleteStudent(Long studentId) {
        Student student = Student.findById(studentId);
        if (student != null) {
            student.isActive = false;
            student.preUpdate();
            student.persist();
            LOGGER.info("删除学员: " + student.name + " (" + student.studentId + ")");
        }
    }
    
    public List<Student> getAllActiveStudents() {
        return Student.findAllActive();
    }
    
    public List<Student> getStudentsByDepartment(String departmentCode) {
        return Student.findByDepartmentCode(departmentCode);
    }
    
    // ==================== 批量导入学员 ====================
    
    @Transactional
    public void importStudents(List<com.examiner.scheduler.domain.Student> domainStudents) {
        LOGGER.info("开始批量导入学员，数量: " + domainStudents.size());
        
        for (com.examiner.scheduler.domain.Student domainStudent : domainStudents) {
            try {
                // 查找或创建学员
                Student student = Student.findByStudentId(domainStudent.getId());
                if (student == null) {
                    student = new Student();
                    student.studentId = domainStudent.getId();
                }
                
                // 更新基本信息
                student.name = domainStudent.getName();
                
                // 🔧 修复：改进科室查找逻辑，增加详细的错误处理
                String departmentCode = getDepartmentCode(domainStudent.getDepartment());
                if (departmentCode == null) {
                    LOGGER.severe("学员 " + domainStudent.getName() + " 的科室映射失败: " + domainStudent.getDepartment() + 
                                 "，跳过该学员的导入");
                    continue;
                }
                
                Department dept = Department.findByCode(departmentCode);
                if (dept == null) {
                    LOGGER.severe("学员 " + domainStudent.getName() + " 的科室代码 " + departmentCode + 
                                 " 在数据库中不存在，跳过该学员的导入");
                    continue;
                }
                student.department = dept;
                
                LOGGER.info("✅ 学员 " + domainStudent.getName() + " 科室映射成功: " + 
                           domainStudent.getDepartment() + " -> " + departmentCode + " -> " + dept.name);
                
                // 查找班组
                Group group = Group.findByCode(getGroupCode(domainStudent.getGroup()));
                if (group == null) {
                    LOGGER.warning("未找到班组: " + domainStudent.getGroup());
                    continue;
                }
                student.group = group;
                
                // 设置推荐科室
                if (domainStudent.getRecommendedExaminer1Dept() != null) {
                    Department examiner1Dept = Department.findByCode(getDepartmentCode(domainStudent.getRecommendedExaminer1Dept()));
                    student.recommendedExaminer1Dept = examiner1Dept;
                }
                
                if (domainStudent.getRecommendedExaminer2Dept() != null) {
                    Department examiner2Dept = Department.findByCode(getDepartmentCode(domainStudent.getRecommendedExaminer2Dept()));
                    student.recommendedExaminer2Dept = examiner2Dept;
                }
                
                student.isActive = true;
                student.persist();
                
            } catch (Exception e) {
                LOGGER.severe("导入学员失败: " + domainStudent.getName() + ", 错误: " + e.getMessage());
            }
        }
        
        LOGGER.info("学员批量导入完成");
    }
    
    // ==================== 批量导入考官 ====================
    
    @Transactional
    public void importTeachers(List<com.examiner.scheduler.domain.Teacher> domainTeachers) {
        LOGGER.info("开始批量导入考官，数量: " + domainTeachers.size());
        
        for (com.examiner.scheduler.domain.Teacher domainTeacher : domainTeachers) {
            try {
                // 查找或创建考官
                Teacher teacher = Teacher.findByTeacherId(domainTeacher.getId());
                if (teacher == null) {
                    teacher = new Teacher();
                    teacher.teacherId = domainTeacher.getId();
                }
                
                // 更新基本信息
                teacher.name = domainTeacher.getName();
                teacher.workload = domainTeacher.getWorkload();
                teacher.consecutiveDays = domainTeacher.getConsecutiveDays();
                
                // 🔧 修复：考官科室映射逻辑，与学员保持一致
                String departmentCode = getDepartmentCode(domainTeacher.getDepartment());
                if (departmentCode == null) {
                    LOGGER.severe("考官 " + domainTeacher.getName() + " 的科室映射失败: " + domainTeacher.getDepartment() + 
                                 "，跳过该考官的导入");
                    continue;
                }
                
                Department dept = Department.findByCode(departmentCode);
                if (dept == null) {
                    LOGGER.severe("考官 " + domainTeacher.getName() + " 的科室代码 " + departmentCode + 
                                 " 在数据库中不存在，跳过该考官的导入");
                    continue;
                }
                teacher.department = dept;
                
                LOGGER.info("✅ 考官 " + domainTeacher.getName() + " 科室映射成功: " + 
                           domainTeacher.getDepartment() + " -> " + departmentCode + " -> " + dept.name);
                
                // 查找班组
                if (!"无".equals(domainTeacher.getGroup())) {
                    Group group = Group.findByCode(getGroupCode(domainTeacher.getGroup()));
                    teacher.group = group;
                }
                
                teacher.isActive = true;
                teacher.persist();
                
            } catch (Exception e) {
                LOGGER.severe("导入考官失败: " + domainTeacher.getName() + ", 错误: " + e.getMessage());
            }
        }
        
        LOGGER.info("考官批量导入完成");
    }
    
    // ==================== 值班管理 ====================
    
    @Transactional
    public void saveDutySchedules(List<com.examiner.scheduler.domain.DutySchedule> domainDuties) {
        LOGGER.info("开始保存值班数据，数量: " + domainDuties.size());
        
        for (com.examiner.scheduler.domain.DutySchedule domainDuty : domainDuties) {
            try {
                Teacher teacher = Teacher.findByTeacherId(domainDuty.getTeacherId());
                if (teacher == null) {
                    LOGGER.warning("未找到考官: " + domainDuty.getTeacherId());
                    continue;
                }
                
                LocalDate dutyDate = LocalDate.parse(domainDuty.getDate());
                DutySchedule existing = DutySchedule.findByTeacherAndDate(teacher, dutyDate);
                
                if (existing == null) {
                    DutySchedule dutySchedule = new DutySchedule();
                    dutySchedule.teacher = teacher;
                    dutySchedule.dutyDate = dutyDate;
                    dutySchedule.shiftType = DutySchedule.ShiftType.valueOf(domainDuty.getShift());
                    dutySchedule.persist();
                } else {
                    existing.shiftType = DutySchedule.ShiftType.valueOf(domainDuty.getShift());
                    existing.preUpdate();
                    existing.persist();
                }
                
            } catch (Exception e) {
                LOGGER.severe("保存值班数据失败: " + domainDuty.getTeacherId() + ", 错误: " + e.getMessage());
            }
        }
        
        LOGGER.info("值班数据保存完成");
    }
    
    // ==================== 转换为Domain对象 ====================
    
    public List<com.examiner.scheduler.domain.Teacher> getTeachersAsDomainObjects() {
        return Teacher.findAllActive().stream()
                .map(Teacher::toDomainObject)
                .collect(Collectors.toList());
    }
    
    public List<com.examiner.scheduler.domain.Student> getStudentsAsDomainObjects() {
        return Student.findAllActive().stream()
                .map(Student::toDomainObject)
                .collect(Collectors.toList());
    }
    
    public List<com.examiner.scheduler.domain.DutySchedule> getDutySchedulesAsDomainObjects(LocalDate startDate, LocalDate endDate) {
        return DutySchedule.find("dutyDate >= ?1 and dutyDate <= ?2", startDate, endDate)
                .list().stream()
                .map(ds -> ((DutySchedule) ds).toDomainObject())
                .collect(Collectors.toList());
    }
    
    // ==================== 辅助方法 ====================
    
    /**
     * 🔧 修复：支持多种科室名称格式的映射
     * 支持完整名称（区域一室）和简写（一）两种格式
     */
    private String getDepartmentCode(String departmentName) {
        if (departmentName == null || departmentName.trim().isEmpty()) {
            LOGGER.warning("科室名称为空，无法映射");
            return null;
        }
        
        // 标准化输入：去除空格
        String normalizedName = departmentName.trim();
        
        switch (normalizedName) {
            // 完整格式
            case "区域一室": return "DEPT_1";
            case "区域二室": return "DEPT_2";
            case "区域三室": return "DEPT_3";
            case "区域四室": return "DEPT_4";
            case "区域五室": return "DEPT_5";
            case "区域六室": return "DEPT_6";
            case "区域七室": return "DEPT_7";
            
            // 🔧 新增：支持简写格式
            case "一": return "DEPT_1";
            case "二": return "DEPT_2";
            case "三": return "DEPT_3";
            case "四": return "DEPT_4";
            case "五": return "DEPT_5";
            case "六": return "DEPT_6";
            case "七": return "DEPT_7";
            
            // 🔧 修复：不再提供错误的默认值，而是返回null并记录错误
            default: 
                LOGGER.severe("未知的科室名称: " + normalizedName + "，无法映射到科室代码");
                return null;
        }
    }
    
    private String getGroupCode(String groupName) {
        switch (groupName) {
            case "一组": return "GROUP_1";
            case "二组": return "GROUP_2";
            case "三组": return "GROUP_3";
            case "四组": return "GROUP_4";
            case "无": return "GROUP_NONE";
            default: return "GROUP_NONE";
        }
    }
}
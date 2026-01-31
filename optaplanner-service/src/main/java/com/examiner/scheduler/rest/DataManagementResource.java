package com.examiner.scheduler.rest;

import com.examiner.scheduler.entity.*;
import com.examiner.scheduler.service.DataManagementService;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.time.LocalDate;
import java.util.List;
import java.util.logging.Logger;

/**
 * 数据管理REST API
 * 提供考官、学员、值班等数据的CRUD操作接口
 */
@Path("/api/data")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DataManagementResource {
    
    private static final Logger LOGGER = Logger.getLogger(DataManagementResource.class.getName());
    
    @Inject
    DataManagementService dataManagementService;
    
    @Inject
    ObjectMapper objectMapper;
    
    // ==================== 考官管理API ====================
    
    @GET
    @Path("/teachers")
    public Response getAllTeachers() {
        try {
            List<Teacher> teachers = dataManagementService.getAllActiveTeachers();
            return Response.ok(teachers).build();
        } catch (Exception e) {
            LOGGER.severe("获取考官列表失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取考官列表失败: " + e.getMessage()).build();
        }
    }
    
    @GET
    @Path("/teachers/department/{departmentCode}")
    public Response getTeachersByDepartment(@PathParam("departmentCode") String departmentCode) {
        try {
            List<Teacher> teachers = dataManagementService.getTeachersByDepartment(departmentCode);
            return Response.ok(teachers).build();
        } catch (Exception e) {
            LOGGER.severe("获取科室考官失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取科室考官失败: " + e.getMessage()).build();
        }
    }
    
    @POST
    @Path("/teachers")
    public Response saveTeacher(Teacher teacher) {
        try {
            Teacher savedTeacher = dataManagementService.saveTeacher(teacher);
            return Response.ok(savedTeacher).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(e.getMessage()).build();
        } catch (Exception e) {
            LOGGER.severe("保存考官失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("保存考官失败: " + e.getMessage()).build();
        }
    }
    
    @PUT
    @Path("/teachers/{id}")
    public Response updateTeacher(@PathParam("id") Long id, Teacher teacher) {
        try {
            teacher.id = id;
            Teacher updatedTeacher = dataManagementService.saveTeacher(teacher);
            return Response.ok(updatedTeacher).build();
        } catch (Exception e) {
            LOGGER.severe("更新考官失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("更新考官失败: " + e.getMessage()).build();
        }
    }
    
    @DELETE
    @Path("/teachers/{id}")
    public Response deleteTeacher(@PathParam("id") Long id) {
        try {
            dataManagementService.deleteTeacher(id);
            return Response.ok().build();
        } catch (Exception e) {
            LOGGER.severe("删除考官失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("删除考官失败: " + e.getMessage()).build();
        }
    }
    
    // ==================== 学员管理API ====================
    
    @GET
    @Path("/students")
    public Response getAllStudents() {
        try {
            List<Student> students = dataManagementService.getAllActiveStudents();
            return Response.ok(students).build();
        } catch (Exception e) {
            LOGGER.severe("获取学员列表失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取学员列表失败: " + e.getMessage()).build();
        }
    }
    
    @GET
    @Path("/students/department/{departmentCode}")
    public Response getStudentsByDepartment(@PathParam("departmentCode") String departmentCode) {
        try {
            List<Student> students = dataManagementService.getStudentsByDepartment(departmentCode);
            return Response.ok(students).build();
        } catch (Exception e) {
            LOGGER.severe("获取科室学员失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取科室学员失败: " + e.getMessage()).build();
        }
    }
    
    @POST
    @Path("/students")
    public Response saveStudent(Student student) {
        try {
            Student savedStudent = dataManagementService.saveStudent(student);
            return Response.ok(savedStudent).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(e.getMessage()).build();
        } catch (Exception e) {
            LOGGER.severe("保存学员失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("保存学员失败: " + e.getMessage()).build();
        }
    }
    
    @PUT
    @Path("/students/{id}")
    public Response updateStudent(@PathParam("id") Long id, Student student) {
        try {
            student.id = id;
            Student updatedStudent = dataManagementService.saveStudent(student);
            return Response.ok(updatedStudent).build();
        } catch (Exception e) {
            LOGGER.severe("更新学员失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("更新学员失败: " + e.getMessage()).build();
        }
    }
    
    @DELETE
    @Path("/students/{id}")
    public Response deleteStudent(@PathParam("id") Long id) {
        try {
            dataManagementService.deleteStudent(id);
            return Response.ok().build();
        } catch (Exception e) {
            LOGGER.severe("删除学员失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("删除学员失败: " + e.getMessage()).build();
        }
    }
    
    // ==================== 批量导入API ====================
    
    @POST
    @Path("/students/import")
    public Response importStudents(List<com.examiner.scheduler.domain.Student> students) {
        try {
            dataManagementService.importStudents(students);
            return Response.ok("学员批量导入成功，数量: " + students.size()).build();
        } catch (Exception e) {
            LOGGER.severe("批量导入学员失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("批量导入学员失败: " + e.getMessage()).build();
        }
    }
    
    @POST
    @Path("/teachers/import")
    public Response importTeachers(List<com.examiner.scheduler.domain.Teacher> teachers) {
        try {
            dataManagementService.importTeachers(teachers);
            return Response.ok("考官批量导入成功，数量: " + teachers.size()).build();
        } catch (Exception e) {
            LOGGER.severe("批量导入考官失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("批量导入考官失败: " + e.getMessage()).build();
        }
    }
    
    @POST
    @Path("/duties/import")
    public Response importDutySchedules(List<com.examiner.scheduler.domain.DutySchedule> duties) {
        try {
            dataManagementService.saveDutySchedules(duties);
            return Response.ok("值班数据导入成功，数量: " + duties.size()).build();
        } catch (Exception e) {
            LOGGER.severe("导入值班数据失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("导入值班数据失败: " + e.getMessage()).build();
        }
    }
    
    // ==================== 基础数据API ====================
    
    @GET
    @Path("/departments")
    public Response getAllDepartments() {
        try {
            List<Department> departments = Department.listAll();
            return Response.ok(departments).build();
        } catch (Exception e) {
            LOGGER.severe("获取科室列表失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取科室列表失败: " + e.getMessage()).build();
        }
    }
    
    @GET
    @Path("/groups")
    public Response getAllGroups() {
        try {
            List<Group> groups = Group.listAll();
            return Response.ok(groups).build();
        } catch (Exception e) {
            LOGGER.severe("获取班组列表失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取班组列表失败: " + e.getMessage()).build();
        }
    }
    
    @GET
    @Path("/timeslots")
    public Response getAllTimeSlots() {
        try {
            List<TimeSlot> timeSlots = TimeSlot.listAll();
            return Response.ok(timeSlots).build();
        } catch (Exception e) {
            LOGGER.severe("获取时间段列表失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取时间段列表失败: " + e.getMessage()).build();
        }
    }
    
    // ==================== 值班查询API ====================
    
    @GET
    @Path("/duties")
    public Response getDutySchedules(@QueryParam("startDate") String startDate, 
                                   @QueryParam("endDate") String endDate) {
        try {
            LocalDate start = LocalDate.parse(startDate);
            LocalDate end = LocalDate.parse(endDate);
            List<DutySchedule> duties = DutySchedule.find("dutyDate >= ?1 and dutyDate <= ?2", start, end).list();
            return Response.ok(duties).build();
        } catch (Exception e) {
            LOGGER.severe("获取值班数据失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取值班数据失败: " + e.getMessage()).build();
        }
    }
    
    // ==================== 考试分配API ====================
    
    @GET
    @Path("/assignments")
    public Response getAllAssignments() {
        try {
            List<ExamAssignment> assignments = ExamAssignment.listAll();
            return Response.ok(assignments).build();
        } catch (Exception e) {
            LOGGER.severe("获取考试分配失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取考试分配失败: " + e.getMessage()).build();
        }
    }
    
    @GET
    @Path("/assignments/student/{studentId}")
    public Response getAssignmentsByStudent(@PathParam("studentId") Long studentId) {
        try {
            Student student = Student.findById(studentId);
            if (student == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("学员不存在").build();
            }
            List<ExamAssignment> assignments = ExamAssignment.findByStudent(student);
            return Response.ok(assignments).build();
        } catch (Exception e) {
            LOGGER.severe("获取学员考试分配失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取学员考试分配失败: " + e.getMessage()).build();
        }
    }
    
    // ==================== 统计API ====================
    
    @GET
    @Path("/statistics")
    public Response getStatistics() {
        try {
            long totalTeachers = Teacher.count("isActive = true");
            long totalStudents = Student.count("isActive = true");
            long totalAssignments = ExamAssignment.count();
            long completedAssignments = ExamAssignment.count("status = ?1", ExamAssignment.AssignmentStatus.COMPLETED);
            
            java.util.Map<String, Object> statistics = new java.util.HashMap<>();
            statistics.put("totalTeachers", totalTeachers);
            statistics.put("totalStudents", totalStudents);
            statistics.put("totalAssignments", totalAssignments);
            statistics.put("completedAssignments", completedAssignments);
            statistics.put("completionRate", totalAssignments > 0 ? (double) completedAssignments / totalAssignments * 100 : 0);
            
            return Response.ok(statistics).build();
        } catch (Exception e) {
            LOGGER.severe("获取统计数据失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("获取统计数据失败: " + e.getMessage()).build();
        }
    }
    
    // ==================== 数据转换API ====================
    
    @GET
    @Path("/export/teachers")
    public Response exportTeachersAsDomainObjects() {
        try {
            List<com.examiner.scheduler.domain.Teacher> teachers = dataManagementService.getTeachersAsDomainObjects();
            return Response.ok(teachers).build();
        } catch (Exception e) {
            LOGGER.severe("导出考官数据失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("导出考官数据失败: " + e.getMessage()).build();
        }
    }
    
    @GET
    @Path("/export/students")
    public Response exportStudentsAsDomainObjects() {
        try {
            List<com.examiner.scheduler.domain.Student> students = dataManagementService.getStudentsAsDomainObjects();
            return Response.ok(students).build();
        } catch (Exception e) {
            LOGGER.severe("导出学员数据失败: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("导出学员数据失败: " + e.getMessage()).build();
        }
    }
}
package com.examiner.scheduler.rest;

import com.examiner.dto.InstructorAssignmentRequestDto;
import com.examiner.dto.InstructorAssignmentResultDto;
import com.examiner.scheduler.service.InstructorAssignmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

/**
 * 考官分配REST资源
 * 已迁移到纯Java实现，不再依赖Python脚本
 */
@Path("/api/instructor-assignment")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class InstructorAssignmentResource {

    private static final Logger LOGGER = LoggerFactory.getLogger(InstructorAssignmentResource.class);
    
    @Inject
    InstructorAssignmentService assignmentService;

    @POST
    @Path("/run")
    public Response run(InstructorAssignmentRequestDto request) {
        LOGGER.info("InstructorAssignmentResource.run() called with request: action={}", request.action);
        try {
            // 使用Java服务处理请求，不再调用Python脚本
            InstructorAssignmentResultDto result = assignmentService.processRequest(request);
            
            if (!result.success && result.error != null) {
                LOGGER.error("Assignment service returned error: {}", result.error);
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(result)
                        .build();
            }
            
            LOGGER.info("InstructorAssignmentResource.run() completed successfully");
            return Response.ok(result).build();
            
        } catch (Exception e) {
            LOGGER.error("Error processing instructor assignment request", e);
            InstructorAssignmentResultDto errorResult = new InstructorAssignmentResultDto();
            errorResult.success = false;
            errorResult.error = e.getMessage();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(errorResult)
                    .build();
        }
    }
}

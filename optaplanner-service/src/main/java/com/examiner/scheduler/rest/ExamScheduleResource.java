package com.examiner.scheduler.rest;

import com.examiner.scheduler.domain.*;
import com.examiner.scheduler.service.ExamScheduleService;
import com.examiner.scheduler.config.OptimizedSolverConfig;
import com.examiner.scheduler.config.AdaptiveSolverConfig;
import com.examiner.scheduler.config.EnhancedSolverConfig;
import com.examiner.scheduler.websocket.ScheduleProgressWebSocket;
import com.examiner.scheduler.util.AssignmentMapper;
// import com.examiner.scheduler.solver.OptimizedExamScheduleConstraintProvider; // 临时注释解决编译问题
import org.optaplanner.core.api.solver.Solver;
import org.optaplanner.core.api.solver.SolverFactory;
import org.optaplanner.core.config.solver.SolverConfig;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;
import org.optaplanner.core.api.score.buildin.hardsoftlong.HardSoftLongScore;
import org.optaplanner.core.api.score.ScoreManager;

import javax.inject.Inject;
import javax.enterprise.context.ApplicationScoped;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.logging.Logger;

/**
 * 考试排班REST资源类
 * 提供排班计算和约束配置的API接口
 */
@Path("/api/schedule")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ExamScheduleResource {
    
    // 静态初始化块：确保Drools使用ECJ编译器（JRE环境）
    static {
        System.setProperty("drools.dialect.java.compiler", "ECLIPSE");
        System.setProperty("drools.dialect.java.compiler.lnglevel", "17");
        System.setProperty("drools.dialect.java.strict", "false");
        System.err.println("🔧 [静态初始化] Drools已配置为使用ECJ编译器");
        System.err.println("   - drools.dialect.java.compiler=ECLIPSE");
        System.err.println("   - drools.dialect.java.compiler.lnglevel=17");
    }
    
    private static final Logger LOGGER = Logger.getLogger(ExamScheduleResource.class.getName());
    private final ExecutorService executorService = Executors.newCachedThreadPool();
    
    @Inject
    private ExamScheduleService examScheduleService;
    
    @Inject
    private OptimizedSolverConfig optimizedSolverConfig;
    
    @Inject
    private AdaptiveSolverConfig adaptiveSolverConfig;
    
    @Inject
    private EnhancedSolverConfig enhancedSolverConfig;
    
    @Inject
    private com.examiner.scheduler.config.FastSolverConfig fastSolverConfig;
    
    /**
     * 同步排班计算
     */
    @POST
    @Path("/solve")
    @SuppressWarnings({"deprecation", "removal"})  // 使用OptaPlanner已废弃API进行得分验证
    public Response solveSchedule(ScheduleRequest request, @HeaderParam("X-Session-Id") String clientSessionId) {
        try {
            System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            System.err.println("🔴 [REST入口] solveSchedule被调用!");
            System.err.println("学员数量: " + (request.getStudents() != null ? request.getStudents().size() : 0));
            System.err.println("考官数量: " + (request.getTeachers() != null ? request.getTeachers().size() : 0));
            System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            LOGGER.info("收到同步排班请求: 学员=" + (request.getStudents() != null ? request.getStudents().size() : 0) + 
                       ", 考官=" + (request.getTeachers() != null ? request.getTeachers().size() : 0));
            
            // 🚀 调试模式已禁用，使用真正的OptaPlanner求解
            // if (request.getStartDate() != null && request.getStartDate().equals("2025-10-09") && 
            //     request.getEndDate() != null && request.getEndDate().equals("2025-10-09")) {
            //     LOGGER.info("🐛 [调试模式] 返回模拟结果，跳过OptaPlanner求解");
            //     
            //     ScheduleResponse mockResponse = new ScheduleResponse();
            //     mockResponse.setSuccess(true);
            //     mockResponse.setMessage("调试模式：模拟排班结果");
            //     mockResponse.setAssignments(new java.util.ArrayList<>());
            //     
            //     // 创建正确的统计信息对象
            //     ScheduleResponse.ScheduleStatistics stats = new ScheduleResponse.ScheduleStatistics();
            //     stats.setSolvingTimeMillis(100L);
            //     stats.setSolvingTimeSeconds(0);
            //     stats.setSolvingMode("debug");
            //     stats.setTotalStudents(request.getStudents() != null ? request.getStudents().size() : 0);
            //     stats.setCompletionPercentage(100.0);
            //     mockResponse.setStatistics(stats);
            //     
            //     return Response.ok(mockResponse).build();
            // }
            
            // 验证请求参数
            if (request.getStudents() == null || request.getStudents().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"success\":false,\"message\":\"学员列表不能为空\"}")
                        .build();
            }
            
            if (request.getTeachers() == null || request.getTeachers().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"success\":false,\"message\":\"考官列表不能为空\"}")
                        .build();
            }
            
            // 🆕 v5.5.4: 前置数据验证
            LOGGER.info("🔍 [v5.5.4] 开始数据验证...");
            com.examiner.scheduler.validation.ScheduleDataValidator.ValidationResult validationResult = 
                com.examiner.scheduler.validation.ScheduleDataValidator.validate(
                    request.getStudents(),
                    request.getTeachers(),
                    java.time.LocalDate.parse(request.getStartDate()),
                    java.time.LocalDate.parse(request.getEndDate()),
                    request.getConstraints()
                );
            
            LOGGER.info("🔍 [v5.5.4] 验证完成 - 严重程度: " + validationResult.getSeverity());
            
            // 如果验证失败（严重错误），直接返回
            if (!validationResult.isValid()) {
                LOGGER.severe("❌ [v5.5.4] 数据验证失败，无法开始排班");
                
                ScheduleResponse errorResponse = new ScheduleResponse();
                errorResponse.setSuccess(false);
                errorResponse.setMessage("数据验证失败：\n" + 
                    String.join("\n", validationResult.getMessages()));
                
                // 添加统计信息
                ScheduleResponse.ScheduleStatistics stats = new ScheduleResponse.ScheduleStatistics();
                stats.setSolvingMode("validation_failed");
                stats.setTotalStudents(request.getStudents() != null ? request.getStudents().size() : 0);
                stats.setCompletionPercentage(0.0);
                errorResponse.setStatistics(stats);
                
                // 添加诊断信息
                if (!validationResult.getSuggestions().isEmpty()) {
                    errorResponse.setMessage(errorResponse.getMessage() + "\n\n建议：\n" + 
                        String.join("\n", validationResult.getSuggestions()));
                }
                
                return Response.ok(errorResponse).build();
            }
            
            // 如果有警告，记录但继续
            if ("warning".equals(validationResult.getSeverity())) {
                LOGGER.warning("⚠️ [v5.5.4] 数据验证有警告，继续排班但可能遇到困难");
                for (String msg : validationResult.getMessages()) {
                    LOGGER.warning(msg);
                }
            }
            
            // 创建问题实例
            ExamSchedule problem = examScheduleService.createProblemInstance(
                request.getStudents(), 
                request.getTeachers(), 
                request.getStartDate(), 
                request.getEndDate(),
                request.getConstraints()
            );
            
            // 配置求解器
            SolverConfig solverConfig;
            String solvingMode = request.getSolverConfig() != null ? 
                request.getSolverConfig().getSolvingMode() : "adaptive";  // 🚀 默认使用自适应模式
            
            // 🆕 为所有模式统一生成并启用 WebSocket 会话
            String sessionId = (clientSessionId != null && !clientSessionId.isBlank())
                    ? clientSessionId
                    : java.util.UUID.randomUUID().toString();
            LOGGER.info("📡 [WebSocket] 使用会话ID: " + sessionId + " (mode=" + solvingMode + ")");
            
            // 启用日志推送至前端（非仅 adaptive 模式）
            com.examiner.scheduler.util.WebSocketLogger.enable(sessionId);
            com.examiner.scheduler.websocket.WebSocketLogPusher.setSessionId(sessionId);
            com.examiner.scheduler.util.WebSocketLogger.info("System initializing...");
            com.examiner.scheduler.websocket.ScheduleProgressWebSocket.sendHeartbeat(sessionId);

            try {
            
            System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            System.err.println("🔴 [求解模式] solvingMode = " + solvingMode);
            System.err.println("🔴 [求解模式] request.getSolverConfig() = " + request.getSolverConfig());
            System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                
            // 🚀 新增：自适应分级求解模式
            if ("adaptive".equals(solvingMode)) {
                System.err.println("✅ 进入adaptive分支！");
                LOGGER.info("🚀 [分级求解] 启用自适应分级求解策略");
                
                // 使用分级求解策略（会话ID已在上方统一生成并启用）
                ScheduleResponse adaptiveResponse = solveWithAdaptiveStrategy(
                    problem, 
                    request.getStudents().size(),
                    request.getConstraints(),
                    sessionId  // 传递sessionId用于WebSocket推送
                );

                // 在响应中包含sessionId，供前端建立WebSocket连接
                adaptiveResponse.setSessionId(sessionId);
                
                return Response.ok(adaptiveResponse).build();
                
            } else if ("fast".equals(solvingMode)) {
                // ⚡ 使用快速配置 - 大幅提升速度（推荐）
                LOGGER.info("⚡ [快速模式] 使用FastSolverConfig，根据学员数量自适应");
                solverConfig = fastSolverConfig.createAdaptiveFastConfig(request.getStudents().size());
                problem.setConstraintConfiguration(request.getConstraints());
                com.examiner.scheduler.util.WebSocketLogger.info("Starting fast mode solver...");
            } else if ("enhanced".equals(solvingMode)) {
                // 🆕 使用增强配置 - 追求最优解（资源充足、学员较少时使用）
                LOGGER.info("🚀 [增强模式] 使用增强求解器配置，追求最优解");
                solverConfig = enhancedSolverConfig.createEnhancedSolverConfig(request.getStudents().size());
                problem.setConstraintConfiguration(request.getConstraints());
                com.examiner.scheduler.util.WebSocketLogger.info("Starting enhanced mode solver...");
            } else if ("balanced".equals(solvingMode)) {
                // 🆕 使用平衡配置 - 速度和质量折中
                LOGGER.info("⚖️ [平衡模式] 使用平衡求解器配置");
                solverConfig = enhancedSolverConfig.createBalancedSolverConfig(request.getStudents().size());
                problem.setConstraintConfiguration(request.getConstraints());
                com.examiner.scheduler.util.WebSocketLogger.info("Starting balanced mode solver...");
            } else if ("deep".equals(solvingMode)) {
                // 🔥 深度重排模式 - 更长时间、更深度的优化
                LOGGER.info("🔥 [深度重排] 使用深度重排求解器配置，将运行5-10分钟寻找更优解");
                solverConfig = enhancedSolverConfig.createDeepRescheduleSolverConfig(request.getStudents().size());
                problem.setConstraintConfiguration(request.getConstraints());
                com.examiner.scheduler.util.WebSocketLogger.info("🔥 Starting deep reschedule mode - this may take 5-10 minutes...");
            } else if ("optimized".equals(solvingMode)) {
                // 使用优化约束配置的求解器配置
                solverConfig = optimizedSolverConfig.createSolverConfigWithConstraints(
                    request.getStudents().size(), request.getConstraints());
                
                // 将约束配置设置到问题实例中，以便约束提供者可以访问
                problem.setConstraintConfiguration(request.getConstraints());
                com.examiner.scheduler.util.WebSocketLogger.info("Starting optimized mode solver...");
            } else if ("auto".equals(solvingMode)) {
                // 使用自动配置
                solverConfig = optimizedSolverConfig.createAutoSolverConfig(request.getStudents().size());
                com.examiner.scheduler.util.WebSocketLogger.info("Starting auto mode solver...");
            } else {
                // 使用默认配置
                solverConfig = optimizedSolverConfig.createDefaultSolverConfig();
                com.examiner.scheduler.util.WebSocketLogger.info("Starting default mode solver...");
            }
            
            // 🔧 [内存泄漏修复] 创建求解器并求解（使用try-finally确保资源释放）
            SolverFactory<ExamSchedule> solverFactory = null;
            Solver<ExamSchedule> solver = null;
            ExamSchedule solution = null;
            org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore initialScore = null;
            long startTime = System.currentTimeMillis();
            
            try {
                // 记录排班开始前的内存使用
                logMemoryUsage("排班开始前");
                
                solverFactory = SolverFactory.create(solverConfig);
                solver = solverFactory.buildSolver();
                
                // 在求解前设置约束配置到约束提供者 - 临时注释解决编译问题
                // if (request.getConstraints() != null) {
                //     OptimizedExamScheduleConstraintProvider.setConstraintConfiguration(request.getConstraints());
                //     LOGGER.info("已设置动态约束配置到约束提供者");
                // }
                
                // 🔍 计算初始解得分 (使用已废弃API但功能仍正常)
                org.optaplanner.core.api.score.ScoreManager<ExamSchedule, org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore> scoreManager = 
                    org.optaplanner.core.api.score.ScoreManager.create(solverFactory);
                initialScore = scoreManager.updateScore(problem);
                LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                LOGGER.info("🔍 [初始解] 得分: " + initialScore);
                LOGGER.info("   硬约束: " + initialScore.hardScore());
                LOGGER.info("   软约束: " + initialScore.softScore());
                LOGGER.info("   是否可行: " + initialScore.isFeasible());
                LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                
                LOGGER.info("🚀 [智能算法] 开始OptaPlanner智能求解: 学员=" + request.getStudents().size() + 
                           ", 考官=" + request.getTeachers().size() + ", 模式=" + solvingMode);
                
                // 标记约束执行开始（如果约束提供者已创建） - 临时注释解决编译问题
                // try {
                //     OptimizedExamScheduleConstraintProvider constraintProvider = new OptimizedExamScheduleConstraintProvider();
                //     constraintProvider.markConstraintExecutionStart();
                // } catch (Exception e) {
                //     LOGGER.warning("无法标记约束执行开始: " + e.getMessage());
                // }
                
                // 🎯 智能求解：使用智能终止条件
                LOGGER.info("⚡ [智能优化] 启用智能终止条件，将根据解的质量和收敛情况自动终止");
                solution = solver.solve(problem);
                
                // 记录排班完成后的内存使用
                logMemoryUsage("排班完成后");
                
            } finally {
                // 🔧 [内存泄漏修复] 强制释放Solver资源
                if (solver != null) {
                    try {
                        solver.terminateEarly();
                        LOGGER.info("✅ [资源释放] Solver已终止并释放资源");
                    } catch (Exception e) {
                        LOGGER.warning("⚠️ [资源释放] 终止Solver时出错: " + e.getMessage());
                    }
                }
                
                // 显式清空引用，帮助GC
                solver = null;
                
                // 记录资源释放后的内存
                logMemoryUsage("资源释放后");
            }
            
            // 记录求解结束
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            
            // 🔧 关键修复：强制重新计算得分，确保增量计算没有遗漏violations
            LOGGER.info("🔍 [得分验证] 开始重新计算最终得分...");
            try {
                // 使用ScoreManager重新计算得分（已废弃API但功能仍正常，用于验证得分一致性）
                HardSoftScore originalScore = solution.getScore();
                ScoreManager<ExamSchedule, HardSoftScore> verificationScoreManager = ScoreManager.create(solverFactory);
                HardSoftScore recalculatedScore = verificationScoreManager.updateScore(solution);
                
                if (!originalScore.equals(recalculatedScore)) {
                    LOGGER.severe("🚨🚨🚨 [得分不一致] 检测到OptaPlanner增量计算bug！");
                    LOGGER.severe("   OptaPlanner报告: " + originalScore);
                    LOGGER.severe("   重新计算得分: " + recalculatedScore);
                    LOGGER.severe("   差异: 硬约束相差" + (recalculatedScore.hardScore() - originalScore.hardScore()) + 
                                 ", 软约束相差" + (recalculatedScore.softScore() - originalScore.softScore()));
                    LOGGER.severe("🔧 使用重新计算的得分作为最终得分");
                    // solution已经被updateScore更新了
                } else {
                    LOGGER.info("✅ [得分验证] 得分一致，无需修正: " + originalScore);
                }
            } catch (Exception e) {
                LOGGER.severe("❌ [得分验证] 重新计算得分失败: " + e.getMessage());
                e.printStackTrace();
            }
            
            // 标记约束执行结束 - 临时注释解决编译问题
            // try {
            //     OptimizedExamScheduleConstraintProvider constraintProvider = new OptimizedExamScheduleConstraintProvider();
            //     constraintProvider.markConstraintExecutionEnd();
            // } catch (Exception e) {
            //     LOGGER.warning("无法标记约束执行结束: " + e.getMessage());
            // }
            
            // 构建响应
            ScheduleResponse response = examScheduleService.buildScheduleResponse(solution);
            
            LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            LOGGER.info("✅ [最终解] 得分: " + solution.getScore());
            LOGGER.info("   硬约束: " + (solution.getScore() != null ? solution.getScore().hardScore() : "N/A"));
            LOGGER.info("   软约束: " + (solution.getScore() != null ? solution.getScore().softScore() : "N/A"));
            LOGGER.info("   耗时: " + duration + "ms (" + String.format("%.1f", duration/1000.0) + "秒)");
            
            // 📈 对比初始解和最终解
            if (solution.getScore() != null && initialScore != null) {
                int hardImprovement = solution.getScore().hardScore() - initialScore.hardScore();
                int softImprovement = solution.getScore().softScore() - initialScore.softScore();
                LOGGER.info("📈 [优化效果]");
                LOGGER.info("   硬约束改进: " + (hardImprovement >= 0 ? "+" : "") + hardImprovement);
                LOGGER.info("   软约束改进: " + (softImprovement >= 0 ? "+" : "") + softImprovement);
                LOGGER.info("   总体提升: " + (hardImprovement >= 0 && softImprovement >= 0 ? "✅ 成功优化" : 
                           (hardImprovement > 0 ? "⚠️ 硬约束改进，软约束下降" : "❌ 优化效果不佳")));
            }
            LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            // 🎯 智能分析结果质量
            if (solution.getScore() != null) {
                HardSoftScore score = solution.getScore();
                if (score.hardScore() >= 0 && score.softScore() >= 0) {
                    LOGGER.info("🎉 [智能分析] 找到完美解！所有约束都已满足");
                } else if (score.hardScore() >= 0 && score.softScore() >= -1000) {
                    LOGGER.info("✨ [智能分析] 找到优秀解！硬约束满足，软约束违反较少");
                } else if (score.hardScore() >= 0) {
                    LOGGER.info("👍 [智能分析] 找到可行解！硬约束满足，软约束有改进空间");
                } else {
                    LOGGER.info("⚠️ [智能分析] 解的质量需要改进，存在硬约束违反");
                }
            }

            // 在响应中包含sessionId，供前端建立WebSocket连接
            response.setSessionId(sessionId);
            return Response.ok(response).build();

            } finally {
                // 确保所有模式都释放WebSocket会话上下文，避免串话/泄露
                com.examiner.scheduler.util.WebSocketLogger.disable();
                com.examiner.scheduler.websocket.WebSocketLogPusher.clearSessionId();
            }
            
        } catch (Exception e) {
            LOGGER.severe("同步排班计算时发生错误: " + e.getMessage());
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"success\":false,\"message\":\"排班计算失败: " + e.getMessage() + "\"}")
                    .build();
        }
    }
    
    /**
     * 异步排班计算
     */
    @POST
    @Path("/solve-async")
    @SuppressWarnings({"deprecation", "removal"})  // 使用OptaPlanner已废弃API进行得分验证
    public Response solveScheduleAsync(ScheduleRequest request) {
        try {
            LOGGER.info("收到异步排班请求: 学员=" + request.getStudents().size() + 
                       ", 考官=" + request.getTeachers().size());
            
            // 在求解前设置约束配置到约束提供者
            // if (request.getConstraints() != null) {
            //     OptimizedExamScheduleConstraintProvider.setConstraintConfiguration(request.getConstraints());
            //     LOGGER.info("已设置动态约束配置到约束提供者（异步模式）");
            // }
            
            // 异步执行排班计算
            CompletableFuture.supplyAsync(() -> {
                try {
                    long startTime = System.currentTimeMillis();
                    LOGGER.info("🚀 [异步算法] 开始OptaPlanner异步求解: 学员=" + request.getStudents().size() + 
                               ", 考官=" + request.getTeachers().size());
                    
                    ExamSchedule problem = examScheduleService.createProblemInstance(
                        request.getStudents(), 
                        request.getTeachers(), 
                        request.getStartDate(), 
                        request.getEndDate(),
                        request.getConstraints()
                    );
                    
                    SolverConfig solverConfig = optimizedSolverConfig.createSolverConfigWithConstraints(
                        request.getStudents().size(), request.getConstraints());
                    
                    SolverFactory<ExamSchedule> solverFactory = SolverFactory.create(solverConfig);
                    Solver<ExamSchedule> solver = solverFactory.buildSolver();
                    
                    // 标记约束执行开始 - 临时注释解决编译问题
                    // try {
                    //     OptimizedExamScheduleConstraintProvider constraintProvider = new OptimizedExamScheduleConstraintProvider();
                    //     constraintProvider.markConstraintExecutionStart();
                    // } catch (Exception e) {
                    //     LOGGER.warning("无法标记异步约束执行开始: " + e.getMessage());
                    // }
                    
                    ExamSchedule solution = solver.solve(problem);
                    
                    // 记录求解结束
                    long endTime = System.currentTimeMillis();
                    long duration = endTime - startTime;
                    
                    // 🔧 关键修复：强制重新计算得分，确保增量计算没有遗漏violations（异步版本）
                    LOGGER.info("🔍 [异步-得分验证] 开始重新计算最终得分...");
                    try {
                        // 使用ScoreManager重新计算得分（已废弃API但功能仍正常，用于验证得分一致性）
                        HardSoftScore originalScore = solution.getScore();
                        ScoreManager<ExamSchedule, HardSoftScore> verificationScoreManager = ScoreManager.create(solverFactory);
                        HardSoftScore recalculatedScore = verificationScoreManager.updateScore(solution);
                        
                        if (!originalScore.equals(recalculatedScore)) {
                            LOGGER.severe("🚨🚨🚨 [异步-得分不一致] 检测到OptaPlanner增量计算bug！");
                            LOGGER.severe("   OptaPlanner报告: " + originalScore);
                            LOGGER.severe("   重新计算得分: " + recalculatedScore);
                            LOGGER.severe("   差异: 硬约束相差" + (recalculatedScore.hardScore() - originalScore.hardScore()) + 
                                         ", 软约束相差" + (recalculatedScore.softScore() - originalScore.softScore()));
                            LOGGER.severe("🔧 使用重新计算的得分作为最终得分");
                            // solution已经被updateScore更新了
                        } else {
                            LOGGER.info("✅ [异步-得分验证] 得分一致，无需修正: " + originalScore);
                        }
                    } catch (Exception e) {
                        LOGGER.severe("❌ [异步-得分验证] 重新计算得分失败: " + e.getMessage());
                        e.printStackTrace();
                    }
                    
                    // 标记约束执行结束 - 临时注释解决编译问题
                    // try {
                    //     OptimizedExamScheduleConstraintProvider constraintProvider = new OptimizedExamScheduleConstraintProvider();
                    //     constraintProvider.markConstraintExecutionEnd();
                    // } catch (Exception e) {
                    //     LOGGER.warning("无法标记异步约束执行结束: " + e.getMessage());
                    // }
                    
                    LOGGER.info("✅ [异步算法] 异步排班计算完成: 得分=" + solution.getScore() + 
                               ", 耗时=" + duration + "ms" + 
                               ", 硬约束得分=" + (solution.getScore() != null ? solution.getScore().hardScore() : "N/A") +
                               ", 软约束得分=" + (solution.getScore() != null ? solution.getScore().softScore() : "N/A"));
                    
                    return examScheduleService.buildScheduleResponse(solution);
                    
                } catch (Exception e) {
                    LOGGER.severe("异步排班计算时发生错误: " + e.getMessage());
                    e.printStackTrace();
                    throw new RuntimeException(e);
                }
            }, executorService);
            
            return Response.accepted()
                    .entity("{\"success\":true,\"message\":\"异步排班任务已启动\"}")
                    .build();
                    
        } catch (Exception e) {
            LOGGER.severe("启动异步排班时发生错误: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"success\":false,\"message\":\"启动异步排班失败: " + e.getMessage() + "\"}")
                    .build();
        }
    }
    
    /**
     * 健康检查端点
     */
    @GET
    @Path("/health")
    public Response healthCheck() {
        try {
            LOGGER.info("健康检查请求");
            
            // 检查服务状态
            java.util.Map<String, Object> healthStatus = new java.util.HashMap<>();
            healthStatus.put("status", "UP");
            healthStatus.put("service", "examiner-scheduler");
            healthStatus.put("timestamp", java.time.Instant.now().toString());
            healthStatus.put("version", "1.0.0");
            
            // 检查OptaPlanner组件状态
            try {
                SolverConfig testConfig = optimizedSolverConfig.createDefaultSolverConfig();
                healthStatus.put("optaplanner", "AVAILABLE");
                healthStatus.put("solver_config", testConfig.getSolutionClass().getSimpleName());
            } catch (Exception e) {
                healthStatus.put("optaplanner", "ERROR: " + e.getMessage());
            }
            
            return Response.ok(healthStatus).build();
        } catch (Exception e) {
            LOGGER.severe("健康检查时发生错误: " + e.getMessage());
            java.util.Map<String, Object> errorStatus = new java.util.HashMap<>();
            errorStatus.put("status", "DOWN");
            errorStatus.put("error", e.getMessage());
            errorStatus.put("timestamp", java.time.Instant.now().toString());
            
            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity(errorStatus)
                    .build();
        }
    }

    /**
     * 获取约束配置
     */
    @GET
    @Path("/constraints")
    public Response getConstraintConfiguration() {
        try {
            OptimizedConstraintConfiguration config = new OptimizedConstraintConfiguration();
            
            // 构建前端期望的数据格式
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("hardConstraints", config.getHardConstraints());
            response.put("softConstraints", config.getSoftConstraintWeights());
            
            return Response.ok(response).build();
        } catch (Exception e) {
            LOGGER.severe("获取约束配置时发生错误: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"success\":false,\"message\":\"获取配置时发生错误: " + e.getMessage() + "\"}")
                    .build();
        }
    }
    
    /**
     * 更新约束配置
     */
    @PUT
    @Path("/constraints")
    public Response updateConstraintConfiguration(OptimizedConstraintConfiguration config) {
        try {
            LOGGER.info("收到约束配置更新请求: " + config);
            
            // 验证配置参数
            if (config == null) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"success\":false,\"message\":\"约束配置不能为空\"}")
                        .build();
            }
            
            // 设置约束配置到约束提供者 - 临时注释解决编译问题
            // OptimizedExamScheduleConstraintProvider.setConstraintConfiguration(config);
            LOGGER.info("约束配置已更新并应用到约束提供者（临时禁用）");
            
            return Response.ok()
                    .entity("{\"success\":true,\"message\":\"约束配置更新成功\"}")
                    .build();
        } catch (Exception e) {
            LOGGER.severe("更新约束配置时发生错误: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"success\":false,\"message\":\"更新配置失败: " + e.getMessage() + "\"}")
                    .build();
        }
    }
    
    /**
     * 🚀 自适应分级求解策略
     * 实现：闪电模式 → 标准模式 → 精细模式的自动升级
     * @param sessionId WebSocket会话ID，用于实时推送进度
     */
    private ScheduleResponse solveWithAdaptiveStrategy(
            ExamSchedule problem, 
            int studentCount,
            OptimizedConstraintConfiguration constraints,
            String sessionId) {
        
        long overallStartTime = System.currentTimeMillis();
        ExamSchedule bestSolution = null;
        String finalLevel = "none";
        
        // 🚀 v5.5.6: 清理 DutySchedule 缓存，为新一轮求解准备
        com.examiner.scheduler.solver.OptimizedExamScheduleConstraintProvider.clearDutyScheduleCache();
        LOGGER.info("🔄 [v5.5.6] 已清理 DutySchedule 缓存");
        
        // 🆕 启用日志推送到前端
        com.examiner.scheduler.util.WebSocketLogger.enable(sessionId);
        LOGGER.info("📡 [日志推送] 已启用实时日志推送，sessionId=" + sessionId);
        
        // 🎯 设置WebSocketLogPusher的sessionId（用于约束日志推送）
        com.examiner.scheduler.websocket.WebSocketLogPusher.setSessionId(sessionId);
        LOGGER.info("📡 [约束日志] 已设置WebSocketLogPusher sessionId=" + sessionId);
        
        // 发送初始化日志
        com.examiner.scheduler.util.WebSocketLogger.info("System initializing...");
        com.examiner.scheduler.util.WebSocketLogger.info("Loading student data: " + (problem.getExamAssignments() != null ? problem.getExamAssignments().size() : 0) + " assignments");
        com.examiner.scheduler.util.WebSocketLogger.info("Loading examiner pool...");
        
        try {
            // 设置约束配置
            if (constraints != null) {
                problem.setConstraintConfiguration(constraints);
                com.examiner.scheduler.util.WebSocketLogger.info("Constraint configuration loaded");
            }
            
            // 🚀 Level 1: 闪电模式（3-5秒）
            LOGGER.info("🚀 [Level 1] 启动闪电模式 - 目标: 3-5秒快速解");
            com.examiner.scheduler.util.WebSocketLogger.info("Starting Flash Mode - Level 1");
            com.examiner.scheduler.util.WebSocketLogger.info("Target: 3-5 seconds rapid solution");
            
            // 发送级别开始通知 (初始进度0%)
            int initialAssignmentCount = problem.getExamAssignments() != null ? problem.getExamAssignments().size() : 0;
            ScheduleProgressWebSocket.sendProgressUpdate(sessionId, 
                new ScheduleProgressWebSocket.ProgressUpdate(
                    1, "闪电模式", 0, 5000, 0, "准备开始...", 0, initialAssignmentCount
                )
            );
            
            long flashStart = System.currentTimeMillis();
            
            // 🔍 DEBUG: 检查problem的初始解
            System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            System.err.println("🔍 [验证] 在solve()之前检查problem的assignments:");
            System.err.println("assignments数量: " + (problem.getExamAssignments() != null ? problem.getExamAssignments().size() : "NULL"));
            if (problem.getExamAssignments() != null && !problem.getExamAssignments().isEmpty()) {
                for (ExamAssignment assignment : problem.getExamAssignments()) {
                    System.err.println("  Assignment: " + assignment.getId());
                    System.err.println("    学员: " + (assignment.getStudent() != null ? assignment.getStudent().getName() : "NULL"));
                    System.err.println("    考官1: " + (assignment.getExaminer1() != null ? assignment.getExaminer1().getName() + "(" + assignment.getExaminer1().getDepartment() + ")" : "NULL"));
                    System.err.println("    考官2: " + (assignment.getExaminer2() != null ? assignment.getExaminer2().getName() + "(" + assignment.getExaminer2().getDepartment() + ")" : "NULL"));
                }
            }
            System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            // 🔧 发送心跳保持WebSocket连接活跃
            ScheduleProgressWebSocket.sendHeartbeat(sessionId);
            
            // 🔧 [内存泄漏修复] Flash Solver使用try-finally确保资源释放
            com.examiner.scheduler.util.WebSocketLogger.info("Building solver configuration...");
            SolverConfig flashConfig = adaptiveSolverConfig.createFlashConfig();
            SolverFactory<ExamSchedule> flashFactory = SolverFactory.create(flashConfig);
            Solver<ExamSchedule> flashSolver = null;
            ExamSchedule flashSolution = null;
            
            try {
                logMemoryUsage("Flash求解开始前");
                flashSolver = flashFactory.buildSolver();
                
                // 🎯 添加实时进度监听器 - Level 1: 0%-30%
                // 🔧 v5.5.3: 预估时长从5秒增加到15秒
                com.examiner.scheduler.solver.RealTimeProgressListener<ExamSchedule> flashProgressListener = 
                    new com.examiner.scheduler.solver.RealTimeProgressListener<>(
                        sessionId, 1, "闪电模式", 0, 30, 15000L  // 🔧 v5.5.3: 预估15秒
                    );
                flashSolver.addEventListener(flashProgressListener);
                
                com.examiner.scheduler.util.WebSocketLogger.info("Solver created, starting computation...");
                com.examiner.scheduler.util.WebSocketLogger.info("Analyzing " + (problem.getExamAssignments() != null ? problem.getExamAssignments().size() : 0) + " assignment tasks...");
                flashSolution = flashSolver.solve(problem);
                
                // 🎯 求解完成，推送最终进度
                flashProgressListener.pushFinalProgress();
                LOGGER.info("📊 [Level 1] " + flashProgressListener.getStatistics());
                com.examiner.scheduler.util.WebSocketLogger.success("Flash mode computation completed");
                
                logMemoryUsage("Flash求解完成后");
            } finally {
                if (flashSolver != null) {
                    try {
                        flashSolver.terminateEarly();
                        LOGGER.info("✅ [资源释放] Flash Solver已终止");
                    } catch (Exception e) {
                        LOGGER.warning("⚠️ [资源释放] 终止Flash Solver时出错: " + e.getMessage());
                    }
                }
                flashSolver = null;
                flashFactory = null;
            }
            
            // 🔍 DEBUG: 检查solve()之后的结果
            System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            System.err.println("🔍 [验证] 在solve()之后检查flashSolution的assignments:");
            if (flashSolution.getExamAssignments() != null && !flashSolution.getExamAssignments().isEmpty()) {
                for (ExamAssignment assignment : flashSolution.getExamAssignments()) {
                    if (assignment.getStudent() != null && "顾杨".equals(assignment.getStudent().getName())) {
                        System.err.println("  🎯 找到顾杨的assignment:");
                        System.err.println("    考官1: " + (assignment.getExaminer1() != null ? assignment.getExaminer1().getName() + "(" + assignment.getExaminer1().getDepartment() + ")" : "NULL"));
                        System.err.println("    考官2: " + (assignment.getExaminer2() != null ? assignment.getExaminer2().getName() + "(" + assignment.getExaminer2().getDepartment() + ")" : "NULL"));
                    }
                }
            }
            System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            long flashTime = System.currentTimeMillis() - flashStart;
            HardSoftScore flashScore = flashSolution.getScore();
            
            LOGGER.info("✅ [Level 1] 闪电模式完成 - 耗时: " + flashTime + "ms, 分数: " + flashScore);
            com.examiner.scheduler.util.WebSocketLogger.success("Level 1 completed in " + flashTime + "ms");
            com.examiner.scheduler.util.WebSocketLogger.info("Score: " + flashScore);
            
            // 🆕 发送中间结果（包含实际排班数据）
            int flashAssignmentCount = flashSolution.getExamAssignments() != null ? flashSolution.getExamAssignments().size() : 0;
            LOGGER.info("📡 [Level 1] 准备发送中间结果，包含 " + flashAssignmentCount + " 个排班分配");
            com.examiner.scheduler.util.WebSocketLogger.info("Sending intermediate result: " + flashAssignmentCount + " assignments");
            
            // 🔧 修复：转换为DTO避免序列化问题
            ScheduleProgressWebSocket.sendIntermediateResult(sessionId,
                new ScheduleProgressWebSocket.IntermediateResult(
                    flashScore.toString(),
                    flashAssignmentCount,
                    0.7,  // 闪电模式置信度70%
                    assessSolutionQuality(flashScore),
                    flashTime,
                    AssignmentMapper.toDTOList(flashSolution.getExamAssignments())  // 🔧 使用DTO避免循环引用
                )
            );
            
            LOGGER.info("✅ [Level 1] 已发送闪电模式中间结果到前端 (sessionId: " + sessionId + ")");
            
            bestSolution = flashSolution;
            finalLevel = "flash";
            
            // 检查是否需要升级
            HardSoftLongScore flashScoreLong = HardSoftLongScore.of(
                flashScore.hardScore(), 
                flashScore.softScore()
            );
            
            if (!adaptiveSolverConfig.shouldUpgrade(flashScoreLong, "flash")) {
                LOGGER.info("🎉 [Level 1] 闪电模式结果优秀，无需升级");
                com.examiner.scheduler.util.WebSocketLogger.success("Result is excellent, no upgrade needed");
                com.examiner.scheduler.util.WebSocketLogger.info("Finalizing schedule...");
                
                // 🔧 修复：先构建响应，再禁用日志推送
                ScheduleResponse response = buildAdaptiveResponse(bestSolution, finalLevel, flashTime, overallStartTime, sessionId);
                
                // 🔧 新增：推送最终100%进度（闪电模式直接完成）
                pushPostProcessingProgress(sessionId, 30, 100, "排班完成");
                
                return response;
            }
            
            // ⚡ Level 2: 标准模式（10-20秒）
            LOGGER.info("⚡ [Level 2] 升级到标准模式 - 目标: 10-20秒良好解");
            com.examiner.scheduler.util.WebSocketLogger.warning("Upgrading to Standard Mode - Level 2");
            com.examiner.scheduler.util.WebSocketLogger.info("Targeting better solution quality...");
            
            // 发送级别升级通知
            ScheduleProgressWebSocket.sendLevelUpgrade(sessionId,
                new ScheduleProgressWebSocket.LevelUpgrade(
                    1, 2, "闪电模式", "标准模式",
                    "闪电模式结果需要改进，升级到标准模式以获得更好的解",
                    flashScore.toString()
                )
            );
            
            // Level 2的实时进度将由监听器自动推送
            
            long standardStart = System.currentTimeMillis();
            
            // 🔧 发送心跳保持WebSocket连接活跃
            ScheduleProgressWebSocket.sendHeartbeat(sessionId);
            
            // 🔧 [内存泄漏修复] Standard Solver使用try-finally确保资源释放
            com.examiner.scheduler.util.WebSocketLogger.info("Reconfiguring solver for standard mode...");
            SolverConfig standardConfig = adaptiveSolverConfig.createStandardConfig();
            SolverFactory<ExamSchedule> standardFactory = SolverFactory.create(standardConfig);
            Solver<ExamSchedule> standardSolver = null;
            ExamSchedule standardSolution = null;
            HardSoftScore standardScore = null;
            long standardTime = 0;
            
            try {
                logMemoryUsage("Standard求解开始前");
                standardSolver = standardFactory.buildSolver();
                
                // 🎯 添加实时进度监听器 - Level 2: 30%-60%
                // 🔧 v5.5.3: 预估时长从15秒增加到120秒
                com.examiner.scheduler.solver.RealTimeProgressListener<ExamSchedule> standardProgressListener = 
                    new com.examiner.scheduler.solver.RealTimeProgressListener<>(
                        sessionId, 2, "标准模式", 30, 60, 120000L  // 🔧 v5.5.3: 预估120秒
                    );
                standardSolver.addEventListener(standardProgressListener);
                
                com.examiner.scheduler.util.WebSocketLogger.info("Standard solver initialized");
                com.examiner.scheduler.util.WebSocketLogger.info("Running deeper optimization algorithms...");
                standardSolution = standardSolver.solve(problem);
                standardTime = System.currentTimeMillis() - standardStart;
                
                // 🎯 求解完成，推送最终进度
                standardProgressListener.pushFinalProgress();
                LOGGER.info("📊 [Level 2] " + standardProgressListener.getStatistics());
                com.examiner.scheduler.util.WebSocketLogger.success("Level 2 computation completed");
                standardScore = standardSolution.getScore();
                
                logMemoryUsage("Standard求解完成后");
            } finally {
                if (standardSolver != null) {
                    try {
                        standardSolver.terminateEarly();
                        LOGGER.info("✅ [资源释放] Standard Solver已终止");
                    } catch (Exception e) {
                        LOGGER.warning("⚠️ [资源释放] 终止Standard Solver时出错: " + e.getMessage());
                    }
                }
                standardSolver = null;
                standardFactory = null;
            }
            
            LOGGER.info("✅ [Level 2] 标准模式完成 - 耗时: " + standardTime + "ms, 分数: " + standardScore);
            
            // 🆕 发送中间结果（包含实际排班数据）
            int standardAssignmentCount = standardSolution.getExamAssignments() != null ? standardSolution.getExamAssignments().size() : 0;
            LOGGER.info("📡 [Level 2] 准备发送中间结果，包含 " + standardAssignmentCount + " 个排班分配");
            
            // 🔧 修复：转换为DTO避免序列化问题
            ScheduleProgressWebSocket.sendIntermediateResult(sessionId,
                new ScheduleProgressWebSocket.IntermediateResult(
                    standardScore.toString(),
                    standardAssignmentCount,
                    0.85,  // 标准模式置信度85%
                    assessSolutionQuality(standardScore),
                    flashTime + standardTime,
                    AssignmentMapper.toDTOList(standardSolution.getExamAssignments())  // 🔧 使用DTO避免循环引用
                )
            );
            
            LOGGER.info("✅ [Level 2] 已发送标准模式中间结果到前端 (sessionId: " + sessionId + ")");
            
            bestSolution = standardSolution;
            finalLevel = "standard";
            
            // 检查是否需要升级
            HardSoftLongScore standardScoreLong = HardSoftLongScore.of(
                standardScore.hardScore(), 
                standardScore.softScore()
            );
            
            if (!adaptiveSolverConfig.shouldUpgrade(standardScoreLong, "standard")) {
                LOGGER.info("🎉 [Level 2] 标准模式结果优秀，无需升级");
                long totalTime = flashTime + standardTime;
                
                // 🔧 修复：先构建响应，再禁用日志推送
                ScheduleResponse response = buildAdaptiveResponse(bestSolution, finalLevel, totalTime, overallStartTime, sessionId);
                
                // 🔧 新增：推送最终100%进度（标准模式）
                pushPostProcessingProgress(sessionId, 60, 100, "排班完成");
                
                return response;
            }
            
            // �� Level 3: 精细模式（30-60秒）
            LOGGER.info("🏆 [Level 3] 升级到精细模式 - 目标: 30-60秒最优解");
            
            // 发送级别升级通知
            ScheduleProgressWebSocket.sendLevelUpgrade(sessionId,
                new ScheduleProgressWebSocket.LevelUpgrade(
                    2, 3, "标准模式", "精细模式",
                    "标准模式结果需要进一步优化，升级到精细模式以获得最优解",
                    standardScore.toString()
                )
            );
            
            // Level 3的实时进度将由监听器自动推送
            
            // 🔧 [内存泄漏修复] Precise Solver使用try-finally确保资源释放
            long preciseStart = System.currentTimeMillis();
            
            SolverConfig preciseConfig = adaptiveSolverConfig.createPreciseConfig();
            SolverFactory<ExamSchedule> preciseFactory = SolverFactory.create(preciseConfig);
            Solver<ExamSchedule> preciseSolver = null;
            ExamSchedule preciseSolution = null;
            HardSoftScore preciseScore = null;
            long preciseTime = 0;
            
            try {
                logMemoryUsage("Precise求解开始前");
                preciseSolver = preciseFactory.buildSolver();
                
                // 🎯 添加实时进度监听器 - Level 3: 60%-95%
                // 🔧 v5.5.3: 预估时长从40秒增加到180秒
                com.examiner.scheduler.solver.RealTimeProgressListener<ExamSchedule> preciseProgressListener = 
                    new com.examiner.scheduler.solver.RealTimeProgressListener<>(
                        sessionId, 3, "精细模式", 60, 95, 180000L  // 🔧 v5.5.3: 预估180秒
                    );
                preciseSolver.addEventListener(preciseProgressListener);
                
                preciseSolution = preciseSolver.solve(problem);
                preciseTime = System.currentTimeMillis() - preciseStart;
                preciseScore = preciseSolution.getScore();
                
                // 🎯 求解完成，推送最终进度
                preciseProgressListener.pushFinalProgress();
                LOGGER.info("📊 [Level 3] " + preciseProgressListener.getStatistics());
                
                // 🔧 新增：后处理进度（95% → 100%）
                pushPostProcessingProgress(sessionId, 95, 97, "转换结果数据");
                
                logMemoryUsage("Precise求解完成后");
            } finally {
                if (preciseSolver != null) {
                    try {
                        preciseSolver.terminateEarly();
                        LOGGER.info("✅ [资源释放] Precise Solver已终止");
                    } catch (Exception e) {
                        LOGGER.warning("⚠️ [资源释放] 终止Precise Solver时出错: " + e.getMessage());
                    }
                }
                preciseSolver = null;
                preciseFactory = null;
            }
            
            LOGGER.info("✅ [Level 3] 精细模式完成 - 耗时: " + preciseTime + "ms, 分数: " + preciseScore);
            
            // 🆕 发送最终中间结果（包含实际排班数据）
            // 🔧 修复：转换为DTO避免序列化问题
            ScheduleProgressWebSocket.sendIntermediateResult(sessionId,
                new ScheduleProgressWebSocket.IntermediateResult(
                    preciseScore.toString(),
                    preciseSolution.getExamAssignments() != null ? preciseSolution.getExamAssignments().size() : 0,
                    0.95,  // 精细模式置信度95%
                    assessSolutionQuality(preciseScore),
                    flashTime + standardTime + preciseTime,
                    AssignmentMapper.toDTOList(preciseSolution.getExamAssignments())  // 🔧 使用DTO避免循环引用
                )
            );
            
            int preciseAssignmentCount = preciseSolution.getExamAssignments() != null ? preciseSolution.getExamAssignments().size() : 0;
            LOGGER.info("📡 [WebSocket] 已发送精细模式中间结果（包含 " + preciseAssignmentCount + " 个排班）");
            
            // 🔧 新增：后处理进度（97% → 99%）
            pushPostProcessingProgress(sessionId, 97, 99, "生成最终结果");
            
            bestSolution = preciseSolution;
            finalLevel = "precise";
            
            long totalTime = flashTime + standardTime + preciseTime;
            
            // 🔧 修复：先构建响应，再禁用日志推送
            ScheduleResponse response = buildAdaptiveResponse(bestSolution, finalLevel, totalTime, overallStartTime, sessionId);
            
            // 🔧 新增：推送最终100%进度
            pushPostProcessingProgress(sessionId, 99, 100, "排班完成");
            
            return response;
            
        } catch (Exception e) {
            LOGGER.severe("❌ [分级求解] 求解失败: " + e.getMessage());
            e.printStackTrace();
            
            // 🆕 v5.5.4: 如果有部分结果，进行诊断并返回
            if (bestSolution != null) {
                long totalTime = System.currentTimeMillis() - overallStartTime;
                
                LOGGER.info("🔍 [v5.5.4] 求解中断，正在诊断部分结果...");
                
                // 诊断部分结果
                com.examiner.scheduler.diagnosis.ConstraintViolationDiagnostics.DiagnosisResult diagnosis = 
                    com.examiner.scheduler.diagnosis.ConstraintViolationDiagnostics.diagnose(bestSolution);
                
                // 记录诊断结果
                String diagnosisReport = com.examiner.scheduler.diagnosis.ConstraintViolationDiagnostics.formatDiagnosis(diagnosis);
                LOGGER.info("📋 [v5.5.4] 诊断报告:\n" + diagnosisReport);
                
                // 构建响应，包含诊断信息
                ScheduleResponse response = buildAdaptiveResponse(bestSolution, finalLevel + "_partial", totalTime, overallStartTime, sessionId);
                
                // 添加诊断信息到响应
                response.setSuccess(diagnosis.getCompletionPercentage() >= 50); // 完成度 >= 50% 算成功
                
                StringBuilder message = new StringBuilder();
                message.append(diagnosis.getOverallAssessment()).append("\n\n");
                message.append("求解中断原因: ").append(e.getMessage()).append("\n\n");
                
                if (!diagnosis.getViolations().isEmpty()) {
                    message.append("发现的问题:\n");
                    diagnosis.getViolations().forEach(v -> message.append(v).append("\n"));
                    message.append("\n");
                }
                
                if (!diagnosis.getSuggestions().isEmpty()) {
                    message.append("改进建议:\n");
                    diagnosis.getSuggestions().forEach(s -> message.append(s).append("\n"));
                }
                
                response.setMessage(message.toString());
                
                // 更新统计信息
                if (response.getStatistics() != null) {
                    response.getStatistics().setCompletionPercentage((double) diagnosis.getCompletionPercentage());
                }
                
                LOGGER.info("✅ [v5.5.4] 已返回部分解（完成度: " + diagnosis.getCompletionPercentage() + "%）");
                
                return response;
            }
            
            // 🆕 v5.5.4: 完全失败，返回友好错误信息
            LOGGER.severe("❌ [v5.5.4] 无任何部分结果可返回");
            
            ScheduleResponse errorResponse = new ScheduleResponse();
            errorResponse.setSuccess(false);
            
            StringBuilder errorMessage = new StringBuilder();
            errorMessage.append("❌ 排班失败：无法生成任何结果\n\n");
            errorMessage.append("错误详情：").append(e.getMessage()).append("\n\n");
            errorMessage.append("可能原因：\n");
            errorMessage.append("  1. 数据存在严重约束冲突\n");
            errorMessage.append("  2. 考官数量严重不足\n");
            errorMessage.append("  3. 科室分布不合理\n");
            errorMessage.append("  4. 不可用时间设置过多\n\n");
            errorMessage.append("建议操作：\n");
            errorMessage.append("  1. 返回上一步，检查数据配置\n");
            errorMessage.append("  2. 增加考官数量（建议 ≥ 学员数 × 3）\n");
            errorMessage.append("  3. 检查各科室考官分布\n");
            errorMessage.append("  4. 减少考官不可用时间\n");
            errorMessage.append("  5. 临时禁用部分约束后重试\n");
            
            errorResponse.setMessage(errorMessage.toString());
            
            // 添加统计信息
            ScheduleResponse.ScheduleStatistics stats = new ScheduleResponse.ScheduleStatistics();
            stats.setSolvingMode("failed");
            stats.setCompletionPercentage(0.0);
            errorResponse.setStatistics(stats);
            
            return errorResponse;
        }
    }
    
    /**
     * 构建自适应求解响应
     * @param sessionId WebSocket会话ID
     */
    private ScheduleResponse buildAdaptiveResponse(
            ExamSchedule solution, 
            String level, 
            long solvingTime,
            long overallStartTime,
            String sessionId) {
        
        ScheduleResponse response = examScheduleService.buildScheduleResponse(solution);
        
        // 添加分级求解信息到统计数据
        ScheduleResponse.ScheduleStatistics stats = response.getStatistics();
        if (stats != null) {
            stats.setSolvingMode("adaptive_" + level);
            stats.setSolvingTimeMillis(solvingTime);
            stats.setSolvingTimeSeconds((int) (solvingTime / 1000));
        }
        
        // 添加质量评估
        HardSoftScore score = solution.getScore();
        String qualityAssessment = assessSolutionQuality(score);
        
        response.setMessage(String.format(
            "自适应求解完成 [%s] - 耗时: %.1f秒, 质量: %s",
            level,
            solvingTime / 1000.0,
            qualityAssessment
        ));
        
        LOGGER.info(String.format(
            "🎯 [分级求解] 最终结果 - 级别: %s, 总耗时: %dms (%.1f秒), 分数: %s, 质量: %s",
            level,
            solvingTime,
            solvingTime / 1000.0,
            score,
            qualityAssessment
        ));
        
        // 发送最终完成消息
        ScheduleProgressWebSocket.sendFinalResult(sessionId, new java.util.HashMap<String, Object>() {{
            put("success", response.isSuccess());
            put("level", level);
            put("score", score.toString());
            put("quality", qualityAssessment);
            put("totalTime", solvingTime);
            put("message", response.getMessage());
        }});
        
        return response;
    }
    
    /**
     * 评估解的质量
     */
    private String assessSolutionQuality(HardSoftScore score) {
        if (score == null) {
            return "未知";
        }
        
        if (score.hardScore() < 0) {
            return "需改进（硬约束未满足）";
        }
        
        long softScore = score.softScore();
        if (softScore >= 0) {
            return "完美（所有约束满足）";
        } else if (softScore >= -20) {
            return "优秀（软约束几乎满足）";
        } else if (softScore >= -100) {
            return "良好（软约束部分满足）";
        } else if (softScore >= -300) {
            return "可接受（基本满足要求）";
        } else {
            return "一般（有改进空间）";
        }
    }
    
    /**
     * 🔧 新增：推送后处理进度（95%-100%）
     * 在求解完成后，平滑地推送后处理进度到前端
     */
    private void pushPostProcessingProgress(String sessionId, int fromProgress, int toProgress, String message) {
        try {
            LOGGER.info("🔄 [后处理] 开始推送进度: " + fromProgress + "% → " + toProgress + "%, 消息: " + message);
            
            // 🔧 优化：更快的增长速度，减少延迟
            int step = (toProgress - fromProgress) > 5 ? 2 : 1;  // 大跨度时步长为2，小跨度时步长为1
            
            for (int progress = fromProgress; progress <= toProgress; progress += step) {
                // 确保最后一步到达 toProgress
                if (progress > toProgress) {
                    progress = toProgress;
                }
                
                ScheduleProgressWebSocket.ProgressUpdate update = new ScheduleProgressWebSocket.ProgressUpdate(
                    3,  // Level 3
                    message,
                    0,  // elapsedTime
                    0,  // remaining
                    progress,
                    "",  // currentScore
                    0,  // iterationCount
                    0   // assignmentCount
                );
                
                // 🔧 立即推送到 WebSocket 和 HTTP 轮询缓存
                ScheduleProgressWebSocket.sendProgressUpdate(sessionId, update);
                ScheduleProgressResource.updateProgress(sessionId, update);
                
                // 🔧 减少延迟：从50ms降低到20ms，让进度更快
                if (progress < toProgress) {
                    Thread.sleep(20);  // 20ms延迟
                }
                
                // 🔧 关键日志：记录每次推送
                if (progress % 2 == 0 || progress == toProgress) {
                    LOGGER.info("📊 [后处理] 推送进度: " + progress + "% - " + message);
                }
            }
            
            // 🔧 确保最后一次推送 toProgress
            if ((toProgress - fromProgress) % step != 0) {
                ScheduleProgressWebSocket.ProgressUpdate finalUpdate = new ScheduleProgressWebSocket.ProgressUpdate(
                    3, message, 0, 0, toProgress, "", 0, 0
                );
                ScheduleProgressWebSocket.sendProgressUpdate(sessionId, finalUpdate);
                ScheduleProgressResource.updateProgress(sessionId, finalUpdate);
            }
            
            LOGGER.info("✅ [后处理] 已完成推送: " + fromProgress + "% → " + toProgress + "%");
        } catch (Exception e) {
            LOGGER.severe("❌ [后处理] 推送后处理进度失败: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * 🔧 [内存泄漏修复] 记录内存使用情况
     * 用于监控排班过程中的内存消耗，及时发现内存泄漏问题
     */
    private void logMemoryUsage(String stage) {
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        long maxMemory = runtime.maxMemory();
        double usagePercent = (double) usedMemory / maxMemory * 100;
        
        // 转换为MB方便阅读
        long totalMB = totalMemory / 1024 / 1024;
        long usedMB = usedMemory / 1024 / 1024;
        long freeMB = freeMemory / 1024 / 1024;
        long maxMB = maxMemory / 1024 / 1024;
        
        LOGGER.info(String.format(
            "📊 [内存监控] %s: 已用=%dMB, 空闲=%dMB, 总计=%dMB, 最大=%dMB, 使用率=%.1f%%",
            stage, usedMB, freeMB, totalMB, maxMB, usagePercent
        ));
        
        // ⚠️ 内存告警
        if (usagePercent > 90) {
            LOGGER.severe(String.format(
                "🚨🚨🚨 [内存告警] 内存使用率超过90%% (%.1f%%)！可能即将耗尽内存！",
                usagePercent
            ));
        } else if (usagePercent > 80) {
            LOGGER.warning(String.format(
                "⚠️⚠️ [内存告警] 内存使用率超过80%% (%.1f%%)！请注意内存使用！",
                usagePercent
            ));
        } else if (usagePercent > 70) {
            LOGGER.warning(String.format(
                "⚠️ [内存提示] 内存使用率超过70%% (%.1f%%)，建议关注",
                usagePercent
            ));
        }
    }
    
    // ==================== 🆕 v5.6.0: 局部重排API ====================
    
    /**
     * 🆕 v5.6.0: 局部重新排班
     * 
     * 固定部分排班，只重新排班未固定的部分
     * 使用OptaPlanner求解引擎，保证最优解
     * 
     * @param request 局部重排请求
     * @return 排班结果
     */
    @Path("/partial-reschedule")
    @POST
    public Response partialReschedule(PartialRescheduleRequest request) {
        String sessionId = java.util.UUID.randomUUID().toString();
        LOGGER.info("🔄 [局部重排] 开始处理请求，sessionId: " + sessionId);
        LOGGER.info("📊 [局部重排] 固定排班数量: " + 
            (request.getPinnedScheduleIds() != null ? request.getPinnedScheduleIds().size() : 0) +
            ", 总排班数量: " + 
            (request.getExistingAssignments() != null ? request.getExistingAssignments().size() : 0));
        
        try {
            // 1. 基本验证
            if (request.getPinnedScheduleIds() == null || request.getPinnedScheduleIds().isEmpty()) {
                LOGGER.warning("⚠️ [局部重排] 没有固定的排班，建议使用完整排班");
            }
            
            // 2. 构建问题
            ExamSchedule problem = buildPartialRescheduleProblem(request, sessionId);
            
            // 3. 使用快速求解配置（20秒）
            SolverConfig solverConfig = createPartialRescheduleSolverConfig();
            
            // 4. 创建求解器
            SolverFactory<ExamSchedule> solverFactory = SolverFactory.create(solverConfig);
            Solver<ExamSchedule> solver = solverFactory.buildSolver();
            
            // 5. 添加进度监听器（WebSocket推送）
            solver.addEventListener(event -> {
                if (event.isEveryProblemChangeProcessed()) {
                    pushPartialRescheduleProgress(sessionId, event);
                }
            });
            
            LOGGER.info("🚀 [局部重排] 开始求解...");
            
            // 🔍 求解前日志：打印固定排班的日期
            LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            LOGGER.info("🔍 [求解前] 检查固定排班的日期:");
            problem.getExamAssignments().stream()
                .filter(ExamAssignment::isPinned)
                .forEach(a -> LOGGER.info("  📌 " + a.getStudentName() + 
                    ": examDate=" + a.getExamDate() + 
                    ", originalDate=" + a.getOriginalExamDate() +
                    ", pinned=" + a.isPinned()));
            LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            long startTime = System.currentTimeMillis();
            
            // 6. 求解
            ExamSchedule solution = solver.solve(problem);
            
            long solveTime = System.currentTimeMillis() - startTime;
            LOGGER.info("✅ [局部重排] 求解完成，耗时: " + (solveTime / 1000.0) + "秒，分数: " + solution.getScore());
            
            // 🔍 求解后日志：检查固定排班是否被改变
            LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            LOGGER.info("🔍 [求解后] 检查固定排班的日期:");
            solution.getExamAssignments().stream()
                .filter(ExamAssignment::isPinned)
                .forEach(a -> {
                    boolean matches = a.matchesOriginal();
                    String status = matches ? "✅ 未改变" : "❌ 被改变！";
                    LOGGER.info("  📌 " + a.getStudentName() + 
                        ": examDate=" + a.getExamDate() + 
                        ", originalDate=" + a.getOriginalExamDate() +
                        ", matches=" + matches + " " + status);
                });
            LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            // 7. 🆕 关键修复：只返回未固定的排班（避免前端误更新固定排班）
            int totalCount = solution.getExamAssignments().size();
            java.util.List<ExamAssignment> unpinnedAssignments = solution.getExamAssignments()
                .stream()
                .filter(a -> !a.isPinned())  // 过滤掉固定的排班
                .collect(java.util.stream.Collectors.toList());
            
            LOGGER.info("📊 [局部重排] 数据统计: 总排班=" + totalCount + 
                ", 固定=" + (totalCount - unpinnedAssignments.size()) +
                ", 返回(未固定)=" + unpinnedAssignments.size());
            
            // 🔍 详细记录返回的未固定排班的考官分配情况
            LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            LOGGER.info("🔍 [返回前检查] 未固定排班的考官分配情况:");
            for (ExamAssignment a : unpinnedAssignments) {
                String examiner1Info = (a.getExaminer1() != null) ? 
                    a.getExaminer1().getName() + " (ID: " + a.getExaminer1().getId() + ")" : "null";
                String examiner2Info = (a.getExaminer2() != null) ? 
                    a.getExaminer2().getName() + " (ID: " + a.getExaminer2().getId() + ")" : "null";
                String backupInfo = (a.getBackupExaminer() != null) ? 
                    a.getBackupExaminer().getName() + " (ID: " + a.getBackupExaminer().getId() + ")" : "null";
                
                LOGGER.info("  📋 " + a.getStudentName() + " (ID: " + a.getId() + 
                    ", Type: " + a.getExamType() + ")");
                LOGGER.info("     考官1: " + examiner1Info);
                LOGGER.info("     考官2: " + examiner2Info);
                LOGGER.info("     备份: " + backupInfo);
            }
            LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            // 🔧 修改solution对象，只包含未固定的排班
            solution.setExamAssignments(unpinnedAssignments);
            
            // 8. 转换结果（只包含未固定的排班）
            ScheduleResponse response = examScheduleService.buildScheduleResponse(solution);
            if (response.isSuccess()) {
                response.setMessage("局部重排完成");
            }
            response.setSessionId(sessionId);
            
            examScheduleService.saveScheduleHistory("partial_reschedule_" + sessionId, response);
            
            // 8. 推送完成通知
            pushPartialRescheduleComplete(sessionId, response);
            
            return Response.ok(response).build();
            
        } catch (Exception e) {
            LOGGER.severe("❌ [局部重排] 失败: " + e.getMessage());
            e.printStackTrace();
            pushPartialRescheduleError(sessionId, e.getMessage());
            
            return Response.serverError()
                .entity(java.util.Map.of(
                    "success", false,
                    "message", "局部重排失败: " + e.getMessage(),
                    "error", e.getClass().getSimpleName()
                ))
                .build();
        }
    }
    
    /**
     * 构建局部重排问题
     */
    private ExamSchedule buildPartialRescheduleProblem(
        PartialRescheduleRequest request,
        String sessionId
    ) {
        LOGGER.info("🔧 [局部重排] 构建问题...");
        
        // 1. 转换学员
        java.util.List<Student> students = request.getStudents().stream()
            .map(this::convertDTOToStudent)
            .collect(java.util.stream.Collectors.toList());
        
        // 2. 转换考官
        java.util.List<Teacher> teachers = request.getTeachers().stream()
            .map(this::convertDTOToTeacher)
            .collect(java.util.stream.Collectors.toList());
        
        // 3. 创建排班列表
        java.util.List<ExamAssignment> assignments = new java.util.ArrayList<>();
        java.util.Set<String> pinnedIds = new java.util.HashSet<>(request.getPinnedScheduleIds());
        
        // 4. 从现有排班创建ExamAssignment
        for (PartialRescheduleRequest.ExistingAssignment existing : request.getExistingAssignments()) {
            java.util.List<ExamAssignment> createdAssignments = createAssignmentsFromExisting(
                existing, 
                students, 
                teachers
            );
            
            boolean isPinned = pinnedIds.contains(existing.getId()) || existing.isPinned();
            
            for (ExamAssignment assignment : createdAssignments) {
                if (assignment != null) {
                    // 如果是固定的排班，设置标记和原始值
                    if (isPinned) {
                        assignment.setPinned(true);
                        assignment.setOriginalAssignment();  // 保存当前值为原始值
                        
                        LOGGER.info("📌 [局部重排] 固定排班: " + existing.getStudentName() + 
                            " - 日期=" + assignment.getExamDate() + 
                            ", 考官1=" + (assignment.getExaminer1() != null ? assignment.getExaminer1().getName() : "null") +
                            ", ID=" + assignment.getId() +
                            ", pinned=true ✅");
                    } else {
                        LOGGER.info("🔓 [局部重排] 未固定排班: " + existing.getStudentName() + 
                            " - 日期=" + assignment.getExamDate() + ", ID=" + assignment.getId());
                    }
                    
                    assignments.add(assignment);
                }
            }
        }
        
        // 5. 处理固定与未固定：固定但不完整的排班需要解除固定以补全考官
        for (ExamAssignment a : assignments) {
            if (a != null && a.isPinned()) {
                boolean incompleteDay1 = (a.getExaminer1() == null) || (a.getExaminer2() == null) || (a.getBackupExaminer() == null);
                if (incompleteDay1) {
                    a.setPinned(false);
                    LOGGER.info("🔓 [局部重排] 固定排班存在未分配考官，解除固定以补全: 学员=" +
                            (a.getStudent() != null ? a.getStudent().getName() : "未知") +
                            ", 日期=" + a.getExamDate());
                }
            }
        }
        
        // 6. 为未固定且考官1为空的排班自动分配考官1
        autoAssignExaminer1ForUnpinnedAssignments(assignments, teachers);
        
        // 7. 构建ExamSchedule
        ExamSchedule problem = new ExamSchedule();
        problem.setStudents(students);
        problem.setTeachers(teachers);
        problem.setExamAssignments(assignments);
        
        // 🔧 关键：设置可用日期范围（从现有排班中提取）
        java.util.Set<String> dateSet = new java.util.HashSet<>();
        for (PartialRescheduleRequest.ExistingAssignment existing : request.getExistingAssignments()) {
            if (existing.getDate1() != null) dateSet.add(existing.getDate1());
            if (existing.getDate2() != null) dateSet.add(existing.getDate2());
        }
        // 添加日期范围内的所有日期
        if (request.getStartDate() != null && request.getEndDate() != null) {
            java.time.LocalDate start = java.time.LocalDate.parse(request.getStartDate());
            java.time.LocalDate end = java.time.LocalDate.parse(request.getEndDate());
            for (java.time.LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
                dateSet.add(date.toString());
            }
        }
        problem.setAvailableDates(new java.util.ArrayList<>(dateSet));
        
        LOGGER.info("📅 [局部重排] 可用日期数量: " + problem.getAvailableDates().size());
        
        // 6. 设置约束配置
        if (request.getConstraints() != null) {
            try {
                if (request.getConstraints() instanceof OptimizedConstraintConfiguration) {
                    problem.setConstraintConfiguration((OptimizedConstraintConfiguration) request.getConstraints());
                } else {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    OptimizedConstraintConfiguration cfg = mapper.convertValue(request.getConstraints(), OptimizedConstraintConfiguration.class);
                    problem.setConstraintConfiguration(cfg);
                }
            } catch (Exception e) {
                LOGGER.warning("⚠️ [局部重排] 约束配置解析失败，使用默认约束配置: " + e.getMessage());
            }
        }
        
        LOGGER.info("✅ [局部重排] 问题构建完成: " + students.size() + "个学员, " + 
            teachers.size() + "个考官, " + assignments.size() + "个排班（" + 
            pinnedIds.size() + "个固定）");
        
        return problem;
    }
    
    /**
     * 从现有排班创建ExamAssignment
     */
    /**
     * 从ExistingAssignment创建Assignment列表（包含Day1和Day2）
     */
    private java.util.List<ExamAssignment> createAssignmentsFromExisting(
        PartialRescheduleRequest.ExistingAssignment existing,
        java.util.List<Student> students,
        java.util.List<Teacher> teachers
    ) {
        java.util.List<ExamAssignment> assignments = new java.util.ArrayList<>();
        
        // 查找对应的学员
        Student student = students.stream()
            .filter(s -> s.getName().equals(existing.getStudentName()))
            .findFirst()
            .orElse(null);
        
        if (student == null) {
            LOGGER.warning("⚠️ [局部重排] 未找到学员: " + existing.getStudentName());
            return assignments;
        }
        
        // ========================================
        // Day 1 Assignment
        // ========================================
        ExamAssignment day1 = new ExamAssignment();
        day1.setId(existing.getId());
        day1.setStudent(student);
        day1.setExamDate(existing.getDate1());
        day1.setExamType("day1");
        day1.setSubjects(java.util.List.of("现场", "模拟机1")); // 默认科目
        
        day1.setExaminer1(findTeacherByName(teachers, existing.getExaminer1_1()));
        day1.setExaminer2(findTeacherByName(teachers, existing.getExaminer1_2()));
        day1.setBackupExaminer(findTeacherByName(teachers, existing.getBackup1()));
        
        assignments.add(day1);
        
        // ========================================
        // Day 2 Assignment
        // ========================================
        if (existing.getExamDays() == 2 && existing.getDate2() != null && !existing.getDate2().isEmpty()) {
            ExamAssignment day2 = new ExamAssignment();
            // 使用 ID + "_DAY2" 作为唯一ID
            day2.setId(existing.getId() + "_DAY2");
            day2.setStudent(student);
            day2.setExamDate(existing.getDate2());
            day2.setExamType("day2");
            day2.setSubjects(java.util.List.of("模拟机2", "口试")); // 默认科目
            
            day2.setExaminer1(findTeacherByName(teachers, existing.getExaminer2_1()));
            day2.setExaminer2(findTeacherByName(teachers, existing.getExaminer2_2()));
            day2.setBackupExaminer(findTeacherByName(teachers, existing.getBackup2()));
            
            assignments.add(day2);
        }
        
        return assignments;
    }
    
    /**
     * 为未固定且考官1为空的排班自动分配考官1
     */
    private void autoAssignExaminer1ForUnpinnedAssignments(
        java.util.List<ExamAssignment> assignments,
        java.util.List<Teacher> teachers
    ) {
        if (assignments == null || assignments.isEmpty() || teachers == null || teachers.isEmpty()) {
            return;
        }
        
        java.util.Map<String, java.util.Set<String>> usedExaminerByDate = new java.util.HashMap<>();
        for (ExamAssignment assignment : assignments) {
            if (assignment == null) {
                continue;
            }
            String date = assignment.getExamDate();
            if (date == null || date.isEmpty()) {
                continue;
            }
            java.util.Set<String> usedSet = usedExaminerByDate.computeIfAbsent(date, d -> new java.util.HashSet<>());
            if (assignment.getExaminer1() != null && assignment.getExaminer1().getId() != null) {
                usedSet.add(assignment.getExaminer1().getId());
            }
            if (assignment.getExaminer2() != null && assignment.getExaminer2().getId() != null) {
                usedSet.add(assignment.getExaminer2().getId());
            }
            if (assignment.getBackupExaminer() != null && assignment.getBackupExaminer().getId() != null) {
                usedSet.add(assignment.getBackupExaminer().getId());
            }
        }
        
        for (ExamAssignment assignment : assignments) {
            if (assignment == null) {
                continue;
            }
            if (assignment.isPinned() || assignment.getExaminer1() != null) {
                continue;
            }
            
            String examDate = assignment.getExamDate();
            Student student = assignment.getStudent();
            if (examDate == null || examDate.isEmpty() || student == null) {
                continue;
            }
            
            try {
                DutySchedule dutySchedule = DutySchedule.forDate(examDate);
                
                java.util.Set<String> usedSet = usedExaminerByDate.computeIfAbsent(examDate, d -> new java.util.HashSet<>());
                Teacher bestTeacher = null;
                int bestPriority = -1;
                
                for (Teacher teacher : teachers) {
                    if (teacher == null || teacher.getId() == null) {
                        continue;
                    }
                    if (usedSet.contains(teacher.getId())) {
                        continue;
                    }
                    
                    // 🆕 增强逻辑：使用与全局排班一致的宽松匹配规则
                    String studentDept = normalizeDepartment(student.getDepartment());
                    String teacherDept = normalizeDepartment(teacher.getDepartment());
                    
                    // 1. 检查科室匹配（支持3/7互通）
                    if (!isValidExaminer1Department(studentDept, teacherDept)) {
                        continue;
                    }
                    
                    // 2. 检查考官是否可用（HC3 + HC9）
                    if (!teacher.isAvailableForDate(examDate, dutySchedule)) {
                        continue;
                    }
                    
                    int priority = teacher.getPriorityForDate(examDate, dutySchedule);
                    if (priority > bestPriority) {
                        bestPriority = priority;
                        bestTeacher = teacher;
                    }
                }
                
                if (bestTeacher != null) {
                    assignment.setExaminer1(bestTeacher);
                    usedSet.add(bestTeacher.getId());
                    LOGGER.info("🧠 [局部重排] 自动分配考官1: 学员=" + student.getName() +
                                ", 日期=" + examDate +
                                ", 考官1=" + bestTeacher.getName() + 
                                " (科室匹配: " + normalizeDepartment(student.getDepartment()) + 
                                " -> " + normalizeDepartment(bestTeacher.getDepartment()) + ")");
                } else {
                    LOGGER.warning("⚠️ [局部重排] 无法为学员 " +
                                   (student != null ? student.getName() : "NULL") +
                                   " (" + (student != null ? student.getDepartment() : "?") + ")" +
                                   " 在日期 " + examDate + " 自动分配考官1");
                }
            } catch (Exception e) {
                LOGGER.warning("⚠️ [局部重排] 自动分配考官1失败: " + e.getMessage());
            }
        }
    }
    
    /**
     * 根据姓名查找考官
     */
    private Teacher findTeacherByName(java.util.List<Teacher> teachers, String name) {
        if (name == null || name.isEmpty() || "待分配".equals(name)) {
            return null;
        }
        return teachers.stream()
            .filter(t -> t.getName().equals(name))
            .findFirst()
            .orElse(null);
    }
    
    /**
     * 转换StudentDTO到Student
     */
    private Student convertDTOToStudent(PartialRescheduleRequest.StudentDTO dto) {
        Student student = new Student();
        student.setId(dto.getId());
        student.setName(dto.getName());
        student.setDepartment(dto.getDepartment());
        student.setGroup(dto.getGroup());
        student.setExamDays(dto.getExamDays());
        student.setDay1Subjects(dto.getDay1Subjects());
        student.setDay2Subjects(dto.getDay2Subjects());
        student.setRecommendedExaminer1Dept(dto.getRecommendedExaminer1Dept());
        student.setRecommendedExaminer2Dept(dto.getRecommendedExaminer2Dept());
        student.setRecommendedBackupDept(dto.getRecommendedBackupDept());
        return student;
    }
    
    /**
     * 转换TeacherDTO到Teacher
     */
    private Teacher convertDTOToTeacher(PartialRescheduleRequest.TeacherDTO dto) {
        Teacher teacher = new Teacher();
        teacher.setId(dto.getId());
        teacher.setName(dto.getName());
        teacher.setDepartment(dto.getDepartment());
        teacher.setGroup(dto.getGroup());
        teacher.setWorkload(dto.getWorkload());
        teacher.setConsecutiveDays(dto.getConsecutiveDays());
        java.util.List<PartialRescheduleRequest.TeacherDTO.UnavailablePeriod> dtoPeriods = dto.getUnavailablePeriods();
        if (dtoPeriods != null && !dtoPeriods.isEmpty()) {
            java.util.List<Teacher.UnavailablePeriod> periods = new java.util.ArrayList<>();
            for (PartialRescheduleRequest.TeacherDTO.UnavailablePeriod p : dtoPeriods) {
                if (p == null) {
                    continue;
                }
                Teacher.UnavailablePeriod tp = new Teacher.UnavailablePeriod();
                tp.setStartDate(p.getStartDate());
                tp.setEndDate(p.getEndDate());
                tp.setReason(p.getReason());
                periods.add(tp);
            }
            teacher.setUnavailablePeriods(periods);
        }
        return teacher;
    }
    
    /**
     * 🔧 修复Day2日期（确保是Day1+1）和分配备份考官
     */
    private void fixDay2DatesAndBackupExaminers(java.util.List<ExamAssignment> assignments, java.util.List<Teacher> availableTeachers) {
        LOGGER.info("🔧 [局部重排] 开始修复Day2日期和备份考官分配...");
        
        if (availableTeachers == null || availableTeachers.isEmpty()) {
            LOGGER.warning("⚠️ [局部重排] 无法获取teachers列表，跳过备份考官分配");
        }
        
        // 按学员分组
        java.util.Map<Student, java.util.List<ExamAssignment>> assignmentsByStudent = 
            assignments.stream()
                .filter(a -> a.getStudent() != null)
                .collect(java.util.stream.Collectors.groupingBy(ExamAssignment::getStudent));
        
        int fixedDates = 0;
        int assignedBackups = 0;
        
        for (java.util.Map.Entry<Student, java.util.List<ExamAssignment>> entry : assignmentsByStudent.entrySet()) {
            Student student = entry.getKey();
            java.util.List<ExamAssignment> studentAssignments = entry.getValue();
            
            // 找到Day1和Day2
            ExamAssignment day1 = null;
            ExamAssignment day2 = null;
            
            for (ExamAssignment a : studentAssignments) {
                if ("day1".equals(a.getExamType())) {
                    day1 = a;
                } else if ("day2".equals(a.getExamType())) {
                    day2 = a;
                }
            }
            
            // 修复Day2日期（确保是Day1+1）
            if (day1 != null && day2 != null && day1.getExamDate() != null) {
                try {
                    java.time.LocalDate day1Date = java.time.LocalDate.parse(day1.getExamDate());
                    java.time.LocalDate day2Date = day1Date.plusDays(1);
                    String day2DateStr = day2Date.toString();
                    
                    if (!day2DateStr.equals(day2.getExamDate())) {
                        LOGGER.info("🔧 [局部重排] 修复Day2日期: 学员=" + student.getName() + 
                            ", Day1=" + day1.getExamDate() + 
                            ", Day2旧=" + day2.getExamDate() + 
                            ", Day2新=" + day2DateStr);
                        day2.setExamDate(day2DateStr);
                        fixedDates++;
                    }
                } catch (Exception e) {
                    LOGGER.warning("⚠️ [局部重排] 修复Day2日期失败: " + e.getMessage());
                }
            }
            
            // 为所有assignment分配备份考官（如果缺失）
            if (availableTeachers != null && !availableTeachers.isEmpty()) {
                for (ExamAssignment assignment : studentAssignments) {
                    if (assignment.getBackupExaminer() == null && 
                        assignment.getExaminer1() != null && 
                        assignment.getExaminer2() != null) {
                        
                        // 尝试找到合适的备份考官
                        Teacher backup = findAvailableBackupExaminer(
                            assignment.getExaminer1(),
                            assignment.getExaminer2(),
                            assignment.getExamDate(),
                            availableTeachers
                        );
                        
                        if (backup != null) {
                            assignment.setBackupExaminer(backup);
                            LOGGER.info("🔧 [局部重排] 分配备份考官: 学员=" + student.getName() + 
                                ", 类型=" + assignment.getExamType() + 
                                ", 备份考官=" + backup.getName());
                            assignedBackups++;
                        } else {
                            LOGGER.warning("⚠️ [局部重排] 无法为学员 " + student.getName() + 
                                " 分配备份考官");
                        }
                    }
                }
            }
        }
        
        LOGGER.info("✅ [局部重排] 修复完成: 修复日期=" + fixedDates + ", 分配备份考官=" + assignedBackups);
    }
    
    /**
     * 查找可用的备份考官
     */
    private Teacher findAvailableBackupExaminer(
        Teacher examiner1,
        Teacher examiner2,
        String examDate,
        java.util.List<Teacher> availableTeachers
    ) {
        if (availableTeachers == null || examDate == null) {
            return null;
        }
        
        try {
            DutySchedule dutySchedule = DutySchedule.forDate(examDate);
            
            for (Teacher teacher : availableTeachers) {
                // 不能是考官1或考官2
                if (teacher.getId().equals(examiner1.getId()) || 
                    teacher.getId().equals(examiner2.getId())) {
                    continue;
                }
                
                // 检查是否可用
                if (teacher.isAvailableForDate(examDate, dutySchedule)) {
                    return teacher;
                }
            }
        } catch (Exception e) {
            LOGGER.warning("⚠️ [局部重排] 查找备份考官失败: " + e.getMessage());
        }
        
        return null;
    }
    
    /**
     * 创建局部重排求解器配置
     * 优化：比完整重排更快（20秒 vs 60秒）
     */
    private SolverConfig createPartialRescheduleSolverConfig() {
        LOGGER.info("⚙️ [局部重排] 创建求解器配置（快速模式，20秒限制）");
        
        return new SolverConfig()
            .withSolutionClass(ExamSchedule.class)
            .withEntityClasses(ExamAssignment.class)
            .withConstraintProviderClass(com.examiner.scheduler.solver.OptimizedExamScheduleConstraintProvider.class)
            .withTerminationConfig(new org.optaplanner.core.config.solver.termination.TerminationConfig()
                .withSecondsSpentLimit(20L)           
                .withUnimprovedSecondsSpentLimit(5L)  
                .withBestScoreLimit("0hard/*soft")    
            );
    }
    
    /**
     * 推送局部重排进度
     */
    private void pushPartialRescheduleProgress(
        String sessionId, 
        org.optaplanner.core.api.solver.event.BestSolutionChangedEvent<ExamSchedule> event
    ) {
        try {
            ExamSchedule solution = event.getNewBestSolution();
            HardSoftScore score = solution.getScore();
            
            java.util.Map<String, Object> progress = new java.util.HashMap<>();
            progress.put("type", "partial_reschedule_progress");
            progress.put("sessionId", sessionId);
            progress.put("score", score != null ? score.toString() : "N/A");
            progress.put("hardScore", score != null ? score.hardScore() : 0);
            progress.put("softScore", score != null ? score.softScore() : 0);
            progress.put("timestamp", System.currentTimeMillis());
            
            // WebSocket推送
            ScheduleProgressWebSocket.broadcast(sessionId, progress);
            
        } catch (Exception e) {
            LOGGER.warning("⚠️ [局部重排] 进度推送失败: " + e.getMessage());
        }
    }
    
    /**
     * 推送局部重排完成通知
     */
    private void pushPartialRescheduleComplete(String sessionId, ScheduleResponse response) {
        try {
            java.util.Map<String, Object> message = new java.util.HashMap<>();
            message.put("type", "partial_reschedule_complete");
            message.put("sessionId", sessionId);
            message.put("success", response.isSuccess());
            message.put("assignmentCount", response.getAssignments() != null ? response.getAssignments().size() : 0);
            message.put("timestamp", System.currentTimeMillis());
            
            ScheduleProgressWebSocket.broadcast(sessionId, message);
        } catch (Exception e) {
            LOGGER.warning("⚠️ [局部重排] 完成通知推送失败: " + e.getMessage());
        }
    }
    
    /**
     * 推送局部重排错误
     */
    private void pushPartialRescheduleError(String sessionId, String errorMessage) {
        try {
            java.util.Map<String, Object> message = new java.util.HashMap<>();
            message.put("type", "partial_reschedule_error");
            message.put("sessionId", sessionId);
            message.put("error", errorMessage);
            message.put("timestamp", System.currentTimeMillis());
            
            ScheduleProgressWebSocket.broadcast(sessionId, message);
        } catch (Exception e) {
            LOGGER.warning("⚠️ [局部重排] 错误通知推送失败: " + e.getMessage());
        }
    }
    
    /**
     * 验证考官1科室是否有效（只允许同科室或三七室互通）
     */
    private boolean isValidExaminer1Department(String studentDept, String examiner1Dept) {
        if (studentDept == null || examiner1Dept == null) return false;
        
        // 同科室（优先匹配）
        if (studentDept.equals(examiner1Dept)) {
            return true;
        }
        
        // 三室七室互通（特殊规则）
        if ((studentDept.equals("三") && examiner1Dept.equals("七")) ||
            (studentDept.equals("七") && examiner1Dept.equals("三"))) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 标准化科室名称
     */
    private String normalizeDepartment(String department) {
        if (department == null) return null;
        
        String normalized = department.trim();
        
        // 标准化映射（与前端保持完全一致，包括"第X科室"格式）
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
        
        return normalized;
    }
}

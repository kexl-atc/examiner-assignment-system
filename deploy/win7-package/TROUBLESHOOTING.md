# 考官排班系统 - 故障排查指南

## 目录

1. [错误代码对照表](#错误代码对照表)
2. [常见问题排查](#常见问题排查)
3. [诊断工具](#诊断工具)
4. [日志分析](#日志分析)
5. [恢复步骤](#恢复步骤)

---

## 错误代码对照表

### 环境错误 (1-10)

| 错误代码 | 错误名称 | 严重程度 | 可能原因 | 解决方案 |
|---------|---------|---------|---------|---------|
| 1 | 磁盘空间不足 | 严重 | 磁盘可用空间少于500MB | 清理磁盘空间或更换磁盘 |
| 2 | 操作系统版本不兼容 | 严重 | 操作系统不是Windows 7或更高 | 升级操作系统 |
| 3 | 网络连接失败 | 中等 | 本地回环接口不可用 | 检查网络配置 |
| 4 | 端口被占用 | 中等 | 端口8081或8082被其他程序占用 | 停止占用端口的程序或更改端口配置 |

### 依赖错误 (11-20)

| 错误代码 | 错误名称 | 严重程度 | 可能原因 | 解决方案 |
|---------|---------|---------|---------|---------|
| 11 | Java运行时未找到 | 严重 | java-runtime目录缺失或损坏 | 重新安装Java运行时 |
| 12 | 后端JAR文件未找到 | 严重 | quarkus-run.jar文件缺失 | 重新部署后端文件 |
| 13 | 前端文件未找到 | 严重 | supervisor/frontend目录缺失 | 重新部署前端文件 |
| 14 | HTTP服务器文件未找到 | 严重 | SimpleHttpServer.java文件缺失 | 重新部署HTTP服务器文件 |

### 部署错误 (21-30)

| 错误代码 | 错误名称 | 严重程度 | 可能原因 | 解决方案 |
|---------|---------|---------|---------|---------|
| 21 | 编译HTTP服务器失败 | 中等 | Java编译器错误或文件损坏 | 检查Java环境和文件完整性 |
| 22 | 启动后端服务失败 | 中等 | 后端JAR文件损坏或配置错误 | 检查后端日志和配置 |
| 23 | 启动前端服务失败 | 中等 | HTTP服务器编译失败或端口冲突 | 检查HTTP服务器和端口配置 |
| 24 | 健康检查失败 | 中等 | 服务未在预期时间内启动 | 检查服务日志和系统资源 |

### 验证错误 (31-40)

| 错误代码 | 错误名称 | 严重程度 | 可能原因 | 解决方案 |
|---------|---------|---------|---------|---------|
| 31 | 版本不匹配 | 轻微 | 当前版本低于目标版本 | 升级到目标版本 |
| 32 | 部署超时 | 中等 | 部署过程超过超时时间 | 增加超时时间或检查系统性能 |

### 回滚错误 (41-50)

| 错误代码 | 错误名称 | 严重程度 | 可能原因 | 解决方案 |
|---------|---------|---------|---------|---------|
| 41 | 备份未找到 | 严重 | 指定的备份不存在 | 检查备份列表或创建新备份 |
| 42 | 恢复失败 | 严重 | 备份文件损坏或恢复过程出错 | 检查备份完整性或使用其他备份 |

---

## 常见问题排查

### 问题 1: 部署脚本运行失败，提示"需要管理员权限"

**症状**:
```
[ERROR] 需要管理员权限才能配置任务计划程序
[INFO] 请右键点击此脚本，选择"以管理员身份运行"
```

**原因**: 脚本需要管理员权限来配置任务计划程序和停止系统服务。

**解决方案**:
1. 右键点击脚本文件
2. 选择"以管理员身份运行"
3. 如果仍然失败，检查用户账户控制(UAC)设置

### 问题 2: 端口8081或8082被占用

**症状**:
```
[WARNING] 端口8081已被占用
[WARNING] 端口8082已被占用
```

**原因**: 其他程序正在使用这些端口。

**解决方案**:
1. 查找占用端口的进程:
   ```cmd
   netstat -ano | findstr ":8081"
   netstat -ano | findstr ":8082"
   ```
2. 记下进程ID (PID)
3. 停止占用端口的进程:
   ```cmd
   taskkill /F /PID [进程ID]
   ```
4. 重新运行部署脚本

### 问题 3: Java运行时未找到

**症状**:
```
[ERROR] Java运行时未找到: C:\ExaminerAssignmentSystem\java-runtime\bin\javaw.exe
```

**原因**: Java运行时目录缺失或损坏。

**解决方案**:
1. 检查java-runtime目录是否存在
2. 如果目录存在但文件损坏，重新复制Java运行时
3. 如果目录不存在，从原始安装包中恢复

### 问题 4: 后端服务启动失败

**症状**:
```
[WARNING] 后端服务可能未就绪，但继续部署
[ERROR] 后端服务未监听端口8082
```

**原因**: 后端JAR文件损坏、配置错误或系统资源不足。

**解决方案**:
1. 检查后端日志文件:
   ```cmd
   type C:\ExaminerAssignmentSystem\backend.log
   ```
2. 检查系统内存使用情况
3. 尝试手动启动后端服务:
   ```cmd
   cd C:\ExaminerAssignmentSystem
   java-runtime\bin\javaw.exe -Xmx512m -Dquarkus.profile=prod -Dquarkus.http.host=0.0.0.0 -Dquarkus.http.port=8082 -jar supervisor\backend\app\quarkus-run.jar
   ```
4. 如果仍然失败，尝试回滚到上一个版本

### 问题 5: 任务计划程序任务未在启动时运行

**症状**: 系统启动后服务未自动启动。

**原因**: 任务计划程序配置错误或服务未启用。

**解决方案**:
1. 打开任务计划程序 (`taskschd.msc`)
2. 检查 `ExaminerAssignmentSystem` 任务是否存在
3. 检查任务是否已启用
4. 检查任务历史记录查看错误信息
5. 手动运行任务测试:
   ```cmd
   schtasks /run /tn ExaminerAssignmentSystem
   ```
6. 检查任务计划程序服务是否正在运行:
   ```cmd
   sc query Schedule
   ```

### 问题 6: 部署超时

**症状**:
```
[ERROR] 部署超时
```

**原因**: 系统性能不足或服务启动时间过长。

**解决方案**:
1. 检查系统资源使用情况
2. 增加部署超时时间（编辑deploy.bat中的DEPLOY_TIMEOUT变量）
3. 检查是否有其他进程占用大量资源
4. 尝试在系统负载较低时进行部署

### 问题 7: 前端页面无法访问

**症状**: 浏览器无法打开 `http://127.0.0.1:8081`

**原因**: 前端服务未启动或端口配置错误。

**解决方案**:
1. 检查前端服务是否运行:
   ```cmd
   netstat -ano | findstr ":8081"
   ```
2. 检查前端日志:
   ```cmd
   type C:\ExaminerAssignmentSystem\frontend.log
   ```
3. 检查SimpleHttpServer.class是否存在
4. 如果不存在，重新编译:
   ```cmd
   cd C:\ExaminerAssignmentSystem
   java-runtime\bin\javac.exe SimpleHttpServer.java
   ```

---

## 诊断工具

### 1. 系统信息检查

```cmd
systeminfo
```

检查操作系统版本、内存、磁盘空间等信息。

### 2. 端口状态检查

```cmd
netstat -ano | findstr ":8081"
netstat -ano | findstr ":8082"
```

检查端口8081和8082的监听状态。

### 3. 进程检查

```cmd
tasklist | findstr /i "java"
```

检查Java进程是否正在运行。

### 4. 服务状态检查

```cmd
sc query Schedule
```

检查任务计划程序服务状态。

### 5. 磁盘空间检查

```cmd
wmic logicaldisk get name,freespace,size
```

检查磁盘可用空间。

### 6. 网络连接检查

```cmd
ping -n 1 127.0.0.1
```

检查本地回环接口是否正常。

---

## 日志分析

### 日志文件位置

所有日志文件位于: `C:\Deployment\logs\`

### 日志文件类型

| 日志文件 | 说明 |
|---------|------|
| deploy_*.log | 部署脚本日志 |
| setup-task_*.log | 任务计划程序配置日志 |
| exception-handler_*.log | 异常处理日志 |
| deploy-status.txt | 部署状态文件 |
| alerts.log | 警报日志 |
| error-report-*.txt | 错误报告 |

### 查看最新日志

```cmd
cd C:\Deployment\logs
dir /O-D
type deploy_YYYYMMDD_HHMMSS.log
```

### 日志级别说明

- `[INFO]`: 信息性消息
- `[WARNING]`: 警告消息
- `[ERROR]`: 错误消息
- `[ALERT]`: 警报消息

### 常见日志模式

#### 成功部署
```
[INFO] 部署成功完成！
[INFO] 后端服务: http://127.0.0.1:8082
[INFO] 前端服务: http://127.0.0.1:8081
```

#### 部署失败
```
[ERROR] 部署失败，错误代码: X
[ERROR] 错误信息: ...
```

#### 服务启动超时
```
[WARNING] 后端服务可能未就绪，但继续部署
[WARNING] 前端服务可能未就绪，但继续部署
```

---

## 恢复步骤

### 步骤 1: 停止所有服务

```cmd
taskkill /F /IM java.exe
taskkill /F /IM javaw.exe
```

### 步骤 2: 列出可用备份

```cmd
cd C:\ExaminerAssignmentSystem
deploy-exception-handler.bat list-backups
```

### 步骤 3: 选择备份进行回滚

```cmd
deploy-exception-handler.bat manual-rollback 1
```

（将 `1` 替换为要回滚的备份索引）

### 步骤 4: 验证回滚结果

```cmd
type C:\Deployment\logs\deploy-status.txt
```

状态应为 `SUCCESS`。

### 步骤 5: 检查服务状态

```cmd
netstat -ano | findstr ":8081"
netstat -ano | findstr ":8082"
```

### 步骤 6: 访问前端页面验证

打开浏览器，访问: `http://127.0.0.1:8081`

---

## 高级故障排查

### 生成错误报告

```cmd
deploy-exception-handler.bat report [error_code] "[error_message]"
```

错误报告将包含:
- 系统信息
- 磁盘信息
- 网络信息
- 进程信息
- 端口信息
- 最近日志

### 清理失败的部署

```cmd
deploy-exception-handler.bat cleanup
```

### 查看错误代码说明

```cmd
deploy-exception-handler.bat show-codes
```

---

## 联系支持

如果以上步骤无法解决问题，请收集以下信息:

1. 错误报告 (`C:\Deployment\logs\error-report-*.txt`)
2. 部署日志 (`C:\Deployment\logs\deploy_*.log`)
3. 系统信息 (`systeminfo` 输出)
4. 错误代码和错误消息

---

## 附录

### A. 快速诊断命令

```cmd
REM 检查端口
netstat -ano | findstr ":8081 :8082"

REM 检查进程
tasklist | findstr /i "java"

REM 检查磁盘空间
wmic logicaldisk get name,freespace,size

REM 检查任务计划程序服务
sc query Schedule

REM 检查部署状态
type C:\Deployment\logs\deploy-status.txt

REM 查看最新日志
dir C:\Deployment\logs /O-D
```

### B. 常用恢复命令

```cmd
REM 停止服务
taskkill /F /IM java.exe
taskkill /F /IM javaw.exe

REM 列出备份
deploy-exception-handler.bat list-backups

REM 回滚到最新备份
deploy-exception-handler.bat manual-rollback 1

REM 重新部署
deploy.bat

REM 手动运行任务
schtasks /run /tn ExaminerAssignmentSystem
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-01-30

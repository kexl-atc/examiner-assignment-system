# 考官排班系统 - 安装配置手册

## 目录

1. [系统要求](#系统要求)
2. [安装步骤](#安装步骤)
3. [配置任务计划程序](#配置任务计划程序)
4. [验证安装](#验证安装)
5. [卸载说明](#卸载说明)

---

## 系统要求

### 硬件要求

- **处理器**: Intel Core 2 Duo 或更高
- **内存**: 至少 2GB RAM（推荐 4GB）
- **磁盘空间**: 至少 500MB 可用空间
- **网络**: 本地回环接口（127.0.0.1）

### 软件要求

- **操作系统**: Windows 7 或更高版本
- **权限**: 管理员权限（用于配置任务计划程序）

### 端口要求

- **前端服务**: 8081
- **后端服务**: 8082

---

## 安装步骤

### 步骤 1: 准备安装包

1. 将 `Win7-Offline-Package` 文件夹复制到目标计算机
2. 建议安装路径: `C:\ExaminerAssignmentSystem`

### 步骤 2: 验证文件完整性

确保以下文件和目录存在：

```
Win7-Offline-Package/
├── java-runtime/              # Java运行时环境
├── supervisor/
│   ├── backend/
│   │   └── app/
│   │       └── quarkus-run.jar
│   └── frontend/
│       └── index.html
├── data/
│   └── examiner_db.mv.db
├── deploy.bat                 # 部署脚本
├── deploy-controller.bat     # 部署流程控制脚本
├── deploy-exception-handler.bat  # 异常处理脚本
├── setup-task.bat            # 任务计划程序配置脚本
├── SimpleHttpServer.java      # 前端HTTP服务器
└── VERSION.txt               # 版本信息
```

### 步骤 3: 手动测试部署

1. 以管理员身份打开命令提示符
2. 导航到安装目录:
   ```cmd
   cd C:\ExaminerAssignmentSystem
   ```
3. 运行部署脚本:
   ```cmd
   deploy.bat
   ```
4. 观察输出，确保所有步骤都成功完成

### 步骤 4: 验证服务运行

1. 打开浏览器，访问: `http://127.0.0.1:8081`
2. 确认前端页面正常加载
3. 检查后端服务: `http://127.0.0.1:8082`

---

## 配置任务计划程序

### 步骤 1: 以管理员身份运行配置脚本

1. 右键点击 `setup-task.bat`
2. 选择"以管理员身份运行"

### 步骤 2: 验证任务创建

1. 打开任务计划程序:
   - 按 `Win + R`，输入 `taskschd.msc`，按回车
2. 在任务计划程序库中查找 `ExaminerAssignmentSystem` 任务
3. 双击任务查看属性

### 步骤 3: 验证任务配置

任务应具有以下配置:

- **名称**: ExaminerAssignmentSystem
- **触发器**: 系统启动时
- **运行账户**: SYSTEM
- **权限级别**: 最高
- **操作**: 运行 `deploy.bat`
- **重试策略**: 失败后1分钟重试，最多3次

### 步骤 4: 手动测试任务

1. 在任务计划程序中右键点击任务
2. 选择"运行"
3. 检查日志目录: `C:\Deployment\logs`

---

## 验证安装

### 检查服务状态

打开命令提示符，运行以下命令:

```cmd
netstat -ano | findstr ":8081"
netstat -ano | findstr ":8082"
```

应看到两个端口都处于 `LISTENING` 状态。

### 检查日志文件

日志文件位于: `C:\Deployment\logs\`

查看最新的部署日志:
```cmd
dir C:\Deployment\logs /O-D
type C:\Deployment\logs\deploy_YYYYMMDD_HHMMSS.log
```

### 检查部署状态

查看部署状态文件:
```cmd
type C:\Deployment\logs\deploy-status.txt
```

状态应为 `SUCCESS`。

---

## 卸载说明

### 步骤 1: 停止服务

运行以下命令停止所有服务:
```cmd
taskkill /F /IM java.exe
taskkill /F /IM javaw.exe
```

### 步骤 2: 删除任务计划程序任务

1. 打开任务计划程序
2. 找到 `ExaminerAssignmentSystem` 任务
3. 右键点击，选择"删除"

或使用命令行:
```cmd
schtasks /delete /tn ExaminerAssignmentSystem /f
```

### 步骤 3: 删除安装文件

删除整个安装目录:
```cmd
rmdir /S /Q C:\ExaminerAssignmentSystem
```

### 步骤 4: 清理日志和备份（可选）

删除日志和备份目录:
```cmd
rmdir /S /Q C:\Deployment
```

---

## 常见问题

### Q: 部署脚本运行失败，提示"需要管理员权限"

**A**: 右键点击脚本，选择"以管理员身份运行"。

### Q: 端口8081或8082被占用

**A**: 检查是否有其他程序占用了这些端口，可以使用以下命令查找:
```cmd
netstat -ano | findstr ":8081"
netstat -ano | findstr ":8082"
```

### Q: 任务计划程序任务未在启动时运行

**A**: 检查以下内容:
1. 任务是否已启用
2. 运行账户是否为SYSTEM
3. 任务计划程序服务是否正在运行

### Q: 如何查看部署日志？

**A**: 日志文件位于 `C:\Deployment\logs\` 目录，使用以下命令查看:
```cmd
dir C:\Deployment\logs /O-D
type C:\Deployment\logs\deploy_YYYYMMDD_HHMMSS.log
```

---

## 技术支持

如遇到问题，请查看:
1. 部署日志: `C:\Deployment\logs\`
2. 错误报告: `C:\Deployment\logs\error-report-*.txt`
3. 故障排查指南: `TROUBLESHOOTING.md`

---

## 附录

### A. 命令行参考

#### 部署命令
```cmd
deploy.bat
```

#### 部署流程控制命令
```cmd
deploy-controller.bat
```

#### 异常处理命令
```cmd
deploy-exception-handler.bat handle [error_code] [error_msg]
deploy-exception-handler.bat list-backups
deploy-exception-handler.bat manual-rollback [backup_index]
deploy-exception-handler.bat cleanup
deploy-exception-handler.bat report [error_code] [error_msg]
deploy-exception-handler.bat show-codes
```

#### 任务计划程序命令
```cmd
schtasks /create /tn ExaminerAssignmentSystem /tr "C:\ExaminerAssignmentSystem\deploy.bat" /sc onstart /ru SYSTEM /rl highest /f
schtasks /run /tn ExaminerAssignmentSystem
schtasks /delete /tn ExaminerAssignmentSystem /f
```

### B. 目录结构

```
C:\ExaminerAssignmentSystem\
├── java-runtime\              # Java运行时环境
├── supervisor\
│   ├── backend\
│   │   └── app\
│   │       └── quarkus-run.jar
│   └── frontend\
│       └── index.html
├── data\
│   └── examiner_db.mv.db
├── deploy.bat                 # 部署脚本
├── deploy-controller.bat     # 部署流程控制脚本
├── deploy-exception-handler.bat  # 异常处理脚本
├── setup-task.bat            # 任务计划程序配置脚本
├── SimpleHttpServer.java      # 前端HTTP服务器
└── VERSION.txt               # 版本信息

C:\Deployment\
├── logs\                     # 日志目录
│   ├── deploy_*.log         # 部署日志
│   ├── setup-task_*.log     # 任务配置日志
│   ├── exception-handler_*.log  # 异常处理日志
│   ├── deploy-status.txt    # 部署状态
│   └── alerts.log           # 警报日志
└── backup\                  # 备份目录
    └── backup_*\            # 版本备份
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-01-30

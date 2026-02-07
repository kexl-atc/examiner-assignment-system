# 构建基准数据

测量时间：2026-02-06 10:20

## 环境信息

- **Node.js**: v22.16.0
- **npm**: 10.9.2
- **操作系统**: Windows
- **项目版本**: 8.0.15

## 生产构建性能

### 构建时间
- **总时间**: 17.2 秒

### 包大小统计

**总体大小:**
- **dist 目录**: 4.57 MB

**JavaScript 文件:**
- **文件数量**: 28 个
- **总大小**: 4087.71 KB (约 3.99 MB)
- **平均大小**: 145.99 KB/文件

**CSS 文件:**
- **文件数量**: 6 个
- **总大小**: 555.51 KB (约 0.54 MB)
- **平均大小**: 92.59 KB/文件

## 优化目标

基于当前基准数据，设定以下优化目标：

### 构建时间
- **目标**: 减少 5-10%
- **预期**: 15.5 - 16.3 秒

### 包大小
- **目标**: 减少 10-15%
- **预期 dist 大小**: 3.88 - 4.11 MB
- **预期 JS 大小**: 3474.55 - 3678.95 KB

### 代码质量
- **消除重复导入**: SchedulesPage.vue
- **统一配置命名**: 解决 PERFORMANCE_CONFIG 冲突
- **减少配置重复**: Vite 配置提取公共部分

## 测量方法

```powershell
# 构建时间测量
$startTime = Get-Date
npm run build
$endTime = Get-Date
$buildTime = ($endTime - $startTime).TotalSeconds

# 包大小测量
$distSize = (Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$jsFiles = Get-ChildItem "dist\assets\js" -Filter "*.js" | Measure-Object -Property Length -Sum
$cssFiles = Get-ChildItem "dist\assets\css" -Filter "*.css" | Measure-Object -Property Length -Sum
```

## 后续对比

完成优化后，将使用相同方法重新测量，并对比：
- 构建时间变化
- 包大小变化
- 文件数量变化
- 代码质量改进

---

**注：此基准数据将用于验证优化效果**

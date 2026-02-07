# 代码使用情况分析报告

生成时间：2026-02-06

## 1. 存储服务使用情况

### unifiedStorageService 引用

**静态导入（2处）：**

1. `src/pages/TeachersPage.vue` (第607行)
   ```typescript
   import { 
     unifiedStorageService,
     type UnifiedStorageConfig,
     type StorageStats,
   } from '../services/unifiedStorageService'
   ```

2. `src/pages/SchedulesPage.vue` (第1733-1734行)
   ```typescript
   import { unifiedStorageService as storageService, type ScheduleResultRecord } from '../services/unifiedStorageService'
   import { unifiedStorageService } from '../services/unifiedStorageService'
   ```
   ⚠️ **注意：此文件有重复导入！**

**动态导入（2处）：**

3. `src/pages/HomePage2.vue` (第360行)
   ```typescript
   const { unifiedStorageService: storageService } = await import('../services/unifiedStorageService')
   ```

4. `src/components/TeacherDistribution.vue` (第252行)
   ```typescript
   const { unifiedStorageService: storageService } = await import('../services/unifiedStorageService')
   ```

### storageService (旧版本) 引用

**结果：未找到任何引用**

✅ 好消息：`src/utils/storageService.ts` 文件不存在，所有代码已经在使用 `unifiedStorageService`

### 存储服务别名导出

`src/services/unifiedStorageService.ts` 已经导出了 `storageService` 别名：
```typescript
// 为了向后兼容，导出 storageService 别名
export const storageService = unifiedStorageService
```

---

## 2. 配置文件使用情况

### 配置文件导入分析

**结果：未找到任何直接导入**

检查了以下模式：
- `from '@/config'`
- `from '../config'`
- `from 'config/'`

⚠️ **发现：配置文件可能未被使用，或者使用了其他导入方式**

### 配置文件内容对比

**src/config/index.ts:**
- 定义了 `PERFORMANCE_CONFIG` (前端性能限制)
- 包含：FRONTEND、MEMORY 配置

**src/config/performance.ts:**
- 也定义了 `PERFORMANCE_CONFIG` (性能监控配置)
- 包含：thresholds、intervals、reporting 配置

❌ **冲突：两个文件都导出了 `PERFORMANCE_CONFIG`，但内容不同**

---

## 3. Vite 配置重复分析

### 重复的配置项

**vite.config.mjs 和 vite.config.production.mjs 共同部分：**

1. **plugins** - 完全相同
   ```javascript
   plugins: [vue()]
   ```

2. **resolve.alias** - 完全相同（6个别名）
   ```javascript
   alias: {
     '@': path.resolve(__dirname, './src'),
     '@config': path.resolve(__dirname, './src/config'),
     '@utils': path.resolve(__dirname, './src/utils'),
     '@composables': path.resolve(__dirname, './src/composables'),
     '@services': path.resolve(__dirname, './src/services'),
     '@types': path.resolve(__dirname, './src/types')
   }
   ```

3. **css** - 完全相同
   ```javascript
   css: {
     postcss: './postcss.config.js',
     devSourcemap: false/true
   }
   ```

4. **optimizeDeps** - 完全相同
   ```javascript
   include: ['vue', 'vue-router', 'pinia', 'axios', ...]
   exclude: ['@iconify/json', 'fsevents']
   ```

5. **define** - 完全相同
   ```javascript
   __APP_VERSION__, __BUILD_TIME__, __ENV__, ...
   ```

6. **esbuild** - 部分相同
   ```javascript
   target: 'es2020'
   ```

**重复代码估算：约 60-70% 的配置是重复的**

---

## 4. 备份目录分析

### 项目内备份目录

**backup/ 目录内容：**
- `backup_周一022601_091615/`
- `backup_周一022601_092723/`
- `backup_周一022601_093035/`
- `backup_周一022601_093327/`
- `backup_周一022601_093737/`
- `backup_周一022601_093902/`
- `backup_周二022601_222343/`
- `backup_周二022601_233031/`
- `refactor_20260130_231028/`

**总计：9个备份目录**

⚠️ **建议：移出项目，减少体积**

---

## 5. 空目录分析

### 发现的空目录

1. `config/tailwind/` - 空目录
2. `config/vite/` - 空目录

**config/ 目录结构：**
```
config/
├── deployment/
│   └── win7/
├── tailwind/     ← 空
└── vite/         ← 空
```

---

## 6. 依赖关系图

### 存储服务依赖

```
unifiedStorageService (src/services/)
├── TeachersPage.vue (静态导入)
├── SchedulesPage.vue (静态导入，重复)
├── HomePage2.vue (动态导入)
└── TeacherDistribution.vue (动态导入)
```

### 配置文件依赖

```
src/config/index.ts (未被使用)
src/config/performance.ts (未被使用)
```

⚠️ **警告：配置文件可能未被实际使用**

---

## 7. 关键发现总结

### ✅ 好消息

1. **没有旧的 storageService** - 所有代码已经使用 `unifiedStorageService`
2. **已有别名导出** - `unifiedStorageService` 已经导出了 `storageService` 别名
3. **备份已完成** - 项目已安全备份到外部目录

### ⚠️ 需要修复的问题

1. **SchedulesPage.vue 重复导入** - 同一个服务导入了两次
2. **配置文件命名冲突** - 两个 `PERFORMANCE_CONFIG` 定义
3. **Vite 配置重复** - 60-70% 的代码重复
4. **备份目录占用空间** - 9个备份目录在项目内
5. **空目录** - 2个空的配置目录

### 📊 预期改进

完成清理后：
- 代码行数减少：约 200-300 行
- 文件数量减少：至少 2 个文件
- 目录数量减少：11 个目录（9个备份 + 2个空目录）
- 配置清晰度：显著提升
- 维护难度：显著降低

---

## 8. 下一步行动

### 优先级 1（立即执行）

1. ✅ 修复 `SchedulesPage.vue` 的重复导入
2. ✅ 提取 Vite 公共配置
3. ✅ 重命名配置文件中的冲突项

### 优先级 2（后续执行）

4. 移出备份目录
5. 删除空目录
6. 更新文档

---

## 附录：构建基准数据

### 当前构建性能

**开发构建：**
- 时间：待测量
- 包大小：待测量

**生产构建：**
- 时间：待测量
- 包大小：待测量

**注：将在任务 3 中测量基准数据**

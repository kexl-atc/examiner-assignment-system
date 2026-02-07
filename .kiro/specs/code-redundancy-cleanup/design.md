# 代码冗余清理设计文档

## 概述

本设计文档详细说明如何系统地清理项目中的代码冗余，建立统一的代码架构，确保修改能够正确生效。

## 架构设计

### 1. 统一存储服务架构

#### 当前问题
- 存在两个存储服务：`storageService.ts` (utils) 和 `unifiedStorageService.ts` (services)
- `SchedulesPage.vue` 同时导入了两个服务，容易混淆
- `storageService` 功能简单但被广泛使用（3处引用）
- `unifiedStorageService` 功能完善但只有1处引用

#### 设计决策
**保留 `unifiedStorageService` 作为唯一的存储服务**

理由：
1. 提供缓存机制，性能更好
2. 包含统计信息，便于监控
3. 支持配置化，扩展性强
4. 添加时间戳，数据追踪更完整

#### 迁移策略
```typescript
// 新的统一导出路径：src/services/storageService.ts
export { unifiedStorageService as storageService } from './unifiedStorageService'
export type { ScheduleResultRecord, StorageStats } from './unifiedStorageService'
```

#### 兼容性保证
- 保持相同的 API 接口
- 类型定义完全兼容
- 渐进式迁移，不破坏现有功能

---

### 2. 配置文件统一架构

#### 当前问题
- `src/config/index.ts` 定义了 `PERFORMANCE_CONFIG`
- `src/config/performance.ts` 也定义了 `PERFORMANCE_CONFIG`
- 两者结构不同，容易混淆

#### 设计决策
**采用分层配置架构**

```
src/config/
├── index.ts           # 主配置入口，导出所有配置
├── api.config.ts      # API 相关配置
├── cache.config.ts    # 缓存配置
├── performance.config.ts  # 性能监控配置（重构）
└── ui.config.ts       # UI 配置
```

#### 配置合并策略
1. `index.ts` 中的 `PERFORMANCE_CONFIG` 重命名为 `PERFORMANCE_LIMITS`（前端性能限制）
2. `performance.ts` 中的配置保持为 `PERFORMANCE_CONFIG`（性能监控配置）
3. 在 `index.ts` 中统一导出，避免命名冲突

```typescript
// src/config/index.ts
export { PERFORMANCE_CONFIG as PERFORMANCE_MONITORING } from './performance.config'
export const PERFORMANCE_LIMITS = { /* 前端性能限制 */ }
```

---

### 3. Vite 配置优化架构

#### 当前问题
- `vite.config.mjs` 和 `vite.config.production.mjs` 有大量重复代码
- 重复内容包括：alias、plugins、optimizeDeps、define 等

#### 设计决策
**提取公共配置，使用配置合并**

```javascript
// vite.config.base.mjs - 公共配置
export const baseConfig = {
  plugins: [vue()],
  resolve: { alias: { /* ... */ } },
  optimizeDeps: { /* ... */ },
  // ... 其他公共配置
}

// vite.config.mjs - 开发环境
import { baseConfig } from './vite.config.base.mjs'
export default defineConfig(({ mode }) => ({
  ...baseConfig,
  server: { /* 开发服务器配置 */ },
  // 开发环境特定配置
}))

// vite.config.production.mjs - 生产环境
import { baseConfig } from './vite.config.base.mjs'
export default defineConfig({
  ...baseConfig,
  build: { /* 生产构建配置 */ },
  // 生产环境特定配置
})
```

#### 配置分离原则
- **公共配置**：alias、plugins、optimizeDeps、define
- **开发配置**：server、proxy、hmr、sourcemap
- **生产配置**：build、terserOptions、manualChunks

---

### 4. 服务层重构架构

#### 当前问题
- 40+ 个服务文件，部分功能重叠
- 直接使用 axios 的服务只有 `learningApi.ts`
- 缺乏统一的 API 调用层

#### 设计决策
**建立三层服务架构**

```
src/services/
├── core/              # 核心服务层
│   ├── api.service.ts      # 统一 API 调用服务
│   ├── storage.service.ts  # 存储服务（重新导出）
│   └── cache.service.ts    # 缓存服务
├── business/          # 业务服务层
│   ├── scheduling/         # 排班相关
│   ├── teacher/            # 考官相关
│   └── student/            # 学员相关
└── utils/             # 工具服务层
    ├── validation/         # 验证服务
    └── transformation/     # 数据转换服务
```

#### API 服务统一设计
```typescript
// src/services/core/api.service.ts
class ApiService {
  private axios: AxiosInstance
  
  constructor() {
    this.axios = axios.create({
      baseURL: API_CONFIG.BACKEND.BASE_URL,
      timeout: API_CONFIG.BACKEND.TIMEOUT,
    })
  }
  
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  // ... 其他方法
}

export const apiService = new ApiService()
```

---

### 5. 项目清理架构

#### 备份目录处理
**策略：移出项目，保留在外部**

```
项目外部/
└── examiner-system-backups/
    └── 2026-01-30/
        ├── backup_周一022601_091615/
        ├── backup_周一022601_092723/
        └── ...
```

理由：
1. 减少项目体积
2. 避免版本控制混乱
3. 保留历史记录以防万一

#### 空目录清理
删除以下空目录：
- `config/tailwind/`
- `config/vite/`

---

### 6. 代码组织规范

#### 文件命名规范
```
服务文件：{功能}.service.ts
工具文件：{功能}.util.ts
类型文件：{功能}.types.ts
配置文件：{功能}.config.ts
```

#### 导入顺序规范
```typescript
// 1. 外部依赖
import { ref, computed } from 'vue'
import axios from 'axios'

// 2. 类型导入
import type { Teacher, Student } from '@/types'

// 3. 核心服务
import { apiService } from '@/services/core/api.service'

// 4. 业务服务
import { schedulingService } from '@/services/business/scheduling'

// 5. 工具函数
import { formatDate } from '@/utils/dateUtils'

// 6. 组件
import MyComponent from '@/components/MyComponent.vue'
```

#### 服务创建规范
1. **检查现有服务**：避免重复创建
2. **单一职责**：一个服务只负责一个领域
3. **依赖注入**：通过构造函数注入依赖
4. **单例模式**：导出单例实例

---

## 组件和接口设计

### 统一存储服务接口
```typescript
interface IStorageService {
  // 考官数据
  loadTeachers(): Promise<Teacher[]>
  saveTeachers(teachers: Teacher[]): Promise<void>
  
  // 排班结果
  saveScheduleResult(result: ScheduleResultRecord): Promise<void>
  loadLatestScheduleResult(): Promise<ScheduleResultRecord | null>
  
  // 数据管理
  clearAllData(): Promise<void>
  getStorageStats(): StorageStats
  
  // 配置
  init(config?: Partial<UnifiedStorageConfig>): Promise<void>
}
```

### 统一 API 服务接口
```typescript
interface IApiService {
  get<T>(url: string, config?: RequestConfig): Promise<T>
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  delete<T>(url: string, config?: RequestConfig): Promise<T>
  
  // 批量请求
  batch<T>(requests: BatchRequest[]): Promise<T[]>
  
  // 请求拦截
  addRequestInterceptor(interceptor: RequestInterceptor): void
  addResponseInterceptor(interceptor: ResponseInterceptor): void
}
```

---

## 数据模型

### 配置数据模型
```typescript
// 统一配置结构
interface AppConfig {
  api: ApiConfig
  cache: CacheConfig
  performance: {
    limits: PerformanceLimits      // 前端性能限制
    monitoring: PerformanceMonitoring  // 性能监控配置
  }
  ui: UiConfig
  security: SecurityConfig
}
```

### 存储数据模型
```typescript
// 扩展的考官数据
interface ExtendedTeacher extends Teacher {
  createdAt?: string
  updatedAt?: string
  version?: number  // 数据版本，用于迁移
}

// 存储元数据
interface StorageMetadata {
  version: string
  lastModified: string
  dataSize: number
}
```

---

## 错误处理

### 迁移错误处理
```typescript
class MigrationError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly target: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}
```

### 配置错误处理
```typescript
class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly configKey: string,
    public readonly invalidValue?: any
  ) {
    super(message)
    this.name = 'ConfigurationError'
  }
}
```

---

## 测试策略

### 单元测试
1. **存储服务测试**
   - 数据读写正确性
   - 缓存机制有效性
   - 错误处理完整性

2. **配置合并测试**
   - 配置正确加载
   - 环境变量正确解析
   - 默认值正确应用

### 集成测试
1. **服务迁移测试**
   - 旧服务到新服务的数据迁移
   - API 兼容性测试
   - 性能对比测试

2. **构建测试**
   - 开发环境构建成功
   - 生产环境构建成功
   - 打包体积对比

### 回归测试
1. **功能回归**
   - 所有页面正常加载
   - 数据正常保存和读取
   - 排班功能正常运行

2. **性能回归**
   - 页面加载时间
   - API 响应时间
   - 内存使用情况

---

## 迁移计划

### 阶段 1：准备阶段（风险最低）
1. 创建备份
2. 创建新的统一服务
3. 编写迁移脚本
4. 准备测试用例

### 阶段 2：配置优化（中等风险）
1. 提取 Vite 公共配置
2. 重构配置文件结构
3. 更新配置引用
4. 验证构建流程

### 阶段 3：服务迁移（高风险）
1. 更新存储服务引用
2. 迁移 API 调用
3. 清理旧服务文件
4. 全面测试

### 阶段 4：清理阶段（低风险）
1. 移出备份目录
2. 删除空目录
3. 更新文档
4. 代码审查

---

## 回滚策略

### 快速回滚
如果发现严重问题，可以快速回滚：
```bash
# 1. 恢复旧的服务文件
git checkout HEAD~1 src/utils/storageService.ts

# 2. 恢复旧的配置文件
git checkout HEAD~1 vite.config.mjs

# 3. 重新构建
npm run build
```

### 数据回滚
```typescript
// 如果数据格式发生变化，提供降级函数
function downgradeTeacherData(teacher: ExtendedTeacher): Teacher {
  const { createdAt, updatedAt, version, ...baseTeacher } = teacher
  return baseTeacher
}
```

---

## 性能影响评估

### 预期改进
1. **代码体积**：减少 10-15%（移除重复代码）
2. **构建时间**：减少 5-10%（优化配置）
3. **运行时性能**：提升 5%（缓存机制）
4. **开发体验**：显著提升（清晰的代码结构）

### 监控指标
```typescript
interface PerformanceMetrics {
  bundleSize: {
    before: number
    after: number
    reduction: number
  }
  buildTime: {
    before: number
    after: number
    improvement: number
  }
  cacheHitRate: number
  apiResponseTime: number
}
```

---

## 文档更新

### 需要更新的文档
1. **README.md**：更新项目结构说明
2. **开发指南**：添加代码组织规范
3. **API 文档**：更新服务接口文档
4. **迁移指南**：为其他开发者提供迁移参考

### 代码注释
在关键位置添加注释：
```typescript
/**
 * @deprecated 使用 storageService 替代
 * @see {@link storageService}
 */
export const oldStorageService = ...
```

---

## 风险缓解

### 数据丢失风险
- ✅ 迁移前完整备份
- ✅ 保持数据格式兼容
- ✅ 提供数据验证工具

### 功能破坏风险
- ✅ 全面的单元测试
- ✅ 集成测试覆盖
- ✅ 手动回归测试

### 配置错误风险
- ✅ 配置验证函数
- ✅ 环境变量检查
- ✅ 构建时验证

---

## 成功标准

### 技术指标
- ✅ 所有测试通过
- ✅ 代码体积减少 ≥ 10%
- ✅ 无重复的服务实现
- ✅ 配置文件结构清晰

### 质量指标
- ✅ 代码可维护性提升
- ✅ 开发者能快速定位代码
- ✅ 修改能够正确生效
- ✅ 文档完整准确

### 业务指标
- ✅ 所有功能正常运行
- ✅ 性能无明显下降
- ✅ 用户体验无影响
- ✅ 部署流程无变化

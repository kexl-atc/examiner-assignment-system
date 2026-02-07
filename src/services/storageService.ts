/**
 * 统一存储服务导出
 *
 * 这个文件是存储服务的统一入口，所有组件应该从这里导入存储服务。
 * 底层实现在 unifiedStorageService.ts 中。
 */

// 重新导出类型
export type {
  ExtendedTeacher,
  UnifiedStorageConfig,
  StorageStats,
  ScheduleResultRecord,
} from './unifiedStorageService'

// 导出存储服务实例
export {
  storageService,
  unifiedStorageService,
} from './unifiedStorageService'

// 默认导出
export { default } from './unifiedStorageService'


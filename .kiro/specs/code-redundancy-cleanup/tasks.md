# 代码冗余清理实施任务

## 任务概述
本任务清单将系统地清理项目中的代码冗余，建立统一的代码架构。任务按照风险等级和依赖关系排序，确保安全、渐进式地完成重构。

---

## 阶段 1：准备和备份

- [x] 1. 创建项目完整备份



  - 在项目外部创建备份目录 `examiner-system-backups/2026-02-06/`
  - 复制整个项目到备份目录
  - 验证备份完整性
  - _Requirements: 需求 6_

- [x] 2. 分析当前代码使用情况



  - 统计 `storageService` 的所有引用位置
  - 统计 `unifiedStorageService` 的所有引用位置
  - 记录配置文件的导入关系
  - 生成依赖关系图
  - _Requirements: 需求 1, 需求 2_

- [x] 3. 准备测试环境


  - 确保开发环境可以正常运行
  - 记录当前的构建时间和包体积作为基准
  - 准备测试数据（考官数据、排班结果）
  - _Requirements: 需求 4_

---

## 阶段 2：配置文件优化

- [x] 4. 提取 Vite 公共配置



  - [x] 4.1 创建 `vite.config.base.mjs` 文件



    - 提取 alias 配置
    - 提取 plugins 配置
    - 提取 optimizeDeps 配置
    - 提取 define 配置
    - _Requirements: 需求 3_

  - [x] 4.2 重构 `vite.config.mjs`（开发环境）


    - 导入公共配置
    - 保留开发环境特定配置（server、proxy、hmr）
    - 移除重复的配置项
    - _Requirements: 需求 3_

  - [x] 4.3 重构 `vite.config.production.mjs`（生产环境）


    - 导入公共配置
    - 保留生产环境特定配置（build、terserOptions）
    - 移除重复的配置项
    - _Requirements: 需求 3_

  - [x] 4.4 验证 Vite 配置



    - 运行 `npm run dev` 验证开发环境
    - 运行 `npm run build` 验证生产构建
    - 对比构建产物，确保无差异
    - _Requirements: 需求 3_

- [ ] 5. 重构配置文件结构
  - [ ] 5.1 重命名 `src/config/index.ts` 中的 `PERFORMANCE_CONFIG`
    - 重命名为 `PERFORMANCE_LIMITS`
    - 更新所有引用此配置的代码
    - _Requirements: 需求 2_

  - [ ] 5.2 重构 `src/config/performance.ts`
    - 保持 `PERFORMANCE_CONFIG` 名称不变
    - 确保与 `PERFORMANCE_LIMITS` 无冲突
    - _Requirements: 需求 2_

  - [ ] 5.3 更新 `src/config/index.ts` 的导出
    - 添加 `export { PERFORMANCE_CONFIG as PERFORMANCE_MONITORING } from './performance'`
    - 确保所有配置都有清晰的命名
    - _Requirements: 需求 2_

  - [ ] 5.4 更新配置引用
    - 查找所有使用配置的文件
    - 更新导入语句
    - 验证配置正确加载
    - _Requirements: 需求 2_

---

## 阶段 3：存储服务统一

- [ ] 6. 创建统一的存储服务导出
  - [ ] 6.1 创建 `src/services/storageService.ts`
    - 重新导出 `unifiedStorageService` 为 `storageService`
    - 导出所有必要的类型定义
    - 添加向后兼容的接口
    - _Requirements: 需求 1_

  - [ ] 6.2 添加废弃标记到旧服务
    - 在 `src/utils/storageService.ts` 添加 `@deprecated` 注释
    - 添加迁移提示信息
    - _Requirements: 需求 1_

- [ ] 7. 迁移存储服务引用
  - [ ] 7.1 更新 `src/pages/SchedulesPage.vue`
    - 移除 `import { storageService } from '../utils/storageService'`
    - 移除 `import { unifiedStorageService } from '../services/unifiedStorageService'`
    - 添加 `import { storageService } from '../services/storageService'`
    - 更新所有使用 `unifiedStorageService` 的地方为 `storageService`
    - _Requirements: 需求 1_

  - [ ] 7.2 更新 `src/pages/HomePage2.vue`
    - 修改动态导入路径为 `'../services/storageService'`
    - 验证功能正常
    - _Requirements: 需求 1_

  - [ ] 7.3 更新 `src/components/TeacherDistribution.vue`
    - 修改动态导入路径为 `'../services/storageService'`
    - 验证功能正常
    - _Requirements: 需求 1_

  - [ ] 7.4 验证存储服务迁移
    - 测试考官数据的加载和保存
    - 测试排班结果的保存和读取
    - 验证缓存机制正常工作
    - 检查统计信息正确显示
    - _Requirements: 需求 1_

- [ ] 8. 删除旧的存储服务
  - [ ] 8.1 确认所有引用已迁移
    - 使用 grep 搜索 `from '../utils/storageService'`
    - 确保没有遗漏的引用
    - _Requirements: 需求 1_

  - [ ] 8.2 删除 `src/utils/storageService.ts`
    - 删除文件
    - 提交代码并标记为重大变更
    - _Requirements: 需求 1, 需求 4_

---

## 阶段 4：服务层优化

- [ ] 9. 创建核心服务层
  - [ ] 9.1 创建 `src/services/core/` 目录
    - 创建目录结构
    - _Requirements: 需求 5, 需求 7_

  - [ ] 9.2 创建 `src/services/core/api.service.ts`
    - 实现统一的 API 调用服务
    - 封装 axios 实例
    - 添加请求/响应拦截器
    - 实现重试机制
    - _Requirements: 需求 5_

  - [ ] 9.3 创建 `src/services/core/storage.service.ts`
    - 重新导出统一的存储服务
    - 作为核心服务的一部分
    - _Requirements: 需求 1, 需求 7_

  - [ ]* 9.4 创建 `src/services/core/cache.service.ts`
    - 实现统一的缓存服务
    - 支持 TTL 和 LRU 策略
    - _Requirements: 需求 2_

- [ ] 10. 重构 learningApi 使用统一 API 服务
  - [ ] 10.1 更新 `src/services/learningApi.ts`
    - 移除直接的 axios 导入
    - 使用 `apiService` 进行 API 调用
    - 保持接口不变
    - _Requirements: 需求 5_

  - [ ] 10.2 验证 learningApi 功能
    - 测试手动编辑日志上传
    - 测试统计数据获取
    - 测试历史记录查询
    - _Requirements: 需求 5_

---

## 阶段 5：项目清理

- [ ] 11. 移出备份目录
  - [ ] 11.1 创建外部备份目录
    - 在项目外创建 `examiner-system-backups/archived/`
    - _Requirements: 需求 6_

  - [ ] 11.2 移动备份文件
    - 移动 `backup/backup_周一022601_091615/` 到外部
    - 移动 `backup/backup_周一022601_092723/` 到外部
    - 移动 `backup/backup_周一022601_093035/` 到外部
    - 移动 `backup/backup_周一022601_093327/` 到外部
    - 移动 `backup/backup_周一022601_093737/` 到外部
    - 移动 `backup/backup_周一022601_093902/` 到外部
    - 移动 `backup/backup_周二022601_222343/` 到外部
    - 移动 `backup/backup_周二022601_233031/` 到外部
    - 移动 `backup/refactor_20260130_231028/` 到外部
    - _Requirements: 需求 6_

  - [ ] 11.3 删除空的 backup 目录
    - 删除 `backup/` 目录
    - 更新 `.gitignore` 添加 `backup/`
    - _Requirements: 需求 6_

- [ ] 12. 清理空目录
  - [ ] 12.1 删除 `config/tailwind/` 目录
    - 确认目录为空
    - 删除目录
    - _Requirements: 需求 6_

  - [ ] 12.2 删除 `config/vite/` 目录
    - 确认目录为空
    - 删除目录
    - _Requirements: 需求 6_

  - [ ] 12.3 评估 `config/deployment/` 目录
    - 检查是否有使用
    - 如果未使用，考虑删除或移动
    - _Requirements: 需求 6_

---

## 阶段 6：文档和规范

- [ ] 13. 更新项目文档
  - [ ] 13.1 更新 README.md
    - 更新项目结构说明
    - 添加新的服务层说明
    - 更新开发指南链接
    - _Requirements: 需求 7_

  - [ ] 13.2 创建代码组织规范文档
    - 创建 `docs/CODE_ORGANIZATION.md`
    - 说明文件命名规范
    - 说明导入顺序规范
    - 说明服务创建规范
    - _Requirements: 需求 7_

  - [ ] 13.3 创建迁移指南
    - 创建 `docs/MIGRATION_GUIDE.md`
    - 记录本次重构的变更
    - 提供迁移示例代码
    - _Requirements: 需求 7_

  - [ ] 13.4 更新 API 文档
    - 更新存储服务 API 文档
    - 添加核心服务 API 文档
    - _Requirements: 需求 7_

- [ ] 14. 建立代码审查检查清单
  - [ ] 14.1 创建 `.github/PULL_REQUEST_TEMPLATE.md`
    - 添加代码组织检查项
    - 添加重复代码检查项
    - 添加服务使用检查项
    - _Requirements: 需求 7_

  - [ ] 14.2 配置 ESLint 规则
    - 添加禁止直接使用 axios 的规则（除了 core/api.service.ts）
    - 添加导入顺序检查规则
    - _Requirements: 需求 7_

---

## 阶段 7：测试和验证

- [ ] 15. 全面功能测试
  - [ ] 15.1 测试考官管理功能
    - 导入考官数据
    - 编辑考官信息
    - 删除考官
    - 验证数据持久化
    - _Requirements: 需求 1_

  - [ ] 15.2 测试排班功能
    - 创建新的排班
    - 查看排班结果
    - 导出排班结果
    - 验证数据正确性
    - _Requirements: 需求 1_

  - [ ] 15.3 测试学员分配功能
    - 导入学员数据
    - 执行转盘抽签
    - 手动编辑分配
    - 验证约束检查
    - _Requirements: 需求 5_

  - [ ] 15.4 测试统计功能
    - 查看统计图表
    - 导出统计报告
    - 验证数据准确性
    - _Requirements: 需求 2_

- [ ] 16. 性能测试
  - [ ] 16.1 测量构建性能
    - 记录开发构建时间
    - 记录生产构建时间
    - 对比优化前后的差异
    - _Requirements: 需求 3_

  - [ ] 16.2 测量包体积
    - 记录总包体积
    - 记录各个 chunk 的大小
    - 对比优化前后的差异
    - _Requirements: 需求 3, 需求 4_

  - [ ] 16.3 测量运行时性能
    - 测试页面加载时间
    - 测试 API 响应时间
    - 测试缓存命中率
    - _Requirements: 需求 2, 需求 5_

- [ ] 17. 代码质量检查
  - [ ] 17.1 运行 ESLint
    - 修复所有 linting 错误
    - 确保代码符合规范
    - _Requirements: 需求 7_

  - [ ] 17.2 运行 TypeScript 类型检查
    - 修复所有类型错误
    - 确保类型安全
    - _Requirements: 需求 7_

  - [ ] 17.3 检查未使用的导入
    - 移除未使用的导入
    - 清理未使用的变量
    - _Requirements: 需求 4_

---

## 阶段 8：部署和监控

- [ ] 18. 准备发布
  - [ ] 18.1 更新版本号
    - 更新 `package.json` 版本号为 8.1.0
    - 更新 CHANGELOG.md
    - _Requirements: 需求 7_

  - [ ] 18.2 创建发布标签
    - 提交所有变更
    - 创建 Git 标签 `v8.1.0-code-cleanup`
    - 推送到远程仓库
    - _Requirements: 需求 7_

  - [ ] 18.3 生成发布说明
    - 列出所有重大变更
    - 列出性能改进
    - 列出破坏性变更（如果有）
    - _Requirements: 需求 7_

- [ ] 19. 部署后监控
  - [ ] 19.1 监控错误日志
    - 检查浏览器控制台错误
    - 检查后端日志
    - 及时修复发现的问题
    - _Requirements: 需求 8_

  - [ ] 19.2 监控性能指标
    - 监控页面加载时间
    - 监控 API 响应时间
    - 监控内存使用
    - _Requirements: 需求 2_

  - [ ] 19.3 收集用户反馈
    - 询问开发团队使用体验
    - 记录遇到的问题
    - 持续改进
    - _Requirements: 需求 7_

---

## 回滚计划

如果在任何阶段遇到严重问题，可以执行以下回滚步骤：

1. **立即回滚**：`git reset --hard <上一个稳定版本的commit>`
2. **恢复备份**：从 `examiner-system-backups/2026-02-06/` 恢复
3. **重新构建**：`npm install && npm run build`
4. **验证功能**：运行完整的功能测试

---

## 预期成果

完成所有任务后，项目将实现：

✅ **代码体积减少 10-15%**
✅ **构建时间减少 5-10%**
✅ **消除所有代码冗余**
✅ **统一的服务架构**
✅ **清晰的代码组织**
✅ **完善的文档和规范**
✅ **修改能够正确生效**

---

## 注意事项

⚠️ **重要提示**：
1. 每完成一个阶段，都要进行充分测试
2. 遇到问题及时记录，不要强行推进
3. 保持与团队的沟通，确保大家了解变更
4. 定期提交代码，便于回滚
5. 优先保证功能正常，其次才是优化

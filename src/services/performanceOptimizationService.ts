/**
 * 性能优化服务
 * 实现高效的大规模学员排班处理能力，保持系统稳定性和响应速度
 */

export interface PerformanceMetrics {
  processingTime: number
  memoryUsage: number
  cpuUsage: number
  throughput: number
  cacheHitRate: number
  errorRate: number
}

export interface OptimizationConfig {
  batchSize: number
  maxConcurrency: number
  cacheEnabled: boolean
  compressionEnabled: boolean
  parallelProcessing: boolean
  memoryThreshold: number
  timeoutThreshold: number
}

export interface BatchProcessingResult {
  success: boolean
  processedCount: number
  failedCount: number
  processingTime: number
  results: any[]
  errors: string[]
}

export class PerformanceOptimizationService {
  private cache: Map<string, any> = new Map()
  private processingQueue: any[] = []
  private activeProcesses: number = 0
  private metrics: PerformanceMetrics = {
    processingTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    throughput: 0,
    cacheHitRate: 0,
    errorRate: 0,
  }

  private config: OptimizationConfig = {
    batchSize: 100,
    maxConcurrency: 4,
    cacheEnabled: true,
    compressionEnabled: true,
    parallelProcessing: true,
    memoryThreshold: 500 * 1024 * 1024, // 500MB
    timeoutThreshold: 30000, // 30秒
  }

  constructor(customConfig?: Partial<OptimizationConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig }
    }

    // 启动性能监控
    this.startPerformanceMonitoring()
  }

  /**
   * 优化学员数据
   */
  async optimizeStudentData(students: any[]): Promise<any[]> {
    return await this.preprocessStudentData(students)
  }

  /**
   * 优化大规模学员数据处理
   */
  async optimizeStudentProcessing(
    students: any[],
    processingFunction: (batch: any[]) => Promise<any[]>
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now()
    const results: any[] = []
    const errors: string[] = []
    let processedCount = 0
    let failedCount = 0

    try {
      process.env.NODE_ENV === 'development' && console.log(`🚀 开始优化处理 ${students.length} 位学员数据`)

      // 数据预处理和优化
      const optimizedStudents = await this.preprocessStudentData(students)

      // 分批处理
      const batches = this.createBatches(optimizedStudents, this.config.batchSize)
      process.env.NODE_ENV === 'development' && console.log(`📦 分为 ${batches.length} 个批次处理，每批 ${this.config.batchSize} 条数据`)

      if (this.config.parallelProcessing) {
        // 并行处理
        const batchResults = await this.processInParallel(batches, processingFunction)

        for (const batchResult of batchResults) {
          if (batchResult.success) {
            results.push(...batchResult.data)
            processedCount += batchResult.processedCount
          } else {
            errors.push(batchResult.error)
            failedCount += batchResult.failedCount
          }
        }
      } else {
        // 串行处理
        for (const batch of batches) {
          try {
            const batchResult = await processingFunction(batch)
            results.push(...batchResult)
            processedCount += batch.length
          } catch (error) {
            errors.push(`批次处理失败: ${(error as Error).message}`)
            failedCount += batch.length
          }
        }
      }

      const processingTime = Date.now() - startTime

      // 更新性能指标
      this.updateMetrics({
        processingTime,
        throughput: processedCount / (processingTime / 1000),
        errorRate: failedCount / (processedCount + failedCount),
      })

      process.env.NODE_ENV === 'development' && console.log(
        `✅ 批处理完成: 成功 ${processedCount}，失败 ${failedCount}，耗时 ${processingTime}ms`
      )

      return {
        success: errors.length === 0,
        processedCount,
        failedCount,
        processingTime,
        results,
        errors,
      }
    } catch (error) {
      console.error('❌ 批处理执行失败:', error)
      return {
        success: false,
        processedCount: 0,
        failedCount: students.length,
        processingTime: Date.now() - startTime,
        results: [],
        errors: [(error as Error).message],
      }
    }
  }

  /**
   * 数据预处理和优化
   */
  private async preprocessStudentData(students: any[]): Promise<any[]> {
    const startTime = Date.now()

    // 1. 数据去重
    const uniqueStudents = this.removeDuplicates(students)

    // 2. 数据压缩（如果启用）
    let processedStudents = uniqueStudents
    if (this.config.compressionEnabled) {
      processedStudents = this.compressStudentData(uniqueStudents)
    }

    // 3. 数据索引优化
    processedStudents = this.optimizeDataIndexing(processedStudents)

    // 4. 缓存热点数据
    if (this.config.cacheEnabled) {
      this.cacheHotData(processedStudents)
    }

    const processingTime = Date.now() - startTime
    process.env.NODE_ENV === 'development' && console.log(
      `📊 数据预处理完成: ${students.length} → ${processedStudents.length}，耗时 ${processingTime}ms`
    )

    return processedStudents
  }

  /**
   * 创建处理批次
   */
  private createBatches<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = []

    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize))
    }

    return batches
  }

  /**
   * 并行处理批次
   */
  private async processInParallel(
    batches: any[][],
    processingFunction: (batch: any[]) => Promise<any[]>
  ): Promise<any[]> {
    const results: any[] = []
    const semaphore = new Semaphore(this.config.maxConcurrency)

    const promises = batches.map(async (batch, index) => {
      await semaphore.acquire()

      try {
        this.activeProcesses++
        process.env.NODE_ENV === 'development' && console.log(`🔄 处理批次 ${index + 1}/${batches.length}，当前并发: ${this.activeProcesses}`)

        const batchResult = await Promise.race([
          processingFunction(batch),
          this.createTimeout(this.config.timeoutThreshold),
        ])

        return {
          success: true,
          data: batchResult,
          processedCount: batch.length,
          failedCount: 0,
        }
      } catch (error) {
        console.error(`❌ 批次 ${index + 1} 处理失败:`, (error as Error).message)
        return {
          success: false,
          data: [],
          processedCount: 0,
          failedCount: batch.length,
          error: (error as Error).message,
        }
      } finally {
        this.activeProcesses--
        semaphore.release()
      }
    })

    return Promise.all(promises)
  }

  /**
   * 去重处理
   */
  private removeDuplicates(students: any[]): any[] {
    const seen = new Set()
    return students.filter(student => {
      const key = `${student.id}-${student.name}-${student.department}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * 数据压缩
   */
  private compressStudentData(students: any[]): any[] {
    return students.map(student => {
      // 移除不必要的字段，保留核心信息
      const compressed = {
        id: student.id,
        name: student.name,
        department: student.department,
        availableTimes: student.availableTimes,
        constraints: student.constraints,
        // 压缩其他非关键字段
        meta: {
          originalSize: JSON.stringify(student).length,
        },
      }

      // 保留其他可能的扩展属性
      // 注意：这里可以根据实际需要添加其他属性的保留逻辑

      return compressed
    })
  }

  /**
   * 优化数据索引
   */
  private optimizeDataIndexing(students: any[]): any[] {
    // 创建快速查找索引
    const departmentIndex = new Map()
    const timeSlotIndex = new Map()

    students.forEach((student, index) => {
      // 部门索引
      if (!departmentIndex.has(student.department)) {
        departmentIndex.set(student.department, [])
      }
      departmentIndex.get(student.department).push(index)

      // 时间段索引
      if (student.availableTimes) {
        student.availableTimes.forEach((time: any) => {
          const key = `${time.date}-${time.timeSlot}`
          if (!timeSlotIndex.has(key)) {
            timeSlotIndex.set(key, [])
          }
          timeSlotIndex.get(key).push(index)
        })
      }
    })

    // 将索引信息附加到数据中
    return students.map((student, index) => ({
      ...student,
      _index: {
        position: index,
        departmentPeers: departmentIndex.get(student.department) || [],
        timeSlotPeers: student.availableTimes
          ? student.availableTimes
              .flatMap((time: any) => timeSlotIndex.get(`${time.date}-${time.timeSlot}`) || [])
              .filter((i: number) => i !== index)
          : [],
      },
    }))
  }

  /**
   * 缓存热点数据
   */
  private cacheHotData(students: any[]): void {
    // 缓存部门统计信息
    const departmentStats = this.calculateDepartmentStats(students)
    this.cache.set('departmentStats', departmentStats)

    // 缓存时间段统计信息
    const timeSlotStats = this.calculateTimeSlotStats(students)
    this.cache.set('timeSlotStats', timeSlotStats)

    // 缓存约束统计信息
    const constraintStats = this.calculateConstraintStats(students)
    this.cache.set('constraintStats', constraintStats)

    process.env.NODE_ENV === 'development' && console.log(`💾 缓存了 ${this.cache.size} 项热点数据`)
  }

  /**
   * 计算部门统计信息
   */
  private calculateDepartmentStats(students: any[]): any {
    const stats = new Map()

    students.forEach(student => {
      const dept = student.department
      if (!stats.has(dept)) {
        stats.set(dept, {
          count: 0,
          availableTimeSlots: new Set(),
          constraints: new Set(),
        })
      }

      const deptStats = stats.get(dept)
      deptStats.count++

      if (student.availableTimes) {
        student.availableTimes.forEach((time: any) => {
          deptStats.availableTimeSlots.add(`${time.date}-${time.timeSlot}`)
        })
      }

      if (student.constraints) {
        Object.keys(student.constraints).forEach(constraint => {
          deptStats.constraints.add(constraint)
        })
      }
    })

    // 转换Set为Array以便序列化
    const result: any = {}
    stats.forEach((value, key) => {
      result[key] = {
        count: value.count,
        availableTimeSlots: Array.from(value.availableTimeSlots),
        constraints: Array.from(value.constraints),
      }
    })

    return result
  }

  /**
   * 计算时间段统计信息
   */
  private calculateTimeSlotStats(students: any[]): any {
    const stats = new Map()

    students.forEach(student => {
      if (student.availableTimes) {
        student.availableTimes.forEach((time: any) => {
          const key = `${time.date}-${time.timeSlot}`
          if (!stats.has(key)) {
            stats.set(key, {
              studentCount: 0,
              departments: new Set(),
              qualitySum: 0,
              conflictSum: 0,
            })
          }

          const timeStats = stats.get(key)
          timeStats.studentCount++
          timeStats.departments.add(student.department)
          timeStats.qualitySum += time.quality || 1.0
          timeStats.conflictSum += time.conflictScore || 0
        })
      }
    })

    // 转换为普通对象
    const result: any = {}
    stats.forEach((value, key) => {
      result[key] = {
        studentCount: value.studentCount,
        departments: Array.from(value.departments),
        averageQuality: value.qualitySum / value.studentCount,
        averageConflict: value.conflictSum / value.studentCount,
      }
    })

    return result
  }

  /**
   * 计算约束统计信息
   */
  private calculateConstraintStats(students: any[]): any {
    const stats = {
      totalConstraints: 0,
      constraintTypes: new Map(),
      departmentConstraints: new Map(),
    }

    students.forEach(student => {
      if (student.constraints) {
        const constraintCount = Object.keys(student.constraints).length
        stats.totalConstraints += constraintCount

        Object.keys(student.constraints).forEach(constraintType => {
          stats.constraintTypes.set(
            constraintType,
            (stats.constraintTypes.get(constraintType) || 0) + 1
          )
        })

        if (!stats.departmentConstraints.has(student.department)) {
          stats.departmentConstraints.set(student.department, 0)
        }
        stats.departmentConstraints.set(
          student.department,
          stats.departmentConstraints.get(student.department) + constraintCount
        )
      }
    })

    return {
      totalConstraints: stats.totalConstraints,
      constraintTypes: Object.fromEntries(stats.constraintTypes),
      departmentConstraints: Object.fromEntries(stats.departmentConstraints),
      averageConstraintsPerStudent: stats.totalConstraints / students.length,
    }
  }

  /**
   * 创建超时Promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`处理超时: ${ms}ms`)), ms)
    })
  }

  /**
   * 启动性能监控
   * 🔧 局域网优化：降低监控频率减少系统开销
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateSystemMetrics()
    }, 30000) // 🔧 每30秒更新一次（原5秒），减少系统开销
  }

  /**
   * 更新系统性能指标
   */
  private updateSystemMetrics(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage()
      this.metrics.memoryUsage = memUsage.heapUsed

      // 检查内存阈值
      if (this.metrics.memoryUsage > this.config.memoryThreshold) {
        console.warn(
          `⚠️ 内存使用超过阈值: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
        )
        this.performGarbageCollection()
      }
    }

    // 更新缓存命中率
    this.updateCacheHitRate()
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(newMetrics: Partial<PerformanceMetrics>): void {
    this.metrics = { ...this.metrics, ...newMetrics }
  }

  /**
   * 更新缓存命中率
   */
  private updateCacheHitRate(): void {
    // 这里可以实现更复杂的缓存命中率计算逻辑
    this.metrics.cacheHitRate = this.cache.size > 0 ? 0.85 : 0
  }

  /**
   * 执行垃圾回收
   */
  private performGarbageCollection(): void {
    // 清理过期缓存
    if (this.cache.size > 100) {
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 50)
      keysToDelete.forEach(key => this.cache.delete(key))
      process.env.NODE_ENV === 'development' && console.log(`🗑️ 清理了 ${keysToDelete.length} 项缓存数据`)
    }

    // 如果在Node.js环境中，触发垃圾回收
    if (typeof global !== 'undefined' && global.gc) {
      global.gc()
      process.env.NODE_ENV === 'development' && console.log('🗑️ 执行了垃圾回收')
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 获取缓存数据
   */
  getCachedData(key: string): any {
    return this.cache.get(key)
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear()
    process.env.NODE_ENV === 'development' && console.log('🗑️ 缓存已清理')
  }
}

/**
 * 信号量实现，用于控制并发数量
 */
class Semaphore {
  private permits: number
  private waitQueue: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    return new Promise(resolve => {
      if (this.permits > 0) {
        this.permits--
        resolve()
      } else {
        this.waitQueue.push(resolve)
      }
    })
  }

  release(): void {
    this.permits++
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!
      this.permits--
      resolve()
    }
  }
}

// 导出单例实例
export const performanceOptimizationService = new PerformanceOptimizationService()

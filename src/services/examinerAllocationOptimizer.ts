/**
 * 考官分配优化器
 * 针对大规模学员场景优化考官分配算法，提高约束处理效率
 */

export interface ExaminerAllocationConfig {
  maxStudentsPerBatch: number
  enableParallelProcessing: boolean
  cacheExaminerPools: boolean
  optimizeForPerformance: boolean
  enableSmartPreallocation: boolean
}

export interface ExaminerPool {
  department: string
  availableExaminers: string[]
  workloadMap: Map<string, number>
  conflictMap: Map<string, Set<string>>
}

export interface AllocationResult {
  success: boolean
  allocations: Map<string, { examiner1: string; examiner2: string; backup?: string }>
  conflicts: string[]
  performance: {
    processingTime: number
    studentsProcessed: number
    allocationRate: number
  }
}

/**
 * 高性能考官分配优化器
 */
export class ExaminerAllocationOptimizer {
  private config: ExaminerAllocationConfig
  private examinerPools: Map<string, ExaminerPool> = new Map()
  private allocationCache: Map<string, any> = new Map()

  constructor(config: Partial<ExaminerAllocationConfig> = {}) {
    this.config = {
      maxStudentsPerBatch: 50,
      enableParallelProcessing: true,
      cacheExaminerPools: true,
      optimizeForPerformance: true,
      enableSmartPreallocation: true,
      ...config,
    }
  }

  /**
   * 优化考官分配算法
   */
  public async optimizeAllocation(
    students: any[],
    teachers: any[],
    examDates: string[]
  ): Promise<AllocationResult> {
    const startTime = performance.now()

    process.env.NODE_ENV === 'development' && console.log('🚀 启动高性能考官分配优化器')
    process.env.NODE_ENV === 'development' && console.log(
      `📊 处理规模: ${students.length}名学员, ${teachers.length}名考官, ${examDates.length}个考试日期`
    )

    try {
      // 1. 预处理和缓存优化
      await this.preprocessData(teachers, examDates)

      // 2. 智能预分配
      const preallocationResult = this.config.enableSmartPreallocation
        ? await this.smartPreallocation(students, teachers)
        : null

      // 3. 批量处理优化
      const allocationResult = await this.batchProcessAllocation(students, teachers, examDates)

      // 4. 冲突检测和修复
      const conflictResult = await this.detectAndResolveConflicts(allocationResult)

      const endTime = performance.now()
      const processingTime = endTime - startTime

      process.env.NODE_ENV === 'development' && console.log(`✅ 考官分配优化完成，耗时: ${processingTime.toFixed(2)}ms`)

      return {
        success: conflictResult.conflicts.length === 0,
        allocations: conflictResult.allocations,
        conflicts: conflictResult.conflicts,
        performance: {
          processingTime,
          studentsProcessed: students.length,
          allocationRate: (students.length / processingTime) * 1000, // 每秒处理学员数
        },
      }
    } catch (error) {
      console.error('❌ 考官分配优化失败:', error)

      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        success: false,
        allocations: new Map(),
        conflicts: [`优化器错误: ${errorMessage}`],
        performance: {
          processingTime: performance.now() - startTime,
          studentsProcessed: 0,
          allocationRate: 0,
        },
      }
    }
  }

  /**
   * 预处理数据和缓存优化
   */
  private async preprocessData(teachers: any[], examDates: string[]): Promise<void> {
    if (!this.config.cacheExaminerPools) return

    process.env.NODE_ENV === 'development' && console.log('🔄 预处理考官数据和构建考官池...')

    // 按科室分组考官
    const departmentGroups = new Map<string, any[]>()

    teachers.forEach(teacher => {
      const dept = teacher.department || '未知'
      if (!departmentGroups.has(dept)) {
        departmentGroups.set(dept, [])
      }
      departmentGroups.get(dept)!.push(teacher)
    })

    // 构建优化的考官池
    for (const [dept, deptTeachers] of Array.from(departmentGroups)) {
      const examinerPool: ExaminerPool = {
        department: dept,
        availableExaminers: deptTeachers.map(t => t.name),
        workloadMap: new Map(),
        conflictMap: new Map(),
      }

      // 初始化工作负荷映射
      deptTeachers.forEach(teacher => {
        examinerPool.workloadMap.set(teacher.name, 0)
        examinerPool.conflictMap.set(teacher.name, new Set())
      })

      this.examinerPools.set(dept, examinerPool)
    }

    process.env.NODE_ENV === 'development' && console.log(`✅ 考官池构建完成，共${this.examinerPools.size}个科室`)
  }

  /**
   * 智能预分配算法
   */
  private async smartPreallocation(students: any[], teachers: any[]): Promise<Map<string, any>> {
    process.env.NODE_ENV === 'development' && console.log('🧠 执行智能预分配算法...')

    const preallocationMap = new Map<string, any>()

    // 按科室统计学员需求
    const departmentDemand = new Map<string, number>()
    students.forEach(student => {
      const dept = student.department || '未知'
      departmentDemand.set(dept, (departmentDemand.get(dept) || 0) + 1)
    })

    // 按科室统计考官供给
    const departmentSupply = new Map<string, number>()
    teachers.forEach(teacher => {
      const dept = teacher.department || '未知'
      departmentSupply.set(dept, (departmentSupply.get(dept) || 0) + 1)
    })

    // 分析资源充足性
    for (const [dept, demand] of Array.from(departmentDemand)) {
      const supply = departmentSupply.get(dept) || 0
      const ratio = supply / (demand * 2) // 每个学员需要2名考官

      process.env.NODE_ENV === 'development' && console.log(
        `📊 ${dept}科室: 需求${demand}名学员(${demand * 2}名考官), 供给${supply}名考官, 比例${ratio.toFixed(2)}`
      )

      if (ratio < 0.5) {
        console.warn(`⚠️ ${dept}科室考官资源不足，可能影响约束满足`)
      }
    }

    return preallocationMap
  }

  /**
   * 批量处理分配算法
   */
  private async batchProcessAllocation(
    students: any[],
    teachers: any[],
    examDates: string[]
  ): Promise<Map<string, any>> {
    process.env.NODE_ENV === 'development' && console.log('⚡ 执行批量处理分配算法...')

    const allocationMap = new Map<string, any>()
    const batchSize = this.config.maxStudentsPerBatch

    // 分批处理学员
    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize)
      process.env.NODE_ENV === 'development' && console.log(`🔄 处理第${Math.floor(i / batchSize) + 1}批学员 (${batch.length}名)`)

      // 并行处理批次内的学员
      if (this.config.enableParallelProcessing) {
        const batchPromises = batch.map(student =>
          this.allocateExaminersForStudent(student, teachers)
        )
        const batchResults = await Promise.all(batchPromises)

        batchResults.forEach((result, index) => {
          if (result) {
            allocationMap.set(batch[index].id, result)
          }
        })
      } else {
        // 串行处理
        for (const student of batch) {
          // 优化建议:
          // const map = new Map(array.map(item => [item.id, item]))
          // for (const item of array1) {
          //   const found = map.get(item.id)
          //   if (found) { /* 处理逻辑 */ }
// } {
          const result = await this.allocateExaminersForStudent(student, teachers)
          if (result) {
            allocationMap.set(student.id, result)
          }
        }
      }
    }

    process.env.NODE_ENV === 'development' && console.log(`✅ 批量分配完成，成功分配${allocationMap.size}名学员`)
    return allocationMap
  }

  /**
   * 为单个学员分配考官
   * 优化：全面评估所有可能的分配方案，避免在首个不满足条件时立即终止
   */
  private async allocateExaminersForStudent(student: any, teachers: any[]): Promise<any | null> {
    try {
      const studentDept = student.department || '未知'

      // 获取同科室考官（考官1候选）
      const sameDeptTeachers = teachers.filter(t => t.department === studentDept)

      // 获取不同科室考官（考官2候选）
      const diffDeptTeachers = teachers.filter(t => t.department !== studentDept)

      // 收集所有可能的分配方案，而不是立即返回null
      const allocationOptions: Array<{
        examiner1: any
        examiner2: any
        backup?: any
        score: number
        issues: string[]
      }> = []

      // 如果同科室考官不足，尝试其他科室作为考官1
      let examiner1Candidates = sameDeptTeachers
      if (sameDeptTeachers.length === 0) {
        console.warn(`⚠️ ${student.name}: 同科室(${studentDept})无可用考官，尝试其他科室`)
        examiner1Candidates = diffDeptTeachers.slice(0, Math.min(3, diffDeptTeachers.length))
      }

      // 如果不同科室考官不足，记录但继续尝试
      let examiner2Candidates = diffDeptTeachers
      if (diffDeptTeachers.length === 0) {
        console.warn(`⚠️ ${student.name}: 不同科室无可用考官，尝试同科室其他考官`)
        examiner2Candidates = sameDeptTeachers
      }

      // 全面评估所有可能的考官组合
      // TODO: 优化嵌套循环 - 当前复杂度 O(n²)
// 建议使用Map/Set或其他数据结构优化
// // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const candidate1 of examiner1Candidates) {
        for (const candidate2 of examiner2Candidates) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
          if (candidate1.name === candidate2.name) continue

          const option = this.evaluateAllocationOption(
            student,
            candidate1,
            candidate2,
            examiner2Candidates,
            studentDept
          )

          if (option) {
            allocationOptions.push(option)
          }
        }
      }

      // 如果没有找到任何可行方案，尝试放宽约束条件
      if (allocationOptions.length === 0) {
        console.warn(`⚠️ ${student.name}: 标准约束下无可行方案，尝试放宽约束`)

        // 尝试同科室内的考官组合（放宽约束）
        if (sameDeptTeachers.length >= 2) {
          // TODO: 优化嵌套循环 - 当前复杂度 O(n²)
// 建议使用Map/Set或其他数据结构优化
// // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (let i = 0; i < sameDeptTeachers.length; i++) {
            for (let j = i + 1; j < sameDeptTeachers.length; j++) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
              const option = this.evaluateAllocationOption(
                student,
                sameDeptTeachers[i],
                sameDeptTeachers[j],
                sameDeptTeachers,
                studentDept
              )

              if (option) {
                option.issues.push('约束放宽：两名考官来自同一科室')
                option.score -= 20 // 降低评分但不完全排除
                allocationOptions.push(option)
              }
            }
          }
        }
      }

      // 选择最优方案
      if (allocationOptions.length === 0) {
        console.error(`❌ ${student.name}: 所有约束条件下均无可行分配方案`)
        return null
      }

      // 按评分排序，选择最优方案
      allocationOptions.sort((a, b) => b.score - a.score)
      const bestOption = allocationOptions[0]

      // 记录选择的方案和潜在问题
      if (bestOption.issues.length > 0) {
        console.warn(`⚠️ ${student.name}: 选择方案存在问题: ${bestOption.issues.join(', ')}`)
      }

      // 更新工作负荷
      this.updateWorkload(bestOption.examiner1, studentDept)
      this.updateWorkload(bestOption.examiner2, studentDept)

      return {
        examiner1: bestOption.examiner1.name,
        examiner2: bestOption.examiner2.name,
        backup: bestOption.backup?.name,
        allocationScore: bestOption.score,
        issues: bestOption.issues,
      }
    } catch (error) {
      console.error(`❌ 为学员${student.name}分配考官失败:`, error)
      return null
    }
  }

  /**
   * 🔧 新增：验证考官1科室是否有效
   * 与后端HC2约束逻辑保持一致
   */
  private isValidExaminer1(studentDept: string, examiner1Dept: string): boolean {
    if (!studentDept || !examiner1Dept) return false

    // 同科室（优先匹配）
    if (studentDept === examiner1Dept) {
      return true
    }

    // 三室七室互通（特殊规则）
    if (
      (studentDept === '三' && examiner1Dept === '七') ||
      (studentDept === '七' && examiner1Dept === '三')
    ) {
      return true
    }

    return false
  }

  /**
   * 评估分配方案的可行性和质量
   * 🔧 修复：严格按照HC2硬约束进行评估，不允许妥协
   */
  private evaluateAllocationOption(
    student: any,
    examiner1: any,
    examiner2: any,
    backupCandidates: any[],
    studentDept: string
  ): any | null {
    const issues: string[] = []
    let score = 100 // 基础分数

    // 检查基本约束
    if (!examiner1 || !examiner2) {
      return null
    }

    if (examiner1.name === examiner2.name) {
      return null
    }

    // 🔧 修复：严格的HC2硬约束检查
    // 必须满足：考官1与学员同科室（或三七室互通），考官2与学员不同科室

    // 1. 检查考官1是否有效（同科室或三七室互通）
    const examiner1Valid = this.isValidExaminer1(studentDept, examiner1.department)
    if (!examiner1Valid) {
      // 硬约束违反，直接返回null
      console.warn(
        `❌ [HC2违反] 考官1科室不匹配: 学员${studentDept} vs 考官1${examiner1.department}`
      )
      return null
    }

    // 2. 检查考官2是否与学员不同科室（硬约束）
    if (examiner2.department === studentDept) {
      // 硬约束违反，直接返回null
      console.warn(
        `❌ [HC2违反] 考官2与学员同科室: 学员${studentDept} = 考官2${examiner2.department}`
      )
      return null
    }

    // 3. 检查考官1和考官2是否来自不同科室
    if (examiner1.department === examiner2.department) {
      console.warn(`❌ [HC2违反] 考官1和考官2来自同一科室: ${examiner1.department}`)
      return null
    }

    // 🎯 通过所有硬约束检查，给予高分奖励
    score += 50 // 符合硬约束的高奖励

    // 避免两名考官都来自同一科室（除非是学员科室）
    if (examiner1.department === examiner2.department && examiner1.department !== studentDept) {
      issues.push('考官多样性不足：两名考官来自同一非学员科室')
      score -= 10
    }

    // 工作负荷平衡评分
    const workload1 = this.getWorkload(examiner1.name, studentDept)
    const workload2 = this.getWorkload(examiner2.name, studentDept)
    const avgWorkload = (workload1 + workload2) / 2

    // 工作负荷越低，评分越高
    score += Math.max(0, 20 - avgWorkload * 2)

    // 工作负荷差异评分（差异越小越好）
    const workloadDiff = Math.abs(workload1 - workload2)
    score += Math.max(0, 10 - workloadDiff * 3)

    // 选择备份考官
    const backup = this.selectBackupExaminer(backupCandidates, [examiner1, examiner2])
    if (backup) {
      score += 5 // 有备份考官的奖励
    }

    return {
      examiner1,
      examiner2,
      backup,
      score,
      issues,
    }
  }

  /**
   * 选择最优考官（基于工作负荷平衡）
   * 优化版本：减少重复排序和查找操作
   */
  private selectOptimalExaminer(
    candidates: any[],
    targetDept: string,
    excludes: any[] = []
  ): any | null {
    // ✅ 性能优化：预先创建排除姓名集合
    const excludeNames = new Set(excludes.map(e => e?.name).filter(Boolean))

    // ✅ 性能优化：单次遍历进行过滤和排序，避免先过滤再排序
    let optimalCandidate: any = null
    let minWorkload = Infinity

    for (const candidate of candidates) {
      if (excludeNames.has(candidate.name)) continue

      const workload = this.getWorkload(candidate.name, targetDept)
      if (workload < minWorkload) {
        minWorkload = workload
        optimalCandidate = candidate
      }
    }

    return optimalCandidate
  }

  /**
   * 选择备份考官
   */
  private selectBackupExaminer(candidates: any[], excludes: any[] = []): any | null {
    const excludeNames = new Set(excludes.map(e => e?.name).filter(Boolean))

    const availableCandidates = candidates.filter(candidate => !excludeNames.has(candidate.name))

    return availableCandidates.length > 0 ? availableCandidates[0] : null
  }

  /**
   * 获取考官工作负荷
   */
  private getWorkload(teacherName: string, department: string): number {
    const pool = this.examinerPools.get(department)
    return pool?.workloadMap.get(teacherName) || 0
  }

  /**
   * 更新考官工作负荷
   */
  private updateWorkload(teacher: any, department: string): void {
    const pool = this.examinerPools.get(department)
    if (pool && teacher) {
      const currentWorkload = pool.workloadMap.get(teacher.name) || 0
      pool.workloadMap.set(teacher.name, currentWorkload + 1)
    }
  }

  /**
   * 检测和解决冲突
   */
  private async detectAndResolveConflicts(allocations: Map<string, any>): Promise<{
    allocations: Map<string, any>
    conflicts: string[]
  }> {
    process.env.NODE_ENV === 'development' && console.log('🔍 检测分配问题...')

    const conflicts: string[] = []
    const resolvedAllocations = new Map(allocations)

    // 检测约束违反
    for (const [studentId, allocation] of Array.from(allocations)) {
      if (!allocation.examiner1 || !allocation.examiner2) {
        conflicts.push(`学员${studentId}: 缺少主考官配备`)
      }

      if (allocation.examiner1 === allocation.examiner2) {
        conflicts.push(`学员${studentId}: 考官重复分配`)
      }
    }

    process.env.NODE_ENV === 'development' && console.log(`🔍 问题检测完成，发现${conflicts.length}个问题`)

    return {
      allocations: resolvedAllocations,
      conflicts,
    }
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): any {
    return {
      cacheSize: this.allocationCache.size,
      examinerPools: this.examinerPools.size,
      config: this.config,
    }
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    this.allocationCache.clear()
    this.examinerPools.clear()
    process.env.NODE_ENV === 'development' && console.log('🧹 考官分配优化器缓存已清理')
  }
}

// 导出单例实例
export const examinerAllocationOptimizer = new ExaminerAllocationOptimizer({
  maxStudentsPerBatch: 100,
  enableParallelProcessing: true,
  cacheExaminerPools: true,
  optimizeForPerformance: true,
  enableSmartPreallocation: true,
})

// 导出便捷方法
export const optimizeExaminerAllocation = async (
  students: any[],
  teachers: any[],
  examDates: string[]
): Promise<AllocationResult> => {
  return examinerAllocationOptimizer.optimizeAllocation(students, teachers, examDates)
}

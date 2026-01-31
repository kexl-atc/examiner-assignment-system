/**
 * 数据调试工具
 * 用于在浏览器控制台诊断学员和考官的数据匹配问题
 */

// 🔧 科室规范化函数（与后端保持一致）
function normalizeDeptToShort(dept: string | undefined | null): string {
  if (!dept) return ''
  const normalized = dept.trim()
  
  // 中文数字映射
  const numMap: Record<string, string> = {
    '1': '一', '2': '二', '3': '三', '4': '四', '5': '五',
    '6': '六', '7': '七', '8': '八', '9': '九', '10': '十'
  }
  
  // 处理各种格式
  if (/^区域[一二三四五六七八九十]室$/.test(normalized)) {
    return normalized.substring(2, 3)
  }
  if (/^[一二三四五六七八九十]室$/.test(normalized)) {
    return normalized.substring(0, 1)
  }
  if (/^[一二三四五六七八九十]$/.test(normalized)) {
    return normalized
  }
  if (/^\d+室$/.test(normalized)) {
    const num = normalized.replace('室', '')
    return numMap[num] || normalized
  }
  if (/^\d+$/.test(normalized)) {
    return numMap[normalized] || normalized
  }
  
  return normalized
}

// 🔧 三七互通检查
function isThreeSevenInterchangeable(dept1: string, dept2: string): boolean {
  const d1 = normalizeDeptToShort(dept1)
  const d2 = normalizeDeptToShort(dept2)
  return (d1 === '三' && d2 === '七') || (d1 === '七' && d2 === '三')
}

/**
 * 打印学员和考官的科室分布
 * 🔧 增强版：检测资源是否充足
 */
export function debugDepartmentDistribution(students: any[], teachers: any[]) {
  const isDev = (import.meta as any)?.env?.DEV === true
  // 🔧 修复：检查参数是否有效
  if (!students || !Array.isArray(students)) {
    isDev && console.debug('⚠️ 学员数据无效或为空')
    students = []
  }
  if (!teachers || !Array.isArray(teachers)) {
    isDev && console.debug('⚠️ 考官数据无效或为空')
    teachers = []
  }
  
  console.group('🔍 科室分布诊断')
  
  // 统计学员科室（标准化）
  const studentDeptMap = new Map<string, any[]>()
  students.forEach(student => {
    const rawDept = student.department || '未知'
    const dept = normalizeDeptToShort(rawDept)
    if (!studentDeptMap.has(dept)) {
      studentDeptMap.set(dept, [])
    }
    studentDeptMap.get(dept)!.push({ name: student.name, rawDept })
  })
  
  // 统计考官科室（标准化）
  const teacherDeptMap = new Map<string, any[]>()
  teachers.forEach(teacher => {
    const rawDept = teacher.department || '未知'
    const dept = normalizeDeptToShort(rawDept)
    if (!teacherDeptMap.has(dept)) {
      teacherDeptMap.set(dept, [])
    }
    teacherDeptMap.get(dept)!.push({ 
      name: teacher.name, 
      rawDept, 
      group: teacher.group,
      available: teacher.available 
    })
  })
  
  console.log('\n📊 学员科室分布（标准化后）:')
  studentDeptMap.forEach((items, dept) => {
    console.log(`  科室"${dept}": ${items.length}名学员 - ${items.slice(0, 3).map((i: any) => i.name).join('、')}${items.length > 3 ? '...' : ''}`)
  })
  
  console.log('\n📊 考官科室分布（标准化后）:')
  teacherDeptMap.forEach((items, dept) => {
    console.log(`  科室"${dept}": ${items.length}名考官 - ${items.slice(0, 3).map((i: any) => i.name).join('、')}${items.length > 3 ? '...' : ''}`)
  })
  
  // 🔧 增强：资源充足性检查
  console.log('\n🔍 HC2约束资源检查（考官1必须与学员同科室）:')
  let hasIssue = false
  const resourceIssues: string[] = []
  
  studentDeptMap.forEach((studentItems, dept) => {
    let availableTeachers = teacherDeptMap.get(dept) || []
    
    // 三七互通：如果是三室或七室，合并可用考官
    if (dept === '三' || dept === '七') {
      const otherDept = dept === '三' ? '七' : '三'
      const otherTeachers = teacherDeptMap.get(otherDept) || []
      availableTeachers = [...availableTeachers, ...otherTeachers]
    }
    
    const studentCount = studentItems.length
    const teacherCount = availableTeachers.length
    
    // 每天每个学员需要1名同科室考官1，考虑2天考试，需要足够的考官轮换
    // 简化估算：考官数量应该 >= 学员数量的一定比例
    const minRecommended = Math.max(1, Math.ceil(studentCount * 0.5)) // 至少50%的比例
    
    let status = '✅'
    let warning = ''
    
    if (teacherCount === 0) {
      status = '🚫'
      hasIssue = true
      warning = '【严重】该科室没有考官！必然导致HC2违规！'
      resourceIssues.push(`科室"${dept}": 没有考官`)
    } else if (teacherCount < minRecommended) {
      status = '⚠️'
      hasIssue = true
      warning = `【风险】考官可能不足！建议至少 ${minRecommended} 名考官`
      resourceIssues.push(`科室"${dept}": ${teacherCount}名考官 < ${minRecommended}名推荐（学员${studentCount}名）`)
    }
    
    const ratio = teacherCount > 0 ? `(比例 ${teacherCount}:${studentCount})` : ''
    console.log(`  ${status} 科室"${dept}": ${studentCount}名学员, ${teacherCount}名考官 ${ratio}`)
    if (warning) {
      console.warn(`     ${warning}`)
    }
  })
  
  if (!hasIssue) {
    console.log('\n✅ 所有科室资源充足！')
  } else {
    console.log('\n❌ 资源问题汇总:')
    resourceIssues.forEach(issue => console.error(`   • ${issue}`))
    console.log('\n💡 解决建议:')
    console.log('   1. 增加对应科室的考官')
    console.log('   2. 减少该科室的学员数量')
    console.log('   3. 延长排班日期范围，分散考试压力')
  }
  
  console.groupEnd()
  
  // #region agent log - 假设1: 资源分布诊断
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dataDebugger.ts:debugDepartmentDistribution',message:'资源分布诊断结果',data:{studentDepts:Object.fromEntries(Array.from(studentDeptMap.entries()).map(([k,v]) => [k, v.length])),teacherDepts:Object.fromEntries(Array.from(teacherDeptMap.entries()).map(([k,v]) => [k, v.length])),hasIssue,resourceIssues},timestamp:Date.now(),sessionId:'debug-session',runId:'resource-check',hypothesisId:'H1-ResourceShortage'})}).catch(()=>{});
  // #endregion
  
  return {
    studentDeptMap: Object.fromEntries(Array.from(studentDeptMap.entries()).map(([k, v]) => [k, (v as any[]).map(i => i.name)])),
    teacherDeptMap: Object.fromEntries(Array.from(teacherDeptMap.entries()).map(([k, v]) => [k, (v as any[]).map(i => i.name)])),
    hasIssue,
    resourceIssues
  }
}

/**
 * 打印学员和考官的班组分布
 */
export function debugGroupDistribution(students: any[], teachers: any[]) {
  const isDev = (import.meta as any)?.env?.DEV === true
  // 🔧 修复：检查参数是否有效
  if (!students || !Array.isArray(students)) {
    isDev && console.debug('⚠️ 学员数据无效或为空')
    students = []
  }
  if (!teachers || !Array.isArray(teachers)) {
    isDev && console.debug('⚠️ 考官数据无效或为空')
    teachers = []
  }
  
  console.group('🔍 班组分布诊断')
  
  // 统计学员班组
  const studentGroupMap = new Map<string, any[]>()
  students.forEach(student => {
    const group = student.group || '未知'
    if (!studentGroupMap.has(group)) {
      studentGroupMap.set(group, [])
    }
    studentGroupMap.get(group)!.push(student.name)
  })
  
  // 统计考官班组
  const teacherGroupMap = new Map<string, any[]>()
  teachers.forEach(teacher => {
    const group = teacher.group || '未知'
    if (!teacherGroupMap.has(group)) {
      teacherGroupMap.set(group, [])
    }
    teacherGroupMap.get(group)!.push(teacher.name)
  })
  
  console.log('\n📊 学员班组分布:')
  studentGroupMap.forEach((names, group) => {
    console.log(`  班组"${group}": ${names.length}名学员 - ${names.slice(0, 3).join('、')}${names.length > 3 ? '...' : ''}`)
  })
  
  console.log('\n📊 考官班组分布:')
  teacherGroupMap.forEach((names, group) => {
    console.log(`  班组"${group}": ${names.length}名考官 - ${names.slice(0, 3).join('、')}${names.length > 3 ? '...' : ''}`)
  })
  
  console.groupEnd()
  
  return {
    studentGroupMap: Object.fromEntries(studentGroupMap),
    teacherGroupMap: Object.fromEntries(teacherGroupMap)
  }
}

/**
 * 完整诊断（科室+班组）
 * 🔧 增强版：增加详细的资源充足性分析
 */
export function debugScheduleData(students: any[], teachers: any[]) {
  const isDev = (import.meta as any)?.env?.DEV === true
  // 🔧 修复：检查参数是否有效
  if (!students || !Array.isArray(students)) {
    isDev && console.debug('⚠️ 学员数据无效或为空，跳过诊断')
    students = []
  }
  if (!teachers || !Array.isArray(teachers)) {
    isDev && console.debug('⚠️ 考官数据无效或为空，跳过诊断')
    teachers = []
  }
  
  // 如果两个数组都为空，不执行诊断
  if (students.length === 0 && teachers.length === 0) {
    isDev && console.debug('⚠️ 学员和考官数据均为空，跳过排班数据诊断')
    return {
      students: { total: 0, departments: {}, groups: {} },
      teachers: { total: 0, departments: {}, groups: {} },
      hasIssue: false,
      resourceIssues: []
    }
  }
  
  console.log('\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 排班数据完整诊断')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n总计: ${students.length}名学员, ${teachers.length}名考官\n`)
  
  const deptResult = debugDepartmentDistribution(students, teachers)
  console.log('\n')
  const groupResult = debugGroupDistribution(students, teachers)
  
  // 🔧 增强：HC2约束可行性分析
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 HC2约束可行性分析')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (deptResult.hasIssue && deptResult.resourceIssues && deptResult.resourceIssues.length > 0) {
    console.error('\n⚠️ 检测到以下资源不足问题，可能导致HC2硬约束违规:')
    deptResult.resourceIssues.forEach((issue: string) => {
      console.error(`   🚫 ${issue}`)
    })
    console.log('\n💡 HC2约束要求: 考官1必须与学员同科室（或三七互通）')
    console.log('   如果某科室的考官数量不足，系统将被迫分配其他科室的考官，导致HC2违规\n')
  } else {
    console.log('\n✅ HC2约束资源检查通过，所有科室的考官数量充足\n')
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 诊断完成')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // #region agent log - 完整诊断结果
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dataDebugger.ts:debugScheduleData',message:'完整诊断结果',data:{studentCount:students.length,teacherCount:teachers.length,hasIssue:deptResult.hasIssue,resourceIssues:deptResult.resourceIssues||[],studentDepts:deptResult.studentDeptMap,teacherDepts:deptResult.teacherDeptMap},timestamp:Date.now(),sessionId:'debug-session',runId:'full-diagnosis',hypothesisId:'H1-ResourceShortage'})}).catch(()=>{});
  // #endregion
  
  return {
    students: {
      total: students.length,
      departments: deptResult.studentDeptMap,
      groups: groupResult.studentGroupMap
    },
    teachers: {
      total: teachers.length,
      departments: deptResult.teacherDeptMap,
      groups: groupResult.teacherGroupMap
    },
    hasIssue: deptResult.hasIssue,
    resourceIssues: deptResult.resourceIssues || []
  }
}

/**
 * 🔧 计算最优考试天数
 * 
 * 计算逻辑：
 * 1. 总考试场次 = 学员数 × 每人考试天数
 * 2. 每天最大考试容量受考官数量限制
 * 3. 考虑科室约束，每个科室的瓶颈可能不同
 * 4. 最优天数 = max(总体天数需求, 各科室瓶颈中的最大值)
 * 
 * @param students 学员列表
 * @param teachers 考官列表
 * @param examDaysPerStudent 每人考试天数，默认2天
 * @returns 最优考试天数信息
 */
export function calculateOptimalExamDays(
  students: any[],
  teachers: any[],
  examDaysPerStudent: number = 2
): {
  minDays: number           // 最少需要的天数
  recommendedDays: number   // 推荐天数（留有余量）
  bottleneck: string        // 瓶颈说明
  details: {                // 详细计算信息
    totalExams: number
    maxExamsPerDay: number
    deptBottlenecks: Array<{ dept: string; minDays: number; reason: string }>
  }
} {
  if (!students || students.length === 0) {
    return {
      minDays: 1,
      recommendedDays: 1,
      bottleneck: '无学员数据',
      details: { totalExams: 0, maxExamsPerDay: 0, deptBottlenecks: [] }
    }
  }
  
  if (!teachers || teachers.length === 0) {
    return {
      minDays: 999,
      recommendedDays: 999,
      bottleneck: '无考官数据，无法排班',
      details: { totalExams: students.length * examDaysPerStudent, maxExamsPerDay: 0, deptBottlenecks: [] }
    }
  }
  
  // 1. 计算总考试场次
  const totalExams = students.reduce((sum, s) => {
    const days = s.examDays || examDaysPerStudent
    return sum + days
  }, 0)
  
  // 2. 统计科室分布
  const studentDeptMap = new Map<string, number>()
  const teacherDeptMap = new Map<string, number>()
  
  students.forEach(student => {
    const dept = normalizeDeptToShort(student.department || '未知')
    studentDeptMap.set(dept, (studentDeptMap.get(dept) || 0) + 1)
  })
  
  teachers.forEach(teacher => {
    const dept = normalizeDeptToShort(teacher.department || '未知')
    teacherDeptMap.set(dept, (teacherDeptMap.get(dept) || 0) + 1)
  })
  
  // 3. 计算全局容量（每天最大考试数 = 考官数 / 2）
  // 因为每场考试需要2名考官（考官1和考官2）
  const maxExamsPerDay = Math.floor(teachers.length / 2)
  const globalMinDays = maxExamsPerDay > 0 ? Math.ceil(totalExams / maxExamsPerDay) : 999
  
  // 4. 计算各科室瓶颈
  const deptBottlenecks: Array<{ dept: string; minDays: number; reason: string }> = []
  
  studentDeptMap.forEach((studentCount, dept) => {
    let availableTeacherCount = teacherDeptMap.get(dept) || 0
    
    // 三七互通：如果是三室或七室，合并可用考官
    if (dept === '三' || dept === '七') {
      const otherDept = dept === '三' ? '七' : '三'
      availableTeacherCount += (teacherDeptMap.get(otherDept) || 0)
    }
    
    // 每个科室每天最多安排的考试数
    // 考官1必须同科室，假设每位考官每天最多监考1-2场
    const maxExamsPerDayForDept = Math.max(1, availableTeacherCount) // 保守估计：每位考官每天监考1场
    
    // 该科室需要的考试场次（学员数 × 每人天数）
    const examsNeeded = studentCount * examDaysPerStudent
    
    // 该科室最少需要的天数
    const deptMinDays = Math.ceil(examsNeeded / maxExamsPerDayForDept)
    
    if (deptMinDays > globalMinDays) {
      deptBottlenecks.push({
        dept,
        minDays: deptMinDays,
        reason: `${studentCount}名学员需${examsNeeded}场考试，${availableTeacherCount}名考官每天最多${maxExamsPerDayForDept}场`
      })
    }
  })
  
  // 5. 确定最终最少天数（取最大值）
  let minDays = globalMinDays
  let bottleneck = `总体容量：${totalExams}场考试 / ${maxExamsPerDay}场每天`
  
  deptBottlenecks.forEach(b => {
    if (b.minDays > minDays) {
      minDays = b.minDays
      bottleneck = `科室"${b.dept}"资源受限：${b.reason}`
    }
  })
  
  // 6. 推荐天数（留10-20%余量，最少+1天）
  const recommendedDays = Math.max(minDays + 1, Math.ceil(minDays * 1.15))
  
  console.log('📊 [最优考试天数计算]')
  console.log(`   总考试场次: ${totalExams}`)
  console.log(`   每天最大容量: ${maxExamsPerDay}场`)
  console.log(`   全局最少天数: ${globalMinDays}天`)
  console.log(`   科室瓶颈:`, deptBottlenecks)
  console.log(`   ✅ 最少需要: ${minDays}天`)
  console.log(`   💡 推荐天数: ${recommendedDays}天`)
  console.log(`   ⚠️ 瓶颈: ${bottleneck}`)
  
  return {
    minDays,
    recommendedDays,
    bottleneck,
    details: {
      totalExams,
      maxExamsPerDay,
      deptBottlenecks
    }
  }
}

// 在window上暴露调试函数，方便在控制台直接调用
if (typeof window !== 'undefined') {
  (window as any).debugScheduleData = debugScheduleData;
  (window as any).debugDepartmentDistribution = debugDepartmentDistribution;
  (window as any).debugGroupDistribution = debugGroupDistribution;
  (window as any).calculateOptimalExamDays = calculateOptimalExamDays;
}

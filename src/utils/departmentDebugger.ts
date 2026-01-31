/**
 * 科室数据调试工具
 * 用于诊断学员和考官的科室匹配问题
 */

export interface DepartmentDiagnosisResult {
  success: boolean
  studentDepartments: Map<string, number> // 科室 -> 学员数量
  teacherDepartments: Map<string, number> // 科室 -> 考官数量
  mismatchedDepartments: string[] // 有学员但没有考官的科室
  rawStudentDepartments: Set<string> // 学员科室的原始值
  rawTeacherDepartments: Set<string> // 考官科室的原始值
  normalizationIssues: string[] // 标准化问题列表
}

/**
 * 科室名称标准化（与前端保持一致）
 */
export function normalizeDepartment(dept: string | null | undefined): string | null {
  if (!dept) return null

  const normalized = dept.trim()

  // 标准化映射
  const mappings: Record<string, string> = {
    '区域一室': '一',
    '一室': '一',
    '1室': '一',
    '第1科室': '一',
    '区域二室': '二',
    '二室': '二',
    '2室': '二',
    '第2科室': '二',
    '区域三室': '三',
    '三室': '三',
    '3室': '三',
    '第3科室': '三',
    '区域四室': '四',
    '四室': '四',
    '4室': '四',
    '第4科室': '四',
    '区域五室': '五',
    '五室': '五',
    '5室': '五',
    '第5科室': '五',
    '区域六室': '六',
    '六室': '六',
    '6室': '六',
    '第6科室': '六',
    '区域七室': '七',
    '七室': '七',
    '7室': '七',
    '第7科室': '七',
  }

  // 尝试精确匹配
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key)) {
      return value
    }
  }

  // 如果已经是标准格式（单个中文数字），直接返回
  if (/^[一二三四五六七八九十]$/.test(normalized)) {
    return normalized
  }

  // 保留原始值
  return normalized
}

/**
 * 诊断科室匹配问题
 */
export function diagnoseDepartmentMatch(
  students: any[],
  teachers: any[]
): DepartmentDiagnosisResult {
  const result: DepartmentDiagnosisResult = {
    success: true,
    studentDepartments: new Map(),
    teacherDepartments: new Map(),
    mismatchedDepartments: [],
    rawStudentDepartments: new Set(),
    rawTeacherDepartments: new Set(),
    normalizationIssues: [],
  }

  // 收集学员科室信息
  students.forEach((student) => {
    const rawDept = student.department || student.所属科室
    if (rawDept) {
      result.rawStudentDepartments.add(rawDept)
      const normalized = normalizeDepartment(rawDept)
      if (normalized) {
        const count = result.studentDepartments.get(normalized) || 0
        result.studentDepartments.set(normalized, count + 1)

        // 检查标准化前后是否一致
        if (rawDept !== normalized) {
          result.normalizationIssues.push(
            `学员科室 "${rawDept}" 被标准化为 "${normalized}"`
          )
        }
      }
    }
  })

  // 收集考官科室信息
  teachers.forEach((teacher) => {
    const rawDept = teacher.department || teacher.所属科室
    if (rawDept) {
      result.rawTeacherDepartments.add(rawDept)
      const normalized = normalizeDepartment(rawDept)
      if (normalized) {
        const count = result.teacherDepartments.get(normalized) || 0
        result.teacherDepartments.set(normalized, count + 1)

        // 检查标准化前后是否一致
        if (rawDept !== normalized) {
          result.normalizationIssues.push(
            `考官科室 "${rawDept}" 被标准化为 "${normalized}"`
          )
        }
      }
    }
  })

  // 检查不匹配的科室
  for (const [dept, studentCount] of result.studentDepartments.entries()) {
    const teacherCount = result.teacherDepartments.get(dept) || 0
    if (teacherCount === 0) {
      result.mismatchedDepartments.push(dept)
      result.success = false
    }
  }

  return result
}

/**
 * 打印诊断报告（在浏览器控制台）
 */
export function printDiagnosisReport(result: DepartmentDiagnosisResult) {
  console.group('🔍 科室匹配诊断报告')

  console.log('\n📊 原始科室数据:')
  console.log('学员科室（原始值）:', Array.from(result.rawStudentDepartments))
  console.log('考官科室（原始值）:', Array.from(result.rawTeacherDepartments))

  if (result.normalizationIssues.length > 0) {
    console.log('\n⚠️ 科室标准化情况:')
    result.normalizationIssues.forEach((issue) => console.log('  -', issue))
  }

  console.log('\n📈 标准化后的分布:')
  console.log('学员分布:', Object.fromEntries(result.studentDepartments))
  console.log('考官分布:', Object.fromEntries(result.teacherDepartments))

  if (result.mismatchedDepartments.length > 0) {
    console.error('\n❌ 发现不匹配的科室:')
    result.mismatchedDepartments.forEach((dept) => {
      const studentCount = result.studentDepartments.get(dept) || 0
      const teacherCount = result.teacherDepartments.get(dept) || 0
      console.error(
        `  科室 "${dept}": ${studentCount} 名学员, ${teacherCount} 名考官`
      )
    })
  } else {
    console.log('\n✅ 所有科室都有对应的考官')
  }

  console.log('\n总体结果:', result.success ? '✅ 通过' : '❌ 失败')
  console.groupEnd()

  return result
}

/**
 * 在发送数据到后端前，标准化所有科室字段
 */
export function normalizeAllDepartments(data: {
  students: any[]
  teachers: any[]
}): {
  students: any[]
  teachers: any[]
} {
  const normalized = {
    students: data.students.map((student) => ({
      ...student,
      department: normalizeDepartment(student.department) || student.department,
    })),
    teachers: data.teachers.map((teacher) => ({
      ...teacher,
      department: normalizeDepartment(teacher.department) || teacher.department,
    })),
  }

  console.log('🔄 [科室标准化] 数据已标准化')
  return normalized
}


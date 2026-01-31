/**
 * 科室名称标准化工具
 * 
 * 解决前后端科室名称格式不一致的问题
 * - 前端使用: "一室", "二室", "区域一室" 等
 * - 后端使用: "一", "二" 等
 */

// 科室名称映射表 - 从各种格式映射到标准简写
const DEPT_TO_SHORT_MAP: Record<string, string> = {
  // 标准格式
  '一室': '一',
  '二室': '二',
  '三室': '三',
  '四室': '四',
  '五室': '五',
  '六室': '六',
  '七室': '七',
  '八室': '八',
  
  // 区域前缀格式
  '区域一室': '一',
  '区域二室': '二',
  '区域三室': '三',
  '区域四室': '四',
  '区域五室': '五',
  '区域六室': '六',
  '区域七室': '七',
  '区域八室': '八',
  
  // 数字格式
  '1室': '一',
  '2室': '二',
  '3室': '三',
  '4室': '四',
  '5室': '五',
  '6室': '六',
  '7室': '七',
  '8室': '八',
  
  // 带"科"后缀
  '一科': '一',
  '二科': '二',
  '三科': '三',
  '四科': '四',
  '五科': '五',
  '六科': '六',
  '七科': '七',
  '八科': '八',
  
  // 已是简写格式
  '一': '一',
  '二': '二',
  '三': '三',
  '四': '四',
  '五': '五',
  '六': '六',
  '七': '七',
  '八': '八',
}

// 简写到完整名称的映射（前端统一显示为"区域X室"格式）
const SHORT_TO_FULL_MAP: Record<string, string> = {
  '一': '区域一室',
  '二': '区域二室',
  '三': '区域三室',
  '四': '区域四室',
  '五': '区域五室',
  '六': '区域六室',
  '七': '区域七室',
  '八': '区域八室',
}

/**
 * 将科室名称标准化为简写格式（用于后端）
 * @param dept 原始科室名称
 * @returns 标准化后的简写（如 "一", "二"）
 */
export function normalizeDeptToShort(dept: string | null | undefined): string {
  if (!dept) return ''
  
  const trimmed = dept.trim()
  
  // 直接查表
  if (DEPT_TO_SHORT_MAP[trimmed]) {
    return DEPT_TO_SHORT_MAP[trimmed]
  }
  
  // 尝试移除常见后缀
  const cleaned = trimmed
    .replace(/室$/g, '')
    .replace(/科$/g, '')
    .replace(/区域/g, '')
    .trim()
  
  // 数字转汉字
  const numberMap: Record<string, string> = {
    '1': '一', '2': '二', '3': '三', '4': '四',
    '5': '五', '6': '六', '7': '七', '8': '八',
  }
  
  if (numberMap[cleaned]) {
    return numberMap[cleaned]
  }
  
  // 如果清理后的结果在映射表中
  if (DEPT_TO_SHORT_MAP[cleaned]) {
    return DEPT_TO_SHORT_MAP[cleaned]
  }
  
  // 返回原始值（移除后缀）
  return cleaned
}

/**
 * 将科室名称标准化为完整格式（用于前端显示）
 * @param dept 原始科室名称
 * @returns 标准化后的完整名称（如 "区域一室", "区域二室"）
 */
export function normalizeDeptToFull(dept: string | null | undefined): string {
  if (!dept) return ''
  
  const short = normalizeDeptToShort(dept)
  return SHORT_TO_FULL_MAP[short] || '区域' + short + '室'
}

/**
 * 比较两个科室名称是否相等（忽略格式差异）
 * @param dept1 科室名称1
 * @param dept2 科室名称2
 * @returns 是否相等
 */
export function deptEquals(dept1: string | null | undefined, dept2: string | null | undefined): boolean {
  if (!dept1 || !dept2) return false
  return normalizeDeptToShort(dept1) === normalizeDeptToShort(dept2)
}

/**
 * 检查科室是否在指定列表中（忽略格式差异）
 * @param dept 要检查的科室
 * @param deptList 科室列表
 * @returns 是否在列表中
 */
export function deptInList(dept: string | null | undefined, deptList: (string | null | undefined)[]): boolean {
  if (!dept) return false
  const normalizedDept = normalizeDeptToShort(dept)
  return deptList.some(d => d && normalizeDeptToShort(d) === normalizedDept)
}

/**
 * 获取所有有效的科室简写列表
 */
export function getAllDeptShorts(): string[] {
  return ['一', '二', '三', '四', '五', '六', '七', '八']
}

/**
 * 获取所有有效的科室完整名称列表
 */
export function getAllDeptFullNames(): string[] {
  return ['区域一室', '区域二室', '区域三室', '区域四室', '区域五室', '区域六室', '区域七室', '区域八室']
}

// 默认导出便捷对象
export const departmentNormalizer = {
  toShort: normalizeDeptToShort,
  toFull: normalizeDeptToFull,
  equals: deptEquals,
  inList: deptInList,
  allShorts: getAllDeptShorts,
  allFullNames: getAllDeptFullNames,
}


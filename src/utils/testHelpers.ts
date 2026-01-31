/**
 * 🚀 v6.1.3优化: 测试辅助工具
 * 提供单元测试、集成测试和性能测试的辅助函数
 */

/**
 * 测试工具类
 */
export class TestHelpers {
  /**
   * 模拟异步操作
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 模拟API响应
   */
  static mockAPIResponse<T>(data: T, delay: number = 100): Promise<T> {
    return new Promise(resolve => {
      setTimeout(() => resolve(data), delay)
    })
  }

  /**
   * 模拟API错误
   */
  static mockAPIError(message: string, delay: number = 100): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), delay)
    })
  }

  /**
   * 创建测试数据
   */
  static createTestData<T>(factory: (index: number) => T, count: number): T[] {
    return Array.from({ length: count }, (_, i) => factory(i))
  }

  /**
   * 断言工具
   */
  static assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`断言失败: ${message}`)
    }
  }

  /**
   * 断言相等
   */
  static assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(
        message || `断言失败: 期望 ${expected}，实际 ${actual}`
      )
    }
  }

  /**
   * 断言包含
   */
  static assertContains(haystack: string | any[], needle: any, message?: string): void {
    const contains = typeof haystack === 'string'
      ? haystack.includes(needle)
      : haystack.includes(needle)

    if (!contains) {
      throw new Error(message || `断言失败: ${haystack} 不包含 ${needle}`)
    }
  }

  /**
   * 性能测试
   */
  static async performanceTest(
    name: string,
    fn: () => void | Promise<void>,
    iterations: number = 1
  ): Promise<{ name: string; totalTime: number; averageTime: number; iterations: number }> {
    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      await fn()
    }

    const end = performance.now()
    const totalTime = end - start
    const averageTime = totalTime / iterations

    return {
      name,
      totalTime,
      averageTime,
      iterations,
    }
  }

  /**
   * 内存使用测试
   */
  static getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null
    }

    const memory = (performance as any).memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100),
    }
  }
}

type TestResult = { name: string; passed: boolean; error?: string; duration: number }

/**
 * 测试套件类
 */
export class TestSuite {
  private results: TestResult[] = []
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = []

  /**
   * 添加测试
   */
  test(name: string, fn: () => void | Promise<void>): void {
    this.tests.push({ name, fn })
  }

  /**
   * 运行所有测试
   */
  async run(): Promise<{
    total: number
    passed: number
    failed: number
    results: TestResult[]
  }> {
    this.results = []

    for (const test of this.tests) {
      const start = performance.now()
      let passed = false
      let error: string | undefined

      try {
        await test.fn()
        passed = true
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
      }

      const duration = performance.now() - start
      this.results.push({ name: test.name, passed, error, duration })
    }

    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.length - passed

    return {
      total: this.results.length,
      passed,
      failed,
      results: this.results,
    }
  }

  /**
   * 获取测试结果
   */
  getResults(): TestResult[] {
    return [...this.results]
  }

  /**
   * 清空测试
   */
  clear(): void {
    this.tests = []
    this.results = []
  }
}

// 导出便捷函数
export const delay = (ms: number) => TestHelpers.delay(ms)
export const mockAPIResponse = <T>(data: T, delay?: number) =>
  TestHelpers.mockAPIResponse(data, delay)
export const mockAPIError = (message: string, delay?: number) =>
  TestHelpers.mockAPIError(message, delay)
export const createTestData = <T>(factory: (index: number) => T, count: number) =>
  TestHelpers.createTestData(factory, count)
export const assert = (condition: boolean, message: string) =>
  TestHelpers.assert(condition, message)
export const assertEqual = <T>(actual: T, expected: T, message?: string) =>
  TestHelpers.assertEqual(actual, expected, message)
export const assertContains = (haystack: string | any[], needle: any, message?: string) =>
  TestHelpers.assertContains(haystack, needle, message)
export const performanceTest = (
  name: string,
  fn: () => void | Promise<void>,
  iterations?: number
) => TestHelpers.performanceTest(name, fn, iterations)
export const getMemoryUsage = () => TestHelpers.getMemoryUsage()


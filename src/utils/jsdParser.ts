/**
 * JSD文件解析器
 * 用于解析包含前端UI设计数据的.jsd文件和Sketch文件
 */

import JSZip from 'jszip'
// import { parseSketchFile } from './sketchParser'

export interface JSDUIComponent {
  id: string
  type: string
  name: string
  properties: Record<string, any>
  styles: Record<string, any>
  children?: JSDUIComponent[]
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface JSDLayout {
  id: string
  name: string
  type: 'page' | 'component' | 'template'
  components: JSDUIComponent[]
  styles: Record<string, any>
  metadata: {
    version: string
    created: string
    modified: string
    author?: string
  }
}

export interface JSDDesignSystem {
  colors: Record<string, string>
  typography: Record<string, any>
  spacing: Record<string, number>
  breakpoints: Record<string, number>
  components: Record<string, any>
}

export interface JSDProject {
  name: string
  version: string
  layouts: JSDLayout[]
  designSystem: JSDDesignSystem
  assets: {
    images: Array<{ name: string; data: string; type: string }>
    icons: Array<{ name: string; data: string; type: string }>
  }
  metadata: {
    created: string
    modified: string
    author?: string
    description?: string
  }
}

// 自定义错误类 - 增强错误处理
export class JSDParseError extends Error {
  public readonly timestamp: string
  public readonly context?: any

  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: Error,
    context?: any
  ) {
    super(message)
    this.name = 'JSDParseError'
    this.timestamp = new Date().toISOString()
    this.context = context

    // 保持错误堆栈信息
    if (originalError && originalError.stack) {
      this.stack = originalError.stack
    }
  }

  // 获取详细错误信息
  getDetailedMessage(): string {
    let details = `[${this.code || 'UNKNOWN'}] ${this.message}`

    if (this.context) {
      details += `\n上下文: ${JSON.stringify(this.context, null, 2)}`
    }

    if (this.originalError) {
      details += `\n原始错误: ${this.originalError.message}`
    }

    details += `\n时间: ${this.timestamp}`

    return details
  }

  // 转换为可序列化的对象
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      originalError: this.originalError?.message,
    }
  }
}

export class JSDParser {
  private zip: JSZip | null = null

  /**
   * 解析JSD文件
   */
  async parseFile(file: File | ArrayBuffer): Promise<JSDProject> {
    try {
      // 加载ZIP文件
      this.zip = new JSZip()
      const zipData = file instanceof File ? await file.arrayBuffer() : file
      await this.zip.loadAsync(zipData)

      // 验证文件结构
      await this.validateFileStructure()

      // 解析主数据文件
      const mainData = await this.parseMainData()

      // 解析图片资源
      const images = await this.parseImages()

      // 解析图标资源
      const icons = await this.parseIcons()

      // 构建项目对象
      const project: JSDProject = {
        name: mainData.name || 'Untitled Project',
        version: mainData.version || '1.0.0',
        layouts: mainData.layouts || [],
        designSystem: mainData.designSystem || this.getDefaultDesignSystem(),
        assets: {
          images,
          icons,
        },
        metadata: {
          created: mainData.metadata?.created || new Date().toISOString(),
          modified: mainData.metadata?.modified || new Date().toISOString(),
          author: mainData.metadata?.author,
          description: mainData.metadata?.description,
        },
      }

      return project
    } catch (error) {
      if (error instanceof JSDParseError) {
        throw error
      }
      throw new JSDParseError(
        `解析JSD文件失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'PARSE_FAILED'
      )
    }
  }

  /**
   * 验证文件结构
   */
  private async validateFileStructure(): Promise<void> {
    if (!this.zip) {
      throw new JSDParseError('ZIP文件未加载', 'ZIP_NOT_LOADED')
    }

    // 检查必需的文件
    const requiredFiles = ['data.json']
    for (const file of requiredFiles) {
      if (!this.zip.files[file]) {
        throw new JSDParseError(`缺少必需文件: ${file}`, 'MISSING_REQUIRED_FILE')
      }
    }

    // 检查文件完整性
    try {
      const dataFile = this.zip.files['data.json']
      if (!dataFile) {
        throw new JSDParseError('主数据文件不存在', 'MISSING_DATA_FILE')
      }
    } catch (error) {
      throw new JSDParseError('文件结构验证失败', 'STRUCTURE_VALIDATION_FAILED')
    }
  }

  /**
   * 解析主数据文件
   */
  private async parseMainData(): Promise<any> {
    if (!this.zip) {
      throw new JSDParseError('ZIP文件未加载', 'ZIP_NOT_LOADED')
    }

    try {
      const dataFile = this.zip.files['data.json']
      if (!dataFile) {
        throw new JSDParseError('主数据文件不存在', 'MISSING_DATA_FILE')
      }

      const dataContent = await dataFile.async('string')
      const data = JSON.parse(dataContent)

      // 验证数据结构
      this.validateDataStructure(data)

      return data
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new JSDParseError('主数据文件JSON格式错误', 'INVALID_JSON')
      }
      throw error
    }
  }

  /**
   * 验证数据结构
   */
  private validateDataStructure(data: any): void {
    // 基本结构验证
    if (typeof data !== 'object' || data === null) {
      throw new JSDParseError('数据格式错误：根对象必须是对象类型', 'INVALID_DATA_FORMAT')
    }

    // 验证布局数据
    if (data.layouts && !Array.isArray(data.layouts)) {
      throw new JSDParseError('布局数据格式错误：layouts必须是数组', 'INVALID_LAYOUTS_FORMAT')
    }

    // 验证设计系统
    if (data.designSystem && typeof data.designSystem !== 'object') {
      throw new JSDParseError(
        '设计系统格式错误：designSystem必须是对象',
        'INVALID_DESIGN_SYSTEM_FORMAT'
      )
    }
  }

  /**
   * 解析图片资源
   */
  private async parseImages(): Promise<Array<{ name: string; data: string; type: string }>> {
    if (!this.zip) return []

    const images: Array<{ name: string; data: string; type: string }> = []
    const imageFolder = this.zip.folder('images')

    if (imageFolder) {
      for (const [filename, file] of Object.entries(imageFolder.files)) {
        if (!file.dir && this.isImageFile(filename)) {
          try {
            const data = await file.async('base64')
            const type = this.getImageType(filename)
            images.push({
              name: filename.replace('images/', ''),
              data: `data:${type};base64,${data}`,
              type,
            })
          } catch (error: any) {
            console.warn(`解析图片失败: ${filename}`, error)
          }
        }
      }
    }

    return images
  }

  /**
   * 解析图标资源
   */
  private async parseIcons(): Promise<Array<{ name: string; data: string; type: string }>> {
    if (!this.zip) return []

    const icons: Array<{ name: string; data: string; type: string }> = []

    // 尝试从icons文件夹解析
    const iconFolder = this.zip.folder('icons')
    if (iconFolder) {
      for (const [filename, file] of Object.entries(iconFolder.files)) {
        if (!file.dir) {
          try {
            const data = await file.async('string')
            icons.push({
              name: filename.replace('icons/', ''),
              data,
              type: this.getFileType(filename),
            })
          } catch (error: any) {
            console.warn(`解析图标失败: ${filename}`, error)
          }
        }
      }
    }

    return icons
  }

  /**
   * 判断是否为图片文件
   */
  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
  }

  /**
   * 获取图片MIME类型
   */
  private getImageType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    }
    return mimeTypes[ext || ''] || 'image/png'
  }

  /**
   * 获取文件类型
   */
  private getFileType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()
    return ext || 'unknown'
  }

  /**
   * 获取默认设计系统
   */
  private getDefaultDesignSystem(): JSDDesignSystem {
    return {
      colors: {
        primary: '#409EFF',
        success: '#67C23A',
        warning: '#E6A23C',
        danger: '#F56C6C',
        info: '#909399',
        text: '#303133',
        background: '#FFFFFF',
      },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: {
          xs: '12px',
          sm: '14px',
          base: '16px',
          lg: '18px',
          xl: '20px',
        },
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      breakpoints: {
        xs: 480,
        sm: 768,
        md: 1024,
        lg: 1280,
        xl: 1920,
      },
      components: {},
    }
  }

  /**
   * 导出为Vue组件代码
   */
  exportToVueComponent(layout: JSDLayout): string {
    const template = this.generateVueTemplate(layout.components)
    const script = this.generateVueScript(layout)
    const style = this.generateVueStyle(layout.styles)

    return `<template>
${template}
</template>

<script setup lang="ts">
${script}
</script>

<style scoped>
${style}
</style>`
  }

  /**
   * 生成Vue模板
   */
  private generateVueTemplate(components: JSDUIComponent[], indent = 1): string {
    const indentStr = '  '.repeat(indent)

    return components
      .map(component => {
        const tag = this.getVueTag(component.type)
        const props = this.generateVueProps(component.properties)
        const styles = this.generateInlineStyles(component.styles)

        let template = `${indentStr}<${tag}${props}${styles}`

        if (component.children && component.children.length > 0) {
          template += '>\n'
          template += this.generateVueTemplate(component.children, indent + 1)
          template += `${indentStr}</${tag}>`
        } else if (component.properties?.text) {
          template += `>${component.properties.text}</${tag}>`
        } else {
          template += ' />'
        }

        return template
      })
      .join('\n')
  }

  /**
   * 生成Vue脚本
   */
  private generateVueScript(layout: JSDLayout): string {
    return `// ${layout.name} - Generated from JSD
import { ref, reactive } from 'vue'

// Component data
const data = reactive({
  // Add your reactive data here
})

// Component methods
const methods = {
  // Add your methods here
}
`
  }

  /**
   * 生成Vue样式
   */
  private generateVueStyle(styles: Record<string, any>): string {
    return Object.entries(styles)
      .map(([selector, rules]) => {
        const cssRules = Object.entries(rules as Record<string, any>)
          .map(([prop, value]) => `  ${this.kebabCase(prop)}: ${value};`)
          .join('\n')

        return `${selector} {
${cssRules}
}`
      })
      .join('\n\n')
  }

  /**
   * 获取Vue标签名
   */
  private getVueTag(componentType: string): string {
    const tagMap: Record<string, string> = {
      button: 'el-button',
      input: 'el-input',
      form: 'el-form',
      table: 'el-table',
      card: 'el-card',
      dialog: 'el-dialog',
      container: 'div',
      text: 'span',
      image: 'img',
    }

    return tagMap[componentType] || 'div'
  }

  /**
   * 生成Vue属性
   */
  private generateVueProps(properties: Record<string, any>): string {
    if (!properties || Object.keys(properties).length === 0) {
      return ''
    }

    const props = Object.entries(properties)
      .filter(([key]) => key !== 'text')
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return ` ${this.kebabCase(key)}="${value}"`
        } else if (typeof value === 'boolean') {
          return value ? ` ${this.kebabCase(key)}` : ''
        } else {
          return ` :${this.kebabCase(key)}="${JSON.stringify(value)}"`
        }
      })
      .join('')

    return props
  }

  /**
   * 生成内联样式
   */
  private generateInlineStyles(styles: Record<string, any>): string {
    if (!styles || Object.keys(styles).length === 0) {
      return ''
    }

    const styleStr = Object.entries(styles)
      .map(([prop, value]) => `${this.kebabCase(prop)}: ${value}`)
      .join('; ')

    return ` style="${styleStr}"`
  }

  /**
   * 转换为kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  }
}

// 导出解析器实例
export const jsdParser = new JSDParser()

// 便捷函数 - 增强错误处理
export async function parseJSDFile(file: File): Promise<JSDProject> {
  const context = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    lastModified: new Date(file.lastModified).toISOString(),
  }

  try {
    const fileName = file.name.toLowerCase()

    // 验证文件基本信息
    if (file.size === 0) {
      throw new JSDParseError('文件为空，请选择有效的文件', 'EMPTY_FILE', undefined, context)
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB限制
      throw new JSDParseError(
        '文件过大，请选择小于50MB的文件',
        'FILE_TOO_LARGE',
        undefined,
        context
      )
    }

    // 根据文件扩展名选择解析器
    if (fileName.endsWith('.sketch')) {
      throw new JSDParseError('Sketch文件解析功能暂未实现', 'SKETCH_NOT_SUPPORTED')
      // return await parseSketchFile(file)
    } else if (fileName.endsWith('.jsd')) {
      return await jsdParser.parseFile(file)
    } else {
      throw new JSDParseError(
        '不支持的文件格式。支持的格式: .jsd, .sketch',
        'UNSUPPORTED_FORMAT',
        undefined,
        context
      )
    }
  } catch (error) {
    if (error instanceof JSDParseError) {
      throw error
    }

    // 处理其他未预期的错误
    throw new JSDParseError(
      `解析文件时发生未知错误: ${error instanceof Error ? error.message : '未知错误'}`,
      'UNKNOWN_ERROR',
      error as Error,
      context
    )
  }
}

export function exportLayoutToVue(layout: JSDLayout): string {
  return jsdParser.exportToVueComponent(layout)
}

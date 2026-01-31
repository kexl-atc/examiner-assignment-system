/**
 * 🚀 v6.1.3优化: 告警系统
 * 提供灵活的告警规则配置和告警通知功能
 */

import { useToast } from '../composables/useToast'

export interface Alert {
  id: string
  metric: string
  value: number
  threshold: number
  operator: 'gt' | 'lt' | 'eq'
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: number
  acknowledged: boolean
}

export interface AlertRule {
  id: string
  metric: string
  threshold: number
  operator: 'gt' | 'lt' | 'eq'
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  enabled: boolean
  cooldown?: number // 冷却时间（毫秒），避免重复告警
}

/**
 * 告警系统类
 */
class AlertSystem {
  private alerts: Alert[] = []
  private rules: AlertRule[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private toast = useToast()

  /**
   * 添加告警规则
   */
  addRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.rules.push({ id, ...rule })
    return id
  }

  /**
   * 移除告警规则
   */
  removeRule(id: string): void {
    const index = this.rules.findIndex(r => r.id === id)
    if (index > -1) {
      this.rules.splice(index, 1)
    }
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(id: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === id)
    if (rule) {
      rule.enabled = enabled
    }
  }

  /**
   * 检查并触发告警
   */
  check(metric: string, value: number): Alert | null {
    // 查找匹配的规则
    const matchingRules = this.rules.filter(
      rule => rule.enabled && rule.metric === metric && this.evaluateRule(value, rule)
    )

    if (matchingRules.length === 0) {
      return null
    }

    // 使用最严重的规则
    const rule = matchingRules.sort((a, b) => {
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })[0]

    // 检查冷却时间
    const lastTime = this.lastAlertTime.get(rule.id) || 0
    const cooldown = rule.cooldown || 60000 // 默认1分钟
    if (Date.now() - lastTime < cooldown) {
      return null
    }

    // 创建告警
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metric,
      value,
      threshold: rule.threshold,
      operator: rule.operator,
      severity: rule.severity,
      message: rule.message,
      timestamp: Date.now(),
      acknowledged: false,
    }

    this.alerts.push(alert)
    this.lastAlertTime.set(rule.id, Date.now())

    // 限制告警数量
    if (this.alerts.length > 1000) {
      this.alerts.shift()
    }

    // 发送通知
    this.notify(alert)

    return alert
  }

  /**
   * 评估规则
   */
  private evaluateRule(value: number, rule: AlertRule): boolean {
    switch (rule.operator) {
      case 'gt':
        return value > rule.threshold
      case 'lt':
        return value < rule.threshold
      case 'eq':
        return value === rule.threshold
      default:
        return false
    }
  }

  /**
   * 发送通知
   */
  private notify(alert: Alert): void {
    const message = `${alert.metric}: ${alert.message} (当前值: ${alert.value})`

    switch (alert.severity) {
      case 'critical':
      case 'error':
        this.toast.notification.error(alert.message, message)
        break
      case 'warning':
        this.toast.notification.warning(alert.message, message)
        break
      case 'info':
        this.toast.notification.info(alert.message, message)
        break
    }

    // 控制台输出（仅在开发环境且严重告警时输出）
    // 🚀 v6.1.3优化: 减少控制台输出，避免噪音
    if (process.env.NODE_ENV === 'development') {
      if (alert.severity === 'critical' || alert.severity === 'error') {
        const prefix = alert.severity === 'critical' ? '🚨' : '❌'
        console.warn(`${prefix} [告警] ${message}`)
      }
      // warning和info级别不输出到控制台，通过Toast通知即可
    }
  }

  /**
   * 确认告警
   */
  acknowledge(id: string): void {
    const alert = this.alerts.find(a => a.id === id)
    if (alert) {
      alert.acknowledged = true
    }
  }

  /**
   * 获取告警列表
   */
  getAlerts(severity?: Alert['severity'], acknowledged?: boolean): Alert[] {
    let filtered = [...this.alerts]

    if (severity) {
      filtered = filtered.filter(a => a.severity === severity)
    }

    if (acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === acknowledged)
    }

    return filtered.reverse() // 最新的在前
  }

  /**
   * 获取告警统计
   */
  getStatistics(): {
    total: number
    bySeverity: Record<string, number>
    unacknowledged: number
  } {
    const bySeverity: Record<string, number> = {}

    this.alerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1
    })

    return {
      total: this.alerts.length,
      bySeverity,
      unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
    }
  }

  /**
   * 清空告警
   */
  clear(): void {
    this.alerts = []
  }
}

// 导出单例实例
export const alertSystem = new AlertSystem()

// 导出便捷方法
export const addAlertRule = (rule: Omit<AlertRule, 'id'>) => alertSystem.addRule(rule)
export const checkAlert = (metric: string, value: number) => alertSystem.check(metric, value)
export const getAlerts = (severity?: Alert['severity'], acknowledged?: boolean) =>
  alertSystem.getAlerts(severity, acknowledged)
export const getAlertStatistics = () => alertSystem.getStatistics()


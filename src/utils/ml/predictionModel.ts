/**
 * 🚀 v6.1.3优化: 机器学习预测模型系统
 * 基于历史数据预测最优分配方案
 */

export interface PredictionFeatures {
  studentDepartment: string
  studentLevel: string
  examDate: string
  availableTeachers: number
  sameDeptTeachers: number
  diffDeptTeachers: number
  workloadDistribution: number[]
  historicalAcceptanceRate: number
  teacherExperience: Map<string, number>
  conflictProbability: number
  [key: string]: any
}

export interface PredictionResult {
  score: number
  confidence: number
  factors: Array<{ name: string; impact: number; weight: number }>
  recommendations: string[]
}

export interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  trainingSamples: number
  lastTrainingDate: string
}

/**
 * 预测模型类
 */
class PredictionModel {
  private weights: Map<string, number> = new Map()
  private trainingData: Array<{ features: PredictionFeatures; outcome: number }> = []
  private maxTrainingSamples = 10000
  private learningRate = 0.01
  private metrics: ModelMetrics = {
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
    trainingSamples: 0,
    lastTrainingDate: new Date().toISOString(),
  }

  constructor() {
    this.initializeWeights()
  }

  /**
   * 初始化权重
   */
  private initializeWeights(): void {
    // 基于领域知识的初始权重
    this.weights.set('departmentMatch', 0.25)
    this.weights.set('workloadBalance', 0.20)
    this.weights.set('teacherExperience', 0.15)
    this.weights.set('conflictProbability', 0.15)
    this.weights.set('historicalAcceptance', 0.10)
    this.weights.set('resourceAvailability', 0.10)
    this.weights.set('bias', 0.05)
  }

  /**
   * 预测分配方案得分
   */
  predict(features: PredictionFeatures): PredictionResult {
    let score = this.weights.get('bias') || 0
    const factors: Array<{ name: string; impact: number; weight: number }> = []

    // 科室匹配度
    const deptMatchScore = this.calculateDepartmentMatch(features)
    const deptWeight = this.weights.get('departmentMatch') || 0
    score += deptMatchScore * deptWeight
    factors.push({ name: '科室匹配', impact: deptMatchScore, weight: deptWeight })

    // 工作量平衡
    const workloadScore = this.calculateWorkloadBalance(features.workloadDistribution)
    const workloadWeight = this.weights.get('workloadBalance') || 0
    score += workloadScore * workloadWeight
    factors.push({ name: '工作量平衡', impact: workloadScore, weight: workloadWeight })

    // 考官经验
    const experienceScore = this.calculateExperienceScore(features.teacherExperience)
    const expWeight = this.weights.get('teacherExperience') || 0
    score += experienceScore * expWeight
    factors.push({ name: '考官经验', impact: experienceScore, weight: expWeight })

    // 冲突概率
    const conflictScore = 1 - features.conflictProbability
    const conflictWeight = this.weights.get('conflictProbability') || 0
    score += conflictScore * conflictWeight
    factors.push({ name: '冲突风险', impact: conflictScore, weight: conflictWeight })

    // 历史接受率
    const historyScore = features.historicalAcceptanceRate
    const historyWeight = this.weights.get('historicalAcceptance') || 0
    score += historyScore * historyWeight
    factors.push({ name: '历史接受率', impact: historyScore, weight: historyWeight })

    // 资源可用性
    const resourceScore = Math.min(features.availableTeachers / 10, 1)
    const resourceWeight = this.weights.get('resourceAvailability') || 0
    score += resourceScore * resourceWeight
    factors.push({ name: '资源可用性', impact: resourceScore, weight: resourceWeight })

    // 计算置信度
    const confidence = this.calculateConfidence(features, factors)

    // 生成推荐
    const recommendations = this.generateRecommendations(features, factors)

    return {
      score: Math.min(Math.max(score, 0), 100),
      confidence,
      factors,
      recommendations,
    }
  }

  /**
   * 计算科室匹配度
   */
  private calculateDepartmentMatch(features: PredictionFeatures): number {
    if (features.sameDeptTeachers === 0) return 0
    const ratio = features.sameDeptTeachers / (features.sameDeptTeachers + features.diffDeptTeachers)
    return Math.min(ratio * 1.2, 1) // 同科室比例越高越好
  }

  /**
   * 计算工作量平衡度
   */
  private calculateWorkloadBalance(workloads: number[]): number {
    if (workloads.length === 0) return 0.5

    const mean = workloads.reduce((sum, w) => sum + w, 0) / workloads.length
    const variance = workloads.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / workloads.length
    const stdDev = Math.sqrt(variance)

    // 标准差越小，平衡度越高
    const maxStdDev = mean * 0.5
    return Math.max(0, 1 - stdDev / maxStdDev)
  }

  /**
   * 计算考官经验得分
   */
  private calculateExperienceScore(experience: Map<string, number>): number {
    if (experience.size === 0) return 0.5

    const experiences = Array.from(experience.values())
    const avgExperience = experiences.reduce((sum, e) => sum + e, 0) / experiences.length

    // 经验年限越长，得分越高（归一化到0-1）
    return Math.min(avgExperience / 10, 1)
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    features: PredictionFeatures,
    factors: Array<{ name: string; impact: number; weight: number }>
  ): number {
    // 基于特征完整性和因子一致性计算置信度
    let confidence = 0.5

    // 特征完整性
    const featureCompleteness = this.calculateFeatureCompleteness(features)
    confidence += featureCompleteness * 0.3

    // 因子一致性（因子得分差异越小，置信度越高）
    const impacts = factors.map(f => f.impact)
    const impactVariance = this.calculateVariance(impacts)
    confidence += (1 - Math.min(impactVariance, 1)) * 0.2

    return Math.min(Math.max(confidence, 0), 1)
  }

  /**
   * 计算特征完整性
   */
  private calculateFeatureCompleteness(features: PredictionFeatures): number {
    const requiredFeatures = [
      'studentDepartment',
      'availableTeachers',
      'sameDeptTeachers',
      'diffDeptTeachers',
      'workloadDistribution',
    ]

    const presentFeatures = requiredFeatures.filter(f => features[f] !== undefined && features[f] !== null)
    return presentFeatures.length / requiredFeatures.length
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    return variance
  }

  /**
   * 生成推荐
   */
  private generateRecommendations(
    features: PredictionFeatures,
    factors: Array<{ name: string; impact: number; weight: number }>
  ): string[] {
    const recommendations: string[] = []

    // 找出影响最大的因子
    const sortedFactors = [...factors].sort((a, b) => b.impact * b.weight - a.impact * a.weight)
    const topFactor = sortedFactors[0]

    if (topFactor.impact < 0.5) {
      recommendations.push(`建议优化${topFactor.name}，当前得分较低`)
    }

    if (features.sameDeptTeachers === 0) {
      recommendations.push('没有同科室考官可用，建议确认跨科室安排的合理性')
    }

    if (features.conflictProbability > 0.5) {
      recommendations.push('冲突概率较高，建议调整考试时间或考官选择')
    }

    const workloadStdDev = this.calculateVariance(features.workloadDistribution)
    if (workloadStdDev > 2) {
      recommendations.push('工作量分布不均衡，建议重新分配')
    }

    return recommendations
  }

  /**
   * 训练模型（在线学习）
   */
  train(features: PredictionFeatures, actualOutcome: number): void {
    // 预测当前得分
    const prediction = this.predict(features)
    const error = actualOutcome - prediction.score

    // 更新权重（梯度下降）
    for (const factor of prediction.factors) {
      const currentWeight = this.weights.get(factor.name) || 0
      const newWeight = currentWeight + this.learningRate * error * factor.impact
      this.weights.set(factor.name, Math.max(0, Math.min(1, newWeight)))
    }

    // 保存训练数据
    this.trainingData.push({ features, outcome: actualOutcome })
    if (this.trainingData.length > this.maxTrainingSamples) {
      this.trainingData.shift() // 移除最旧的数据
    }

    // 更新指标
    this.updateMetrics()
  }

  /**
   * 批量训练
   */
  batchTrain(samples: Array<{ features: PredictionFeatures; outcome: number }>): void {
    for (const sample of samples) {
      this.train(sample.features, sample.outcome)
    }
  }

  /**
   * 更新模型指标
   */
  private updateMetrics(): void {
    if (this.trainingData.length < 10) {
      return // 数据太少，不更新指标
    }

    // 计算准确率（简化版）
    let correct = 0
    for (const sample of this.trainingData.slice(-100)) {
      // 使用最近100个样本
      const prediction = this.predict(sample.features)
      if (Math.abs(prediction.score - sample.outcome) < 10) {
        // 误差小于10分视为正确
        correct++
      }
    }

    this.metrics.accuracy = correct / Math.min(this.trainingData.length, 100)
    this.metrics.trainingSamples = this.trainingData.length
    this.metrics.lastTrainingDate = new Date().toISOString()
  }

  /**
   * 获取模型指标
   */
  getMetrics(): ModelMetrics {
    return { ...this.metrics }
  }

  /**
   * 获取权重
   */
  getWeights(): Map<string, number> {
    return new Map(this.weights)
  }

  /**
   * 设置权重
   */
  setWeights(weights: Map<string, number>): void {
    this.weights = new Map(weights)
  }

  /**
   * 导出模型
   */
  export(): string {
    return JSON.stringify({
      weights: Object.fromEntries(this.weights),
      metrics: this.metrics,
      trainingSamples: this.trainingData.length,
    })
  }

  /**
   * 导入模型
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data)
      if (parsed.weights) {
        this.weights = new Map(Object.entries(parsed.weights))
      }
      if (parsed.metrics) {
        this.metrics = { ...this.metrics, ...parsed.metrics }
      }
    } catch (error) {
      console.error('导入模型失败:', error)
    }
  }

  /**
   * 重置模型
   */
  reset(): void {
    this.weights.clear()
    this.trainingData = []
    this.initializeWeights()
    this.metrics = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      trainingSamples: 0,
      lastTrainingDate: new Date().toISOString(),
    }
  }
}

// 导出单例实例
export const predictionModel = new PredictionModel()

// 导出便捷方法
export const predict = (features: PredictionFeatures) => predictionModel.predict(features)
export const trainModel = (features: PredictionFeatures, outcome: number) =>
  predictionModel.train(features, outcome)
export const getModelMetrics = () => predictionModel.getMetrics()


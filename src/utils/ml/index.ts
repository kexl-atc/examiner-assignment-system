/**
 * 🚀 v6.1.3优化: 机器学习模块统一导出
 */

// 预测模型
export { predictionModel, predict, trainModel, getModelMetrics } from './predictionModel'
export type { PredictionFeatures, PredictionResult, ModelMetrics } from './predictionModel'

// 学习引擎
export { learningEngine, recordHistory, getInsights, getPatterns, getStatistics } from './learningEngine'
export type {
  LearningPattern,
  LearningInsight,
  HistoricalRecord,
} from './learningEngine'

// 增强推荐系统
export {
  enhancedRecommendationSystem,
  generateRecommendations,
} from './enhancedRecommendation'
export type { EnhancedRecommendation, RecommendationContext } from './enhancedRecommendation'

// 异常检测
export { anomalyDetector, detectAnomalies, configureAnomalyDetection } from './anomalyDetector'
export type { Anomaly, AnomalyDetectionConfig } from './anomalyDetector'

// 性能预测
export {
  performancePredictor,
  predictPerformance,
  batchPredictPerformance,
} from './performancePredictor'
export type { PerformanceMetrics, PerformancePrediction } from './performancePredictor'

// 自适应优化
export { adaptiveOptimizer, shouldOptimize, optimize, configureOptimizer } from './adaptiveOptimizer'
export type {
  OptimizationTarget,
  OptimizationResult,
  AdaptiveConfig,
} from './adaptiveOptimizer'


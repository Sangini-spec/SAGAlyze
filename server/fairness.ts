import type { Analysis, Patient } from "@shared/schema";

export interface AnalysisWithPatient {
  analysis: Analysis;
  patient: Patient;
}

export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export interface FairnessMetrics {
  fitzpatrickType: string;
  totalPredictions: number;
  positivePredictions: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  positiveRate: number;
  truePositiveRate: number;
  falsePositiveRate: number;
  precision: number;
  recall: number;
  f1Score: number;
  brierScore: number;
  averageConfidence: number;
  accuracyAtConfidence: number;
}

export interface DisparityMetrics {
  overallDisparityScore: number;
  demographicParityGap: number;
  equalOpportunityGap: number;
  calibrationGap: number;
  parityAlert: boolean;
  opportunityAlert: boolean;
  calibrationAlert: boolean;
}

const POSITIVE_CLASSIFICATIONS = ["Malignant", "Infection"];
const PARITY_THRESHOLD = 0.15;
const OPPORTUNITY_THRESHOLD = 0.15;
const CALIBRATION_THRESHOLD = 0.10;

function isPositivePrediction(classification: string): boolean {
  return POSITIVE_CLASSIFICATIONS.includes(classification);
}

function isPositiveGroundTruth(groundTruth: string): boolean {
  return POSITIVE_CLASSIFICATIONS.includes(groundTruth);
}

function calculateConfusionMatrix(
  predictions: Array<{ classification: string; groundTruth: string }>
): ConfusionMatrix {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const { classification, groundTruth } of predictions) {
    const predictedPositive = isPositivePrediction(classification);
    const actualPositive = isPositiveGroundTruth(groundTruth);

    if (predictedPositive && actualPositive) tp++;
    else if (predictedPositive && !actualPositive) fp++;
    else if (!predictedPositive && !actualPositive) tn++;
    else if (!predictedPositive && actualPositive) fn++;
  }

  return { truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn };
}

function calculateBrierScore(
  predictions: Array<{ confidence: number; groundTruth: string; classification: string }>
): number {
  if (predictions.length === 0) return 0;

  let totalSquaredError = 0;

  for (const pred of predictions) {
    const predictedProb = pred.confidence / 100;
    const actualOutcome = pred.classification === pred.groundTruth ? 1 : 0;
    totalSquaredError += Math.pow(predictedProb - actualOutcome, 2);
  }

  return totalSquaredError / predictions.length;
}

export function calculateFairnessMetricsPerGroup(
  analysesWithPatients: AnalysisWithPatient[]
): FairnessMetrics[] {
  const groupedByFitzpatrick = new Map<string, AnalysisWithPatient[]>();

  for (const item of analysesWithPatients) {
    if (!item.analysis.groundTruthLabel) continue;
    
    const fitzType = item.patient.fitzpatrickType || "Unknown";
    if (!groupedByFitzpatrick.has(fitzType)) {
      groupedByFitzpatrick.set(fitzType, []);
    }
    groupedByFitzpatrick.get(fitzType)!.push(item);
  }

  const metrics: FairnessMetrics[] = [];

  for (const [fitzpatrickType, items] of Array.from(groupedByFitzpatrick.entries())) {
    const predictions = items.map((item: AnalysisWithPatient) => ({
      classification: item.analysis.classification,
      groundTruth: item.analysis.groundTruthLabel!,
      confidence: item.analysis.confidence,
    }));

    const confusionMatrix = calculateConfusionMatrix(predictions);
    const { truePositives, falsePositives, trueNegatives, falseNegatives } = confusionMatrix;

    const totalPredictions = items.length;
    const positivePredictions = items.filter((item: AnalysisWithPatient) =>
      isPositivePrediction(item.analysis.classification)
    ).length;

    const positiveRate = totalPredictions > 0 ? positivePredictions / totalPredictions : 0;

    const truePositiveRate =
      truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;

    const falsePositiveRate =
      falsePositives + trueNegatives > 0 ? falsePositives / (falsePositives + trueNegatives) : 0;

    const precision =
      truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;

    const recall = truePositiveRate;

    const f1Score =
      precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const brierScore = calculateBrierScore(predictions);

    const averageConfidence =
      predictions.reduce((sum: number, p: { confidence: number }) => sum + p.confidence, 0) / predictions.length;

    const correctPredictions = items.filter(
      (item: AnalysisWithPatient) => item.analysis.classification === item.analysis.groundTruthLabel
    ).length;
    const accuracyAtConfidence = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

    metrics.push({
      fitzpatrickType,
      totalPredictions,
      positivePredictions,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      positiveRate,
      truePositiveRate,
      falsePositiveRate,
      precision,
      recall,
      f1Score,
      brierScore,
      averageConfidence,
      accuracyAtConfidence,
    });
  }

  return metrics;
}

export function calculateDisparityMetrics(metrics: FairnessMetrics[]): DisparityMetrics {
  if (metrics.length === 0) {
    return {
      overallDisparityScore: 0,
      demographicParityGap: 0,
      equalOpportunityGap: 0,
      calibrationGap: 0,
      parityAlert: false,
      opportunityAlert: false,
      calibrationAlert: false,
    };
  }

  const positiveRates = metrics.map((m) => m.positiveRate);
  const truePositiveRates = metrics.map((m) => m.truePositiveRate);
  const brierScores = metrics.map((m) => m.brierScore);

  const demographicParityGap = Math.max(...positiveRates) - Math.min(...positiveRates);
  const equalOpportunityGap = Math.max(...truePositiveRates) - Math.min(...truePositiveRates);
  const calibrationGap = Math.max(...brierScores) - Math.min(...brierScores);

  const overallDisparityScore =
    (demographicParityGap + equalOpportunityGap + calibrationGap) / 3;

  const parityAlert = demographicParityGap > PARITY_THRESHOLD;
  const opportunityAlert = equalOpportunityGap > OPPORTUNITY_THRESHOLD;
  const calibrationAlert = calibrationGap > CALIBRATION_THRESHOLD;

  return {
    overallDisparityScore,
    demographicParityGap,
    equalOpportunityGap,
    calibrationGap,
    parityAlert,
    opportunityAlert,
    calibrationAlert,
  };
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, BarChart3, TrendingUp, Calculator } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface FairnessMetric {
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

interface AuditRun {
  id: string;
  startDate: string;
  endDate: string;
  totalSamples: number;
  samplesWithGroundTruth: number;
  overallDisparityScore: number;
  demographicParityGap: number;
  equalOpportunityGap: number;
  calibrationGap: number;
  parityAlert: boolean;
  opportunityAlert: boolean;
  calibrationAlert: boolean;
  runAt: string;
}

interface FairnessAlert {
  type: string;
  severity: string;
  message: string;
  gap: number;
}

export default function FairnessCalibration() {
  const [daysBack, setDaysBack] = useState("30");
  const { toast } = useToast();

  const { data: alertsData, isLoading: alertsLoading } = useQuery<{
    alerts: FairnessAlert[];
    auditRun: AuditRun | null;
  }>({
    queryKey: ["/api/fairness/alerts"],
  });

  const { data: auditRuns, isLoading: auditRunsLoading } = useQuery<AuditRun[]>({
    queryKey: ["/api/fairness/audit-runs"],
  });

  const latestAuditRun = auditRuns?.[0];

  const { data: auditRunDetail, isLoading: detailLoading } = useQuery<{
    auditRun: AuditRun;
    metrics: FairnessMetric[];
  }>({
    queryKey: ["/api/fairness/audit-runs", latestAuditRun?.id],
    enabled: !!latestAuditRun?.id,
  });

  const calculateMetricsMutation = useMutation({
    mutationFn: async (days: number) => {
      return await apiRequest("POST", "/api/fairness/calculate", { daysBack: days });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fairness/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fairness/audit-runs"] });
      toast({
        title: "Fairness metrics calculated",
        description: "Bias detection metrics have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Calculation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCalculateMetrics = () => {
    calculateMetricsMutation.mutate(parseInt(daysBack));
  };

  const metrics = auditRunDetail?.metrics || [];
  const sortedMetrics = [...metrics].sort((a, b) => 
    a.fitzpatrickType.localeCompare(b.fitzpatrickType)
  );

  const hasAlerts = (alertsData?.alerts.length ?? 0) > 0;

  return (
    <div className="h-screen overflow-y-auto p-6 space-y-6" data-testid="page-fairness-calibration">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">AI Fairness Calibration</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Monitor bias detection metrics across Fitzpatrick skin tones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={daysBack} onValueChange={setDaysBack}>
            <SelectTrigger className="w-32" data-testid="select-days-back">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7" data-testid="select-option-7days">7 days</SelectItem>
              <SelectItem value="30" data-testid="select-option-30days">30 days</SelectItem>
              <SelectItem value="90" data-testid="select-option-90days">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleCalculateMetrics}
            disabled={calculateMetricsMutation.isPending}
            data-testid="button-calculate-metrics"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {calculateMetricsMutation.isPending ? "Calculating..." : "Calculate Metrics"}
          </Button>
        </div>
      </div>

      {alertsLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : hasAlerts ? (
        <Alert variant="destructive" data-testid="alert-fairness-warnings">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <div className="font-semibold mb-2">Bias Alerts Detected</div>
            <div className="space-y-1">
              {alertsData?.alerts.map((alert, idx) => (
                <div key={idx} data-testid={`alert-item-${alert.type}`}>
                  {alert.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ) : latestAuditRun ? (
        <Alert data-testid="alert-no-bias">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-700">
            No significant bias detected. AI performance is well-calibrated across all skin tones.
          </AlertDescription>
        </Alert>
      ) : null}

      {auditRunsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : latestAuditRun ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-overall-disparity">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Disparity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-disparity-score">
                {(latestAuditRun.overallDisparityScore * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aggregate bias score
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-demographic-parity">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demographic Parity Gap</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-parity-gap">
                {(latestAuditRun.demographicParityGap * 100).toFixed(1)}%
              </div>
              <Badge
                variant={latestAuditRun.parityAlert ? "destructive" : "outline"}
                className="mt-1"
                data-testid="badge-parity-status"
              >
                {latestAuditRun.parityAlert ? "Alert" : "Normal"}
              </Badge>
            </CardContent>
          </Card>

          <Card data-testid="card-equal-opportunity">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equal Opportunity Gap</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-opportunity-gap">
                {(latestAuditRun.equalOpportunityGap * 100).toFixed(1)}%
              </div>
              <Badge
                variant={latestAuditRun.opportunityAlert ? "destructive" : "outline"}
                className="mt-1"
                data-testid="badge-opportunity-status"
              >
                {latestAuditRun.opportunityAlert ? "Alert" : "Normal"}
              </Badge>
            </CardContent>
          </Card>

          <Card data-testid="card-calibration">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calibration Gap</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-calibration-gap">
                {(latestAuditRun.calibrationGap * 100).toFixed(1)}%
              </div>
              <Badge
                variant={latestAuditRun.calibrationAlert ? "destructive" : "outline"}
                className="mt-1"
                data-testid="badge-calibration-status"
              >
                {latestAuditRun.calibrationAlert ? "Alert" : "Normal"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card data-testid="card-no-data">
          <CardContent className="pt-6">
            <div className="text-center">
              <Calculator className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Fairness Audit Data Available</h3>
              <p className="text-muted-foreground mb-4">
                Start monitoring AI bias by running your first fairness audit
              </p>
              <div className="bg-muted p-4 rounded-lg text-left max-w-md mx-auto mb-4">
                <h4 className="font-medium mb-2">Before running an audit:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Ensure you have analyzed lesion images</li>
                  <li>Verify diagnoses on the Analysis History page</li>
                  <li>Record ground truth labels for calibration</li>
                  <li>Select a time window and click "Calculate Metrics"</li>
                </ol>
              </div>
              <Button onClick={handleCalculateMetrics} disabled={calculateMetricsMutation.isPending}>
                <Calculator className="w-4 h-4 mr-2" />
                Run First Audit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {detailLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : sortedMetrics.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="card-positive-rate-chart">
            <CardHeader>
              <CardTitle>Positive Prediction Rate by Skin Tone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedMetrics.map((metric) => (
                  <div key={metric.fitzpatrickType} data-testid={`metric-row-${metric.fitzpatrickType}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        Fitzpatrick {metric.fitzpatrickType}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {(metric.positiveRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${metric.positiveRate * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {metric.totalPredictions} samples
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-performance-metrics">
            <CardHeader>
              <CardTitle>Performance Metrics by Skin Tone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedMetrics.map((metric) => (
                  <div
                    key={metric.fitzpatrickType}
                    className="border-b pb-3 last:border-0"
                    data-testid={`performance-${metric.fitzpatrickType}`}
                  >
                    <div className="font-semibold mb-2">
                      Fitzpatrick {metric.fitzpatrickType}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Precision:</span>{" "}
                        <span className="font-medium">{(metric.precision * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recall:</span>{" "}
                        <span className="font-medium">{(metric.recall * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">F1 Score:</span>{" "}
                        <span className="font-medium">{(metric.f1Score * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Accuracy:</span>{" "}
                        <span className="font-medium">
                          {(metric.accuracyAtConfidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-confusion-matrix">
            <CardHeader>
              <CardTitle>Confusion Matrix Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedMetrics.map((metric) => (
                  <div
                    key={metric.fitzpatrickType}
                    className="border-b pb-3 last:border-0"
                    data-testid={`confusion-${metric.fitzpatrickType}`}
                  >
                    <div className="font-semibold mb-2">
                      Fitzpatrick {metric.fitzpatrickType}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
                        <div className="text-xs text-green-700 dark:text-green-300">True Positives</div>
                        <div className="text-lg font-bold text-green-900 dark:text-green-100">
                          {metric.truePositives}
                        </div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950 p-2 rounded">
                        <div className="text-xs text-red-700 dark:text-red-300">False Positives</div>
                        <div className="text-lg font-bold text-red-900 dark:text-red-100">
                          {metric.falsePositives}
                        </div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950 p-2 rounded">
                        <div className="text-xs text-red-700 dark:text-red-300">False Negatives</div>
                        <div className="text-lg font-bold text-red-900 dark:text-red-100">
                          {metric.falseNegatives}
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
                        <div className="text-xs text-green-700 dark:text-green-300">True Negatives</div>
                        <div className="text-lg font-bold text-green-900 dark:text-green-100">
                          {metric.trueNegatives}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-calibration-metrics">
            <CardHeader>
              <CardTitle>Calibration Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedMetrics.map((metric) => (
                  <div
                    key={metric.fitzpatrickType}
                    className="flex items-center justify-between"
                    data-testid={`calibration-metric-${metric.fitzpatrickType}`}
                  >
                    <div>
                      <div className="font-medium">Fitzpatrick {metric.fitzpatrickType}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg Confidence: {metric.averageConfidence.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        Brier Score: {metric.brierScore.toFixed(3)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Lower is better
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {auditRuns && auditRuns.length > 0 && (
        <Card data-testid="card-audit-history">
          <CardHeader>
            <CardTitle>Recent Audit Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditRuns.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`audit-run-${run.id}`}
                >
                  <div>
                    <div className="font-medium">
                      {new Date(run.runAt).toLocaleDateString()} at{" "}
                      {new Date(run.runAt).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {run.samplesWithGroundTruth} samples analyzed
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      Disparity: {(run.overallDisparityScore * 100).toFixed(1)}%
                    </div>
                    <div className="flex gap-1 mt-1">
                      {run.parityAlert && (
                        <Badge variant="destructive" className="text-xs">
                          Parity
                        </Badge>
                      )}
                      {run.opportunityAlert && (
                        <Badge variant="destructive" className="text-xs">
                          Opportunity
                        </Badge>
                      )}
                      {run.calibrationAlert && (
                        <Badge variant="destructive" className="text-xs">
                          Calibration
                        </Badge>
                      )}
                      {!run.parityAlert && !run.opportunityAlert && !run.calibrationAlert && (
                        <Badge variant="outline" className="text-xs">
                          No alerts
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

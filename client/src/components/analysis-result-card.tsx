import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import type { Analysis } from "@shared/schema";

interface AnalysisResultCardProps {
  analysis: Analysis;
}

export function AnalysisResultCard({ analysis }: AnalysisResultCardProps) {
  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case "benign":
        return "success";
      case "malignant":
        return "destructive";
      case "rash":
        return "warning";
      case "infection":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification.toLowerCase()) {
      case "benign":
        return <CheckCircle className="h-5 w-5" />;
      case "malignant":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const scores = [
    { label: "Benign", value: analysis.benignScore, color: "bg-success" },
    { label: "Malignant", value: analysis.malignantScore, color: "bg-destructive" },
    { label: "Rash", value: analysis.rashScore, color: "bg-warning" },
    { label: "Infection", value: analysis.infectionScore, color: "bg-chart-3" },
  ];

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {getClassificationIcon(analysis.classification)}
              <h3 className="text-2xl font-medium text-card-foreground" data-testid="text-classification">
                {analysis.classification}
              </h3>
            </div>
            <Badge
              variant={getClassificationColor(analysis.classification) as any}
              className="text-sm"
              data-testid="badge-classification"
            >
              Classification
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-4xl font-medium text-card-foreground" data-testid="text-confidence">
              {analysis.confidence}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">Confidence</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-card-foreground">Score Breakdown</h4>
          {scores.map((score) => (
            <div key={score.label} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{score.label}</span>
                <span className="font-mono text-card-foreground" data-testid={`text-score-${score.label.toLowerCase()}`}>
                  {score.value}%
                </span>
              </div>
              <Progress value={score.value} className="h-2" />
            </div>
          ))}
        </div>

        {analysis.aiResponse && (
          <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-md">
            <h4 className="text-sm font-medium text-card-foreground mb-2">AI Analysis</h4>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ai-response">
              {analysis.aiResponse}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

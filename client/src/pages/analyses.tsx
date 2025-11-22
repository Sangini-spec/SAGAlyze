import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Analysis, Lesion, Patient } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AnalysisWithRelations = Analysis & {
  lesion?: Lesion & { patient?: Patient };
};

const CLASSIFICATION_OPTIONS = ["Benign", "Malignant", "Rash", "Infection"];

export default function Analyses() {
  const { toast } = useToast();
  const [selectedGroundTruth, setSelectedGroundTruth] = useState<Record<string, string>>({});

  const { data: analyses, isLoading } = useQuery<AnalysisWithRelations[]>({
    queryKey: ["/api/analyses"],
  });

  const updateGroundTruthMutation = useMutation({
    mutationFn: async ({ analysisId, groundTruthLabel }: { analysisId: string; groundTruthLabel: string }) => {
      return await apiRequest("POST", "/api/fairness/update-ground-truth", {
        analysisId,
        groundTruthLabel,
        groundTruthSource: "clinician_review",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      toast({
        title: "Ground truth recorded",
        description: "Diagnosis has been verified for bias calibration.",
      });
      setSelectedGroundTruth({});
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update ground truth",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case "benign":
        return "success";
      case "malignant":
        return "destructive";
      case "rash":
      case "infection":
        return "warning";
      default:
        return "secondary";
    }
  };

  const handleGroundTruthSubmit = (analysisId: string) => {
    const groundTruthLabel = selectedGroundTruth[analysisId];
    if (groundTruthLabel) {
      updateGroundTruthMutation.mutate({ analysisId, groundTruthLabel });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-medium text-foreground">Analysis History</h1>
          <p className="text-muted-foreground mt-1">
            All AI-powered lesion classifications
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-32 w-full" />
            </Card>
          ))}
        </div>
      ) : analyses && analyses.length > 0 ? (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <Card key={analysis.id} className="p-6 hover-elevate active-elevate-2">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-medium text-card-foreground">
                      {analysis.classification}
                    </h3>
                    <Badge
                      variant={getClassificationColor(analysis.classification) as any}
                      data-testid={`badge-classification-${analysis.id}`}
                    >
                      {analysis.confidence}% confidence
                    </Badge>
                  </div>
                  {analysis.lesion?.patient && (
                    <p className="text-sm text-muted-foreground">
                      Patient: <span className="font-medium">{analysis.lesion.patient.name}</span> ({analysis.lesion.patient.patientId})
                    </p>
                  )}
                  {analysis.lesion && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Location: {analysis.lesion.location}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Analyzed {format(new Date(analysis.analyzedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Benign</p>
                    <p className="text-lg font-mono text-card-foreground">{analysis.benignScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Malignant</p>
                    <p className="text-lg font-mono text-card-foreground">{analysis.malignantScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rash</p>
                    <p className="text-lg font-mono text-card-foreground">{analysis.rashScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Infection</p>
                    <p className="text-lg font-mono text-card-foreground">{analysis.infectionScore}%</p>
                  </div>
                </div>
              </div>
              {analysis.aiResponse && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.aiResponse}
                  </p>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-border">
                {analysis.groundTruthLabel ? (
                  <div className="flex items-center gap-2" data-testid={`ground-truth-verified-${analysis.id}`}>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Ground Truth Verified: {analysis.groundTruthLabel}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {analysis.groundTruthSource}
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Verify Diagnosis (for AI Fairness Calibration)
                    </p>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedGroundTruth[analysis.id] || ""}
                        onValueChange={(value) =>
                          setSelectedGroundTruth((prev) => ({ ...prev, [analysis.id]: value }))
                        }
                      >
                        <SelectTrigger className="w-48" data-testid={`select-ground-truth-${analysis.id}`}>
                          <SelectValue placeholder="Select correct diagnosis" />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSIFICATION_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option} data-testid={`option-${option}`}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => handleGroundTruthSubmit(analysis.id)}
                        disabled={!selectedGroundTruth[analysis.id] || updateGroundTruthMutation.isPending}
                        size="sm"
                        data-testid={`button-submit-ground-truth-${analysis.id}`}
                      >
                        {updateGroundTruthMutation.isPending ? "Submitting..." : "Verify"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground">No analyses yet</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Start by capturing and analyzing lesion images
          </p>
          <Link href="/capture">
            <Button className="mt-4" data-testid="button-capture-lesion">
              <Activity className="h-4 w-4 mr-2" />
              Capture Lesion
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

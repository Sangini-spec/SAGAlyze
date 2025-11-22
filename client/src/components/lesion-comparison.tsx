import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import type { Lesion, Analysis } from "@shared/schema";
import { motion } from "framer-motion";

interface LesionComparisonProps {
  lesion1: Lesion & { analysis?: Analysis };
  lesion2: Lesion & { analysis?: Analysis };
}

// Calculate improvement percentage based on classification and confidence
function calculateImprovement(
  analysis1?: Analysis,
  analysis2?: Analysis
): {
  score: number; // Can be negative (worsened) or positive (improved)
  trend: "improved" | "worsened" | "no-change";
  message: string;
} {
  if (!analysis1 || !analysis2) {
    return {
      score: 0,
      trend: "no-change",
      message: "Insufficient data for comparison",
    };
  }

  // Classification severity mapping (lower is better)
  const severityMap: Record<string, number> = {
    Benign: 1,
    Rash: 2,
    Infection: 3,
    Malignant: 4,
  };

  const severity1 = severityMap[analysis1.classification];
  const severity2 = severityMap[analysis2.classification];

  // Handle unknown classifications by using confidence delta only
  if (severity1 === undefined || severity2 === undefined) {
    const confidenceDelta = analysis2.confidence - analysis1.confidence;
    const normalizedScore = confidenceDelta * 0.3; // Smaller weight for confidence-only
    
    return {
      score: normalizedScore,
      trend: normalizedScore > 5 ? "improved" : normalizedScore < -5 ? "worsened" : "no-change",
      message: normalizedScore > 5
        ? "Confidence levels have improved"
        : normalizedScore < -5
        ? "Confidence levels have decreased"
        : "Condition appears stable",
    };
  }

  // Calculate improvement based on severity change and confidence
  let improvementScore = 0;

  // If classification improved (lower severity) - POSITIVE score
  if (severity2 < severity1) {
    const severityImprovement = ((severity1 - severity2) / severity1) * 100;
    const confidenceBoost = (analysis2.confidence / 100) * 20; // Max 20% boost
    improvementScore = Math.min(100, severityImprovement + confidenceBoost);
  }
  // If classification worsened (higher severity) - NEGATIVE score
  else if (severity2 > severity1) {
    const severityDegradation = ((severity2 - severity1) / severity1) * 100;
    const confidenceBoost = (analysis2.confidence / 100) * 20;
    improvementScore = -Math.min(100, severityDegradation + confidenceBoost); // Keep negative!
  }
  // Same classification - check confidence change
  else {
    const confidenceDelta = analysis2.confidence - analysis1.confidence;
    improvementScore = confidenceDelta * 0.5; // Smaller weight for same classification
  }

  const trend =
    improvementScore > 5
      ? "improved"
      : improvementScore < -5
      ? "worsened"
      : "no-change";

  const message =
    trend === "improved"
      ? "Lesion showing signs of improvement"
      : trend === "worsened"
      ? "Lesion requires attention - condition has worsened"
      : "Lesion condition stable - no significant change";

  return {
    score: improvementScore,
    trend,
    message,
  };
}

export function LesionComparison({ lesion1, lesion2 }: LesionComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const improvement = calculateImprovement(lesion1.analysis, lesion2.analysis);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleEnd = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove, { passive: false });
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  const trendColor =
    improvement.trend === "improved"
      ? "text-success"
      : improvement.trend === "worsened"
      ? "text-destructive"
      : "text-muted-foreground";

  const trendBgColor =
    improvement.trend === "improved"
      ? "bg-success/10"
      : improvement.trend === "worsened"
      ? "bg-destructive/10"
      : "bg-muted";

  const TrendIcon =
    improvement.trend === "improved"
      ? TrendingUp
      : improvement.trend === "worsened"
      ? TrendingDown
      : Minus;

  // For display: show absolute value but keep context clear
  const displayPercentage = Math.abs(Math.round(improvement.score));
  const scoreLabel = improvement.trend === "improved"
    ? "Improvement Level"
    : improvement.trend === "worsened"
    ? "Deterioration Level"
    : "Stability Level";

  return (
    <div className="space-y-6">
      {/* Trend Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-full ${trendBgColor} flex items-center justify-center`}>
                <TrendIcon className={`h-6 w-6 ${trendColor}`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-card-foreground">
                  Progress Analysis
                </h3>
                <p className="text-sm text-muted-foreground">{improvement.message}</p>
              </div>
            </div>
            <Badge
              variant={
                improvement.trend === "improved"
                  ? "default"
                  : improvement.trend === "worsened"
                  ? "destructive"
                  : "secondary"
              }
              className="text-base px-4 py-2"
              data-testid="badge-trend"
            >
              {improvement.trend === "improved" && "Improved"}
              {improvement.trend === "worsened" && "Worsened"}
              {improvement.trend === "no-change" && "No Change"}
            </Badge>
          </div>

          {/* Improvement Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{scoreLabel}</span>
              <span className={`font-mono font-medium ${trendColor}`} data-testid="text-improvement-percentage">
                {improvement.score > 0 && "+"}{Math.round(improvement.score)}%
              </span>
            </div>
            <div className="relative">
              <Progress
                value={displayPercentage}
                className={`h-3 ${
                  improvement.trend === "worsened" 
                    ? "[&>div]:bg-destructive" 
                    : improvement.trend === "improved"
                    ? "[&>div]:bg-success"
                    : ""
                }`}
                data-testid="progress-improvement"
              />
            </div>
          </div>

          {/* Comparison Timeline */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Earlier Scan</p>
              <p className="text-sm font-medium">
                {format(new Date(lesion1.capturedAt), "MMM d, yyyy")}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 text-right">
              <p className="text-xs text-muted-foreground">Recent Scan</p>
              <p className="text-sm font-medium">
                {format(new Date(lesion2.capturedAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Interactive Image Comparison Slider */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="p-6 shadow-md">
          <h3 className="text-lg font-medium text-card-foreground mb-4">
            Image Comparison
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag the slider to compare before and after images
          </p>

          <div
            ref={containerRef}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted border-2 border-border select-none"
            style={{ touchAction: 'none' }}
            data-testid="image-comparison-container"
          >
            {/* After Image (Full) */}
            <div className="absolute inset-0">
              <img
                src={lesion2.imagePath}
                alt="After"
                className="w-full h-full object-cover"
                data-testid="img-after"
                draggable={false}
              />
              <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border">
                <span className="text-xs font-medium">After</span>
              </div>
            </div>

            {/* Before Image (Clipped) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              <img
                src={lesion1.imagePath}
                alt="Before"
                className="w-full h-full object-cover"
                data-testid="img-before"
                draggable={false}
              />
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border">
                <span className="text-xs font-medium">Before</span>
              </div>
            </div>

            {/* Slider Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-10"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={handleStart}
              onTouchStart={handleStart}
              role="slider"
              aria-label="Image comparison slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliderPosition)}
              tabIndex={0}
              data-testid="slider-handle"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-primary rounded-full border-4 border-background shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-ew-resize">
                <div className="flex gap-1">
                  <div className="w-0.5 h-4 bg-primary-foreground rounded-full" />
                  <div className="w-0.5 h-4 bg-primary-foreground rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Analysis Details Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Before Analysis */}
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-card-foreground">Before Analysis</h3>
            <Badge variant="outline">
              {format(new Date(lesion1.capturedAt), "MMM d, yyyy")}
            </Badge>
          </div>
          {lesion1.analysis ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Classification</span>
                <Badge variant="secondary" data-testid="text-before-classification">
                  {lesion1.analysis.classification}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <span className="text-sm font-mono font-medium" data-testid="text-before-confidence">
                  {lesion1.analysis.confidence}%
                </span>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Location:</span> {lesion1.location}
                </p>
                {lesion1.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">Notes:</span> {lesion1.notes}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No analysis available</p>
          )}
        </Card>

        {/* After Analysis */}
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-card-foreground">After Analysis</h3>
            <Badge variant="outline">
              {format(new Date(lesion2.capturedAt), "MMM d, yyyy")}
            </Badge>
          </div>
          {lesion2.analysis ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Classification</span>
                <Badge variant="secondary" data-testid="text-after-classification">
                  {lesion2.analysis.classification}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <span className="text-sm font-mono font-medium" data-testid="text-after-confidence">
                  {lesion2.analysis.confidence}%
                </span>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Location:</span> {lesion2.location}
                </p>
                {lesion2.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">Notes:</span> {lesion2.notes}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No analysis available</p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

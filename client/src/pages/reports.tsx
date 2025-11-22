import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Patient, Lesion, Analysis } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: patientData } = useQuery<{
    patient: Patient;
    lesions: (Lesion & { analysis?: Analysis })[];
  }>({
    queryKey: ["/api/patients", selectedPatientId, "report-data"],
    enabled: !!selectedPatientId,
  });

  const generateReport = useMutation({
    mutationFn: async (patientId: string) => {
      const response = await fetch(`/api/reports/generate/${patientId}`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.blob();
    },
    onSuccess: (blob, patientId) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patient-report-${patientId}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Report generated",
        description: "PDF report has been downloaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-medium text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate comprehensive PDF reports
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Select Patient
            </label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger data-testid="select-patient">
                <SelectValue placeholder="Choose patient for report" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name} ({patient.patientId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => generateReport.mutate(selectedPatientId)}
            disabled={!selectedPatientId || generateReport.isPending}
            data-testid="button-generate-report"
          >
            {generateReport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>
        </div>
      </Card>

      {patientData && (
        <>
          <Card className="p-6">
            <h2 className="text-xl font-medium text-card-foreground mb-4">
              Report Preview
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Patient Name</p>
                  <p className="text-base font-medium text-card-foreground">
                    {patientData.patient.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient ID</p>
                  <p className="text-base font-mono text-card-foreground">
                    {patientData.patient.patientId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="text-base text-card-foreground">
                    {format(new Date(patientData.patient.dateOfBirth), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Lesions</p>
                  <p className="text-base text-card-foreground">
                    {patientData.lesions.length}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-medium text-card-foreground mb-3">
                  Lesion Summary
                </h3>
                {patientData.lesions.length > 0 ? (
                  <div className="space-y-3">
                    {patientData.lesions.map((lesion) => (
                      <div
                        key={lesion.id}
                        className="flex items-center justify-between p-3 rounded-md bg-muted"
                      >
                        <div>
                          <p className="text-sm font-medium text-card-foreground">
                            {lesion.location}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(lesion.capturedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        {lesion.analysis && (
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{lesion.analysis.classification}</Badge>
                            <span className="text-sm font-mono text-muted-foreground">
                              {lesion.analysis.confidence}%
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No lesions recorded</p>
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      {!selectedPatientId && (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground">
            Select a patient to generate report
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Comprehensive PDF reports include patient info, lesion history, and AI analysis
          </p>
        </Card>
      )}
    </div>
  );
}

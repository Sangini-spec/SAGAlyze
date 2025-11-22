import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar, Mail, Phone, User, Activity, Shield, Copy, Check, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import type { Patient, Lesion, Analysis } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function PatientDetail() {
  const [, params] = useRoute("/patients/:id");
  const patientId = params?.id;
  const { toast } = useToast();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [plaintextToken, setPlaintextToken] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const { data: patient, isLoading: loadingPatient } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
    enabled: !!patientId,
  });

  const { data: lesions, isLoading: loadingLesions } = useQuery<
    (Lesion & { analysis?: Analysis })[]
  >({
    queryKey: ["/api/patients", patientId, "lesions"],
    enabled: !!patientId,
  });

  const regenerateToken = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/patients/${patientId}/regenerate-token`, {});
      return (await response.json()) as Patient & { plaintextToken: string };
    },
    onSuccess: (data: Patient & { plaintextToken: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId] });
      setPlaintextToken(data.plaintextToken);
      setShowConfirmDialog(false);
      setShowTokenDialog(true);
      toast({
        title: "Token regenerated",
        description: "A new access token has been generated for this patient.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRegenerateClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmRegenerate = () => {
    regenerateToken.mutate();
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(plaintextToken);
      setCopied(true);
      toast({
        title: "Token copied",
        description: "Access token has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the token manually.",
        variant: "destructive",
      });
    }
  };

  const handleCloseTokenDialog = () => {
    setShowTokenDialog(false);
    setPlaintextToken("");
    setCopied(false);
  };

  if (loadingPatient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Patient not found</p>
      </div>
    );
  }

  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-medium text-foreground">Patient Details</h1>
        </div>

        <Card className="p-6">
          <div className="flex items-start gap-6 flex-wrap">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-medium text-card-foreground" data-testid="text-patient-name">
                {patient.name}
              </h2>
              <p className="text-sm text-muted-foreground font-mono mt-2" data-testid="text-patient-id">
                Patient ID: {patient.patientId}
              </p>
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <Badge variant="secondary">{patient.gender}</Badge>
                {patient.fitzpatrickType && (
                  <Badge variant="outline">
                    Fitzpatrick Type {patient.fitzpatrickType}
                  </Badge>
                )}
              </div>
            </div>
            <Link href={`/capture?patientId=${patient.id}`}>
              <Button data-testid="button-capture-lesion">
                <Activity className="h-4 w-4 mr-2" />
                Capture Lesion
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-border">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Date of Birth:</span>
                <span className="text-card-foreground">
                  {format(new Date(patient.dateOfBirth), "MMM d, yyyy")}
                </span>
              </div>
              {patient.contactEmail && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-card-foreground">{patient.contactEmail}</span>
                </div>
              )}
              {patient.contactPhone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="text-card-foreground">{patient.contactPhone}</span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Record Created:</span>
                <span className="text-card-foreground">
                  {format(new Date(patient.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Patient Portal Access Section */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-card-foreground">Patient Portal Access</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Secure access token for patient to view their records
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleRegenerateClick}
                disabled={regenerateToken.isPending}
                data-testid="button-regenerate-token"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {regenerateToken.isPending ? "Regenerating..." : "Regenerate Token"}
              </Button>
            </div>
            <div className="mt-4 p-4 rounded-md bg-muted">
              <p className="text-xs text-muted-foreground">
                The patient uses their access token along with their Patient ID, name, and date of birth to securely access the portal. If the token is lost, you can regenerate a new one here.
              </p>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-xl font-medium text-foreground mb-4">Lesion History</h2>
          {loadingLesions ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-48 w-full" />
                </Card>
              ))}
            </div>
          ) : lesions && lesions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lesions.map((lesion) => (
                <Card key={lesion.id} className="p-4 hover-elevate active-elevate-2">
                  <div className="aspect-square rounded-md border border-border overflow-hidden mb-3 bg-muted">
                    <img
                      src={lesion.imagePath}
                      alt={`Lesion at ${lesion.location}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-card-foreground">
                        {lesion.location}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(lesion.capturedAt), "MMM d")}
                      </Badge>
                    </div>
                    {lesion.analysis && (
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Classification:</span>
                          <span className="font-medium">{lesion.analysis.classification}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Confidence:</span>
                          <span className="font-mono">{lesion.analysis.confidence}%</span>
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
              <h3 className="text-lg font-medium text-card-foreground">No lesions captured</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Start by capturing the first lesion image
              </p>
              <Link href={`/capture?patientId=${patient.id}`}>
                <Button className="mt-4" data-testid="button-capture-first-lesion">
                  <Activity className="h-4 w-4 mr-2" />
                  Capture Lesion
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Access Token?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current access token and generate a new one. The patient will need the new token to access the portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-regenerate">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegenerate} data-testid="button-confirm-regenerate">
              Regenerate Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Token Reveal Dialog - One-time viewing */}
      <Dialog open={showTokenDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">New Access Token Generated</DialogTitle>
                <DialogDescription className="mt-1">
                  Share this token with the patient for portal access
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-md bg-muted border-2 border-border">
              <p className="text-sm text-muted-foreground mb-2 font-medium">Access Token</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border border-border break-all" data-testid="text-token">
                  {plaintextToken}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyToken}
                  data-testid="button-copy-token"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-md bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Important Security Notice</p>
                <ul className="text-xs text-destructive/90 space-y-1 list-disc list-inside">
                  <li>This token will only be shown once - copy it now</li>
                  <li>Share this token securely with the patient</li>
                  <li>The previous token has been invalidated</li>
                  <li>Patient will need this token along with their ID, name, and date of birth</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCloseTokenDialog}
              className="w-full"
              data-testid="button-confirm"
            >
              I've Saved the Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

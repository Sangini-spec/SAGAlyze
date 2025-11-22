import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Lock, Shield, User, Calendar, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import type { Patient, Lesion, Analysis } from "@shared/schema";

const tokenSchema = z.object({
  token: z.string().min(12, "Access token must be at least 12 characters"),
});

const identitySchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  name: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

type TokenFormData = z.infer<typeof tokenSchema>;
type IdentityFormData = z.infer<typeof identitySchema>;

type VerificationStep = "token-entry" | "identity-verification" | "authenticated";

export default function PatientPortal() {
  const { toast } = useToast();
  const [step, setStep] = useState<VerificationStep>("token-entry");
  const [accessToken, setAccessToken] = useState<string>("");
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);

  const tokenForm = useForm<TokenFormData>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      token: "",
    },
  });

  const identityForm = useForm<IdentityFormData>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      patientId: "",
      name: "",
      dateOfBirth: "",
    },
  });

  const verifyTokenMutation = useMutation({
    mutationFn: async (data: TokenFormData) => {
      const response = await apiRequest("POST", "/api/patient-portal/verify-token", data);
      return await response.json();
    },
    onSuccess: () => {
      setAccessToken(tokenForm.getValues("token"));
      setStep("identity-verification");
      toast({
        title: "Token verified",
        description: "Please provide your details to continue.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid token",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyIdentityMutation = useMutation({
    mutationFn: async (data: IdentityFormData) => {
      const response = await apiRequest("POST", "/api/patient-portal/verify-patient", {
        token: accessToken,
        ...data,
      });
      return (await response.json()) as { verified: boolean; accessToken: string };
    },
    onSuccess: (data: { verified: boolean; accessToken: string }) => {
      setVerifiedToken(data.accessToken);
      setStep("authenticated");
      toast({
        title: "Access granted",
        description: "Welcome to your patient portal.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: patientData, isLoading: isLoadingData } = useQuery<{
    patient: Patient;
    lesions: (Lesion & { analysis?: Analysis })[];
  }>({
    queryKey: ["/api/patient-portal/data", verifiedToken],
    enabled: !!verifiedToken && step === "authenticated",
  });

  const onTokenSubmit = (data: TokenFormData) => {
    verifyTokenMutation.mutate(data);
  };

  const onIdentitySubmit = (data: IdentityFormData) => {
    verifyIdentityMutation.mutate(data);
  };

  const handleLogout = () => {
    setStep("token-entry");
    setAccessToken("");
    setVerifiedToken(null);
    tokenForm.reset();
    identityForm.reset();
  };

  // Step 1: Token Entry
  if (step === "token-entry") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-medium text-card-foreground">Patient Portal</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your access token to begin
            </p>
          </div>

          <Form {...tokenForm}>
            <form onSubmit={tokenForm.handleSubmit(onTokenSubmit)} className="space-y-6">
              <FormField
                control={tokenForm.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Token</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Enter your access token"
                          className="pl-10 font-mono"
                          {...field}
                          data-testid="input-token"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={verifyTokenMutation.isPending}
                data-testid="button-verify-token"
              >
                {verifyTokenMutation.isPending ? "Verifying..." : "Continue"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="mt-6 p-4 rounded-md bg-muted">
            <p className="text-xs text-muted-foreground">
              Your access token was provided by your healthcare provider. Contact your doctor if you need assistance.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Step 2: Identity Verification
  if (step === "identity-verification") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-medium text-card-foreground">Verify Your Identity</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Please confirm your details to access your records
            </p>
          </div>

          <Form {...identityForm}>
            <form onSubmit={identityForm.handleSubmit(onIdentitySubmit)} className="space-y-5">
              <FormField
                control={identityForm.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient ID</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Enter your patient ID"
                          className="pl-10"
                          {...field}
                          data-testid="input-patient-id"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={identityForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Enter your full name"
                          className="pl-10"
                          {...field}
                          data-testid="input-name"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={identityForm.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="date"
                          className="pl-10"
                          {...field}
                          data-testid="input-dob"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  className="flex-1"
                  data-testid="button-back"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={verifyIdentityMutation.isPending}
                  data-testid="button-verify-identity"
                >
                  {verifyIdentityMutation.isPending ? "Verifying..." : "Access Portal"}
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-6 p-4 rounded-md bg-muted">
            <p className="text-xs text-muted-foreground">
              For your security, all information must match our records exactly.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Step 3: Authenticated - Show Patient Data
  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-foreground">Your Medical Records</h1>
          <p className="text-muted-foreground mt-1">
            View your lesion analysis history
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
          Logout
        </Button>
      </div>

      {isLoadingData && (
        <Card className="p-12 text-center">
          <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your records...</p>
        </Card>
      )}

      {patientData && (
        <>
          <Card className="p-6">
            <h2 className="text-xl font-medium text-card-foreground mb-4">
              Patient Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-base font-medium text-card-foreground" data-testid="text-patient-name">
                  {patientData.patient.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patient ID</p>
                <p className="text-base font-mono text-card-foreground" data-testid="text-patient-id">
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
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="text-base text-card-foreground">{patientData.patient.gender}</p>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="text-xl font-medium text-foreground mb-4">Lesion History</h2>
            {patientData.lesions.length > 0 ? (
              <div className="space-y-4">
                {patientData.lesions.map((lesion) => (
                  <Card key={lesion.id} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="aspect-square rounded-md border-2 border-border overflow-hidden bg-muted">
                        <img
                          src={lesion.imagePath}
                          alt={`Lesion at ${lesion.location}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-4">
                        <div>
                          <h3 className="text-lg font-medium text-card-foreground">
                            {lesion.location}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Captured on {format(new Date(lesion.capturedAt), "MMMM d, yyyy")}
                          </p>
                        </div>
                        {lesion.analysis && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Classification</p>
                              <Badge variant="secondary" className="text-sm">
                                {lesion.analysis.classification}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Confidence Score</p>
                              <p className="text-2xl font-medium text-card-foreground">
                                {lesion.analysis.confidence}%
                              </p>
                            </div>
                            {lesion.analysis.aiResponse && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Analysis</p>
                                <p className="text-sm text-card-foreground leading-relaxed">
                                  {lesion.analysis.aiResponse}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        {lesion.notes && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Clinical Notes</p>
                            <p className="text-sm text-card-foreground">{lesion.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground">No records found</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  No lesion analyses have been recorded yet
                </p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

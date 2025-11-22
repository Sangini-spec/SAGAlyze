import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { insertPatientSchema, type InsertPatient, type Patient } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Copy, Check, AlertCircle, Shield } from "lucide-react";
import { Link } from "wouter";

export default function NewPatient() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [plaintextToken, setPlaintextToken] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      patientId: "",
      name: "",
      dateOfBirth: "",
      gender: "",
      fitzpatrickType: undefined,
      contactEmail: undefined,
      contactPhone: undefined,
    },
  });

  const createPatient = useMutation({
    mutationFn: async (data: InsertPatient) => {
      const response = await apiRequest("POST", "/api/patients", data);
      return (await response.json()) as Patient & { plaintextToken: string };
    },
    onSuccess: (data: Patient & { plaintextToken: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      // Show token dialog with the one-time plaintext token
      setPlaintextToken(data.plaintextToken);
      setShowTokenDialog(true);
      
      toast({
        title: "Patient created",
        description: "Patient record has been successfully created.",
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

  const onSubmit = (data: InsertPatient) => {
    createPatient.mutate(data);
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
    setLocation("/");
  };

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-medium text-foreground">Add New Patient</h1>
            <p className="text-muted-foreground mt-1">
              Create a new patient record
            </p>
          </div>
        </div>

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., P-2025-001"
                        {...field}
                        data-testid="input-patient-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter patient name"
                        {...field}
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-dob"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fitzpatrickType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fitzpatrick Skin Type (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-fitzpatrick">
                          <SelectValue placeholder="Select skin type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="I">Type I - Always burns, never tans</SelectItem>
                        <SelectItem value="II">Type II - Usually burns, tans minimally</SelectItem>
                        <SelectItem value="III">Type III - Sometimes burns, tans uniformly</SelectItem>
                        <SelectItem value="IV">Type IV - Burns minimally, always tans</SelectItem>
                        <SelectItem value="V">Type V - Rarely burns, tans profusely</SelectItem>
                        <SelectItem value="VI">Type VI - Never burns, deeply pigmented</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="patient@example.com"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Link href="/" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createPatient.isPending}
                  data-testid="button-submit"
                >
                  {createPatient.isPending ? "Creating..." : "Create Patient"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>

      {/* Token Reveal Dialog - One-time viewing */}
      <Dialog open={showTokenDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Patient Access Token Generated</DialogTitle>
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
                  <li>Patient will need this token along with their ID, name, and date of birth to access the portal</li>
                  <li>If lost, you can regenerate a new token from the patient details page</li>
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

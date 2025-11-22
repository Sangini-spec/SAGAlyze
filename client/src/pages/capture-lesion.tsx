import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ImageUpload } from "@/components/image-upload";
import { AnalysisResultCard } from "@/components/analysis-result-card";
import { useToast } from "@/hooks/use-toast";
import { insertLesionSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";
import type { Patient, Analysis } from "@shared/schema";

const captureFormSchema = insertLesionSchema.extend({
  image: z.any(),
});

type CaptureFormData = z.infer<typeof captureFormSchema>;

export default function CaptureLesion() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedPatientId = urlParams.get("patientId");

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const form = useForm<CaptureFormData>({
    resolver: zodResolver(captureFormSchema),
    defaultValues: {
      patientId: preselectedPatientId || "",
      imagePath: "",
      location: "",
      notes: undefined,
    },
  });

  const analyzeLesion = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/analyze-lesion", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Analysis complete",
        description: "AI analysis has been completed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CaptureFormData) => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload a lesion image.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("patientId", data.patientId);
    formData.append("location", data.location);
    if (data.notes) {
      formData.append("notes", data.notes);
    }

    analyzeLesion.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-medium text-foreground">Capture & Analyze Lesion</h1>
          <p className="text-muted-foreground mt-1">
            Upload lesion image for AI-powered classification
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!preselectedPatientId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-patient">
                            <SelectValue placeholder="Select patient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients?.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name} ({patient.patientId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesion Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Left forearm, Upper back"
                          {...field}
                          data-testid="input-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinical Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any relevant clinical observations..."
                          className="resize-none"
                          rows={4}
                          {...field}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Lesion Image</FormLabel>
                  <div className="mt-2">
                    <ImageUpload
                      onImageSelect={setSelectedImage}
                      value={selectedImage}
                      disabled={analyzeLesion.isPending}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={analyzeLesion.isPending || !selectedImage}
                  data-testid="button-analyze"
                >
                  {analyzeLesion.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Lesion"
                  )}
                </Button>
              </form>
            </Form>
          </Card>
        </div>

        <div>
          {analyzeLesion.isPending ? (
            <Card className="p-6">
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-medium text-card-foreground">
                  Analyzing lesion...
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  AI is processing the image
                </p>
              </div>
            </Card>
          ) : analysis ? (
            <div className="space-y-4">
              <AnalysisResultCard analysis={analysis} />
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAnalysis(null);
                    setSelectedImage(null);
                    form.reset();
                  }}
                  data-testid="button-analyze-another"
                >
                  Analyze Another
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate("/")}
                  data-testid="button-done"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <Card className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Loader2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-card-foreground">
                  Ready to analyze
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  Upload a lesion image and click "Analyze Lesion" to get AI-powered
                  classification results
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

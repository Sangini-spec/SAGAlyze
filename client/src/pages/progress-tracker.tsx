import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LesionComparison } from "@/components/lesion-comparison";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { Patient, Lesion, Analysis } from "@shared/schema";

export default function ProgressTracker() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedLesion1Id, setSelectedLesion1Id] = useState<string>("");
  const [selectedLesion2Id, setSelectedLesion2Id] = useState<string>("");

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: lesions, isLoading: loadingLesions } = useQuery<
    (Lesion & { analysis?: Analysis })[]
  >({
    queryKey: ["/api/patients", selectedPatientId, "lesions"],
    enabled: !!selectedPatientId,
  });

  const lesion1 = lesions?.find((l) => l.id === selectedLesion1Id);
  const lesion2 = lesions?.find((l) => l.id === selectedLesion2Id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-medium text-foreground">Progress Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Compare lesion images over time
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Select Patient
            </label>
            <Select
              value={selectedPatientId}
              onValueChange={(value) => {
                setSelectedPatientId(value);
                setSelectedLesion1Id("");
                setSelectedLesion2Id("");
              }}
            >
              <SelectTrigger data-testid="select-patient">
                <SelectValue placeholder="Choose patient" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Before (Earlier)
            </label>
            <Select
              value={selectedLesion1Id}
              onValueChange={setSelectedLesion1Id}
              disabled={!selectedPatientId || loadingLesions}
            >
              <SelectTrigger data-testid="select-lesion-before">
                <SelectValue placeholder="Select lesion" />
              </SelectTrigger>
              <SelectContent>
                {lesions?.map((lesion) => (
                  <SelectItem
                    key={lesion.id}
                    value={lesion.id}
                    disabled={lesion.id === selectedLesion2Id}
                  >
                    {lesion.location} - {new Date(lesion.capturedAt).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              After (Recent)
            </label>
            <Select
              value={selectedLesion2Id}
              onValueChange={setSelectedLesion2Id}
              disabled={!selectedPatientId || loadingLesions}
            >
              <SelectTrigger data-testid="select-lesion-after">
                <SelectValue placeholder="Select lesion" />
              </SelectTrigger>
              <SelectContent>
                {lesions?.map((lesion) => (
                  <SelectItem
                    key={lesion.id}
                    value={lesion.id}
                    disabled={lesion.id === selectedLesion1Id}
                  >
                    {lesion.location} - {new Date(lesion.capturedAt).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {loadingLesions ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-64 w-full" />
            </Card>
          ))}
        </div>
      ) : lesion1 && lesion2 ? (
        <LesionComparison lesion1={lesion1} lesion2={lesion2} />
      ) : (
        <Card className="p-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground">
            Select lesions to compare
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Choose a patient and two lesion images to track progress over time
          </p>
        </Card>
      )}
    </div>
  );
}

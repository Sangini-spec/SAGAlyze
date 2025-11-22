import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";
import type { Patient } from "@shared/schema";
import { format } from "date-fns";

interface PatientCardProps {
  patient: Patient;
}

export function PatientCard({ patient }: PatientCardProps) {
  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={`/patients/${patient.id}`}>
      <Card
        className="p-6 hover-elevate active-elevate-2 cursor-pointer transition-shadow"
        data-testid={`card-patient-${patient.id}`}
      >
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-card-foreground truncate" data-testid={`text-patient-name-${patient.id}`}>
              {patient.name}
            </h3>
            <p className="text-sm text-muted-foreground font-mono mt-1" data-testid={`text-patient-id-${patient.id}`}>
              ID: {patient.patientId}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {patient.gender}
              </Badge>
              {patient.fitzpatrickType && (
                <Badge variant="outline" className="text-xs">
                  Type {patient.fitzpatrickType}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Added {format(new Date(patient.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

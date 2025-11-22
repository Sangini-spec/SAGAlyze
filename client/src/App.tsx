import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
import NewPatient from "@/pages/new-patient";
import PatientDetail from "@/pages/patient-detail";
import CaptureLesion from "@/pages/capture-lesion";
import Analyses from "@/pages/analyses";
import ProgressTracker from "@/pages/progress-tracker";
import Reports from "@/pages/reports";
import PatientPortal from "@/pages/patient-portal";
import FairnessCalibration from "@/pages/fairness-calibration";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/patients/new" component={NewPatient} />
      <Route path="/patients/:id" component={PatientDetail} />
      <Route path="/capture" component={CaptureLesion} />
      <Route path="/analyses" component={Analyses} />
      <Route path="/progress" component={ProgressTracker} />
      <Route path="/reports" component={Reports} />
      <Route path="/patient-portal" component={PatientPortal} />
      <Route path="/fairness" component={FairnessCalibration} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b border-border bg-background">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-8 bg-background">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientCard } from "@/components/patient-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Users, Activity, TrendingUp, Brain } from "lucide-react";
import { useState, useEffect } from "react";
import type { Patient, Analysis, Lesion } from "@shared/schema";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

// Mock data for charts (in a real app, this would come from API)
const severityData = [
  { name: 'Mild', value: 45, color: '#10b981' },
  { name: 'Moderate', value: 32, color: '#f59e0b' },
  { name: 'Severe', value: 23, color: '#ef4444' }
];

const diseaseTypeData = [
  { name: 'Eczema', count: 28, color: '#8b5cf6' },
  { name: 'Psoriasis', count: 22, color: '#ec4899' },
  { name: 'Acne', count: 35, color: '#3b82f6' },
  { name: 'Cellulitis', count: 15, color: '#f59e0b' },
  { name: 'Melanoma', count: 8, color: '#ef4444' },
  { name: 'Other', count: 12, color: '#6b7280' }
];

const improvementTrendData = [
  { month: 'Jan', improvement: 65 },
  { month: 'Feb', improvement: 70 },
  { month: 'Mar', improvement: 68 },
  { month: 'Apr', improvement: 75 },
  { month: 'May', improvement: 82 },
  { month: 'Jun', improvement: 88 }
];

// Animated counter component
function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: stats } = useQuery<{
    totalPatients: number;
    totalLesions: number;
    recentAnalyses: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: analyses } = useQuery<(Analysis & { lesion?: Lesion & { patient?: Patient } })[]>({
    queryKey: ["/api/analyses"],
  });

  const filteredPatients = patients?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get recent analyses with images (limit to 6)
  const recentAnalysesWithImages = (analyses ?? []).filter(a => a.lesion?.imagePath).slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Header with gradient background */}
      <div className="relative pb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg -z-10" />
        <div className="pt-6 px-4">
          <h1 className="text-3xl font-medium text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage patients and track dermatological progress
          </p>
        </div>
      </div>

      {/* Stats Cards with animations */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Patients</p>
              <p className="text-3xl font-medium text-card-foreground mt-2" data-testid="text-total-patients">
                <AnimatedCounter value={stats?.totalPatients || 0} />
              </p>
            </div>
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Lesions</p>
              <p className="text-3xl font-medium text-card-foreground mt-2" data-testid="text-total-lesions">
                <AnimatedCounter value={stats?.totalLesions || 0} />
              </p>
            </div>
            <div className="h-12 w-12 rounded-md bg-success/10 flex items-center justify-center">
              <Activity className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recent Analyses</p>
              <p className="text-3xl font-medium text-card-foreground mt-2" data-testid="text-recent-analyses">
                <AnimatedCounter value={stats?.recentAnalyses || 0} />
              </p>
            </div>
            <div className="h-12 w-12 rounded-md bg-warning/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Model Accuracy</p>
              <p className="text-3xl font-medium text-card-foreground mt-2">
                91.4%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Updated today</p>
            </div>
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Recently Analyzed Images Gallery */}
      {recentAnalysesWithImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h2 className="text-xl font-medium text-foreground mb-4">Recently Analyzed Images</h2>
          <Card className="p-6 shadow-md">
            <div className="flex gap-4 overflow-x-auto">
              {recentAnalysesWithImages.map((analysis, index) => (
                <Link key={analysis.id} href={`/patients/${analysis.lesion?.patientId}`}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.05 * index }}
                    className="flex-shrink-0 cursor-pointer hover-elevate active-elevate-2 rounded-full transition-all duration-200"
                  >
                    <div className="relative group">
                      <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border">
                        <img
                          src={analysis.lesion?.imagePath}
                          alt={`Analysis ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium border-2 border-background">
                        {analysis.confidence}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Charts Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Severity Distribution Donut Chart */}
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-card-foreground">Severity Distribution</h3>
            <span className="text-xs text-muted-foreground italic">Sample data</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Disease Type Frequency Bar Chart */}
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-card-foreground">Disease Type Frequency</h3>
            <span className="text-xs text-muted-foreground italic">Sample data</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={diseaseTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={800}>
                {diseaseTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Patient Improvement Trend Line Graph */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-card-foreground">Patient Improvement Trend</h3>
            <span className="text-xs text-muted-foreground italic">Sample data</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={improvementTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="improvement" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                activeDot={{ r: 7 }}
                animationDuration={1000}
                animationEasing="ease-in-out"
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Existing Patient Search and List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-patients"
          />
        </div>
        <Link href="/patients/new">
          <Button data-testid="button-add-patient">
            <Plus className="h-4 w-4 mr-2" />
            Add New Patient
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <h2 className="text-xl font-medium text-foreground mb-4">All Patients</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredPatients && filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center shadow-md">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground">
              {searchQuery ? "No patients found" : "No patients yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery
                ? "Try adjusting your search"
                : "Get started by adding your first patient"}
            </p>
            {!searchQuery && (
              <Link href="/patients/new">
                <Button className="mt-4" data-testid="button-add-first-patient">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Patient
                </Button>
              </Link>
            )}
          </Card>
        )}
      </motion.div>
    </div>
  );
}

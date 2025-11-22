import { Link, useLocation } from "wouter";
import {
  Home,
  UserPlus,
  Camera,
  Activity,
  TrendingUp,
  FileText,
  User,
  Scale,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    testId: "nav-dashboard",
  },
  {
    title: "New Patient",
    url: "/patients/new",
    icon: UserPlus,
    testId: "nav-new-patient",
  },
  {
    title: "Capture Lesion",
    url: "/capture",
    icon: Camera,
    testId: "nav-capture",
  },
  {
    title: "Analysis History",
    url: "/analyses",
    icon: Activity,
    testId: "nav-analyses",
  },
  {
    title: "Progress Tracker",
    url: "/progress",
    icon: TrendingUp,
    testId: "nav-progress",
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
    testId: "nav-reports",
  },
  {
    title: "Patient Portal",
    url: "/patient-portal",
    icon: User,
    testId: "nav-patient-portal",
  },
  {
    title: "AI Fairness",
    url: "/fairness",
    icon: Scale,
    testId: "nav-fairness",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-sidebar-foreground">SAGAlyze</h1>
            <p className="text-xs text-muted-foreground">Dermatology Assistant</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Clinical Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={item.testId}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}


"use client";

import Link from "next/link";
import React, { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart2,
  CalendarDays,
  LayoutDashboard,
  Package,
  PencilRuler,
  Shield,
  Factory,
  Store,
  Send,
  Plus,
  History,
  Settings,
  Server,
  Workflow,
  Car,
  Bell,
  CircleDollarSign,
  UsersRound,
  Handshake,
  Receipt,
  GanttChartSquare,
  Folder,
  Sun,
  Moon,
  Laptop,
  ChevronsUpDown,
  Megaphone,
  FilePlus2,
  HandCoins,
  UserCheck,
  LogOut,
  LifeBuoy,
  CheckSquare,
  FileSignature,
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReportBuilderIcon } from "@/components/icons";
import { useAuth, type Role } from "@/context/role-context";
import { useBranding } from "@/context/branding-context";
import { Skeleton } from "../ui/skeleton";
import { getNotificationsForUser, markNotificationsAsRead } from '@/services/notification-service';
import type { Notification } from '@/lib/types';
import { format } from 'date-fns';

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Handshake },
  { href: "/sales", label: "Sales", icon: CircleDollarSign },
  { href: "/bids", label: "Bids", icon: FileSignature },
  { href: "/claim-commission", label: "Claim Commission", icon: HandCoins },
  { href: "/projects", label: "Projects", icon: GanttChartSquare },
  { href: "/inventory", label: "Inventory & Purchasing", icon: Package },
  { href: "/fleet", label: "Fleet Management", icon: Car },
  { href: "/manufacturing", label: "Manufacturing", icon: Factory },
  { href: "/quality-control", label: "Quality Control", icon: CheckSquare },
  { href: "/pos", label: "Point of Sale", icon: Store },
  { href: "/accounting", label: "Accounting", icon: Receipt },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/hr", label: "HR", icon: UsersRound },
  { href: "/requests", label: "Cash & Material Requests", icon: FilePlus2 },
  { href: "/documents", label: "Documents", icon: Folder },
  { href: "/communication", label: "Communication", icon: Send },
  { href: "/helpdesk", label: "Helpdesk", icon: LifeBuoy },
  { href: "/social-assistant", label: "Social Assistant", icon: Megaphone },
  { href: "/workflows", label: "Workflow Automation", icon: Workflow },
  { href: "/team", label: "Team / RBAC", icon: Shield },
  { href: "/audits", label: "Audit & Logs", icon: History },
  { href: "/website-builder", label: "Website Builder", icon: PencilRuler },
  { href: "/insights", label: "Insights", icon: BarChart2 },
  { href: "/report-builder", label: "Report Builder", icon: ReportBuilderIcon },
  { href: "/admin", label: "Admin Panel", icon: Server },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ROLES_CONFIG: Record<Role, { name: string; access: string[] }> = {
  Admin: { name: 'Admin', access: ['all'] },
  ManagingDirector: { name: 'Managing Director', access: ['all'] },
  ExecutiveDirector: { name: 'Executive Director', access: ['all'] },
  GeneralManager: { name: 'General Manager', access: ['all'] },
  HRManager: { name: 'HR Manager', access: ['/dashboard', '/hr'] },
  FactoryManager: { name: 'Factory Manager', access: ['/dashboard', '/manufacturing', '/inventory', '/projects'] },
  OperationalManager: { name: 'Operational Manager', access: ['/dashboard', '/fleet', '/projects', '/appointments'] },
  SalesExecutive: { name: 'Sales Executive', access: ['/dashboard', '/crm', '/sales', '/claim-commission', '/appointments'] },
  SalesAgent: { name: 'Sales Agent', access: ['/dashboard', '/crm', '/sales', '/claim-commission', '/appointments', '/requests'] },
  BidsOfficer: { name: 'Bids Officer', access: ['/dashboard', '/bids'] },
  ProcurementOfficer: { name: 'Procurement Officer', access: ['/dashboard', '/inventory'] },
  Cashier: { name: 'Cashier', access: ['/dashboard', '/sales', '/claim-commission', '/requests', '/pos', '/accounting'] },
  StoreManager: { name: 'StoreManager', access: ['/dashboard', '/inventory', '/requests'] },
  User: { name: 'Carpenter', access: ['/dashboard', '/manufacturing', '/inventory'] },
};


export function AppSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, role, roleName, logout } = useAuth();
  const { branding, loading: brandingLoading } = useBranding();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationLoading, setIsNotificationLoading] = useState(true);

  useEffect(() => {
      if (user) {
          const fetchNotifications = async () => {
              setIsNotificationLoading(true);
              const userNotifications = await getNotificationsForUser(user.id);
              setNotifications(userNotifications);
              setIsNotificationLoading(false);
          };
          fetchNotifications();
      }
  }, [user]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const handleNotificationClick = async (notification: Notification) => {
      if (!notification.isRead) {
          await markNotificationsAsRead([notification.id]);
          setNotifications(prev => prev.map(n => n.id === notification.id ? {...n, isRead: true} : n));
      }
      if (notification.link) {
          router.push(notification.link);
      }
  };

  const handleMarkAllAsRead = async () => {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length > 0) {
          await markNotificationsAsRead(unreadIds);
          setNotifications(prev => prev.map(n => ({...n, isRead: true})));
      }
  };

  const visibleMenuItems = React.useMemo(() => {
    const roleAccess = ROLES_CONFIG[role]?.access;
    if (!roleAccess || roleAccess.includes('all')) {
        return menuItems;
    }
    return menuItems.filter(item => roleAccess.includes(item.href));
  }, [role]);

  if (!user) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader>
        {brandingLoading ? (
            <div className="flex items-center gap-2.5 p-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-5 w-32 group-data-[collapsible=icon]:hidden" />
            </div>
        ) : (
            <div className="flex items-center gap-2.5 w-full justify-start text-left h-auto p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:p-0">
                <Avatar className="h-7 w-7">
                    <AvatarImage src={branding.logoUrl} alt={branding.companyName} />
                    <AvatarFallback>{branding.companyName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow overflow-hidden group-data-[collapsible=icon]:hidden">
                    <h1 className="text-lg font-bold tracking-tight truncate">{branding.companyName}</h1>
                </div>
            </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {visibleMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <div className="flex items-center gap-1">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2.5 px-2 text-left flex-grow">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="person avatar" />
                        <AvatarFallback>{user.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow overflow-hidden group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{roleName}</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                <Link href="/settings?tab=profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="ml-2">Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                      <DropdownMenuRadioItem value="light">
                        <Sun className="mr-2" /> Light
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">
                        <Moon className="mr-2" /> Dark
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system">
                        <Laptop className="mr-2" /> System
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative shrink-0">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                            </span>
                        )}
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 sm:w-96 mb-2" side="top" align="end">
                    <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Notifications</span>
                        {unreadCount > 0 && <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={handleMarkAllAsRead}>Mark all as read</Button>}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-80 overflow-y-auto">
                    {isNotificationLoading ? (<div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>) 
                    : notifications.length > 0 ? notifications.map(notification => (
                        <DropdownMenuItem key={notification.id} className={cn("gap-3 items-start h-auto cursor-pointer", !notification.isRead && "bg-accent/50")} onClick={() => handleNotificationClick(notification)}>
                            <div className={cn("h-2 w-2 rounded-full mt-2 shrink-0", !notification.isRead ? "bg-primary" : "bg-transparent")}></div>
                            <div className="flex-1 whitespace-normal">
                                <p className="font-semibold">{notification.title}</p>
                                <p className="text-xs text-muted-foreground">{notification.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">{format(new Date(notification.createdAt), 'PP p')}</p>
                            </div>
                        </DropdownMenuItem>
                    )) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No new notifications.
                        </div>
                    )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

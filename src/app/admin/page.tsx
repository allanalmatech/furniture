
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Edit } from "lucide-react";
import { cn, formatCurrency, calculateTotal } from "@/lib/utils";
import type { StaffMember, SalesTarget, Quotation, Role } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, isSameMonth } from "date-fns";
import { roleDisplayConfig } from "@/lib/auth";
import { getStaff, updateStaff } from "@/services/hr-service";
import { getSalesTargets, upsertSalesTarget, getQuotations } from "@/services/sales-service";
import { Skeleton } from "@/components/ui/skeleton";


export default function AdminPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [targets, setTargets] = useState<SalesTarget[]>([]);
    const [users, setUsers] = useState<StaffMember[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    
    const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
    const [newRoleForUser, setNewRoleForUser] = useState<Role | undefined>();
    const [newTargetAgentId, setNewTargetAgentId] = useState('');
    const [newTargetAmount, setNewTargetAmount] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [usersData, targetsData, quotesData] = await Promise.all([
                    getStaff(),
                    getSalesTargets(),
                    getQuotations(),
                ]);
                setUsers(usersData);
                setTargets(targetsData);
                setQuotations(quotesData);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch admin data." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const salesAgents = useMemo(() => 
        users.filter(user => user.role === 'SalesAgent'),
        [users]
    );

    useEffect(() => {
        if (editingUser) {
            setNewRoleForUser(editingUser.role as Role);
        }
    }, [editingUser]);

    const handleOpenUserDialog = (user: StaffMember) => {
        setEditingUser(user);
        setIsUserDialogOpen(true);
    };

    const handleUpdateRole = async () => {
        if (!editingUser || !newRoleForUser) return;
        
        await updateStaff(editingUser.id, { role: newRoleForUser });

        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, role: newRoleForUser } : u));
        toast({ title: "Role Updated", description: `${editingUser.name}'s role has been changed to ${roleDisplayConfig[newRoleForUser].name}.` });
        setIsUserDialogOpen(false);
        setEditingUser(null);
    };

    const handleToggleStatus = async (user: StaffMember) => {
        const newStatus = user.status === 'Active' ? 'Terminated' : 'Active';
        await updateStaff(user.id, { status: newStatus });
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        toast({ title: `User ${newStatus === 'Active' ? 'Enabled' : 'Disabled'}`, description: `${user.name} has been ${newStatus.toLowerCase()}.` });
    };

    const handleSetTarget = async () => {
        if (!newTargetAgentId || !newTargetAmount) {
            toast({ variant: 'destructive', title: 'Missing information', description: 'Please select an agent and set a target amount.' });
            return;
        }

        const agent = salesAgents.find(a => a.id === newTargetAgentId);
        if (!agent) return;

        const period = format(new Date(), "yyyy-MM");
        
        const existingTarget = targets.find(t => t.agentName === agent.name && t.period === period);
        
        const targetData: Partial<SalesTarget> = {
            agentName: agent.name,
            period: period,
            targetAmount: Number(newTargetAmount),
            achievedAmount: existingTarget?.achievedAmount || 0,
        };

        const updatedTarget = await upsertSalesTarget(targetData);
        if (existingTarget) {
            setTargets(prev => prev.map(t => t.id === updatedTarget.id ? updatedTarget : t));
        } else {
            setTargets(prev => [...prev, updatedTarget]);
        }
        
        toast({ title: "Target Set/Updated", description: `Sales target for ${agent.name} has been set.` });
        
        setNewTargetAgentId('');
        setNewTargetAmount('');
        setIsTargetDialogOpen(false);
    }

    const targetsForDisplay = useMemo(() => {
        const currentMonth = new Date();
        return targets.map(target => {
            if (!isSameMonth(new Date(target.period), currentMonth)) return target;

            const acceptedQuotes = quotations.filter(q => 
                q.agentName === target.agentName &&
                q.status === 'Accepted' &&
                isSameMonth(new Date(q.date), currentMonth)
            );
            const achievedAmount = acceptedQuotes.reduce((sum, q) => sum + calculateTotal(q.items), 0);
            return { ...target, achievedAmount };
        });
    }, [targets, quotations]);

  return (
    <div>
      <PageHeader
        title="System Administration"
        description="Manage internal users and system-wide settings."
      />

      <Tabs defaultValue="users">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="sales-targets">Sales Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage all registered users for Footsteps Furniture.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? Array.from({length: 5}).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10" /></TableCell></TableRow>
                  )) : users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>{roleDisplayConfig[user.role as Role]?.name}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                            "border-transparent",
                            user.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        )}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={user.role === 'Admin'}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenUserDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                {user.status === 'Active' ? 'Disable User' : 'Enable User'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-targets">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Sales Agent Targets</CardTitle>
                        <CardDescription>Set and manage monthly sales targets for your agents.</CardDescription>
                    </div>
                     <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Set Target
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Set New Sales Target</DialogTitle>
                                <DialogDescription>Select a sales agent and set their target for the current month.</DialogDescription>
                            </DialogHeader>
                             <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="agent-select">Sales Agent</Label>
                                    <Select value={newTargetAgentId} onValueChange={setNewTargetAgentId}>
                                        <SelectTrigger id="agent-select">
                                            <SelectValue placeholder="Select an agent" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {salesAgents.map(agent => (
                                                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="target-amount">Target Amount (UGX)</Label>
                                    <Input id="target-amount" type="number" placeholder="e.g. 50000" value={newTargetAmount} onChange={(e) => setNewTargetAmount(e.target.value)}/>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleSetTarget}>Save Target</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Agent</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Achieved</TableHead>
                                <TableHead className="w-[30%]">Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>
                            )) : targetsForDisplay.map(target => {
                                const progress = target.targetAmount > 0 ? Math.min((target.achievedAmount / target.targetAmount) * 100, 100) : 0;
                                return (
                                    <TableRow key={target.id}>
                                        <TableCell className="font-medium">{target.agentName}</TableCell>
                                        <TableCell>{target.period}</TableCell>
                                        <TableCell>{formatCurrency(target.targetAmount)}</TableCell>
                                        <TableCell>{formatCurrency(target.achievedAmount)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={progress} className="flex-1" />
                                                <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogDescription>Change the role for {editingUser?.name}.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="role-select">Role</Label>
                <Select
                    value={newRoleForUser}
                    onValueChange={(value) => setNewRoleForUser(value as Role)}
                >
                    <SelectTrigger id="role-select">
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(roleDisplayConfig).map(([roleKey, roleValue]) => (
                            <SelectItem key={roleKey} value={roleKey} disabled={roleKey === 'Admin'}>
                                {roleValue.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsUserDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateRole}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

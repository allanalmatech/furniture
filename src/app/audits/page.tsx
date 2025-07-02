
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, History, Search, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AuditLog, ApprovalWorkflow } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getAuditLogs, getApprovalWorkflows, addApprovalWorkflow, updateApprovalWorkflow, deleteApprovalWorkflow } from "@/services/audit-service";
import { Skeleton } from "@/components/ui/skeleton";

const approvalFlowSchema = z.object({
    name: z.string().min(1, "Workflow name is required."),
    trigger: z.string().min(1, "Trigger condition is required (e.g., 'PO amount > $5000')."),
    steps: z.coerce.number().int().min(1, "There must be at least one approval step."),
});
type ApprovalFlowFormValues = z.infer<typeof approvalFlowSchema>;


export default function AuditsPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [approvalFlows, setApprovalFlows] = useState<ApprovalWorkflow[]>([]);

    const [logSearchQuery, setLogSearchQuery] = useState("");
    const [flowSearchQuery, setFlowSearchQuery] = useState("");
    const [isFlowDialogOpen, setIsFlowDialogOpen] = useState(false);
    const [editingFlow, setEditingFlow] = useState<ApprovalWorkflow | null>(null);
    const [flowToDelete, setFlowToDelete] = useState<ApprovalWorkflow | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [logsData, flowsData] = await Promise.all([
                    getAuditLogs(),
                    getApprovalWorkflows(),
                ]);
                setAuditLogs(logsData);
                setApprovalFlows(flowsData);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Failed to load audit data." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const form = useForm<ApprovalFlowFormValues>({
        resolver: zodResolver(approvalFlowSchema),
    });

    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log =>
            log.user.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
            log.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
            log.details.toLowerCase().includes(logSearchQuery.toLowerCase())
        );
    }, [auditLogs, logSearchQuery]);
    
    const filteredFlows = useMemo(() => {
        return approvalFlows.filter(flow =>
            flow.name.toLowerCase().includes(flowSearchQuery.toLowerCase()) ||
            flow.trigger.toLowerCase().includes(flowSearchQuery.toLowerCase())
        );
    }, [approvalFlows, flowSearchQuery]);

    const handleOpenDialog = (flow: ApprovalWorkflow | null) => {
        setEditingFlow(flow);
        if (flow) {
            form.reset(flow);
        } else {
            form.reset({ name: "", trigger: "", steps: 1 });
        }
        setIsFlowDialogOpen(true);
    };

    const onFlowSubmit = async (values: ApprovalFlowFormValues) => {
        try {
            if (editingFlow) {
                const updatedData = { ...editingFlow, ...values };
                await updateApprovalWorkflow(editingFlow.id, values);
                setApprovalFlows(prev => prev.map(f => f.id === editingFlow.id ? updatedData : f));
                toast({ title: "Workflow Updated", description: "The workflow has been successfully updated." });
            } else {
                const newFlowData: Omit<ApprovalWorkflow, 'id'> = {
                    ...values,
                    status: "Active",
                };
                const newId = await addApprovalWorkflow(newFlowData);
                setApprovalFlows(prev => [{ id: newId, ...newFlowData }, ...prev]);
                toast({ title: "Workflow Created", description: `The "${values.name}" workflow has been created.` });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save the workflow." });
        } finally {
            setIsFlowDialogOpen(false);
            setEditingFlow(null);
        }
    };
    
    const handleToggleStatus = async (flow: ApprovalWorkflow) => {
        const newStatus = flow.status === 'Active' ? 'Inactive' : 'Active';
        try {
            await updateApprovalWorkflow(flow.id, { status: newStatus });
            setApprovalFlows(prev => prev.map(f => f.id === flow.id ? { ...f, status: newStatus } : f));
            toast({ title: "Status Updated", description: `Workflow status for "${flow.name}" changed to ${newStatus}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not update workflow status." });
        }
    };

    const handleOpenDeleteDialog = (flow: ApprovalWorkflow) => {
        setFlowToDelete(flow);
    };

    const handleDeleteFlow = async () => {
        if (!flowToDelete) return;
        try {
            await deleteApprovalWorkflow(flowToDelete.id);
            setApprovalFlows(prev => prev.filter(f => f.id !== flowToDelete.id));
            toast({ variant: 'destructive', title: "Workflow Deleted", description: `The workflow "${flowToDelete.name}" has been removed.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Delete Failed", description: "Could not delete the workflow." });
        } finally {
            setFlowToDelete(null);
        }
    };


  return (
    <div>
      <PageHeader
        title="Audit & Logs"
        description="Monitor system activity and manage approval workflows."
      />

      <Tabs defaultValue="activity">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          <TabsTrigger value="approvals">Approval Flows</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
            <Card>
                <CardHeader>
                    <CardTitle>Activity Logs</CardTitle>
                    <CardDescription>A detailed record of all actions taken within the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center mb-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search logs by user, action, or details..." 
                                className="pl-9" 
                                value={logSearchQuery}
                                onChange={(e) => setLogSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline">
                            <History className="mr-2 h-4 w-4" />
                            Export Logs
                        </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px]">Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead className="hidden md:table-cell">Details</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? Array.from({length: 4}).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10" /></TableCell></TableRow>
                          )) : filteredLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                              <TableCell>
                                <div className="font-medium">{log.user.split('@')[0]}</div>
                                <div className="text-sm text-muted-foreground">{log.user}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{log.action}</Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{log.details}</TableCell>
                              <TableCell>
                                <Badge
                                  className={cn(
                                    log.status === "Success" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                                    log.status === "Failure" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                                    log.status === "Pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"
                                  )}
                                >
                                  {log.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="approvals">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Approval Workflows</CardTitle>
                    <CardDescription>Create and manage approval workflows for critical actions.</CardDescription>
                </div>
                <Dialog open={isFlowDialogOpen} onOpenChange={setIsFlowDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog(null)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Flow
                    </Button>
                  </DialogTrigger>
                </Dialog>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search flows..." 
                                className="pl-9"
                                value={flowSearchQuery}
                                onChange={(e) => setFlowSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Workflow Name</TableHead>
                            <TableHead>Trigger</TableHead>
                            <TableHead className="hidden sm:table-cell">Steps</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? Array.from({length: 3}).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10" /></TableCell></TableRow>
                        )) : filteredFlows.map((flow) => (
                            <TableRow key={flow.id}>
                            <TableCell className="font-medium">{flow.name}</TableCell>
                            <TableCell className="text-muted-foreground">{flow.trigger}</TableCell>
                            <TableCell className="hidden sm:table-cell">{flow.steps}</TableCell>
                            <TableCell>
                                <Badge className={cn(
                                    flow.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300'
                                )}>
                                    {flow.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleOpenDialog(flow)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleToggleStatus(flow)}>{flow.status === 'Active' ? 'Disable' : 'Enable'}</DropdownMenuItem>
                                    <DropdownMenuItem disabled>View History</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onSelect={() => handleOpenDeleteDialog(flow)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
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
      </Tabs>
      <Dialog open={isFlowDialogOpen} onOpenChange={(open) => { if (!open) setEditingFlow(null); setIsFlowDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{editingFlow ? "Edit Workflow" : "Create New Approval Workflow"}</DialogTitle>
                <DialogDescription>{editingFlow ? "Update the details for this workflow." : "Define a new multi-step approval process."}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onFlowSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Workflow Name</FormLabel><FormControl><Input placeholder="e.g., High-Value Purchase Order" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="trigger" render={({ field }) => (<FormItem><FormLabel>Trigger Condition</FormLabel><FormControl><Input placeholder="e.g., PO amount > $5000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="steps" render={({ field }) => (<FormItem><FormLabel>Number of Approval Steps</FormLabel><FormControl><Input type="number" placeholder="2" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => { setIsFlowDialogOpen(false); setEditingFlow(null); }}>Cancel</Button>
                        <Button type="submit">{editingFlow ? "Save Changes" : "Create Workflow"}</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!flowToDelete} onOpenChange={(open) => !open && setFlowToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the workflow for <span className="font-semibold">{flowToDelete?.name}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteFlow}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

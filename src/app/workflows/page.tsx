
"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Play, Pause, Edit, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWorkflows, addWorkflow, updateWorkflow, deleteWorkflow } from "@/services/workflow-service";
import { Skeleton } from "@/components/ui/skeleton";

const availableTriggers = ["New Contact Created", "Invoice Paid", "Order Created", "Scheduled Time"];
const availableActions = ["Send Welcome Email", "Create Project Task", "Send Thank You SMS", "Send Notification to Admin", "Generate Sales Report"];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowTrigger, setNewWorkflowTrigger] = useState("");
  const [newWorkflowAction, setNewWorkflowAction] = useState("");
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchWorkflows = async () => {
        setIsLoading(true);
        try {
            const data = await getWorkflows();
            setWorkflows(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch workflows.' });
        } finally {
            setIsLoading(false);
        }
    }
    fetchWorkflows();
  }, [toast]);

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName || !newWorkflowTrigger || !newWorkflowAction) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill out all fields to create a workflow.",
      });
      return;
    }
    const newWorkflowData: Omit<Workflow, 'id'> = {
      name: newWorkflowName,
      trigger: newWorkflowTrigger,
      actions: [newWorkflowAction],
      status: "Draft",
    };
    try {
        const newId = await addWorkflow(newWorkflowData);
        setWorkflows(prev => [{ ...newWorkflowData, id: newId }, ...prev]);
        toast({
            title: "Workflow Created",
            description: `"${newWorkflowData.name}" has been saved as a draft.`,
        });
        setIsDialogOpen(false);
        setNewWorkflowName("");
        setNewWorkflowTrigger("");
        setNewWorkflowAction("");
    } catch(error) {
        toast({ variant: "destructive", title: "Creation Failed", description: "Could not create workflow." });
    }
  };
  
  const handleUpdateStatus = async (id: string, status: Workflow['status']) => {
    try {
        await updateWorkflow(id, { status });
        setWorkflows(prev => prev.map(w => (w.id === id ? { ...w, status } : w)));
        toast({
        title: `Workflow ${status}`,
        description: `The workflow has been ${status.toLowerCase()}.`,
        });
    } catch(error) {
        toast({ variant: "destructive", title: "Update Failed", description: "Could not update workflow status." });
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await deleteWorkflow(id);
        setWorkflows(prev => prev.filter(w => w.id !== id));
        toast({ title: "Workflow Deleted", variant: "destructive"});
    } catch (error) {
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete workflow." });
    }
  };

  return (
    <div>
      <PageHeader
        title="Workflow Automation"
        description="Automate repetitive tasks and connect your modules."
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Set up a trigger and an action to automate a process.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                    <Label htmlFor="wf-name">Workflow Name</Label>
                    <Input id="wf-name" placeholder="e.g. New Customer Onboarding" value={newWorkflowName} onChange={(e) => setNewWorkflowName(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="wf-trigger">When this happens... (Trigger)</Label>
                     <Select onValueChange={setNewWorkflowTrigger}>
                        <SelectTrigger id="wf-trigger">
                            <SelectValue placeholder="Select a trigger" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTriggers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="wf-action">...do this (Action)</Label>
                    <Select onValueChange={setNewWorkflowAction}>
                        <SelectTrigger id="wf-action">
                            <SelectValue placeholder="Select an action" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateWorkflow}>Save Workflow</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>My Workflows</CardTitle>
          <CardDescription>A list of all your automated workflows.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="hidden md:table-cell">Actions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({length: 4}).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>
                )) : workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.name}</TableCell>
                    <TableCell>{workflow.trigger}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{workflow.actions.join(', ')}</TableCell>
                    <TableCell>
                       <Badge
                          className={cn(
                            "border-transparent",
                            workflow.status === "Active" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                            workflow.status === "Draft" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
                            workflow.status === "Paused" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"
                          )}
                        >
                          {workflow.status}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit
                          </DropdownMenuItem>
                          {workflow.status !== 'Active' && <DropdownMenuItem onClick={() => handleUpdateStatus(workflow.id, 'Active')}><Play className="mr-2 h-4 w-4"/>Activate</DropdownMenuItem>}
                          {workflow.status === 'Active' && <DropdownMenuItem onClick={() => handleUpdateStatus(workflow.id, 'Paused')}><Pause className="mr-2 h-4 w-4"/>Pause</DropdownMenuItem>}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(workflow.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

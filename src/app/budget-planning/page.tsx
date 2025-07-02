
"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { Budget } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getBudgets, addBudget, updateBudget, deleteBudget } from "@/services/accounting-service";
import { Skeleton } from "@/components/ui/skeleton";

const budgetFormSchema = z.object({
  category: z.string().min(1, "Category is required."),
  period: z.string().min(1, "Period is required (e.g., Q3 2024)."),
  allocated: z.coerce.number().positive("Allocated amount must be a positive number."),
  spent: z.coerce.number().nonnegative("Spent amount cannot be negative."),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export default function BudgetPlanningPage() {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const data = await getBudgets();
        setBudgets(data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch budgets.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchBudgets();
  }, [toast]);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
        category: "",
        period: "",
        allocated: 0,
        spent: 0,
    }
  });

  const handleDialogOpen = (budget: Budget | null) => {
    setSelectedBudget(budget);
    if (budget) {
      form.reset(budget);
    } else {
      form.reset({ category: "", period: "", allocated: 0, spent: 0 });
    }
    setIsDialogOpen(true);
  };
  
  const handleAlertOpen = (budget: Budget) => {
      setBudgetToDelete(budget);
  };

  const onSubmit = async (values: BudgetFormValues) => {
    const allocated = values.allocated;
    const spent = values.spent;
    let status: Budget['status'] = "On Track";
    if (spent > allocated) {
      status = "Over Budget";
    } else if (spent < allocated * 0.9) {
        status = "Under Budget";
    }
    
    try {
      if (selectedBudget) {
        const updatedData = { ...selectedBudget, ...values, status };
        await updateBudget(selectedBudget.id, updatedData);
        setBudgets(prev => prev.map(b => (b.id === selectedBudget.id ? updatedData : b)));
        toast({ title: "Budget Updated", description: "The budget details have been saved." });
      } else {
        const newBudgetData: Omit<Budget, 'id'> = { ...values, status };
        const newId = await addBudget(newBudgetData);
        setBudgets(prev => [{ id: newId, ...newBudgetData }, ...prev]);
        toast({ title: "Budget Created", description: `A new budget for ${values.category} has been created.` });
      }
      setIsDialogOpen(false);
      setSelectedBudget(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the budget.' });
    }
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    try {
      await deleteBudget(budgetToDelete.id);
      setBudgets(prev => prev.filter(b => b.id !== budgetToDelete.id));
      toast({ variant: 'destructive', title: "Budget Deleted", description: "The selected budget has been removed." });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the budget.' });
    }
    setBudgetToDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Budget Planning"
        description="Create and manage budgets to keep your finances on track."
        breadcrumbs={[{ href: "/accounting", label: "Accounting" }, { label: "Budget Planning" }]}
        actions={
          <Button onClick={() => handleDialogOpen(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Budget
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>All Budgets</CardTitle>
          <CardDescription>
            An overview of your spending limits for different categories and time periods.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Category</TableHead>
                  <TableHead>Budget / Spent</TableHead>
                  <TableHead className="w-[30%]">Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={5} className="p-4">
                                <Skeleton className="h-8 w-full" />
                            </TableCell>
                        </TableRow>
                    ))
                ) : budgets.map((budget) => {
                  const progress = budget.allocated > 0 ? Math.min((budget.spent / budget.allocated) * 100, 100) : 0;
                  return (
                    <TableRow key={budget.id}>
                      <TableCell>
                        <div className="font-medium">{budget.category}</div>
                        <div className="text-sm text-muted-foreground">{budget.period}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(budget.allocated)}</div>
                        <div className="text-sm text-muted-foreground">
                          Spent: {formatCurrency(budget.spent)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                            <Progress value={progress} className="w-[60%]" />
                            <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            budget.status === "On Track" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                            budget.status === "Over Budget" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                            budget.status === "Under Budget" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                          )}
                        >
                          {budget.status}
                        </Badge>
                      </TableCell>
                       <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDialogOpen(budget)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleAlertOpen(budget)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{selectedBudget ? "Edit Budget" : "Create New Budget"}</DialogTitle>
            <DialogDescription>
              {selectedBudget ? "Update the details for this budget." : "Fill in the details to create a new budget."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Q3 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="allocated"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allocated Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="spent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Spent</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{selectedBudget ? "Save Changes" : "Create Budget"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!budgetToDelete} onOpenChange={(open) => !open && setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the budget for <span className="font-semibold">{budgetToDelete?.category}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBudget}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { MoreHorizontal, Plus, Bot, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TaxRule } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getTaxRules, addTaxRule, updateTaxRule, deleteTaxRule } from "@/services/accounting-service";
import { Skeleton } from "@/components/ui/skeleton";

const taxRuleSchema = z.object({
  region: z.string().min(1, "Region is required"),
  taxName: z.string().min(1, "Tax name is required"),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  isAutomatic: z.boolean().default(false),
});
type TaxRuleFormValues = z.infer<typeof taxRuleSchema>;


export default function TaxPage() {
  const { toast } = useToast();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TaxRule | null>(null);
  
  useEffect(() => {
    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const data = await getTaxRules();
            setTaxRules(data);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load tax rules." });
        } finally {
            setIsLoading(false);
        }
    };
    fetchRules();
  }, [toast]);
  
  const form = useForm<TaxRuleFormValues>({
    resolver: zodResolver(taxRuleSchema),
  });

  const handleOpenDialog = (rule: TaxRule | null) => {
    setSelectedRule(rule);
    if (rule) {
      form.reset(rule);
    } else {
      form.reset({ region: "", taxName: "", rate: 0, isAutomatic: false });
    }
    setIsRuleDialogOpen(true);
  };

  const handleOpenDeleteDialog = (rule: TaxRule) => {
      setSelectedRule(rule);
      setIsAlertOpen(true);
  };
  
  const onSubmit = async (values: TaxRuleFormValues) => {
    try {
      if (selectedRule) {
        await updateTaxRule(selectedRule.id, values);
        setTaxRules(prev => prev.map(r => r.id === selectedRule.id ? { ...selectedRule, ...values } : r));
        toast({ title: "Tax Rule Updated", description: "The tax rule has been successfully updated." });
      } else {
        const newId = await addTaxRule(values);
        setTaxRules(prev => [{ id: newId, ...values }, ...prev]);
        toast({ title: "Tax Rule Created", description: `New rule for ${values.region} has been added.` });
      }
    } catch(error) {
      toast({ variant: 'destructive', title: "Save Failed", description: "Could not save the tax rule."});
    } finally {
      setIsRuleDialogOpen(false);
      setSelectedRule(null);
    }
  };
  
  const handleDeleteRule = async () => {
    if (!selectedRule) return;
    try {
        await deleteTaxRule(selectedRule.id);
        setTaxRules(prev => prev.filter(r => r.id !== selectedRule.id));
        toast({ variant: 'destructive', title: "Tax Rule Deleted", description: `The rule for ${selectedRule.region} has been removed.` });
    } catch(error) {
        toast({ variant: 'destructive', title: "Delete Failed", description: "Could not delete the tax rule."});
    } finally {
        setIsAlertOpen(false);
        setSelectedRule(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tax Center"
        description="Manage your tax settings, rates, and generate reports for compliance."
        breadcrumbs={[{ href: "/accounting", label: "Accounting" }, { label: "Tax" }]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Global Tax Settings</CardTitle>
            <CardDescription>
              These settings apply to all transactions unless overridden by a specific regional rule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-id">Tax ID Number (e.g., VAT, TIN)</Label>
              <Input id="tax-id" placeholder="Enter your tax identification number" />
            </div>
          </CardContent>
           <CardFooter>
            <Button>Save Settings</Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tax Rules by Region</CardTitle>
                    <CardDescription>Create rules to handle taxes for different regions.</CardDescription>
                </div>
                  <Button onClick={() => handleOpenDialog(null)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rule
                  </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="border-t">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Region</TableHead>
                                <TableHead>Tax Name</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Management</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : taxRules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell className="font-medium">{rule.region}</TableCell>
                                    <TableCell>{rule.taxName}</TableCell>
                                    <TableCell>{rule.rate}%</TableCell>
                                    <TableCell>
                                        <Badge variant={rule.isAutomatic ? "default" : "secondary"}>
                                            {rule.isAutomatic && <Bot className="mr-2 h-3 w-3" />}
                                            {rule.isAutomatic ? "Automatic" : "Manual"}
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
                                                <DropdownMenuItem onClick={() => handleOpenDialog(rule)}>
                                                  <Edit className="mr-2 h-4 w-4" />
                                                  Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(rule)}>
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
             <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedRule ? "Edit Tax Rule" : "Add New Tax Rule"}</DialogTitle>
                    <DialogDescription>{selectedRule ? "Update the details for this tax rule." : "Define a new tax rule for a specific region."}</DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                      <FormField control={form.control} name="region" render={({ field }) => (<FormItem><FormLabel>Region</FormLabel><FormControl><Input placeholder="e.g. California, USA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="taxName" render={({ field }) => (<FormItem><FormLabel>Tax Name</FormLabel><FormControl><Input placeholder="e.g. Sales Tax" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="rate" render={({ field }) => (<FormItem><FormLabel>Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="8.25" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="isAutomatic" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Automatic Tax Calculation</FormLabel><FormDescription>Let the system handle tax calculations automatically.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsRuleDialogOpen(false)}>Cancel</Button>
                        <Button type="submit">{selectedRule ? "Save Changes" : "Create Rule"}</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
             </Dialog>
        </Card>
      </div>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tax rule for <span className="font-semibold">{selectedRule?.region}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedRule(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRule}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

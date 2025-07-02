
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, MoreHorizontal, Check, Ban, HandCoins } from "lucide-react";
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
import { cn, formatCurrency, calculateTotal } from "@/lib/utils";
import type { CommissionClaim, Quotation, LineItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/role-context";
import { getQuotations } from "@/services/sales-service";
import { getCommissionClaims, addCommissionClaim, updateCommissionClaim } from "@/services/commission-service";
import { Skeleton } from "@/components/ui/skeleton";

const COMMISSION_RATE = 0.05; // 5%

export default function ClaimCommissionPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const role = user?.role;
    const [isLoading, setIsLoading] = useState(true);
    const [claims, setClaims] = useState<CommissionClaim[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
    
    const currentAgentName = user?.name || "Sales Agent";

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [claimsData, quotesData] = await Promise.all([
                    getCommissionClaims(),
                    getQuotations(),
                ]);
                setClaims(claimsData);
                setQuotations(quotesData);
            } catch (err) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch data for commission claims.'});
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const eligibleQuotations = useMemo(() => {
        const claimedQuoteIds = claims.map(c => c.quotationId);
        return quotations.filter(q => 
            q.status === 'Accepted' && 
            q.agentName === currentAgentName &&
            !claimedQuoteIds.includes(q.id)
        );
    }, [claims, quotations, currentAgentName]);
    
    const selectedQuotation = useMemo(() => {
        return quotations.find(q => q.id === selectedQuotationId);
    }, [selectedQuotationId, quotations]);

    const handleCreateClaim = async () => {
        if (!selectedQuotation) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a valid quotation.' });
            return;
        }

        const saleAmount = calculateTotal(selectedQuotation.items);
        const newClaimData: Omit<CommissionClaim, 'id'> = {
            agentName: currentAgentName,
            quotationId: selectedQuotation.id,
            customerName: selectedQuotation.customer,
            saleAmount: saleAmount,
            commissionRate: COMMISSION_RATE,
            commissionAmount: saleAmount * COMMISSION_RATE,
            claimDate: format(new Date(), 'yyyy-MM-dd'),
            status: 'Pending'
        };

        const newId = await addCommissionClaim(newClaimData);
        setClaims(prev => [{ id: newId, ...newClaimData }, ...prev]);
        toast({ title: 'Claim Submitted', description: 'Your commission claim has been submitted for approval.' });
        setIsDialogOpen(false);
        setSelectedQuotationId(null);
    };
    
    const handleClaimAction = async (claimId: string, newStatus: 'Approved' | 'Rejected' | 'Paid') => {
        await updateCommissionClaim(claimId, { status: newStatus });
        setClaims(prev => prev.map(claim => 
            claim.id === claimId ? { ...claim, status: newStatus } : claim
        ));
        toast({ title: `Claim ${newStatus}`, description: `The commission claim has been marked as ${newStatus.toLowerCase()}.`});
    };
    
    const claimsForView = useMemo(() => {
      if (role === 'SalesAgent') {
        return claims.filter(c => c.agentName === currentAgentName);
      }
      return claims; // Managers and cashiers see all claims
    }, [claims, role, currentAgentName]);

  return (
    <div>
      <PageHeader
        title="Claim Commission"
        description="Submit and track your sales commission claims."
        actions={
            role === 'SalesAgent' && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Claim
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Commission Claim</DialogTitle>
                            <DialogDescription>Select an accepted quotation to claim your commission.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="quotation-select">Select Quotation</Label>
                                <Select onValueChange={setSelectedQuotationId} disabled={isLoading}>
                                    <SelectTrigger id="quotation-select">
                                        <SelectValue placeholder="Choose an eligible sale..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eligibleQuotations.map(q => (
                                            <SelectItem key={q.id} value={q.id}>
                                                {q.id}: {q.customer} - {formatCurrency(calculateTotal(q.items))}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedQuotation && (
                                <Card className="bg-muted/50">
                                    <CardHeader><CardTitle className="text-base">Claim Details</CardTitle></CardHeader>
                                    <CardContent className="text-sm space-y-2">
                                        <div className="flex justify-between"><span>Sale Amount:</span> <span>{formatCurrency(calculateTotal(selectedQuotation.items))}</span></div>
                                        <div className="flex justify-between"><span>Commission Rate:</span> <span>{(COMMISSION_RATE * 100).toFixed(0)}%</span></div>
                                        <div className="flex justify-between font-bold"><span>Commission Amount:</span> <span>{formatCurrency(calculateTotal(selectedQuotation.items) * COMMISSION_RATE)}</span></div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateClaim} disabled={!selectedQuotationId}>Submit Claim</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>A record of all past and pending commission claims.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8" /></TableCell></TableRow>
                )) : claimsForView.map(claim => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-mono">{claim.id}</TableCell>
                    <TableCell>{claim.agentName}</TableCell>
                    <TableCell>{claim.customerName}</TableCell>
                    <TableCell>{formatCurrency(claim.commissionAmount)}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "border-transparent",
                        claim.status === "Approved" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                        claim.status === "Pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                        claim.status === "Paid" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                        claim.status === "Rejected" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                      )}>{claim.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {(role === 'ManagingDirector' || role === 'ExecutiveDirector') && claim.status === 'Pending' && (
                          <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => handleClaimAction(claim.id, 'Approved')}><Check className="h-4 w-4 mr-1"/> Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => handleClaimAction(claim.id, 'Rejected')}><Ban className="h-4 w-4 mr-1"/> Reject</Button>
                          </div>
                       )}
                       {role === 'Cashier' && claim.status === 'Approved' && (
                           <Button size="sm" variant="outline" onClick={() => handleClaimAction(claim.id, 'Paid')}>
                             <HandCoins className="mr-2 h-4 w-4" /> Issue Funds
                           </Button>
                       )}
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

    
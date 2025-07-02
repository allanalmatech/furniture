
"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/context/role-context";
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, CircleDollarSign, Target, FileCheck2, Plus, Download, FileText, FileSpreadsheet } from 'lucide-react';
import type { Quotation, SalesTarget, CommissionClaim } from '@/lib/types';
import { format, isSameMonth } from 'date-fns';
import { formatCurrency, calculateTotal } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { getQuotations, getSalesTargets } from '@/services/sales-service';
import { getCommissionClaims } from '@/services/commission-service';
import { Skeleton } from '@/components/ui/skeleton';


const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string; value: string; icon: React.ElementType, description?: string, isLoading?: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
        {description && !isLoading && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
);

const SalesAgentDashboard = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const agentName = user?.name || "Sales Agent";
    const currentMonth = new Date();

    const [isLoading, setIsLoading] = useState(true);
    const [myQuotes, setMyQuotes] = useState<Quotation[]>([]);
    const [myClaims, setMyClaims] = useState<CommissionClaim[]>([]);
    const [myTarget, setMyTarget] = useState<SalesTarget | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (agentName === "Sales Agent") {
                setIsLoading(false);
                return;
            };

            setIsLoading(true);
            try {
                const [quotesData, targetsData, claimsData] = await Promise.all([
                    getQuotations(),
                    getSalesTargets(),
                    getCommissionClaims()
                ]);

                const agentQuotes = quotesData.filter(q => q.agentName === agentName);
                const agentClaims = claimsData.filter(c => c.agentName === agentName);
                const agentTarget = targetsData.find(t => t.agentName === agentName && t.period === format(new Date(), "yyyy-MM"));
                
                setMyQuotes(agentQuotes);
                setMyClaims(agentClaims);
                setMyTarget(agentTarget || null);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch dashboard data." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [agentName, toast]);

    const targetWithProgress = useMemo(() => {
        if (!myTarget) return null;
        
        const achievedAmount = myQuotes
            .filter(q => q.status === 'Accepted' && isSameMonth(new Date(q.date), currentMonth))
            .reduce((sum, q) => sum + calculateTotal(q.items), 0);
        
        const progress = myTarget.targetAmount > 0 ? Math.min((achievedAmount / myTarget.targetAmount) * 100, 100) : 0;
        
        return { ...myTarget, achievedAmount, progress };
    }, [myQuotes, myTarget, currentMonth]);
    
    const myOpenQuotes = myQuotes.filter(q => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Pending Approval').slice(0, 5);

     const handleExport = (format: 'pdf' | 'xlsx') => {
        const title = `Sales Report for ${agentName}`;
        const filename = `sales_report_${agentName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;
        
        toast({ title: "Exporting Report", description: `Your report is being downloaded as a ${format.toUpperCase()} file.` });

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text(title, 14, 16);
            if (targetWithProgress) {
                doc.text("Monthly Target Summary", 14, 26);
                autoTable(doc, {
                    startY: 30,
                    head: [['Metric', 'Value']],
                    body: [
                        ['Target', formatCurrency(targetWithProgress.targetAmount)],
                        ['Achieved', formatCurrency(targetWithProgress.achievedAmount)],
                        ['Progress', `${targetWithProgress.progress.toFixed(0)}%`]
                    ]
                });
            }
            const finalY = (doc as any).lastAutoTable.finalY || 30;
            doc.text("Open Quotations", 14, finalY + 10);
            autoTable(doc, {
                startY: finalY + 14,
                head: [['Customer', 'Amount', 'Status']],
                body: myOpenQuotes.map(q => [q.customer, formatCurrency(calculateTotal(q.items)), q.status])
            });
            doc.save(`${filename}.pdf`);
        } else if (format === 'xlsx') {
            const workbook = XLSX.utils.book_new();
            if (targetWithProgress) {
                const targetData = [
                    ['Metric', 'Value'],
                    ['Target', targetWithProgress.targetAmount],
                    ['Achieved', targetWithProgress.achievedAmount],
                    ['Progress', `${targetWithProgress.progress.toFixed(0)}%`]
                ];
                const targetSheet = XLSX.utils.aoa_to_sheet(targetData);
                XLSX.utils.book_append_sheet(workbook, targetSheet, "Target Summary");
            }
            const quotesData = [
                ['Customer', 'Amount', 'Status'],
                ...myOpenQuotes.map(q => [q.customer, calculateTotal(q.items), q.status])
            ];
            const quotesSheet = XLSX.utils.aoa_to_sheet(quotesData);
            XLSX.utils.book_append_sheet(workbook, quotesSheet, "Open Quotations");
            XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Welcome, ${agentName}!`}
                description="Here's a summary of your sales activity."
                actions={
                    <div className="flex items-center gap-2">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export Report</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button asChild><Link href="/sales"><Plus className="mr-2 h-4 w-4"/>New Quotation</Link></Button>
                    </div>
                }
            />
            
            {isLoading ? <Skeleton className="h-36 w-full" /> : targetWithProgress && (
                <Card>
                    <CardHeader>
                        <CardTitle>This Month's Sales Target</CardTitle>
                        <CardDescription>Your progress for {format(currentMonth, "MMMM yyyy")}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Progress value={targetWithProgress.progress} />
                        <div className="flex justify-between text-sm font-medium">
                            <span>{formatCurrency(targetWithProgress.achievedAmount)}</span>
                            <span className="text-muted-foreground">{formatCurrency(targetWithProgress.targetAmount)}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Open Quotations</CardTitle>
                        <CardDescription>Your most recent active quotations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? <div className="space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div> :
                            <Table>
                                <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {myOpenQuotes.map(q => (
                                        <TableRow key={q.id}>
                                            <TableCell>{q.customer}</TableCell>
                                            <TableCell>{formatCurrency(calculateTotal(q.items))}</TableCell>
                                            <TableCell><Badge variant="secondary">{q.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         }
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/sales">View All Quotations</Link>
                        </Button>
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>My Commission Claims</CardTitle>
                        <CardDescription>Track the status of your commission claims.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <div className="space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div> :
                            <Table>
                                <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {myClaims.slice(0, 5).map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.customerName}</TableCell>
                                            <TableCell>{formatCurrency(c.commissionAmount)}</TableCell>
                                            <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        }
                    </CardContent>
                     <CardFooter>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/claim-commission">View All Claims</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

const SalesExecutiveDashboard = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [allQuotations, setAllQuotations] = useState<Quotation[]>([]);
    const [allTargets, setAllTargets] = useState<SalesTarget[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [quotesData, targetsData] = await Promise.all([getQuotations(), getSalesTargets()]);
                setAllQuotations(quotesData);
                setAllTargets(targetsData);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch dashboard data." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);
    
    const { quotesForApproval, totalTeamSalesThisMonth, totalTeamTarget } = useMemo(() => {
        if (isLoading) return { quotesForApproval: [], totalTeamSalesThisMonth: 0, totalTeamTarget: 0 };
        const quotesForApproval = allQuotations.filter(q => q.status === "Pending Approval");
        const totalTeamSalesThisMonth = allQuotations
            .filter(q => q.status === "Accepted" && isSameMonth(new Date(q.date), new Date()))
            .reduce((sum, q) => sum + calculateTotal(q.items), 0);
        const totalTeamTarget = allTargets
            .filter(t => t.period === format(new Date(), "yyyy-MM"))
            .reduce((sum, t) => sum + t.targetAmount, 0);
        return { quotesForApproval, totalTeamSalesThisMonth, totalTeamTarget };
    }, [isLoading, allQuotations, allTargets]);


     const handleExport = (format: 'pdf' | 'xlsx') => {
        const title = "Sales Executive Summary";
        const filename = `sales_exec_summary_${format(new Date(), 'yyyy-MM-dd')}`;
        
        toast({ title: "Exporting Report", description: `Your report is being downloaded as a ${format.toUpperCase()} file.` });
        
        const headers = ["Agent", "Customer", "Amount"];
        const body = quotesForApproval.map(q => [q.agentName, q.customer, formatCurrency(calculateTotal(q.items))]);

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text(title, 14, 16);
            autoTable(doc, {
                startY: 20,
                head: [headers],
                body: body as any,
            });
            doc.save(`${filename}.pdf`);
        } else if (format === 'xlsx') {
             const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Pending Approvals");
            XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Sales Executive Dashboard" 
                description="Oversee your team's performance and approve sales."
                actions={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export Pending Approvals</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
            />
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Total Team Sales (This Month)" value={formatCurrency(totalTeamSalesThisMonth)} icon={CircleDollarSign} isLoading={isLoading}/>
                <StatCard title="Team Target" value={formatCurrency(totalTeamTarget)} icon={Target} isLoading={isLoading}/>
                <StatCard title="Quotations to Approve" value={quotesForApproval.length.toString()} icon={FileCheck2} isLoading={isLoading}/>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quotations Pending Approval</CardTitle>
                    <CardDescription>Review and approve quotations from your sales agents.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div> :
                        <Table>
                            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {quotesForApproval.map(q => (
                                    <TableRow key={q.id}>
                                        <TableCell>{q.agentName}</TableCell>
                                        <TableCell>{q.customer}</TableCell>
                                        <TableCell>{formatCurrency(calculateTotal(q.items))}</TableCell>
                                        <TableCell className="text-right"><Button variant="outline" size="sm" asChild><Link href="/sales">Review</Link></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    }
                </CardContent>
            </Card>
        </div>
    );
};

export default function SalesDashboard() {
    const { user } = useAuth();
    const role = user?.role;

    if (role === 'SalesExecutive') {
        return <SalesExecutiveDashboard />;
    }
    
    return <SalesAgentDashboard />;
}

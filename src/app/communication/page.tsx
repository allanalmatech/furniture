
"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Plus, Mail, Smartphone, Search, Send as SendIcon, MoreHorizontal, Bell, Loader2, Sparkles, Edit, Trash2, Calendar as CalendarIcon, BarChart3, Users, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { EmailCampaign, SmsCampaign, PushCampaign, Inventory, Contact } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { generateEmailCampaign, type GenerateEmailCampaignOutput } from "@/ai/flows/generate-email-flow";
import { generateSmsCampaign, type GenerateSmsCampaignOutput } from "@/ai/flows/generate-sms-flow";
import { generatePushCampaign, type GeneratePushCampaignOutput } from "@/ai/flows/generate-push-flow";
import { getInventoryItems } from "@/services/inventory-service";
import { getContacts } from "@/services/crm-service";
import { format, startOfToday, addDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    getEmailCampaigns, addEmailCampaign, updateEmailCampaign, deleteEmailCampaign,
    getSmsCampaigns, addSmsCampaign, updateSmsCampaign, deleteSmsCampaign,
    getPushCampaigns, addPushCampaign, updatePushCampaign, deletePushCampaign
} from "@/services/communication-service";

type MultiChannelContent = {
    email: GenerateEmailCampaignOutput | null;
    sms: GenerateSmsCampaignOutput | null;
    push: GeneratePushCampaignOutput | null;
};

const MultiChannelCampaignCreator = ({ onSave, onOpenChange }: { onSave: (content: MultiChannelContent) => void, onOpenChange: (open: boolean) => void }) => {
    const { toast } = useToast();
    const [topic, setTopic] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<MultiChannelContent>({ email: null, sms: null, push: null });

    const handleGenerate = async () => {
        if (!topic) {
            toast({ variant: "destructive", title: "Topic is required" });
            return;
        }
        setIsGenerating(true);
        setGeneratedContent({ email: null, sms: null, push: null });
        try {
            const [email, sms, push] = await Promise.all([
                generateEmailCampaign({ topic }),
                generateSmsCampaign({ topic }),
                generatePushCampaign({ topic }),
            ]);
            setGeneratedContent({ email, sms, push });
            toast({ title: "Content Generated!" });
        } catch (error) {
            toast({ variant: "destructive", title: "Generation Failed" });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSave = () => {
        onSave(generatedContent);
    };

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Multi-Channel Campaign Creator</DialogTitle>
                <DialogDescription>Generate coordinated content for email, SMS, and push notifications from a single topic.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="multi-topic">Campaign Topic</Label>
                        <Textarea
                            id="multi-topic"
                            placeholder="e.g., A week-long flash sale on all dining furniture."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate All Content
                    </Button>
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Generated Content</h3>
                    <div className="space-y-4 rounded-md border p-4 max-h-96 overflow-y-auto">
                        {isGenerating ? (
                            <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</Label>
                                    <div className="p-3 bg-muted rounded-md space-y-1">
                                        <p className="font-semibold text-sm">{generatedContent.email?.subject || "Subject will appear here."}</p>
                                        <div className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: generatedContent.email?.bodyHtml || "Email body will appear here."}} />
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> SMS</Label>
                                    <div className="p-3 bg-muted rounded-md text-sm">{generatedContent.sms?.message || "SMS content will appear here."}</div>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Bell className="h-4 w-4" /> Push Notification</Label>
                                    <div className="p-3 bg-muted rounded-md space-y-1">
                                        <p className="font-semibold text-sm">{generatedContent.push?.title || "Push title will appear here."}</p>
                                        <p className="text-xs text-muted-foreground">{generatedContent.push?.body || "Push body will appear here."}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={!generatedContent.email || !generatedContent.sms || !generatedContent.push}>Save as Drafts</Button>
            </DialogFooter>
        </DialogContent>
    )
}

const EmailMarketingView = ({ campaigns, setCampaigns, onSchedule, onViewReport, isLoading, allContacts, allProducts }: { campaigns: EmailCampaign[]; setCampaigns: React.Dispatch<React.SetStateAction<EmailCampaign[]>>; onSchedule: (campaign: EmailCampaign) => void; onViewReport: (campaign: EmailCampaign, type: 'email') => void; isLoading: boolean, allContacts: Contact[], allProducts: Inventory[] }) => {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);

    const [campaignName, setCampaignName] = useState("");
    const [campaignTopic, setCampaignTopic] = useState("");
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [campaignSubject, setCampaignSubject] = useState("");
    const [campaignBodyHtml, setCampaignBodyHtml] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleOpenDialog = (campaign: EmailCampaign | null) => {
        setSelectedCampaign(campaign);
        if (campaign) {
            setCampaignName(campaign.name);
            setCampaignSubject(campaign.subject);
            setCampaignBodyHtml(campaign.bodyHtml);
            setSelectedContactIds(campaign.recipientIds || []);
            setCampaignTopic("");
            setSelectedProductIds([]);
        } else {
            setCampaignName("");
            setCampaignSubject("");
            setCampaignBodyHtml("");
            setCampaignTopic("");
            setSelectedProductIds([]);
            setSelectedContactIds([]);
        }
        setIsDialogOpen(true);
    };

    const handleOpenDeleteDialog = (campaign: EmailCampaign) => {
        setSelectedCampaign(campaign);
        setIsDeleteDialogOpen(true);
    };

    const handleGenerate = async () => {
        if (!campaignTopic) {
            toast({ variant: "destructive", title: "Topic is required" });
            return;
        }
        setIsGenerating(true);
        setCampaignSubject("");
        setCampaignBodyHtml("");
        try {
            const result = await generateEmailCampaign({ topic: campaignTopic, productIds: selectedProductIds });
            setCampaignSubject(result.subject);
            setCampaignBodyHtml(result.bodyHtml);
            toast({ title: "Content Generated!" });
        } catch (error) {
            toast({ variant: "destructive", title: "Generation Failed" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveCampaign = async () => {
        try {
            if (selectedCampaign) {
                const updatedData = { ...selectedCampaign, name: campaignName, subject: campaignSubject, bodyHtml: campaignBodyHtml, recipientIds: selectedContactIds };
                await updateEmailCampaign(selectedCampaign.id, updatedData);
                setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? updatedData : c));
                toast({ title: "Campaign Updated" });
            } else {
                const newCampaignData: Omit<EmailCampaign, 'id'> = {
                    name: campaignName,
                    subject: campaignSubject,
                    bodyHtml: campaignBodyHtml,
                    status: 'Draft',
                    sentCount: 0, openRate: '0%', clickRate: '0%',
                    recipientIds: selectedContactIds,
                };
                const newId = await addEmailCampaign(newCampaignData);
                setCampaigns(prev => [{ ...newCampaignData, id: newId }, ...prev]);
                toast({ title: "Campaign Created" });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Save Failed" });
        } finally {
            setIsDialogOpen(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!selectedCampaign) return;
        try {
            await deleteEmailCampaign(selectedCampaign.id);
            setCampaigns(prev => prev.filter(c => c.id !== selectedCampaign.id));
            toast({ title: "Campaign Deleted" });
        } catch (error) {
            toast({ variant: "destructive", title: "Delete Failed" });
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };

    const handleSend = async (campaign: EmailCampaign) => {
        const updateData: Partial<EmailCampaign> = {
            status: 'Sent',
            scheduledAt: undefined,
            sentAt: format(new Date(), 'PPP p'),
            sentCount: campaign.recipientIds?.length || 0,
            openRate: '0%',
            clickRate: '0%',
        };

        try {
            await updateEmailCampaign(campaign.id, updateData);
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...campaign, ...updateData } : c));
            toast({ title: "Campaign Sent!", description: "Your campaign is on its way." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Send Failed" });
        }
    };

    return (
      <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Email Marketing</CardTitle>
                    <CardDescription>Create, send, and track beautiful email campaigns to your audience.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog(null)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Campaign
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader><TableRow><TableHead className="w-[40%]">Campaign</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Sent</TableHead><TableHead className="hidden md:table-cell">Open Rate</TableHead><TableHead className="hidden lg:table-cell">Click Rate</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({length: 4}).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>) : 
                        campaigns.map((campaign) => (
                            <TableRow key={campaign.id}>
                                <TableCell>
                                    <div className="font-medium">{campaign.name}</div>
                                    <div className="text-sm text-muted-foreground truncate max-w-xs">{campaign.subject}</div>
                                    {campaign.status === 'Scheduled' && campaign.scheduledAt && (
                                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1.5">
                                            <CalendarIcon className="h-3 w-3" />
                                            <span>Scheduled for: {campaign.scheduledAt}</span>
                                        </p>
                                    )}
                                </TableCell>
                                <TableCell><Badge className={cn("border-transparent", campaign.status === "Sent" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", campaign.status === "Draft" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300", campaign.status === "Scheduled" && "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300", campaign.status === "Archived" && "bg-gray-500 text-gray-50 dark:bg-gray-800 dark:text-gray-300")}>{campaign.status}</Badge></TableCell>
                                <TableCell className="hidden md:table-cell">{campaign.sentCount.toLocaleString()}</TableCell>
                                <TableCell className="hidden md:table-cell">{campaign.openRate}</TableCell>
                                <TableCell className="hidden lg:table-cell">{campaign.clickRate}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem disabled={campaign.status !== 'Draft'} onClick={() => handleOpenDialog(campaign)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                            <DropdownMenuItem disabled={campaign.status !== 'Draft'} onClick={() => handleSend(campaign)}><SendIcon className="mr-2 h-4 w-4" /> Send Now</DropdownMenuItem>
                                            <DropdownMenuItem disabled={campaign.status !== 'Draft'} onClick={() => onSchedule(campaign)}><CalendarIcon className="mr-2 h-4 w-4" /> Schedule</DropdownMenuItem>
                                            <DropdownMenuItem disabled={campaign.status !== 'Sent'} onClick={() => onViewReport(campaign, 'email')}><BarChart3 className="mr-2 h-4 w-4"/> View Report</DropdownMenuItem>
                                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(campaign)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{selectedCampaign ? "Edit Email Campaign" : "Create New Email Campaign"}</DialogTitle>
                    <DialogDescription>Use the AI assistant to generate compelling content for your campaign.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="campaign-name">Campaign Name</Label>
                            <Input id="campaign-name" placeholder="e.g., Q3 Product Launch" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                        </div>
                        {!selectedCampaign && (<>
                            <div className="space-y-2">
                                <Label htmlFor="campaign-topic">What is the email about?</Label>
                                <Textarea id="campaign-topic" placeholder="e.g., A new feature that lets users automate their workflows" rows={4} value={campaignTopic} onChange={(e) => setCampaignTopic(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Feature Products (Optional)</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            {selectedProductIds.length > 0 ? `${selectedProductIds.length} products selected` : "Select products to feature..."}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-80">
                                        {allProducts.map(product => (
                                            <DropdownMenuCheckboxItem
                                                key={product.id}
                                                checked={selectedProductIds.includes(product.id)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                        ? setSelectedProductIds(prev => [...prev, product.id])
                                                        : setSelectedProductIds(prev => prev.filter(id => id !== product.id))
                                                }}
                                            >
                                                {product.name}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Content with AI
                            </Button>
                        </>)}
                        <div className="space-y-2">
                            <Label>Recipients</Label>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        {selectedContactIds.length > 0 ? `${selectedContactIds.length} contacts selected` : "Select recipients..."}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-80 h-64 overflow-y-auto">
                                    {allContacts.map(contact => (
                                        <DropdownMenuCheckboxItem
                                            key={contact.id}
                                            checked={selectedContactIds.includes(contact.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                    ? setSelectedContactIds(prev => [...prev, contact.id])
                                                    : setSelectedContactIds(prev => prev.filter(id => id !== contact.id))
                                            }}
                                        >
                                            {contact.name}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="generated-subject">Subject</Label>
                            <Input id="generated-subject" value={campaignSubject} onChange={(e) => setCampaignSubject(e.target.value)} readOnly={isGenerating && !selectedCampaign} />
                        </div>
                        <Tabs defaultValue="preview" className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Body</Label>
                                <TabsList>
                                    <TabsTrigger value="preview">Preview</TabsTrigger>
                                    <TabsTrigger value="html">HTML</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="preview">
                                <div
                                    className="h-[250px] w-full rounded-md border bg-muted p-4 overflow-y-auto"
                                    dangerouslySetInnerHTML={{ __html: campaignBodyHtml || "<p class='text-muted-foreground'>Your email preview will appear here.</p>" }}
                                />
                            </TabsContent>
                            <TabsContent value="html">
                                <Textarea
                                    id="generated-body-html"
                                    className="h-[250px] w-full resize-none font-mono text-xs"
                                    value={campaignBodyHtml}
                                    onChange={(e) => setCampaignBodyHtml(e.target.value)}
                                    readOnly={isGenerating && !selectedCampaign}
                                    placeholder="Edit the raw HTML for your email..."
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveCampaign}>Save Campaign</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the "{selectedCampaign?.name}" campaign.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
};

const SmsCampaignsView = ({ campaigns, setCampaigns, onSchedule, onViewReport, isLoading, allContacts }: { campaigns: SmsCampaign[], setCampaigns: React.Dispatch<React.SetStateAction<SmsCampaign[]>>; onSchedule: (campaign: SmsCampaign) => void; onViewReport: (campaign: SmsCampaign, type: 'sms') => void; isLoading: boolean, allContacts: Contact[] }) => {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<SmsCampaign | null>(null);

    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [message, setMessage] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const handleOpenDialog = (campaign: SmsCampaign | null) => {
        setSelectedCampaign(campaign);
        if (campaign) {
            setName(campaign.name);
            setMessage(campaign.message);
            setSelectedContactIds(campaign.recipientIds || []);
            setTopic('');
        } else {
            setName('');
            setMessage('');
            setTopic('');
            setSelectedContactIds([]);
        }
        setIsDialogOpen(true);
    };

    const handleOpenDeleteDialog = (campaign: SmsCampaign) => {
        setSelectedCampaign(campaign);
        setIsDeleteDialogOpen(true);
    };

    const handleGenerate = async () => {
        if (!topic) {
            toast({ variant: "destructive", title: "Topic is required" });
            return;
        }
        setIsGenerating(true);
        setMessage("");
        try {
            const result = await generateSmsCampaign({ topic });
            setMessage(result.message);
            toast({ title: "SMS Generated!" });
        } catch (error) {
            toast({ variant: "destructive", title: "Generation Failed" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveCampaign = async () => {
        try {
            if (selectedCampaign) {
                const updatedData = { ...selectedCampaign, name, message, recipientIds: selectedContactIds };
                await updateSmsCampaign(selectedCampaign.id, updatedData);
                setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? updatedData : c));
                toast({ title: "SMS Campaign Updated" });
            } else {
                const newCampaignData: Omit<SmsCampaign, 'id'> = { name, message, status: 'Draft', sentCount: 0, deliveryRate: '0%', recipientIds: selectedContactIds };
                const newId = await addSmsCampaign(newCampaignData);
                setCampaigns(prev => [{ ...newCampaignData, id: newId }, ...prev]);
                toast({ title: 'SMS Campaign Created' });
            }
        } catch(error) {
             toast({ variant: "destructive", title: "Save Failed" });
        } finally {
            setIsDialogOpen(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!selectedCampaign) return;
        try {
            await deleteSmsCampaign(selectedCampaign.id);
            setCampaigns(prev => prev.filter(c => c.id !== selectedCampaign.id));
            toast({ title: "Campaign Deleted" });
        } catch (error) {
            toast({ variant: "destructive", title: "Delete Failed" });
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };
    
    const handleSend = async (campaign: SmsCampaign) => {
        const updateData: Partial<SmsCampaign> = { status: 'Sent', scheduledAt: undefined, sentAt: format(new Date(), 'PPP p'), sentCount: campaign.recipientIds?.length || 0, deliveryRate: '0%' };
        try {
            await updateSmsCampaign(campaign.id, updateData);
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...campaign, ...updateData } : c));
            toast({ title: "SMS Campaign Sent!" });
        } catch(error) {
            toast({ variant: "destructive", title: "Send Failed" });
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle>SMS Campaigns</CardTitle><CardDescription>Send targeted SMS messages for promotions, alerts, and notifications.</CardDescription></div>
                    <Button onClick={() => handleOpenDialog(null)}><Plus className="mr-2 h-4 w-4" />Create New SMS Campaign</Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table><TableHeader><TableRow><TableHead className="w-[40%]">Campaign</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Sent</TableHead><TableHead className="hidden md:table-cell">Delivery Rate</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10" /></TableCell></TableRow>) :
                            campaigns.map((campaign) => (
                                <TableRow key={campaign.id}>
                                    <TableCell>
                                        <div className="font-medium">{campaign.name}</div>
                                        <div className="text-sm text-muted-foreground truncate max-w-xs">{campaign.message}</div>
                                        {campaign.status === 'Scheduled' && campaign.scheduledAt && (
                                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1.5">
                                                <CalendarIcon className="h-3 w-3" />
                                                <span>Scheduled for: {campaign.scheduledAt}</span>
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell><Badge className={cn("border-transparent", campaign.status === "Sent" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", campaign.status === "Draft" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300", campaign.status === "Scheduled" && "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300", campaign.status === "Archived" && "bg-gray-500 text-gray-50 dark:bg-gray-800 dark:text-gray-300")}>{campaign.status}</Badge></TableCell>
                                    <TableCell className="hidden md:table-cell">{campaign.sentCount.toLocaleString()}</TableCell><TableCell className="hidden md:table-cell">{campaign.deliveryRate}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem disabled={campaign.status !== 'Draft'} onClick={() => handleOpenDialog(campaign)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                <DropdownMenuItem disabled={campaign.status !== 'Draft'} onClick={() => handleSend(campaign)}><SendIcon className="mr-2 h-4 w-4" /> Send Now</DropdownMenuItem>
                                                <DropdownMenuItem disabled={campaign.status !== 'Draft'} onClick={() => onSchedule(campaign)}><CalendarIcon className="mr-2 h-4 w-4" /> Schedule</DropdownMenuItem>
                                                <DropdownMenuItem disabled={campaign.status !== 'Sent'} onClick={() => onViewReport(campaign, 'sms')}><BarChart3 className="mr-2 h-4 w-4"/> View Report</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(campaign)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader><DialogTitle>{selectedCampaign ? 'Edit SMS Campaign' : 'Create New SMS Campaign'}</DialogTitle><DialogDescription>Use the AI assistant to generate a concise SMS message.</DialogDescription></DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="sms-campaign-name">Campaign Name</Label><Input id="sms-campaign-name" placeholder="e.g., Weekend Flash Sale" value={name} onChange={(e) => setName(e.target.value)} /></div>
                            {!selectedCampaign && (<>
                                <div className="space-y-2"><Label htmlFor="sms-campaign-topic">What is the SMS about?</Label><Textarea id="sms-campaign-topic" placeholder="e.g., A 24-hour flash sale on all dining sets" rows={4} value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
                                <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">{isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate SMS with AI</Button>
                            </>)}
                             <div className="space-y-2">
                                <Label>Recipients</Label>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{selectedContactIds.length > 0 ? `${selectedContactIds.length} contacts selected` : "Select recipients..."}</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-80 h-64 overflow-y-auto">{allContacts.map(contact => (<DropdownMenuCheckboxItem key={contact.id} checked={selectedContactIds.includes(contact.id)} onCheckedChange={(checked) => { return checked ? setSelectedContactIds(prev => [...prev, contact.id]) : setSelectedContactIds(prev => prev.filter(id => id !== contact.id)) }}>{contact.name}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="generated-sms">Message</Label><Textarea id="generated-sms" rows={7} value={message} onChange={(e) => setMessage(e.target.value)} readOnly={isGenerating && !selectedCampaign} className="resize-none"/><p className="text-xs text-muted-foreground text-right">{message.length} / 160 characters</p></div>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveCampaign} disabled={!message}>Save Campaign</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the "{selectedCampaign?.name}" campaign.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const PushCampaignsView = ({ campaigns, setCampaigns, onSchedule, onViewReport, isLoading, allContacts }: { campaigns: PushCampaign[], setCampaigns: React.Dispatch<React.SetStateAction<PushCampaign[]>>; onSchedule: (campaign: PushCampaign) => void; onViewReport: (campaign: PushCampaign, type: 'push') => void; isLoading: boolean, allContacts: Contact[] }) => {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<PushCampaign | null>(null);
    
    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleOpenDialog = (campaign: PushCampaign | null) => {
        setSelectedCampaign(campaign);
        if (campaign) {
            setName(campaign.name);
            setTitle(campaign.title);
            setBody(campaign.body);
            setSelectedContactIds(campaign.recipientIds || []);
            setTopic('');
        } else {
            setName('');
            setTitle('');
            setBody('');
            setTopic('');
            setSelectedContactIds([]);
        }
        setIsDialogOpen(true);
    };

    const handleOpenDeleteDialog = (campaign: PushCampaign) => {
        setSelectedCampaign(campaign);
        setIsDeleteDialogOpen(true);
    };

    const handleGenerate = async () => {
        if (!topic) {
            toast({ variant: "destructive", title: "Topic is required" });
            return;
        }
        setIsGenerating(true);
        setTitle(""); setBody("");
        try {
            const result = await generatePushCampaign({ topic });
            setTitle(result.title);
            setBody(result.body);
            toast({ title: "Push Notification Generated!" });
        } catch (error) {
            toast({ variant: "destructive", title: "Generation Failed" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveCampaign = async () => {
        try {
            if (selectedCampaign) {
                const updatedData = { ...selectedCampaign, name, title, body, recipientIds: selectedContactIds };
                await updatePushCampaign(selectedCampaign.id, updatedData);
                setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? updatedData : c));
                toast({ title: 'Push Campaign Updated' });
            } else {
                const newCampaignData: Omit<PushCampaign, 'id'> = { name, title, body, status: 'Draft', sentCount: 0, deliveryRate: '0%', clickRate: '0%', recipientIds: selectedContactIds };
                const newId = await addPushCampaign(newCampaignData);
                setCampaigns(prev => [{ ...newCampaignData, id: newId }, ...prev]);
                toast({ title: 'Push Campaign Created' });
            }
        } catch(error) {
            toast({ variant: "destructive", title: "Save Failed" });
        } finally {
            setIsDialogOpen(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedCampaign) return;
        try {
            await deletePushCampaign(selectedCampaign.id);
            setCampaigns(prev => prev.filter(c => c.id !== selectedCampaign.id));
            toast({ title: "Campaign Deleted" });
        } catch (error) {
            toast({ variant: "destructive", title: "Delete Failed" });
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };

    const handleSend = async (campaign: PushCampaign) => {
        const updateData: Partial<PushCampaign> = { status: 'Sent', scheduledAt: undefined, sentAt: format(new Date(), 'PPP p'), sentCount: campaign.recipientIds?.length || 0, deliveryRate: '0%', clickRate: '0%' };
        try {
            await updatePushCampaign(campaign.id, updateData);
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...campaign, ...updateData } : c));
            toast({ title: "Push Campaign Sent!" });
        } catch (error) {
            toast({ variant: "destructive", title: "Send Failed" });
        }
    };
    
    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle>Push Notifications</CardTitle><CardDescription>Send targeted push notifications to your users' devices.</CardDescription></div>
                    <Button onClick={() => handleOpenDialog(null)}><Plus className="mr-2 h-4 w-4" />Create New Push Campaign</Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table><TableHeader><TableRow><TableHead className="w-[40%]">Campaign</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Sent</TableHead><TableHead className="hidden md:table-cell">Delivery Rate</TableHead><TableHead className="hidden lg:table-cell">Click Rate</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>) :
                            campaigns.map((campaign) => (
                                <TableRow key={campaign.id}>
                                    <TableCell>
                                        <div className="font-medium">{campaign.name}</div>
                                        <div className="text-sm text-muted-foreground truncate max-w-xs">{campaign.title}</div>
                                        {campaign.status === 'Scheduled' && campaign.scheduledAt && (
                                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1.5">
                                                <CalendarIcon className="h-3 w-3" />
                                                <span>Scheduled for: {campaign.scheduledAt}</span>
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell><Badge className={cn("border-transparent", campaign.status === "Sent" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", campaign.status === "Draft" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300", campaign.status === "Scheduled" && "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300", campaign.status === "Archived" && "bg-gray-500 text-gray-50 dark:bg-gray-800 dark:text-gray-300")}>{campaign.status}</Badge></TableCell>
                                    <TableCell className="hidden md:table-cell">{campaign.sentCount.toLocaleString()}</TableCell><TableCell className="hidden md:table-cell">{campaign.deliveryRate}</TableCell><TableCell className="hidden lg:table-cell">{campaign.clickRate}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem disabled={campaign.status !== 'Draft'} onClick={() => handleOpenDialog(campaign)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                <DropdownMenuItem disabled={campaign.status !== 'Draft'} onClick={() => handleSend(campaign)}><SendIcon className="mr-2 h-4 w-4" /> Send Now</DropdownMenuItem>
                                                <DropdownMenuItem disabled={campaign.status !== 'Draft'} onClick={() => onSchedule(campaign)}><CalendarIcon className="mr-2 h-4 w-4" /> Schedule</DropdownMenuItem>
                                                <DropdownMenuItem disabled={campaign.status !== 'Sent'} onClick={() => onViewReport(campaign, 'push')}><BarChart3 className="mr-2 h-4 w-4"/> View Report</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(campaign)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader><DialogTitle>{selectedCampaign ? 'Edit Push Campaign' : 'Create New Push Campaign'}</DialogTitle><DialogDescription>Use the AI assistant to generate a title and body for your notification.</DialogDescription></DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="push-campaign-name">Campaign Name</Label><Input id="push-campaign-name" placeholder="e.g., Abandoned Cart Reminder" value={name} onChange={(e) => setName(e.target.value)} /></div>
                            {!selectedCampaign && (<>
                                <div className="space-y-2"><Label htmlFor="push-campaign-topic">What is the notification about?</Label><Textarea id="push-campaign-topic" placeholder="e.g., A reminder for users who have items in their cart" rows={4} value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
                                <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">{isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate Push with AI</Button>
                            </>)}
                             <div className="space-y-2">
                                <Label>Recipients</Label>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{selectedContactIds.length > 0 ? `${selectedContactIds.length} contacts selected` : "Select recipients..."}</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-80 h-64 overflow-y-auto">{allContacts.map(contact => (<DropdownMenuCheckboxItem key={contact.id} checked={selectedContactIds.includes(contact.id)} onCheckedChange={(checked) => { return checked ? setSelectedContactIds(prev => [...prev, contact.id]) : setSelectedContactIds(prev => prev.filter(id => id !== contact.id)) }}>{contact.name}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="generated-push-title">Title</Label><Input id="generated-push-title" value={title} onChange={(e) => setTitle(e.target.value)} readOnly={isGenerating && !selectedCampaign} /></div>
                            <div className="space-y-2"><Label htmlFor="generated-push-body">Body</Label><Textarea id="generated-push-body" rows={7} value={body} onChange={(e) => setBody(e.target.value)} readOnly={isGenerating && !selectedCampaign} className="resize-none"/></div>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveCampaign} disabled={!title}>Save Campaign</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the "{selectedCampaign?.name}" campaign.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const CampaignReportSheet = ({ data, onOpenChange, allContacts }: { data: { campaign: any, type: 'email' | 'sms' | 'push' } | null, onOpenChange: (open: boolean) => void, allContacts: Contact[] }) => {
    if (!data) return null;
    const { campaign, type } = data;
    
    const recipients = allContacts.filter(c => campaign.recipientIds?.includes(c.id));
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <Sheet open={!!data} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl w-full">
                <SheetHeader>
                    <SheetTitle>Campaign Report: {campaign.name}</SheetTitle>
                    <SheetDescription>Performance overview for your {type} campaign sent on {campaign.sentAt || 'N/A'}.</SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Key Metrics</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1"><p className="text-muted-foreground">Recipients</p><p className="font-bold">{campaign.sentCount.toLocaleString()}</p></div>
                             {campaign.openRate && <div className="space-y-1"><p className="text-muted-foreground">Open Rate</p><p className="font-bold">{campaign.openRate}</p></div>}
                             {campaign.clickRate && <div className="space-y-1"><p className="text-muted-foreground">Click-through Rate</p><p className="font-bold">{campaign.clickRate}</p></div>}
                             {campaign.deliveryRate && <div className="space-y-1"><p className="text-muted-foreground">Delivery Rate</p><p className="font-bold">{campaign.deliveryRate}</p></div>}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle className="text-base">Content Preview</CardTitle></CardHeader>
                        <CardContent>
                            {type === 'email' && <div className="p-4 bg-muted rounded-md space-y-1 text-sm"><p className="font-semibold">{campaign.subject}</p><div className="text-xs" dangerouslySetInnerHTML={{ __html: campaign.bodyHtml }} /></div>}
                            {type === 'sms' && <div className="p-4 bg-muted rounded-md text-sm">{campaign.message}</div>}
                            {type === 'push' && <div className="p-4 bg-muted rounded-md space-y-1 text-sm"><p className="font-semibold">{campaign.title}</p><p>{campaign.body}</p></div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">Recipients ({recipients.length})</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                                <div className="space-y-3">
                                    {recipients.map(contact => (
                                        <div key={contact.id} className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8"><AvatarImage src={contact.avatarUrl} data-ai-hint="person avatar"/><AvatarFallback>{getInitials(contact.name)}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{contact.name}</p>
                                                <p className="text-xs text-muted-foreground">{contact.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
                <SheetFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default function CommunicationPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [smsCampaigns, setSmsCampaigns] = useState<SmsCampaign[]>([]);
  const [pushCampaigns, setPushCampaigns] = useState<PushCampaign[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [allProducts, setAllProducts] = useState<Inventory[]>([]);

  const [isMultiChannelOpen, setIsMultiChannelOpen] = useState(false);
  const { toast } = useToast();

  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [schedulingCampaign, setSchedulingCampaign] = useState<{ id: string; type: 'email' | 'sms' | 'push'; name: string } | null>(null);

  const [reportData, setReportData] = useState<{ campaign: any; type: 'email' | 'sms' | 'push' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [emails, smss, pushes, contacts, products] = await Promise.all([
                getEmailCampaigns(),
                getSmsCampaigns(),
                getPushCampaigns(),
                getContacts(),
                getInventoryItems(),
            ]);
            setEmailCampaigns(emails);
            setSmsCampaigns(smss);
            setPushCampaigns(pushes);
            setAllContacts(contacts);
            setAllProducts(products);
        } catch (error) {
            toast({ variant: "destructive", title: "Failed to load data" });
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, [toast]);

  const handleOpenScheduleDialog = (campaign: { id: string; name: string }, type: 'email' | 'sms' | 'push') => {
    setSchedulingCampaign({ ...campaign, type });
    setScheduleDate(new Date());
    setIsScheduleDialogOpen(true);
  };
  
  const handleViewReport = (campaign: any, type: 'email' | 'sms' | 'push') => {
    setReportData({ campaign, type });
  };

  const handleConfirmSchedule = async () => {
    if (!schedulingCampaign || !scheduleDate) return;
    const { id, type, name } = schedulingCampaign;
    const formattedDate = format(scheduleDate, 'PPP');
    
    try {
        if (type === 'email') {
          await updateEmailCampaign(id, { status: 'Scheduled', scheduledAt: formattedDate });
          setEmailCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'Scheduled', scheduledAt: formattedDate } : c));
        } else if (type === 'sms') {
          await updateSmsCampaign(id, { status: 'Scheduled', scheduledAt: formattedDate });
          setSmsCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'Scheduled', scheduledAt: formattedDate } : c));
        } else if (type === 'push') {
          await updatePushCampaign(id, { status: 'Scheduled', scheduledAt: formattedDate });
          setPushCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'Scheduled', scheduledAt: formattedDate } : c));
        }

        toast({ title: "Campaign Scheduled!", description: `"${name}" is scheduled for ${formattedDate}.` });
    } catch(error) {
        toast({ variant: "destructive", title: "Scheduling Failed" });
    } finally {
        setIsScheduleDialogOpen(false);
        setSchedulingCampaign(null);
    }
  };
  
  const handleSaveMultiChannel = async (content: MultiChannelContent) => {
    if (!content.email || !content.sms || !content.push) {
        toast({ variant: "destructive", title: "Cannot save", description: "All content must be generated before saving."});
        return;
    }
    
    try {
        const newEmailData: Omit<EmailCampaign, 'id'> = {
            name: `${content.email.subject.substring(0,20)}... (Email)`,
            subject: content.email.subject,
            bodyHtml: content.email.bodyHtml,
            status: 'Draft', sentCount: 0, openRate: '0%', clickRate: '0%'
        };
        const emailId = await addEmailCampaign(newEmailData);
        setEmailCampaigns(prev => [{...newEmailData, id: emailId}, ...prev]);

        const newSmsData: Omit<SmsCampaign, 'id'> = {
            name: `Multi-channel SMS: ${content.sms.message.substring(0,20)}...`,
            message: content.sms.message,
            status: 'Draft', sentCount: 0, deliveryRate: '0%'
        };
        const smsId = await addSmsCampaign(newSmsData);
        setSmsCampaigns(prev => [{...newSmsData, id: smsId}, ...prev]);

        const newPushData: Omit<PushCampaign, 'id'> = {
            name: `Multi-channel: ${content.push.title}`,
            title: content.push.title,
            body: content.push.body,
            status: 'Draft', sentCount: 0, deliveryRate: '0%', clickRate: '0%'
        };
        const pushId = await addPushCampaign(newPushData);
        setPushCampaigns(prev => [{...newPushData, id: pushId}, ...prev]);

        toast({ title: "Campaign Drafts Saved!", description: "Drafts have been created for email, SMS, and push notifications." });
    } catch (error) {
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save the drafts."});
    } finally {
        setIsMultiChannelOpen(false);
    }
  };


  return (
    <div>
      <PageHeader
        title="Communication Hub"
        description="Engage with your customers through email, SMS, and push notifications."
        actions={
            <Dialog open={isMultiChannelOpen} onOpenChange={setIsMultiChannelOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Sparkles className="mr-2 h-4 w-4" />
                        New Multi-Channel Campaign
                    </Button>
                </DialogTrigger>
                <MultiChannelCampaignCreator onSave={handleSaveMultiChannel} onOpenChange={setIsMultiChannelOpen} />
            </Dialog>
        }
      />

      <Tabs defaultValue="email">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="email">Email Marketing</TabsTrigger>
          <TabsTrigger value="sms">SMS Campaigns</TabsTrigger>
          <TabsTrigger value="push">Push Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="email">
            <EmailMarketingView campaigns={emailCampaigns} setCampaigns={setEmailCampaigns} onSchedule={(campaign) => handleOpenScheduleDialog(campaign, 'email')} onViewReport={handleViewReport} isLoading={isLoading} allContacts={allContacts} allProducts={allProducts}/>
        </TabsContent>
        <TabsContent value="sms">
            <SmsCampaignsView campaigns={smsCampaigns} setCampaigns={setSmsCampaigns} onSchedule={(campaign) => handleOpenScheduleDialog(campaign, 'sms')} onViewReport={handleViewReport} isLoading={isLoading} allContacts={allContacts}/>
        </TabsContent>
        <TabsContent value="push">
            <PushCampaignsView campaigns={pushCampaigns} setCampaigns={setPushCampaigns} onSchedule={(campaign) => handleOpenScheduleDialog(campaign, 'push')} onViewReport={handleViewReport} isLoading={isLoading} allContacts={allContacts}/>
        </TabsContent>
      </Tabs>
      
       <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Schedule Campaign</DialogTitle>
                  <DialogDescription>Select a date to send "{schedulingCampaign?.name}".</DialogDescription>
              </DialogHeader>
              <div className="py-4 flex justify-center">
                  <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      disabled={(date) => date < startOfToday()}
                  />
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleConfirmSchedule}>Confirm Schedule</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <CampaignReportSheet data={reportData} onOpenChange={(open) => !open && setReportData(null)} allContacts={allContacts} />
    </div>
  );
}


"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, Upload, Download, MoreHorizontal, FileSpreadsheet, FileText, Edit, Trash2, Eye, Mail, Phone, Building, Calendar, NotebookText, Star, GripVertical, LayoutList, Kanban, FileUp, MessageSquare, Briefcase, Video } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Contact, ActivityLog } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from "@/context/role-context";
import { getContacts, addContact, updateContact, deleteContact } from "@/services/crm-service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";


const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  company: z.string().min(2, { message: "Company must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  phone: z.string().min(10, { message: "Phone number seems too short." }),
  stage: z.enum(["Lead", "Prospect", "Customer", "Lost"]),
  notes: z.string().optional(),
  leadScore: z.coerce.number().int().min(0).max(100).optional(),
});
type ContactFormValues = z.infer<typeof contactFormSchema>;

const getStageBadgeClass = (stage: Contact['stage']) => {
    switch (stage) {
      case 'Customer': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'Prospect': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'Lead': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'Lost': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
    }
};

const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const ContactForm = ({ contact, onSave, onCancel }: { contact?: Contact | null; onSave: (values: ContactFormValues) => void; onCancel: () => void; }) => {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: contact?.name || "",
      company: contact?.company || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      stage: contact?.stage || "Lead",
      notes: contact?.activity?.find(a => a.type === 'Note')?.details || "",
      leadScore: contact?.leadScore || 50,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name</FormLabel>
            <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="company" render={({ field }) => (
          <FormItem>
            <FormLabel>Company</FormLabel>
            <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" placeholder="john@acme.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="stage" render={({ field }) => (
          <FormItem>
            <FormLabel>Stage</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select a stage" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Prospect">Prospect</SelectItem>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="leadScore" render={({ field }) => (
          <FormItem>
            <FormLabel>Lead Score (0-100)</FormLabel>
            <FormControl><Input type="number" min="0" max="100" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Initial Note</FormLabel>
            <FormControl><Textarea placeholder="Initial contact made, follow up next week..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save Contact</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

const ListView = ({ contacts, isLoading, onEdit, onView, onDelete }: { contacts: Contact[]; isLoading: boolean; onEdit: (c: Contact) => void; onView: (c: Contact) => void; onDelete: (c: Contact) => void; }) => {
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Company</TableHead>
            <TableHead className="hidden lg:table-cell">Email</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-24 mt-2 md:hidden" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))
          ) : (
            contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-sm text-muted-foreground md:hidden">{contact.company}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{contact.company}</TableCell>
                <TableCell className="hidden lg:table-cell">{contact.email}</TableCell>
                <TableCell><Badge className={cn("border-transparent", getStageBadgeClass(contact.stage))}>{contact.stage}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(contact)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(contact)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(contact)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

const ContactCard = ({ contact, onView }: { contact: Contact, onView: (contact: Contact) => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: contact.id,
        data: { type: 'Contact', contact },
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    if (isDragging) {
        return (
            <div ref={setNodeRef} style={style}>
                 <Card className="opacity-50 border-2 border-dashed">
                    <CardContent className="p-3">
                        <div className="h-16"></div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <Card className="cursor-grab group" onClick={() => onView(contact)}>
                <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={contact.avatarUrl} data-ai-hint="person avatar" />
                                <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm">{contact.name}</p>
                                <p className="text-xs text-muted-foreground">{contact.company}</p>
                            </div>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground transition-colors" />
                    </div>
                    {contact.leadScore !== undefined && (
                        <div className="flex items-center gap-1.5 text-xs mt-3 text-yellow-500">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span className="font-bold">{contact.leadScore}</span>
                            <span className="text-muted-foreground">/ 100</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const KanbanColumn = ({ id, title, contacts, onView }: { id: string; title: string; contacts: Contact[]; onView: (c: Contact) => void; }) => {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className="bg-muted/50 rounded-lg p-3 w-full shrink-0">
            <h3 className="font-semibold mb-4 px-1">{title} <span className="text-sm font-normal text-muted-foreground">({contacts.length})</span></h3>
            <SortableContext items={contacts.map(c => c.id)}>
                <div className="space-y-3 h-[calc(100vh-25rem)] overflow-y-auto pr-1">
                    {contacts.map(contact => (
                        <ContactCard key={contact.id} contact={contact} onView={onView} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};


const KanbanView = ({ contacts, isLoading, onView, setContacts, toast }: { contacts: Contact[]; isLoading: boolean; onView: (c: Contact) => void; setContacts: React.Dispatch<React.SetStateAction<Contact[]>>; toast: any }) => {
    const [activeContact, setActiveContact] = useState<Contact | null>(null);

    const sensors = useSensors(useSensor(PointerSensor));

    const contactsByStage = useMemo(() => {
        const stages: Contact['stage'][] = ["Lead", "Prospect", "Customer", "Lost"];
        return stages.reduce((acc, stage) => {
            acc[stage] = contacts.filter(c => c.stage === stage);
            return acc;
        }, {} as Record<Contact['stage'], Contact[]>);
    }, [contacts]);
    
    function handleDragStart(event: DragStartEvent) {
      if (event.active.data.current?.type === "Contact") {
        setActiveContact(event.active.data.current.contact);
      }
    }

    async function handleDragEnd(event: DragEndEvent) {
        setActiveContact(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;
        
        const activeContainer = active.data.current?.contact.stage;
        const overContainer = (contacts.find(c => c.id === over.id)?.stage) || over.id;

        if (activeContainer !== overContainer) {
            const contactId = activeId as string;
            const newStage = overContainer as Contact['stage'];
            const oldStage = activeContainer as Contact['stage'];
            
            const originalContacts = contacts;
            
            const updatedContacts = contacts.map(c => {
                if (c.id === contactId) {
                    return {
                        ...c,
                        stage: newStage,
                        activity: [
                            {
                                id: `act-${Date.now()}`,
                                type: 'Stage Change' as const,
                                details: `Moved from ${oldStage} to ${newStage}`,
                                timestamp: new Date().toISOString().split('T')[0],
                            },
                            ...(c.activity || [])
                        ],
                        lastInteraction: new Date().toISOString().split('T')[0]
                    };
                }
                return c;
            });
            
            setContacts(updatedContacts);

            try {
                await updateContact(contactId, { stage: newStage });
                toast({ title: 'Contact Updated', description: `Moved contact to ${newStage} stage.` });
            } catch (error) {
                setContacts(originalContacts);
                toast({ variant: 'destructive', title: "Update Failed", description: "Could not update contact stage." });
            }
        }
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(["Lead", "Prospect", "Customer", "Lost"] as const).map(stage => (
                    <div key={stage} className="bg-muted/50 rounded-lg p-3">
                        <Skeleton className="h-6 w-1/2 mb-4" />
                        <div className="space-y-3">
                           <Skeleton className="h-24 w-full" />
                           <Skeleton className="h-24 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {Object.entries(contactsByStage).map(([stage, stageContacts]) => (
                    <KanbanColumn
                        key={stage}
                        id={stage}
                        title={stage}
                        contacts={stageContacts}
                        onView={onView}
                    />
                ))}
            </div>
             <DragOverlay>
                {activeContact ? <ContactCard contact={activeContact} onView={() => {}} /> : null}
            </DragOverlay>
        </DndContext>
    );
};


export default function CrmPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newActivityNote, setNewActivityNote] = useState("");
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const fetchContacts = async () => {
        setIsLoading(true);
        try {
            const data = await getContacts();
            setContacts(data);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not fetch contacts." });
        } finally {
            setIsLoading(false);
        }
    }
    fetchContacts();
  }, [toast]);
  
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);
  
  const handleExport = (format: "csv" | "pdf" | "xlsx") => {
    const headers = ["Name", "Company", "Email", "Phone", "Stage", "Last Interaction", "Lead Score"];
    const body = filteredContacts.map(c => [c.name, c.company, c.email, c.phone, c.stage, c.lastInteraction, c.leadScore]);
    const filename = "crm_contacts_export";

    toast({ title: `Exporting Contacts`, description: `Your data is being exported as a ${format.toUpperCase()} file.` });

    if (format === 'csv') {
      const csvContent = [headers.join(','), ...body.map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.text("Contacts Report", 14, 16);
      autoTable(doc, { head: [headers], body: body as any, startY: 20 });
      doc.save(`${filename}.pdf`);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");
      XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
    }
  };
  
  const handleDownloadTemplate = () => {
    toast({ title: "Template Downloading", description: "A sample CSV template is being downloaded."});
  }

  const handleImportSubmit = () => {
    if (!importFile) {
        toast({ variant: 'destructive', title: "No file selected", description: "Please select a CSV file to import."});
        return;
    }
    toast({ title: "Importing Contacts", description: `Processing ${importFile.name}. This may take a moment...` });
    setIsImportOpen(false);
    setImportFile(null);
  }

  const handleSaveContact = async (values: ContactFormValues) => {
    const { notes, ...restOfValues } = values;
    
    try {
        if (selectedContact) { // Editing
            const updatedData: Partial<Contact> = {
                ...restOfValues,
                lastInteraction: new Date().toISOString().split('T')[0],
            };
            
            const currentActivities = selectedContact.activity || [];
            let newActivities = [...currentActivities];
            const noteIndex = newActivities.findIndex(a => a.type === 'Note');

            if (noteIndex > -1) {
                if (notes && notes.trim() !== '') {
                    newActivities[noteIndex] = { ...newActivities[noteIndex], details: notes };
                } else {
                    newActivities.splice(noteIndex, 1);
                }
            } else if (notes && notes.trim() !== '') {
                newActivities.unshift({
                    id: `act-${Date.now()}`,
                    type: 'Note',
                    details: notes,
                    timestamp: new Date().toISOString().split('T')[0]
                });
            }
            updatedData.activity = newActivities;

            await updateContact(selectedContact.id, updatedData);
            
            setContacts(prev => prev.map(c =>
                c.id === selectedContact.id
                ? { ...selectedContact, ...updatedData } as Contact
                : c
            ));

            toast({ title: "Contact Updated", description: `${values.name} has been successfully updated.` });
        } else { // Adding
            const newActivity: ActivityLog[] = [];
            if (notes && notes.trim() !== '') {
                newActivity.push({
                    id: `act-${Date.now()}`,
                    type: 'Note',
                    details: notes,
                    timestamp: new Date().toISOString().split('T')[0],
                });
            }
            const newContactData: Omit<Contact, 'id'> = {
                lastInteraction: new Date().toISOString().split('T')[0],
                creationDate: new Date().toISOString().split('T')[0],
                followUpDate: "",
                ...restOfValues,
                activity: newActivity,
                avatarUrl: `https://placehold.co/100x100.png`
            };
            const newId = await addContact(newContactData);
            setContacts(prev => [{ id: newId, ...newContactData } as Contact, ...prev]);
            toast({ title: "Contact Added", description: `${values.name} has been added to your contacts.` });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: "Save Failed", description: "Could not save contact details." });
    } finally {
        setIsFormOpen(false);
        setSelectedContact(null);
    }
  };
  
  const handleDeleteContact = async () => {
      if (!selectedContact) return;
      try {
        await deleteContact(selectedContact.id);
        setContacts(contacts.filter(c => c.id !== selectedContact.id));
        toast({ title: "Contact Deleted", description: `${selectedContact.name} has been deleted.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete contact." });
      }
      setIsAlertOpen(false);
      setIsSheetOpen(false);
      setSelectedContact(null);
  };

  const handleOpenSheet = (contact: Contact) => {
      setSelectedContact(contact);
      setIsSheetOpen(true);
  }

  const handleOpenEdit = (contact: Contact) => {
      setSelectedContact(contact);
      setIsFormOpen(true);
  }

  const handleOpenDelete = (contact: Contact) => {
      setSelectedContact(contact);
      setIsAlertOpen(true);
  }

  const handleLogActivity = async (type: ActivityLog['type']) => {
    if (!selectedContact || !newActivityNote.trim()) {
      toast({
        variant: "destructive",
        title: "Cannot log activity",
        description: "Please select a contact and write a note.",
      });
      return;
    }

    const newActivity: ActivityLog = {
      id: `act-${Date.now()}`,
      type: type,
      details: newActivityNote,
      timestamp: new Date().toISOString().split('T')[0],
    };

    const updatedActivities = [newActivity, ...(selectedContact.activity || [])];
    const updatedContactData = { 
      activity: updatedActivities, 
      lastInteraction: new Date().toISOString().split('T')[0] 
    };

    const originalContact = selectedContact;
    const updatedContactForUI = { ...selectedContact, ...updatedContactData };
    setContacts(contacts.map(c => c.id === selectedContact.id ? updatedContactForUI : c));
    setSelectedContact(updatedContactForUI);
    setNewActivityNote("");

    try {
        await updateContact(selectedContact.id, updatedContactData);
        toast({ title: "Activity Logged", description: `${type} for ${selectedContact.name} has been added.` });
    } catch (error) {
        setContacts(contacts.map(c => c.id === originalContact.id ? originalContact : c));
        setSelectedContact(originalContact);
        toast({ variant: "destructive", title: "Update Failed", description: "Could not log activity." });
    }
  };
  
  const activityIcons: { [key in ActivityLog['type']]: React.ElementType } = {
    Note: NotebookText,
    Email: Mail,
    Call: Phone,
    Meeting: Video,
    "Stage Change": Star,
  };

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Manage your customer relationships and sales pipeline."
        breadcrumbs={[{ href: "/dashboard", label: "Dashboard" }, { label: "CRM" }]}
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if (!open) setImportFile(null); }}>
                <DialogTrigger asChild>
                    <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
                </DialogTrigger>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}><FileSpreadsheet className="mr-2 h-4 w-4" /><span>Export as CSV</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" /><span>Export as XLSX</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" /><span>Export as PDF</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {hasPermission('crm.edit') && (
                <Button onClick={() => { setSelectedContact(null); setIsFormOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Contact</Button>
            )}
          </div>
        }
      />
      
      <Tabs defaultValue="kanban">
        <div className="flex justify-between items-center mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search contacts by name, company, or email..." className="pl-9 max-w-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <TabsList>
                <TabsTrigger value="kanban"><Kanban className="mr-2 h-4 w-4"/>Kanban View</TabsTrigger>
                <TabsTrigger value="list"><LayoutList className="mr-2 h-4 w-4"/>List View</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="kanban">
            <KanbanView contacts={filteredContacts} isLoading={isLoading} onView={handleOpenSheet} setContacts={setContacts} toast={toast} />
        </TabsContent>
        <TabsContent value="list">
            <ListView contacts={filteredContacts} isLoading={isLoading} onView={handleOpenSheet} onEdit={handleOpenEdit} onDelete={handleOpenDelete} />
        </TabsContent>
      </Tabs>
      

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
            <DialogDescription>{selectedContact ? "Update the details for this contact." : "Fill in the information to create a new contact."}</DialogDescription>
          </DialogHeader>
          <ContactForm contact={selectedContact} onSave={handleSaveContact} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if (!open) setImportFile(null); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Import Contacts</DialogTitle>
                <DialogDescription>Upload a CSV file to bulk-add contacts. Make sure your file matches the required format.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>1. Download Template (Optional)</Label>
                    <p className="text-xs text-muted-foreground">If you're unsure about the format, download our template to get started.</p>
                    <Button variant="outline" className="w-full" onClick={handleDownloadTemplate}>
                        <Download className="mr-2 h-4 w-4"/>
                        Download CSV Template
                    </Button>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="import-file">2. Upload your CSV file</Label>
                    <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <FileUp className="h-10 w-10 text-muted-foreground mb-2"/>
                        <p className="text-sm font-medium mb-1">
                            {importFile ? importFile.name : "Drag & drop your file here"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            or click to browse
                        </p>
                        <Input 
                            id="import-file" 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept=".csv"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        />
                    </div>
                </div>
                 <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Required columns: <code className="font-mono bg-muted p-1 rounded">name</code>, <code className="font-mono bg-muted p-1 rounded">company</code>, <code className="font-mono bg-muted p-1 rounded">email</code>, <code className="font-mono bg-muted p-1 rounded">phone</code>, <code className="font-mono bg-muted p-1 rounded">stage</code>.</p>
                    <p>Accepted stage values: <code className="font-mono bg-muted p-1 rounded">Lead</code>, <code className="font-mono bg-muted p-1 rounded">Prospect</code>, <code className="font-mono bg-muted p-1 rounded">Customer</code>, <code className="font-mono bg-muted p-1 rounded">Lost</code>.</p>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                <Button onClick={handleImportSubmit} disabled={!importFile}>
                    <Upload className="mr-2 h-4 w-4"/>
                    Import Contacts
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Details Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                {selectedContact && (
                <>
                    <SheetHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={selectedContact.avatarUrl} data-ai-hint="person avatar" />
                                <AvatarFallback>{getInitials(selectedContact.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <SheetTitle className="text-2xl">{selectedContact.name}</SheetTitle>
                                <SheetDescription>{selectedContact.company}</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    <Tabs defaultValue="details" className="mt-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="activity">Activity</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="py-6 space-y-4">
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Contact Information</h4>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><span>{selectedContact.email}</span></div>
                                    <div className="flex items-center gap-2"><Phone className="h-4 w-4" /><span>{selectedContact.phone}</span></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Status &amp; Score</h4>
                                <div className="flex items-center gap-4">
                                    <Badge className={cn("border-transparent", getStageBadgeClass(selectedContact.stage))}>{selectedContact.stage}</Badge>
                                    {selectedContact.leadScore !== undefined && (
                                        <div className="flex items-center gap-1 text-sm text-yellow-500">
                                            <Star className="h-4 w-4 fill-current"/>
                                            <span className="font-bold">{selectedContact.leadScore}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Key Dates</h4>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Last Interaction: {selectedContact.lastInteraction}</span></div>
                                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Follow-up: {selectedContact.followUpDate || 'Not set'}</span></div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="activity" className="py-6">
                             <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-activity">Log a new activity</Label>
                                    <Textarea id="new-activity" placeholder="Type your note here..." value={newActivityNote} onChange={(e) => setNewActivityNote(e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button size="sm" onClick={() => handleLogActivity('Note')}><NotebookText className="mr-2 h-4 w-4" />Log Note</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleLogActivity('Email')}><Mail className="mr-2 h-4 w-4" />Log Email</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleLogActivity('Call')}><Phone className="mr-2 h-4 w-4" />Log Call</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleLogActivity('Meeting')}><Video className="mr-2 h-4 w-4" />Log Meeting</Button>
                                </div>
                             </div>
                             <div className="relative mt-8 pl-6 after:absolute after:inset-y-0 after:w-px after:bg-border after:left-0">
                                <div className="grid gap-8">
                                    {selectedContact.activity?.map(act => {
                                        const Icon = activityIcons[act.type];
                                        return (
                                            <div key={act.id} className="grid items-start grid-cols-[auto_1fr] gap-x-4">
                                                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary">
                                                    <Icon className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="pt-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-semibold text-sm">{act.type}</p>
                                                        <p className="text-xs text-muted-foreground">{act.timestamp}</p>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">{act.details}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                             </div>
                        </TabsContent>
                    </Tabs>

                    <SheetFooter className="gap-2 mt-auto pt-6 border-t">
                        <Button variant="destructive" onClick={() => handleOpenDelete(selectedContact)}><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
                        <Button variant="outline" onClick={() => { setIsSheetOpen(false); handleOpenEdit(selectedContact); }}><Edit className="mr-2 h-4 w-4"/>Edit</Button>
                    </SheetFooter>
                </>
                )}
            </SheetContent>
        </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contact for
              <span className="font-semibold"> {selectedContact?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

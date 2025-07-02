
"use client";

import { useState, useMemo, type ChangeEvent, useEffect } from "react";
import { Plus, Download, MoreHorizontal, Share2, Trash2, File as FileIcon, Clock, Link as LinkIcon, Users, UserPlus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Document } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/role-context";
import { getDocuments, addDocument, updateDocument, deleteDocument } from "@/services/document-service";
import { Skeleton } from "@/components/ui/skeleton";

const getInitials = (email: string) => {
    const name = email.split('@')[0];
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  const [newShareEmail, setNewShareEmail] = useState("");
  const [newShareRole, setNewShareRole] = useState<'Viewer' | 'Editor'>('Viewer');

  useEffect(() => {
    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const data = await getDocuments();
            setDocuments(data);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load documents." });
        } finally {
            setIsLoading(false);
        }
    };
    fetchDocuments();
  }, [toast]);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    return documents.filter(doc =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload || !user) {
        toast({ variant: 'destructive', title: "Upload failed", description: "Please select a file to upload."});
        return;
    }

    const newDocData: Omit<Document, 'id'> = {
        name: fileToUpload.name,
        type: fileToUpload.type.split('/')[1]?.toUpperCase() || 'File',
        size: `${(fileToUpload.size / 1024 / 1024).toFixed(2)} MB`,
        uploadDate: new Date().toISOString().split('T')[0],
        owner: user.email,
        sharedWith: []
    };
    
    try {
        const newId = await addDocument(newDocData);
        setDocuments(prev => [{ id: newId, ...newDocData }, ...prev]);
        toast({ title: "File Uploaded", description: `${fileToUpload.name} has been successfully uploaded.`});
    } catch (error) {
        toast({ variant: 'destructive', title: "Upload Failed", description: "Could not upload the document." });
    } finally {
        setIsUploadOpen(false);
        setFileToUpload(null);
    }
  };
  
  const openShareDialog = (doc: Document) => {
    setSelectedDoc(doc);
    setIsShareOpen(true);
  };

  const handleShare = async () => {
    if (!selectedDoc || !newShareEmail) return;

    if (selectedDoc.sharedWith.some(u => u.email === newShareEmail) || selectedDoc.owner === newShareEmail) {
        toast({ variant: 'destructive', title: 'Already shared', description: 'This user already has access.'});
        return;
    }

    const updatedSharedWith = [...selectedDoc.sharedWith, { email: newShareEmail, role: newShareRole }];

    try {
        await updateDocument(selectedDoc.id, { sharedWith: updatedSharedWith });
        const updatedDoc = { ...selectedDoc, sharedWith: updatedSharedWith };
        setDocuments(prev => prev.map(doc => (doc.id === selectedDoc.id ? updatedDoc : doc)));
        setSelectedDoc(updatedDoc); // Update the state for the dialog
        toast({ title: 'Access Granted', description: `${newShareEmail} can now ${newShareRole === 'Editor' ? 'edit' : 'view'} the document.`});
        setNewShareEmail("");
        setNewShareRole("Viewer");
    } catch (error) {
        toast({ variant: 'destructive', title: "Update Failed", description: "Could not share the document." });
    }
  };

  const handleRemoveAccess = async (emailToRemove: string) => {
    if (!selectedDoc) return;
    const updatedSharedWith = selectedDoc.sharedWith.filter(u => u.email !== emailToRemove);
    try {
        await updateDocument(selectedDoc.id, { sharedWith: updatedSharedWith });
        const updatedDoc = { ...selectedDoc, sharedWith: updatedSharedWith };
        setDocuments(prev => prev.map(doc => (doc.id === selectedDoc.id ? updatedDoc : doc)));
        setSelectedDoc(updatedDoc);
        toast({ title: "Access Revoked" });
    } catch (error) {
         toast({ variant: 'destructive', title: "Update Failed", description: "Could not remove user access." });
    }
  };
  
  const openDeleteDialog = (doc: Document) => {
    setDocToDelete(doc);
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    try {
        await deleteDocument(docToDelete.id);
        setDocuments(prev => prev.filter(doc => doc.id !== docToDelete.id));
        toast({ variant: 'destructive', title: "Document Deleted", description: `${docToDelete.name} has been removed.`});
    } catch (error) {
        toast({ variant: 'destructive', title: "Delete Failed", description: "Could not delete the document." });
    }
    setDocToDelete(null);
  };

  const copyLink = () => {
    toast({ title: "Link Copied", description: "A shareable link has been copied to your clipboard." });
  };
  
  const handleDownload = (doc: Document) => {
    toast({
      title: "Download Started",
      description: `Your document "${doc.name}" is downloading.`,
    });
  };

  return (
    <div>
      <PageHeader
        title="Document Management"
        description="Securely store, version, and manage access to your files."
        actions={
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Document
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload New Document</DialogTitle>
                    <DialogDescription>Select a file from your computer to upload to the workspace.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Label htmlFor="file-upload">File</Label>
                    <Input id="file-upload" name="file-upload" type="file" onChange={handleFileSelect} />
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => { setIsUploadOpen(false); setFileToUpload(null); }}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={!fileToUpload}>Upload</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Files</CardTitle>
              <CardDescription>
                Manage all your company's documents in one place.
              </CardDescription>
            </div>
             <div className="w-full max-w-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search documents..." 
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead className="hidden md:table-cell">Size</TableHead>
                  <TableHead className="hidden md:table-cell">Upload Date</TableHead>
                  <TableHead>Shared With</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({length: 4}).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10" /></TableCell></TableRow>
                )) : filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium truncate">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{doc.size}</TableCell>
                    <TableCell className="hidden md:table-cell">{doc.uploadDate}</TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={100}>
                        <div className="flex items-center -space-x-2">
                          {doc.sharedWith.slice(0, 3).map((user) => (
                              <Tooltip key={user.email}>
                                <TooltipTrigger asChild>
                                  <Avatar className="h-8 w-8 border-2 border-card">
                                    <AvatarImage src={`https://placehold.co/40x40.png`} alt={user.email} data-ai-hint="person avatar"/>
                                    <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{user.email}</p>
                                  <p className="text-muted-foreground">{user.role}</p>
                                </TooltipContent>
                              </Tooltip>
                          ))}
                          {doc.sharedWith.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-8 w-8 border-2 border-card bg-muted">
                                  <AvatarFallback>+{doc.sharedWith.length - 3}</AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>And {doc.sharedWith.length - 3} more</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                           {doc.sharedWith.length === 0 && (
                            <span className="text-xs text-muted-foreground px-2">Only you</span>
                          )}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(doc)}>
                            <Download className="mr-2 h-4 w-4" />
                            <span>Download</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openShareDialog(doc)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            <span>Manage Access</span>
                          </DropdownMenuItem>
                           <DropdownMenuItem disabled>
                            <Clock className="mr-2 h-4 w-4" />
                            <span>View Version History</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(doc)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
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
      
      {/* Share Dialog */}
       <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share "{selectedDoc?.name}"</DialogTitle>
            <DialogDescription>Manage who has access to this document.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2">
                <Input value={`https://app.example.com/docs/${selectedDoc?.id}`} readOnly />
                <Button variant="outline" onClick={copyLink}><LinkIcon className="mr-2 h-4 w-4"/>Copy link</Button>
            </div>
            <div className="flex items-center gap-2">
                <Input placeholder="Enter email address" value={newShareEmail} onChange={(e) => setNewShareEmail(e.target.value)} />
                 <Select value={newShareRole} onValueChange={(value) => setNewShareRole(value as 'Viewer' | 'Editor')}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Viewer">Can view</SelectItem>
                        <SelectItem value="Editor">Can edit</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleShare}><UserPlus className="mr-2 h-4 w-4"/>Add</Button>
            </div>
            <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2"><Users className="h-4 w-4"/> People with access</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                    {selectedDoc?.owner && <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarImage src="https://placehold.co/40x40.png" alt={selectedDoc.owner} data-ai-hint="person avatar" /><AvatarFallback>{getInitials(selectedDoc.owner)}</AvatarFallback></Avatar><div><p className="text-sm font-medium">{selectedDoc.owner}</p><p className="text-xs text-muted-foreground">Owner</p></div></div></div>}
                    {selectedDoc?.sharedWith.map(user => (
                        <div key={user.email} className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarImage src="https://placehold.co/40x40.png" alt={user.email} data-ai-hint="person avatar"/><AvatarFallback>{getInitials(user.email)}</AvatarFallback></Avatar><div><p className="text-sm font-medium">{user.email}</p></div></div>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveAccess(user.email)}>Remove</Button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. This will permanently delete the document "{docToDelete?.name}".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

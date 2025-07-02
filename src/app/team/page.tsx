
"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, ShieldCheck, Trash2, Loader2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffMember, Role } from "@/lib/types";
import { roleDisplayConfig, allPermissions } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/role-context";
import { getStaff, updateStaff, deleteStaff, addStaff } from "@/services/hr-service";
import { Skeleton } from "@/components/ui/skeleton";


export default function TeamPage() {
  const { toast } = useToast();
  const { rolesConfig, setRolesConfig } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<StaffMember[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<StaffMember | null>(null);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role | null>(null);

  const [editedPermissions, setEditedPermissions] = useState<Record<string, string[]>>({});
  const [showSaveButton, setShowSaveButton] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeam = async () => {
      setIsLoading(true);
      try {
        const staff = await getStaff();
        setTeamMembers(staff);
      } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Failed to load team members." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeam();
  }, [toast]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === userId ? { ...member, role: newRole } : member
      )
    );
    try {
      await updateStaff(userId, { role: newRole });
      toast({
        title: "Role Updated",
        description: "The team member's role has been successfully updated.",
      });
    } catch (error) {
      toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the role." });
      // Revert UI change on failure
      const originalMembers = await getStaff();
      setTeamMembers(originalMembers);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteRole) {
      toast({ variant: 'destructive', title: "Missing Information", description: "Please enter an email and select a role." });
      return;
    }
    
    setIsInviting(true);
    try {
      const nameFromEmail = inviteEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const newStaffData: Omit<StaffMember, 'id'> = {
        name: nameFromEmail,
        email: inviteEmail,
        role: inviteRole,
        department: "General",
        status: "Active",
      };

      const newId = await addStaff(newStaffData);
      setTeamMembers(prev => [{ ...newStaffData, id: newId }, ...prev]);
      
      toast({ title: "Invitation Sent", description: `${inviteEmail} has been added to the team.` });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole(null);
    } catch (error) {
      toast({ variant: 'destructive', title: "Invite Failed", description: "Could not add the new team member." });
    } finally {
      setIsInviting(false);
    }
  };
  
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
        await deleteStaff(memberToRemove.id);
        setTeamMembers(prev => prev.filter(member => member.id !== memberToRemove.id));
        toast({
          variant: "destructive",
          title: "Member Removed",
          description: `${memberToRemove.name} has been removed from the team.`,
        });
    } catch (error) {
        toast({ variant: 'destructive', title: "Delete Failed", description: "Could not remove the team member." });
    }
    setMemberToRemove(null);
  };

  const handlePermissionChange = (roleName: Role, permissionId: string, isChecked: boolean) => {
    setEditedPermissions(prev => {
      const currentPermissions = prev[roleName] ?? rolesConfig.find(r => r.name === roleName)?.permissions ?? [];
      const newPermissions = isChecked
        ? [...new Set([...currentPermissions, permissionId])]
        : currentPermissions.filter(p => p !== permissionId);
      return { ...prev, [roleName]: newPermissions };
    });
    setShowSaveButton(roleName);
  };

  const savePermissions = (roleName: Role) => {
    const newPermissions = editedPermissions[roleName];
    if (newPermissions) {
      setRolesConfig(prevConfig =>
        prevConfig.map(r => (r.name === roleName ? { ...r, permissions: newPermissions } : r))
      );
      toast({ title: "Permissions Saved", description: `Permissions for the ${roleDisplayConfig[roleName]?.name} role have been updated.` });
      setEditedPermissions(prev => {
        const { [roleName]: _, ...rest } = prev;
        return rest;
      });
      setShowSaveButton(null);
    }
  };

  const discardPermissions = (roleName: Role) => {
    setEditedPermissions(prev => {
        const { [roleName]: _, ...rest } = prev;
        return rest;
    });
    setShowSaveButton(null);
  };
  

  return (
    <div>
      <PageHeader
        title="Team & Permissions"
        description="Manage who has access and what they can do in your workspace."
      />
      
      <Tabs defaultValue="members">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Invite and manage your team members.</CardDescription>
                </div>
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Invite Member
                    </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Invite a new team member</DialogTitle>
                        <DialogDescription>
                        Enter the email and assign a role for the person you want to invite.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                        <Label htmlFor="email">
                            Email
                        </Label>
                        <Input id="email" type="email" placeholder="name@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="role">
                            Role
                        </Label>
                        <Select onValueChange={(value: Role) => setInviteRole(value)}>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                             {Object.entries(roleDisplayConfig).map(([roleKey, roleValue]) => (
                                <SelectItem key={roleKey} value={roleKey}>{roleValue.name}</SelectItem>
                             ))}
                            </SelectContent>
                        </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleInviteMember} disabled={isInviting}>
                          {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Send Invitation
                        </Button>
                    </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? Array.from({length: 4}).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-10"/></TableCell></TableRow>
                  )) : teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn(
                            'font-medium',
                             roleDisplayConfig[member.role as Role]?.color
                        )}>
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            {roleDisplayConfig[member.role as Role]?.name || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={member.role === 'Admin'}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup value={member.role} onValueChange={(value) => handleRoleChange(member.id, value as Role)}>
                                  {Object.entries(roleDisplayConfig).map(([roleKey, roleValue]) => (
                                      <DropdownMenuRadioItem key={roleKey} value={roleKey}>{roleValue.name}</DropdownMenuRadioItem>
                                  ))}
                                </DropdownMenuRadioGroup>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setMemberToRemove(member)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove from team
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
        <TabsContent value="roles">
            <Card>
                <CardHeader>
                    <CardTitle>Roles &amp; Permissions</CardTitle>
                    <CardDescription>Define what each role can see and do.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {rolesConfig.map(role => (
                            <AccordionItem value={role.name} key={role.name}>
                                <AccordionTrigger>
                                    <div className="flex flex-col items-start">
                                        <div className="font-semibold text-base">{roleDisplayConfig[role.name]?.name || role.name}</div>
                                        <p className="font-normal text-sm text-muted-foreground">{role.description}</p>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid gap-6 p-4">
                                    {Object.entries(allPermissions).map(([moduleName, permissions]) => (
                                        <div key={moduleName} className="space-y-3">
                                            <h4 className="font-medium text-foreground">{moduleName}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                {permissions.map(permission => (
                                                    <div key={permission.id} className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id={`${role.name}-${permission.id}`} 
                                                            checked={(editedPermissions[role.name] ?? role.permissions).includes(permission.id)}
                                                            disabled={role.name === 'Admin' || role.name === 'ManagingDirector' || role.name === 'ExecutiveDirector'}
                                                            onCheckedChange={(checked) => handlePermissionChange(role.name, permission.id, !!checked)}
                                                        />
                                                        <label
                                                            htmlFor={`${role.name}-${permission.id}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                        >
                                                            {permission.label}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                    {showSaveButton === role.name && (
                                      <div className="flex justify-end mt-4 p-4 border-t gap-2 bg-muted/50">
                                          <Button variant="ghost" onClick={() => discardPermissions(role.name)}>Cancel</Button>
                                          <Button onClick={() => savePermissions(role.name)}>Save Permissions</Button>
                                      </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
       <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently remove {memberToRemove?.name} from your team.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setMemberToRemove(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveMember}>Remove Member</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

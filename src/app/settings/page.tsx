
"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Plus, MoreHorizontal, Trash2, Shield, Upload, FilePieChart, Tv } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ApiKey, CompanyBranding, LocalizationSettings } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useBranding } from "@/context/branding-context";
import { getApiKeys, addApiKey, deleteApiKey, updateLocalizationSettings, getLocalizationSettings } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/role-context";
import { updateStaff } from "@/services/hr-service";
import { Switch } from "@/components/ui/switch";

const ProfileSettings = () => {
    const { user, loading, setUser } = useAuth();
    const { toast } = useToast();
    const [name, setName] = useState(user?.name || '');

    useEffect(() => {
        if (user) {
            setName(user.name);
        }
    }, [user]);

    const handleSaveProfile = async () => {
        if (!user || !name.trim()) {
            toast({ variant: 'destructive', title: "Name is required." });
            return;
        };

        try {
            await updateStaff(user.id, { name });
            if (setUser) {
                setUser({ ...user, name });
            }
            toast({ title: "Profile Saved", description: "Your name has been updated." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not update your profile." });
        }
    };
    
    if (loading) {
        return (
            <Card>
                <CardHeader><CardTitle>Profile</CardTitle><CardDescription>This is how others will see you on the site.</CardDescription></CardHeader>
                <CardContent className="space-y-8">
                    <Skeleton className="h-24 w-full" />
                    <Separator />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
                <CardFooter className="border-t pt-6"><Button disabled>Save Profile</Button></CardFooter>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>This is how others will see you on the site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-2">
                    <Label>Avatar</Label>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src="https://placehold.co/100x100.png" alt={user?.name} data-ai-hint="person avatar"/>
                            <AvatarFallback>{user?.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" disabled>
                            <Upload className="mr-2 h-4 w-4" />
                            Change Avatar
                        </Button>
                    </div>
                </div>
                 <Separator />
                <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input id="full-name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
                </div>
                <Separator />
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email} disabled className="max-w-sm" />
                </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
                <Button onClick={handleSaveProfile}>Save Profile</Button>
            </CardFooter>
        </Card>
    );
};

const SecuritySettings = () => {
    const { toast } = useToast();
    const [is2faEnabled, setIs2faEnabled] = useState(false);

    const handleSaveSecurity = () => {
        toast({ title: "Settings Saved", description: "Your security preference has been saved. Note: 2FA enforcement at login is not yet implemented." });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                <CardDescription>
                Add an extra layer of security to your account by requiring a second verification step.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <Shield className="h-8 w-8 text-primary"/>
                  <div>
                    <h3 className="font-semibold">Authenticator App</h3>
                    <p className="text-sm text-muted-foreground">
                      Once enabled, you'll be prompted for a code from your authenticator app during login.
                    </p>
                  </div>
                </div>
                <Switch checked={is2faEnabled} onCheckedChange={setIs2faEnabled} aria-label="Toggle Two-Factor Authentication" />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button onClick={handleSaveSecurity}>Save Security Settings</Button>
            </CardFooter>
          </Card>
    );
};

const BrandingSettings = () => {
    const { toast } = useToast();
    const { branding, setBranding, loading: brandingLoading } = useBranding();

    const handleInputChange = (field: keyof CompanyBranding, value: string) => {
        setBranding(prev => ({ ...prev, [field]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setBranding(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        setBranding(branding); // This triggers the save via context
        toast({
            title: "Branding Saved",
            description: "Your company branding has been updated.",
        });
    };
    
    if (brandingLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Branding</CardTitle>
                    <CardDescription>Customize the details that appear on your company letterhead.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <Skeleton className="h-24 w-full" />
                    <Separator />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
                <CardFooter className="border-t pt-6">
                    <Button disabled>Save Branding Settings</Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Customize the details that appear on your company letterhead.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <div className="flex items-center gap-4">
                        <Image src={branding.logoUrl} alt="Current company logo" width={64} height={64} className="rounded-md bg-muted p-1" data-ai-hint="company logo"/>
                        <div className="relative">
                            <Button asChild variant="outline">
                                <label htmlFor="logo-upload" className="cursor-pointer">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload New Logo
                                </label>
                            </Button>
                            <Input id="logo-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Recommended size: 256x256px. PNG, JPG, or SVG.</p>
                </div>
                <Separator />
                <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" value={branding.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} className="max-w-sm" />
                    <p className="text-xs text-muted-foreground">This name will appear on your letterhead for invoices, quotes, and other documents.</p>
                </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
                <Button onClick={handleSave}>Save Branding Settings</Button>
            </CardFooter>
        </Card>
    );
};

const LocalizationSettings = () => {
    const [settings, setSettings] = useState<LocalizationSettings>({ currency: 'UGX' });
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const data = await getLocalizationSettings();
                setSettings(data);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error", description: "Could not load localization settings." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [toast]);
    
    const handleSave = async () => {
        try {
            await updateLocalizationSettings(settings);
            toast({ title: "Localization settings saved." });
        } catch(error) {
            toast({ variant: 'destructive', title: "Save failed", description: "Could not update localization settings." });
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Localization Settings</CardTitle>
                <CardDescription>Manage your workspace's currency, language, and time zone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="currency">Workspace Currency</Label>
                    {isLoading ? <Skeleton className="h-10 w-full md:w-1/2" /> :
                        <Select value={settings.currency} onValueChange={(value) => setSettings(s => ({...s, currency: value as LocalizationSettings['currency']}))}>
                            <SelectTrigger className="w-full md:w-1/2">
                                <SelectValue placeholder="Select a currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                                <SelectItem value="USD">USD - United States Dollar</SelectItem>
                                <SelectItem value="EUR">EUR - Euro</SelectItem>
                                <SelectItem value="GBP">GBP - British Pound Sterling</SelectItem>
                                <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                            </SelectContent>
                        </Select>
                    }
                    <p className="text-xs text-muted-foreground">This is the primary currency for all financial transactions. Note: This setting does not yet affect all currency displays across the app.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="language">Language (Coming Soon)</Label>
                    <Select defaultValue="en-US" disabled>
                        <SelectTrigger className="w-full md:w-1/2">
                            <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="timezone">Time Zone (Coming Soon)</Label>
                    <Select defaultValue="utc-8" disabled>
                        <SelectTrigger className="w-full md:w-1/2">
                            <SelectValue placeholder="Select a timezone" />
                        </SelectTrigger>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
                <Button onClick={handleSave} disabled={isLoading}>Save Localization Settings</Button>
            </CardFooter>
        </Card>
    );
};


export default function SettingsPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchApiKeys = async () => {
        setIsLoading(true);
        try {
            const keys = await getApiKeys();
            setApiKeys(keys);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not fetch API keys." });
        } finally {
            setIsLoading(false);
        }
    }
    fetchApiKeys();
  }, [toast]);
  
  const handleGenerateKey = async () => {
    const newKeyData: Omit<ApiKey, 'id'> = {
        name: "New API Key",
        maskedKey: `sk_...${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString().split('T')[0],
    };
    try {
        const newId = await addApiKey(newKeyData);
        setApiKeys(prev => [{...newKeyData, id: newId}, ...prev]);
        toast({ title: "API Key Generated", description: "A new key has been added."});
    } catch(error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not generate API key."});
    }
  };
  
  const handleDeleteKey = async (id: string) => {
    try {
        await deleteApiKey(id);
        setApiKeys(prev => prev.filter(key => key.id !== id));
        toast({ title: "API Key Revoked", variant: "destructive" });
    } catch(error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not revoke API key."});
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account, company, and application settings."
      />

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="localization">Localization</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
            <ProfileSettings />
        </TabsContent>

        <TabsContent value="security">
            <SecuritySettings />
        </TabsContent>

        <TabsContent value="branding">
            <BrandingSettings />
        </TabsContent>

        <TabsContent value="api">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>API Keys</CardTitle>
                        <CardDescription>Manage API keys for integrating with other services.</CardDescription>
                    </div>
                    <Button onClick={handleGenerateKey}>
                        <Plus className="mr-2 h-4 w-4" />
                        Generate New Key
                    </Button>
                </CardHeader>
                <CardContent>
                   <div className="border rounded-lg overflow-hidden bg-background">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead className="hidden md:table-cell">Created</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 2}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8" /></TableCell></TableRow>
                            )) : apiKeys.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium">{key.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-mono text-sm">
                                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                                            <span>{key.maskedKey}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{key.createdAt}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteKey(key.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Revoke Key
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
        </TabsContent>
        <TabsContent value="localization">
            <LocalizationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}


"use client";

import { useState } from "react";
import Image from "next/image";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Smartphone, Sparkles, Loader2, CheckCircle, Zap, Shield, Rocket, Target, Award, GripVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generateWebsiteContent, type GenerateWebsiteContentOutput } from "@/ai/flows/generate-website-content-flow";
import { generateHeroImage } from "@/ai/flows/generate-hero-image-flow";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const iconMap = {
    CheckCircle,
    Zap,
    Shield,
    Rocket,
    Target,
    Award
};

type Feature = GenerateWebsiteContentOutput['features'][0] & { id: string };

type PageContent = Omit<GenerateWebsiteContentOutput, 'features'> & {
    heroImage: string;
    primaryButtonText: string;
    secondaryButtonText: string;
    features: Feature[];
};

const SortableFeatureEditor = ({
    feature,
    index,
    handleFeatureChange,
}: {
    feature: Feature;
    index: number;
    handleFeatureChange: (index: number, field: keyof Omit<Feature, 'id'>, value: string) => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: feature.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="p-3 border rounded-md space-y-2 bg-background relative touch-none">
             <div {...attributes} {...listeners} className="absolute top-1 right-1 cursor-grab p-2 text-muted-foreground hover:bg-accent rounded-md">
                <GripVertical className="h-5 w-5" />
            </div>
            <h4 className="font-medium text-sm pt-2">Feature {index + 1}</h4>
            <div className="space-y-2">
                <Label htmlFor={`feature-icon-${index}`}>Icon</Label>
                <Select
                    value={feature.icon}
                    onValueChange={(value) => handleFeatureChange(index, 'icon', value)}
                >
                    <SelectTrigger id={`feature-icon-${index}`}>
                        <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(iconMap).map(iconName => (
                            <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor={`feature-title-${index}`}>Title</Label>
                <Input id={`feature-title-${index}`} value={feature.title} onChange={e => handleFeatureChange(index, 'title', e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor={`feature-desc-${index}`}>Description</Label>
                <Textarea id={`feature-desc-${index}`} value={feature.description} onChange={e => handleFeatureChange(index, 'description', e.target.value)} rows={3} />
            </div>
        </div>
    );
};


export default function WebsiteBuilderPage() {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiTopic, setAiTopic] = useState("");

    const [pageContent, setPageContent] = useState<PageContent>(() => {
        const initialFeatures: Feature[] = [
            { id: `feature-${Math.random()}`, icon: "Zap", title: "Feature One", description: "Description for the first amazing feature." },
            { id: `feature-${Math.random()}`, icon: "Shield", title: "Feature Two", description: "Description for the second incredible feature." },
            { id: `feature-${Math.random()}`, icon: "CheckCircle", title: "Feature Three", description: "Description for the third unbeatable feature." },
        ];
        return {
            headline: "Your Awesome Business",
            subheadline: "The best solution for your needs.",
            heroImage: "https://placehold.co/800x400.png",
            heroImagePrompt: "business team",
            bodyText:
              "Welcome to our website! We are dedicated to providing the highest quality products and services. Our team is passionate and ready to help you achieve your goals. Explore our offerings and see how we can make a difference for you.",
            primaryButtonText: "Get Started",
            secondaryButtonText: "Contact on WhatsApp",
            features: initialFeatures,
            cta: {
                headline: "Ready to take the next step?",
                buttonText: "Sign Up Free"
            }
        };
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleContentChange = (field: keyof Omit<PageContent, 'features' | 'cta'>, value: string) => {
        setPageContent(prev => ({ ...prev, [field]: value }));
    };

    const handleFeatureChange = (index: number, field: keyof Omit<Feature, 'id'>, value: string) => {
        setPageContent(prev => {
            const newFeatures = [...prev.features];
            const updatedFeature = { ...newFeatures[index], [field]: value } as Feature;
            newFeatures[index] = updatedFeature;
            return { ...prev, features: newFeatures };
        });
    };
    
    const handleCtaChange = (field: keyof PageContent['cta'], value: string) => {
        setPageContent(prev => ({ ...prev, cta: { ...prev.cta, [field]: value }}));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (over && active.id !== over.id) {
            setPageContent((prev) => {
                const oldIndex = prev.features.findIndex((f) => f.id === active.id);
                const newIndex = prev.features.findIndex((f) => f.id === over.id);
                return {...prev, features: arrayMove(prev.features, oldIndex, newIndex)};
            });
        }
    }

    const handleGenerateContent = async () => {
        if (!aiTopic) {
            toast({
                variant: "destructive",
                title: "Topic is required",
                description: "Please describe your business or website topic.",
            });
            return;
        }

        setIsGenerating(true);
        try {
            const textResult = await generateWebsiteContent({ topic: aiTopic });
            const featuresWithIds = textResult.features.map(f => ({...f, id: `feature-${Math.random()}`}));
            
            setPageContent(prev => ({
                ...prev,
                headline: textResult.headline,
                subheadline: textResult.subheadline,
                bodyText: textResult.bodyText,
                heroImagePrompt: textResult.heroImagePrompt,
                features: featuresWithIds,
                cta: textResult.cta,
            }));
            toast({
                title: "Text Generated!",
                description: "Your website copy has been updated. Now generating hero image...",
            });

            const imageResult = await generateHeroImage({ prompt: textResult.heroImagePrompt });
            setPageContent(prev => ({
                ...prev,
                heroImage: imageResult.imageUrl,
            }));
            toast({
                title: "Image Generated!",
                description: "Your new hero image is ready.",
            });

        } catch (error) {
            console.error("Error during AI generation:", error);
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: "The AI could not generate content. Please try again.",
            });
        } finally {
            setIsGenerating(false);
        }
    };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <PageHeader
        title="Mini Website Builder"
        description="Edit the content of your landing page in real-time."
        actions={
            <div className="flex gap-2">
                <Button variant="outline"><Eye className="mr-2 h-4 w-4"/>Preview</Button>
                <Button>Publish Site</Button>
            </div>
        }
      />
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Properties Panel */}
        <Card className="lg:col-span-1 flex flex-col">
            <CardHeader>
                <CardTitle>Page Content</CardTitle>
                <CardDescription>Use the AI assistant or edit the fields manually.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto space-y-6">
                 <div className="space-y-4 p-4 border rounded-lg bg-secondary/50">
                    <div className="space-y-2">
                        <Label htmlFor="ai-topic" className="flex items-center gap-2 font-semibold">
                            <Sparkles className="h-5 w-5 text-primary" />
                            AI Content Assistant
                        </Label>
                        <Textarea
                            id="ai-topic"
                            placeholder="Describe your business. e.g., 'A local coffee shop that serves ethically sourced beans and homemade pastries.'"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <Button onClick={handleGenerateContent} disabled={isGenerating} className="w-full">
                        {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Generate Content & Image
                    </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                    <Label htmlFor="headline">Headline</Label>
                    <Input id="headline" value={pageContent.headline} onChange={e => handleContentChange('headline', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="subheadline">Sub-headline</Label>
                    <Input id="subheadline" value={pageContent.subheadline} onChange={e => handleContentChange('subheadline', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bodyText">Body Text</Label>
                    <Textarea id="bodyText" value={pageContent.bodyText} onChange={e => handleContentChange('bodyText', e.target.value)} rows={5}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="primaryButtonText">Primary Button Text</Label>
                    <Input id="primaryButtonText" value={pageContent.primaryButtonText} onChange={e => handleContentChange('primaryButtonText', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="secondaryButtonText">Secondary Button Text</Label>
                    <Input id="secondaryButtonText" value={pageContent.secondaryButtonText} onChange={e => handleContentChange('secondaryButtonText', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="heroImagePrompt">Hero Image Prompt (for AI)</Label>
                    <Input id="heroImagePrompt" value={pageContent.heroImagePrompt} onChange={e => handleContentChange('heroImagePrompt', e.target.value)} />
                </div>
                
                <Separator />
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Features Section</h3>
                    <p className="text-xs text-muted-foreground">Drag and drop to reorder the features.</p>
                     <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={pageContent.features.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                            {pageContent.features.map((feature, index) => (
                                <SortableFeatureEditor 
                                    key={feature.id} 
                                    feature={feature}
                                    index={index} 
                                    handleFeatureChange={handleFeatureChange}
                                />
                            ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <Separator />
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Call to Action</h3>
                    <div className="space-y-2">
                        <Label htmlFor="cta-headline">CTA Headline</Label>
                        <Input id="cta-headline" value={pageContent.cta.headline} onChange={e => handleCtaChange('headline', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cta-button">CTA Button Text</Label>
                        <Input id="cta-button" value={pageContent.cta.buttonText} onChange={e => handleCtaChange('buttonText', e.target.value)} />
                    </div>
                </div>

            </CardContent>
        </Card>

        {/* Canvas */}
        <div className="lg:col-span-2 bg-secondary rounded-lg p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-card shadow-lg rounded-lg p-8 space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold font-headline">
                {pageContent.headline}
              </h1>
              <p className="text-lg text-muted-foreground">
                {pageContent.subheadline}
              </p>
            </div>

            <div className="relative">
                <Image
                  src={pageContent.heroImage}
                  alt="Hero image"
                  width={800}
                  height={400}
                  className={cn("rounded-lg w-full bg-muted transition-opacity", isGenerating && "opacity-50")}
                  data-ai-hint={pageContent.heroImagePrompt}
                  onError={() => handleContentChange('heroImage', 'https://placehold.co/800x400.png')}
                  key={pageContent.heroImage}
                />
                {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )}
            </div>
            
            <p>{pageContent.bodyText}</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90">{pageContent.primaryButtonText}</Button>
                <Button size="lg" variant="secondary">
                    <Smartphone className="mr-2 h-4 w-4"/>
                    {pageContent.secondaryButtonText}
                </Button>
            </div>

            <Separator className="my-8" />
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold font-headline">Key Features</h2>
                <p className="text-muted-foreground">Discover what makes us stand out.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
                {pageContent.features.map((feature, index) => {
                    const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || Zap;
                    return (
                        <div key={index} className="text-center p-4">
                            <div className="flex justify-center mb-4">
                                <div className="bg-primary/10 text-primary p-4 rounded-full">
                                    <IconComponent className="h-8 w-8" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold">{feature.title}</h3>
                            <p className="text-muted-foreground text-sm mt-1">{feature.description}</p>
                        </div>
                    );
                })}
            </div>

            <Separator className="my-8" />
            <div className="bg-secondary rounded-lg p-8 text-center">
                <h2 className="text-3xl font-bold font-headline">{pageContent.cta.headline}</h2>
                <Button size="lg" className="mt-6">{pageContent.cta.buttonText}</Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Sparkles, Copy, Twitter, Facebook, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateSocialPost, type GenerateSocialPostInput } from "@/ai/flows/social-post-flow";

export default function SocialAssistantPage() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<GenerateSocialPostInput['platform']>("Twitter");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");

  const handleGeneratePost = async () => {
    if (!topic) {
      toast({
        variant: "destructive",
        title: "Topic is required",
        description: "Please enter a topic to generate a post.",
      });
      return;
    }

    setIsLoading(true);
    setGeneratedPost("");
    try {
      const result = await generateSocialPost({ topic, platform });
      setGeneratedPost(result.post);
    } catch (error) {
      console.error("Error generating social post:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "The AI could not generate a post. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPost = () => {
    navigator.clipboard.writeText(generatedPost);
    toast({
      title: "Post Copied!",
      description: "The generated post has been copied to your clipboard.",
    });
  };
  
  const platformIcons = {
    Twitter: <Twitter className="h-5 w-5" />,
    Facebook: <Facebook className="h-5 w-5" />,
    LinkedIn: <Linkedin className="h-5 w-5" />,
  };

  return (
    <div>
      <PageHeader
        title="AI Social Media Assistant"
        description="Generate engaging social media posts for different platforms with a single click."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Post Generator</CardTitle>
              <CardDescription>
                Provide a topic and select a platform to create a new post.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="topic">What do you want to post about?</Label>
                <Textarea
                  id="topic"
                  placeholder="e.g., Announcing our new summer sale with 20% off all widgets."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-3">
                <Label>Which platform is this for?</Label>
                <RadioGroup
                  value={platform}
                  onValueChange={(value: GenerateSocialPostInput['platform']) => setPlatform(value)}
                  className="flex space-x-4"
                >
                   {Object.keys(platformIcons).map(p => (
                      <div key={p} className="flex items-center space-x-2">
                        <RadioGroupItem value={p} id={`platform-${p.toLowerCase()}`} />
                        <Label htmlFor={`platform-${p.toLowerCase()}`} className="flex items-center gap-2 cursor-pointer">
                            {platformIcons[p as keyof typeof platformIcons]}
                            {p}
                        </Label>
                      </div>
                    ))}
                </RadioGroup>
              </div>
              <Button onClick={handleGeneratePost} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Post
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Generated Post</CardTitle>
                <CardDescription>
                  Here is the AI-generated content. You can copy it or regenerate.
                </CardDescription>
              </div>
              {generatedPost && (
                <Button variant="outline" size="icon" onClick={handleCopyPost}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : generatedPost ? (
                <div className="p-4 bg-muted rounded-md whitespace-pre-wrap font-sans text-sm">
                  {generatedPost}
                </div>
              ) : (
                 <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-full">
                    <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Your post will appear here</h3>
                    <p className="text-muted-foreground">Fill out the form on the left to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

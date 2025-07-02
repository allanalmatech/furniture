
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/role-context";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ChairIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M7 19V8.5a3.5 3.5 0 0 1 7 0V19" />
        <path d="M14 19v-5" />
        <path d="M5 19h14" />
        <path d="M7 12h7" />
    </svg>
);


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(email, password);
    if (success) {
      router.push("/dashboard");
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <ChairIcon className="h-10 w-10 text-primary mx-auto" />
            <h1 className="text-3xl font-bold">Footsteps ERP Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your credentials to access the company portal.
            </p>
          </div>
           <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <Image
          src="https://placehold.co/1200x1800.png"
          alt="Image"
          width="1200"
          height="1800"
          className="h-full w-full object-cover dark:brightness-[0.3]"
          data-ai-hint="modern living room"
        />
         <div className="absolute bottom-8 left-8 right-8 p-6 bg-black/50 backdrop-blur-sm rounded-lg text-white">
            <h3 className="text-2xl font-bold">"Crafting Comfort, Designing Dreams."</h3>
            <p className="text-base mt-2">The all-in-one platform to manage every step of our furniture business, from raw materials to happy customers.</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loginSchema } from "@shared/schema";
import { Heart, Building2, Users, Shield, UserCheck, Headphones } from "lucide-react";
import { z } from "zod";

export default function Landing() {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginSchema>) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: () => {
      // Navigate to root to trigger role-based routing
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-2xl w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-primary rounded-full flex items-center justify-center mb-6">
            <Heart className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold pulse-logo mb-4">Pulse</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Workforce Management System</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Streamline employee, asset, and operations management across your organization
          </p>
        </div>
        
        <Card className="shadow-xl border-2">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to Pulse</h3>
              <p className="text-muted-foreground">
                Sign in to access your role-based dashboard
              </p>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mb-8">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full text-lg py-6"
                  data-testid="button-signin"
                >
                  <Heart className="h-5 w-5 mr-3" />
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
            
            <div className="border-t border-border pt-8">
              <h4 className="font-semibold text-foreground mb-6 text-center">Demo Credentials</h4>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div className="space-y-1">
                    <div className="font-medium text-blue-800 dark:text-blue-200">Admin</div>
                    <div className="text-blue-700 dark:text-blue-300">admin / admin123</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-blue-800 dark:text-blue-200">HR Manager</div>
                    <div className="text-blue-700 dark:text-blue-300">hr / hr123</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-blue-800 dark:text-blue-200">Contact Center Manager</div>
                    <div className="text-blue-700 dark:text-blue-300">manager / manager123</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-blue-800 dark:text-blue-200">Team Leader</div>
                    <div className="text-blue-700 dark:text-blue-300">leader / leader123</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-blue-800 dark:text-blue-200">Agent</div>
                    <div className="text-blue-700 dark:text-blue-300">agent / agent123</div>
                  </div>
                </div>
              </div>
              
              <h4 className="font-semibold text-foreground mb-6 text-center">Role-Based Access</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">System Admin</div>
                    <div className="text-sm text-muted-foreground">Complete system access and user management</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">HR Manager</div>
                    <div className="text-sm text-muted-foreground">Employee lifecycle and workforce operations</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Contact Center Manager</div>
                    <div className="text-sm text-muted-foreground">Operations oversight and team performance</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <UserCheck className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Team Leader</div>
                    <div className="text-sm text-muted-foreground">Team attendance and asset management</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg md:col-span-2">
                  <Headphones className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Agent</div>
                    <div className="text-sm text-muted-foreground">Personal workspace with time tracking and asset viewing</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

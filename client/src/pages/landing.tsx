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
import { Building2, Users, Shield, UserCheck, Headphones } from "lucide-react";
import alteramLogo from "@assets/alteram1_1_600x197_1750838676214_1757926492507.png";
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
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background with low opacity logo */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
        <div 
          className="absolute inset-0 bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(${alteramLogo})`,
            backgroundSize: '800px 260px',
            backgroundPosition: 'center center'
          }}
        />
      </div>
      
      <div className="relative z-10 max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <img 
            src={alteramLogo} 
            alt="Alteram Solutions" 
            className="mx-auto h-16 w-auto mb-8"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Sign in to access the Alteram CV Management System
          </p>
        </div>
        
        <Card className="shadow-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="p-8">
            
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
                  className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-signin"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">Demo Credentials:</h4>
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm">
                <div className="space-y-2">
                  <div><strong>Admin:</strong> admin / admin1</div>
                  <div><strong>Manager:</strong> mng / mng1</div>
                  <div><strong>User:</strong> user / user1</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

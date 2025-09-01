import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Building2, Users, Shield, UserCheck, Headphones } from "lucide-react";

export default function Landing() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/login";
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
                Sign in with your Replit account to access your role-based dashboard
              </p>
            </div>
            
            <Button 
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full text-lg py-6 mb-8"
              data-testid="button-signin"
            >
              <Heart className="h-5 w-5 mr-3" />
              {isLoading ? "Connecting..." : "Sign In with Replit"}
            </Button>
            
            <div className="border-t border-border pt-8">
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

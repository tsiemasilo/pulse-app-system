import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";

export default function Landing() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold pulse-logo mb-2">Pulse</h1>
          <h2 className="text-xl font-semibold text-foreground mb-2">Workforce Management System</h2>
          <p className="text-muted-foreground">Sign in to access your dashboard</p>
        </div>
        
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  disabled
                  data-testid="input-username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  disabled
                  data-testid="input-password"
                />
              </div>
              
              <Button 
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full"
                data-testid="button-signin"
              >
                {isLoading ? "Signing in..." : "Sign In with Replit"}
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-muted rounded-md">
              <h4 className="font-medium text-foreground mb-2">Available Roles:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div><strong>System Admin:</strong> Complete system access</div>
                <div><strong>HR:</strong> Employee lifecycle management</div>
                <div><strong>Contact Center Manager:</strong> Operations oversight</div>
                <div><strong>Team Leader:</strong> Team and attendance management</div>
                <div><strong>Agent:</strong> Personal workspace access</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

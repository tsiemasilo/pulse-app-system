import { Network } from "lucide-react";
import Navigation from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import GoJSOrganogram from "@/components/organogram/gojs-organogram";
import { useToast } from "@/hooks/use-toast";

export default function Organogram() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Context menu handlers
  const handleViewDetails = (userId: string) => {
    const userData = allUsers.find(u => u.id === userId);
    if (userData) {
      toast({
        title: "View Details",
        description: `Viewing details for ${userData.firstName} ${userData.lastName}`,
      });
    }
  };

  const handleAddEmployee = (parentUserId: string) => {
    const parentUser = allUsers.find(u => u.id === parentUserId);
    if (parentUser) {
      toast({
        title: "Add Employee",
        description: `Adding employee under ${parentUser.firstName} ${parentUser.lastName}`,
      });
    }
  };

  const handleRemoveFromChart = (userId: string) => {
    const userData = allUsers.find(u => u.id === userId);
    if (userData) {
      toast({
        title: "Remove from Chart",
        description: `Removing ${userData.firstName} ${userData.lastName} from chart`,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Navigation user={user || null} />
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between p-4 md:p-6 border-b bg-background dark:bg-gray-950">
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6" />
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="heading-organogram">Organizational Structure</h1>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-full" data-testid="loading-organogram">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : allUsers.filter(u => u.isActive).length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Card data-testid="empty-organogram" className="max-w-md">
                <CardContent className="p-12 text-center">
                  <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No organizational structure defined yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Users need to have reporting relationships configured in the User Access Management.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <GoJSOrganogram 
              users={allUsers}
              onViewDetails={handleViewDetails}
              onAddEmployee={handleAddEmployee}
              onRemoveFromChart={handleRemoveFromChart}
            />
          )}
        </div>
      </div>
    </>
  );
}

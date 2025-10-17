import { Network, Users } from "lucide-react";
import Navigation from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useMemo } from "react";

interface UserWithChildren extends User {
  children?: UserWithChildren[];
}

export default function Organogram() {
  const { user } = useAuth();

  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Build hierarchy tree based on reportsTo
  const hierarchy = useMemo(() => {
    if (!allUsers.length) return [];

    const buildTree = (managerId: string | null = null): UserWithChildren[] => {
      return allUsers
        .filter(u => u.reportsTo === managerId && u.isActive)
        .map(user => ({
          ...user,
          children: buildTree(user.id)
        }))
        .sort((a, b) => {
          // Sort by role hierarchy
          const roleOrder: Record<string, number> = {
            admin: 0,
            hr: 1,
            contact_center_ops_manager: 2,
            contact_center_manager: 3,
            team_leader: 4,
            agent: 5
          };
          return (roleOrder[a.role] || 999) - (roleOrder[b.role] || 999);
        });
    };

    return buildTree(null);
  }, [allUsers]);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      hr: 'HR Manager',
      contact_center_ops_manager: 'CC Ops Manager',
      contact_center_manager: 'CC Manager',
      team_leader: 'Team Leader',
      agent: 'Agent'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-300 dark:border-purple-700",
      hr: "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-300 dark:border-blue-700",
      contact_center_ops_manager: "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-700",
      contact_center_manager: "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-300 dark:border-orange-700",
      team_leader: "bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-yellow-300 dark:border-yellow-700",
      agent: "bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border-pink-300 dark:border-pink-700"
    };
    return colors[role] || colors.agent;
  };

  const OrgNode = ({ 
    userData
  }: { 
    userData: UserWithChildren;
  }) => {
    const hasChildren = userData.children && userData.children.length > 0;
    const directReports = userData.children?.length || 0;

    return (
      <div className="flex flex-col items-center">
        <Card className={`${getRoleColor(userData.role)} shadow-md hover:shadow-lg transition-shadow duration-200 min-w-[200px]`}>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-foreground font-semibold">
                  {userData.firstName?.[0]}{userData.lastName?.[0]}
                </div>
              </div>
              <h3 className="font-semibold text-sm md:text-base text-foreground" data-testid={`org-node-${userData.id}`}>
                {userData.firstName} {userData.lastName}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{getRoleLabel(userData.role)}</p>
              {userData.email && (
                <p className="text-xs text-muted-foreground mt-1">{userData.email}</p>
              )}
              {directReports > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-foreground">
                    {directReports} Direct Report{directReports > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {hasChildren && (
          <>
            <div className="h-8 w-0.5 bg-border my-2"></div>
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-stretch justify-center">
              {userData.children!.map((child) => (
                <OrgNode key={child.id} userData={child} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // Calculate total employees in hierarchy
  const totalEmployees = allUsers.filter(u => u.isActive).length;

  // Get roles breakdown
  const rolesBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    allUsers.filter(u => u.isActive).forEach(u => {
      breakdown[u.role] = (breakdown[u.role] || 0) + 1;
    });
    return breakdown;
  }, [allUsers]);

  return (
    <>
      <Navigation user={user || null} />
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6" />
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="heading-organogram">Organizational Structure</h1>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {Object.entries(rolesBreakdown).map(([role, count]) => (
            <Card key={role} className={getRoleColor(role)}>
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{getRoleLabel(role)}</p>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : hierarchy.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No organizational structure defined yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Users need to have reporting relationships configured in the User Access Management.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto pb-8">
            <div className="min-w-max px-4">
              {hierarchy.map((rootUser) => (
                <OrgNode key={rootUser.id} userData={rootUser} />
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-3">Role Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-100 to-indigo-100 border border-purple-300"></div>
              <span className="text-xs">Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-100 to-cyan-100 border border-blue-300"></div>
              <span className="text-xs">HR Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-green-100 to-emerald-100 border border-green-300"></div>
              <span className="text-xs">CC Ops Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-300"></div>
              <span className="text-xs">CC Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-yellow-100 to-orange-100 border border-yellow-300"></div>
              <span className="text-xs">Team Leader</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-100 to-rose-100 border border-pink-300"></div>
              <span className="text-xs">Agent</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

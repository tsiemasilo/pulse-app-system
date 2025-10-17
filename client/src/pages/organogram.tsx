import { Network } from "lucide-react";
import Navigation from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";

export default function Organogram() {
  const { user } = useAuth();

  const OrgNode = ({ 
    title, 
    subtitle, 
    level = 0,
    children 
  }: { 
    title: string; 
    subtitle?: string; 
    level?: number;
    children?: React.ReactNode;
  }) => {
    const levelColors = {
      0: "bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-300 dark:border-purple-700",
      1: "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-300 dark:border-blue-700",
      2: "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-700",
      3: "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-300 dark:border-orange-700",
      4: "bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border-pink-300 dark:border-pink-700"
    };

    return (
      <div className="flex flex-col items-center">
        <Card className={`${levelColors[level as keyof typeof levelColors]} shadow-md hover:shadow-lg transition-shadow duration-200`}>
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-semibold text-sm md:text-base text-foreground" data-testid={`org-node-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {children && (
          <>
            <div className="h-8 w-0.5 bg-border my-2"></div>
            <div className="flex flex-col items-center gap-4">
              {children}
            </div>
          </>
        )}
      </div>
    );
  };

  const Branch = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-stretch justify-center">
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user || null} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Network className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="title-organogram">
              Organizational Structure
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Company hierarchy and reporting structure
          </p>
        </div>

        <div className="flex justify-center overflow-x-auto pb-8">
          <div className="min-w-max">
            <OrgNode title="Head of Operations" subtitle="Chief Operations Officer" level={0}>
              <Branch>
                {/* RAF Branch */}
                <div className="flex flex-col items-center">
                  <OrgNode title="Head of Operations: Contact Center (RAF)" level={1}>
                    <OrgNode title="Contact Center Manager" subtitle="RAF Division" level={2}>
                      <OrgNode title="Team Leader" subtitle="RAF Team" level={3}>
                        <OrgNode title="Agents" subtitle="Front-line Staff" level={4} />
                      </OrgNode>
                    </OrgNode>
                  </OrgNode>
                </div>

                {/* UIF Branch */}
                <div className="flex flex-col items-center">
                  <OrgNode title="Head of Operations: Contact Center (UIF)" level={1}>
                    <OrgNode title="Contact Center Manager" subtitle="UIF Division" level={2}>
                      <OrgNode title="Team Leader" subtitle="UIF Team" level={3}>
                        <OrgNode title="Agents" subtitle="Front-line Staff" level={4} />
                      </OrgNode>
                    </OrgNode>
                  </OrgNode>
                </div>
              </Branch>
            </OrgNode>
          </div>
        </div>

        {/* Legend */}
        <Card className="mt-8 bg-card/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm text-foreground">Hierarchy Levels</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-300 dark:border-purple-700"></div>
                <span className="text-xs text-muted-foreground">Executive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-300 dark:border-blue-700"></div>
                <span className="text-xs text-muted-foreground">Department Head</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-300 dark:border-green-700"></div>
                <span className="text-xs text-muted-foreground">Manager</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-300 dark:border-orange-700"></div>
                <span className="text-xs text-muted-foreground">Team Leader</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border border-pink-300 dark:border-pink-700"></div>
                <span className="text-xs text-muted-foreground">Agents</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

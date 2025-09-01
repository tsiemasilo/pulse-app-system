import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  testId?: string;
}

export function StatCard({ title, value, icon: Icon, iconColor, testId }: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-2 ${iconColor} rounded-lg`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground" data-testid={testId}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

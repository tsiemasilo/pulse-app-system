import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  cardColor: string;
  textColor: string;
  iconBgColor: string;
  iconColor: string;
  testId?: string;
}

export function StatCard({ title, value, icon: Icon, cardColor, textColor, iconBgColor, iconColor, testId }: StatCardProps) {
  // Create a darker version of the text color for the value
  const valueColor = textColor ? textColor.replace('400', '300').replace('600', '700') : 'text-foreground';
  
  return (
    <Card className={`${cardColor} shadow-sm hover:shadow-md transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`${textColor || 'text-muted-foreground'} text-sm font-medium`}>{title}</p>
            <p className={`text-3xl font-bold ${valueColor}`} data-testid={testId}>
              {value}
            </p>
          </div>
          <div className={`${iconBgColor} p-3 rounded-full`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

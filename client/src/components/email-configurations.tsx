import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Trash2 } from "lucide-react";

const EMAIL_CATEGORIES = [
  { id: "lost-assets", label: "Lost Assets" },
  { id: "terminated-agents", label: "Terminated Agents" },
  { id: "transfers", label: "Transfers" },
] as const;

type EmailCategoryId = (typeof EMAIL_CATEGORIES)[number]["id"];

interface EmailConfiguration {
  id: string;
  departmentName: string;
  categories: EmailCategoryId[];
  emailAddress: string;
}

export default function EmailConfigurations() {
  const { toast } = useToast();
  const [departmentName, setDepartmentName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<EmailCategoryId[]>([]);
  const [configurations, setConfigurations] = useState<EmailConfiguration[]>([]);

  const categoryMap = useMemo(() => {
    return new Map(EMAIL_CATEGORIES.map((category) => [category.id, category.label]));
  }, []);

  const toggleCategory = (categoryId: EmailCategoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  };

  const handleAddConfiguration = () => {
    if (!departmentName.trim() || !emailAddress.trim()) {
      toast({
        title: "Missing details",
        description: "Add a department name and email address before saving.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: "Select a category",
        description: "Choose at least one email category to route.",
        variant: "destructive",
      });
      return;
    }

    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    setConfigurations((prev) => [
      ...prev,
      {
        id: newId,
        departmentName: departmentName.trim(),
        categories: selectedCategories,
        emailAddress: emailAddress.trim(),
      },
    ]);

    setDepartmentName("");
    setEmailAddress("");
    setSelectedCategories([]);
  };

  const handleRemoveConfiguration = (configurationId: string) => {
    setConfigurations((prev) => prev.filter((configuration) => configuration.id !== configurationId));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-blue-600" />
            Email Configurations
          </CardTitle>
          <CardDescription>
            Route email notifications by department and category for lost assets, terminations, and transfers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department-name">Department name</Label>
                  <Input
                    id="department-name"
                    placeholder="e.g. Asset Recovery"
                    value={departmentName}
                    onChange={(event) => setDepartmentName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department-email">Department email</Label>
                  <Input
                    id="department-email"
                    type="email"
                    placeholder="assets@company.com"
                    value={emailAddress}
                    onChange={(event) => setEmailAddress(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Responsible categories</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {EMAIL_CATEGORIES.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
                    >
                      <Checkbox
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      {category.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex h-full flex-col justify-between rounded-lg border border-dashed border-gray-200 p-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100">Configuration tips</p>
                <ul className="space-y-1 text-xs sm:text-sm">
                  <li>• Add one row per department.</li>
                  <li>• Choose every category the department should receive.</li>
                  <li>• Use shared inboxes for coverage.</li>
                </ul>
              </div>
              <Button className="mt-4 w-full" onClick={handleAddConfiguration}>
                <Plus className="mr-2 h-4 w-4" />
                Add configuration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Configured departments</CardTitle>
          <CardDescription>Review and remove existing email routing rules.</CardDescription>
        </CardHeader>
        <CardContent>
          {configurations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-muted-foreground">
              No email configurations yet. Add a department to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configurations.map((configuration) => (
                    <TableRow key={configuration.id}>
                      <TableCell className="font-medium">{configuration.departmentName}</TableCell>
                      <TableCell>{configuration.emailAddress}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {configuration.categories.map((categoryId) => (
                            <Badge key={categoryId} variant="outline">
                              {categoryMap.get(categoryId)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveConfiguration(configuration.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

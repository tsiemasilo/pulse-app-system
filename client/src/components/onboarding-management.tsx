import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertUserSchema, type Department, type Asset, type User } from "@shared/schema";
import { 
  UserPlus, 
  CheckCircle, 
  Clock, 
  FileText, 
  Briefcase, 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Upload,
  Download
} from "lucide-react";
import { z } from "zod";

// Enhanced onboarding schema
const onboardingSchema = insertUserSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  manager: z.string().optional(),
  workLocation: z.string().min(1, "Work location is required"),
  phoneNumber: z.string().optional(),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
  notes: z.string().optional(),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

interface OnboardingChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'documentation' | 'systems' | 'equipment' | 'training';
  required: boolean;
  completed: boolean;
}

export default function OnboardingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState<OnboardingChecklistItem[]>([
    {
      id: '1',
      title: 'Employee Handbook',
      description: 'Provide and review company handbook',
      category: 'documentation',
      required: true,
      completed: false
    },
    {
      id: '2',
      title: 'Tax Forms (W-4)',
      description: 'Complete federal and state tax forms',
      category: 'documentation',
      required: true,
      completed: false
    },
    {
      id: '3',
      title: 'Direct Deposit Setup',
      description: 'Configure payroll direct deposit',
      category: 'documentation',
      required: true,
      completed: false
    },
    {
      id: '4',
      title: 'System Access Setup',
      description: 'Create user accounts and system access',
      category: 'systems',
      required: true,
      completed: false
    },
    {
      id: '5',
      title: 'Email Account Creation',
      description: 'Set up corporate email account',
      category: 'systems',
      required: true,
      completed: false
    },
    {
      id: '6',
      title: 'Laptop Assignment',
      description: 'Assign and configure work laptop',
      category: 'equipment',
      required: true,
      completed: false
    },
    {
      id: '7',
      title: 'Headset Assignment',
      description: 'Provide contact center headset',
      category: 'equipment',
      required: true,
      completed: false
    },
    {
      id: '8',
      title: 'Desk Setup',
      description: 'Assign workspace and seating',
      category: 'equipment',
      required: true,
      completed: false
    },
    {
      id: '9',
      title: 'Orientation Training',
      description: 'Complete company orientation program',
      category: 'training',
      required: true,
      completed: false
    },
    {
      id: '10',
      title: 'Department Training',
      description: 'Department-specific training sessions',
      category: 'training',
      required: true,
      completed: false
    }
  ]);

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      role: "agent",
      departmentId: "",
      startDate: "",
      jobTitle: "",
      manager: "",
      workLocation: "",
      phoneNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
      isActive: true,
    },
  });

  const onboardEmployeeMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      // Create the user first
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        username: data.username,
        password: data.password,
        role: data.role,
        departmentId: data.departmentId,
        isActive: data.isActive,
      };
      
      return await apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Employee onboarded successfully! Remember to complete the onboarding checklist.",
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to onboard employee",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OnboardingData) => {
    onboardEmployeeMutation.mutate(data);
  };

  const toggleChecklistItem = (itemId: string) => {
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  };

  const getChecklistProgress = () => {
    const completed = checklistItems.filter(item => item.completed).length;
    return Math.round((completed / checklistItems.length) * 100);
  };

  const getChecklistByCategory = (category: OnboardingChecklistItem['category']) => {
    return checklistItems.filter(item => item.category === category);
  };

  const availableAssets = assets.filter(asset => asset.status === 'available');
  const managers = users.filter(user => 
    ['admin', 'hr', 'contact_center_manager', 'team_leader'].includes(user.role || '')
  );

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-6 border border-purple-100 dark:border-purple-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Employee Onboarding</h2>
            <p className="text-purple-600 dark:text-purple-400">Streamlined onboarding process for new employees</p>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-add-employee">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Start New Onboarding
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Employee Onboarding</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Tabs defaultValue="personal" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="personal">Personal Info</TabsTrigger>
                        <TabsTrigger value="job">Job Details</TabsTrigger>
                        <TabsTrigger value="contact">Contact Info</TabsTrigger>
                        <TabsTrigger value="emergency">Emergency</TabsTrigger>
                      </TabsList>

                      <TabsContent value="personal" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="First Name" data-testid="input-firstname" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Last Name" data-testid="input-lastname" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="Username" data-testid="input-username" {...field} />
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
                                <FormLabel>Temporary Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Password" data-testid="input-password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="job" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-role">
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="admin">System Admin</SelectItem>
                                    <SelectItem value="hr">HR Manager</SelectItem>
                                    <SelectItem value="contact_center_ops_manager">Contact Center Ops Manager</SelectItem>
                                    <SelectItem value="contact_center_manager">Contact Center Manager</SelectItem>
                                    <SelectItem value="team_leader">Team Leader</SelectItem>
                                    <SelectItem value="agent">Agent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="departmentId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-department">
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {departments.map((dept) => (
                                      <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="jobTitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Job Title" data-testid="input-job-title" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="manager"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Direct Manager</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-manager">
                                      <SelectValue placeholder="Select manager" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {managers.map((manager) => (
                                      <SelectItem key={manager.id} value={manager.id}>
                                        {manager.firstName} {manager.lastName} ({manager.role})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                  <Input type="date" data-testid="input-start-date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="workLocation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Work Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Office A, Remote, Hybrid" data-testid="input-work-location" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="contact" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="Email" data-testid="input-email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="+1 (555) 123-4567" data-testid="input-phone" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="emergency" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="emergencyContactName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Emergency Contact Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Contact Name" data-testid="input-emergency-name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="emergencyContactPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Emergency Contact Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="+1 (555) 123-4567" data-testid="input-emergency-phone" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Notes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Any additional information..." rows={3} data-testid="textarea-notes" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={onboardEmployeeMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                        data-testid="button-submit-onboarding"
                      >
                        {onboardEmployeeMutation.isPending ? "Creating..." : "Start Onboarding"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Onboarding Progress
              </CardTitle>
              <Badge variant="outline">
                {checklistItems.filter(item => item.completed).length}/{checklistItems.length} Complete
              </Badge>
            </div>
            <Progress value={getChecklistProgress()} className="w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(['documentation', 'systems', 'equipment', 'training'] as const).map((category) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {category === 'documentation' && <><FileText className="inline h-4 w-4 mr-1" /> Documentation</>}
                    {category === 'systems' && <><UserIcon className="inline h-4 w-4 mr-1" /> Systems Access</>}
                    {category === 'equipment' && <><Briefcase className="inline h-4 w-4 mr-1" /> Equipment</>}
                    {category === 'training' && <><Calendar className="inline h-4 w-4 mr-1" /> Training</>}
                  </h4>
                  {getChecklistByCategory(category).map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => toggleChecklistItem(item.id)}
                        data-testid={`checkbox-${item.id}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                            {item.title}
                          </span>
                          {item.required && !item.completed && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          {item.completed && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Complete</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2" data-testid="button-bulk-upload">
                <Upload className="h-6 w-6 text-blue-600" />
                <span className="text-sm">Bulk Upload</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2" data-testid="button-export-checklist">
                <Download className="h-6 w-6 text-green-600" />
                <span className="text-sm">Export Checklist</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2" data-testid="button-email-template">
                <Mail className="h-6 w-6 text-purple-600" />
                <span className="text-sm">Email Templates</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2" data-testid="button-assign-assets">
                <Briefcase className="h-6 w-6 text-orange-600" />
                <span className="text-sm">Assign Assets</span>
              </Button>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Available Equipment</h4>
              <div className="space-y-2">
                {availableAssets.slice(0, 5).map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{asset.name}</span>
                      <Badge variant="outline" className="text-xs">{asset.type}</Badge>
                    </div>
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Available
                    </Badge>
                  </div>
                ))}
                {availableAssets.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{availableAssets.length - 5} more available
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
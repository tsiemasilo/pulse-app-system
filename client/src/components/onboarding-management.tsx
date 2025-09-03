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
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

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
      setShowForm(false);
      setCurrentStep(1);
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

  const getStepTitle = (step: number) => {
    switch(step) {
      case 1: return "Personal Info";
      case 2: return "Job Details";
      case 3: return "Contact Info";
      case 4: return "Emergency";
      default: return "Personal Info";
    }
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
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white" 
              data-testid="button-add-employee"
              onClick={() => setShowForm(!showForm)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {showForm ? "Cancel Onboarding" : "Start New Onboarding"}
            </Button>
          </div>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Employee Onboarding</CardTitle>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-500">{currentStep}/4</span>
              </div>
              <Progress value={(currentStep / 4) * 100} className="w-full" />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className={currentStep >= 1 ? 'text-purple-600 font-medium' : ''}>Personal Info</span>
                <span className={currentStep >= 2 ? 'text-purple-600 font-medium' : ''}>Job Details</span>
                <span className={currentStep >= 3 ? 'text-purple-600 font-medium' : ''}>Contact Info</span>
                <span className={currentStep >= 4 ? 'text-purple-600 font-medium' : ''}>Emergency</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs value={`step-${currentStep}`} onValueChange={(value) => setCurrentStep(parseInt(value.split('-')[1]))} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="step-1">Personal Info</TabsTrigger>
                    <TabsTrigger value="step-2">Job Details</TabsTrigger>
                    <TabsTrigger value="step-3">Contact Info</TabsTrigger>
                    <TabsTrigger value="step-4">Emergency</TabsTrigger>
                  </TabsList>

                  <TabsContent value="step-1" className="space-y-4">
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

                  <TabsContent value="step-2" className="space-y-4">
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

                  <TabsContent value="step-3" className="space-y-4">
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

                  <TabsContent value="step-4" className="space-y-4">
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

                <div className="flex justify-between space-x-2">
                  <div className="flex space-x-2">
                    {currentStep > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCurrentStep(currentStep - 1)}
                        data-testid="button-previous"
                      >
                        Previous
                      </Button>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {setShowForm(false); setCurrentStep(1);}}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    {currentStep < 4 ? (
                      <Button 
                        type="button" 
                        onClick={() => setCurrentStep(currentStep + 1)}
                        className="bg-purple-600 hover:bg-purple-700"
                        data-testid="button-next"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button 
                        type="submit" 
                        disabled={onboardEmployeeMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                        data-testid="button-submit-onboarding"
                      >
                        {onboardEmployeeMutation.isPending ? "Creating..." : "Complete Onboarding"}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
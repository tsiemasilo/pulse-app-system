import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  insertPendingOnboardingRequestSchema,
  type Division, 
  type Department,
  type Section,
  type PendingOnboardingRequest
} from "@shared/schema";
import { 
  UserPlus, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { z } from "zod";

const onboardingFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  divisionId: z.string().min(1, "Division is required").refine(val => val !== "none", { message: "Division is required" }),
  departmentId: z.string().min(1, "Department is required").refine(val => val !== "none", { message: "Department is required" }),
  sectionId: z.string().min(1, "Section is required").refine(val => val !== "none", { message: "Section is required" }),
});

type OnboardingFormData = z.infer<typeof onboardingFormSchema>;

export default function OnboardingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ["/api/divisions"],
  });

  const { data: allDepartments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: allSections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const { data: myRequests = [], isLoading: loadingRequests } = useQuery<PendingOnboardingRequest[]>({
    queryKey: ["/api/onboarding-requests/my-requests"],
  });

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      divisionId: "",
      departmentId: "",
      sectionId: "",
    },
  });

  const selectedDivisionId = form.watch("divisionId");
  const selectedDepartmentId = form.watch("departmentId");

  const filteredDepartments = allDepartments.filter(
    dept => selectedDivisionId && selectedDivisionId !== '' && dept.divisionId === selectedDivisionId
  );

  const filteredSections = allSections.filter(
    section => selectedDepartmentId && selectedDepartmentId !== '' && section.departmentId === selectedDepartmentId
  );

  const onboardAgentMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      const requestData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email && data.email.trim() !== '' ? data.email : null,
        divisionId: data.divisionId,
        departmentId: data.departmentId,
        sectionId: data.sectionId,
      };
      
      return await apiRequest("POST", "/api/onboarding-requests", requestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-requests/my-requests"] });
      toast({
        title: "Request Submitted",
        description: "Your onboarding request has been submitted and is pending manager approval.",
      });
      form.reset();
      setShowForm(false);
    },
    onError: (error: any) => {
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
      const message = error?.message || "Failed to submit onboarding request";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OnboardingFormData) => {
    onboardAgentMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = myRequests.filter(r => r.status === 'pending').length;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = myRequests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-6 border border-purple-100 dark:border-purple-800/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Agent Onboarding</h2>
            <p className="text-purple-600 dark:text-purple-400">Onboard new agents to your team - requires manager approval</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-yellow-500" /> {pendingCount} pending</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> {approvedCount} approved</span>
              <span className="flex items-center gap-1"><XCircle className="h-4 w-4 text-red-500" /> {rejectedCount} rejected</span>
            </div>
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white" 
              data-testid="button-add-agent"
              onClick={() => setShowForm(!showForm)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {showForm ? "Cancel" : "Onboard New Agent"}
            </Button>
          </div>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              New Agent Onboarding Request
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Fill in the agent details below. The agent will be automatically assigned to your team once approved.
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="agent@example.com" data-testid="input-email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="divisionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Division</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("departmentId", "");
                            form.setValue("sectionId", "");
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-division">
                              <SelectValue placeholder="Select a division" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {divisions.map((division) => (
                              <SelectItem key={division.id} value={division.id}>
                                {division.name}
                              </SelectItem>
                            ))}
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
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("sectionId", "");
                          }} 
                          value={field.value}
                          disabled={!selectedDivisionId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-department">
                              <SelectValue placeholder={selectedDivisionId ? "Select a department" : "Select division first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredDepartments.map((department) => (
                              <SelectItem key={department.id} value={department.id}>
                                {department.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedDepartmentId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-section">
                              <SelectValue placeholder={selectedDepartmentId ? "Select a section" : "Select department first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredSections.map((section) => (
                              <SelectItem key={section.id} value={section.id}>
                                {section.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Approval Required</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        This request will be sent to your manager for approval. Once approved, the agent will be added to your team automatically.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {setShowForm(false); form.reset();}}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={onboardAgentMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-submit-onboarding"
                  >
                    {onboardAgentMutation.isPending ? "Submitting..." : "Submit for Approval"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My Onboarding Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No onboarding requests yet</p>
              <p className="text-sm">Click "Onboard New Agent" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                  data-testid={`request-item-${request.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        {request.firstName?.charAt(0)}{request.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{request.firstName} {request.lastName}</p>
                      {request.email && <p className="text-sm text-muted-foreground">{request.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {request.status === 'rejected' && request.rejectionReason && (
                      <p className="text-sm text-red-600 dark:text-red-400 max-w-xs truncate" title={request.rejectionReason}>
                        {request.rejectionReason}
                      </p>
                    )}
                    {getStatusBadge(request.status)}
                    <span className="text-xs text-muted-foreground">
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertTerminationSchema } from "@shared/schema";
import { UserX, Calendar, User, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";
import type { Termination, User as UserType } from "@shared/schema";

const terminationFormSchema = insertTerminationSchema.omit({ exitInterviewCompleted: true }).extend({
  terminationDate: z.string().min(1, "Termination date is required"),
  lastWorkingDay: z.string().min(1, "Last working day is required"),
});

export default function TerminationManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: terminations = [] } = useQuery<Termination[]>({
    queryKey: ["/api/terminations"],
  });

  const form = useForm({
    resolver: zodResolver(terminationFormSchema),
    defaultValues: {
      userId: "",
      terminationType: "",
      terminationDate: "",
      lastWorkingDay: "",
      reason: "",
      assetReturnStatus: "pending",
      processedBy: user?.id || "",
    },
  });

  const terminationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof terminationFormSchema>) => {
      const terminationData = {
        ...data,
        terminationDate: new Date(data.terminationDate).toISOString(),
        lastWorkingDay: new Date(data.lastWorkingDay).toISOString(),
        processedBy: user?.id || "",
      };
      const res = await apiRequest("POST", "/api/terminations", terminationData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/terminations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsOpen(false);
      form.reset();
      toast({
        title: "Termination Processed",
        description: "Employee termination has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Termination Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof terminationFormSchema>) => {
    terminationMutation.mutate(data);
  };

  const getTerminationTypeColor = (type: string) => {
    switch (type) {
      case 'voluntary':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'involuntary':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'layoff':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'absent':
      case 'sick':
      case 'leave':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'AWOL':
      case 'suspended':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getAssetReturnColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown';
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center">
          <UserX className="h-5 w-5 mr-2" />
          Employee Terminations
        </CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" data-testid="button-create-termination">
              <UserX className="h-4 w-4 mr-2" />
              Process Termination
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Process Employee Termination</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-employee">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.filter(u => u.isActive).map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.username})
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
                    name="terminationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Termination Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-termination-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="AWOL">AWOL</SelectItem>
                            <SelectItem value="involuntary">Involuntary (Termination)</SelectItem>
                            <SelectItem value="layoff">Layoff</SelectItem>
                            <SelectItem value="leave">Leave</SelectItem>
                            <SelectItem value="sick">Sick</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="voluntary">Voluntary (Resignation)</SelectItem>
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
                    name="terminationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Termination Date</FormLabel>
                        <FormControl>
                          <input 
                            type="date" 
                            {...field} 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            data-testid="input-termination-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastWorkingDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>&nbsp;</FormLabel>
                        <FormControl>
                          <input 
                            type="date" 
                            {...field} 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            data-testid="input-last-working-day"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Termination</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Provide termination reason" data-testid="textarea-reason" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetReturnStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Return Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-asset-return">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {user && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-sm font-medium text-muted-foreground">Processed by:</div>
                    <div className="text-sm">{user.firstName} {user.lastName} ({user.role})</div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="destructive" disabled={terminationMutation.isPending} data-testid="button-submit-termination">
                    {terminationMutation.isPending ? "Processing..." : "Process Termination"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {terminations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No terminations on record.
            </div>
          ) : (
            terminations.map((termination) => (
              <div key={termination.id} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{getUserName(termination.userId)}</span>
                    <Badge className={getTerminationTypeColor(termination.terminationType)}>
                      {termination.terminationType}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(termination.terminationDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className={getAssetReturnColor(termination.assetReturnStatus || 'pending')}>
                      Assets: {termination.assetReturnStatus || 'pending'}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(termination.lastWorkingDay).toLocaleDateString()}
                  </span>
                </div>
                {termination.reason && (
                  <p className="text-sm text-muted-foreground mt-2">{termination.reason}</p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
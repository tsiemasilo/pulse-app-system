import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle } from "lucide-react";

const assetLostSchema = z.object({
  dateLost: z.string().min(1, "Date when lost is required"),
  reason: z.string().min(10, "Please provide a detailed reason (at least 10 characters)"),
});

type AssetLostForm = z.infer<typeof assetLostSchema>;

interface AssetLostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  assetType: string;
  onSaved: () => void;
}

export function AssetLostDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
  assetType,
  onSaved,
}: AssetLostDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AssetLostForm>({
    resolver: zodResolver(assetLostSchema),
    defaultValues: {
      dateLost: new Date().toISOString().split('T')[0], // Today's date as default
      reason: "",
    },
  });

  const saveAssetLoss = useMutation({
    mutationFn: async (data: AssetLostForm) => {
      return apiRequest('POST', '/api/asset-loss', {
        userId: agentId,
        assetType,
        dateLost: new Date(data.dateLost).toISOString(),
        reason: data.reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Asset Loss Reported",
        description: `${assetType} loss has been recorded for ${agentName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-loss"] });
      onSaved();
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save asset loss record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AssetLostForm) => {
    setIsSubmitting(true);
    try {
      await saveAssetLoss.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <DialogTitle>Asset Lost</DialogTitle>
              <DialogDescription>
                Report that {agentName}'s {assetType} was not returned
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dateLost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date When Lost/Not Returned</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason Why Not Returned</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide details about why the asset was not returned (e.g., lost, damaged, forgotten at home, etc.)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? "Saving..." : "Report Asset Lost"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { editTaskMutationFn, getTaskByIdQueryFn } from "@/lib/api";
import { TaskPriorityEnum, TaskStatusEnum, Permissions } from "@/constant";
import { useAuthContext } from "@/context/auth-provider";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { toast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditTaskFormProps {
  taskId: string;
  projectId: string;
}

const formSchema = z.object({
  title: z.string().trim().min(1, { message: "Title is required" }),
  description: z.string().trim().optional(),
  status: z.nativeEnum(TaskStatusEnum, { required_error: "Status is required" }),
  priority: z.nativeEnum(TaskPriorityEnum, { required_error: "Priority is required" }),
  assignedTo: z.string().trim().min(1, { message: "AssignedTo is required" }),
  dueDate: z.preprocess(
    (arg) => (typeof arg === "string" ? new Date(arg) : arg),
    z.date({ required_error: "Due date is required" })
  ),
});

const EditTaskForm: React.FC<EditTaskFormProps> = ({ taskId, projectId}) => {
  const { hasPermission } = useAuthContext();
  const canEditTask = hasPermission(Permissions.EDIT_TASK);
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  const { data, error, isLoading } = useQuery({
    queryKey: ["getTaskById", taskId, projectId, workspaceId],
    queryFn: () => getTaskByIdQueryFn({ workspaceId, projectId, taskId }),
    enabled: !!taskId && !!projectId && !!workspaceId,

  });
  // console.log("Data", data);
  const { mutate, isPending } = useMutation({
    mutationFn: editTaskMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["all-tasks", workspaceId],
      });

      toast({ title: "Success", description: "Task updated successfully", variant: "success" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: TaskStatusEnum.TODO,
      priority: TaskPriorityEnum.LOW,
      assignedTo: "",
      dueDate: new Date(),
    },
  });

  useEffect(() => {
    if (data?.task) {
      form.reset({
        title: data.task.title || "",
        description: data.task.description || "",
        status: data.task.status,
        priority: data.task.priority,
        assignedTo: data.task.assignedTo?._id || "",
        dueDate: data.task.dueDate ? new Date(data.task.dueDate) : new Date(),
      });
    }
  }, [data?.task, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isPending) return;

    mutate({
      taskId,
      projectId,
      workspaceId,
      data: {
        ...values,
        dueDate: values.dueDate.toISOString(),
        description: values.description || "",
      },
    });
  };

  if (!canEditTask) return <p>You do not have permission to edit this task.</p>;

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Error loading task: {error.message}</p>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Task title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Task description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(TaskStatusEnum).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
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
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(TaskPriorityEnum).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
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
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? field.value.toISOString().split("T")[0] : ""}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Updating..." : "Update Task"}
        </Button>
      </form>
    </Form>
  );
};

export default EditTaskForm;
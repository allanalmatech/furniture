
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Upload, Download, Award, FileSpreadsheet, FileText, CalendarIcon, MoreHorizontal, Trash2, GripVertical, Edit } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Project, Task, Milestone, StaffMember } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { GanttChartSquare } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getProjects, addProject, updateProject, deleteProject, getTasks, addTask, updateTask, deleteTask, getMilestones, addMilestone, updateMilestone, deleteMilestone } from "@/services/project-service";
import { getStaff } from "@/services/hr-service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  client: z.string().min(1, "Client is required"),
  dueDate: z.date({ required_error: "A due date is required." }),
});
type ProjectFormValues = z.infer<typeof projectFormSchema>;

const taskFormSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  projectId: z.string().min(1, "Project is required"),
  assignee: z.string().min(1, "Assignee is required"),
  dueDate: z.date({ required_error: "A due date is required." }),
});
type TaskFormValues = z.infer<typeof taskFormSchema>;

const milestoneFormSchema = z.object({
    name: z.string().min(1, "Milestone name is required"),
    projectId: z.string().min(1, "Project is required"),
    dueDate: z.date({ required_error: "A due date is required." }),
});
type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;

const projectStatuses: Project['status'][] = ["Not Started", "In Progress", "Completed", "On Hold"];
const taskStatuses: Task['status'][] = ["To Do", "In Progress", "Done"];
const milestoneStatuses: Milestone['status'][] = ["Upcoming", "Completed", "Delayed"];

const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const PlaceholderContent = ({ title, description, icon: Icon, actionText }: { title: string, description: string, icon: React.ElementType, actionText: string }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <Icon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Coming Soon!</h3>
                <p className="text-muted-foreground mb-4">This feature is currently under development.</p>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {actionText}
                </Button>
            </div>
        </CardContent>
    </Card>
);

const TaskCard = ({ task, onEdit, onDelete }: { task: Task, onEdit: (task: Task) => void, onDelete: (task: Task) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    if (isDragging) {
        return (
            <div ref={setNodeRef} style={style}>
                <Card className="mb-3 opacity-50 border-2 border-dashed">
                    <CardContent className="p-3">
                        <div className="h-12" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div ref={setNodeRef} style={style}>
            <Card className="mb-3 group/task">
                <CardContent className="p-3 relative">
                     <div {...attributes} {...listeners} className="absolute top-1 right-8 cursor-grab p-2 text-muted-foreground opacity-0 group-hover/task:opacity-100 transition-opacity">
                        <GripVertical className="h-5 w-5" />
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="absolute top-1 right-0 h-8 w-8 p-0 opacity-0 group-hover/task:opacity-100">
                                <MoreHorizontal className="h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onEdit(task)}><Edit className="mr-2 h-4 w-4" />Edit Task</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task)}><Trash2 className="mr-2 h-4 w-4" />Delete Task</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <p className="font-semibold text-sm mb-2 pr-8">{task.name}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{task.dueDate}</span>
                         <div className="flex items-center gap-1">
                            <span>{task.assignee}</span>
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={`https://placehold.co/40x40.png`} alt={task.assignee} data-ai-hint="person avatar" />
                                <AvatarFallback className="text-[10px]">{getInitials(task.assignee)}</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const KanbanColumn = ({ status, tasks, onEdit, onDelete }: { status: Task['status'], tasks: Task[], onEdit: (task: Task) => void, onDelete: (task: Task) => void }) => {
    const { setNodeRef } = useDroppable({
        id: status,
        data: {
            type: 'Column',
            status: status,
        }
    });

    return (
        <div ref={setNodeRef} className="bg-muted/50 rounded-lg p-3 flex-shrink-0 w-full md:w-[300px]">
            <h3 className="font-semibold mb-4 px-1">{status} <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span></h3>
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 h-[calc(100vh-28rem)] overflow-y-auto pr-1">
                    {tasks.map(task => <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />)}
                </div>
            </SortableContext>
        </div>
    );
};


export default function ProjectsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [assignees, setAssignees] = useState<StaffMember[]>([]);

  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'project' | 'task' | 'milestone' } | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [projectsData, tasksData, milestonesData, staffData] = await Promise.all([
                getProjects(),
                getTasks(),
                getMilestones(),
                getStaff(),
            ]);
            setProjects(projectsData);
            setTasks(tasksData);
            setMilestones(milestonesData);
            setAssignees(staffData);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load project data."});
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [toast]);


  const filteredProjects = useMemo(() => {
    return projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()) || p.client.toLowerCase().includes(projectSearch.toLowerCase()));
  }, [projects, projectSearch]);

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: "", client: "" },
  });

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
  });

  const milestoneForm = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: { name: "", projectId: "" },
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'Task') {
        setActiveTask(active.data.current.task as Task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTaskData = active.data.current!.task as Task;
    const oldStatus = activeTaskData.status;

    const targetStatus = over.data.current?.type === 'Column'
      ? over.data.current.status as Task['status']
      : (over.data.current?.task as Task)?.status;

    if (!targetStatus) return;
    
    if (oldStatus === targetStatus) {
      if (over.data.current?.type !== 'Task') return;
      setTasks((tasks) => {
        const oldIndex = tasks.findIndex((t) => t.id === activeId);
        const newIndex = tasks.findIndex((t) => t.id === overId);
        return arrayMove(tasks, oldIndex, newIndex);
      });
    } else {
      setTasks((tasks) =>
        tasks.map((task) =>
          task.id === activeId ? { ...task, status: targetStatus } : task
        )
      );
      try {
        await updateTask(activeId.toString(), { status: targetStatus });
        toast({ title: "Task Status Updated", description: `Task "${activeTaskData.name}" moved to ${targetStatus}.` });
      } catch (error) {
         setTasks((tasks) => tasks.map((task) => task.id === activeId ? { ...task, status: oldStatus } : task));
         toast({ variant: 'destructive', title: "Update Failed", description: "Could not update task status."});
      }
    }
  };

  const tasksByStatus = useMemo(() => {
    const filteredTasks = selectedProjectId === 'all'
        ? tasks
        : tasks.filter(t => t.projectId === selectedProjectId);
        
    return taskStatuses.reduce((acc, status) => {
        acc[status] = filteredTasks.filter(t => t.status === status);
        return acc;
    }, {} as Record<Task['status'], Task[]>);
  }, [tasks, selectedProjectId]);

  const onProjectSubmit = async (values: ProjectFormValues) => {
    const newProjectData: Omit<Project, 'id'> = {
        name: values.name,
        client: values.client,
        dueDate: format(values.dueDate, "yyyy-MM-dd"),
        status: "Not Started",
    };
    const newId = await addProject(newProjectData);
    setProjects(prev => [{ id: newId, ...newProjectData }, ...prev]);
    toast({ title: "Project Created", description: `Project "${values.name}" has been created.` });
    setIsProjectDialogOpen(false);
    projectForm.reset();
  }

  const handleOpenTaskDialog = (task: Task | null = null) => {
    setEditingTask(task);
    if (task) {
      taskForm.reset({
        ...task,
        dueDate: new Date(task.dueDate),
      });
    } else {
      taskForm.reset({
        name: "",
        projectId: selectedProjectId !== 'all' ? selectedProjectId : "",
        assignee: "",
        dueDate: new Date(),
      });
    }
    setIsTaskDialogOpen(true);
  };

  const onTaskSubmit = async (values: TaskFormValues) => {
    const project = projects.find(p => p.id === values.projectId);
    if (!project) return;
    
    if (editingTask) {
      const updatedTaskData: Partial<Task> = {
        ...values,
        projectName: project.name,
        dueDate: format(values.dueDate, "yyyy-MM-dd"),
      };
      await updateTask(editingTask.id, updatedTaskData);
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...updatedTaskData } : t));
      toast({ title: "Task Updated" });
    } else {
      const newTaskData: Omit<Task, 'id'> = {
          name: values.name,
          projectId: values.projectId,
          projectName: project.name,
          assignee: values.assignee,
          dueDate: format(values.dueDate, "yyyy-MM-dd"),
          status: "To Do",
      };
      const newId = await addTask(newTaskData);
      setTasks(prev => [{id: newId, ...newTaskData }, ...prev]);
      toast({ title: "Task Created", description: `Task "${newTaskData.name}" has been created.` });
    }
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  };
  
  const onMilestoneSubmit = async (values: MilestoneFormValues) => {
    const project = projects.find(p => p.id === values.projectId);
    if (!project) return;
    const newMilestoneData: Omit<Milestone, 'id'> = {
        name: values.name,
        projectId: values.projectId,
        projectName: project.name,
        dueDate: format(values.dueDate, "yyyy-MM-dd"),
        status: "Upcoming",
    };
    const newId = await addMilestone(newMilestoneData);
    setMilestones(prev => [{ id: newId, ...newMilestoneData }, ...prev]);
    toast({ title: "Milestone Created", description: `Milestone "${newMilestoneData.name}" has been created.` });
    setIsMilestoneDialogOpen(false);
    milestoneForm.reset({ name: "", projectId: "" });
  };

  const handleStatusChange = async (id: string, type: 'project' | 'task' | 'milestone', status: string) => {
      if (type === 'project') {
          await updateProject(id, { status: status as Project['status'] });
          setProjects(p => p.map(i => i.id === id ? { ...i, status: status as Project['status'] } : i));
      }
      if (type === 'task') {
          await updateTask(id, { status: status as Task['status'] });
          setTasks(t => t.map(i => i.id === id ? { ...i, status: status as Task['status'] } : i));
      }
      if (type === 'milestone') {
          await updateMilestone(id, { status: status as Milestone['status'] });
          setMilestones(m => m.map(i => i.id === id ? { ...i, status: status as Milestone['status'] } : i));
      }
      toast({ title: "Status Updated", description: `The status has been updated to ${status}.` });
  };
  
  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'project') {
        await deleteProject(itemToDelete.id);
        setProjects(p => p.filter(i => i.id !== itemToDelete.id));
    }
    if (itemToDelete.type === 'task') {
        await deleteTask(itemToDelete.id);
        setTasks(t => t.filter(i => i.id !== itemToDelete.id));
    }
    if (itemToDelete.type === 'milestone') {
        await deleteMilestone(itemToDelete.id);
        setMilestones(m => m.filter(i => i.id !== itemToDelete.id));
    }
    toast({ title: "Item Deleted", description: "The selected item has been successfully deleted." });
    setIsAlertOpen(false);
    setItemToDelete(null);
  }
  
  const openDeleteDialog = (id: string, type: 'project' | 'task' | 'milestone') => {
      setItemToDelete({ id, type });
      setIsAlertOpen(true);
  }

  const handleExport = (format: "csv" | "pdf" | "xlsx") => {
    const headers = ["ID", "Project Name", "Client", "Due Date", "Status"];
    const body = filteredProjects.map(p => [p.id, p.name, p.client, p.dueDate, p.status]);
    const filename = "projects_export";

    toast({ title: `Exporting Projects`, description: `Your data is being exported as a ${format.toUpperCase()} file.` });

    if (format === 'csv') {
      const csvContent = [headers.join(','), ...body.map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.text("Projects Report", 14, 16);
      autoTable(doc, { head: [headers], body: body as any, startY: 20 });
      doc.save(`${filename}.pdf`);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
      XLSX.utils.writeFile(workbook, `${filename}.xlsx`);
    }
  };
  
  const handleImport = () => {
      toast({ title: "Importing Projects", description: "This feature is coming soon." });
  }

  return (
    <div>
      <PageHeader
        title="Project Management"
        description="Manage projects, tasks, milestones, and track progress with Gantt charts."
        breadcrumbs={[{ href: "/dashboard", label: "Dashboard" }, { label: "Projects" }]}
      />

       <Tabs defaultValue="tasks">
        <TabsList className="mb-4 grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks Kanban</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
            <Card>
                <CardHeader className="flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                    <div>
                        <CardTitle>All Projects</CardTitle>
                        <CardDescription>An overview of all your current and past projects.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleImport}>
                          <Upload className="mr-2 h-4 w-4" /> Import
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExport('csv')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as CSV</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as XLSX</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" /> Export as PDF</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Project</Button></DialogTrigger>
                            <DialogContent className="sm:max-w-[480px]">
                                <DialogHeader><DialogTitle>Create New Project</DialogTitle><DialogDescription>Fill in the details for your new project.</DialogDescription></DialogHeader>
                                <Form {...projectForm}>
                                    <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="space-y-6">
                                        <FormField control={projectForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Project Name</FormLabel><FormControl><Input placeholder="e.g., New Website for Acme Inc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={projectForm.control} name="client" render={({ field }) => (<FormItem><FormLabel>Client</FormLabel><FormControl><Input placeholder="e.g., Acme Inc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={projectForm.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                        <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsProjectDialogOpen(false)}>Cancel</Button><Button type="submit">Create Project</Button></DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search projects..." className="pl-9" value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} /></div>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-background">
                        <Table>
                        <TableHeader><TableRow><TableHead>Project ID</TableHead><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Client</TableHead><TableHead className="hidden md:table-cell">Due Date</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 4}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8" /></TableCell></TableRow>
                            )) :
                            filteredProjects.map((project) => (
                            <TableRow key={project.id}>
                                <TableCell className="font-medium">{project.id}</TableCell>
                                <TableCell>{project.name}</TableCell>
                                <TableCell className="hidden md:table-cell">{project.client}</TableCell>
                                <TableCell className="hidden md:table-cell">{project.dueDate}</TableCell>
                                <TableCell><Badge className={cn(project.status === "Completed" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", project.status === "In Progress" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", project.status === "On Hold" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", project.status === "Not Started" && "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300")}>{project.status}</Badge></TableCell>
                                <TableCell>
                                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuSub><DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent>{projectStatuses.map(status => (<DropdownMenuItem key={status} onClick={() => handleStatusChange(project.id, 'project', status)}>{status}</DropdownMenuItem>))}</DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub>
                                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(project.id, 'project')}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="tasks">
            <div className="flex justify-between items-center mb-4">
                 <div className="w-full max-w-sm">
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by project..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => handleOpenTaskDialog(null)}><Plus className="mr-2 h-4 w-4" />Add Task</Button>
            </div>
            {isLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {taskStatuses.map(status => (
                        <div key={status} className="bg-muted/50 rounded-lg p-3 flex-shrink-0 w-full md:w-[300px]">
                            <Skeleton className="h-6 w-1/2 mb-4" />
                            <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
                        </div>
                    ))}
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {taskStatuses.map((status) => (
                            <KanbanColumn key={status} status={status} tasks={tasksByStatus[status]} onEdit={handleOpenTaskDialog} onDelete={(task) => openDeleteDialog(task.id, 'task')} />
                        ))}
                    </div>
                    <DragOverlay>
                        {activeTask ? <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} /> : null}
                    </DragOverlay>
                </DndContext>
            )}
        </TabsContent>

        <TabsContent value="milestones">
            <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
                <Card>
                    <CardHeader className="flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                        <div><CardTitle>Project Milestones</CardTitle><CardDescription>Key checkpoints and deliverables for your projects.</CardDescription></div>
                        <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Milestone</Button></DialogTrigger>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-48" /> : (
                            <div className="relative pl-6 after:absolute after:inset-y-0 after:w-px after:bg-border after:left-0">
                                <div className="grid gap-10">
                                    {milestones.map((milestone) => (
                                        <div key={milestone.id} className="grid items-start grid-cols-[auto_1fr] gap-x-4 relative">
                                            <div className="flex items-center gap-x-4">
                                                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary"><Award className="h-4 w-4 text-primary" /></div>
                                            </div>
                                            <div className="pt-1.5">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold">{milestone.name}</p>
                                                    <Badge className={cn(milestone.status === "Completed" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", milestone.status === "Upcoming" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", milestone.status === "Delayed" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300")}>{milestone.status}</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">Due: {milestone.dueDate}</p>
                                                <p className="text-sm text-muted-foreground">Project: {milestone.projectName}</p>
                                            </div>
                                            <div className="absolute top-0 right-0">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuSub><DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent>{milestoneStatuses.map(status => (<DropdownMenuItem key={status} onClick={() => handleStatusChange(milestone.id, 'milestone', status)}>{status}</DropdownMenuItem>))}</DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(milestone.id, 'milestone')}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader><DialogTitle>Create New Milestone</DialogTitle><DialogDescription>Fill in the details for the new project milestone.</DialogDescription></DialogHeader>
                    <Form {...milestoneForm}>
                        <form onSubmit={milestoneForm.handleSubmit(onMilestoneSubmit)} className="space-y-6">
                            <FormField control={milestoneForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Milestone Name</FormLabel><FormControl><Input placeholder="e.g., Phase 1: Discovery & Planning" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={milestoneForm.control} name="projectId" render={({ field }) => (<FormItem><FormLabel>Project</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger></FormControl><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={milestoneForm.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                            <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsMilestoneDialogOpen(false)}>Cancel</Button><Button type="submit">Create Milestone</Button></DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </TabsContent>

        <TabsContent value="gantt">
            <PlaceholderContent 
                title="Gantt Chart"
                description="Visualize your project timelines, dependencies, and progress."
                icon={GanttChartSquare}
                actionText="Create New Chart"
            />
        </TabsContent>
      </Tabs>
      
       <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle><DialogDescription>Fill in the details for the task.</DialogDescription></DialogHeader>
                <Form {...taskForm}>
                    <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-6">
                        <FormField control={taskForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Task Name</FormLabel><FormControl><Input placeholder="e.g., Design homepage mockups" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={taskForm.control} name="projectId" render={({ field }) => (<FormItem><FormLabel>Project</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger></FormControl><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={taskForm.control} name="assignee" render={({ field }) => (<FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an assignee" /></SelectTrigger></FormControl><SelectContent>{assignees.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={taskForm.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button><Button type="submit">{editingTask ? "Save Changes" : "Create Task"}</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the selected item.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

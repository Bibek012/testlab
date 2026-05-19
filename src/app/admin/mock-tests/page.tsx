"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  UploadCloud,
  Clock,
  LayoutGrid,
  List,
  Copy,
  Loader2,
} from "lucide-react";

import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const MOCK_TYPES = [
  "Full Test",
  "Subject Test",
  "Chapter Test",
  "Previous Year",
  "Daily Quiz",
  "Mini Mock",
];

export default function MockTestManagementPage() {
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const examsQuery = useMemoFirebase(
    () =>
      db
        ? query(
          collection(db, "exams"),
          orderBy("name", "asc")
        )
        : null,
    [db]
  );

  const { data: exams } = useCollection<any>(examsQuery);

  const mockTestsQuery = useMemoFirebase(
    () =>
      db
        ? query(
          collection(db, "mockTests"),
          orderBy("createdAt", "desc")
        )
        : null,
    [db]
  );

  const {
    data: mockTests,
    loading: mocksLoading,
  } = useCollection<any>(mockTestsQuery);

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [activeTab, setActiveTab] = useState<"all" | "Draft" | "Published">("all");

  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    examId: "all",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<any>(null);

  const filteredMocks = useMemo(() => {
    if (!mockTests) return [];

    return mockTests.filter((mock: any) => {
      const matchesSearch =
        mock.title
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === "all" ||
        mock.status === activeTab;

      const matchesExam =
        filters.examId === "all" ||
        mock.examId === filters.examId;

      return (
        matchesSearch &&
        matchesTab &&
        matchesExam
      );
    });
  }, [
    mockTests,
    searchQuery,
    activeTab,
    filters,
  ]);

  const handleDeleteMock = async (
    id: string,
    title: string
  ) => {
    console.log("DELETE START");
    try {
      if (!db) {
        toast({
          variant: "destructive",
          title: "Database Error",
          description: "Firestore not initialized",
        });
        return;
      }

      if (!id) {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: "Mock ID missing",
        });
        return;
      }

      setDeletingId(id);
      const mockRef = doc(db, "mockTests", id);
      await deleteDoc(mockRef);

      toast({
        title: "Deleted Successfully",
        description: `"${title}" deleted successfully`,
      });

    } catch (error: any) {
      console.error("DELETE ERROR:", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error?.message || "Unknown error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicateMock = async (
    mock: any
  ) => {
    try {
      if (!db) return;

      const { id, ...data } = mock;

      await addDoc(
        collection(db, "mockTests"),
        {
          ...data,
          title: `${data.title} (Copy)`,
          slug: `${data.slug}-copy`,
          status: "Draft",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      toast({
        title: "Duplicated",
        description:
          "Mock test duplicated successfully",
      });
    } catch (error: any) {
      console.error(error);

      toast({
        variant: "destructive",
        title: "Duplicate Failed",
        description:
          error?.message ||
          "Failed to duplicate",
      });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">
            Mock Tests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all mock tests
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/upload-json">
            <Button variant="outline">
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </Link>

          <Button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-4 items-center">
        <Tabs
          value={activeTab}
          onValueChange={(v: any) =>
            setActiveTab(v)
          }
        >
          <TabsList>
            <TabsTrigger value="all">
              All
            </TabsTrigger>
            <TabsTrigger value="Draft">
              Draft
            </TabsTrigger>
            <TabsTrigger value="Published">
              Published
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search mock..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
          />
        </div>

        <Select
          value={filters.examId}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              examId: v,
            }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Exams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              All Exams
            </SelectItem>
            {exams?.map((exam: any) => (
              <SelectItem
                key={exam.id}
                value={exam.id}
              >
                {exam.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button
            variant={
              viewMode === "table"
                ? "default"
                : "outline"
            }
            size="icon"
            onClick={() =>
              setViewMode("table")
            }
          >
            <List className="w-4 h-4" />
          </Button>

          <Button
            variant={
              viewMode === "grid"
                ? "default"
                : "outline"
            }
            size="icon"
            onClick={() =>
              setViewMode("grid")
            }
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* LOADING */}
      {mocksLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
      ) : viewMode === "table" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">
                    Title
                  </th>
                  <th className="text-left p-4">
                    Type
                  </th>
                  <th className="text-left p-4">
                    Status
                  </th>
                  <th className="text-right p-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredMocks.map(
                  (mock: any) => (
                    <tr
                      key={mock.id}
                      className="border-b"
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-bold">
                            {mock.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {
                              exams?.find(
                                (e: any) =>
                                  e.id ===
                                  mock.examId
                              )?.name
                            }
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <Badge variant="outline">
                          {mock.type}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <Badge>
                          {mock.status}
                        </Badge>
                      </td>

                      <td className="p-4 text-right">
                        {deletingId ===
                          mock.id ? (
                          <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingItem(
                                    mock
                                  );
                                  setIsModalOpen(
                                    true
                                  );
                                }}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  handleDuplicateMock(
                                    mock
                                  )
                                }
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/admin/upload-json?mockId=${mock.id}`
                                  )
                                }
                              >
                                <UploadCloud className="w-4 h-4 mr-2" />
                                Upload Questions
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                asChild
                              >
                                <button
                                  className="w-full flex items-center px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("DELETE BUTTON CLICKED");
                                    handleDeleteMock(
                                      mock.id,
                                      mock.title
                                    );
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Mock
                                </button>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  )
                )}

                {filteredMocks.length ===
                  0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-10 text-center text-muted-foreground"
                      >
                        No mock tests found
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMocks.map(
            (mock: any) => (
              <Card
                key={mock.id}
                className="p-6 flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <Badge variant="outline">
                    {mock.type}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingItem(
                            mock
                          );
                          setIsModalOpen(
                            true
                          );
                        }}
                      >
                        Edit
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/admin/upload-json?mockId=${mock.id}`
                          )
                        }
                      >
                        Upload Questions
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        asChild
                      >
                        <button
                          className="w-full flex items-center px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10"
                          onClick={() =>
                            handleDeleteMock(
                              mock.id,
                              mock.title
                            )
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div>
                  <h2 className="font-bold text-lg">
                    {mock.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {
                      exams?.find(
                        (e: any) =>
                          e.id ===
                          mock.examId
                      )?.name
                    }
                  </p>
                </div>

                <div className="flex justify-between text-sm">
                  <div>
                    <div className="font-bold">
                      {
                        mock.totalQuestions
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Questions
                    </div>
                  </div>

                  <div>
                    <div className="font-bold">
                      {
                        mock.durationMinutes
                      }
                      m
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Duration
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-auto">
                  <Badge>
                    {mock.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(
                        `/admin/upload-json?mockId=${mock.id}`
                      )
                    }
                  >
                    Add Questions
                  </Button>
                </div>
              </Card>
            )
          )}
        </div>
      )}

      <MockTestModal
        isOpen={isModalOpen}
        onClose={() =>
          setIsModalOpen(false)
        }
        editingItem={editingItem}
        exams={exams || []}
      />
    </div>
  );
}

function MockTestModal({
  isOpen,
  onClose,
  editingItem,
  exams,
}: any) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    title: "",
    slug: "",
    examId: "",
    type: "Full Test",
    durationMinutes: 90,
    totalQuestions: 100,
    totalMarks: 100,
    negativeMarks: 0.33,
    isFree: true,
    status: "Draft",
  });

  React.useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        title: "",
        slug: "",
        examId: "",
        type: "Full Test",
        durationMinutes: 90,
        totalQuestions: 100,
        totalMarks: 100,
        negativeMarks: 0.33,
        isFree: true,
        status: "Draft",
      });
    }
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    try {
      if (
        !db ||
        !formData.title ||
        !formData.examId
      ) {
        return;
      }

      setIsSaving(true);
      const selectedExam = exams.find((e: any) => e.id === formData.examId);

      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
        categoryId: selectedExam?.categoryId || "",
        categorySlug: selectedExam?.categorySlug || "",
        examSlug: selectedExam?.slug || "",
        slug:
          formData.slug ||
          formData.title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
      };

      if (editingItem) {
        await updateDoc(doc(db, "mockTests", editingItem.id), data);
        toast({
          title: "Updated",
          description: "Mock test updated successfully",
        });
      } else {
        await addDoc(collection(db, "mockTests"), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast({
          title: "Created",
          description: "Mock test created successfully",
        });
      }

      onClose();
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error?.message || "Failed to save",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem
              ? "Edit Mock Test"
              : "Create Mock Test"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="md:col-span-2">
            <Label>
              Mock Test Title
            </Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label>Exam</Label>
            <Select
              value={formData.examId}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  examId: v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam: any) => (
                    <SelectItem
                      key={exam.id}
                      value={exam.id}
                    >
                      {exam.name}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mock Type</Label>
            <Select
              value={formData.type}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  type: v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOCK_TYPES.map((type) => (
                    <SelectItem
                      key={type}
                      value={type}
                    >
                      {type}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              Duration (Minutes)
            </Label>
            <Input
              type="number"
              value={formData.durationMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  durationMinutes: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>

          <div>
            <Label>
              Total Questions
            </Label>
            <Input
              type="number"
              value={formData.totalQuestions}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalQuestions: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between border rounded-lg p-4">
            <div>
              <Label>
                Free Accessibility
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow free users to attempt this test
              </p>
            </div>
            <Switch
              checked={formData.isFree}
              onCheckedChange={(value) =>
                setFormData({
                  ...formData,
                  isFree: value,
                })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Mock Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

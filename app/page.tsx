"use client";

import { useState, useEffect, type DragEvent } from "react";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Settings,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FieldDescription {
  key: string;
  type: string;
  description: string;
}

interface Endpoint {
  id: string;
  name: string;
  path: string;
  method: string;
  responses: { [statusCode: number]: string };
  group: string;
  description?: string;
  projectId: string;
  fieldDescriptions?: { [statusCode: number]: FieldDescription[] };
  requestBody?: string;
  queryParams?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface Group {
  id: string;
  name: string;
  project_id: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allEndpoints, setAllEndpoints] = useState<Endpoint[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(
    null
  );
  const [selectedStatus, setSelectedStatus] = useState<number>(200);
  const [newEndpoint, setNewEndpoint] = useState({
    name: "",
    path: "",
    method: "GET",
    group: "General",
    description: "",
  });
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditResponse, setShowEditResponse] = useState(false);
  const [showEditRequestBody, setShowEditRequestBody] = useState(false);
  const [showEditQueryParams, setShowEditQueryParams] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [view, setView] = useState<"projects" | "endpoints">("projects");
  const [editingResponse, setEditingResponse] = useState("");
  const [editingRequestBody, setEditingRequestBody] = useState("");

  const [editingQueryParamRows, setEditingQueryParamRows] = useState<
    { key: string; value: string; description: string }[]
  >([]);
  const [showFieldDescriptions, setShowFieldDescriptions] = useState(false);
  const [editingFieldDescriptions, setEditingFieldDescriptions] = useState<
    FieldDescription[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupExpanded, setGroupExpanded] = useState<{
    [key: string]: boolean;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showEditPath, setShowEditPath] = useState(false);
  const [editingPath, setEditingPath] = useState("");
  const [editingMethod, setEditingMethod] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [showEditNameDescription, setShowEditNameDescription] = useState(false);
  const [showEditGroupName, setShowEditGroupName] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState("");
  // Default base path for new endpoints (editable in header)
  const [defaultPathPrefix, setDefaultPathPrefix] = useState("api/v1/");
  // DnD state
  const [draggingEndpointId, setDraggingEndpointId] = useState<string | null>(
    null
  );
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  // Inline Add Group (in Add Endpoint modal)
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const supabase = createClient();

  // Persist default path prefix in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("defaultPathPrefix");
      if (saved) setDefaultPathPrefix(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("defaultPathPrefix", defaultPathPrefix);
    } catch {}
  }, [defaultPathPrefix]);

  const toggleGroup = (groupName: string) => {
    setGroupExpanded((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Delete a group (and all its endpoints via cascade)
  const deleteGroup = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) {
      alert("Group not found");
      return;
    }
    const affectedCount = endpoints.filter(
      (e) => e.group === group.name
    ).length;
    const ok = confirm(
      `Delete group "${group.name}"? This will permanently delete ${affectedCount} endpoint(s) in this group.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);
      if (error) throw error;

      // Update local state
      const newGroups = groups.filter((g) => g.id !== groupId);
      setGroups(newGroups);

      const newEndpoints = endpoints.filter((e) => e.group !== group.name);
      setEndpoints(newEndpoints);

      if (selectedEndpoint && selectedEndpoint.group === group.name) {
        setSelectedEndpoint(newEndpoints[0] || null);
      }

      setShowEditGroupName(false);
      // Refresh aggregate counts
      loadAllData();
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("เกิดข้อผิดพลาดในการลบกลุ่ม");
    } finally {
      setLoading(false);
    }
  };

  // Move an endpoint to another group via drag-and-drop
  const moveEndpointToGroup = async (
    endpointId: string,
    targetGroupName: string
  ) => {
    try {
      const endpoint = endpoints.find((e) => e.id === endpointId);
      if (!endpoint) return;

      if (endpoint.group === targetGroupName) return; // No change

      const targetGroup = groups.find((g) => g.name === targetGroupName);
      if (!targetGroup) {
        alert("Target group not found");
        return;
      }

      setLoading(true);
      const { error } = await supabase
        .from("endpoints")
        .update({ group_id: targetGroup.id })
        .eq("id", endpointId);

      if (error) throw error;

      // Update local state
      const updated = endpoints.map((e) =>
        e.id === endpointId ? { ...e, group: targetGroup.name } : e
      );
      setEndpoints(updated);
      if (selectedEndpoint?.id === endpointId) {
        setSelectedEndpoint({ ...selectedEndpoint, group: targetGroup.name });
      }
    } catch (err) {
      console.error("Error moving endpoint:", err);
      alert("เกิดข้อผิดพลาดในการย้าย endpoint ไปยังกลุ่มใหม่");
    } finally {
      setLoading(false);
    }
  };

  // Create a new group inline from Add Endpoint modal
  const createGroupInline = async () => {
    if (!currentProject) {
      alert("กรุณาเลือกโปรเจคก่อน");
      return;
    }
    const name = newGroupName.trim();
    if (!name) {
      alert("กรุณากรอกชื่อกลุ่ม");
      return;
    }
    // If exists, just select it
    const exists = groups.some(
      (g) => g.project_id === currentProject.id && g.name === name
    );
    if (exists) {
      setNewEndpoint((prev) => ({ ...prev, group: name }));
      setShowCreateGroup(false);
      setNewGroupName("");
      return;
    }
    setAddingGroup(true);
    try {
      const { data, error } = await supabase
        .from("groups")
        .insert([{ name, project_id: currentProject.id }])
        .select("*")
        .single();
      if (error) throw error;
      setGroups([...groups, data]);
      setNewEndpoint((prev) => ({ ...prev, group: data.name }));
      setShowCreateGroup(false);
      setNewGroupName("");
    } catch (err) {
      console.error("Error creating group inline:", err);
      alert("เกิดข้อผิดพลาดในการสร้างกลุ่ม");
    } finally {
      setAddingGroup(false);
    }
  };

  const handleDragStart = (endpointId: string) => {
    setDraggingEndpointId(endpointId);
  };

  const handleDragEnd = () => {
    setDraggingEndpointId(null);
    setDragOverGroup(null);
  };

  const handleGroupDragOver = (e: DragEvent, groupName: string) => {
    e.preventDefault(); // Allow drop
    setDragOverGroup(groupName);
  };

  const handleGroupDrop = async (e: DragEvent, groupName: string) => {
    e.preventDefault();
    const endpointId = draggingEndpointId;
    setDragOverGroup(null);
    setDraggingEndpointId(null);
    if (!endpointId) return;
    await moveEndpointToGroup(endpointId, groupName);
  };

  useEffect(() => {
    loadProjects();
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadEndpoints(currentProject.id);
      loadGroups(currentProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setProjects(data);
        setCurrentProject(data[0]);
      } else {
        // Create default project if none exist
        const defaultProject = {
          name: "Default Project",
          description: "Default mock API project",
        };
        const { data: newProject, error: createError } = await supabase
          .from("projects")
          .insert([defaultProject])
          .select()
          .single();

        if (createError) throw createError;
        setProjects([newProject]);
        setCurrentProject(newProject);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
      alert("เกิดข้อผิดพลาดในการโหลดโปรเจค");
    } finally {
      setLoading(false);
    }
  };

  const loadEndpoints = async (projectId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("endpoints")
        .select(
          `
          *,
          groups!inner (
            id,
            name,
            project_id
          )
        `
        )
        .eq("groups.project_id", projectId);

      if (error) throw error;

      const formattedEndpoints =
        data?.map((endpoint) => ({
          ...endpoint,
          group: endpoint.groups?.name || "General",
          responses: endpoint.responses || {},
          fieldDescriptions: endpoint.field_descriptions || {},
          requestBody:
            endpoint.request_body === null || typeof endpoint.request_body === "undefined"
              ? ""
              : typeof endpoint.request_body === "string"
              ? endpoint.request_body
              : JSON.stringify(endpoint.request_body, null, 2),
          queryParams: endpoint.query_params
            ? JSON.stringify(endpoint.query_params, null, 2)
            : "",
        })) || [];

      setEndpoints(formattedEndpoints);
      if (formattedEndpoints.length > 0) {
        setSelectedEndpoint(formattedEndpoints[0]);
      } else {
        setSelectedEndpoint(null);
      }
    } catch (error) {
      console.error("Error loading endpoints:", error);
      alert("เกิดข้อผิดพลาดในการโหลด endpoints");
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async (projectId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;

      setGroups(data || []);
    } catch (error) {
      console.error("Error loading groups:", error);
      alert("เกิดข้อผิดพลาดในการโหลดกลุ่ม");
    } finally {
      setLoading(false);
    }
  };

  const addProject = async () => {
    if (!newProject.name) {
      alert("กรุณากรอกชื่อ Project");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            name: newProject.name,
            description: newProject.description,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setProjects([...projects, data]);
      setCurrentProject(data);
      setNewProject({ name: "", description: "" });
      setShowProjectForm(false);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("เกิดข้อผิดพลาดในการสร้างโปรเจค");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (projects.length <= 1) {
      alert("ต้องมี Project อย่างน้อย 1 อัน");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;

      const newProjects = projects.filter((p) => p.id !== id);
      setProjects(newProjects);

      if (currentProject?.id === id) {
        setCurrentProject(newProjects[0] || null);
        setSelectedEndpoint(null);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("เกิดข้อผิดพลาดในการลบโปรเจค");
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      // Load all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*");
      if (groupsError) throw groupsError;
      setAllGroups(groupsData || []);

      // Load all endpoints with groups
      const { data: endpointsData, error: endpointsError } =
        await supabase.from("endpoints").select(`
          *,
          groups (
            id,
            name,
            project_id
          )
        `);
      if (endpointsError) throw endpointsError;

      const formattedEndpoints =
        endpointsData?.map((endpoint) => ({
          ...endpoint,
          group: endpoint.groups?.name || "General",
          responses: endpoint.responses || {},
          fieldDescriptions: endpoint.field_descriptions || {},
          requestBody:
            endpoint.request_body === null || typeof endpoint.request_body === "undefined"
              ? ""
              : typeof endpoint.request_body === "string"
              ? endpoint.request_body
              : JSON.stringify(endpoint.request_body, null, 2),
          queryParams: endpoint.query_params
            ? JSON.stringify(endpoint.query_params, null, 2)
            : "",
        })) || [];

      setAllEndpoints(formattedEndpoints);
    } catch (error) {
      console.error("Error loading all data:", error);
    }
  };

  const addEndpoint = async () => {
    console.log("[v0] Starting addEndpoint with:", {
      newEndpoint,
      currentProject,
    });

    if (!newEndpoint.path || !currentProject) {
      alert("กรุณากรอก Path และเลือก Project");
      return;
    }

    setLoading(true);
    try {
      console.log("[v0] Finding or creating group:", newEndpoint.group);

      // First, find or create the group
      let groupId: string;
      const { data: existingGroup, error: groupFindError } = await supabase
        .from("groups")
        .select("id")
        .eq("name", newEndpoint.group)
        .eq("project_id", currentProject.id)
        .single();

      console.log("[v0] Group search result:", {
        existingGroup,
        groupFindError,
      });

      if (existingGroup) {
        groupId = existingGroup.id;
        console.log("[v0] Using existing group:", groupId);
      } else {
        console.log("[v0] Creating new group");
        const { data: newGroup, error: groupError } = await supabase
          .from("groups")
          .insert([
            {
              name: newEndpoint.group,
              project_id: currentProject.id,
            },
          ])
          .select()
          .single();

        console.log("[v0] New group creation result:", {
          newGroup,
          groupError,
        });
        if (groupError) throw groupError;
        groupId = newGroup.id;
      }

      const defaultResponses =
        newEndpoint.method === "POST" || newEndpoint.method === "PUT"
          ? {
              201: JSON.stringify({ message: "Created successfully" }, null, 2),
              400: JSON.stringify({ error: "Bad request" }, null, 2),
              401: JSON.stringify({ error: "Unauthorized" }, null, 2),
              403: JSON.stringify({ error: "Forbidden" }, null, 2),
              404: JSON.stringify({ error: "Not found" }, null, 2),
              500: JSON.stringify({ error: "Internal server error" }, null, 2),
            }
          : {
              200: JSON.stringify({ message: "Success" }, null, 2),
              400: JSON.stringify({ error: "Bad request" }, null, 2),
              401: JSON.stringify({ error: "Unauthorized" }, null, 2),
              403: JSON.stringify({ error: "Forbidden" }, null, 2),
              404: JSON.stringify({ error: "Not found" }, null, 2),
              500: JSON.stringify({ error: "Internal server error" }, null, 2),
            };

      // Default request payloads
      const defaultRequestBody =
        newEndpoint.method === "POST" || newEndpoint.method === "PUT" ? "" : "";
      const defaultQueryParams =
        newEndpoint.method === "GET" ? { page: 1, q: "" } : {};

      console.log("[v0] Creating endpoint with data:", {
        name: newEndpoint.name || newEndpoint.description || newEndpoint.path,
        description: newEndpoint.description,
        path: newEndpoint.path.startsWith("/")
          ? newEndpoint.path
          : `/${newEndpoint.path}`,
        method: newEndpoint.method,
        group_id: groupId,
        responses: defaultResponses,
        field_descriptions: {},
      });

      const { data, error } = await supabase
        .from("endpoints")
        .insert([
          {
            name:
              newEndpoint.name || newEndpoint.description || newEndpoint.path,
            description: newEndpoint.description,
            path: newEndpoint.path.startsWith("/")
              ? newEndpoint.path
              : `/${newEndpoint.path}`,
            method: newEndpoint.method,
            group_id: groupId,
            responses: defaultResponses,
            field_descriptions: {},
            request_body: defaultRequestBody,
            query_params: defaultQueryParams,
          },
        ])
        .select(
          `
          *,
          groups (
            id,
            name
          )
        `
        )
        .single();

      console.log("[v0] Endpoint creation result:", { data, error });
      if (error) throw error;

      const formattedEndpoint = {
        ...data,
        group: data.groups?.name || "General",
        responses: data.responses || {},
        fieldDescriptions: data.field_descriptions || {},
        requestBody:
          data.request_body === null || typeof data.request_body === "undefined"
            ? ""
            : typeof data.request_body === "string"
            ? data.request_body
            : JSON.stringify(data.request_body, null, 2),
        queryParams: data.query_params
          ? JSON.stringify(data.query_params, null, 2)
          : "",
      };

      console.log("[v0] Formatted endpoint:", formattedEndpoint);

      setEndpoints([...endpoints, formattedEndpoint]);
      setSelectedEndpoint(formattedEndpoint);
      setNewEndpoint({
        name: "",
        path: "",
        method: "GET",
        group: "General",
        description: "",
      });
      setShowAddForm(false);

      loadAllData();

      console.log("[v0] Endpoint added successfully");
    } catch (error) {
      console.error("[v0] Error creating endpoint:", error);
      let message = "Unknown error";
      if (error instanceof Error) {
        message = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error
      ) {
        // @ts-expect-error - error object may have message property
        message = error.message;
      } else if (typeof error === "string") {
        message = error;
      }
      alert(`เกิดข้อผิดพลาดในการสร้าง endpoint: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteEndpoint = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("endpoints").delete().eq("id", id);

      if (error) throw error;

      const newEndpoints = endpoints.filter((ep) => ep.id !== id);
      setEndpoints(newEndpoints);
      if (selectedEndpoint?.id === id) {
        setSelectedEndpoint(newEndpoints[0] || null);
      }
    } catch (error) {
      console.error("Error deleting endpoint:", error);
      alert("เกิดข้อผิดพลาดในการลบ endpoint");
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = async () => {
    if (!selectedEndpoint) return;

    let formatted: string;
    try {
      const parsed = JSON.parse(editingResponse);
      formatted = JSON.stringify(parsed, null, 2);
      // Keep editor in sync with the formatted JSON
      setEditingResponse(formatted);
    } catch {
      alert("Response ต้องเป็น JSON ที่ถูกต้อง");
      return;
    }

    setLoading(true);
    try {
      const updatedResponses = {
        ...selectedEndpoint.responses,
        [selectedStatus]: formatted,
      };

      const { error } = await supabase
        .from("endpoints")
        .update({ responses: updatedResponses })
        .eq("id", selectedEndpoint.id);

      if (error) throw error;

      const updatedEndpoints = endpoints.map((ep) =>
        ep.id === selectedEndpoint.id
          ? { ...ep, responses: updatedResponses }
          : ep
      );

      setEndpoints(updatedEndpoints);
      setSelectedEndpoint({
        ...selectedEndpoint,
        responses: updatedResponses,
      });
      setShowEditResponse(false);
    } catch (error) {
      console.error("Error updating response:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดต response");
    } finally {
      setLoading(false);
    }
  };

  const updateFieldDescriptions = async () => {
    if (!selectedEndpoint) return;

    setLoading(true);
    try {
      const updatedFieldDescriptions = {
        ...selectedEndpoint.fieldDescriptions,
        [selectedStatus]: editingFieldDescriptions,
      };

      const { error } = await supabase
        .from("endpoints")
        .update({ field_descriptions: updatedFieldDescriptions })
        .eq("id", selectedEndpoint.id);

      if (error) throw error;

      const updatedEndpoints = endpoints.map((ep) =>
        ep.id === selectedEndpoint.id
          ? { ...ep, fieldDescriptions: updatedFieldDescriptions }
          : ep
      );

      setEndpoints(updatedEndpoints);
      setSelectedEndpoint({
        ...selectedEndpoint,
        fieldDescriptions: updatedFieldDescriptions,
      });
      setShowFieldDescriptions(false);
    } catch (error) {
      console.error("Error updating field descriptions:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดต field descriptions");
    } finally {
      setLoading(false);
    }
  };

  const updateRequestBody = async () => {
    if (!selectedEndpoint) return;
    setLoading(true);
    try {
      const bodyText = editingRequestBody || "";
      const { error } = await supabase
        .from("endpoints")
        .update({ request_body: bodyText })
        .eq("id", selectedEndpoint.id);
      if (error) throw error;
      const updatedEndpoints = endpoints.map((ep) =>
        ep.id === selectedEndpoint.id ? { ...ep, requestBody: bodyText } : ep
      );
      setEndpoints(updatedEndpoints);
      setSelectedEndpoint({ ...selectedEndpoint, requestBody: bodyText });
      setShowEditRequestBody(false);
    } catch (error) {
      console.error("Error updating request body:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดต request body");
    } finally {
      setLoading(false);
    }
  };

  const updateQueryParams = async () => {
    if (!selectedEndpoint) return;

    // Validate rows: require non-empty unique keys
    const keys = new Set<string>();
    for (const r of editingQueryParamRows) {
      const k = r.key.trim();
      if (!k) {
        alert("กรุณากรอก Key ของแต่ละแถวให้ครบถ้วน");
        return;
      }
      if (keys.has(k)) {
        alert(`คีย์ซ้ำ: ${k}`);
        return;
      }
      keys.add(k);
    }

    const inferValue = (v: string): unknown => {
      const s = v.trim();
      if (s === "") return "";
      if (s === "true") return true;
      if (s === "false") return false;
      if (/^-?\d+(?:\.\d+)?$/.test(s)) return Number(s);
      if (
        (s.startsWith("{") && s.endsWith("}")) ||
        (s.startsWith("[") && s.endsWith("]"))
      ) {
        try {
          return JSON.parse(s);
        } catch {
          // fallthrough to string
        }
      }
      return v;
    };

    const payload: Record<string, { value: unknown; description: string }> = {};
    editingQueryParamRows.forEach((r) => {
      payload[r.key.trim()] = {
        value: inferValue(r.value),
        description: r.description || "",
      };
    });

    const formatted = JSON.stringify(payload, null, 2);

    setLoading(true);
    try {
      const { error } = await supabase
        .from("endpoints")
        .update({ query_params: payload })
        .eq("id", selectedEndpoint.id);
      if (error) throw error;
      const updatedEndpoints = endpoints.map((ep) =>
        ep.id === selectedEndpoint.id ? { ...ep, queryParams: formatted } : ep
      );
      setEndpoints(updatedEndpoints);
      setSelectedEndpoint({ ...selectedEndpoint, queryParams: formatted });
      setShowEditQueryParams(false);
    } catch (error) {
      console.error("Error updating query params:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดต query params");
    } finally {
      setLoading(false);
    }
  };

  const updatePath = async () => {
    if (!selectedEndpoint) return;

    setLoading(true);
    try {
      const formattedPath = editingPath.startsWith("/")
        ? editingPath
        : `/${editingPath}`;

      const { error } = await supabase
        .from("endpoints")
        .update({
          name: editingName,
          description: editingDescription,
          path: formattedPath,
          method: editingMethod,
        })
        .eq("id", selectedEndpoint.id);

      if (error) throw error;

      const updatedEndpoints = endpoints.map((ep) =>
        ep.id === selectedEndpoint.id
          ? {
              ...ep,
              name: editingName,
              description: editingDescription,
              path: formattedPath,
              method: editingMethod,
            }
          : ep
      );

      setEndpoints(updatedEndpoints);
      setSelectedEndpoint({
        ...selectedEndpoint,
        name: editingName,
        description: editingDescription,
        path: formattedPath,
        method: editingMethod,
      });
      setShowEditPath(false);
    } catch (error) {
      console.error("Error updating endpoint:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดต endpoint");
    } finally {
      setLoading(false);
    }
  };

  const updateGroupName = async () => {
    if (!editingGroupId || !currentProject) return;

    setLoading(true);
    try {
      // Update the group name in the database
      const { error } = await supabase
        .from("groups")
        .update({ name: editingGroupName })
        .eq("id", editingGroupId);

      if (error) throw error;

      // Update the groups state
      const updatedGroups = groups.map((g) =>
        g.id === editingGroupId ? { ...g, name: editingGroupName } : g
      );
      setGroups(updatedGroups);

      // Update the endpoints state to reflect the new group name
      const updatedEndpoints = endpoints.map((ep) => {
        if (ep.group === groups.find((g) => g.id === editingGroupId)?.name) {
          return { ...ep, group: editingGroupName };
        }
        return ep;
      });
      setEndpoints(updatedEndpoints);

      // Update selected endpoint if it's in the edited group
      if (
        selectedEndpoint &&
        selectedEndpoint.group ===
          groups.find((g) => g.id === editingGroupId)?.name
      ) {
        setSelectedEndpoint({
          ...selectedEndpoint,
          group: editingGroupName,
        });
      }

      setShowEditGroupName(false);
    } catch (error) {
      console.error("Error updating group name:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตชื่อกลุ่ม");
    } finally {
      setLoading(false);
    }
  };

  const updateNameDescription = async () => {
    if (!selectedEndpoint) return;

    setLoading(true);
    try {
      // Update the name and description in the database
      const { error } = await supabase
        .from("endpoints")
        .update({
          name: editingName,
          description: editingDescription,
        })
        .eq("id", selectedEndpoint.id);

      if (error) throw error;

      // Update the endpoints state
      const updatedEndpoints = endpoints.map((ep) =>
        ep.id === selectedEndpoint.id
          ? { ...ep, name: editingName, description: editingDescription }
          : ep
      );

      setEndpoints(updatedEndpoints);
      setSelectedEndpoint({
        ...selectedEndpoint,
        name: editingName,
        description: editingDescription,
      });
      setShowEditNameDescription(false);
    } catch (error) {
      console.error("Error updating name and description:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตชื่อและคำอธิบาย");
    } finally {
      setLoading(false);
    }
  };

  const generateFieldDescriptions = () => {
    if (!selectedEndpoint) return;

    const response = selectedEndpoint.responses[selectedStatus];
    if (!response) return;

    const fields = extractFieldsFromResponse(response);
    setEditingFieldDescriptions(fields);
    setShowFieldDescriptions(true);
  };

  const detectFieldType = (value: unknown): string => {
    if (value === null) return "NULL";
    if (typeof value === "string") return "STRING";
    if (typeof value === "number") {
      return Number.isInteger(value) ? "INTEGER" : "FLOAT";
    }
    if (typeof value === "boolean") return "BOOLEAN";
    if (Array.isArray(value)) return "ARRAY";
    if (typeof value === "object") return "OBJECT";
    return "UNKNOWN";
  };

  const extractFieldsFromResponse = (
    jsonString: string
  ): FieldDescription[] => {
    try {
      const parsed = JSON.parse(jsonString);
      const fields: FieldDescription[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractFromObject = (obj: any, prefix = "") => {
        Object.keys(obj).forEach((key) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          const value = obj[key];

          if (
            Array.isArray(value) &&
            value.length > 0 &&
            typeof value[0] === "object"
          ) {
            // Handle array of objects - extract from first object
            fields.push({
              key: fullKey,
              type: "ARRAY",
              description: "",
            });
            extractFromObject(value[0], `${fullKey}[0]`);
          } else if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            // Handle nested objects
            fields.push({
              key: fullKey,
              type: "OBJECT",
              description: "",
            });
            extractFromObject(value, fullKey);
          } else {
            fields.push({
              key: fullKey,
              type: detectFieldType(value),
              description: "",
            });
          }
        });
      };

      if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
        extractFromObject(parsed.data[0]);
      } else if (typeof parsed === "object") {
        extractFromObject(parsed);
      }

      return fields;
    } catch {
      return [];
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-green-500 text-white";
      case "POST":
        return "bg-blue-500 text-white";
      case "PUT":
        return "bg-orange-500 text-white";
      case "DELETE":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
    setSelectedEndpoint(null);
    setView("endpoints");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (view === "projects") {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="border-b border-gray-800 bg-black">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setView("projects")}
                className="text-xl font-bold text-pink-500 hover:text-pink-400 transition-colors"
              >
                Mock API Docs
              </button>
              <nav className="flex space-x-6">
                <button
                  onClick={() => setView("projects")}
                  className="text-gray-300 hover:text-white"
                >
                  Projects
                </button>
                <button className="text-gray-300 hover:text-white border-b-2 border-pink-500 pb-1">
                  API Reference
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowProjectForm(true)}
                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            </div>
          </div>
        </header>

        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
            <p className="text-gray-400">
              Manage your mock API projects and endpoints
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => selectProject(project)}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-pink-500 hover:bg-gray-800 cursor-pointer transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-pink-400 transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {projects.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                      className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Endpoints</span>
                    <span className="bg-gray-800 text-pink-400 px-2 py-1 rounded font-mono text-xs">
                      {(() => {
                        // Count endpoints belonging to this project's groups
                        const groupNames = new Set(
                          allGroups
                            .filter((g) => g.project_id === project.id)
                            .map((g) => g.name)
                        );
                        return allEndpoints.filter((ep) =>
                          groupNames.has(ep.group)
                        ).length;
                      })()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Groups</span>
                    <span className="bg-gray-800 text-blue-400 px-2 py-1 rounded font-mono text-xs">
                      {
                        allGroups.filter(
                          (group) => group.project_id === project.id
                        ).length
                      }
                    </span>
                  </div>

                  {currentProject?.id === project.id && (
                    <div className="flex items-center space-x-2 pt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-400 text-xs font-medium">
                        Current Project
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="flex items-center text-pink-400 text-sm font-medium group-hover:text-pink-300">
                    <span>Open Project</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Project Card */}
            <div
              onClick={() => setShowProjectForm(true)}
              className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg p-6 hover:border-pink-500 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[200px] group"
            >
              <div className="text-gray-500 group-hover:text-pink-400 transition-colors">
                <Plus className="w-8 h-8 mx-auto mb-2" />
                <span className="text-sm font-medium">Create New Project</span>
              </div>
            </div>
          </div>
        </main>

        {/* Project Form Modal */}
        {showProjectForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">
                Create New Project
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                    placeholder="My API Project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                    rows={3}
                    placeholder="Project description..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={addProject}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Create Project
                </button>
                <button
                  onClick={() => setShowProjectForm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 bg-black">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setView("projects")}
              className="text-xl font-bold text-pink-500 hover:text-pink-400 transition-colors"
            >
              Mock API Docs
            </button>
            <nav className="flex space-x-6">
              <button
                onClick={() => setView("projects")}
                className="text-gray-300 hover:text-white"
              >
                Projects
              </button>
              <button className="text-gray-300 hover:text-white border-b-2 border-pink-500 pb-1">
                API Reference
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {currentProject && (
              <span className="text-sm text-gray-400">
                Project:{" "}
                <span className="text-white">{currentProject.name}</span>
              </span>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Base path prefix editor */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Base</span>
              <input
                type="text"
                value={defaultPathPrefix}
                onChange={(e) => setDefaultPathPrefix(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 w-32"
              />
            </div>

            <button
              onClick={() => setView("projects")}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Projects</span>
            </button>

            <button
              onClick={() => {
                const projectGroups = groups.filter(
                  (g) => g.project_id === currentProject?.id
                );
                setNewEndpoint((prev) => ({
                  ...prev,
                  group: projectGroups[0]?.name || "General",
                  // Pre-fill path with default base if empty
                  path: prev.path || defaultPathPrefix,
                }));
                setShowCreateGroup(false);
                setNewGroupName("");
                setShowAddForm(true);
              }}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Endpoint</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-80 bg-gray-950 border-r border-gray-800 h-screen overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">
              ENDPOINTS
            </h2>
            {/* Sidebar search for endpoints */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-8 py-2 text-sm focus:outline-none focus:border-pink-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Group endpoints by their actual groups */}
            {Object.entries(
              (searchTerm.trim()
                ? endpoints.filter((ep) => {
                    const q = searchTerm.trim().toLowerCase();
                    const hay = [
                      ep.name || "",
                      ep.path || "",
                      ep.description || "",
                      ep.method || "",
                      ep.group || "",
                    ]
                      .join(" ")
                      .toLowerCase();
                    return hay.includes(q);
                  })
                : endpoints
              ).reduce((acc, endpoint) => {
                const groupName = endpoint.group || "Ungrouped";
                if (!acc[groupName]) {
                  acc[groupName] = [];
                }
                acc[groupName].push(endpoint);
                return acc;
              }, {} as Record<string, typeof endpoints>)
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([groupName, groupEndpoints]) => (
                <div
                  key={groupName}
                  className={`mb-6 rounded ${
                    dragOverGroup === groupName ? "ring-2 ring-pink-500/60" : ""
                  }`}
                  onDragOver={(e) => handleGroupDragOver(e, groupName)}
                  onDrop={(e) => handleGroupDrop(e, groupName)}
                  onDragLeave={() => setDragOverGroup(null)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="flex-1 text-left text-sm font-medium text-gray-300 flex items-start hover:text-white"
                    >
                      {groupExpanded[groupName] !== false ? (
                        <ChevronDown className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="whitespace-normal break-words break-all leading-relaxed">
                          {groupName}{" "}
                          <span className="text-xs text-gray-500">
                            ({groupEndpoints.length})
                          </span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => {
                          setEditingGroupName(groupName);
                          setEditingGroupId(
                            groups.find((g) => g.name === groupName)?.id || ""
                          );
                          setShowEditGroupName(true);
                        }}
                        className="text-gray-400 hover:text-white flex items-center"
                        title="Edit group name"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          const id = groups.find(
                            (g) => g.name === groupName
                          )?.id;
                          if (!id) {
                            alert("Group not found");
                            return;
                          }
                          deleteGroup(id);
                        }}
                        className="text-gray-500 hover:text-red-400 flex items-center"
                        title="Delete group"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {groupExpanded[groupName] !== false && (
                    <div className="space-y-1 ml-4">
                      {groupEndpoints.map((endpoint) => (
                        <button
                          key={endpoint.id}
                          draggable
                          onDragStart={() => handleDragStart(endpoint.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            setSelectedEndpoint(endpoint);
                            setSelectedStatus(
                              Number.parseInt(
                                Object.keys(endpoint.responses)[0]
                              ) || 200
                            );
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group ${
                            selectedEndpoint?.id === endpoint.id
                              ? "bg-pink-600 text-white"
                              : "text-gray-300 hover:bg-gray-800 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center overflow-hidden">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium mr-2 ${
                                endpoint.method === "GET"
                                  ? "bg-green-600 text-white"
                                  : endpoint.method === "POST"
                                  ? "bg-blue-600 text-white"
                                  : endpoint.method === "PUT"
                                  ? "bg-orange-600 text-white"
                                  : endpoint.method === "DELETE"
                                  ? "bg-red-600 text-white"
                                  : "bg-gray-600 text-white"
                              }`}
                            >
                              {endpoint.method}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="truncate whitespace-nowrap overflow-hidden text-sm">
                                {endpoint.name || endpoint.path}
                              </div>
                              {endpoint.description && (
                                <div className="truncate whitespace-nowrap overflow-hidden text-xs text-gray-400">
                                  {endpoint.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </aside>

        <main className="flex-1 flex">
          <div className="flex-1 p-8">
            {selectedEndpoint ? (
              <div>
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-white mb-2">
                        {selectedEndpoint.name || selectedEndpoint.path}
                      </h1>
                      {selectedEndpoint.description && (
                        <p className="text-gray-400 mb-2">
                          {selectedEndpoint.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditingName(selectedEndpoint.name);
                        setEditingDescription(
                          selectedEndpoint.description || ""
                        );
                        setShowEditNameDescription(true);
                      }}
                      className="text-gray-400 hover:text-white flex items-center space-x-1 ml-4"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="text-xs">Edit Info</span>
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${getMethodColor(
                          selectedEndpoint.method
                        )}`}
                      >
                        {selectedEndpoint.method}
                      </span>
                      <code className="text-pink-400 font-mono">
                        {selectedEndpoint.path}
                      </code>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPath(selectedEndpoint.path);
                        setEditingMethod(selectedEndpoint.method);
                        setEditingName(selectedEndpoint.name);
                        setEditingDescription(
                          selectedEndpoint.description || ""
                        );
                        setShowEditPath(true);
                      }}
                      className="text-gray-400 hover:text-white flex items-center space-x-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="text-xs">Edit</span>
                    </button>
                  </div>
                </div>

                {/* Params / Body Examples */}
                {selectedEndpoint.method === "GET" ? (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">
                      Params Example
                    </h2>
                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400">
                          Query Params
                        </span>
                        <button
                          onClick={() => {
                            // Initialize editable rows from current JSON
                            let rows: {
                              key: string;
                              value: string;
                              description: string;
                            }[] = [];
                            try {
                              const obj: unknown = selectedEndpoint.queryParams
                                ? JSON.parse(selectedEndpoint.queryParams)
                                : {};
                              if (
                                obj &&
                                typeof obj === "object" &&
                                !Array.isArray(obj)
                              ) {
                                const rec = obj as Record<string, unknown>;
                                rows = Object.keys(rec).map((k) => {
                                  const v = rec[k];
                                  if (
                                    v &&
                                    typeof v === "object" &&
                                    !Array.isArray(v) &&
                                    ("value" in
                                      (v as Record<string, unknown>) ||
                                      "description" in
                                        (v as Record<string, unknown>))
                                  ) {
                                    const pv = v as {
                                      value?: unknown;
                                      description?: unknown;
                                    };
                                    return {
                                      key: k,
                                      value:
                                        pv.value !== undefined &&
                                        pv.value !== null
                                          ? typeof pv.value === "object"
                                            ? JSON.stringify(pv.value)
                                            : String(pv.value)
                                          : "",
                                      description: pv.description
                                        ? String(pv.description)
                                        : "",
                                    };
                                  }
                                  return {
                                    key: k,
                                    value:
                                      v !== undefined && v !== null
                                        ? String(v as unknown as string)
                                        : "",
                                    description: "",
                                  };
                                });
                              }
                            } catch {
                              rows = [];
                            }
                            setEditingQueryParamRows(
                              rows.length
                                ? rows
                                : [{ key: "", value: "", description: "" }]
                            );
                            setShowEditQueryParams(true);
                          }}
                          className="text-gray-400 hover:text-white flex items-center space-x-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-xs">Edit</span>
                        </button>
                      </div>
                      {/* Render query params as a simple table (Key / Value / Description) */}
                      {(() => {
                        let rows: {
                          key: string;
                          value: string;
                          description: string;
                        }[] = [];
                        try {
                          const parsedUnknown: unknown =
                            selectedEndpoint.queryParams
                              ? JSON.parse(selectedEndpoint.queryParams)
                              : {};
                          if (
                            parsedUnknown &&
                            typeof parsedUnknown === "object" &&
                            !Array.isArray(parsedUnknown)
                          ) {
                            const parsed = parsedUnknown as Record<
                              string,
                              unknown
                            >;
                            rows = Object.keys(parsed).map((k) => {
                              const v = parsed[k];
                              if (
                                v &&
                                typeof v === "object" &&
                                !Array.isArray(v) &&
                                ("value" in (v as Record<string, unknown>) ||
                                  "description" in
                                    (v as Record<string, unknown>))
                              ) {
                                const pv = v as {
                                  value?: unknown;
                                  description?: unknown;
                                };
                                return {
                                  key: k,
                                  value:
                                    pv.value === null ||
                                    typeof pv.value === "undefined"
                                      ? ""
                                      : typeof pv.value === "object"
                                      ? JSON.stringify(pv.value)
                                      : String(pv.value),
                                  description: pv.description
                                    ? String(pv.description)
                                    : "",
                                };
                              }
                              return {
                                key: k,
                                value:
                                  v === null || typeof v === "undefined"
                                    ? ""
                                    : typeof v === "object"
                                    ? JSON.stringify(v)
                                    : String(v),
                                description: "",
                              };
                            });
                          }
                        } catch {
                          // If parsing fails, show empty table
                          rows = [];
                        }

                        if (rows.length === 0) {
                          return (
                            <div className="text-sm text-gray-500 bg-black/20 rounded-md p-3 border border-gray-800">
                              No query params defined
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                              <thead>
                                <tr className="border-b border-gray-800">
                                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">
                                    Key
                                  </th>
                                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">
                                    Value
                                  </th>
                                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">
                                    Description
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row) => (
                                  <tr
                                    key={row.key}
                                    className="border-b border-gray-800 last:border-0"
                                  >
                                    <td className="px-3 py-2 text-sm text-white whitespace-nowrap">
                                      {row.key}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-300">
                                      {row.value}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-400">
                                      {row.description}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : selectedEndpoint.method === "POST" ||
                  selectedEndpoint.method === "PUT" ? (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">
                      Request Body Example
                    </h2>
                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Request Body</span>
                        <button
                          onClick={() => {
                            setEditingRequestBody(selectedEndpoint.requestBody || "");
                            setShowEditRequestBody(true);
                          }}
                          className="text-gray-400 hover:text-white flex items-center space-x-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-xs">Edit</span>
                        </button>
                      </div>
                      <pre className="text-sm text-gray-300 overflow-x-auto">
                        <code>{selectedEndpoint.requestBody || ""}</code>
                      </pre>
                    </div>
                  </div>
                ) : null}

                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Response Examples
                  </h2>

                  <div className="flex space-x-2 mb-4">
                    {Object.keys(selectedEndpoint.responses)
                      .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
                      .map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            setSelectedStatus(Number.parseInt(status))
                          }
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            selectedStatus === Number.parseInt(status)
                              ? "bg-pink-500 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        Status {selectedStatus} Response
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={generateFieldDescriptions}
                          className="text-gray-400 hover:text-blue-400 flex items-center space-x-1"
                        >
                          <Settings className="w-4 h-4" />
                          <span className="text-xs">Fields</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingResponse(
                              selectedEndpoint.responses[selectedStatus] || ""
                            );
                            setShowEditResponse(true);
                          }}
                          className="text-gray-400 hover:text-white flex items-center space-x-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-xs">Edit</span>
                        </button>
                      </div>
                    </div>
                    <pre className="text-sm text-gray-300 overflow-x-auto">
                      <code>
                        {selectedEndpoint.responses[selectedStatus] ||
                          "No response defined"}
                      </code>
                    </pre>
                  </div>
                </div>

                {selectedEndpoint.fieldDescriptions?.[selectedStatus] && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white">
                        Field Descriptions
                      </h2>
                      <button
                        onClick={() => {
                          setEditingFieldDescriptions(
                            selectedEndpoint.fieldDescriptions?.[
                              selectedStatus
                            ] || []
                          );
                          setShowFieldDescriptions(true);
                        }}
                        className="text-gray-400 hover:text-white flex items-center space-x-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="text-xs">Edit</span>
                      </button>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="space-y-3">
                        {selectedEndpoint.fieldDescriptions[selectedStatus].map(
                          (field, index) => (
                            <div
                              key={index}
                              className="border-b border-gray-800 pb-3 last:border-b-0"
                            >
                              <div className="flex items-center space-x-3 mb-1">
                                <code className="text-pink-400 font-mono text-sm">
                                  {field.key}
                                </code>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    field.type === "STRING"
                                      ? "bg-green-600 text-white"
                                      : field.type === "INTEGER" ||
                                        field.type === "FLOAT"
                                      ? "bg-blue-600 text-white"
                                      : field.type === "BOOLEAN"
                                      ? "bg-purple-600 text-white"
                                      : field.type === "ARRAY"
                                      ? "bg-orange-600 text-white"
                                      : field.type === "OBJECT"
                                      ? "bg-yellow-600 text-black"
                                      : "bg-gray-600 text-white"
                                  }`}
                                >
                                  {field.type}
                                </span>
                              </div>
                              {field.description && (
                                <p className="text-gray-400 text-sm">
                                  {field.description}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => deleteEndpoint(selectedEndpoint.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Endpoint</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-gray-400 mb-4">
                  Select an endpoint
                </h2>
                <p className="text-gray-500">
                  Choose an endpoint from the sidebar to view its documentation
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Response Modal */}
      {showEditResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              Edit Response for Status {selectedStatus}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Response JSON
              </label>
              <textarea
                value={editingResponse}
                onChange={(e) => setEditingResponse(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500 font-mono text-sm"
                rows={15}
                placeholder="Enter JSON response..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={updateResponse}
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Save Response
              </button>
              <button
                onClick={() => setShowEditResponse(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Body Modal */}
      {showEditRequestBody && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              Edit Request Body
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Body Text
              </label>
              <textarea
                value={editingRequestBody}
                onChange={(e) => setEditingRequestBody(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500 text-sm"
                rows={15}
                placeholder="Enter body text..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={updateRequestBody}
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Save Body
              </button>
              <button
                onClick={() => setShowEditRequestBody(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Query Params Modal */}
      {showEditQueryParams && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Edit Query Params
              </h3>
              <button
                onClick={() =>
                  setEditingQueryParamRows((rows) => [
                    ...rows,
                    { key: "", value: "", description: "" },
                  ])
                }
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Param</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-800 rounded-md">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">
                      Key
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">
                      Value
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {editingQueryParamRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-800 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <input
                          value={row.key}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEditingQueryParamRows((rows) => {
                              const copy = [...rows];
                              copy[idx] = { ...copy[idx], key: v };
                              return copy;
                            });
                          }}
                          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-pink-500"
                          placeholder="key"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.value}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEditingQueryParamRows((rows) => {
                              const copy = [...rows];
                              copy[idx] = { ...copy[idx], value: v };
                              return copy;
                            });
                          }}
                          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-pink-500"
                          placeholder="value"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.description}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEditingQueryParamRows((rows) => {
                              const copy = [...rows];
                              copy[idx] = { ...copy[idx], description: v };
                              return copy;
                            });
                          }}
                          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-pink-500"
                          placeholder="description"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() =>
                            setEditingQueryParamRows((rows) =>
                              rows.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-gray-400 hover:text-red-400"
                          aria-label="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex space-x-3 mt-4">
              <button
                onClick={updateQueryParams}
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Save Params
              </button>
              <button
                onClick={() => setShowEditQueryParams(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Descriptions Modal */}
      {showFieldDescriptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Field Descriptions for Status {selectedStatus}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingFieldDescriptions([
                      ...editingFieldDescriptions,
                      { key: "", type: "STRING", description: "" },
                    ]);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Field</span>
                </button>
                <button
                  onClick={() => {
                    if (selectedEndpoint) {
                      const response =
                        selectedEndpoint.responses[selectedStatus];
                      if (response) {
                        const fields = extractFieldsFromResponse(response);
                        setEditingFieldDescriptions(fields);
                      }
                    }
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <Settings className="w-4 h-4" />
                  <span>Auto Generate</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {editingFieldDescriptions.map((field, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Field Name
                      </label>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => {
                          const updated = [...editingFieldDescriptions];
                          updated[index] = { ...field, key: e.target.value };
                          setEditingFieldDescriptions(updated);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500 font-mono text-sm"
                        placeholder="field_name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Type
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const updated = [...editingFieldDescriptions];
                          updated[index] = { ...field, type: e.target.value };
                          setEditingFieldDescriptions(updated);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500"
                      >
                        <option value="STRING">STRING</option>
                        <option value="INTEGER">INTEGER</option>
                        <option value="FLOAT">FLOAT</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="ARRAY">ARRAY</option>
                        <option value="OBJECT">OBJECT</option>
                        <option value="NULL">NULL</option>
                      </select>
                    </div>

                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Description
                        </label>
                        <input
                          type="text"
                          value={field.description}
                          onChange={(e) => {
                            const updated = [...editingFieldDescriptions];
                            updated[index] = {
                              ...field,
                              description: e.target.value,
                            };
                            setEditingFieldDescriptions(updated);
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500"
                          placeholder="อธิบายความหมายของฟิลด์นี้..."
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            const updated = editingFieldDescriptions.filter(
                              (_, i) => i !== index
                            );
                            setEditingFieldDescriptions(updated);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {editingFieldDescriptions.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>
                    No fields defined. Click &quot;Add Field&quot; or &quot;Auto
                    Generate&quot; to get started.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={updateFieldDescriptions}
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Save Field Descriptions
              </button>
              <button
                onClick={() => setShowFieldDescriptions(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Endpoint Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Add New Endpoint
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newEndpoint.name}
                  onChange={(e) =>
                    setNewEndpoint({ ...newEndpoint, name: e.target.value })
                  }
                  placeholder="Get User Information"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Path
                </label>
                <input
                  type="text"
                  value={newEndpoint.path}
                  onChange={(e) =>
                    setNewEndpoint({ ...newEndpoint, path: e.target.value })
                  }
                  placeholder={`/${defaultPathPrefix}users`}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Method
                </label>
                <select
                  value={newEndpoint.method}
                  onChange={(e) =>
                    setNewEndpoint({ ...newEndpoint, method: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Group
                </label>
                {(() => {
                  const projectGroups = groups.filter(
                    (g) => g.project_id === currentProject?.id
                  );
                  if (projectGroups.length > 0) {
                    const selectedValue = projectGroups.some(
                      (g) => g.name === newEndpoint.group
                    )
                      ? newEndpoint.group
                      : projectGroups[0]?.name || "";
                    return (
                      <>
                        <select
                          value={selectedValue}
                          onChange={(e) =>
                            setNewEndpoint({
                              ...newEndpoint,
                              group: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                          {projectGroups.map((g) => (
                            <option key={g.id} value={g.name}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            Select a group in this project
                          </p>
                          {!showCreateGroup && (
                            <button
                              type="button"
                              onClick={() => setShowCreateGroup(true)}
                              className="text-xs text-pink-400 hover:text-pink-300"
                            >
                              + Add new group
                            </button>
                          )}
                        </div>
                        {showCreateGroup && (
                          <div className="mt-2 flex items-center space-x-2">
                            <input
                              type="text"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              placeholder="New group name"
                              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                            <button
                              type="button"
                              onClick={createGroupInline}
                              disabled={addingGroup}
                              className="px-3 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-md text-sm disabled:opacity-50"
                            >
                              {addingGroup ? "Creating..." : "Create"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCreateGroup(false);
                                setNewGroupName("");
                              }}
                              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </>
                    );
                  }
                  return (
                    <>
                      <input
                        type="text"
                        value={newEndpoint.group}
                        onChange={(e) =>
                          setNewEndpoint({
                            ...newEndpoint,
                            group: e.target.value,
                          })
                        }
                        placeholder="Enter group name (e.g. Users, Auth, Products)"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        No groups yet — type a new group name
                      </p>
                    </>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newEndpoint.description}
                  onChange={(e) =>
                    setNewEndpoint({
                      ...newEndpoint,
                      description: e.target.value,
                    })
                  }
                  placeholder="Get user information"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addEndpoint}
                disabled={loading}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Adding..." : "Add Endpoint"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Endpoint Modal */}
      {showEditPath && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Edit Endpoint
              </h3>
              <button
                onClick={() => setShowEditPath(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Get User Information"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  placeholder="Enter endpoint description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Method
                </label>
                <select
                  value={editingMethod}
                  onChange={(e) => setEditingMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Path
                </label>
                <input
                  type="text"
                  value={editingPath}
                  onChange={(e) => setEditingPath(e.target.value)}
                  placeholder={`/${defaultPathPrefix}users`}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditPath(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updatePath}
                disabled={loading}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Endpoint"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Name Modal */}
      {showEditGroupName && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Edit Group Name
              </h3>
              <button
                onClick={() => setShowEditGroupName(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded p-3 text-xs text-gray-400">
                Deleting a group will permanently delete all endpoints in it.
                This cannot be undone.
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => editingGroupId && deleteGroup(editingGroupId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
              >
                Delete Group
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditGroupName(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateGroupName}
                  disabled={loading}
                  className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Updating..." : "Update Group Name"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name and Description Modal */}
      {showEditNameDescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Edit Name & Description
              </h3>
              <button
                onClick={() => setShowEditNameDescription(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Get User Information"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  placeholder="Enter endpoint description..."
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditNameDescription(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateNameDescription}
                disabled={loading}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Info"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

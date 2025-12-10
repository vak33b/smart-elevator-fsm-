// src/api/projects.ts
import { apiClient } from "./client";
import type { UserRole } from "./auth";

export interface ProjectOwner {
  id: number;
  email: string;
  full_name?: string | null;
  role?: UserRole;
}

export type ProjectStatus = "draft" | "submitted" | "reviewed";

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  config?: any;
  owner_id?: number | null;
  owner?: ProjectOwner | null;
  status?: ProjectStatus;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  config?: any;
  status?: ProjectStatus;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  config?: any;
  status?: ProjectStatus;
}

export interface ProjectExportPayload {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  config?: any;
}

export type ProjectImportRequest = ProjectExportPayload & {
  owner_id?: number | null;
  status?: ProjectStatus;
};

export interface FSMVerilogExport {
  project_id: number;
  module_name: string;
  verilog: string;
}

export interface FSMVerilogExportRequest {
  module_name?: string;
}

// ---- запросы ----

export interface ProjectListParams {
  ownOnly?: boolean;
  studentId?: number;
}

export const fetchProjects = async (
  params?: ProjectListParams
): Promise<Project[]> => {
  const { data } = await apiClient.get<Project[]>("/projects/", {
    params: {
      own_only: params?.ownOnly || undefined,
      student_id: params?.studentId || undefined,
    },
  });
  return data;
};

export const fetchMyProjects = async (): Promise<Project[]> => {
  const { data } = await apiClient.get<Project[]>("/projects/my");
  return data;
};

export const fetchProject = async (id: number): Promise<Project> => {
  const { data } = await apiClient.get<Project>(`/projects/${id}`);
  return data;
};

export const createProject = async (
  payload: ProjectCreateRequest
): Promise<Project> => {
  const { data } = await apiClient.post<Project>("/projects/", payload);
  return data;
};

export const updateProject = async (
  id: number,
  payload: ProjectUpdateRequest
): Promise<Project> => {
  const { data } = await apiClient.put<Project>(`/projects/${id}`, payload);
  return data;
};

export const exportProjectJson = async (
  id: number
): Promise<ProjectExportPayload> => {
  const { data } = await apiClient.get<ProjectExportPayload>(
    `/projects/${id}/export`
  );
  return data;
};

export const importProjectJson = async (
  payload: ProjectImportRequest
): Promise<Project> => {
  const { data } = await apiClient.post<Project>("/projects/import", payload);
  return data;
};

export const exportFsmVerilog = async (
  projectId: number,
  moduleName?: string
): Promise<FSMVerilogExport> => {
  const body = moduleName ? { module_name: moduleName } : {};
  const { data } = await apiClient.post<FSMVerilogExport>(
    `/projects/${projectId}/fsm/export`,
    body
  );
  return data;
};

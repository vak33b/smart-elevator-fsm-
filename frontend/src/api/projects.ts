import { apiClient } from "./client";

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  config?: any;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  config?: any;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  config?: any;
}

export const fetchProjects = async (): Promise<Project[]> => {
  const { data } = await apiClient.get<Project[]>("/projects/");
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

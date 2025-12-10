// src/api/reviews.ts
import { apiClient } from "./client";

export interface ProjectReview {
  id: number;
  project_id: number;
  teacher_id: number;
  comment: string;
  created_at: string;
  teacher?: {
    id: number;
    email: string;
    full_name?: string | null;
    role?: string;
  } | null;
}

export interface CreateReviewPayload {
  comment: string;
}

export const fetchReviews = async (
  projectId: number
): Promise<ProjectReview[]> => {
  const { data } = await apiClient.get<ProjectReview[]>(
    `/projects/${projectId}/reviews`
  );
  return data;
};

export const createReview = async (
  projectId: number,
  payload: CreateReviewPayload
): Promise<ProjectReview> => {
  const { data } = await apiClient.post<ProjectReview>(
    `/projects/${projectId}/reviews`,
    payload
  );
  return data;
};

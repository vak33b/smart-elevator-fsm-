// src/api/simulation.ts
import { apiClient } from "./client";

export interface SimulationRequest {
  // Пока оставим как unknown — фронт будет подставлять структурированные данные позже
  project_id?: number;
  config: unknown;
  fsm: unknown;
  scenario: unknown;
}

export interface SimulationResult {
  timeline: Array<{
    time: number;
    floor: number;
    state_id: string;
    doors_open: boolean;
    direction: string;
  }>;
  metrics: {
    avg_wait_time: number;
    total_moves: number;
    stops: number;
  };
}

export interface ElevatorFrame {
  time: number;
  floor: number;
  state_id: string;
  doors_open: boolean;
  direction: string;
}


export const runSimulation = async (
  projectId: number
): Promise<SimulationResult> => {
  const { data } = await apiClient.post<SimulationResult>(
    `/projects/${projectId}/simulate`,
    {}
  );
  return data;
};

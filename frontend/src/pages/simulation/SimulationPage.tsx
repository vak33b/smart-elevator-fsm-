// src/pages/simulation/SimulationPage.tsx
import React, { useState } from "react";
import {
  Typography,
  Layout,
  Table,
  Card,
  Button,
  Space,
  Tag,
  Alert,
  Descriptions,
  Spin,
  Radio,
  message,
} from "antd";
import { useQuery, useMutation } from "@tanstack/react-query";

import { fetchProjects, Project } from "../../api/projects";
import { runSimulation, SimulationResult } from "../../api/simulation";
import ElevatorAnimation from "../../components/elevator/ElevatorAnimation";
import { useAuth } from "../../context/AuthContext";

const { Title } = Typography;
const { Content } = Layout;

export const SimulationPage: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectScope, setProjectScope] = useState<"all" | "own" | "students">(
    "all"
  );
  const { user } = useAuth();

  const {
    data: projects,
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    error: projectsError,
  } = useQuery<Project[], Error>({
    queryKey: ["projects", "forSimulation"],
    queryFn: () => fetchProjects(),
  });

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const {
    mutateAsync: simulate,
    isPending: isSimulating,
    error: simulationError,
  } = useMutation<SimulationResult, Error, number>({
    mutationFn: async (projectId: number) => {
      const result = await runSimulation(projectId);
      return result;
    },
    onSuccess: (data) => {
      setSimulation(data);
    },
  });

  const handleRunSimulation = async () => {
    if (!selectedProject) return;
    try {
      await simulate(selectedProject.id);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail?.errors) {
        message.error(
          detail.errors.map((e: any) => e.detail ?? JSON.stringify(e)).join("; ")
        );
      } else if (typeof detail === "string") {
        message.error(detail);
      } else {
        message.error("Не удалось выполнить симуляцию");
      }
    }
  };

  const floors =
    typeof selectedProject?.config?.elevator?.floors === "number" &&
    selectedProject.config.elevator.floors > 0
      ? selectedProject.config.elevator.floors
      : 5;

  return (
    <Content style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        Симуляция
      </Title>

      <Layout style={{ background: "transparent", gap: 24 }}>
        <Layout.Sider
          width="60%"
          style={{
            background: "transparent",
            paddingRight: 24,
            flex: "0 0 60%",
            maxWidth: "60%",
          }}
        >
          <Card title="Проекты" size="small">
            {isProjectsLoading && <Spin />}

            {isProjectsError && (
              <Alert
                type="error"
                message="Ошибка загрузки проектов"
                description={projectsError?.message}
              />
            )}

            {user?.role === "teacher" && (
              <Radio.Group
                style={{ marginBottom: 8 }}
                value={projectScope}
                onChange={(e) => setProjectScope(e.target.value)}
              >
                <Radio.Button value="all">Все</Radio.Button>
                <Radio.Button value="own">Мои</Radio.Button>
                <Radio.Button value="students">Студентов</Radio.Button>
              </Radio.Group>
            )}

            {projects && (
              <Table<Project>
                size="small"
                rowKey={(p) => p.id}
                dataSource={(projects || []).filter((p) => {
                  if (user?.role !== "teacher") {
                    return true;
                  }
                  if (projectScope === "own") {
                    return (
                      !!p.owner?.email &&
                      !!user?.email &&
                      p.owner.email === user.email
                    );
                  }
                  if (projectScope === "students") {
                    return p.owner?.role === "student";
                  }
                  return true;
                })}
                pagination={false}
                onRow={(record) => ({
                  onClick: () => {
                    setSelectedProject(record);
                    setSimulation(null);
                  },
                })}
                rowClassName={(record) =>
                  record.id === selectedProject?.id
                    ? "simulation-row-selected"
                    : ""
                }
                columns={[
                  {
                    title: "№",
                    dataIndex: "id",
                    width: 60,
                    render: (_: unknown, __: Project, index: number) => index + 1,
                  },
                  { title: "Название", dataIndex: "name" },
                  {
                    title: "Описание",
                    dataIndex: "description",
                    ellipsis: true,
                    render: (text: string | null) => text || "—",
                  },
                  {
                    title: "Владелец",
                    dataIndex: "owner",
                    render: (_: unknown, record) =>
                      record.owner?.full_name || record.owner?.email || "—",
                  },
                  {
                    title: "Создан",
                    dataIndex: "created_at",
                    render: (value: string) => {
                      const d = new Date(value);
                      const pad = (n: number) =>
                        n < 10 ? `0${n}` : String(n);
                      return `${pad(d.getDate())}-${pad(
                        d.getMonth() + 1
                      )}-${d.getFullYear()} ${pad(d.getHours())}:${pad(
                        d.getMinutes()
                      )}:${pad(d.getSeconds())}`;
                    },
                  },
                ]}
              />
            )}
          </Card>
        </Layout.Sider>

        <Layout.Content
          style={{
            background: "transparent",
            flex: "0 0 40%",
            maxWidth: "40%",
          }}
        >
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Card>
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                {selectedProject ? (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Выбранный проект">
                      #{selectedProject.id} — {selectedProject.name}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Alert
                    type="info"
                    message="Проект не выбран"
                    description="Выберите проект слева и нажмите «Запустить симуляцию»."
                  />
                )}

                {simulationError && (
                  <Alert
                    type="error"
                    message="Ошибка выполнения симуляции"
                    description={simulationError.message}
                  />
                )}

                <Button
                  type="primary"
                  size="large"
                  block
                  disabled={!selectedProject}
                  loading={isSimulating}
                  onClick={handleRunSimulation}
                >
                  Запустить симуляцию
                </Button>
              </Space>
            </Card>

            <Card title="Анимация лифта">
              {simulation && (
                <ElevatorAnimation timeline={simulation.timeline} floors={floors} />
              )}
              {!simulation && (
                <Alert
                  type="info"
                  message="Нет данных для анимации"
                  description="Сначала запустите симуляцию."
                />
              )}
            </Card>

            <Card title="Результаты симуляции">
              {simulation ? (
                <>
                  <Descriptions column={3} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Среднее время ожидания">
                      {simulation.metrics.avg_wait_time.toFixed(2)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Всего перемещений">
                      {simulation.metrics.total_moves}
                    </Descriptions.Item>
                    <Descriptions.Item label="Остановок">
                      {simulation.metrics.stops}
                    </Descriptions.Item>
                  </Descriptions>

                  <Table
                    rowKey={(row) => `${row.time}-${row.floor}-${row.state_id}`}
                    dataSource={simulation.timeline}
                    pagination={false}
                    columns={[
                      { title: "Время", dataIndex: "time", width: 80 },
                      { title: "Этаж", dataIndex: "floor", width: 80 },
                      {
                        title: "Состояние",
                        dataIndex: "state_id",
                        render: (stateId: string) => <Tag>{stateId}</Tag>,
                      },
                      {
                        title: "Двери",
                        dataIndex: "doors_open",
                        render: (open: boolean) =>
                          open ? <Tag color="green">Открыты</Tag> : "Закрыты",
                      },
                      {
                        title: "Направление",
                        dataIndex: "direction",
                        render: (dir: string) => {
                          const map: Record<string, string> = {
                            up: "Вверх",
                            down: "Вниз",
                            none: "—",
                          };
                          return map[dir] ?? dir;
                        },
                      },
                    ]}
                  />
                </>
              ) : (
                <Alert
                  type="info"
                  message="Симуляция ещё не запускалась"
                  description="Выберите проект слева и нажмите «Запустить симуляцию»."
                />
              )}
            </Card>
          </Space>
        </Layout.Content>
      </Layout>
    </Content>
  );
};

export default SimulationPage;

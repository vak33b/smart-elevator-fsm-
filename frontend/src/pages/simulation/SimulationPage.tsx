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
} from "antd";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";

import {
  fetchProjects,
  Project,
} from "../../api/projects";
import {
  runSimulation,
  SimulationResult,
} from "../../api/simulation";
import ElevatorAnimation from "../../components/elevator/ElevatorAnimation";

const { Title } = Typography;
const { Content } = Layout;

export const SimulationPage: React.FC = () => {
  // выбранный проект
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // список проектов
  const {
    data: projects,
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    error: projectsError,
  } = useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  // результат симуляции
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
    if (!selectedProject) {
      return;
    }
    await simulate(selectedProject.id);
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
        {/* Левая колонка — список проектов */}
        <Layout.Sider
          width={420}
          style={{ background: "transparent", paddingRight: 24 }}
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

            {projects && (
              <Table<Project>
  size="small"
  rowKey={(p) => p.id}
  dataSource={projects}
  pagination={false}
  onRow={(record) => ({
    onClick: () => {
      setSelectedProject(record);
      setSimulation(null); // при переключении проекта сбрасываем результат
    },
  })}
  rowClassName={(record) =>
    record.id === selectedProject?.id
      ? "simulation-row-selected"
      : ""
  }
  columns={[
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "Название", dataIndex: "name" },
    {
      title: "Описание",
      dataIndex: "description",
      ellipsis: true,
      render: (text: string | null) => text || "—",
    },
  ]}
/>

            )}
          </Card>
        </Layout.Sider>

        {/* Правая колонка — запуск и результаты */}
        <Layout.Content style={{ background: "transparent" }}>
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            {/* Кнопка запуска симуляции */}
            <Card>
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="middle"
              >
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
                    description="Выберите проект слева, чтобы запустить симуляцию."
                  />
                )}

                {simulationError && (
                  <Alert
                    type="error"
                    message="Ошибка запуска симуляции"
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

            {/* Результаты и анимация — как в редакторе проекта */}
            <Card title="Результаты симуляции">
              {simulation ? (
                <>
                  <Descriptions column={3} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Среднее время ожидания">
                      {simulation.metrics.avg_wait_time.toFixed(2)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Количество перемещений">
                      {simulation.metrics.total_moves}
                    </Descriptions.Item>
                    <Descriptions.Item label="Кол-во остановок">
                      {simulation.metrics.stops}
                    </Descriptions.Item>
                  </Descriptions>

                  <Table
                    rowKey={(row) =>
                      `${row.time}-${row.floor}-${row.state_id}`
                    }
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
                          open ? (
                            <Tag color="green">Открыты</Tag>
                          ) : (
                            "Закрыты"
                          ),
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
                  description="Выберите проект и нажмите «Запустить симуляцию», чтобы увидеть результаты."
                />
              )}
            </Card>

            <Card title="Анимация лифта">
              {simulation && (
                <ElevatorAnimation
                  timeline={simulation.timeline}
                  floors={floors}
                />
              )}
              {!simulation && (
                <Alert
                  type="info"
                  message="Нет данных для анимации"
                  description="Сначала запустите симуляцию."
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

// src/pages/projectEditor/ProjectEditorPage.tsx
import React from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Spin,
  Alert,
  Descriptions,
  Card,
  Button,
  Table,
  Space,
  Tag,
  Tabs,
} from "antd";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchProject,
  Project,
  updateProject,
} from "../../api/projects";
import {
  runSimulation,
  SimulationResult,
} from "../../api/simulation";
import ElevatorAnimation from "../../components/elevator/ElevatorAnimation";
import { FSMEditor } from "../../components/fsm/FSMEditor";
import { ScenarioEditor } from "../../components/scenario/ScenarioEditor";

const { Title } = Typography;

export const ProjectEditorPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const queryClient = useQueryClient();

  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useQuery<Project, Error>({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !Number.isNaN(projectId),
  });

  // запуск симуляции
  const {
    mutateAsync: simulate,
    data: simulation,
    isPending: isSimulating,
    error: simulationError,
  } = useMutation<SimulationResult, Error>({
    mutationFn: () => runSimulation(projectId),
  });

  // сохранение проекта (FSM / сценарий / конфиг лифта)
  const {
    mutateAsync: saveProject,
    isPending: isSavingProject,
  } = useMutation<Project, Error, any>({
    mutationFn: (configToSave: any) =>
      updateProject(projectId, {
        name: project?.name,
        description: project?.description ?? undefined,
        config: configToSave,
      }),
  });

  // все хуки выше, никаких early return до них

  if (Number.isNaN(projectId)) {
    return <Alert type="error" message="Некорректный ID проекта" />;
  }

  if (isLoading) {
    return <Spin />;
  }

  if (isError || !project) {
    return (
      <Alert
        type="error"
        message="Ошибка загрузки проекта"
        description={error?.message ?? "Проект не найден"}
      />
    );
  }

  const elevator = project.config?.elevator ?? {};
  const fsm = project.config?.fsm ?? {};
  const defaultScenario = project.config?.default_scenario ?? {
    name: "scenario",
    events: [],
  };

  const floors =
    typeof elevator.floors === "number" && elevator.floors > 0
      ? elevator.floors
      : 5;

  // --- вкладка "Обзор" ---
  const overviewTab = (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      {/* ошибка симуляции, если есть */}
      {simulationError && (
        <Alert
          type="error"
          message="Ошибка запуска симуляции"
          description={simulationError.message}
        />
      )}

      <Card title="Общая информация">
        <Descriptions column={1}>
          <Descriptions.Item label="Описание">
            {project.description || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Создан">
            {project.created_at}
          </Descriptions.Item>
          <Descriptions.Item label="Обновлён">
            {project.updated_at}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Конфигурация лифта">
        <Descriptions column={2}>
          <Descriptions.Item label="Этажей">
            {elevator.floors ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Время движения (между этажами)">
            {elevator.move_time ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Время дверей">
            {elevator.door_time ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Вместимость">
            {elevator.capacity ?? "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="FSM (коротко)">
        <Descriptions column={2}>
          <Descriptions.Item label="Тип автомата">
            {fsm.type ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Состояний">
            {Array.isArray(fsm.states) ? fsm.states.length : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Переходов">
            {Array.isArray(fsm.transitions)
              ? fsm.transitions.length
              : "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Сценарий по умолчанию">
        <Descriptions column={2}>
          <Descriptions.Item label="Имя">
            {defaultScenario.name ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Кол-во событий">
            {Array.isArray(defaultScenario.events)
              ? defaultScenario.events.length
              : "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {simulation && (
        <>
          <Card title="Результаты симуляции" style={{ marginTop: 16 }}>
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
          </Card>

          <Card title="Анимация лифта" style={{ marginTop: 16 }}>
            <ElevatorAnimation
              timeline={simulation.timeline}
              floors={floors}
            />
          </Card>
        </>
      )}
    </Space>
  );

  return (
    <div>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ marginBottom: 16 }}>
          Проект #{project.id}: {project.name}
        </Title>
        <Button
          type="primary"
          loading={isSimulating}
          onClick={() => simulate()}
        >
          Запустить симуляцию
        </Button>
      </Space>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: "overview",
            label: "Обзор",
            children: overviewTab,
          },
          {
            key: "fsm",
            label: "FSM",
            children: (
              <FSMEditor
                fsm={fsm}
                saving={isSavingProject}
                onSave={async (newFsm) => {
                  const newConfig = {
                    ...(project.config ?? {}),
                    fsm: newFsm,
                  };

                  const updated = await saveProject(newConfig);

                  queryClient.setQueryData<Project>(
                    ["project", projectId],
                    updated
                  );
                }}
              />
            ),
          },
          {
            key: "scenario",
            label: "Сценарий",
            children: (
              <ScenarioEditor
                scenario={defaultScenario}
                saving={isSavingProject}
                onSave={async (newScenario) => {
                  const newConfig = {
                    ...(project.config ?? {}),
                    default_scenario: newScenario,
                  };

                  const updated = await saveProject(newConfig);

                  queryClient.setQueryData<Project>(
                    ["project", projectId],
                    updated
                  );
                }}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

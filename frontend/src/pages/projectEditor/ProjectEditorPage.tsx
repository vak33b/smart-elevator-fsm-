// src/pages/projectEditor/ProjectEditorPage.tsx
import React, { useState } from "react";
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
  Form,
  Input,
  message,
  Modal,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProject,
  Project,
  updateProject,
  exportProjectJson,
  exportFsmVerilog,
  FSMVerilogExport,
} from "../../api/projects";
import { runSimulation, SimulationResult } from "../../api/simulation";
import ElevatorAnimation from "../../components/elevator/ElevatorAnimation";
import { FSMEditor } from "../../components/fsm/FSMEditor";
import { ScenarioEditor } from "../../components/scenario/ScenarioEditor";
import { useAuth } from "../../context/AuthContext";
import { fetchReviews, createReview, ProjectReview } from "../../api/reviews";
import { DownloadOutlined, CodeOutlined } from "@ant-design/icons";
import { formatDateTime } from "../../utils/formatDate";

const { Title } = Typography;

export const ProjectEditorPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [exporting, setExporting] = useState(false);
  const [verilogModal, setVerilogModal] = useState<{
    open: boolean;
    content: FSMVerilogExport | null;
  }>({ open: false, content: null });

  const { data: project, isLoading, isError, error } = useQuery<Project, Error>({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !Number.isNaN(projectId),
  });

  const {
    mutateAsync: simulate,
    data: simulation,
    isPending: isSimulating,
    error: simulationError,
  } = useMutation<SimulationResult, Error>({
    mutationFn: () => runSimulation(projectId),
  });

  const { mutateAsync: saveProject, isPending: isSavingProject } =
    useMutation<Project, Error, any>({
      mutationFn: (configToSave: any) =>
        updateProject(projectId, {
          name: project?.name,
          description: project?.description ?? undefined,
          config: configToSave,
        }),
    });

  const { data: reviews, isLoading: isReviewsLoading } = useQuery<
    ProjectReview[],
    Error
  >({
    queryKey: ["project", projectId, "reviews"],
    queryFn: () => fetchReviews(projectId),
    enabled: !Number.isNaN(projectId),
  });

  const { mutateAsync: addReview, isPending: isAddingReview } =
    useMutation<ProjectReview, Error, string>({
      mutationFn: async (comment: string) => createReview(projectId, { comment }),
      onSuccess: () => {
        setNewComment("");
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, "reviews"],
        });
      },
    });

  const handleExport = async () => {
    if (!project) return;
    try {
      setExporting(true);
      const data = await exportProjectJson(project.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name || "project"}-${project.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("JSON проекта экспортирован");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      message.error(typeof detail === "string" ? detail : "Не удалось экспортировать проект");
    } finally {
      setExporting(false);
    }
  };

  const handleSimulate = async () => {
    try {
      await simulate();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail?.errors) {
        message.error(
          detail.errors.map((e: any) => e.detail ?? JSON.stringify(e)).join("; ")
        );
      } else if (typeof detail === "string") {
        message.error(detail);
      } else {
        message.error("Не удалось запустить симуляцию");
      }
    }
  };

  const handleExportVerilog = async () => {
    if (!project) return;
    try {
      const data = await exportFsmVerilog(project.id);
      setVerilogModal({ open: true, content: data });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const errors = Array.isArray(detail) ? detail.join("; ") : detail;
      message.error(errors || "Не удалось экспортировать Verilog");
    }
  };

  if (Number.isNaN(projectId)) {
    return <Alert type="error" message="Некорректный идентификатор проекта" />;
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

  const overviewTab = (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      {simulationError && (
        <Alert
          type="error"
          message="Симуляция завершилась с ошибкой"
          description={simulationError.message}
        />
      )}

      <Card title="Общая информация">
        <Descriptions column={1}>
          <Descriptions.Item label="Описание">
            {project.description || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Создан">
            {formatDateTime(project.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Обновлен">
            {formatDateTime(project.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Параметры лифта">
        <Descriptions column={2}>
          <Descriptions.Item label="Этажей">
            {elevator.floors ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Время движения (сек)">
            {elevator.move_time ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Время дверей (сек)">
            {elevator.door_time ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Вместимость">
            {elevator.capacity ?? "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="FSM">
        <Descriptions column={2}>
          <Descriptions.Item label="Тип">
            {fsm.type ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Состояний">
            {Array.isArray(fsm.states) ? fsm.states.length : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Переходов">
            {Array.isArray(fsm.transitions) ? fsm.transitions.length : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Сценарий по умолчанию">
        <Descriptions column={2}>
          <Descriptions.Item label="Название">
            {defaultScenario.name ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Событий">
            {Array.isArray(defaultScenario.events)
              ? defaultScenario.events.length
              : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {simulation && (
        <>
          <Card title="Результаты симуляции" style={{ marginTop: 16 }}>
            <Descriptions column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Среднее ожидание">
                {simulation.metrics.avg_wait_time.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Перемещений">
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
                { title: "Направление", dataIndex: "direction" },
              ]}
            />
          </Card>

          <Card title="Анимация" style={{ marginTop: 16 }}>
            <ElevatorAnimation timeline={simulation.timeline} floors={floors} />
          </Card>
        </>
      )}
    </Space>
  );

  const isTeacher = user?.role === "teacher";

  const reviewsTab = (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      {isReviewsLoading && <Spin />}

      {reviews && reviews.length > 0 && (
        <Table<ProjectReview>
          rowKey="id"
          dataSource={reviews}
          pagination={false}
          columns={[
            {
              title: "Дата",
              dataIndex: "created_at",
              width: 200,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "Автор",
              dataIndex: "teacher",
              width: 220,
              render: (_: unknown, record) =>
                record.teacher?.full_name || record.teacher?.email || "-",
            },
            {
              title: "Комментарий",
              dataIndex: "comment",
            },
          ]}
        />
      )}

      {(!reviews || reviews.length === 0) && !isReviewsLoading && (
        <Alert type="info" message="Пока нет комментариев" />
      )}

      {isTeacher && (
        <Card title="Оставить отзыв">
          <Form
            layout="vertical"
            style={{ marginTop: 8 }}
            onFinish={() => {
              const trimmed = newComment.trim();
              if (trimmed) {
                void addReview(trimmed);
              }
            }}
          >
            <Form.Item label="Комментарий">
              <Input.TextArea
                rows={4}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Введите отзыв"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isAddingReview}
              >
                Отправить
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </Space>
  );

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>
        Проект #{project.id}: {project.name}
      </Title>

      <Space
        style={{
          width: "100%",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <Button
          icon={<CodeOutlined />}
          onClick={() => void handleExportVerilog()}
        >
          Экспорт FSM в Verilog
        </Button>
        <Button
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={() => void handleExport()}
        >
          Экспорт JSON
        </Button>
        <Button
          type="primary"
          loading={isSimulating}
          onClick={() => void handleSimulate()}
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
            key: "reviews",
            label: "Отзывы",
            children: reviewsTab,
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

      <Modal
        title="Verilog-код FSM"
        open={verilogModal.open}
        onCancel={() => setVerilogModal({ open: false, content: null })}
        footer={null}
        width={800}
      >
        <pre
          style={{
            whiteSpace: "pre-wrap",
            maxHeight: 500,
            overflow: "auto",
            background: "#f6f6f6",
            padding: 12,
            borderRadius: 6,
          }}
        >
{verilogModal.content?.verilog}
        </pre>
      </Modal>
    </div>
  );
};

// src/pages/projects/ProjectsListPage.tsx
import React, { useRef, useState } from "react";
import {
  Table,
  Typography,
  Spin,
  Alert,
  Button,
  Space,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProjects,
  Project,
  exportProjectJson,
  importProjectJson,
} from "../../api/projects";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { formatDateTime } from "../../utils/formatDate";

const { Title } = Typography;

export const ProjectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const {
    data: projects,
    isLoading,
    isError,
    error,
  } = useQuery<Project[], Error>({
    queryKey: ["projects", "list", user?.role ?? "unknown"],
    queryFn: () =>
      fetchProjects(
        user?.role === "teacher"
          ? { ownOnly: true }
          : undefined
      ),
  });

  const handleExport = async (project: Project) => {
    try {
      setExportingId(project.id);
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
      message.success("Проект экспортирован в JSON");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      message.error(
        typeof detail === "string"
          ? detail
          : "Не удалось экспортировать проект"
      );
    } finally {
      setExportingId(null);
    }
  };

  const importMutation = useMutation({
    mutationFn: importProjectJson,
    onSuccess: async (createdProject) => {
      message.success("Проект импортирован");
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${createdProject.id}`);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      message.error(
        typeof detail === "string"
          ? detail
          : "Не удалось импортировать проект"
      );
    },
  });

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importMutation.mutateAsync(parsed);
    } catch (parseErr) {
      message.error("Файл должен быть валидным JSON проекта");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div>
      <Space
        style={{
          width: "100%",
          marginBottom: 16,
          justifyContent: "space-between",
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Проекты
        </Title>
        <Space>
          <Button
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
            loading={importing || importMutation.isPending}
          >
            Импорт JSON
          </Button>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
          <Button type="primary" onClick={() => navigate("/projects/new")}>
            Создать проект
          </Button>
        </Space>
      </Space>

      {isLoading && <Spin />}

      {isError && (
        <Alert
          type="error"
          message="Произошла ошибка загрузки проектов"
          description={error?.message}
        />
      )}

      {projects && (
        <Table<Project>
          rowKey="id"
          dataSource={projects}
          columns={[
            {
              title: "№",
              dataIndex: "id",
              width: 80,
              render: (_: unknown, __: Project, index: number) => index + 1,
            },
            {
              title: "Название",
              dataIndex: "name",
              render: (text, record) => (
                <Link to={`/projects/${record.id}`}>{text}</Link>
              ),
            },
            {
              title: "Описание",
              dataIndex: "description",
              render: (text: string | null) => text || "-",
            },
            {
              title: "Владелец",
              dataIndex: "owner",
              render: (_: unknown, record) =>
                record.owner?.full_name ||
                record.owner?.email ||
                "-",
            },
            {
              title: "Создан",
              dataIndex: "created_at",
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "Обновлен",
              dataIndex: "updated_at",
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "Действия",
              dataIndex: "actions",
              width: 140,
              render: (_: unknown, record) => (
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  loading={exportingId === record.id}
                  onClick={() => void handleExport(record)}
                >
                  Экспорт
                </Button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export default ProjectsListPage;

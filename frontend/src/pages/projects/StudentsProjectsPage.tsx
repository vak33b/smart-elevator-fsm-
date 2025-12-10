// src/pages/projects/StudentsProjectsPage.tsx
import React from "react";
import { Table, Typography, Spin, Alert } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, Project } from "../../api/projects";
import { useAuth } from "../../context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { formatDateTime } from "../../utils/formatDate";

const { Title } = Typography;

export const StudentsProjectsPage: React.FC = () => {
  const { user } = useAuth();

  const {
    data: projects,
    isLoading,
    isError,
    error,
  } = useQuery<Project[], Error>({
    queryKey: ["projects", "students"],
    queryFn: () => fetchProjects(), // все проекты, фильтруем ниже
  });

  // Доступ только преподавателю
  if (user?.role !== "teacher") {
    return <Navigate to="/projects" replace />;
  }

  const studentProjects =
    projects?.filter((p) => p.owner?.role === "student") || [];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>
        Проекты студентов
      </Title>

      {isLoading && <Spin />}

      {isError && (
        <Alert
          type="error"
          message="Ошибка загрузки проектов студентов"
          description={error?.message}
        />
      )}

      {!isLoading && !isError && (
        <Table<Project>
          rowKey="id"
          dataSource={studentProjects}
          columns={[
            { title: "ID", dataIndex: "id", width: 80 },
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
              render: (text: string | null) => text || "—",
            },
            {
              title: "Автор",
              dataIndex: "owner",
              render: (_: unknown, record) =>
                record.owner?.full_name ||
                record.owner?.email ||
                "—",
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
          ]}
        />
      )}
    </div>
  );
};

export default StudentsProjectsPage;

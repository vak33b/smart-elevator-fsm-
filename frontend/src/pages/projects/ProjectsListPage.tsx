// src/pages/projects/ProjectsListPage.tsx
import React from "react";
import { Table, Typography, Spin, Alert, Button, Space } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, Project } from "../../api/projects";
import { Link, useNavigate } from "react-router-dom";

const { Title } = Typography;

export const ProjectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  return (
    <div>
      <Space
        style={{ width: "100%", marginBottom: 16, justifyContent: "space-between" }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Проекты
        </Title>
        <Button type="primary" onClick={() => navigate("/projects/new")}>
          Создать проект
        </Button>
      </Space>

      {isLoading && <Spin />}

      {isError && (
        <Alert
          type="error"
          message="Ошибка загрузки проектов"
          description={error.message}
        />
      )}

      {data && (
        <Table<Project>
          rowKey="id"
          dataSource={data}
          columns={[
            {
              title: "ID",
              dataIndex: "id",
              width: 80,
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
            },
            {
              title: "Создан",
              dataIndex: "created_at",
            },
            {
              title: "Обновлён",
              dataIndex: "updated_at",
            },
          ]}
        />
      )}
    </div>
  );
};

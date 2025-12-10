// src/layout/MainLayout.tsx
import React from "react";
import { Layout, Menu, Typography, Button, Space } from "antd";
import {
  ApartmentOutlined,
  PlayCircleOutlined,
  ProjectOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const roleLabelMap: Record<string, string> = {
  student: "Студент",
  teacher: "Преподаватель",
  admin: "Администратор",
};

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  // Публичные маршруты: показываем контент без меню
  if (!isAuthenticated) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Content>
          <Outlet />
        </Content>
      </Layout>
    );
  }

  const displayName =
    (user?.full_name && user.full_name.trim().length > 0
      ? user.full_name
      : user?.email) || "Без имени";

  const displayRole =
    user?.role != null
      ? roleLabelMap[user.role as string] ?? (user.role as string)
      : "";

  const selectedKey = location.pathname.startsWith("/projects")
    ? "/projects"
    : location.pathname;

  const items = [
    {
      key: "/projects",
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Проекты</Link>,
    },
    ...(user?.role === "teacher"
      ? [
          {
            key: "/students-projects",
            icon: <TeamOutlined />,
            label: (
              <Link to="/students-projects">Проекты студентов</Link>
            ),
          },
        ]
      : []),
    {
      key: "/simulation",
      icon: <PlayCircleOutlined />,
      label: <Link to="/simulation">Симуляция</Link>,
    },
    {
      key: "/about",
      icon: <ApartmentOutlined />,
      label: <Link to="/about">О проекте</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: 24,
          color: "white",
        }}
      >
        <Title level={3} style={{ color: "white", margin: 0 }}>
          Smart Elevator FSM
        </Title>

        <Space size="middle" align="center">
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }}>
            {displayName}
            {displayRole && (
              <span style={{ marginLeft: 8 }}>({displayRole})</span>
            )}
          </Text>
          <Button
            type="primary"
            size="middle"
            onClick={logout}
            style={{
              borderRadius: 999,
              paddingInline: 20,
              fontWeight: 500,
            }}
          >
            Выйти
          </Button>
        </Space>
      </Header>

      <Layout>
        <Sider width={220}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={items}
          />
        </Sider>

        <Layout style={{ padding: "16px 24px 24px" }}>
          <Content
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              minHeight: 280,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

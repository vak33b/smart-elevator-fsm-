// src/layout/MainLayout.tsx
import React from "react";
import { Layout, Menu, Typography } from "antd";
import {
  ApartmentOutlined,
  PlayCircleOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const menuItems = [
  {
    key: "/projects",
    icon: <ProjectOutlined />,
    label: <Link to="/projects">Проекты</Link>,
  },
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

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // определяем, какая вкладка должна быть подсвечена
  const selectedKey = menuItems.some((i) =>
    location.pathname.startsWith(i.key)
  )
    ? menuItems.find((i) => location.pathname.startsWith(i.key))!.key
    : "/projects";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          color: "white",
        }}
      >
        <Title level={3} style={{ color: "white", margin: 0 }}>
          Smart Elevator FSM
        </Title>
      </Header>

      <Layout>
        {/* Сайдбар и меню показываем ТОЛЬКО если пользователь авторизован */}
        {isAuthenticated && (
          <Sider width={220}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
            />
          </Sider>
        )}

        <Layout
          style={{
            padding: isAuthenticated ? "16px 24px 24px" : "24px",
          }}
        >
          <Content
            style={{
              background: isAuthenticated ? "#fff" : "transparent",
              padding: isAuthenticated ? 24 : 0,
              borderRadius: isAuthenticated ? 8 : 0,
              minHeight: 280,
              display: "flex",
              justifyContent: "center",
              alignItems: isAuthenticated ? "flex-start" : "center",
            }}
          >
            {/* Здесь подставляются страницы (регистрация, логин, проекты и т.д.) */}
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

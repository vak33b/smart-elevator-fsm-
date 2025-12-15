// src/pages/auth/LoginPage.tsx
import React, { useState } from "react";
import { Card, Form, Input, Button, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api/auth";

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = await authApi.login({
        email: values.email,
        password: values.password,
      });

      if (data?.access_token) {
        login({
          token: data.access_token,
          user: {
            email: data.user.email,
            full_name: data.user.full_name,
            role: data.user.role,
          },
        });
      }

      message.success("Login successful");
      navigate("/projects");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        message.error(detail.map((e: any) => e.msg).join("; "));
      } else if (typeof detail === "string") {
        message.error(detail);
      } else {
        message.error(
          "Login failed. Check e-mail and password."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #e6f0ff, #f7f7f9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <Card
        style={{
          width: 380,
          borderRadius: 20,
          boxShadow:
            "0 18px 45px rgba(15, 35, 95, 0.15), 0 0 0 1px #f0f0f0",
          padding: "12px 8px 8px",
        }}
        bodyStyle={{ padding: "24px 28px 28px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            Вход в систему
          </Title>
          <Text type="secondary">
            Введите e‑mail и пароль, чтобы продолжить.
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ email: "" }}
        >
          <Form.Item
            label="E-mail"
            name="email"
            rules={[
              { required: true, message: "Введите e-mail" },
              { type: "email", message: "Введите корректный e-mail" },
            ]}
          >
            <Input placeholder="student@example.com" size="large" />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[
              { required: true, message: "Введите пароль" },
            ]}
          >
            <Input.Password placeholder="Пароль" size="large" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              Войти
            </Button>
          </Form.Item>
        </Form>

        <div
          style={{
            textAlign: "center",
            marginTop: 8,
            fontSize: 13,
          }}
        >
          <Text type="secondary">
            Нет аккаунта?{" "}
            <Link to="/register">Зарегистрироваться</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;

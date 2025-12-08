// src/pages/auth/LoginPage.tsx
import React, { useState } from "react";
import { Card, Form, Input, Button, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login } = useAuth(); // login(token: string, role?: string)
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      // отправляем JSON, как ждёт наш /auth/login
      const { data } = await axios.post("/api/v1/auth/login", {
        email: values.email,
        password: values.password,
      });

      if (data?.access_token) {
        // роль пока с бэка не возвращаем — можно передать undefined
        login(data.access_token);
      }

      message.success("Успешный вход");
      navigate("/projects");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        // detail из FastAPI при 422 — это массив объектов {type, loc, msg, input}
        message.error(detail.map((e: any) => e.msg).join("; "));
      } else if (typeof detail === "string") {
        message.error(detail);
      } else {
        message.error(
          "Не удалось войти. Проверьте e-mail и пароль."
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
            Вход
          </Title>
          <Text type="secondary">
            Авторизуйтесь, чтобы продолжить работу с проектами
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
              { required: true, message: "Укажите e-mail" },
              { type: "email", message: "Введите корректный e-mail" },
            ]}
          >
            <Input placeholder="student@example.com" size="large" />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true, message: "Введите пароль" }]}
          >
            <Input.Password placeholder="Ваш пароль" size="large" />
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
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;

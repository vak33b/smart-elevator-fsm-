// src/pages/auth/RegisterPage.tsx
import React, { useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Radio,
  Typography,
  message,
} from "antd";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const { Title, Text } = Typography;

export const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      if (values.password !== values.password_confirm) {
        message.error("Пароль и подтверждение не совпадают");
        return;
      }

      const payload = {
        email: values.email,
        full_name: values.full_name || undefined,
        role: values.role,
        password: values.password,
      };

      await axios.post("/api/v1/auth/register", payload);

      message.success("Регистрация прошла успешно, войдите в систему");
      navigate("/login");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        message.error(detail.map((e: any) => e.msg).join("; "));
      } else if (typeof detail === "string") {
        message.error(detail);
      } else {
        message.error("Не удалось зарегистрироваться");
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
          width: 420,
          borderRadius: 20,
          boxShadow:
            "0 18px 45px rgba(15, 35, 95, 0.15), 0 0 0 1px #f0f0f0",
          padding: "12px 8px 8px",
        }}
        bodyStyle={{ padding: "24px 28px 28px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            Регистрация
          </Title>
          <Text type="secondary">
            Создайте аккаунт, чтобы работать с проектами лифтов
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ role: "student" }}
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

          <Form.Item label="Полное имя" name="full_name">
            <Input placeholder="Иванов Иван" size="large" />
          </Form.Item>

          <Form.Item label="Роль" name="role">
            <Radio.Group>
              <Radio value="student">Студент</Radio>
              <Radio value="teacher">Преподаватель</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[
              { required: true, message: "Введите пароль" },
              { min: 6, message: "Минимум 6 символов" },
              {
                max: 72,
                message: "Максимум 72 символа (ограничение bcrypt)",
              },
            ]}
          >
            <Input.Password
              placeholder="Минимум 6 символов"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Подтверждение пароля"
            name="password_confirm"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Подтвердите пароль" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Пароли не совпадают")
                  );
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="Повторите пароль"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              Зарегистрироваться
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
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;

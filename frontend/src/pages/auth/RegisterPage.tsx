// src/pages/auth/RegisterPage.tsx
import React from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Radio,
  Typography,
  message,
} from "antd";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../api/auth";

const { Title, Text } = Typography;

export const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleFinish = async (values: {
    email: string;
    full_name?: string;
    role: "student" | "teacher";
    password: string;
    confirm: string;
  }) => {
    try {
      await authApi.register({
        email: values.email,
        full_name: values.full_name,
        role: values.role,
        password: values.password,
      });

      message.success("Регистрация прошла успешно, войдите в систему.");
      navigate("/auth/login");
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || "Ошибка регистрации. Попробуйте ещё раз.";
      message.error(detail);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
      }}
    >
      <Card
        style={{ width: 480, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
        bodyStyle={{ padding: "32px 32px 24px" }}
      >
        <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
          Регистрация
        </Title>

        <Form
          layout="vertical"
          form={form}
          onFinish={handleFinish}
          requiredMark={false}
        >
          <Form.Item
            label="E-mail"
            name="email"
            rules={[
              { required: true, message: "Укажите e-mail" },
              { type: "email", message: "Некорректный e-mail" },
            ]}
          >
            <Input placeholder="student@example.com" />
          </Form.Item>

          <Form.Item label="Полное имя" name="full_name">
            <Input placeholder="Иванов Иван" />
          </Form.Item>

          <Form.Item
            label="Роль"
            name="role"
            initialValue="student"
            rules={[{ required: true, message: "Выберите роль" }]}
          >
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
            ]}
            hasFeedback
          >
            <Input.Password placeholder="Минимум 6 символов" />
          </Form.Item>

          <Form.Item
            label="Подтверждение пароля"
            name="confirm"
            dependencies={["password"]}
            hasFeedback
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
            <Input.Password placeholder="Ещё раз пароль" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block>
              Зарегистрироваться
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Text type="secondary">
            Уже есть аккаунт? <Link to="/auth/login">Войти</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

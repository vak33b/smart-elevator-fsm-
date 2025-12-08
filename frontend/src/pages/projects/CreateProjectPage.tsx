// src/pages/projects/CreateProjectPage.tsx
import React from "react";
import {
  Form,
  Input,
  InputNumber,
  Button,
  Typography,
  Card,
  message,
  Space,
} from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject, ProjectCreateRequest } from "../../api/projects";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

interface CreateProjectFormValues {
  name: string;
  description?: string;
  floors: number;
  door_time: number;
  move_time: number;
  capacity?: number;
}

export const CreateProjectPage: React.FC = () => {
  const [form] = Form.useForm<CreateProjectFormValues>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
  mutationFn: (values: CreateProjectFormValues) => {
    const payload: ProjectCreateRequest = {
      name: values.name,
      description: values.description,
      config: {
        elevator: {
          floors: values.floors,
          door_time: values.door_time,
          move_time: values.move_time,
          capacity: values.capacity ?? null,
        },
        fsm: {
          type: "mealy",
          states: [
            { id: "idle", name: "Idle", is_initial: true, is_final: false },
            { id: "moving", name: "Moving", is_initial: false, is_final: false },
          ],
          transitions: [
            {
              id: "t1",
              from_state_id: "idle",
              to_state_id: "moving",
              condition: "call_received",
            },
            {
              id: "t2",
              from_state_id: "moving",
              to_state_id: "idle",
              condition: "always",
            },
          ],
        },
        default_scenario: {
          name: "Default scenario",
          events: [],
        },
      },
    };

    return createProject(payload);
  },
  onSuccess: async (project) => {
    message.success("Проект успешно создан");
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    navigate(`/projects/${project.id}`);
  },
  onError: (err: unknown) => {
    console.error(err);
    message.error("Не удалось создать проект");
  },
});

  const onFinish = async (values: CreateProjectFormValues) => {
    await mutateAsync(values);
  };

  return (
    <div>
      <Title level={3}>Создать проект</Title>
      <Card>
        <Form<CreateProjectFormValues>
          form={form}
          layout="vertical"
          initialValues={{
            floors: 5,
            door_time: 1,
            move_time: 1,
            capacity: 8,
          }}
          onFinish={onFinish}
        >
          <Form.Item
            label="Название проекта"
            name="name"
            rules={[{ required: true, message: "Введите название проекта" }]}
          >
            <Input placeholder="Например: Лифт 5 этажей, Mealy FSM" />
          </Form.Item>

          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Title level={4} style={{ marginTop: 16 }}>
            Конфигурация лифта
          </Title>

          <Space style={{ width: "100%" }} size="large" wrap>
            <Form.Item
              label="Количество этажей"
              name="floors"
              rules={[
                { required: true, message: "Укажите количество этажей" },
                { type: "number", min: 1, message: "Минимум 1 этаж" },
              ]}
            >
              <InputNumber min={1} />
            </Form.Item>

            <Form.Item label="Время движения между этажами" name="move_time">
              <InputNumber min={0} step={0.1} />
            </Form.Item>

            <Form.Item label="Время открытия/закрытия дверей" name="door_time">
              <InputNumber min={0} step={0.1} />
            </Form.Item>

            <Form.Item label="Вместимость (людей)" name="capacity">
              <InputNumber min={1} />
            </Form.Item>
          </Space>

          <Form.Item style={{ marginTop: 24 }}>
  <Space>
    <Button type="primary" htmlType="submit" loading={isPending}>
      Создать
    </Button>
    <Button onClick={() => navigate("/projects")} disabled={isPending}>
      Отмена
    </Button>
  </Space>
</Form.Item>

        </Form>
      </Card>
    </div>
  );
};

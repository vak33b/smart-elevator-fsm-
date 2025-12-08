// src/components/scenario/ScenarioEditor.tsx
import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  Typography,
} from "antd";

const { Text } = Typography;

type Direction = "up" | "down" | "none";

interface ScenarioEvent {
  time: number;
  floor: number;
  direction: Direction;
}

interface Scenario {
  name?: string;
  events: ScenarioEvent[];
}

interface ScenarioEditorProps {
  scenario: Scenario;
  saving: boolean;
  onSave: (newScenario: Scenario) => Promise<void> | void;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  scenario,
  saving,
  onSave,
}) => {
  const [localName, setLocalName] = useState<string>(
    scenario.name ?? "default scenario"
  );

  const [events, setEvents] = useState<ScenarioEvent[]>(
    Array.isArray(scenario.events) ? scenario.events : []
  );

  const handleAddEvent = () => {
    const lastTime =
      events.length > 0 ? events[events.length - 1].time : 0;

    setEvents([
      ...events,
      {
        time: lastTime + 10,
        floor: 0,
        direction: "up",
      },
    ]);
  };

  const handleDeleteEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const handleChangeEvent = (
    index: number,
    field: keyof ScenarioEvent,
    value: number | Direction
  ) => {
    const updated = [...events];
    // @ts-expect-error: тип подхватывается по ключу
    updated[index][field] = value;
    setEvents(updated);
  };

  const handleSave = async () => {
    const cleaned: ScenarioEvent[] = events
      .filter((e) => e.time >= 0)
      .sort((a, b) => a.time - b.time);

    const toSave: Scenario = {
      name: localName.trim() || "scenario",
      events: cleaned,
    };

    await onSave(toSave);
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Card title="Общая информация о сценарии">
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Text type="secondary">Имя сценария:</Text>
            <Input
              style={{ marginTop: 4, maxWidth: 320 }}
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
            />
          </div>
          <Text type="secondary">
            Сценарий — это список событий (вызовов лифта по времени).
          </Text>
        </Space>
      </Card>

      <Card
        title="События сценария"
        extra={
          <Button type="primary" onClick={handleAddEvent}>
            Добавить событие
          </Button>
        }
      >
        <Table
          rowKey={(_, index) => String(index)}
          dataSource={events}
          pagination={false}
          size="small"
          columns={[
            {
              title: "Время (с)",
              dataIndex: "time",
              render: (value: number, _, index) => (
                <InputNumber
                  min={0}
                  value={value}
                  onChange={(v) =>
                    handleChangeEvent(index, "time", Number(v ?? 0))
                  }
                />
              ),
            },
            {
              title: "Этаж",
              dataIndex: "floor",
              render: (value: number, _, index) => (
                <InputNumber
                  min={0}
                  value={value}
                  onChange={(v) =>
                    handleChangeEvent(index, "floor", Number(v ?? 0))
                  }
                />
              ),
            },
            {
              title: "Направление",
              dataIndex: "direction",
              render: (value: Direction, _, index) => (
                <Select<Direction>
                  value={value}
                  style={{ width: 120 }}
                  onChange={(v) =>
                    handleChangeEvent(index, "direction", v)
                  }
                  options={[
                    { value: "up", label: "Вверх" },
                    { value: "down", label: "Вниз" },
                    { value: "none", label: "—" },
                  ]}
                />
              ),
            },
            {
              title: "Действия",
              key: "actions",
              render: (_, __, index) => (
                <Popconfirm
                  title="Удалить событие?"
                  onConfirm={() => handleDeleteEvent(index)}
                >
                  <Button danger size="small">
                    Удалить
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <div style={{ textAlign: "right" }}>
        <Button
          type="primary"
          onClick={handleSave}
          loading={saving}
          disabled={events.length === 0}
        >
          Сохранить сценарий
        </Button>
      </div>
    </Space>
  );
};

export default ScenarioEditor;

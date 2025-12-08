import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Input,
  Switch,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Alert,
  Divider,
  Select,
} from "antd";

// Разрешённые состояния лифта и их русские подписи
const LIFT_STATE_LABELS: Record<string, string> = {
  IDLE_CLOSED: "Ожидание, двери закрыты (IDLE_CLOSED)",
  DOOR_OPENING: "Открытие дверей (DOOR_OPENING)",
  DOOR_OPEN: "Двери открыты (DOOR_OPEN)",
  DOOR_CLOSING: "Закрытие дверей (DOOR_CLOSING)",
  MOVING_UP: "Движение вверх (MOVING_UP)",
  MOVING_DOWN: "Движение вниз (MOVING_DOWN)",
};

// Разрешённые переходы между состояниями (строго по ТЗ)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  IDLE_CLOSED: ["DOOR_OPENING", "MOVING_UP", "MOVING_DOWN"],

  DOOR_OPENING: ["DOOR_OPEN"],
  DOOR_OPEN: ["DOOR_CLOSING"],
  DOOR_CLOSING: ["IDLE_CLOSED", "MOVING_UP", "MOVING_DOWN"],

  MOVING_UP: ["DOOR_OPENING"],
  MOVING_DOWN: ["DOOR_OPENING"],
};


// Опции для выпадающих списков состояний
const LIFT_STATE_OPTIONS = Object.entries(LIFT_STATE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  })
);

const { Text } = Typography;

interface FSMState {
  id: string;
  name: string;
  is_initial?: boolean;
  is_final?: boolean;
}

interface FSMTransition {
  id: string;
  from_state_id: string;
  to_state_id: string;
  condition: string;
}

export interface FSMDefinition {
  type?: string;
  states: FSMState[];
  transitions: FSMTransition[];
}

interface FSMEditorProps {
  fsm: any; // приходит из проекта как произвольный объект
  saving: boolean;
  onSave: (fsm: FSMDefinition) => Promise<void> | void;
}

// Нормализация входящего FSM из проекта в аккуратную структуру
function normalizeFsm(input: any): FSMDefinition {
  return {
    type: typeof input?.type === "string" ? input.type : "mealy",
    states: Array.isArray(input?.states)
      ? input.states.map((s: any): FSMState => ({
          id: String(s.id ?? ""),
          name: String(s.name ?? ""),
          is_initial: Boolean(s.is_initial),
          is_final: Boolean(s.is_final),
        }))
      : [],
    transitions: Array.isArray(input?.transitions)
      ? input.transitions.map((t: any): FSMTransition => ({
          id: String(t.id ?? ""),
          from_state_id: String(t.from_state_id ?? ""),
          to_state_id: String(t.to_state_id ?? ""),
          condition: String(t.condition ?? ""),
        }))
      : [],
  };
}

export const FSMEditor: React.FC<FSMEditorProps> = ({
  fsm,
  saving,
  onSave,
}) => {
  const [localFsm, setLocalFsm] = useState<FSMDefinition>(() =>
    normalizeFsm(fsm)
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  // если в пропсах пришёл новый fsm – обновляем локальное состояние
  useEffect(() => {
    setLocalFsm(normalizeFsm(fsm));
    setErrors([]);
    setTouched(false);
  }, [fsm]);

  // ----- обработчики изменений -----

  const updateState = (index: number, patch: Partial<FSMState>) => {
    setTouched(true);
    setLocalFsm((prev) => {
      const nextStates = [...prev.states];
      nextStates[index] = { ...nextStates[index], ...patch };

      // если ставим is_initial на true – снимаем флаг с остальных
      if (patch.is_initial) {
        nextStates.forEach((s, i) => {
          if (i !== index && s.is_initial) {
            nextStates[i] = { ...s, is_initial: false };
          }
        });
      }

      return { ...prev, states: nextStates };
    });
  };

  const addState = () => {
    setTouched(true);
    setLocalFsm((prev) => ({
      ...prev,
      states: [
        ...prev.states,
        {
          id: `s${prev.states.length + 1}`,
          name: "Новое состояние",
          is_initial: prev.states.length === 0,
          is_final: false,
        },
      ],
    }));
  };

  const deleteState = (index: number) => {
    setTouched(true);
    setLocalFsm((prev) => {
      const stateId = prev.states[index]?.id;
      const nextStates = prev.states.filter((_, i) => i !== index);
      const nextTransitions = prev.transitions.filter(
        (t) => t.from_state_id !== stateId && t.to_state_id !== stateId
      );
      return { ...prev, states: nextStates, transitions: nextTransitions };
    });
  };

  const updateTransition = (
    index: number,
    patch: Partial<FSMTransition>
  ) => {
    setTouched(true);
    setLocalFsm((prev) => {
      const next = [...prev.transitions];
      next[index] = { ...next[index], ...patch };
      return { ...prev, transitions: next };
    });
  };

  const addTransition = () => {
    setTouched(true);
    setLocalFsm((prev) => ({
      ...prev,
      transitions: [
        ...prev.transitions,
        {
          id: `t${prev.transitions.length + 1}`,
          from_state_id: prev.states[0]?.id ?? "",
          to_state_id: prev.states[0]?.id ?? "",
          condition: "",
        },
      ],
    }));
  };

  const deleteTransition = (index: number) => {
    setTouched(true);
    setLocalFsm((prev) => ({
      ...prev,
      transitions: prev.transitions.filter((_, i) => i !== index),
    }));
  };

  // ----- Валидация FSM -----

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    const { states, transitions } = localFsm;

    if (!states.length) {
      errs.push("Должно быть хотя бы одно состояние.");
      return errs;
    }

    const stateIds = states.map((s) => s.id.trim());
    const emptyStateIds = stateIds.filter((id) => !id);
    if (emptyStateIds.length) {
      errs.push("У всех состояний должен быть непустой ID.");
    }

    // уникальность ID состояний
    const dupStateIds = stateIds.filter(
      (id, idx) => id && stateIds.indexOf(id) !== idx
    );
    if (dupStateIds.length) {
      const uniqueDupStates = dupStateIds.filter(
        (id, index) => dupStateIds.indexOf(id) === index
      );

      errs.push(
        `ID состояний должны быть уникальны. Повторяются: ${uniqueDupStates.join(
          ", "
        )}`
      );
    }

    // хотя бы одно начальное состояние
    const initialStates = states.filter((s) => s.is_initial);
    if (!initialStates.length) {
      errs.push("Должно быть хотя бы одно начальное состояние.");
    }
    if (initialStates.length > 1) {
      errs.push(
        "Должно быть только одно начальное состояние (мы уже подсвечиваем переключателем)."
      );
    }

    // переходы
    const transitionIds = transitions.map((t) => t.id.trim());
    const emptyTransitionIds = transitionIds.filter((id) => !id);
    if (emptyTransitionIds.length) {
      errs.push("У всех переходов должен быть непустой ID перехода.");
    }

    const dupTransitionIds = transitionIds.filter(
      (id, idx) => id && transitionIds.indexOf(id) !== idx
    );
    if (dupTransitionIds.length) {
      const uniqueDupTransitions = dupTransitionIds.filter(
        (id, index) => dupTransitionIds.indexOf(id) === index
      );

      errs.push(
        `ID переходов должны быть уникальны. Повторяются: ${uniqueDupTransitions.join(
          ", "
        )}`
      );
    }

    // ссылки на существующие состояния
    const stateIdSet = new Set(stateIds);
    transitions.forEach((t) => {
      if (!stateIdSet.has(t.from_state_id.trim())) {
        errs.push(
          `Переход "${t.id}" ссылается на несуществующее исходное состояние "${t.from_state_id}".`
        );
      }
      if (!stateIdSet.has(t.to_state_id.trim())) {
        errs.push(
          `Переход "${t.id}" ссылается на несуществующее конечное состояние "${t.to_state_id}".`
        );
      }
    });
    // Проверка допустимости переходов (запрещённые по ТЗ)
    transitions.forEach((t) => {
      if (!t.from_state_id || !t.to_state_id) return;

      const allowedNext = ALLOWED_TRANSITIONS[t.from_state_id];

      if (!allowedNext) {
        errs.push(
          `Состояние "${t.from_state_id}" не допускает исходящих переходов`
        );
        return;
      }

      if (!allowedNext.includes(t.to_state_id)) {
        errs.push(
          `Запрещён переход ${t.from_state_id} → ${t.to_state_id}`
        );
      }
    });

    return errs;
  }, [localFsm]);

  
  useEffect(() => {
    if (touched) {
      setErrors(validationErrors);
    }
  }, [validationErrors, touched]);

  const handleSave = async () => {
    const errs = validationErrors;
    setErrors(errs);
    setTouched(true);

    if (errs.length) {
      return;
    }

    await onSave(localFsm);
  };

  // ----- Рендер -----

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      {errors.length > 0 && (
        <Alert
          type="error"
          message="Ошибки в описании автомата"
          description={
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          }
        />
      )}

      <Card
        title="Состояния автомата"
        extra={
          <Button onClick={addState} type="default">
            Добавить состояние
          </Button>
        }
      >
        <Row style={{ marginBottom: 8 }}>
          <Col span={4}>
            <Text strong>ID</Text>
          </Col>
          <Col span={8}>
            <Text strong>Название</Text>
          </Col>
          <Col span={4}>
            <Text strong>Начальное</Text>
          </Col>
          <Col span={4}>
            <Text strong>Конечное</Text>
          </Col>
          <Col span={4} />
        </Row>

        <Divider style={{ margin: "8px 0 16px" }} />

        {localFsm.states.map((state, index) => (
          <Row key={index} gutter={8} style={{ marginBottom: 8 }}>
            <Col span={4}>
  <Select
    style={{ width: "100%" }}
    value={state.id || undefined}
    options={LIFT_STATE_OPTIONS}
    onChange={(value) => updateState(index, { id: value })}
    placeholder="Состояние"
  />
</Col>

            <Col span={8}>
              <Input
                value={state.name}
                onChange={(e) =>
                  updateState(index, { name: e.target.value })
                }
              />
            </Col>
            <Col span={4}>
              <Switch
                checked={!!state.is_initial}
                onChange={(checked) =>
                  updateState(index, { is_initial: checked })
                }
              />
            </Col>
            <Col span={4}>
              <Switch
                checked={!!state.is_final}
                onChange={(checked) =>
                  updateState(index, { is_final: checked })
                }
              />
            </Col>
            <Col span={4}>
              <Button danger onClick={() => deleteState(index)}>
                Удалить
              </Button>
            </Col>
          </Row>
        ))}

        {localFsm.states.length === 0 && (
          <Text type="secondary">Состояний пока нет.</Text>
        )}
      </Card>

      <Card
        title="Переходы (локальное редактирование)"
        extra={
          <Button onClick={addTransition} type="default">
            Добавить переход
          </Button>
        }
      >
        <Row style={{ marginBottom: 8 }}>
          <Col span={4}>
            <Text strong>ID</Text>
          </Col>
          <Col span={6}>
            <Text strong>Из состояния</Text>
          </Col>
          <Col span={6}>
            <Text strong>В состояние</Text>
          </Col>
          <Col span={6}>
            <Text strong>Условие</Text>
          </Col>
          <Col span={2} />
        </Row>

        <Divider style={{ margin: "8px 0 16px" }} />

        {localFsm.transitions.map((tr, index) => (
          <Row key={index} gutter={8} style={{ marginBottom: 8 }}>
            <Col span={4}>
              <Input
                value={tr.id}
                onChange={(e) =>
                  updateTransition(index, { id: e.target.value })
                }
              />
            </Col>
            <Col span={6}>
              <Select
                style={{ width: "100%" }}
                value={tr.from_state_id || undefined}
                onChange={(value) =>
                  updateTransition(index, { from_state_id: value })
                }
                options={LIFT_STATE_OPTIONS}
                placeholder="Выберите состояние"
              />
            </Col>
            <Col span={6}>
              <Select
                style={{ width: "100%" }}
                value={tr.to_state_id || undefined}
                onChange={(value) =>
                  updateTransition(index, { to_state_id: value })
                }
                options={LIFT_STATE_OPTIONS}
                placeholder="Выберите состояние"
              />
            </Col>
            <Col span={6}>
              <Input
                value={tr.condition}
                onChange={(e) =>
                  updateTransition(index, {
                    condition: e.target.value,
                  })
                }
                placeholder="условие (например, call_received)"
              />
            </Col>
            <Col span={2}>
              <Button danger onClick={() => deleteTransition(index)}>
                ✕
              </Button>
            </Col>
          </Row>
        ))}

        {localFsm.transitions.length === 0 && (
          <Text type="secondary">Переходов пока нет.</Text>
        )}
      </Card>

      <div style={{ textAlign: "right" }}>
        <Button
          type="primary"
          onClick={handleSave}
          loading={saving}
          disabled={saving}
        >
          Сохранить FSM
        </Button>
      </div>
    </Space>
  );
};

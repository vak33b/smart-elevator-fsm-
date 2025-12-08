// src/components/elevator/ElevatorAnimation.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { ElevatorFrame } from "../../api/simulation";
import "./ElevatorAnimation.css";

interface ElevatorAnimationProps {
  timeline: ElevatorFrame[];
  floors: number;
}

// высоты подогнаны под CSS (.floor height)
const FLOOR_HEIGHT = 90;   // высота одного этажа в px
const CABIN_HEIGHT = 70;   // высота кабины
const CABIN_WIDTH = 70;    // ширина кабины

// Подписи к состояниям FSM (IDs у нас ВЕРХНИМИ буквами)
const stateLabelMap: Record<string, string> = {
  IDLE_CLOSED: "Ожидание, двери закрыты (IDLE_CLOSED)",
  DOOR_OPENING: "Открытие дверей (DOOR_OPENING)",
  DOOR_OPEN: "Двери открыты (DOOR_OPEN)",
  DOOR_CLOSING: "Закрытие дверей (DOOR_CLOSING)",
  MOVING_UP: "Движение вверх (MOVING_UP)",
  MOVING_DOWN: "Движение вниз (MOVING_DOWN)",
};

const ElevatorAnimation: React.FC<ElevatorAnimationProps> = ({
  timeline,
  floors,
}) => {
  const [currentTime, setCurrentTime] = useState(0);

  // Нормализуем таймлайн: сортируем по времени и отбрасываем пустой
  const safeTimeline = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    const sorted = [...timeline].sort((a, b) => a.time - b.time);
    return sorted;
  }, [timeline]);

  // Общее время симуляции
  const totalTime = useMemo(
    () =>
      safeTimeline.length > 0
        ? safeTimeline[safeTimeline.length - 1].time
        : 0,
    [safeTimeline]
  );

  // Линейная интерполяция этажа между ближайшими кадрами по времени
  const interpolateFloor = (t: number): number => {
    if (safeTimeline.length === 0) return 0;

    // если t раньше первого кадра — считаем, что лифт уже на первом кадре
    if (t <= safeTimeline[0].time) {
      return safeTimeline[0].floor;
    }

    // ищем первый кадр с time > t
    let idx = safeTimeline.findIndex((f) => f.time > t);
    if (idx === -1) {
      // t больше последнего времени — берём последний этаж
      return safeTimeline[safeTimeline.length - 1].floor;
    }

    const prev = safeTimeline[idx - 1];
    const next = safeTimeline[idx];

    const dt = next.time - prev.time;
    if (dt <= 0) return next.floor;

    const alpha = (t - prev.time) / dt;
    return prev.floor + (next.floor - prev.floor) * alpha;
  };

  // Текущий "дискретный" кадр (для состояния, дверей и направления)
  const currentFrame: ElevatorFrame | null = useMemo(() => {
    if (safeTimeline.length === 0) return null;
    // берём последний кадр, у которого time <= currentTime
    const fromTail =
      [...safeTimeline].reverse().find((f) => f.time <= currentTime) ??
      safeTimeline[0];
    return fromTail;
  }, [safeTimeline, currentTime]);

  // Запуск анимации по "симуляционному времени"
  useEffect(() => {
    if (safeTimeline.length === 0 || totalTime <= 0) {
      setCurrentTime(0);
      return;
    }

    let cancelled = false;
    const start = performance.now();

    const tick = () => {
      if (cancelled) return;
      const now = performance.now();
      const elapsedSec = (now - start) / 1000;

      if (elapsedSec <= totalTime) {
        setCurrentTime(elapsedSec);
        requestAnimationFrame(tick);
      } else {
        setCurrentTime(totalTime);
      }
    };

    // при каждой новой симуляции начинаем с 0
    setCurrentTime(0);
    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
    };
  }, [totalTime, safeTimeline]);

  // --- Геометрия лифта ---

  // В СИМУЛЯЦИИ ЭТАЖИ 1..floors,
  // поэтому для позиции кабины переводим во внутренний индекс 0..floors-1
  const rawFloorIndex = interpolateFloor(currentTime) - 1; // 1→0, 2→1, ...
  const clampedFloorIndex = Math.min(
    Math.max(rawFloorIndex, 0),
    Math.max(floors - 1, 0)
  );

  // индекс "сверху вниз": 0 — верхний этаж
  const floorIndexFromTop = floors - 1 - clampedFloorIndex;

  // верх кабины = верх этажа + отступ для центрирования
  const cabinY =
    floorIndexFromTop * FLOOR_HEIGHT +
    (FLOOR_HEIGHT - CABIN_HEIGHT) / 2;

  // для отображения берём реальный этаж из кадра,
  // если его нет — fallback на округлённый индекс + 1
  const displayFloor = currentFrame
    ? currentFrame.floor
    : Math.round(clampedFloorIndex + 1);


  // --- Состояние дверей и подписи ---

  let doorsOpenVisual = false;
  let stateLabel = "-";
  let directionLabel = "—";

  if (currentFrame) {
    const s = currentFrame.state_id;

    // Наш FSM теперь работает с состояниями в ВЕРХНЕМ регистре
    switch (s) {
      case "DOOR_OPEN":
      case "DOOR_OPENING":
        doorsOpenVisual = true;
        break;
      case "DOOR_CLOSING":
        doorsOpenVisual = false;
        break;
      default:
        // Для остальных доверяем флагу doors_open из симуляции
        doorsOpenVisual = !!currentFrame.doors_open;
    }

    stateLabel = stateLabelMap[s] ?? s;
    directionLabel =
      currentFrame.direction === "none" ? "—" : currentFrame.direction;
  }

  const progressPercent =
    totalTime > 0 ? Math.min(100, (currentTime / totalTime) * 100) : 0;

  // Пустая симуляция
  if (safeTimeline.length === 0) {
    return (
      <div className="elevator-container">
        <div
          className="elevator-shaft empty"
          style={{ height: floors * FLOOR_HEIGHT }}
        >
          <span className="empty-text">Нет данных симуляции</span>
        </div>
      </div>
    );
  }

  return (
    <div className="elevator-container">
      <div
        className="elevator-shaft"
        style={{ height: floors * FLOOR_HEIGHT }}
      >
        {/* Этажи (подписываем снизу вверх 1..floors) */}
        {Array.from({ length: floors }, (_, i) => {
          const label = floors - i;
          return (
            <div key={label} className="floor">
              {label}
            </div>
          );
        })}

        {/* КАБИНА */}
        <div
          className="lift-cabin"
          style={{
            transform: `translate(-50%, ${cabinY}px)`,
            width: CABIN_WIDTH,
            height: CABIN_HEIGHT,
          }}
        >

          <div className={`doors ${doorsOpenVisual ? "open" : "closed"}`}>
            <div className="door left" />
            <div className="door right" />
          </div>
        </div>
      </div>

      <div className="status-panel">
        <h4>Состояние лифта</h4>
        <p>
          Время симуляции:{" "}
          <b>
            {currentTime.toFixed(1)} / {totalTime.toFixed(1)} c
          </b>
        </p>
        <p>
          Этаж: <b>{displayFloor}</b>
        </p>

        <p>
          Состояние FSM: <b>{stateLabel}</b>
        </p>
        <p>
          Направление: <b>{directionLabel}</b>
        </p>
        <p>
          Двери:{" "}
          <b style={{ color: doorsOpenVisual ? "green" : "red" }}>
            {doorsOpenVisual ? "Открыты" : "Закрыты"}
          </b>
        </p>
        <p>
          Прогресс: <b>{progressPercent.toFixed(0)}%</b>
        </p>
      </div>
    </div>
  );
};

export default ElevatorAnimation;

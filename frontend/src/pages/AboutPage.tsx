// src/pages/AboutPage.tsx
import React from "react";
import { Card, Col, Row, Typography, Tag, Timeline, Space } from "antd";
import {
  ApartmentOutlined,
  CodeOutlined,
  DeploymentUnitOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

const fsmStates = [
  "IDLE_CLOSED — ожидание, двери закрыты (initial)",
  "MOVING_UP — движение вверх",
  "MOVING_DOWN — движение вниз",
  "DOOR_OPENING — открытие дверей",
  "DOOR_OPEN — двери открыты",
  "DOOR_CLOSING — закрытие дверей",
];

const AboutPage: React.FC = () => {
  return (
    <div>
      <Title level={2} style={{ marginBottom: 8 }}>
        Smart Elevator FSM
      </Title>
      <Text type="secondary">
        Веб‑приложение для моделирования работы лифта на основе конечных
        автоматов: описывайте FSM, задавайте параметры лифта и сценарии,
        запускайте симуляцию, экспортируйте FSM в Verilog.
      </Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ApartmentOutlined />
                <span>Кратко о системе и ролях</span>
              </Space>
            }
          >
            <Paragraph>
              <b>Назначение:</b> учебное моделирование лифтового автомата
              (Mealy/Moore), визуализация и экспорт логики.
            </Paragraph>
            <Paragraph>
              <b>Роли:</b>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>
                  <Tag color="blue">Student</Tag> — работает только со своими
                  проектами.
                </li>
                <li>
                  <Tag color="purple">Teacher</Tag> — видит проекты студентов,
                  может оставлять отзывы и создавать свои проекты.
                </li>
              </ul>
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CodeOutlined />
                <span>Стек и данные проекта</span>
              </Space>
            }
          >
            <Paragraph>
              <b>Backend:</b> FastAPI + SQLAlchemy, JWT, сервисы симуляции и
              экспорта FSM.
            </Paragraph>
            <Paragraph>
              <b>Frontend:</b> React + Ant Design, управление проектами,
              редактор FSM/сценариев, симуляция, экспорт.
            </Paragraph>
            <Paragraph>
              <b>Данные проекта:</b> в JSON‑конфиге хранятся{" "}
              <Tag color="green">elevator</Tag>,{" "}
              <Tag color="green">fsm</Tag>,{" "}
              <Tag color="green">default_scenario</Tag>. Один проект — один
              конфиг.
            </Paragraph>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <DeploymentUnitOutlined />
                <span>FSM: расшифровка и допустимые состояния</span>
              </Space>
            }
          >
            <Paragraph>
              <b>FSM (Finite State Machine)</b> — конечный автомат: набор
              состояний и переходов по событиям/условиям. В проекте допустимы
              состояния:
            </Paragraph>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {fsmStates.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <Paragraph style={{ marginTop: 8 }}>
              Mealy/Moore автоматы: в Mealy выходы зависят от состояния и входа,
              в Moore — только от состояния. Структура FSM: конечное множество
              состояний, начальное состояние, переходы с условиями и выходами.
              Для корректной работы: задать одно начальное состояние, валидные
              идентификаторы состояний/переходов и исключить небезопасные
              переходы (двери открыты → движение).
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <PlayCircleOutlined />
                <span>Краткое руководство</span>
              </Space>
            }
          >
            <Timeline
              items={[
                {
                  color: "blue",
                  children: (
                    <>
                      <b>1. Авторизация</b> — зарегистрируйтесь/войдите, роль
                      student/teacher.
                    </>
                  ),
                },
                {
                  color: "green",
                  children: (
                    <>
                      <b>2. Проект</b> — создайте или импортируйте JSON с
                      параметрами лифта, FSM, сценарием.
                    </>
                  ),
                },
                {
                  color: "purple",
                  children: (
                    <>
                      <b>3. FSM</b> — задайте состояния и переходы (Mealy/Moore),
                      убедитесь в наличии начального состояния и отсутствии
                      небезопасных переходов.
                    </>
                  ),
                },
                {
                  color: "orange",
                  children: (
                    <>
                      <b>4. Симуляция</b> — запустите моделирование, проверьте
                      метрики и таймлайн, при необходимости скорректируйте
                      конфиг.
                    </>
                  ),
                },
                {
                  color: "red",
                  children: (
                    <>
                      <b>5. Экспорт</b> — сохраните проект в JSON или экспортируйте
                      FSM в Verilog.
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined />
                <span>Теория: конечные автоматы и Verilog</span>
              </Space>
            }
          >
            <Paragraph>
              <b>Конечный автомат</b> — формальная модель, описывающая систему с
              конечным числом состояний и переходов по входным событиям. В нашей
              задаче состояния отражают этапы работы лифта, а переходы — реакции
              на изменения входов. Ключевые элементы: множество состояний,
              входной алфавит, функция переходов, начальное состояние и (опц.)
              выходная функция.
            </Paragraph>
            <Paragraph>
              <b>Verilog</b> — язык описания аппаратуры (HDL) для моделирования
              и синтеза цифровых схем. Экспорт FSM в Verilog позволяет применять
              описанную логику лифта в ПЛИС/ASIC, проверять её в аппаратной
              среде и интегрировать в более крупные цифровые системы.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AboutPage;

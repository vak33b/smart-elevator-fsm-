// src/pages/AboutPage.tsx
import React from "react";
import { Card, Col, Row, Typography, Tag, Timeline, Space } from "antd";
import {
  ApartmentOutlined,
  CodeOutlined,
  DeploymentUnitOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

const AboutPage: React.FC = () => {
  return (
    <div>
      <Title level={2} style={{ marginBottom: 8 }}>
        Smart Elevator FSM
      </Title>
      <Text type="secondary">
        Учебный проект по моделированию работы лифта через конечные автоматы,
        настройки сценариев и визуализацию анимации.
      </Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ApartmentOutlined />
                <span>О проекте</span>
              </Space>
            }
          >
            <Paragraph>
              Приложение позволяет собирать конфигурацию лифта (этажи, время
              движения и открытия дверей), описывать его логику как конечный
              автомат (FSM) и прогонять сценарии вызовов. Результат симуляции
              можно использовать для визуальной анимации и проверки корректности
              алгоритма.
            </Paragraph>
            <Paragraph>
              Доступ разграничен по ролям:
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>
                  <b>student</b> — создаёт свои проекты и запускает симуляции.
                </li>
                <li>
                  <b>teacher</b> — может рецензировать проекты студентов.
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
                <span>Архитектура</span>
              </Space>
            }
          >
            <Paragraph>
              <b>Backend:</b> FastAPI + SQLAlchemy, выдаёт JWT, хранит проекты и
              их FSM-конфигурации, выполняет расчёт симуляции.
            </Paragraph>
            <Paragraph>
              <b>Frontend:</b> React + Ant Design, маршруты под учёткой, редактор
              проектов, запуск симуляций и отображение их результатов.
            </Paragraph>
            <Paragraph>
              <b>Данные:</b> Project.config содержит elevator, fsm и
              default_scenario (JSON), что даёт возможность воспроизводить
              расчёт и анимацию.
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
                <span>Кратко о конечных автоматах</span>
              </Space>
            }
          >
            <Paragraph>
              Конечный автомат описывается наборами <b>состояний</b>,
              <b>переходов</b> и <b>событий</b>. В проекте используется Mealy
              FSM: выходные действия зависят и от текущего состояния, и от
              входного события.
            </Paragraph>
            <Paragraph>
              <Tag color="blue">State</Tag> хранит имя, флаг инициализации/
              завершения. <Tag color="purple">Transition</Tag> соединяет два
              состояния и активируется при выполнении условия (например,
              <code>call_received</code>).
            </Paragraph>
            <Paragraph>
              Сценарий симуляции — упорядоченный список внешних событий
              (кнопки, препятствия, таймеры). Прогон сценария формирует трассу
              состояний и событий, пригодную для анимации движения кабины и
              дверей.
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <PlayCircleOutlined />
                <span>Как строится симуляция и анимация</span>
              </Space>
            }
          >
            <Timeline
              items={[
                {
                  color: "blue",
                  children: (
                    <>
                      <b>1. Конфигурация</b> — задаются параметры лифта и FSM.
                      Итог сериализуется в JSON, сохраняется в проект.
                    </>
                  ),
                },
                {
                  color: "green",
                  children: (
                    <>
                      <b>2. Сценарий</b> — последовательность событий (нажатия
                      кнопок, таймеры, препятствия). Можно использовать
                      default_scenario.
                    </>
                  ),
                },
                {
                  color: "orange",
                  children: (
                    <>
                      <b>3. Прогон</b> — сервис симуляции вычисляет переходы,
                      времена и результат (ошибки, коллизии).
                    </>
                  ),
                },
                {
                  color: "red",
                  children: (
                    <>
                      <b>4. Анимация</b> — фронтенд интерпретирует трассу: движение между
                      этажами, открытие/закрытие дверей, реакции на события.
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AboutPage;

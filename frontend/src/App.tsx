// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layout/MainLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ProjectsListPage } from "./pages/projects/ProjectsListPage";
import { ProjectEditorPage } from "./pages/projectEditor/ProjectEditorPage";
import { SimulationPage } from "./pages/simulation/SimulationPage";
import { CreateProjectPage } from "./pages/projects/CreateProjectPage";
import { StudentsProjectsPage } from "./pages/projects/StudentsProjectsPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AboutPage from "./pages/AboutPage";

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Публичные маршруты */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Закрытые маршруты после авторизации */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsListPage />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="/projects/:id" element={<ProjectEditorPage />} />
          <Route path="/students-projects" element={<StudentsProjectsPage />} />
          <Route path="/simulation" element={<SimulationPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<div>Страница не найдена</div>} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;

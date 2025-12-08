// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layout/MainLayout";
import {LoginPage} from "./pages/auth/LoginPage";
import {RegisterPage} from "./pages/auth/RegisterPage";
import { ProjectsListPage } from "./pages/projects/ProjectsListPage";
import { ProjectEditorPage } from "./pages/projectEditor/ProjectEditorPage";
import { SimulationPage } from "./pages/simulation/SimulationPage";
import { CreateProjectPage } from "./pages/projects/CreateProjectPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";


const App: React.FC = () => {
  return (
          <Routes>
              <Route element={<MainLayout />}>
                {/* публичные страницы */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* защищённые маршруты */}
                <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/projects" replace />} />
                <Route path="/projects" element={<ProjectsListPage />} />
                <Route path="/projects/new" element={<CreateProjectPage />} />
                <Route path="/projects/:id" element={<ProjectEditorPage />} />
                <Route path="/simulation" element={<SimulationPage />} />
                <Route path="/about" element={<div>Здесь будет инфо о проекте.</div>} />
                <Route path="*" element={<div>Страница не найдена</div>} />
              </Route>
            </Route>
          </Routes>
        
  );
};

export default App;

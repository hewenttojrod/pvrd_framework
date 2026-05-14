/* eslint-disable react-refresh/only-export-components */
/**
 * Application entry point for Vite + React.
 * Dynamically loads all module routes from modules/<module>/client/index.ts,
 * renders the app shell with routing, and handles lazy-loading of module pages.
 */
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@templates/app-shell";
import LoadingState from "@templates/loading-state";
import "./index.css";
import type { ModuleRoute } from "@app-types/navigation";

type ModuleEntry = {
  routes?: ModuleRoute[];
};

type ModuleLoader = () => Promise<ModuleEntry>;

const moduleEntries = import.meta.glob("../../modules/*/client/index.ts") as Record<
  string,
  ModuleLoader
>;

const CeleryTaskListPage = lazy(() => import("./core/celery_task_list"));
const SchemaMappingManagerPage = lazy(() => import("./core/schema_mapping_manager"));
const SchemaMappingEditorPage = lazy(() => import("./core/schema_mapping_editor"));

function HomePage() {
  return <h1 className="text-2xl font-semibold">Home</h1>;
}

function ModulesPage() {
  return <h1 className="text-2xl font-semibold">Modules</h1>;
}

function renderApp(moduleRoutes: ModuleRoute[]) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route
              path="/core/background-tasks"
              element={
                <Suspense fallback={<LoadingState label="Loading page..." />}>
                  <CeleryTaskListPage />
                </Suspense>
              }
            />
            <Route path="/core/metrics" element={<Navigate to="/core/schema-mappings" replace />} />
            <Route
              path="/core/schema-mappings"
              element={
                <Suspense fallback={<LoadingState label="Loading page..." />}>
                  <SchemaMappingManagerPage />
                </Suspense>
              }
            />
            <Route
              path="/core/schema-mappings/edit"
              element={
                <Suspense fallback={<LoadingState label="Loading page..." />}>
                  <SchemaMappingEditorPage />
                </Suspense>
              }
            />
            {moduleRoutes.map((route) => {
              const LazyModulePage = lazy(route.load);
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <Suspense fallback={<LoadingState label="Loading page..." />}>
                      <LazyModulePage />
                    </Suspense>
                  }
                />
              );
            })}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </StrictMode>
  );
}

async function bootstrap() {
  const loaded = await Promise.all(Object.values(moduleEntries).map((load) => load()));
  const moduleRoutes = loaded
    .flatMap((entry) => entry.routes ?? [])
    .filter((route) => Boolean(route.path) && Boolean(route.load));

  renderApp(moduleRoutes);
}

void bootstrap();
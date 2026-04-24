import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@templates/app-shell";
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

const homePageElement = <h1 className="text-2xl font-semibold">Home</h1>;
const modulesPageElement = <h1 className="text-2xl font-semibold">Modules</h1>;

function renderApp(moduleRoutes: ModuleRoute[]) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={homePageElement} />
            <Route path="/modules" element={modulesPageElement} />
            {moduleRoutes.map((route) => {
              const LazyModulePage = lazy(route.load);
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading page...</div>}>
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
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

export function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

export function renderAt(path: string, routes: { path: string; element: ReactElement }[]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );
}

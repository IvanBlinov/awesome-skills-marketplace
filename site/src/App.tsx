import { Link, Route, Routes } from "react-router-dom";
import { useBundle } from "./bundle/useBundle";
import { useCatalog } from "./catalog/useCatalog";
import { SITE_URL } from "./config";
import { ArtifactPage } from "./pages/ArtifactPage";
import { BundlePage } from "./pages/BundlePage";
import { SearchPage } from "./pages/SearchPage";
import { skillRequestUrl } from "./request/issueUrl";

export function AppRoutes() {
  const state = useCatalog();
  const bundle = useBundle();
  const bundleProps = { onAddToBundle: bundle.add, isInBundle: bundle.has };

  return (
    <div className="app">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">✦</span> Awesome Skills Marketplace
        </Link>
        <nav aria-label="Main">
          <Link to="/">Search</Link>
          <Link to="/bundle">Bundle ({bundle.plugins.length})</Link>
        </nav>
      </header>

      <main className="site-main">
        {state.status === "loading" && <p className="muted">Loading the catalog…</p>}
        {state.status === "error" && (
          <p role="alert" className="error">
            {state.error}. Reload the page to try again.
          </p>
        )}
        {state.status === "ready" && state.catalog && (
          <Routes>
            <Route path="/" element={<SearchPage catalog={state.catalog} {...bundleProps} />} />
            <Route path="/a/*" element={<ArtifactPage catalog={state.catalog} {...bundleProps} />} />
            <Route path="/bundle" element={<BundlePage catalog={state.catalog} bundle={bundle} />} />
            <Route
              path="*"
              element={
                <p>
                  Page not found. <Link to="/">Back to search</Link>
                </p>
              }
            />
          </Routes>
        )}
      </main>

      <footer className="site-footer">
        <a href={skillRequestUrl("")} target="_blank" rel="noopener noreferrer">
          Request a skill
        </a>
        <a href={`${SITE_URL}catalog.json`}>catalog.json</a>
        <a href={`${SITE_URL}llms.txt`}>llms.txt</a>
        <a href="https://github.com/IvanBlinov/awesome-skills-marketplace" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}

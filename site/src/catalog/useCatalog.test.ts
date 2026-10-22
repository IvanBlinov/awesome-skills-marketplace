import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "../test/fixtureCatalog";
import { resetCatalogCache, useCatalog } from "./useCatalog";

afterEach(() => {
  vi.unstubAllGlobals();
  resetCatalogCache();
});

describe("useCatalog", () => {
  it("loads the catalog from the site base", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG)));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useCatalog());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.catalog?.artifacts).toHaveLength(CATALOG.artifacts.length);
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}catalog.json`);
  });

  it("fetches only once across hooks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG)));
    vi.stubGlobal("fetch", fetchMock);
    const a = renderHook(() => useCatalog());
    await waitFor(() => expect(a.result.current.status).toBe("ready"));
    const b = renderHook(() => useCatalog());
    expect(b.result.current.status).toBe("ready");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports http errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 404 })));
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(/404/);
  });
});

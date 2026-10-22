import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUNDLE_STORAGE_KEY, useBundle } from "./useBundle";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("useBundle", () => {
  it("adds, removes and clears plugins without duplicates", () => {
    const { result } = renderHook(() => useBundle());
    act(() => result.current.add("beta"));
    act(() => result.current.add("alpha"));
    act(() => result.current.add("alpha"));
    expect(result.current.plugins).toEqual(["alpha", "beta"]);
    expect(result.current.has("alpha")).toBe(true);
    act(() => result.current.remove("alpha"));
    expect(result.current.plugins).toEqual(["beta"]);
    act(() => result.current.clear());
    expect(result.current.plugins).toEqual([]);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useBundle());
    act(() => result.current.add("alpha"));
    expect(JSON.parse(localStorage.getItem(BUNDLE_STORAGE_KEY)!)).toEqual(["alpha"]);
    const again = renderHook(() => useBundle());
    expect(again.result.current.plugins).toEqual(["alpha"]);
  });

  it("replaces the selection", () => {
    const { result } = renderHook(() => useBundle());
    act(() => result.current.add("gamma"));
    act(() => result.current.replace(["beta", "alpha", "beta"]));
    expect(result.current.plugins).toEqual(["alpha", "beta"]);
  });

  it("works when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { result } = renderHook(() => useBundle());
    act(() => result.current.add("alpha"));
    expect(result.current.plugins).toEqual(["alpha"]);
  });

  it("ignores corrupt stored data", () => {
    localStorage.setItem(BUNDLE_STORAGE_KEY, "{not json");
    expect(renderHook(() => useBundle()).result.current.plugins).toEqual([]);
    localStorage.setItem(BUNDLE_STORAGE_KEY, JSON.stringify([1, "ok"]));
    expect(renderHook(() => useBundle()).result.current.plugins).toEqual(["ok"]);
  });
});

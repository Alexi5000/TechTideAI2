import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast } from "./use-toast.js";

describe("useToast", () => {
  it("toast() adds entry with default variant", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast("Hello");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]!.title).toBe("Hello");
    expect(result.current.toasts[0]!.variant).toBe("default");
  });

  it("convenience methods set correct variant", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success("S");
      result.current.error("E");
      result.current.warning("W");
      result.current.info("I");
    });

    const variants = result.current.toasts.map((t) => t.variant);
    expect(variants).toEqual(["success", "error", "warning", "info"]);
  });

  it("dismissToast removes specific toast", () => {
    const { result } = renderHook(() => useToast());
    let firstId: string;

    act(() => {
      firstId = result.current.toast("First");
      result.current.toast("Second");
    });

    expect(result.current.toasts).toHaveLength(2);

    act(() => {
      result.current.dismissToast(firstId!);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]!.title).toBe("Second");
  });

  it("dismissAll clears all toasts", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast("A");
      result.current.toast("B");
      result.current.toast("C");
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.dismissAll();
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});

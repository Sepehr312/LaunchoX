import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  path: "/admin/orders",
  cleanup: undefined as undefined | (() => void),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
  usePathname: () => mocks.path,
}));
vi.mock("react", () => ({
  useEffect: (effect: () => undefined | (() => void)) => {
    mocks.cleanup = effect();
  },
}));
import { AdminOrderRefresh } from "@/components/admin/AdminOrderRefresh";
afterEach(() => {
  mocks.cleanup?.();
  mocks.cleanup = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("refreshes visible order lists and cleans up polling", () => {
  vi.useFakeTimers();
  const document = Object.assign(new EventTarget(), {
    visibilityState: "visible",
  });
  const window = new EventTarget();
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  mocks.path = "/admin/orders";
  AdminOrderRefresh();
  vi.advanceTimersByTime(15000);
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  document.visibilityState = "hidden";
  vi.advanceTimersByTime(15000);
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  document.visibilityState = "visible";
  window.dispatchEvent(new Event("focus"));
  expect(mocks.refresh).toHaveBeenCalledTimes(2);
  mocks.cleanup?.();
  vi.advanceTimersByTime(15000);
  window.dispatchEvent(new Event("focus"));
  expect(mocks.refresh).toHaveBeenCalledTimes(2);
});
it("does not refresh editable admin pages", () => {
  vi.useFakeTimers();
  mocks.path = "/admin/products/new";
  AdminOrderRefresh();
  vi.advanceTimersByTime(30000);
  expect(mocks.refresh).not.toHaveBeenCalled();
});

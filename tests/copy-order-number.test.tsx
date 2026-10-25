import { Children, isValidElement, type ReactElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CopyOrderNumber } from "@/components/customer/CopyOrderNumber";

const state = vi.hoisted(() => ({
  setStatus: vi.fn(),
  numberNode: {},
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: () => ["", state.setStatus],
  useEffect: vi.fn(),
  useRef: () => ({ current: state.numberNode }),
}));

function clickCopy() {
  const control = CopyOrderNumber({ number: "LX-100007" });
  const button = Children.toArray(control.props.children).find(
    (child): child is ReactElement<{ onClick: () => Promise<void> }> =>
      isValidElement(child) && child.type === "button",
  );
  if (!button) throw new Error("Copy button was not rendered");
  return button.props.onClick();
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

it("reports success only after writing the original order number", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  await clickCopy();
  expect(writeText).toHaveBeenCalledWith("LX-100007");
  expect(state.setStatus).toHaveBeenCalledExactlyOnceWith("copied");
});

it.each(["missing", "rejected"])(
  "selects only the number when clipboard access is %s",
  async (mode) => {
    vi.stubGlobal(
      "navigator",
      mode === "missing"
        ? {}
        : {
            clipboard: {
              writeText: vi.fn().mockRejectedValue(new Error("Denied")),
            },
          },
    );
    const range = { selectNodeContents: vi.fn() };
    const selection = { removeAllRanges: vi.fn(), addRange: vi.fn() };
    vi.stubGlobal("window", { getSelection: () => selection });
    vi.stubGlobal("document", { createRange: () => range });
    await clickCopy();
    expect(range.selectNodeContents).toHaveBeenCalledExactlyOnceWith(
      state.numberNode,
    );
    expect(selection.removeAllRanges).toHaveBeenCalledOnce();
    expect(selection.addRange).toHaveBeenCalledExactlyOnceWith(range);
    expect(state.setStatus).toHaveBeenCalledExactlyOnceWith("selected");
  },
);

it.each(["missing", "throws"])(
  "reports manual-copy guidance when selection is %s without claiming success",
  async (mode) => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", {
      getSelection: () => {
        if (mode === "throws") throw new Error("Selection unavailable");
        return null;
      },
    });
    await clickCopy();
    expect(state.setStatus).toHaveBeenCalledExactlyOnceWith("error");
  },
);

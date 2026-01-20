import { describe, test, expect, mock, spyOn, beforeEach, afterEach } from "bun:test";
import * as p from "@clack/prompts";

describe("prompts", () => {
  let originalExit: typeof process.exit;
  let exitMock: ReturnType<typeof mock>;

  beforeEach(() => {
    originalExit = process.exit;
    exitMock = mock(() => {
      throw new Error("process.exit called");
    });
    process.exit = exitMock as unknown as typeof process.exit;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe("handleCancel", () => {
    test("should call process.exit(0) when value is a cancel symbol", async () => {
      const { handleCancel } = await import("./prompts");
      const cancelValue = Symbol.for("clack:cancel");

      const isCancel = spyOn(p, "isCancel").mockReturnValue(true);
      const cancel = spyOn(p, "cancel").mockImplementation(() => {});

      try {
        handleCancel(cancelValue);
      } catch (e) {}

      expect(isCancel).toHaveBeenCalledWith(cancelValue);
      expect(cancel).toHaveBeenCalledWith("Operation cancelled.");
      expect(exitMock).toHaveBeenCalledWith(0);

      isCancel.mockRestore();
      cancel.mockRestore();
    });

    test("should not exit when value is not a cancel symbol", async () => {
      const { handleCancel } = await import("./prompts");
      const normalValue = "some value";

      const isCancel = spyOn(p, "isCancel").mockReturnValue(false);

      handleCancel(normalValue);

      expect(isCancel).toHaveBeenCalledWith(normalValue);
      expect(exitMock).not.toHaveBeenCalled();

      isCancel.mockRestore();
    });
  });

  describe("promptText", () => {
    test("should return text value when user provides input", async () => {
      const { promptText } = await import("./prompts");
      const expectedValue = "user input";

      const textMock = spyOn(p, "text").mockResolvedValue(expectedValue);
      const isCancel = spyOn(p, "isCancel").mockReturnValue(false);

      const result = await promptText({ message: "Enter text:" });

      expect(result).toBe(expectedValue);
      expect(textMock).toHaveBeenCalledWith({ message: "Enter text:" });

      textMock.mockRestore();
      isCancel.mockRestore();
    });

    test("should exit when user cancels text prompt", async () => {
      const { promptText } = await import("./prompts");
      const cancelSymbol = Symbol.for("clack:cancel");

      const textMock = spyOn(p, "text").mockResolvedValue(cancelSymbol);
      const isCancel = spyOn(p, "isCancel").mockReturnValue(true);
      const cancel = spyOn(p, "cancel").mockImplementation(() => {});

      try {
        await promptText({ message: "Enter text:" });
      } catch (e) {}

      expect(exitMock).toHaveBeenCalledWith(0);

      textMock.mockRestore();
      isCancel.mockRestore();
      cancel.mockRestore();
    });
  });

  describe("promptConfirm", () => {
    test("should return true when user confirms", async () => {
      const { promptConfirm } = await import("./prompts");

      const confirmMock = spyOn(p, "confirm").mockResolvedValue(true);
      const isCancel = spyOn(p, "isCancel").mockReturnValue(false);

      const result = await promptConfirm({ message: "Confirm?" });

      expect(result).toBe(true);
      expect(confirmMock).toHaveBeenCalledWith({ message: "Confirm?" });

      confirmMock.mockRestore();
      isCancel.mockRestore();
    });

    test("should return false when user declines", async () => {
      const { promptConfirm } = await import("./prompts");

      const confirmMock = spyOn(p, "confirm").mockResolvedValue(false);
      const isCancel = spyOn(p, "isCancel").mockReturnValue(false);

      const result = await promptConfirm({ message: "Confirm?" });

      expect(result).toBe(false);

      confirmMock.mockRestore();
      isCancel.mockRestore();
    });

    test("should exit when user cancels confirm prompt", async () => {
      const { promptConfirm } = await import("./prompts");
      const cancelSymbol = Symbol.for("clack:cancel");

      const confirmMock = spyOn(p, "confirm").mockResolvedValue(cancelSymbol);
      const isCancel = spyOn(p, "isCancel").mockReturnValue(true);
      const cancel = spyOn(p, "cancel").mockImplementation(() => {});

      try {
        await promptConfirm({ message: "Confirm?" });
      } catch (e) {}

      expect(exitMock).toHaveBeenCalledWith(0);

      confirmMock.mockRestore();
      isCancel.mockRestore();
      cancel.mockRestore();
    });
  });

  describe("promptSelect", () => {
    test("should return selected value", async () => {
      const { promptSelect } = await import("./prompts");

      const selectMock = spyOn(p, "select").mockResolvedValue("option1");
      const isCancel = spyOn(p, "isCancel").mockReturnValue(false);

      const result = await promptSelect<"option1" | "option2">({
        message: "Select:",
        options: [
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ],
      });

      expect(result).toBe("option1");

      selectMock.mockRestore();
      isCancel.mockRestore();
    });

    test("should exit when user cancels select prompt", async () => {
      const { promptSelect } = await import("./prompts");
      const cancelSymbol = Symbol.for("clack:cancel");

      const selectMock = spyOn(p, "select").mockResolvedValue(cancelSymbol);
      const isCancel = spyOn(p, "isCancel").mockReturnValue(true);
      const cancel = spyOn(p, "cancel").mockImplementation(() => {});

      try {
        await promptSelect({
          message: "Select:",
          options: [{ value: "option1", label: "Option 1" }],
        });
      } catch (e) {}

      expect(exitMock).toHaveBeenCalledWith(0);

      selectMock.mockRestore();
      isCancel.mockRestore();
      cancel.mockRestore();
    });
  });
});

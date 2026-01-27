import { describe, test, expect, mock, spyOn, beforeEach, afterEach } from "bun:test";
import * as ui from "../components/ui.tsx";

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
      const cancelValue = ui.CANCEL_SYMBOL;

      const cancelMock = spyOn(ui, "cancel").mockImplementation(() => {});

      try {
        handleCancel(cancelValue);
      } catch (e) {}

      expect(cancelMock).toHaveBeenCalledWith("Operation cancelled.");
      expect(exitMock).toHaveBeenCalledWith(0);

      cancelMock.mockRestore();
    });

    test("should not exit when value is not a cancel symbol", async () => {
      const { handleCancel } = await import("./prompts");
      const normalValue = "some value";

      handleCancel(normalValue);

      expect(exitMock).not.toHaveBeenCalled();
    });
  });

  describe("promptText", () => {
    test("should return text value when user provides input", async () => {
      const { promptText } = await import("./prompts");
      const expectedValue = "user input";

      const textMock = spyOn(ui, "text").mockResolvedValue(expectedValue);

      const result = await promptText({ message: "Enter text:" });

      expect(result).toBe(expectedValue);
      expect(textMock).toHaveBeenCalledWith({ message: "Enter text:" });

      textMock.mockRestore();
    });

    test("should exit when user cancels text prompt", async () => {
      const { promptText } = await import("./prompts");

      const textMock = spyOn(ui, "text").mockResolvedValue(ui.CANCEL_SYMBOL);
      const cancelMock = spyOn(ui, "cancel").mockImplementation(() => {});

      try {
        await promptText({ message: "Enter text:" });
      } catch (e) {}

      expect(exitMock).toHaveBeenCalledWith(0);

      textMock.mockRestore();
      cancelMock.mockRestore();
    });
  });

  describe("promptConfirm", () => {
    test("should return true when user confirms", async () => {
      const { promptConfirm } = await import("./prompts");

      const confirmMock = spyOn(ui, "confirm").mockResolvedValue(true);

      const result = await promptConfirm({ message: "Confirm?" });

      expect(result).toBe(true);
      expect(confirmMock).toHaveBeenCalledWith({ message: "Confirm?" });

      confirmMock.mockRestore();
    });

    test("should return false when user declines", async () => {
      const { promptConfirm } = await import("./prompts");

      const confirmMock = spyOn(ui, "confirm").mockResolvedValue(false);

      const result = await promptConfirm({ message: "Confirm?" });

      expect(result).toBe(false);

      confirmMock.mockRestore();
    });

    test("should exit when user cancels confirm prompt", async () => {
      const { promptConfirm } = await import("./prompts");

      const confirmMock = spyOn(ui, "confirm").mockResolvedValue(ui.CANCEL_SYMBOL);
      const cancelMock = spyOn(ui, "cancel").mockImplementation(() => {});

      try {
        await promptConfirm({ message: "Confirm?" });
      } catch (e) {}

      expect(exitMock).toHaveBeenCalledWith(0);

      confirmMock.mockRestore();
      cancelMock.mockRestore();
    });
  });

  describe("promptSelect", () => {
    test("should return selected value", async () => {
      const { promptSelect } = await import("./prompts");

      const selectMock = spyOn(ui, "select").mockResolvedValue("option1");

      const result = await promptSelect<"option1" | "option2">({
        message: "Select:",
        options: [
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ],
      });

      expect(result).toBe("option1");

      selectMock.mockRestore();
    });

    test("should exit when user cancels select prompt", async () => {
      const { promptSelect } = await import("./prompts");

      const selectMock = spyOn(ui, "select").mockResolvedValue(ui.CANCEL_SYMBOL);
      const cancelMock = spyOn(ui, "cancel").mockImplementation(() => {});

      try {
        await promptSelect({
          message: "Select:",
          options: [{ value: "option1", label: "Option 1" }],
        });
      } catch (e) {}

      expect(exitMock).toHaveBeenCalledWith(0);

      selectMock.mockRestore();
      cancelMock.mockRestore();
    });
  });

  describe("promptMultiselect", () => {
    test("should return selected values", async () => {
      const { promptMultiselect } = await import("./prompts");

      const multiselectMock = spyOn(ui, "multiselect").mockResolvedValue(["option1", "option2"]);

      const result = await promptMultiselect<string>({
        message: "Select:",
        options: [
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ],
      });

      expect(result).toEqual(["option1", "option2"]);

      multiselectMock.mockRestore();
    });

    test("should exit when user cancels multiselect prompt", async () => {
      const { promptMultiselect } = await import("./prompts");

      const multiselectMock = spyOn(ui, "multiselect").mockResolvedValue(ui.CANCEL_SYMBOL);
      const cancelMock = spyOn(ui, "cancel").mockImplementation(() => {});

      try {
        await promptMultiselect({
          message: "Select:",
          options: [{ value: "option1", label: "Option 1" }],
        });
      } catch (e) {}

      expect(exitMock).toHaveBeenCalledWith(0);

      multiselectMock.mockRestore();
      cancelMock.mockRestore();
    });
  });
});

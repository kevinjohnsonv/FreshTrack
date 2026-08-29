import { recentAnomalies, setWss, shouldAlert, broadcast } from "../src/app.js";
import { describe, test, expect, vi } from "vitest";

describe("showAnomalies", () => {
  test("new restaurant added anomaly", () => {
    expect(shouldAlert("New Restaurant")).toBe(true);
  });
  test("add new anomaly within time range", () => {
    recentAnomalies.set("Test Restaurant 1234", new Date());
    expect(shouldAlert("Test Restaurant 1234")).toBe(false);
  });
  test("restaurant with anomaly outside of recent range", () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - 45);

    recentAnomalies.set("Old Anomaly Restaurant", date);
    expect(shouldAlert("Old Anomaly Restaurant")).toBe(true);
  });
});

describe("broadcast", () => {
  const fakeClient1 = { readyState: WebSocket.OPEN, send: vi.fn() };
  const fakeClient2 = { readyState: WebSocket.CLOSED, send: vi.fn() };

  const fakeWss = { clients: [fakeClient1, fakeClient2] };
  test("broadcast sent to open and closed connection", () => {
    setWss(fakeWss as any);

    broadcast("Test String!!", "moderate");

    expect(fakeClient1.send).toHaveBeenCalled();
    expect(fakeClient2.send).not.toHaveBeenCalled();
  });
});

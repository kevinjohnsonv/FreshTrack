import express from "express";
import { WebSocketServer, WebSocket } from "ws";

const INTERVAL_MIN = 30;
const CHECK_INTERVAL_MS = 60 * 1000;

interface Anomaly {
  restraunt: string;
  recent_issues: number;
  baseline_issues: number;
}

const port = 1234;
const wss = new WebSocketServer({ port, host: "0.0.0.0" });

wss.on("connection", (ws) => {
  ws.send("Client connected!");
});

function broadcast(data: Anomaly) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data));
  });
}

const recentAnomalies = new Map<string, Date>();

const app = express();

async function checkAnomalies() {
  const response = await fetch("http://ingestion-service:8000/anomalies");
  const anomalies = (await response.json()) as Anomaly[];

  anomalies.forEach((anomaly: Anomaly) => {
    const intervalMilSec = INTERVAL_MIN * 60 * 1000;
    const currentTime = new Date();

    const lastAlertTime = recentAnomalies.get(anomaly.restraunt);

    if (
      !lastAlertTime ||
      currentTime.getTime() - lastAlertTime.getTime() > intervalMilSec
    ) {
      broadcast(anomaly);

      recentAnomalies.set(anomaly.restraunt, new Date());
    }
  });

  return anomalies;
}

app.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

app.get("/check-anomalies", async (req, res) => {
  const anomalies = await checkAnomalies();

  res.send(anomalies);
});

setInterval(checkAnomalies, CHECK_INTERVAL_MS);

app.listen(3000);

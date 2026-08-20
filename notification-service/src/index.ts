import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const INTERVAL_MIN = 30;
const CHECK_INTERVAL_MS = 60 * 1000;

interface Anomaly {
  restaurant: string;
  recent_issues: number;
  baseline_issues: number;
  baseline_rate_30min: number;
}

const port = 1234;
const wss = new WebSocketServer({ port });

wss.on("connection", (ws) => {
  ws.send("Client connected!");
});

function broadcast(data: string) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data));
  });
}

const recentAnomalies = new Map<string, Date>();
const app = express();

const anthropicClient = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

async function checkAnomalies() {
  const response = await fetch("http://ingestion-service:8000/anomalies");
  const anomalies = (await response.json()) as Anomaly[];

  for (const anomaly of anomalies) {
    const intervalMilSec = INTERVAL_MIN * 60 * 1000;
    const currentTime = new Date();

    const lastAlertTime = recentAnomalies.get(anomaly.restaurant);

    if (
      !lastAlertTime ||
      currentTime.getTime() - lastAlertTime.getTime() > intervalMilSec
    ) {
      const message = await anthropicClient.messages.create({
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Respond in one simple sentence for an operational notification system, alerting about unusual issue activity at a restaurant. Start the sentence with the restaurant name. No markdown, no headers, no emojis, no use of the word "anomaly". Always state the recent issue count (last 30 minutes) and compare it directly to the baseline rate, phrased like "X issues in the last 30 minutes, well above the normal rate of Y". Do not mention the total baseline issue count over the full day, only the 30-minute baseline rate.
            
                Restaurant: ${anomaly.restaurant}
                Recent issues (last 30 min): ${anomaly.recent_issues}
                Baseline rate (per 30 min): ${anomaly.baseline_rate_30min}`,
          },
        ],
        model: "claude-haiku-4-5-20251001",
      });

      const block = message.content[0];
      const claudeTextResponse =
        block && block.type === "text" ? block.text : "";
      broadcast(claudeTextResponse);

      recentAnomalies.set(anomaly.restaurant, new Date());
    }
  }

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

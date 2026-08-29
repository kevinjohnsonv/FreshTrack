import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";

dotenv.config();

export const INTERVAL_MIN = 30;
export const CHECK_INTERVAL_MS = 60 * 1000;

export interface Anomaly {
  restaurant: string;
  recent_issues: number;
  baseline_issues: number;
  baseline_rate_30min: number;
}

type severityLevel = "mild" | "moderate" | "severe";

export const recentAnomalies = new Map<string, Date>();

let wss: WebSocketServer | null = null;

export function setWss(server: WebSocketServer) {
  wss = server;
}

export function broadcast(data: string, severityLevel: severityLevel) {
  if (!wss) return;
  const payload = { message: data, severity: severityLevel };
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify(payload));
  });
}

const anthropicClient = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

export function shouldAlert(restaurant: string): boolean {
  const intervalMilSec = INTERVAL_MIN * 60 * 1000;
  const currentTime = new Date();
  const lastAlertTime = recentAnomalies.get(restaurant);

  return (
    !lastAlertTime ||
    currentTime.getTime() - lastAlertTime.getTime() > intervalMilSec
  );
}

export async function checkAnomalies() {
  const response = await fetch("http://ingestion-service:8000/anomalies");
  const anomalies = (await response.json()) as Anomaly[];

  for (const anomaly of anomalies) {
    if (shouldAlert(anomaly.restaurant)) {
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
      let anomalySeverityLevel: severityLevel = "mild";
      if (anomaly.recent_issues > 1 && anomaly.recent_issues < 4) {
        anomalySeverityLevel = "moderate";
      } else if (anomaly.recent_issues >= 4) {
        anomalySeverityLevel = "severe";
      }
      broadcast(claudeTextResponse, anomalySeverityLevel);
      await postAlert(
        claudeTextResponse,
        anomalySeverityLevel,
        anomaly.restaurant,
      );

      recentAnomalies.set(anomaly.restaurant, new Date());
    }
  }

  return anomalies;
}

const postAlert = async (
  claudeMessage: string,
  severityLevel: string,
  restaurantName: string,
) => {
  const payload = {
    message: claudeMessage,
    severity: severityLevel,
    restaurant: restaurantName,
    time: new Date(),
  };
  try {
    await fetch("http://ingestion-service:8000/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.log(e);
  }
};

export const app = express();

app.use(cors({ origin: "http://localhost:5173" }));

app.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

app.get("/check-anomalies", async (req, res) => {
  const anomalies = await checkAnomalies();
  res.send(anomalies);
});

app.get("/recent-anomalies", async (req, res) => {
  res.send(Array.from(recentAnomalies.entries()));
});

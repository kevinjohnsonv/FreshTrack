import express from "express";

interface Anomaly {
  restraunt: string;
  recent_issues: number;
  baseline_issues: number;
}

const recentAnomalies = new Map<string, Date>();

const INTERVAL_MIN = 30;

const app = express();

app.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

app.get("/check-anomalies", async (req, res) => {
  const response = await fetch("http://localhost:8000/anomalies");
  const anomalies = (await response.json()) as Anomaly[];

  anomalies.forEach((anomaly: Anomaly) => {
    const intervalMilSec = INTERVAL_MIN * 60 * 1000;
    const currentTime = new Date();

    const lastAlertTime = recentAnomalies.get(anomaly.restraunt);

    if (
      !lastAlertTime ||
      currentTime.getTime() - lastAlertTime.getTime() > intervalMilSec
    ) {
      console.log("ALERT:", anomaly);

      recentAnomalies.set(anomaly.restraunt, new Date());
    }
  });

  res.send(anomalies);
});

app.listen(3000);

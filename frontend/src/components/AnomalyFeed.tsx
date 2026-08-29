import { useEffect, useState } from "react";

interface AnomalyMessage {
  id: string;
  message: string;
  time: Date;
  severity: string;
}

interface AlertRow {
  message: string;
  restaurant: string;
  severity: string;
  created_at: string;
}

type ConnectionStatus = "Connected" | "Disconnected";

const severityColor = {
  mild: "border-l-yellow-500",
  moderate: "border-l-orange-500",
  severe: "border-l-red-500",
};

export const AnomalyFeed = () => {
  const [anomalies, setAnomalies] = useState<AnomalyMessage[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("Disconnected");
  const [, setTick] = useState(0);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:1234");

    socket.onopen = () => {
      console.log("WebSocket connection made");
      setConnectionStatus("Connected");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setAnomalies((prev) => [
          {
            id: crypto.randomUUID(),
            message: payload.message,
            time: new Date(),
            severity: payload.severity,
          },
          ...prev,
        ]);
      } catch (e) {
        console.log(e + " " + event.data);
      }
    };

    socket.onclose = () => {
      setConnectionStatus("Disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const getAlerts = async () => {
      try {
        const response = await fetch("http://localhost:8000/alerts");

        if (response.ok) {
          const data = await response.json();

          const transformed: AnomalyMessage[] = data.map((row: AlertRow) => ({
            id: crypto.randomUUID(),
            message: row.message,
            time: new Date(row.created_at),
            severity: row.severity,
          }));
          if (!ignore) {
            setAnomalies((prev) => {
              const merged = [...transformed, ...prev];
              return merged.sort((a, b) => b.time.getTime() - a.time.getTime());
            });
          }
        }
      } catch (e) {
        console.log(e);
      }
    };

    getAlerts();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTick((tick) => tick + 1);
    }, 15000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const getRelativeTime = (time: Date) => {
    const now = new Date();

    const diffInMs = now.getTime() - time.getTime();

    const totalMin = diffInMs / (60 * 1000);

    if (totalMin >= 1) {
      const minAgo = Math.floor(totalMin);

      if (minAgo === 1) {
        return `${minAgo} minute ago`;
      }
      return `${minAgo} minutes ago`;
    } else {
      const totalSec = diffInMs / 1000;
      const secAgo = Math.floor(totalSec);

      if (secAgo === 0) {
        return `Just Now`;
      } else if (secAgo === 1) {
        return `${secAgo} second ago`;
      }
      return `${secAgo} seconds ago`;
    }
  };
  return (
    <div className="flex flex-col gap-2 w-md h-2/3 p-10">
      <div className="flex items-center justify-between pb-3 px-1">
        <h3>Alerts</h3>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${connectionStatus === "Connected" ? "bg-green-500" : "bg-red-500"}`}
          />
          {connectionStatus}
        </div>
      </div>
      <ul className=" overflow-auto">
        {anomalies.map((anomaly) => (
          <li
            key={anomaly.id}
            className={`text-[14px] p-1.5 border-16 border-r-0 border-t-0 border-b-0 ${severityColor[anomaly.severity as keyof typeof severityColor]}`}
          >
            {getRelativeTime(anomaly.time)} - {anomaly.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

import { useEffect, useState } from "react";

interface AnomalyMessage {
  id: string;
  message: string;
  time: string;
}

type ConnectionStatus = "Connected" | "Disconnected";

export const AnomalyFeed = () => {
  const [anomalies, setAnomalies] = useState<AnomalyMessage[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("Disconnected");

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:1234");

    socket.onopen = () => {
      console.log("WebSocket connection made");
      setConnectionStatus("Connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setAnomalies((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            message: data,
            time: new Date().toLocaleTimeString([], { hour12: false }),
          },
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
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3>Alerts</h3>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${connectionStatus === "Connected" ? "bg-green-500" : "bg-red-500"}`}
          />
          {connectionStatus}
        </div>
      </div>
      <ul className="max-h-64 h-64 overflow-auto">
        {anomalies.map((anomaly) => (
          <li key={anomaly.id} className="text-[14px] border p-1.5">
            {anomaly.time} {anomaly.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

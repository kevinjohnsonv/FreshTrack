import { useState, useEffect } from "react";
const RecentAnomalyKPIFeed = () => {
  const [recentAnomalies, setRecentAnomalies] = useState<[string, string][]>(
    [],
  );

  useEffect(() => {
    const getRecentAnomalies = async () => {
      try {
        const response = await fetch("http://localhost:3000/recent-anomalies");

        if (response.ok) {
          const data = await response.json();
          setRecentAnomalies(data);
        }
      } catch (e) {
        console.log(e);
      }
    };
    getRecentAnomalies();
    const intervalId = setInterval(getRecentAnomalies, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const convertTime = (time: string) => {
    return new Date(time).toLocaleTimeString();
  };

  return (
    <div className="flex flex-col gap-2 min-h-30">
      <div>Recent Alerts</div>
      <ul className="flex gap-4 overflow-x-auto min-w-5xl">
        {recentAnomalies.length > 0 &&
          recentAnomalies.toReversed().map(([restaurant, time]) => (
            <li key={restaurant} className="w-40 h-20 bg-card p-4 shrink-0">
              <div className="font-bold">{restaurant}</div>
              <div>{convertTime(time)}</div>
            </li>
          ))}
        {recentAnomalies.length === 0 && (
          <div className="pl-2">No recent alerts</div>
        )}
      </ul>
    </div>
  );
};

export default RecentAnomalyKPIFeed;

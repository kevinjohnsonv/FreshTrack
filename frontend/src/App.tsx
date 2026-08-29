import { useState, useEffect } from "react";
import RestaurantSummaries from "./components/RestaurantSummaries";
import { AnomalyFeed } from "./components/AnomalyFeed";
import RecentAnomalyKPIFeed from "./components/RecentAnomalyKPIFeed";

interface Summary {
  restaurant: string;
  order_count: number;
}

const App = () => {
  const [restaurantSummaries, setRestaurantSummaries] = useState<Summary[]>([]);

  useEffect(() => {
    const getSummaries = async () => {
      try {
        const response = await fetch("http://localhost:8000/summary");

        if (response.ok) {
          const data: Summary[] = await response.json();

          setRestaurantSummaries(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    getSummaries();
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col max-w-6xl h-2/3 p-10 gap-6">
        <h2 className=" text-xl">FreshTrack</h2>
        <RecentAnomalyKPIFeed />
        <RestaurantSummaries summaries={restaurantSummaries} />
      </div>
      <AnomalyFeed />
    </div>
  );
};

export default App;

import { useState, useEffect } from "react";
import RestaurantSummaries from "./components/RestaurantSummaries";
import { AnomalyFeed } from "./components/AnomalyFeed";

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
      <div className="flex flex-col w-6xl p-10 gap-6">
        <h2 className="font-bold text-xl">FreshTrack</h2>
        <AnomalyFeed />
        <RestaurantSummaries summaries={restaurantSummaries} />
      </div>
    </div>
  );
};

export default App;

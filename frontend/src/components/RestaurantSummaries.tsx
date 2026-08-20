interface Summary {
  restaurant: string;
  order_count: number;
}

interface Props {
  summaries: Summary[];
}

const RestaurantSummaries = ({ summaries }: Props) => {
  return (
    <div>
      <h2 className="pb-2">Past Hour Order Count</h2>
      <ul className="h-60 max-h-60 overflow-auto">
        {summaries.map((summary) => (
          <li key={summary.restaurant} className="text-[12px] px-2">
            {summary.restaurant + " Orders: " + summary.order_count}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RestaurantSummaries;

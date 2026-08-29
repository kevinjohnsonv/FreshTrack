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
      <ul className="h-72 max-h-72 overflow-auto flex flex-col gap-1">
        {summaries.map((summary) => (
          <li key={summary.restaurant} className="text-[16px] px-2">
            {summary.restaurant + " Orders: " + summary.order_count}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RestaurantSummaries;

// Sections a destination's travel plan can contain, in display order.
// Admins pick one of these per content item; the plan page groups by it.
const TRAVEL_CATEGORIES = [
  { key: "overview",        label: "Overview" },
  { key: "how_to_reach",    label: "How to Reach" },
  { key: "bus",             label: "Bus" },
  { key: "train",           label: "Train" },
  { key: "flight",          label: "Flight" },
  { key: "hotel",           label: "Hotels" },
  { key: "bike_rental",     label: "Bike Rental" },
  { key: "car_rental",      label: "Car Rental" },
  { key: "local_transport", label: "Local Transport" },
  { key: "guide",           label: "Local Guide" },
  { key: "restaurant",      label: "Restaurants" },
  { key: "places",          label: "Places to Visit" },
  { key: "expenses",        label: "Estimated Expenses" },
  { key: "itinerary",       label: "Day-by-Day Itinerary" },
  { key: "other",           label: "Other Services" },
];

module.exports = {
  TRAVEL_CATEGORIES,
  CATEGORY_KEYS: TRAVEL_CATEGORIES.map((c) => c.key),
};

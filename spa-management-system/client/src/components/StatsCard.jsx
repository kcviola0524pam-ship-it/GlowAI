export default function StatsCard({ title, value }) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-gray-600 text-sm">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

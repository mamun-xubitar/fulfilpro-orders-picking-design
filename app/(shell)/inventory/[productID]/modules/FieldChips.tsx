export default function FieldChips({ values }: { values: string[] }) {
  if (values.length === 0) return <span className="text-sm text-gray-500">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span key={value} className="bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5">{value}</span>
      ))}
    </div>
  );
}

export default function StaffTable({ staff, onEdit, onDelete }) {
  return (
    <table className="w-full border-collapse border">
      <thead className="bg-gray-200">
        <tr>
          <th className="border p-2">Name</th>
          <th className="border p-2">Role</th>
          <th className="border p-2">Username</th>
          <th className="border p-2">Actions</th>
        </tr>
      </thead>

      <tbody>
        {staff.map((s) => (
          <tr key={s.id}>
            <td className="border p-2">{s.name}</td>
            <td className="border p-2">{s.role}</td>
            <td className="border p-2">{s.username}</td>

            <td className="border p-2">
              <button
                onClick={() => onEdit(s)}
                className="px-2 py-1 bg-blue-500 text-white mr-1"
              >
                Edit
              </button>

              <button
                onClick={() => onDelete(s.id)}
                className="px-2 py-1 bg-red-500 text-white"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

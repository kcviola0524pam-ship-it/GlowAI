import { useState } from "react";
import QRCode from "react-qr-code";

export default function QRGenerator() {
  const [value, setValue] = useState("CUSTOMER-ID-123");

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-lg font-bold">QR Code</h2>
      <QRCode value={value} size={200} />

      <input
        className="mt-4 p-2 border"
        placeholder="Enter Customer ID"
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
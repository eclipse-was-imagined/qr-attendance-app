"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { QRCodeCanvas } from "qrcode.react";

const ALLOWED_RADIUS = 50; // meters (students must be within this)

export default function TeacherPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [qrValue, setQrValue] = useState<string | null>(null);

  const handleLogin = async () => {
    setStatus("Logging in...");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    if (data.session) {
      setLoggedIn(true);
      setStatus("");
    }
  };

  const generateQR = async () => {
    setStatus("Getting location...");

    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
      })
    );

    const teacherLat = position.coords.latitude;
    const teacherLng = position.coords.longitude;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      setStatus("Not logged in");
      return;
    }

    const token = Math.random().toString(36).substring(2, 12);
    const expiry = Date.now() + 2 * 60 * 1000; // 2 min

    // token|expiry|teacherEmail|lat|lng
    const payload = `${token}|${expiry}|${user.email}|${teacherLat}|${teacherLng}`;

    setQrValue(payload);
    setStatus("");
  };

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg w-80 space-y-4">
          <h1 className="text-2xl font-bold text-white text-center">
            Teacher Login
          </h1>

          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 rounded bg-slate-700 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 rounded bg-slate-700 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Login
          </button>

          {status && <p className="text-red-400 text-sm">{status}</p>}
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
      <button
        onClick={generateQR}
        className="bg-green-600 text-white px-6 py-2 rounded"
      >
        Generate QR
      </button>

      {qrValue && (
        <div className="bg-white p-4 rounded">
          <QRCodeCanvas value={qrValue} size={220} />
        </div>
      )}

      {status && <p className="text-red-400">{status}</p>}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../../lib/supabase";

export default function TeacherPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [status, setStatus] = useState("");

  // Check session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true);
    });
  }, []);

  const generateQR = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setStatus("Not logged in ❌");
      return;
    }

    const token = crypto.randomUUID();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    // token | expiry | teacherEmail
    const payload = `${token}|${expiry}|${user.email}`;

    setQrValue(payload);
    setStatus("QR generated (valid for 2 minutes)");
  };

  /* ===== LOGIN ===== */
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
            onClick={async () => {
              setStatus("Logging in...");
              const { data, error } =
                await supabase.auth.signInWithPassword({
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
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            Login
          </button>

          {status && (
            <p className="text-red-400 text-center text-sm">
              {status}
            </p>
          )}
        </div>
      </main>
    );
  }

  /* ===== DASHBOARD ===== */
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold text-white">
        Teacher Dashboard
      </h1>

      {!qrValue && (
        <button
          onClick={generateQR}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          Generate Attendance QR
        </button>
      )}

      {qrValue && (
        <div className="bg-white p-6 rounded-lg flex flex-col items-center gap-4">
          <QRCodeCanvas value={qrValue} size={240} />
          <p className="text-black text-sm font-medium">
            Students scan this QR
          </p>
          <p className="text-gray-600 text-xs">
            Expires in 5 minutes
          </p>

          <button
            onClick={() => setQrValue("")}
            className="text-blue-600 text-sm underline"
          >
            Generate new QR
          </button>
        </div>
      )}

      {status && (
        <p className="text-green-400 text-sm">
          {status}
        </p>
      )}

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          setLoggedIn(false);
          setQrValue("");
        }}
        className="text-slate-400 text-sm mt-6"
      >
        Logout
      </button>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../../lib/supabase";

export default function TeacherPage() {
  const [facultyId, setFacultyId] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [status, setStatus] = useState("");

  /* ===== LOGIN CHECK ===== */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true);
    });
  }, []);

  /* ===== DYNAMIC QR (every 10 sec) ===== */
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      const payload = JSON.stringify({
        session_id: sessionId,
        t: Date.now(),
      });

      setQrValue(payload);
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionId]);

  /* ===== CREATE SESSION ===== */
  const startSession = async () => {
    if (!facultyId) {
      setStatus("Faculty ID missing ❌");
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert({ faculty_id: facultyId })
      .select()
      .single();

    if (error) {
      setStatus(error.message);
      return;
    }

    setSessionId(data.id);
    setStatus("Attendance session started ✅");
  };

  /* ===== LOGIN PAGE ===== */
  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg w-80 space-y-4">
          <h1 className="text-2xl font-bold text-white text-center">
            Faculty Login
          </h1>

          <input
            type="text"
            placeholder="Faculty ID"
            className="w-full p-2 rounded bg-slate-700 text-white"
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
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
                  email: `${facultyId}@faculty.local`,
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
        Faculty Dashboard
      </h1>

      {!sessionId && (
        <button
          onClick={startSession}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          Start Attendance Session
        </button>
      )}

      {sessionId && (
        <div className="bg-white p-6 rounded-lg flex flex-col items-center gap-4">
          <QRCodeCanvas value={qrValue} size={240} />
          <p className="text-black text-sm font-medium">
            QR refreshes every 10 seconds
          </p>
          <p className="text-gray-600 text-xs">
            Session ID: {sessionId}
          </p>

          <button
            onClick={() => {
              setSessionId(null);
              setQrValue("");
            }}
            className="text-red-600 text-sm underline"
          >
            End Session
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
          setSessionId(null);
          setQrValue("");
        }}
        className="text-slate-400 text-sm mt-6"
      >
        Logout
      </button>
    </main>
  );
}

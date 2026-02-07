"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../../lib/supabase";

export default function TeacherPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      setQrValue(
        JSON.stringify({
          session_id: sessionId,
          t: Date.now(),
        })
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const loginTeacher = async () => {
    setStatus("Logging in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    const { data } = await supabase
      .from("teachers")
      .select("*")
      .eq("email", email)
      .eq("faculty_id", facultyId)
      .single();

    if (!data) {
      setStatus("Faculty ID does not match email ❌");
      return;
    }

    setLoggedIn(true);
    setStatus("");
  };

  const startSession = async () => {
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

          <input
            type="text"
            placeholder="Faculty ID"
            className="w-full p-2 rounded bg-slate-700 text-white"
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
          />

          <button
            onClick={loginTeacher}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            Login
          </button>

          {status && (
            <p className="text-red-400 text-center text-sm">{status}</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold text-white">
        Teacher Dashboard
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
          <p className="text-black text-sm">
            QR refreshes every 10 seconds
          </p>
        </div>
      )}

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          setLoggedIn(false);
        }}
        className="text-slate-400 text-sm"
      >
        Logout
      </button>
    </main>
  );
}

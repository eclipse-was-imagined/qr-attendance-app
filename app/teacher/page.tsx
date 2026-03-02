"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../../lib/supabase";

export default function TeacherPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [view, setView] = useState<"qr" | "sessions" | "details">("qr");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState("");

  const [sessions, setSessions] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const [status, setStatus] = useState("");

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true);
    });
  }, []);

  /* ================= DYNAMIC QR ================= */
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

  /* ================= LOGIN ================= */
  const loginTeacher = async () => {
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
  };

  /* ================= START SESSION ================= */
  const startSession = async () => {
    const { data } = await supabase
      .from("sessions")
      .insert({ faculty_id: facultyId })
      .select()
      .single();

    setSessionId(data.id);
  };

  /* ================= LOAD SESSIONS ================= */
  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("faculty_id", facultyId)
      .order("created_at", { ascending: false });

    setSessions(data || []);
    setView("sessions");
  };

  /* ================= LOAD ATTENDANCE ================= */
  const loadAttendance = async (session: any) => {
    setSelectedSession(session);

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("session_id", session.id)
      .order("scanned_at", { ascending: true });

    setAttendance(data || []);
    setView("details");
  };

  /* ================= EXPORT CSV ================= */
  const exportCSV = () => {
    const header = "Register Number,Scanned At\n";
    const rows = attendance
      .map((a) => `${a.register_no},${a.scanned_at}`)
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.csv";
    a.click();
  };

  /* ================= LOGIN PAGE ================= */
  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg w-80 space-y-4">
          <h1 className="text-2xl text-white text-center">Teacher Login</h1>

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
            className="w-full bg-blue-600 py-2 rounded text-white"
          >
            Login
          </button>

          {status && (
            <p className="text-red-400 text-sm text-center">{status}</p>
          )}
        </div>
      </main>
    );
  }

  /* ================= DASHBOARD ================= */
  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            setLoggedIn(false);
            setView("qr");
            setSessionId(null);
          }}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      {/* ================= QR VIEW ================= */}
      {view === "qr" && (
        <>
          {!sessionId && (
            <button
              onClick={startSession}
              className="bg-green-600 px-6 py-3 rounded mb-6"
            >
              Start New Session
            </button>
          )}

          {sessionId && (
            <div className="bg-white p-6 rounded mb-6 w-fit">
              <QRCodeCanvas value={qrValue} size={220} />
            </div>
          )}

          <button
            onClick={loadSessions}
            className="bg-blue-600 px-4 py-2 rounded"
          >
            View Sessions
          </button>
        </>
      )}

      {/* ================= SESSIONS VIEW ================= */}
      {view === "sessions" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Sessions</h2>

            <button
              onClick={() => setView("qr")}
              className="bg-gray-600 px-4 py-2 rounded"
            >
              Back to QR
            </button>
          </div>

          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-800 p-4 rounded mb-4"
            >
              <p>{new Date(session.created_at).toLocaleString()}</p>

              <button
                onClick={() => loadAttendance(session)}
                className="mt-2 bg-blue-600 px-3 py-1 rounded"
              >
                View Session Details
              </button>
            </div>
          ))}
        </>
      )}

      {/* ================= SESSION DETAILS ================= */}
      {view === "details" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Session Details ({attendance.length})
            </h2>

            <button
              onClick={() => {
                setSelectedSession(null);
                setAttendance([]);
                setView("sessions");
              }}
              className="bg-gray-600 px-4 py-2 rounded"
            >
              Close
            </button>
          </div>

          <table className="w-full bg-slate-800 rounded">
            <thead>
              <tr>
                <th className="p-2 text-left">Register No</th>
                <th className="p-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a, i) => (
                <tr key={i}>
                  <td className="p-2">{a.register_no}</td>
                  <td className="p-2">
                    {new Date(a.scanned_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={exportCSV}
            className="mt-4 bg-blue-600 px-4 py-2 rounded"
          >
            Export CSV
          </button>
        </>
      )}
    </main>
  );
}
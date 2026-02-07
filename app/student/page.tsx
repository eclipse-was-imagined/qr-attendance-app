"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../../lib/supabase";

export default function StudentPage() {
  const [registerNo, setRegisterNo] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [status, setStatus] = useState("");

  /* ===== CHECK SESSION ===== */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true);
    });
  }, []);

  /* ===== START QR SCANNER ===== */
  useEffect(() => {
    if (!loggedIn) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: 250 },
      false
    );

    const onScanSuccess = async (decodedText: string) => {
      let payload;

      try {
        payload = JSON.parse(decodedText);
      } catch {
        setStatus("Invalid QR ❌");
        return;
      }

      const { session_id } = payload;

      if (!session_id) {
        setStatus("Invalid session ❌");
        return;
      }

      const { error } = await supabase.from("attendance").insert({
        session_id,
        register_no: registerNo,
      });

      if (error) {
        if (error.code === "23505") {
          setStatus("Attendance already marked ✅");
        } else {
          console.error("SUPABASE INSERT ERROR:", error);
          setStatus(error.message);
        }
        return;
      }

      setStatus("Attendance marked successfully ✅");
      scanner.clear();
    };

    scanner.render(onScanSuccess, () => {});

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [loggedIn, registerNo]);

  /* ===== LOGIN ===== */
  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg w-80 space-y-4">
          <h1 className="text-2xl font-bold text-white text-center">
            Student Login
          </h1>

          <input
            type="text"
            placeholder="Register Number"
            className="w-full p-2 rounded bg-slate-700 text-white"
            value={registerNo}
            onChange={(e) => setRegisterNo(e.target.value)}
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
                  email: `${registerNo}@student.local`,
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
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
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

  /* ===== SCANNER PAGE ===== */
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
      <h1 className="text-xl font-bold text-white">
        Scan Attendance QR
      </h1>

      <div
        id="reader"
        className="w-72 bg-slate-800 rounded border border-slate-600"
      />

      {status && (
        <p className="text-white text-center text-sm">
          {status}
        </p>
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

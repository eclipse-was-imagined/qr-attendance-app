"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../../lib/supabase";

export default function StudentPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerNo, setRegisterNo] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true);
    });
  }, []);

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

      const { error } = await supabase.from("attendance").insert({
        session_id,
        register_no: registerNo,
      });

      if (error) {
        if (error.code === "23505") {
          setStatus("Attendance already marked ✅");
        } else {
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

  const loginStudent = async () => {
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
      .from("students")
      .select("*")
      .eq("email", email)
      .eq("register_no", registerNo)
      .single();

    if (!data) {
      setStatus("Register number does not match email ❌");
      return;
    }

    setLoggedIn(true);
    setStatus("");
  };

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg w-80 space-y-4">
          <h1 className="text-2xl font-bold text-white text-center">
            Student Login
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
            placeholder="Register Number"
            className="w-full p-2 rounded bg-slate-700 text-white"
            value={registerNo}
            onChange={(e) => setRegisterNo(e.target.value)}
          />

          <button
            onClick={loginStudent}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
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
      <h1 className="text-xl font-bold text-white">
        Scan Attendance QR
      </h1>

      <div id="reader" className="w-72 bg-slate-800 rounded" />

      {status && (
        <p className="text-white text-sm">{status}</p>
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

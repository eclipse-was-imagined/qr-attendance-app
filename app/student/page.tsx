"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../../lib/supabase";

/* ================== CLASSROOM CONFIG ================== */
// 🔴 Replace these with your real classroom coordinates
const CLASS_LAT = 12.9716;   // example latitude
const CLASS_LNG = 77.5946;   // example longitude
const ALLOWED_RADIUS = 50;   // meters
/* ====================================================== */

// Distance calculator (Haversine formula)
function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function StudentPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [status, setStatus] = useState("");
  const [result, setResult] = useState("");

  // Check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true);
    });
  }, []);

  // Start scanner only after login
  useEffect(() => {
    if (!loggedIn) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: 250 },
      false
    );

    const onScanSuccess = async (decodedText: string) => {
      // Expected format: token|expiry|teacherEmail
      const parts = decodedText.split("|");

      if (parts.length !== 3) {
        setStatus("Invalid QR ❌");
        return;
      }

      const qrToken = parts[0];
      const expiryTime = Number(parts[1]);
      const teacherEmail = parts[2];

      // QR expiry check
      if (Date.now() > expiryTime) {
        setStatus("QR expired ❌");
        return;
      }

      setStatus("Checking location...");

      // 📍 LOCATION CHECK
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          }
        );

        const studentLat = position.coords.latitude;
        const studentLng = position.coords.longitude;

        const distance = getDistanceInMeters(
          studentLat,
          studentLng,
          CLASS_LAT,
          CLASS_LNG
        );

        if (distance > ALLOWED_RADIUS) {
          setStatus("You are not in the classroom ❌");
          return;
        }
      } catch {
        setStatus("Location permission denied ❌");
        return;
      }

      setResult(qrToken);
      setStatus("Saving attendance...");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        setStatus("Not logged in");
        return;
      }

      // Prevent duplicate attendance
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("student_email", user.email)
        .eq("qr_value", qrToken)
        .eq("teacher_email", teacherEmail)
        .maybeSingle();

      if (existing) {
        setStatus("Attendance already marked ❌");
      } else {
        await supabase.from("attendance").insert({
          student_email: user.email,
          qr_value: qrToken,
          teacher_email: teacherEmail,
        });

        setStatus("Attendance marked successfully ✅");
      }

      scanner.clear();
    };

    scanner.render(onScanSuccess, () => {});
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [loggedIn]);

  /* ================== LOGIN SCREEN ================== */
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
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
          >
            Login
          </button>

          {status && (
            <p className="text-red-400 text-center text-sm">
              {status}
            </p>
          )}

          <a href="/" className="block text-center text-slate-400 text-sm">
            ← Back to Home
          </a>
        </div>
      </main>
    );
  }

  /* ================== SCANNER SCREEN ================== */
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold text-white">
        Scan Attendance QR
      </h1>

      <div
        id="reader"
        className="w-72 rounded bg-slate-800 border border-slate-600"
      />

      {result && (
        <p className="text-green-300 text-center">
          QR Token: {result}
        </p>
      )}

      {status && (
        <p className="text-blue-300 text-center text-sm">
          {status}
        </p>
      )}

      <a href="/" className="text-slate-400 hover:text-white text-sm">
        ← Back to Home
      </a>
    </main>
  );
}

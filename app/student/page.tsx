"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../../lib/supabase";

/* ===== CONFIG ===== */
const ALLOWED_RADIUS = 50; // meters
/* ================== */

function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000; // Earth radius in meters

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180; // ✅ FIXED

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

  // Check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true);
    });
  }, []);

  // Start QR scanner ONLY after login
  useEffect(() => {
    if (!loggedIn) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: 250 },
      false
    );

    const onScanSuccess = async (decodedText: string) => {
      // Expected: token|expiry|teacherEmail|lat|lng
      const parts = decodedText.split("|");
      if (parts.length !== 5) {
        setStatus("Invalid QR ❌");
        return;
      }

      const [qrToken, expiry, teacherEmail, tLat, tLng] = parts;

      if (Date.now() > Number(expiry)) {
        setStatus("QR expired ❌");
        return;
      }

      setStatus("Checking location...");

      let position: GeolocationPosition;
      try {
        position = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            })
        );
      } catch {
        setStatus("Location permission denied ❌");
        return;
      }

      const distance = getDistanceInMeters(
        position.coords.latitude,
        position.coords.longitude,
        Number(tLat),
        Number(tLng)
      );

      if (distance > ALLOWED_RADIUS) {
        setStatus("You are not near the teacher ❌");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        setStatus("Not logged in");
        return;
      }

      await supabase.from("attendance").insert({
        student_email: user.email,
        qr_value: qrToken,
        teacher_email: teacherEmail,
      });

      setStatus("Attendance marked ✅");
      scanner.clear();
    };

    scanner.render(onScanSuccess, () => {});

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [loggedIn]);

  /* ===== LOGIN SCREEN ===== */
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

  /* ===== SCANNER SCREEN ===== */
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


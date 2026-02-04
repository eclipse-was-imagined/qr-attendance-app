"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../../lib/supabase";

const ALLOWED_RADIUS = 50; // meters

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
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function StudentPage() {
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

    // ✅ FIXED CLEANUP (NOT async)
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [loggedIn]);

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
    </main>
  );
}

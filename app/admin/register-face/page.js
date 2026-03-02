"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/lib/supabase";

export default function RegisterFace() {
  const videoRef = useRef(null);
  const [registerNo, setRegisterNo] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModels();
    startCamera();
  }, []);

  const loadModels = async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
  };

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  const handleRegister = async () => {
    if (!registerNo) {
      setStatus("Enter register number");
      return;
    }

    setLoading(true);
    setStatus("Capturing face...");

    const detection = await faceapi
      .detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setStatus("No face detected ❌");
      setLoading(false);
      return;
    }

    const descriptor = Array.from(detection.descriptor);

    const { error } = await supabase
      .from("students")
      .update({ face_embedding: descriptor })
      .eq("register_no", registerNo);

    if (error) {
      setStatus("Error storing face ❌");
    } else {
      setStatus("Face registered successfully ✅");
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="bg-slate-800/70 backdrop-blur-lg border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Admin Face Registration
          </h1>
          <p className="text-slate-400 text-sm">
            Register student facial embedding securely
          </p>
        </div>

        <input
          type="text"
          placeholder="Enter Register Number"
          value={registerNo}
          onChange={(e) => setRegisterNo(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="relative rounded-xl overflow-hidden border border-slate-600">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-64 object-cover"
          />
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? "Processing..." : "Register Face"}
        </button>

        {status && (
          <div className="text-center text-sm text-slate-300">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
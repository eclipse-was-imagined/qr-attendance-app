"use client";

import { useEffect, useRef, useState } from "react";
import { loadModels, getFaceDescriptor } from "@/lib/faceUtils";
import { supabase } from "@/lib/supabase";

export default function RegisterFace() {
  const videoRef = useRef();
  const [registerNo, setRegisterNo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModels();
    startVideo();
  }, []);

  const startVideo = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  const handleRegister = async () => {
    setLoading(true);

    const descriptor = await getFaceDescriptor(videoRef.current);

    if (!descriptor) {
      alert("No face detected");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({ face_embedding: descriptor })
      .eq("register_no", registerNo);

    if (error) {
      alert("Error storing face");
    } else {
      alert("Face Registered Successfully");
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>Register Student Face</h2>

      <input
        placeholder="Register Number"
        value={registerNo}
        onChange={(e) => setRegisterNo(e.target.value)}
      />

      <video
        ref={videoRef}
        autoPlay
        width="400"
        height="300"
      />

      <button onClick={handleRegister} disabled={loading}>
        Register Face
      </button>
    </div>
  );
}
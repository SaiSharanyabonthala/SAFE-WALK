import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; 
import AuthPage from './Auth';
import './App.css';

const API_BASE = "http://10.244.136.168:5000"; 

function App() {
  const [user, setUser] = useState(localStorage.getItem('user'));
  const [status, setStatus] = useState("System Ready ✅");
  const [countdown, setCountdown] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const onLogin = (username) => {
    setUser(username);
    localStorage.setItem('user', username);
  };

  const handleLogout = () => {
    if (window.confirm("Logout of SafeWalk?")) {
      localStorage.clear();
      setUser(null);
    }
  };

  const stopSOS = () => {
    if (isRecording) {
      const safe = window.confirm("Are you sure you are safe? This stops the recording.");
      if (!safe) return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      const { recorder, stream } = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      if (stream) stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }

    setCountdown(null);
    setIsRecording(false);
    setStatus("System Ready ✅");
    if (navigator.vibrate) navigator.vibrate(100); 
  };

  const triggerEmergency = async () => {
    setStatus("🚨 ALERT SENT & RECORDING!");
    setIsRecording(true);
    
    // FIXED: Added so it doesn't crash
   if (navigator.vibrate) navigator.vibrate(500);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('userId', user);
        formData.append('video', blob, `${user}-emergency.webm`);

        try {
          await axios.post(`${API_BASE}/api/upload-video`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (err) { console.error("Video upload failed", err); }
      };

      recorder.start();
      mediaRecorderRef.current = { recorder, stream };

    } catch (e) { 
      setStatus("❌ Camera Permission Denied");
      alert("Please allow Camera access for SOS video recording.");
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            await axios.post(`${API_BASE}/api/sos`, { userId: user, latitude, longitude });
            console.log("📍 Location Alert Sent!");
          } catch (err) { console.error("SOS Alert failed", err); }
        },
        (err) => {
          if (err.code === 1) alert("📍 Location Denied! Enable GPS in Settings.");
          if (err.code === 2) alert("📍 GPS Signal not found.");
          if (err.code === 3) alert("📍 Location request timed out.");
          setStatus("❌ Location Error");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const handleSOSClick = () => {
    if (countdown !== null || isRecording) return; 

    if (navigator.vibrate) navigator.vibrate(200);

    setCountdown(5);
    setStatus("⚠️ STARTING IN...");

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          triggerEmergency();
          return null;
        }
        // ADJUSTED: 100ms pulse feels better than 500ms
        if (navigator.vibrate) navigator.vibrate(100); 
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
    };
  }, []);

  if (!user) return <AuthPage onLogin={onLogin} />;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-profile">
          <div className="avatar-small">{user ? user.toUpperCase() : 'U'}</div>
          <span>Protected: <b>{user}</b></span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <main className="sos-section">
        <h1 className="brand-name">SafeWalk</h1>
        <p className={`status-text ${isRecording ? 'pulse-text' : ''}`}>{status}</p>
        
        <div className={`sos-ring ${countdown !== null ? 'is-active' : ''}`}>
          <button 
            className={`sos-btn-main ${countdown !== null ? 'counting' : ''} ${isRecording ? 'recording-pulse' : ''}`} 
            onClick={handleSOSClick}
          >
            {countdown !== null ? countdown : (isRecording ? "LIVE" : "SOS")}
          </button>
        </div>

        {(countdown !== null || isRecording) && (
          <button className="stop-btn" onClick={stopSOS}>I AM SAFE / CANCEL</button>
        )}
      </main>

      <footer className="dashboard-footer">
        <div className="info-pill">Tracking: ON</div>
        <div className="info-pill">Guardian Connected</div>
      </footer>
    </div>
  );
}

export default App;
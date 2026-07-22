import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; 
import AuthPage from './Auth';
import './App.css';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000"; 

function App() {
  const [user, setUser] = useState(localStorage.getItem('user'));
  const [status, setStatus] = useState("System Ready ✅");
  const [countdown, setCountdown] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // States for AI Safety Advice
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [manualQuery, setManualQuery] = useState("");

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null); 
  const chunksRef = useRef([]);

  const onLogin = (username) => {
    setUser(username);
    localStorage.setItem('user', username);
  };

  const handleLogout = () => {
    if (window.confirm("Logout of SafeWalk?")) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      localStorage.clear();
      setUser(null);
    }
  };

  // Fetch AI Safety Advice based on Geolocation
  const fetchAISafetyAdvice = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    
    setLoadingAdvice(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await axios.post(`${API_BASE}/api/ai/safety-context`, {
            lat: latitude,
            lng: longitude,
            time: new Date().toLocaleTimeString()
          });
          if (res.data.success) {
            setAiAdvice(res.data.data);
          } else {
            setLocationError(res.data.error || "Failed to fetch AI safety advice.");
          }
        } catch (err) {
          console.error("Failed to fetch AI safety context:", err);
          setLocationError("Could not fetch AI advice. Is your backend server running on port 5000?");
        } finally {
          setLoadingAdvice(false);
        }
      },
      (err) => {
        console.error("Geolocation Error:", err);
        setLoadingAdvice(false);
        setLocationError("GPS access denied. Click 'Detect My Location' or allow location permissions in your browser bar.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle Manual Destination or Query Search
  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    setLoadingAdvice(true);
    setLocationError(null);

    try {
      const res = await axios.post(`${API_BASE}/api/ai/safety-context`, {
        destination: manualQuery,
        time: new Date().toLocaleTimeString()
      });
      if (res.data.success) {
        setAiAdvice(res.data.data);
      } else {
        setLocationError(res.data.error || "Failed to analyze location context.");
      }
    } catch (err) {
      console.error(err);
      setLocationError("Failed to analyze location context. Ensure backend is running.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAISafetyAdvice();
    }
  }, [user]);

  const stopSOS = () => {
    if (isRecording) {
      const confirmSafe = window.confirm("Are you sure you are safe? This stops the recording and alerts.");
      if (!confirmSafe) return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setCountdown(null);
    setIsRecording(false);
    setStatus("System Ready ✅");
  };

  const triggerEmergency = async () => {
    setStatus("🚨 ALERT SENT & RECORDING!");
    setIsRecording(true);
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        await axios.post(`${API_BASE}/api/sos`, { userId: user, latitude, longitude });
      } catch (err) { 
        console.error("SOS Alert failed:", err); 
      }
    }, (err) => {
      alert("📍 Location Denied! Enable GPS for Guardian tracking.");
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream; 
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
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
          await axios.post(`${API_BASE}/api/upload-video`, formData);
          setStatus("✅ Evidence Sent to Guardian");
        } catch (err) { 
          console.error("Video upload failed", err); 
        }
      };

      recorder.start();

      setTimeout(() => {
        if (recorder.state !== "inactive") stopSOS();
      }, 30000);

    } catch (e) {
      setStatus("❌ Camera Error");
      alert("Please allow Camera access for SOS video recording.");
      setIsRecording(false);
    }
  };

  const handleSOSClick = () => {
    if (countdown !== null || isRecording) return; 
    
    setCountdown(5);
    setStatus("⚠️ STARTING SOS...");

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          triggerEmergency();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  if (!user) return <AuthPage onLogin={onLogin} />;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-profile">
          <div className="avatar-small">{user.charAt(0).toUpperCase()}</div>
          <span>Protected: <b>{user}</b></span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <main className="sos-section">
        <h1 className="brand-name">SafeWalk</h1>
        <p className={`status-text ${isRecording ? 'recording-pulse' : ''}`}>{status}</p>
        
        <div className="sos-ring">
          <button 
            className={`sos-btn-main ${countdown !== null ? 'counting' : ''} ${isRecording ? 'recording-pulse' : ''}`} 
            onClick={handleSOSClick}
            disabled={isRecording || countdown !== null}
          >
            {countdown !== null ? countdown : (isRecording ? "LIVE" : "SOS")}
          </button>
        </div>

        {(countdown !== null || isRecording) && (
          <button className="stop-btn" onClick={stopSOS}>
            I AM SAFE / CANCEL
          </button>
        )}

        {/* --- Interactive AI SafeZone Card --- */}
        <div className="ai-safety-card" style={{ 
          marginTop: '25px', 
          padding: '18px', 
          borderRadius: '12px', 
          backgroundColor: '#16192b', 
          color: '#fff', 
          textAlign: 'left', 
          width: '90%', 
          maxWidth: '450px', 
          border: '1px solid #2a2f4c',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: '0', fontSize: '1rem', color: '#00fff5' }}>🗺️ AI SafeZone Context</h3>
            <button 
              onClick={fetchAISafetyAdvice} 
              style={{ background: '#252a48', border: 'none', color: '#00fff5', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
              📍 Detect My Location
            </button>
          </div>

          {/* Quick Destination Search Form */}
          <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input 
              type="text" 
              placeholder="Or enter location / route (e.g., Jubilee Hills)..." 
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #33395c', backgroundColor: '#0d0e1a', color: '#fff', fontSize: '0.85rem' }}
            />
            <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
              Check
            </button>
          </form>

          {loadingAdvice ? (
            <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '10px 0' }}>🤖 Gemini AI analyzing spatial safety factors...</p>
          ) : locationError ? (
            <div style={{ fontSize: '0.85rem', color: '#ff7675', margin: '8px 0' }}>
              ⚠️ {locationError}
            </div>
          ) : aiAdvice ? (
            <div style={{ marginTop: '10px', backgroundColor: '#0d0e1a', padding: '12px', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                <b>Risk Level: </b>
                <span style={{ 
                  color: aiAdvice.riskLevel === 'High' ? '#ff4d4d' : aiAdvice.riskLevel === 'Medium' ? '#ffaa00' : '#00ff88',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255,255,255,0.05)'
                }}>
                  {aiAdvice.riskLevel} Risk
                </span>
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#888' }}>AI Safety Recommendations:</p>
              <ul style={{ paddingLeft: '18px', margin: '0', fontSize: '0.85rem', color: '#ddd' }}>
                {Array.isArray(aiAdvice.precautions) && aiAdvice.precautions.map((precaution, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{precaution}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '8px 0' }}>Click <b>Detect My Location</b> or enter a destination to see safety insights.</p>
          )}
        </div>
      </main>

      <footer className="dashboard-footer">
        <div className="info-pill">Tracking: ON</div>
        <div className="info-pill">Guardian Connected</div>
      </footer>
    </div>
  );
}

export default App;
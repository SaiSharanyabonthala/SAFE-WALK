import React, { useState } from 'react';
import axios from 'axios';
import { auth, googleProvider, signInWithPopup } from './firebase'; 

// Pointing to your local Node server port
const API_BASE = "http://localhost:5000"; 

const AuthPage = ({ onLogin }) => {
  const [step, setStep] = useState(1); 
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "",
    username: "", 
    contact: "", 
    profilePic: "" 
  });

  const botUsername = "devi_safewalk_bot";

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setFormData((prev) => ({ 
        ...prev, 
        email: result.user.email, 
        profilePic: result.user.photoURL 
      }));
      setStep(2); 
    } catch (error) {
      console.error("Auth Error:", error);
      alert("Google Sign-In failed.");
    }
  };

  const handleEmailLogin = () => {
    // For a simple PoC, we are skipping firebase email auth check 
    // and moving straight to identity setup
    if(formData.email && (isLogin ? formData.password : true)) {
        setStep(2);
    } else {
        alert("Please fill in all fields.");
    }
  };

  const startApp = async () => {
    try {
      await axios.post(`${API_BASE}/api/signup`, formData);
      const msg = `🚨 SafeWalk Protection: I have added you as my guardian. Please click 'Start' on this bot to receive my alerts: https://t.me/${botUsername}?start=${formData.username}`;
      window.open(`https://wa.me/${formData.contact}?text=${encodeURIComponent(msg)}`, '_blank');
      setStep(3);
    } catch (err) { 
      console.error("Backend Error:", err);
      alert("Cannot connect to local server at Port 5000."); 
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-side">
        <div className="auth-card-clean">
          
          {step === 1 && (
            <div className="fade-in">
              <h1 className="welcome-title">{isLogin ? "Welcome Back" : "Create Account"}</h1>
              <p className="subtitle">Please enter your details to stay safe.</p>
              
              <button className="google-login-btn" onClick={handleGoogleLogin}>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="20"/>
                  Continue with Google
              </button>

              <div className="divider"><span>or</span></div>

              <input 
                className="auth-input-styled" 
                placeholder="Email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              
              <input 
                className="auth-input-styled" 
                type="password"
                placeholder="Password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />

              <button className="action-btn" onClick={handleEmailLogin}>
                {isLogin ? "Log in" : "Sign Up"}
              </button>

              <p className="signup-text" style={{marginTop: '20px', textAlign: 'center'}}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span onClick={() => setIsLogin(!isLogin)} style={{cursor: 'pointer', fontWeight: 'bold', color: '#6b46c1'}}>
                  {isLogin ? "Sign Up" : "Log In"}
                </span>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <h2 className="purple-text">Setup Security</h2>
              <input 
                className="auth-input-styled" 
                placeholder="Choose a Unique Username" 
                onChange={(e)=>setFormData({...formData, username: e.target.value})} 
              />
              <input 
                className="auth-input-styled" 
                placeholder="Guardian's WhatsApp " 
                onChange={(e)=>setFormData({...formData, contact: e.target.value})} 
              />
              <button className="action-btn" onClick={startApp} disabled={!formData.username || !formData.contact}>
                Sync with Guardian
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <h2 className="purple-text">Everything Set!</h2>
              <p>Your guardian must tap <b>Start</b> in the bot to activate alerts.</p>
              <button className="action-btn" onClick={() => onLogin(formData.username)}>
                Enter Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="auth-image-side">
        <div className="image-overlay">
          <h2>Secure Your Walk</h2>
          <p>Instant alerts. Real-time recording. Peace of mind.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
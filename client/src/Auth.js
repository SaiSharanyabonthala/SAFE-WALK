import React, { useState } from 'react';
import axios from 'axios';
// Import your firebase config
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from './firebase'; 

// FIXED: Using your live Render URL instead of local IP
const API_BASE = "https://safe-walk-application-1.onrender.com"; 

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
      // Update state and move to step 2
      setFormData((prev) => ({ 
        ...prev, 
        email: result.user.email, 
        profilePic: result.user.photoURL 
      }));
      setStep(2); 
    } catch (error) {
      console.error("Auth Error:", error);
      alert("Google Sign-In failed. Make sure you added your Vercel link to Firebase Authorized Domains!");
    }
  };

  const handleEmailAuth = async () => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      }
      setStep(2);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleNext = () => setStep(step + 1);

  const startApp = async () => {
    try {
      // FIXED: Now connects to the Cloud Backend on Render
      await axios.post(`${API_BASE}/api/signup`, formData);
      
      // WhatsApp message for the Guardian
      const msg = `🚨 SafeWalk Emergency Link: Please click 'Start' to connect to my alerts: https://t.me/${botUsername}?start=${formData.username}`;
      window.open(`https://wa.me/${formData.contact}?text=${encodeURIComponent(msg)}`, '_blank');
      
      handleNext();
    } catch (err) { 
      console.error("Backend Error:", err);
      // Detailed error message to help you debug
      alert(`Backend unreachable at ${API_BASE}. Ensure Render service is 'Live'.`); 
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
                  {isLogin ? "Login with Google" : "Sign up with Google"}
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
              
              <button 
                className="action-btn" 
                onClick={handleEmailAuth}
                disabled={!formData.email || !formData.password}
              >
                {isLogin ? "Log in" : "Sign Up"}
              </button>
              
              <p className="signup-text">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span onClick={() => setIsLogin(!isLogin)} style={{cursor: 'pointer', fontWeight: 'bold', color: '#6e48aa'}}>
                  {isLogin ? "Sign Up" : "Log In"}
                </span>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <h2 className="purple-text">Create Identity</h2>
              {formData.profilePic && <img src={formData.profilePic} alt="User" className="profile-preview" style={{borderRadius: '50%', width: '80px', marginBottom: '10px'}} />}
              <input className="auth-input-styled" placeholder="Username" onChange={(e)=>setFormData({...formData, username: e.target.value})} />
              <button className="action-btn" onClick={handleNext} disabled={!formData.username}>Next</button>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <h2 className="purple-text">How to Use</h2>
              <div className="tutorial-box" style={{textAlign: 'left', padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '15px'}}>
                <p>🛡️ 1. Enter Guardian's WhatsApp.</p>
                <p>📱 2. They connect via Telegram.</p>
                <p>🆘 3. Tap SOS for location & recording.</p>
              </div>
              <button className="action-btn" onClick={handleNext}>Got it!</button>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <h2 className="purple-text">Add Guardian</h2>
              <input className="auth-input-styled" placeholder="WhatsApp Number (with country code)" onChange={(e)=>setFormData({...formData, contact: e.target.value})} />
              <button className="action-btn" onClick={startApp} disabled={!formData.contact}>Connect</button>
            </div>
          )}

          {step === 5 && (
            <div className="fade-in">
              <h2 className="purple-text">Everything Set!</h2>
              <p>Your emergency protocol is ready.</p>
              <button className="action-btn" onClick={() => onLogin(formData.username)}>Enter Dashboard</button>
            </div>
          )}
        </div>
      </div>
      <div className="auth-image-side">
        <div className="image-overlay">
          <h2>Women's Safety</h2>
          <p>Protecting you every step of the way.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
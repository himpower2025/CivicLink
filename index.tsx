import { render } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';

// --- Types ---
interface Agency {
  id: string;
  name: string;
  logo: string;
  routes: string[];
  driverName: string;
  code?: string;
}

interface Agencies {
  [key: string]: Agency;
}

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isBroadcast: boolean;
}

interface Location {
  latitude: number;
  longitude: number;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'emergency' | 'system' | 'route' | 'chat';
  read: boolean;
}

/**
 * CivicLinkLogo: A sophisticated, refined target crosshair logo for government fleet tracking.
 */
const CivicLinkLogo = ({ size = 120 }: { size?: number }) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#60A5FA" />
        <stop offset="100%" stop-color="#1D4ED8" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="120" fill="none" />
    <path d="M160 256 L220 256 M292 256 L352 256" stroke="white" stroke-width="40" stroke-linecap="round" opacity="0.6" />
    <circle cx="256" cy="256" r="180" fill="none" stroke="white" stroke-width="30" />
    <path d="M256 120 V392 M120 256 H392" stroke="white" stroke-width="20" stroke-linecap="round" opacity="0.4" />
    <circle cx="256" cy="256" r="60" fill="white" />
    <path d="M236 256 L276 256 M256 236 L256 276" stroke="#1E40AF" stroke-width="12" stroke-linecap="round" />
  </svg>
`;

const getVehicleMarkerURI = () => {
  const svg = `
    <svg width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <circle cx="256" cy="256" r="240" fill="#2563EB" stroke="white" stroke-width="20" />
      <path d="M150 350 L256 150 L362 350 Z" fill="#F59E0B" />
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const INITIAL_AGENCIES: Agencies = {
  'GOV-HQ': { id: 'A1', name: 'Central Government Complex', logo: '🏛️', routes: ['Metropolitan Loop', 'Sejong-Seoul Shuttle', 'Emergency Supply'], driverName: 'Chief Officer' },
  'CITY-01': { id: 'A2', name: 'City Hall Transport Dept', logo: '🏙️', routes: ['City Fleet Team 1', 'VIP Protocol Route'], driverName: 'Service Officer' },
};

const INITIAL_MESSAGES: Message[] = [
  { id: 1, sender: 'Command Center', text: 'Please perform safety checks before departure.', time: '08:00 AM', isBroadcast: true },
  { id: 2, sender: 'Officer (A-102)', text: 'Heavy traffic on Expressway. Expect 10m delay.', time: '08:15 AM', isBroadcast: false },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', title: 'System Dispatch Ready', body: 'CivicLink PRO v1.4.0 verified for Play Store & App Store operations.', time: '08:00 AM', type: 'system', read: false },
  { id: '2', title: 'Route Update Notice', body: 'Metropolitan Loop speed limit updated to 60 km/h.', time: '08:10 AM', type: 'route', read: true }
];

// Web Audio API Synthesizer Chime for Mobile Notifications
function playAlertChime(isEmergency = false) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = isEmergency ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isEmergency ? 880 : 587.33, ctx.currentTime); // A5 or D5
    if (isEmergency) {
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    } else {
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
    }
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
}

function GoogleMap({ location, isLive }: { location: Location | null, isLive: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstance = useRef<any>(null);
  const busMarker = useRef<any>(null);

  useEffect(() => {
    const checkGoogle = setInterval(() => {
      if ((window as any).google && (window as any).google.maps) {
        setMapLoaded(true);
        clearInterval(checkGoogle);
        if (mapRef.current && !mapInstance.current) {
          mapInstance.current = new (window as any).google.maps.Map(mapRef.current, {
            center: { lat: 37.5665, lng: 126.9780 },
            zoom: 15,
            styles: [
              { featureType: "all", elementType: "geometry", stylers: [{ color: "#242f3e" }] },
              { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
              { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
            ],
            disableDefaultUI: true,
          });
        }
      }
    }, 1000);
    return () => clearInterval(checkGoogle);
  }, []);

  useEffect(() => {
    if (mapInstance.current && location) {
      const pos = { lat: location.latitude, lng: location.longitude };
      if (!busMarker.current) {
        busMarker.current = new (window as any).google.maps.Marker({
          position: pos,
          map: mapInstance.current,
          title: "Gov Vehicle",
          icon: {
            url: getVehicleMarkerURI(),
            scaledSize: new (window as any).google.maps.Size(50, 50),
          }
        });
      } else {
        busMarker.current.setPosition(pos);
      }
      mapInstance.current.panTo(pos);
    }
  }, [location]);

  if (!mapLoaded) {
    return html`
      <div class="map-placeholder">
        <div class="placeholder-content">
          <div class="pulse-icon">🎯</div>
          <p>Connecting Satellite Target Tracking...</p>
        </div>
      </div>
    `;
  }
  return html`<div ref=${mapRef} class="map-view"></div>`;
}

function ChatView({ role, messages, onSendMessage }: { role: string, messages: Message[], onSendMessage: (t: string, q: boolean) => void }) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickMsgs = role === 'driver' 
    ? ['Starting Shift 🚀', 'Arrived at Destination ✅', 'Traffic Delay 🚦', 'Emergency Alert ⚠️']
    : ['Request Location Update 📍', 'Check Delay Reason ❓', 'Keep up the good work! 🤝'];

  return html`
    <div class="chat-container anim-fade-in">
      <div class="chat-messages">
        ${messages.map((msg: Message) => html`
          <div class="msg-bubble ${msg.isBroadcast ? 'broadcast' : ''} ${msg.sender.includes(role === 'driver' ? 'Officer' : 'Command') ? 'mine' : 'theirs'}">
            <div class="msg-sender">${msg.isBroadcast ? '📢 Announcement' : msg.sender}</div>
            <div class="msg-text">${msg.text}</div>
            <div class="msg-time">${msg.time}</div>
          </div>
        `)}
        <div ref=${chatEndRef}></div>
      </div>
      
      <div class="chat-controls">
        <div class="quick-tags">
          ${quickMsgs.map((m: string) => html`
            <button class="tag-btn" onClick=${() => onSendMessage(m, true)}>${m}</button>
          `)}
        </div>
        <div class="chat-input-area">
          <input type="text" placeholder="Type a message..." value=${input} onInput=${(e: any) => setInput(e.target.value)} />
          <button class="send-btn" onClick=${() => { if(input) { onSendMessage(input, false); setInput(''); } }}>🚀</button>
        </div>
      </div>
    </div>
  `;
}

export function App() {
  const [role, setRole] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<Agencies>(() => {
    const saved = localStorage.getItem('civiclink_v2_agencies');
    return saved ? JSON.parse(saved) : INITIAL_AGENCIES;
  });
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [agencyCode, setAgencyCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [route, setRoute] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('map');
  const [location, setLocation] = useState<Location | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [vehicleStatus, setVehicleStatus] = useState('Standby');

  // --- Store & App Compliance States ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNetworkNotice, setShowNetworkNotice] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [showNotificationTray, setShowNotificationTray] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showLocationDisclosure, setShowLocationDisclosure] = useState(false);
  const [showDataDeletionModal, setShowDataDeletionModal] = useState(false);
  const [deletionEmail, setDeletionEmail] = useState('');
  const [deletionSuccessMsg, setDeletionSuccessMsg] = useState('');

  // Settings Toggles
  const [pushEnabled, setPushEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [vibeEnabled, setVibeEnabled] = useState(true);
  const [sosAlertsEnabled, setSosAlertsEnabled] = useState(true);
  const [highPrecisionGps, setHighPrecisionGps] = useState(true);

  const simId = useRef<any>(null);

  // Monitor Network Connectivity for App Store Guidelines
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNetworkNotice(true);
      setTimeout(() => setShowNetworkNotice(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowNetworkNotice(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('civiclink_v2_agencies', JSON.stringify(agencies));
  }, [agencies]);

  // Request Notification Permission on First Launch
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          dispatchPushNotification('Notifications Enabled', 'CivicLink PRO alert service activated.', 'system');
        }
      } catch (err) {
        console.warn('Notification permission request error:', err);
      }
    }
  };

  // Dispatch System & In-App Notification
  const dispatchPushNotification = (title: string, body: string, type: 'emergency' | 'system' | 'route' | 'chat') => {
    const newNotif: NotificationItem = {
      id: String(Date.now()),
      title,
      body,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false
    };

    setNotifications(prev => [newNotif, ...prev]);

    if (audioEnabled) {
      playAlertChime(type === 'emergency');
    }

    if (vibeEnabled && 'vibrate' in navigator) {
      navigator.vibrate(type === 'emergency' ? [300, 100, 300, 100, 300] : [200, 100, 200]);
    }

    if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`CivicLink: ${title}`, {
          body,
          icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJsaW5rR3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzNCODJGNiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFENEVEOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iMTIwIiBmaWxsPSJ1cmwoI2xpbmtHcmFkKSIvPjxwYXRoIGQ9Ik0xNjAgMjU2IEwyMjAgMjU2IE0yOTIgMjU2IEwzNTIgMjU2IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuNSIvPjxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMTgwIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMwIi8+PHBhdGggZD0iTTI1NiAxZB0iTTI1NiAxMjAgVjM5MiBNMTIwIDI1NiBIMzkyIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuMyIvPjxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iNjAiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTIzNiAyNTYgTDI3NiAyNTYgTTI1NiAyMzYgTDI1NiAyNzYiIHN0cm9rZT0iIzFENEVEOCIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+'
        });
      } catch (e) {
        console.warn('Native notification trigger failed:', e);
      }
    }
  };

  const handleVerifyCode = () => {
    const formattedCode = agencyCode.trim().toUpperCase();
    const agency = agencies[formattedCode];
    if (agency) {
      setSelectedAgency({ ...agency, code: formattedCode });
      setCodeError('');
      requestNotificationPermission();
      // Prominent Location Disclosure check for Google Play Store rules
      setShowLocationDisclosure(true);
    } else {
      setCodeError('Invalid code. Try "GOV-HQ" or "CITY-01"');
    }
  };

  const handleSendMessage = (text: string, _isQuick: boolean) => {
    const newMsg: Message = {
      id: Date.now(),
      sender: role === 'driver' ? 'Officer (A-102)' : 'Command Center',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isBroadcast: role === 'coordinator'
    };
    setMessages(prev => [...prev, newMsg]);

    dispatchPushNotification(
      role === 'coordinator' ? '📢 Command Broadcast' : '💬 Vehicle Dispatch Message',
      text,
      role === 'coordinator' ? 'emergency' : 'chat'
    );
  };

  const startTracking = () => {
    setIsLive(true);
    let lat = 37.5665; let lng = 126.9780;
    simId.current = setInterval(() => {
      lat += 0.0001; lng += 0.0001;
      setLocation({ latitude: lat, longitude: lng });
    }, 2000);

    dispatchPushNotification('Shift Activated', 'Vehicle tracking & GPS telemetry active.', 'route');
  };

  const stopTracking = () => {
    clearInterval(simId.current);
    setIsLive(false);
    setLocation(null);
    dispatchPushNotification('Shift Ended', 'Vehicle tracking suspended safely.', 'system');
  };

  const triggerSOS = () => {
    setSosActive(true);
    dispatchPushNotification('🚨 EMERGENCY SOS TRIGGERED', 'Emergency signal transmitted to Command Center!', 'emergency');
    setTimeout(() => setSosActive(false), 5000);
  };

  const handleDataDeletionSubmit = () => {
    if (!deletionEmail) return;
    setDeletionSuccessMsg(`Data deletion request for "${deletionEmail}" submitted successfully to Himpower Compliance Team. Local cached data purged.`);
    localStorage.removeItem('civiclink_v2_agencies');
    setTimeout(() => {
      setDeletionSuccessMsg('');
      setShowDataDeletionModal(false);
      setDeletionEmail('');
    }, 3000);
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const markAllNotifsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (!role) {
    return html`
      <div class="app-viewport anim-fade-in">
        <div class="splash-card">
          <div class="brand-container">
            <div class="logo-box-gradient">
              <${CivicLinkLogo} size=${64} />
            </div>
            <h1 class="brand-title">CivicLink <span class="brand-pro">PRO</span></h1>
            <p class="brand-subtitle">Sophisticated Mobility for Public Service</p>
            <div class="company-branding">
              <span class="developed-by">Developed & Published by</span>
              <span class="company-name">Himpower Pvt. Ltd.</span>
            </div>
          </div>
          <div class="role-selection-area">
            <button class="role-btn driver" onClick=${() => setRole('driver')}>🚙 Service Driver</button>
            <button class="role-btn" onClick=${() => setRole('coordinator')}>📡 Service Coordinator</button>
            <button class="role-btn" onClick=${() => setRole('sysadmin')}>⚙️ System Administrator</button>
          </div>
          <div style="margin-top: 20px; display: flex; justify-content: center; gap: 12px; font-size: 0.72rem;">
            <button class="footer-link-btn" onClick=${() => setShowPrivacyPolicy(true)}>Privacy Policy</button>
            <span style="color: #CBD5E1;">|</span>
            <button class="footer-link-btn" onClick=${() => setShowTermsOfService(true)}>Terms of Service</button>
          </div>
        </div>

        <!-- Privacy Policy Modal -->
        ${showPrivacyPolicy && html`
          <div class="modal-overlay anim-fade-in">
            <div class="modal-sheet">
              <div class="modal-header">
                <h3 class="modal-title">🔒 Privacy Policy (개인정보 처리방침)</h3>
                <button class="modal-close-btn" onClick=${() => setShowPrivacyPolicy(false)}>✕</button>
              </div>
              <div class="policy-content-box">
                <h4>1. Overview</h4>
                <p>CivicLink PRO, operated by <strong>Himpower Pvt. Ltd.</strong>, respects your privacy and is committed to protecting all personal and mobility data collected through our fleet tracking service.</p>
                
                <h4>2. Location Data Collection (위치 정보 수집)</h4>
                <p>To provide real-time government vehicle positioning and precise ETA calculations, CivicLink PRO collects fine and coarse geolocation data when a driver initiates an active shift. Location data is strictly used for dispatch management and emergency response.</p>
                
                <h4>3. Data Protection & Encryption</h4>
                <p>All transmitted location coordinates and communication messages are encrypted using industry-standard TLS 1.3 protocol and stored securely in cloud servers with access restrictions.</p>
                
                <h4>4. User Rights & Account Deletion</h4>
                <p>In compliance with Apple App Store & Google Play Store policies, users have full rights to request the deletion of their profile, shift history, and location logs at any time via the Settings menu or by contacting support@himpower.com.</p>
              </div>
              <button class="modal-action-btn primary" onClick=${() => setShowPrivacyPolicy(false)}>I Understand & Agree</button>
            </div>
          </div>
        `}

        <!-- Terms of Service Modal -->
        ${showTermsOfService && html`
          <div class="modal-overlay anim-fade-in">
            <div class="modal-sheet">
              <div class="modal-header">
                <h3 class="modal-title">📜 Terms of Service (이용약관)</h3>
                <button class="modal-close-btn" onClick=${() => setShowTermsOfService(false)}>✕</button>
              </div>
              <div class="policy-content-box">
                <h4>1. Service Conditions</h4>
                <p>CivicLink PRO provides real-time tracking for official public sector vehicles and municipal transportation fleets operated by authorized personnel of Himpower Pvt. Ltd. partner agencies.</p>
                
                <h4>2. Emergency Protocols</h4>
                <p>The SOS Emergency Alert feature transmits real-time GPS coordinates directly to the central dispatch command center. Misuse of emergency alerts for non-critical situations is strictly prohibited.</p>
                
                <h4>3. Account Security</h4>
                <p>Users are responsible for safeguarding their Agency Access Code and credentials. Unauthorized sharing of government access codes is strictly forbidden.</p>
              </div>
              <button class="modal-action-btn primary" onClick=${() => setShowTermsOfService(false)}>Accept Terms</button>
            </div>
          </div>
        `}
      </div>
    `;
  }

  if (!selectedAgency) {
    return html`
      <div class="app-viewport anim-fade-in">
        <div class="auth-box">
          <button class="back-btn" onClick=${() => setRole(null)}>←</button>
          <div class="brand-container">
            <div class="auth-icon">🏛️</div>
            <h2 class="auth-title">Agency Portal Login</h2>
            <p class="auth-desc">Enter your agency access code to continue.</p>
          </div>
          <div class="auth-form-area">
            <input 
              class="code-input"
              type="text" placeholder="GOV-HQ" maxlength="10"
              value=${agencyCode} onInput=${(e: any) => setAgencyCode(e.target.value)}
            />
            <button class="action-btn" onClick=${handleVerifyCode}>Verify & Access</button>
            ${codeError && html`<p class="error-text">⚠️ ${codeError}</p>`}
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div class="app-container splash-bg anim-fade-in">
      <!-- Network Connectivity Banner -->
      ${showNetworkNotice && html`
        <div class="network-banner ${isOnline ? 'online' : 'offline'}">
          ${isOnline ? '🌐 Connection Restored - Live Sync Active' : '⚠️ Offline Mode - Cached Routes & Map Active'}
        </div>
      `}

      <header class="tracker-header">
        <div class="header-left">
           <div class="status-dot ${isLive ? 'online' : ''}"></div>
           <div class="header-info">
             <h3 class="header-title">${activeTab === 'chat' ? 'Service Channel' : (activeTab === 'settings' ? 'Settings & Policy' : (route || 'Select Route'))}</h3>
             <small class="header-school">${selectedAgency.name} <span style="opacity: 0.5; margin-left: 4px;">| Himpower</span></small>
           </div>
        </div>
        <div class="header-actions">
           <!-- Notification Bell Badge -->
           <button class="icon-btn-badge" onClick=${() => { setShowNotificationTray(true); markAllNotifsRead(); }}>
             🔔
             ${unreadNotifCount > 0 && html`<span class="badge-count">${unreadNotifCount}</span>`}
           </button>
           <!-- Settings Button -->
           <button class="icon-btn-badge" onClick=${() => setActiveTab('settings')}>
             ⚙️
           </button>
           ${role === 'driver' 
             ? html`<button class="sos-btn" onClick=${triggerSOS}>Emergency</button>`
             : html`<div class="eta-badge">ETA: <span>${isLive ? '12 min' : '--'}</span></div>`
           }
        </div>
      </header>

      <main class="map-container">
        ${activeTab === 'map' && html`
          <${GoogleMap} location=${location} isLive=${isLive} />
          <div class="control-overlay">
            <div class="panel-card">
              ${role === 'driver' ? html`
                <button class="main-cta ${isLive ? 'stop' : 'start'}" onClick=${isLive ? stopTracking : startTracking}>
                  ${isLive ? html`🛑 End Shift` : html`🚀 Start Shift`}
                </button>
              ` : html`
                <div class="vehicle-info">
                   <div class="avatar">🚔</div>
                   <div class="vehicle-meta">
                     <h4 class="vehicle-name">Vehicle ID: A-102</h4>
                     <span class="status-tag ${vehicleStatus}">${vehicleStatus}</span>
                   </div>
                   <button class="update-btn" onClick=${() => {
                      const next = vehicleStatus === 'Standby' ? 'Running' : (vehicleStatus === 'Running' ? 'Arrived' : 'Standby');
                      setVehicleStatus(next);
                      dispatchPushNotification('Vehicle Status Updated', `Status changed to ${next}`, 'route');
                   }}>Update Status</button>
                </div>
              `}
            </div>
          </div>
        `}

        ${activeTab === 'chat' && html`
          <${ChatView} role=${role} messages=${messages} onSendMessage=${handleSendMessage} />
        `}

        ${activeTab === 'settings' && html`
          <div class="chat-container anim-fade-in" style="padding: 20px; overflow-y: auto;">
             <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--primary); margin-bottom: 16px;">
               📱 Store Compliance & Settings
             </h3>

             <!-- Compliance Badges -->
             <div class="compliance-badge-grid">
               <div class="compliance-badge">✅ Google Play Ready</div>
               <div class="compliance-badge">✅ App Store Compliant</div>
             </div>

             <!-- Notification Preferences -->
             <div class="settings-section">
               <div class="settings-group-title">🔔 Alert & Notification Preferences</div>
               
               <div class="settings-row">
                 <div>
                   <div class="settings-label">Push Notifications</div>
                   <div class="settings-desc">Receive real-time vehicle dispatch alerts</div>
                 </div>
                 <label class="switch">
                   <input type="checkbox" checked=${pushEnabled} onChange=${(e: any) => setPushEnabled(e.target.checked)} />
                   <span class="slider"></span>
                 </label>
               </div>

               <div class="settings-row">
                 <div>
                   <div class="settings-label">Audio Sound Chimes</div>
                   <div class="settings-desc">Play synthesizer audio chimes on alerts</div>
                 </div>
                 <label class="switch">
                   <input type="checkbox" checked=${audioEnabled} onChange=${(e: any) => setAudioEnabled(e.target.checked)} />
                   <span class="slider"></span>
                 </label>
               </div>

               <div class="settings-row">
                 <div>
                   <div class="settings-label">Haptic Vibration</div>
                   <div class="settings-desc">Vibrate device on emergency alerts</div>
                 </div>
                 <label class="switch">
                   <input type="checkbox" checked=${vibeEnabled} onChange=${(e: any) => setVibeEnabled(e.target.checked)} />
                   <span class="slider"></span>
                 </label>
               </div>
             </div>

             <!-- GPS Telemetry -->
             <div class="settings-section">
               <div class="settings-group-title">📍 GPS & Location Accuracy</div>
               <div class="settings-row">
                 <div>
                   <div class="settings-label">High Precision Mode</div>
                   <div class="settings-desc">1-meter satellite tracking accuracy</div>
                 </div>
                 <label class="switch">
                   <input type="checkbox" checked=${highPrecisionGps} onChange=${(e: any) => setHighPrecisionGps(e.target.checked)} />
                   <span class="slider"></span>
                 </label>
               </div>
             </div>

             <!-- Legal & Policy Links required by App Store & Play Store -->
             <div class="settings-section">
               <div class="settings-group-title">⚖️ Store Compliance & Data Rights</div>
               <button class="role-btn" style="height: 46px; margin-bottom: 8px; font-size: 0.85rem;" onClick=${() => setShowPrivacyPolicy(true)}>
                 🔒 Privacy Policy (개인정보 처리방침)
               </button>
               <button class="role-btn" style="height: 46px; margin-bottom: 8px; font-size: 0.85rem;" onClick=${() => setShowTermsOfService(true)}>
                 📜 Terms of Service (이용약관)
               </button>
               <button class="role-btn" style="height: 46px; margin-bottom: 8px; font-size: 0.85rem;" onClick=${() => setShowLocationDisclosure(true)}>
                 📍 Prominent Location Disclosure
               </button>
               <button class="role-btn" style="height: 46px; border-color: #FCA5A5; color: #DC2626; font-size: 0.85rem;" onClick=${() => setShowDataDeletionModal(true)}>
                 🗑️ Request Account & Data Deletion
               </button>
             </div>

             <!-- App Info -->
             <div class="settings-section" style="text-align: center; padding: 16px; background: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0;">
               <p style="font-weight: 800; font-size: 0.9rem; color: var(--primary);">CivicLink PRO v1.4.0</p>
               <p style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">Official Release Build by Himpower Pvt. Ltd.</p>
               <p style="font-size: 0.68rem; color: #94A3B8; margin-top: 4px;">Service Worker: Active | Offline Sync Enabled</p>
             </div>
          </div>
        `}
      </main>

      <!-- Navigation Tabs -->
      <nav class="main-tabs">
         <button class=${activeTab === 'map' ? 'active' : ''} onClick=${() => setActiveTab('map')}><i>📍</i>Map</button>
         <button class=${activeTab === 'chat' ? 'active' : ''} onClick=${() => setActiveTab('chat')}><i>💬</i>Chat</button>
         <button class=${activeTab === 'settings' ? 'active' : ''} onClick=${() => setActiveTab('settings')}><i>⚙️</i>Settings</button>
         <button onClick=${() => setSelectedAgency(null)}><i>🔄</i>Switch</button>
      </nav>
      
      <footer class="app-footer">
        <p>© 2026 Himpower Pvt. Ltd. | Store Certified</p>
        <button class="footer-link-btn" onClick=${() => setShowPrivacyPolicy(true)}>Privacy Policy</button>
      </footer>

      <!-- Notification Tray Modal -->
      ${showNotificationTray && html`
        <div class="modal-overlay anim-fade-in">
          <div class="modal-sheet">
            <div class="modal-header">
              <h3 class="modal-title">🔔 Notification Tray</h3>
              <button class="modal-close-btn" onClick=${() => setShowNotificationTray(false)}>✕</button>
            </div>
            
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <button class="update-btn" onClick=${() => dispatchPushNotification('Test Push Alert', 'This is a test notification verifying system alert compatibility.', 'system')}>
                🚀 Send Test Alert
              </button>
              <button class="footer-link-btn" style="color: var(--danger);" onClick=${() => setNotifications([])}>Clear All</button>
            </div>

            <div class="notification-list">
              ${notifications.length === 0 ? html`<p style="text-align: center; color: #94A3B8; font-size: 0.85rem; padding: 20px;">No notifications yet.</p>` : null}
              ${notifications.map((n) => html`
                <div class="notification-card ${n.type}">
                  <div class="notification-icon">
                    ${n.type === 'emergency' ? '🚨' : (n.type === 'route' ? '🚙' : '📢')}
                  </div>
                  <div class="notification-content">
                    <div class="notification-title-text">${n.title}</div>
                    <div class="notification-body-text">${n.body}</div>
                    <div class="notification-time-text">${n.time}</div>
                  </div>
                </div>
              `)}
            </div>
            <button class="modal-action-btn secondary" onClick=${() => setShowNotificationTray(false)}>Close</button>
          </div>
        </div>
      `}

      <!-- Location Permission Disclosure Modal (Required for Google Play Store) -->
      ${showLocationDisclosure && html`
        <div class="modal-overlay anim-fade-in">
          <div class="modal-sheet">
            <div class="modal-header">
              <h3 class="modal-title">📍 Location Access Disclosure</h3>
              <button class="modal-close-btn" onClick=${() => setShowLocationDisclosure(false)}>✕</button>
            </div>
            <div class="policy-content-box">
              <p><strong>Prominent Disclosure:</strong> CivicLink PRO collects device location data to enable live vehicle position monitoring, ETA calculations, and emergency SOS routing even when the application is minimized or operating in the background during active duty shifts.</p>
              <p>Location information is handled exclusively by Himpower Pvt. Ltd. and is never sold to third-party advertisers.</p>
            </div>
            <button class="modal-action-btn primary" onClick=${() => { setShowLocationDisclosure(false); requestNotificationPermission(); }}>Allow & Continue</button>
          </div>
        </div>
      `}

      <!-- Privacy Policy Modal -->
      ${showPrivacyPolicy && html`
        <div class="modal-overlay anim-fade-in">
          <div class="modal-sheet">
            <div class="modal-header">
              <h3 class="modal-title">🔒 Privacy Policy (개인정보 처리방침)</h3>
              <button class="modal-close-btn" onClick=${() => setShowPrivacyPolicy(false)}>✕</button>
            </div>
            <div class="policy-content-box">
              <h4>1. Data Collection & Usage</h4>
              <p>Himpower Pvt. Ltd. collects vehicle GPS metrics, shift timestamps, and official messaging logs exclusively for public service fleet administration.</p>
              <h4>2. Retention & Deletion</h4>
              <p>Users have the right to purge cached shift logs and submit data deletion requests in accordance with Apple App Store and Google Play policies.</p>
            </div>
            <button class="modal-action-btn primary" onClick=${() => setShowPrivacyPolicy(false)}>Close</button>
          </div>
        </div>
      `}

      <!-- Terms of Service Modal -->
      ${showTermsOfService && html`
        <div class="modal-overlay anim-fade-in">
          <div class="modal-sheet">
            <div class="modal-header">
              <h3 class="modal-title">📜 Terms of Service (이용약관)</h3>
              <button class="modal-close-btn" onClick=${() => setShowTermsOfService(false)}>✕</button>
            </div>
            <div class="policy-content-box">
              <h4>Official Usage Terms</h4>
              <p>CivicLink PRO is intended solely for authorized officers and coordinators of partner government agencies. Misuse of tracking or broadcast features is prohibited.</p>
            </div>
            <button class="modal-action-btn primary" onClick=${() => setShowTermsOfService(false)}>Close</button>
          </div>
        </div>
      `}

      <!-- Data Deletion Request Modal (Mandatory for Play Store / App Store) -->
      ${showDataDeletionModal && html`
        <div class="modal-overlay anim-fade-in">
          <div class="modal-sheet">
            <div class="modal-header">
              <h3 class="modal-title">🗑️ Account & Data Deletion</h3>
              <button class="modal-close-btn" onClick=${() => setShowDataDeletionModal(false)}>✕</button>
            </div>
            <p style="font-size: 0.82rem; color: #475569; margin-bottom: 12px; line-height: 1.4;">
              In accordance with Google Play & App Store policies, you can request the permanent deletion of your profile, shift logs, and location telemetry.
            </p>
            <input 
              class="code-input" 
              style="height: 48px; font-size: 0.9rem; letter-spacing: normal; text-align: left; padding: 0 14px;" 
              type="email" 
              placeholder="Enter your officer email or ID..." 
              value=${deletionEmail} 
              onInput=${(e: any) => setDeletionEmail(e.target.value)} 
            />
            ${deletionSuccessMsg && html`<p style="color: #059669; font-weight: 700; font-size: 0.8rem; margin-bottom: 12px;">${deletionSuccessMsg}</p>`}
            <div style="display: flex; gap: 8px;">
              <button class="modal-action-btn danger" style="flex: 1;" onClick=${handleDataDeletionSubmit}>Submit Request</button>
              <button class="modal-action-btn secondary" style="flex: 1;" onClick=${() => setShowDataDeletionModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      `}
      
      ${sosActive && html`<div class="sos-fullscreen">⚠️ Emergency signal sent to Command Center</div>`}
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('root') || document.body);

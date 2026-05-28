
import { render } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';

// --- Types ---
interface School {
  id: string;
  name: string;
  logo: string;
  routes: string[];
  driverName: string;
  code?: string;
}

interface Schools {
  [key: string]: School;
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

/**
 * CivicLinkLogo: A sophisticated, refined logo representing connection and civic duty.
 */
const CivicLinkLogo = ({ size = 120 }: { size?: number }) => html`
  <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#60A5FA" />
        <stop offset="100%" stop-color="#3B82F6" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="120" fill="none" />
    <path d="M160 256 L220 256 M292 256 L352 256" stroke="white" stroke-width="40" stroke-linecap="round" opacity="0.5" />
    <circle cx="256" cy="256" r="180" fill="none" stroke="white" stroke-width="30" />
    <path d="M256 120 V392 M120 256 H392" stroke="white" stroke-width="20" stroke-linecap="round" opacity="0.3" />
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

const INITIAL_AGENCIES: Schools = {
  'GOV-HQ': { id: 'A1', name: 'Central Government Complex', logo: '🏛️', routes: ['Metropolitan Loop', 'Sejong-Seoul Shuttle', 'Emergency Supply'], driverName: 'Chief Officer' },
  'CITY-01': { id: 'A2', name: 'City Hall Transport Dept', logo: '🏙️', routes: ['City Fleet Team 1', 'VIP Protocol Route'], driverName: 'Service Officer' },
};

const INITIAL_MESSAGES: Message[] = [
  { id: 1, sender: 'Command Center', text: 'Please perform safety checks before departure.', time: '08:00 AM', isBroadcast: true },
  { id: 2, sender: 'Officer (A-102)', text: 'Heavy traffic on Expressway. Expect 10m delay.', time: '08:15 AM', isBroadcast: false },
];

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
          <div class="pulse-icon">📍</div>
          <p>Connecting Satellite...</p>
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

function App() {
  const [role, setRole] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<Schools>(() => {
    const saved = localStorage.getItem('civiclink_v2_agencies');
    return saved ? JSON.parse(saved) : INITIAL_AGENCIES;
  });
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [selectedAgency, setSelectedAgency] = useState<School | null>(null);
  const [agencyCode, setAgencyCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [route, setRoute] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('map');
  const [location, setLocation] = useState<Location | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [vehicleStatus, setVehicleStatus] = useState('Standby');
  
  const simId = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('civiclink_v2_agencies', JSON.stringify(agencies));
  }, [agencies]);

  const handleVerifyCode = () => {
    const formattedCode = agencyCode.trim().toUpperCase();
    const agency = agencies[formattedCode];
    if (agency) {
      setSelectedAgency({ ...agency, code: formattedCode });
      setCodeError('');
    } else {
      setCodeError('Invalid code. Try "GOV-HQ"');
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
    setMessages([...messages, newMsg]);
  };

  const startTracking = () => {
    setIsLive(true);
    let lat = 37.5665; let lng = 126.9780;
    simId.current = setInterval(() => {
      lat += 0.0001; lng += 0.0001;
      setLocation({ latitude: lat, longitude: lng });
    }, 2000);
  };

  const stopTracking = () => {
    clearInterval(simId.current);
    setIsLive(false);
    setLocation(null);
  };

  const triggerSOS = () => {
    setSosActive(true);
    setTimeout(() => setSosActive(false), 5000);
  };

  if (!role) {
    return html`
      <div class="app-viewport anim-fade-in">
        <div class="splash-card">
          <div class="brand-container">
            <div class="logo-box-gradient">
              <${CivicLinkLogo} size=${70} />
            </div>
            <h1 class="brand-title">CivicLink <span class="brand-pro">PRO</span></h1>
            <p class="brand-subtitle">Sophisticated Mobility for Public Service</p>
            <div class="company-branding">
              <span class="developed-by">Developed by</span>
              <span class="company-name">Himpower Pvt. Ltd.</span>
            </div>
          </div>
          <div class="role-selection-area">
            <button class="role-btn driver" onClick=${() => setRole('driver')}>🚙 Service Driver</button>
            <button class="role-btn" onClick=${() => setRole('coordinator')}>📡 Service Coordinator</button>
            <button class="role-btn" onClick=${() => setRole('sysadmin')}>⚙️ System Administrator</button>
          </div>
        </div>
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
      <header class="tracker-header">
        <div class="header-left">
           <div class="status-dot ${isLive ? 'online' : ''}"></div>
           <div class="header-info">
             <h3 class="header-title">${activeTab === 'chat' ? 'Service Channel' : (route || 'Select Route')}</h3>
             <small class="header-school">${selectedAgency.name} <span style="opacity: 0.5; margin-left: 4px;">| Himpower</span></small>
           </div>
        </div>
        ${role === 'driver' 
          ? html`<button class="sos-btn" onClick=${triggerSOS}>Emergency</button>`
          : html`<div class="eta-badge">ETA: <span>${isLive ? '12 min' : '--'}</span></div>`
        }
      </header>

      <main class="map-container">
        ${activeTab === 'map' ? html`
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
                   }}>Update Status</button>
                </div>
              `}
            </div>
          </div>
        ` : html`
          <${ChatView} role=${role} messages=${messages} onSendMessage=${handleSendMessage} />
        `}
      </main>

      <nav class="main-tabs">
         <button class=${activeTab === 'map' ? 'active' : ''} onClick=${() => setActiveTab('map')}><i>📍</i>Map</button>
         <button class=${activeTab === 'chat' ? 'active' : ''} onClick=${() => setActiveTab('chat')}><i>💬</i>Chat</button>
         <button onClick=${() => setSelectedAgency(null)}><i>🔄</i>Switch</button>
      </nav>
      
      <footer class="app-footer">
        <p>© 2026 Himpower Pvt. Ltd. | All Rights Reserved</p>
      </footer>
      
      ${sosActive && html`<div class="sos-fullscreen">⚠️ Emergency signal sent to Command Center</div>`}
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('root') || document.body);

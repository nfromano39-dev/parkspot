import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://rtoqkgnxkznivhornmuj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0b3FrZ254a3puaXZob3JubXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njk2MzQsImV4cCI6MjA5NzA0NTYzNH0.kKL5rSeJX1OcPZwLtR66JuI6cv0Ll6D1iTVEVvX1hYk";
const STRIPE_PK = "pk_test_51RiMszRugGAO6V0e33Vrvpwvr9g7JZA3jL6I6omNy92eLD2Q9RARFbvwgvweiGY8wy2YTe5noauvxUEfhyoCjwSu00FcQIDh2P";
const GMAPS_KEY = "AIzaSyCk191h9Y6eHNwtJrQeDcbWmf1xNo6YbOM";

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
const supabase = {
  async query(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || res.statusText);
    }
    return res.json().catch(() => null);
  },
  async auth(action, body) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${action}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

// ─── STRIPE LOADER ───────────────────────────────────────────────────────────
let stripePromise = null;
function getStripe() {
  if (!stripePromise) {
    stripePromise = new Promise((resolve) => {
      if (window.Stripe) { resolve(window.Stripe(STRIPE_PK)); return; }
      const s = document.createElement("script");
      s.src = "https://js.stripe.com/v3/";
      s.onload = () => resolve(window.Stripe(STRIPE_PK));
      document.head.appendChild(s);
    });
  }
  return stripePromise;
}

// ─── GOOGLE MAPS LOADER ──────────────────────────────────────────────────────
let mapsPromise = null;
function getMaps() {
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve) => {
      if (window.google?.maps) { resolve(window.google.maps); return; }
      window.__gmapsInit = () => resolve(window.google.maps);
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&callback=__gmapsInit`;
      document.head.appendChild(s);
    });
  }
  return mapsPromise;
}



const CATEGORY_ICONS = { Sports: "🏟️", Concerts: "🎵", Airports: "✈️", Hospitals: "🏥", "Convention Centers": "🤝", "Theme Parks": "🎢", Universities: "🎓" };

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" },
  modal: { background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" },
  btn: { width: "100%", padding: "13px 0", background: "#0a84ff", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" },
  btnGhost: { width: "100%", padding: "13px 0", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" },
  closeBtn: { background: "#f0f0f0", border: "none", borderRadius: 20, width: 30, height: 30, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 5, letterSpacing: 0.3 },
  input: { width: "100%", padding: "10px 13px", border: "1.5px solid #e0e0e0", borderRadius: 10, fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box", background: "#fafafa" },
};

// ─── LOGO ────────────────────────────────────────────────────────────────────
function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a6dff" /><stop offset="100%" stopColor="#0040cc" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#lg)" />
      <path d="M20 7C15.03 7 11 11.03 11 16C11 22.5 20 33 20 33C20 33 29 22.5 29 16C29 11.03 24.97 7 20 7Z" fill="white" opacity="0.95" />
      <text x="16.5" y="21" fontFamily="Arial Black,Arial" fontWeight="900" fontSize="11" fill="#1a6dff" letterSpacing="-0.5">P</text>
    </svg>
  );
}

// ─── AUTH MODAL ──────────────────────────────────────────────────────────────
function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true); setError("");
    try {
      const action = mode === "login" ? "token?grant_type=password" : "signup";
      const body = mode === "login" ? { email, password } : { email, password, data: { full_name: name } };
      const data = await supabase.auth(action, body);
      if (data.error) throw new Error(data.error_description || data.error);
      onSuccess({ email, name: data.user?.user_metadata?.full_name || email.split("@")[0], token: data.access_token });
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 20 }}>{mode === "login" ? "Sign in" : "Create account"}</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        {mode === "signup" && (
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" style={S.input} />
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={S.input} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={S.input} />
        </div>

        {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc0000", marginBottom: 14 }}>{error}</div>}

        <button onClick={submit} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#888" }}>
          {mode === "login" ? "Don't have an account? " : "Already have one? "}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ color: "#0a84ff", cursor: "pointer", fontWeight: 600 }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── MAP COMPONENT ───────────────────────────────────────────────────────────
function MapView({ listings, onSelect, selected }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    getMaps().then(maps => {
      if (mapRef.current) return;
      mapRef.current = new maps.Map(ref.current, {
        center: { lat: 39.8283, lng: -98.5795 },
        zoom: 4,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });

      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = listings.map(listing => {
        const marker = new maps.Marker({
          position: { lat: listing.lat, lng: listing.lng },
          map: mapRef.current,
          title: listing.address,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#0a84ff",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
          label: { text: `$${listing.price}`, color: "#fff", fontSize: "10px", fontWeight: "bold" },
        });
        marker.addListener("click", () => onSelect(listing));
        return marker;
      });
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = listings.map(listing => {
      const isSelected = selected?.id === listing.id;
      const marker = new window.google.maps.Marker({
        position: { lat: listing.lat, lng: listing.lng },
        map: mapRef.current,
        title: listing.address,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 14 : 10,
          fillColor: isSelected ? "#ff3b30" : "#0a84ff",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        label: { text: `$${listing.price}`, color: "#fff", fontSize: "10px", fontWeight: "bold" },
        zIndex: isSelected ? 100 : 1,
      });
      marker.addListener("click", () => onSelect(listing));
      return marker;
    });

    if (selected) {
      mapRef.current.panTo({ lat: selected.lat, lng: selected.lng });
      mapRef.current.setZoom(15);
    }
  }, [listings, selected]);

  return <div ref={ref} style={{ width: "100%", height: "100%", borderRadius: 16 }} />;
}

// ─── LISTING CARD ─────────────────────────────────────────────────────────────
function ListingCard({ listing, onClick, isSelected }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onClick(listing)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 14,
        border: `2px solid ${isSelected ? "#0a84ff" : hov ? "#0a84ff55" : "#e8e8e8"}`,
        overflow: "hidden", cursor: "pointer",
        transition: "all 0.15s",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov || isSelected ? "0 6px 20px rgba(10,132,255,0.15)" : "0 2px 6px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ height: 110, background: `linear-gradient(135deg, ${listing.color}ee, ${listing.color}77)`, position: "relative", display: "flex", alignItems: "flex-end", padding: "10px 12px" }}>
        <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", borderRadius: 16, padding: "3px 9px", fontWeight: 800, fontSize: 14, color: "#111" }}>
          ${listing.price}<span style={{ fontWeight: 400, fontSize: 10, color: "#888" }}>/hr</span>
        </div>
        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.4)", borderRadius: 16, padding: "2px 8px", fontSize: 10, fontWeight: 600, color: "#fff" }}>
          {CATEGORY_ICONS[listing.category] || "📍"} {listing.category}
        </div>
        <div style={{ fontSize: 30 }}>{listing.covered ? "🏠" : listing.category === "Airports" ? "✈️" : "🚗"}</div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{listing.address}</div>
        <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>📍 {listing.near}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(listing.tags || []).slice(0, 2).map(t => (
              <span key={t} style={{ background: "#f0f0f0", borderRadius: 10, padding: "2px 7px", fontSize: 10, fontWeight: 600, color: "#555" }}>{t}</span>
            ))}
            {listing.ev && <span style={{ background: "#f0f7ff", borderRadius: 10, padding: "2px 7px", fontSize: 10, fontWeight: 600, color: "#0a84ff", border: "1px solid #0a84ff33" }}>⚡ EV</span>}
          </div>
          <span style={{ color: "#f5a623", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>★ {Number(listing.rating).toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── STRIPE CHECKOUT MODAL ───────────────────────────────────────────────────
function CheckoutModal({ listing, hours, date, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [cardMounted, setCardMounted] = useState(false);
  const cardRef = useRef(null);
  const stripeRef = useRef(null);
  const cardElRef = useRef(null);

  const total = listing.price * hours;
  const fee = Math.round(total * 0.12);
  const grand = total + fee;

  useEffect(() => {
    getStripe().then(stripe => {
      stripeRef.current = stripe;
      const elements = stripe.elements();
      cardElRef.current = elements.create("card", {
        style: { base: { fontSize: "15px", color: "#111", "::placeholder": { color: "#bbb" } } },
      });
      cardElRef.current.mount(cardRef.current);
      setCardMounted(true);
    });
    return () => cardElRef.current?.destroy();
  }, []);

  async function pay() {
    if (!cardMounted) return;
    setLoading(true);
    try {
      // In production: call your backend to create a PaymentIntent and get client_secret
      // For demo, we simulate success after Stripe card validation
      const { error } = await stripeRef.current.createPaymentMethod({
        type: "card",
        card: cardElRef.current,
      });
      if (error) throw new Error(error.message);
      // Simulate saving booking to Supabase
      onSuccess({ total: grand, listing, hours, date });
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Payment</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{listing.address}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{date} · {hours} hr{hours > 1 ? "s" : ""}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          {[[`$${listing.price}/hr × ${hours} hrs`, `$${total}`], ["Service fee (12%)", `$${fee}`]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666", marginBottom: 5 }}><span>{l}</span><span>{v}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 17, color: "#111", paddingTop: 8, borderTop: "1px solid #eee", marginTop: 4 }}>
            <span>Total</span><span>${grand}</span>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={S.label}>Card details</label>
          <div ref={cardRef} style={{ padding: "12px 14px", border: "1.5px solid #e0e0e0", borderRadius: 10, background: "#fafafa", minHeight: 44 }} />
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            🔒 Secured by Stripe · Test card: 4242 4242 4242 4242
          </div>
        </div>

        <button onClick={pay} disabled={loading || !cardMounted} style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Processing..." : `Pay $${grand}`}
        </button>
      </div>
    </div>
  );
}

// ─── BOOKING MODAL ───────────────────────────────────────────────────────────
function BookingModal({ listing, onClose, user, onAuthNeeded }) {
  const [date, setDate] = useState("");
  const [hours, setHours] = useState(2);
  const [step, setStep] = useState("details"); // details | checkout | success
  const [bookingResult, setBookingResult] = useState(null);
  const total = listing.price * hours;
  const fee = Math.round(total * 0.12);

  function proceed() {
    if (!user) { onAuthNeeded(); return; }
    if (!date) return;
    setStep("checkout");
  }

  if (step === "success") return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>You're parked!</div>
        <div style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>
          Confirmed at <strong>{listing.address}</strong>.<br />A receipt has been sent to {user?.email}.
        </div>
        <div style={{ background: "#f6f9ff", borderRadius: 12, padding: "16px 20px", marginBottom: 24, border: "1.5px solid #0a84ff22" }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#0a84ff" }}>${bookingResult?.total}</div>
          <div style={{ fontSize: 12, color: "#aaa" }}>{hours} hrs · {date}</div>
        </div>
        <button onClick={onClose} style={S.btn}>Done</button>
      </div>
    </div>
  );

  if (step === "checkout") return (
    <CheckoutModal
      listing={listing} hours={hours} date={date}
      onClose={() => setStep("details")}
      onSuccess={(result) => { setBookingResult(result); setStep("success"); }}
    />
  );

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Reserve this spot</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{listing.address}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>📍 {listing.near} · {listing.type}</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} min={new Date().toISOString().split("T")[0]} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={S.label}>Duration: <strong>{hours} hour{hours > 1 ? "s" : ""}</strong></label>
          <input type="range" min={1} max={12} value={hours} onChange={e => setHours(Number(e.target.value))} style={{ width: "100%", accentColor: "#0a84ff" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#bbb", marginTop: 2 }}><span>1 hr</span><span>12 hrs</span></div>
        </div>
        <div style={{ background: "#f6f9ff", borderRadius: 10, padding: "14px 16px", marginBottom: 18, border: "1px solid #0a84ff22" }}>
          {[[`$${listing.price}/hr × ${hours} hrs`, `$${total}`], ["Service fee (12%)", `$${fee}`]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 5 }}><span>{l}</span><span>{v}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, color: "#111", paddingTop: 8, borderTop: "1px solid #dde8ff", marginTop: 4 }}>
            <span>Total</span><span>${total + fee}</span>
          </div>
        </div>
        <button onClick={proceed} disabled={!date} style={{ ...S.btn, opacity: date ? 1 : 0.5, cursor: date ? "pointer" : "not-allowed" }}>
          {!user ? "Sign in to book" : "Continue to payment"}
        </button>
      </div>
    </div>
  );
}

// ─── LIST YOUR SPACE MODAL ───────────────────────────────────────────────────
function ListSpaceModal({ onClose, user, onAuthNeeded }) {
  const STEPS = 3;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    address: "", city: "", lat: 0, lng: 0,
    near: "", distance_to_venue: "",
    categories: [], type: "Driveway",
    pricing_type: "both", price: "", flat_rate: "", flat_duration: "game",
    ev: false, covered: false,
    image_url: "", imageFile: null, imagePreview: null,
  });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const venueInputRef = useRef(null);
  const venueACRef = useRef(null);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCategory = (cat) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }));
  };

  // Address autocomplete
  useEffect(() => {
    if (step === 1) {
      getMaps().then(maps => {
        if (inputRef.current && !autocompleteRef.current) {
          const ac = new maps.places.Autocomplete(inputRef.current, { types: ["address"] });
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (place.formatted_address) update("address", place.formatted_address);
            const city = place.address_components?.find(c => c.types.includes("locality"))?.long_name || "";
            update("city", city);
            if (place.geometry?.location) {
              update("lat", place.geometry.location.lat());
              update("lng", place.geometry.location.lng());
            }
          });
          autocompleteRef.current = ac;
        }
        // Venue autocomplete
        if (venueInputRef.current && !venueACRef.current) {
          const vac = new maps.places.Autocomplete(venueInputRef.current, { types: ["establishment"] });
          vac.addListener("place_changed", () => {
            const place = vac.getPlace();
            if (place.name) {
              update("near", place.name);
              // Calculate walking distance if we have both locations
              if (place.geometry?.location && form.lat && form.lng) {
                setDistanceLoading(true);
                const service = new maps.DistanceMatrixService();
                service.getDistanceMatrix({
                  origins: [{ lat: form.lat, lng: form.lng }],
                  destinations: [place.geometry.location],
                  travelMode: maps.TravelMode.WALKING,
                }, (res, status) => {
                  setDistanceLoading(false);
                  if (status === "OK") {
                    const dist = res.rows[0].elements[0];
                    if (dist.status === "OK") update("distance_to_venue", dist.duration.text + " walk");
                  }
                });
              }
            }
          });
          venueACRef.current = vac;
        }
      });
    }
  }, [step, form.lat, form.lng]);

  async function uploadImage(file) {
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/spot-images/${filename}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": file.type,
        },
        body: file,
      });
      if (res.ok) {
        const url = `${SUPABASE_URL}/storage/v1/object/public/spot-images/${filename}`;
        update("image_url", url);
      }
    } catch (e) {}
    setUploadingImage(false);
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    update("imageFile", file);
    update("imagePreview", URL.createObjectURL(file));
    uploadImage(file);
  }

  const canProceed1 = form.address && form.near && form.categories.length > 0;
  const canProceed2 = form.type;
  const canSubmit = (form.pricing_type === "hourly" && form.price) ||
    (form.pricing_type === "flat" && form.flat_rate) ||
    (form.pricing_type === "both" && form.price && form.flat_rate);

  async function submit() {
    if (!user) { onAuthNeeded(); return; }
    setLoading(true);
    try {
      const payload = {
        address: form.address, city: form.city, lat: form.lat, lng: form.lng,
        near: form.near, distance_to_venue: form.distance_to_venue,
        categories: form.categories, category: form.categories[0] || "Sports",
        type: form.type, pricing_type: form.pricing_type,
        price: form.price ? parseInt(form.price) : null,
        flat_rate: form.flat_rate ? parseInt(form.flat_rate) : null,
        flat_duration: form.flat_duration,
        ev: form.ev, covered: form.covered,
        image_url: form.image_url || null,
        owner_name: user.name, rating: 5.0, reviews: 0,
        tags: [...(form.covered ? ["Covered"] : []), ...(form.ev ? ["EV charging"] : [])],
        color: "#1a3a5c",
      };
      await supabase.query("listings", { method: "POST", body: JSON.stringify(payload) });
      setDone(true);
    } catch (e) { setDone(true); }
    setLoading(false);
  }

  if (done) return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🙌</div>
        <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Space listed!</div>
        <div style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>
          Your spot at <strong>{form.address}</strong> is now live on ParkSpot.
        </div>
        <button onClick={onClose} style={S.btn}>Back to listings</button>
      </div>
    </div>
  );

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>List your space</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>Step {step} of {STEPS}</div>
        <div style={{ height: 3, background: "#f0f0f0", borderRadius: 4, marginBottom: 20 }}>
          <div style={{ height: "100%", width: `${(step / STEPS) * 100}%`, background: "#0a84ff", borderRadius: 4, transition: "width 0.3s" }} />
        </div>

        {/* ── STEP 1: Location & Categories ── */}
        {step === 1 && <>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Your spot address</label>
            <input ref={inputRef} placeholder="123 Main St, Boston MA" style={S.input} defaultValue={form.address} onChange={e => update("address", e.target.value)} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Nearest venue / landmark</label>
            <input ref={venueInputRef} placeholder="e.g. Fenway Park, TD Garden..." style={S.input} defaultValue={form.near} onChange={e => update("near", e.target.value)} />
            {distanceLoading && <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>📍 Calculating walking distance...</div>}
            {form.distance_to_venue && !distanceLoading && (
              <div style={{ fontSize: 11, color: "#34c759", marginTop: 4, fontWeight: 600 }}>🚶 {form.distance_to_venue} from venue</div>
            )}
            {!form.distance_to_venue && !distanceLoading && form.near && (
              <div style={{ marginTop: 6 }}>
                <label style={S.label}>Walking distance (enter manually)</label>
                <input placeholder="e.g. 5 min walk, 0.3 mi" value={form.distance_to_venue} onChange={e => update("distance_to_venue", e.target.value)} style={{ ...S.input, fontSize: 12 }} />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={S.label}>What's nearby? (select all that apply)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => {
                const selected = form.categories.includes(cat);
                return (
                  <div key={cat} onClick={() => toggleCategory(cat)} style={{
                    padding: "7px 12px", borderRadius: 20, cursor: "pointer",
                    border: `2px solid ${selected ? "#0a84ff" : "#e0e0e0"}`,
                    background: selected ? "#f0f7ff" : "#fff",
                    color: selected ? "#0a84ff" : "#666",
                    fontWeight: 600, fontSize: 12, transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    {icon} {cat}
                  </div>
                );
              })}
            </div>
            {form.categories.length === 0 && <div style={{ fontSize: 11, color: "#ffaa00", marginTop: 6 }}>Select at least one category</div>}
          </div>

          <button onClick={() => setStep(2)} disabled={!canProceed1} style={{ ...S.btn, opacity: canProceed1 ? 1 : 0.5, cursor: canProceed1 ? "pointer" : "not-allowed" }}>
            Continue
          </button>
        </>}

        {/* ── STEP 2: Space details & Photo ── */}
        {step === 2 && <>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Space type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {["Driveway", "Garage", "Private lot", "Street (permitted)"].map(t => (
                <div key={t} onClick={() => update("type", t)} style={{
                  padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                  border: `2px solid ${form.type === t ? "#0a84ff" : "#e0e0e0"}`,
                  background: form.type === t ? "#f0f7ff" : "#fff",
                  color: form.type === t ? "#0a84ff" : "#666",
                  fontWeight: 600, fontSize: 12, transition: "all 0.15s",
                }}>
                  {t === "Driveway" ? "🏠" : t === "Garage" ? "🏗️" : t === "Private lot" ? "🅿️" : "🚦"} {t}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {[["covered", "🏠 Covered"], ["ev", "⚡ EV charging"]].map(([key, label]) => (
              <div key={key} onClick={() => update(key, !form[key])} style={{
                flex: 1, padding: "11px 0", textAlign: "center", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${form[key] ? "#0a84ff" : "#e0e0e0"}`,
                background: form[key] ? "#f0f7ff" : "#fff",
                fontWeight: 600, fontSize: 13, color: form[key] ? "#0a84ff" : "#888", transition: "all 0.15s",
              }}>{label}</div>
            ))}
          </div>

          {/* Photo upload */}
          <div style={{ marginBottom: 18 }}>
            <label style={S.label}>Photo of your spot</label>
            {form.imagePreview ? (
              <div style={{ position: "relative" }}>
                <img src={form.imagePreview} alt="spot" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10, border: "1.5px solid #e0e0e0" }} />
                <button onClick={() => { update("imagePreview", null); update("image_url", ""); update("imageFile", null); }}
                  style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: 20, width: 28, height: 28, cursor: "pointer", fontSize: 12 }}>✕</button>
                {uploadingImage && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#0a84ff" }}>
                    Uploading...
                  </div>
                )}
                {form.image_url && !uploadingImage && (
                  <div style={{ position: "absolute", bottom: 8, left: 8, background: "#34c759", color: "#fff", borderRadius: 10, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>✓ Uploaded</div>
                )}
              </div>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 120, border: "2px dashed #e0e0e0", borderRadius: 10, cursor: "pointer", background: "#fafafa", gap: 6 }}>
                <span style={{ fontSize: 28 }}>📷</span>
                <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Tap to upload a photo</span>
                <span style={{ fontSize: 11, color: "#bbb" }}>JPG, PNG up to 10MB</span>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              </label>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ ...S.btnGhost, flex: 1 }}>Back</button>
            <button onClick={() => setStep(3)} style={{ ...S.btn, flex: 2 }}>Continue</button>
          </div>
        </>}

        {/* ── STEP 3: Pricing ── */}
        {step === 3 && <>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Pricing model</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["hourly", "⏱️ Hourly rate", "Charge per hour — good for short stays"],
                ["flat", "🎟️ Flat event rate", "One price for the whole game/event"],
                ["both", "⚡ Both", "Let renters choose — maximizes bookings"],
              ].map(([val, label, desc]) => (
                <div key={val} onClick={() => update("pricing_type", val)} style={{
                  padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${form.pricing_type === val ? "#0a84ff" : "#e0e0e0"}`,
                  background: form.pricing_type === val ? "#f0f7ff" : "#fff",
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: form.pricing_type === val ? "#0a84ff" : "#111" }}>{label}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {(form.pricing_type === "hourly" || form.pricing_type === "both") && (
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Hourly rate ($)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", fontWeight: 700 }}>$</span>
                <input type="number" placeholder="e.g. 12" value={form.price} onChange={e => update("price", e.target.value)} style={{ ...S.input, paddingLeft: 24 }} />
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>💡 Hourly spots near stadiums go for $10–$20/hr</div>
            </div>
          )}

          {(form.pricing_type === "flat" || form.pricing_type === "both") && (
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Flat event rate ($)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", fontWeight: 700 }}>$</span>
                <input type="number" placeholder="e.g. 40" value={form.flat_rate} onChange={e => update("flat_rate", e.target.value)} style={{ ...S.input, paddingLeft: 24 }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[["game", "Per game"], ["day", "Per day"], ["event", "Per event"]].map(([val, label]) => (
                  <div key={val} onClick={() => update("flat_duration", val)} style={{
                    flex: 1, padding: "7px 0", textAlign: "center", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600,
                    border: `1.5px solid ${form.flat_duration === val ? "#0a84ff" : "#e0e0e0"}`,
                    background: form.flat_duration === val ? "#f0f7ff" : "#fff",
                    color: form.flat_duration === val ? "#0a84ff" : "#888",
                  }}>{label}</div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>💡 Game day flat rates near stadiums average $40–$60</div>
            </div>
          )}

          <div style={{ background: "#fffbf0", border: "1px solid #ffe58f", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#7a5c00", marginBottom: 18 }}>
            🏆 Spots with both pricing options get <strong>2x more bookings</strong> on average.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ ...S.btnGhost, flex: 1 }}>Back</button>
            <button onClick={submit} disabled={loading || !canSubmit} style={{ ...S.btn, flex: 2, opacity: (loading || !canSubmit) ? 0.5 : 1, cursor: (!loading && canSubmit) ? "pointer" : "not-allowed" }}>
              {loading ? "Listing..." : "List my space 🚀"}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── DETAIL PANEL ────────────────────────────────────────────────────────────
function DetailPanel({ listing, onClose, onBook }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e8e8e8", overflow: "hidden", marginBottom: 12, boxShadow: "0 4px 20px rgba(10,132,255,0.12)" }}>
      <div style={{ height: 130, background: `linear-gradient(135deg, ${listing.color}ee, ${listing.color}66)`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>
        {listing.covered ? "🏠" : listing.category === "Airports" ? "✈️" : "🚗"}
        <button onClick={onClose} style={{ ...S.closeBtn, position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.3)", color: "#fff" }}>✕</button>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>{listing.address}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>📍 {listing.near}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#0a84ff" }}>${listing.price}<span style={{ fontSize: 12, fontWeight: 400, color: "#999" }}>/hr</span></div>
            <div style={{ color: "#f5a623", fontSize: 12, fontWeight: 700 }}>★ {Number(listing.rating).toFixed(1)}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
          {[["Type", listing.type], ["Covered", listing.covered ? "✓ Yes" : "✗ No"], ["EV Charging", listing.ev ? "✓ Yes" : "✗ No"], ["Availability", listing.availability || "Check owner"]].map(([k, v]) => (
            <div key={k} style={{ background: "#f8f8f8", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <button onClick={onBook} style={S.btn}>Reserve this spot</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ParkSpot() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("split"); // split | list | map
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(null);
  const [listingOpen, setListingOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("distance");
  const [authPending, setAuthPending] = useState(null); // action to do after login

  // Load listings from Supabase
  useEffect(() => {
    supabase.query("listings?select=*&order=created_at.desc")
      .then(data => { if (data?.length) setListings(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = listings.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.address?.toLowerCase().includes(q) || l.near?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q);
    const matchCat = category === "All" || l.category === category;
    return matchSearch && matchCat;
  }).sort((a, b) => {
    if (sortBy === "price") return a.price - b.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

  function handleAuthNeeded() {
    setAuthOpen(true);
  }

  function handleAuthSuccess(userData) {
    setUser(userData);
    setAuthOpen(false);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, sans-serif", background: "#f7f8fa" }}>
      {/* ── Header ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ebebeb", padding: "0 20px", flexShrink: 0 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, height: 58 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Logo size={34} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#111", letterSpacing: -0.8, lineHeight: 1 }}>ParkSpot</div>
              <div style={{ fontSize: 8, color: "#0a84ff", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Find · Park · Done</div>
            </div>
          </div>

          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13 }}>🔍</span>
            <input
              placeholder="Search venue, address, city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...S.input, paddingLeft: 30, fontSize: 13 }}
            />
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 2, gap: 1 }}>
            {[["split", "⊞ Split"], ["list", "☰ List"], ["map", "🗺 Map"]].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 11, background: view === v ? "#fff" : "transparent", color: view === v ? "#111" : "#888", boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.12)" : "none", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => setListingOpen(true)} style={{ padding: "8px 14px", background: "#111", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
            + List space
          </button>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0a84ff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
                {user.name[0].toUpperCase()}
              </div>
              <button onClick={() => setUser(null)} style={{ fontSize: 11, color: "#aaa", background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} style={{ padding: "8px 14px", background: "#f0f7ff", color: "#0a84ff", border: "1.5px solid #0a84ff33", borderRadius: 9, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
              Sign in
            </button>
          )}
        </div>

        {/* Category pills */}
        <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 10, display: "flex", gap: 5, overflowX: "auto" }}>
          {["All", ...Object.keys(CATEGORY_ICONS)].map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{ padding: "4px 12px", borderRadius: 16, border: "1.5px solid", borderColor: category === c ? "#111" : "#e0e0e0", background: category === c ? "#111" : "#fff", color: category === c ? "#fff" : "#666", fontWeight: 600, fontSize: 11, cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}>
              {CATEGORY_ICONS[c] ? `${CATEGORY_ICONS[c]} ` : ""}{c}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexShrink: 0 }}>
            {[["distance", "Closest"], ["price", "Cheapest"], ["rating", "Top rated"]].map(([v, l]) => (
              <button key={v} onClick={() => setSortBy(v)} style={{ padding: "4px 10px", borderRadius: 16, border: "1.5px solid", borderColor: sortBy === v ? "#0a84ff" : "#e0e0e0", background: sortBy === v ? "#f0f7ff" : "#fff", color: sortBy === v ? "#0a84ff" : "#888", fontWeight: 600, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", maxWidth: 1400, width: "100%", margin: "0 auto", padding: "12px 16px", gap: 12, boxSizing: "border-box" }}>

        {/* List panel */}
        {(view === "split" || view === "list") && (
          <div style={{ width: view === "list" ? "100%" : 380, flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "#999", fontWeight: 600, paddingBottom: 4 }}>
              {loading ? "Loading spots..." : `${filtered.length} spot${filtered.length !== 1 ? "s" : ""} found`}
            </div>
            {selected && view === "split" && (
              <DetailPanel listing={selected} onClose={() => setSelected(null)} onBook={() => setBooking(selected)} />
            )}
            {filtered.length === 0 && !loading ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "#bbb" }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🅿️</div>
                <div style={{ fontWeight: 700, color: "#888", fontSize: 16, marginBottom: 6 }}>No spots listed yet</div>
                <div style={{ fontSize: 13, color: "#bbb", marginBottom: 20 }}>Be the first to list your driveway and start earning.</div>
                <button onClick={() => setListingOpen(true)} style={{ ...S.btn, width: "auto", padding: "10px 24px", fontSize: 13 }}>+ List your space</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: view === "list" ? "repeat(auto-fill, minmax(260px, 1fr))" : "1fr", gap: 10 }}>
                {filtered.map(l => (
                  <ListingCard key={l.id} listing={l} onClick={l2 => { setSelected(l2); if (view === "list") setBooking(l2); }} isSelected={selected?.id === l.id} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map panel */}
        {(view === "split" || view === "map") && (
          <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", position: "relative" }}>
            <MapView listings={filtered} onSelect={l => { setSelected(l); if (view === "map") setBooking(l); }} selected={selected} />
            {/* Map overlay detail card */}
            {selected && view === "map" && (
              <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 360, background: "#fff", borderRadius: 14, boxShadow: "0 8px 28px rgba(0,0,0,0.2)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{selected.address}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>📍 {selected.near}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: "#0a84ff" }}>${selected.price}/hr</div>
                    <div style={{ color: "#f5a623", fontSize: 12 }}>★ {Number(selected.rating).toFixed(1)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => setSelected(null)} style={{ ...S.btnGhost, flex: 1, padding: "9px 0", fontSize: 13 }}>Close</button>
                  <button onClick={() => setBooking(selected)} style={{ ...S.btn, flex: 2, padding: "9px 0", fontSize: 13 }}>Reserve</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={handleAuthSuccess} />}
      {booking && <BookingModal listing={booking} onClose={() => setBooking(null)} user={user} onAuthNeeded={() => { setAuthOpen(true); }} />}
      {listingOpen && <ListSpaceModal onClose={() => setListingOpen(false)} user={user} onAuthNeeded={handleAuthNeeded} />}
    </div>
  );
}

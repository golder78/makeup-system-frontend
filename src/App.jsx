import React, { useEffect, useRef, useState } from "react";
import { api, setUnauthorizedHandler } from "../js/api.js";
import { state, toast } from "../js/core.js";

const navigation = [
  ["home", "⌂", "Home"],
  ["calendar", "▦", "Calendar"],
  ["clients", "♡", "Clients"],
  ["stock", "◌", "Stock"],
  ["money", "↗", "Money"],
  ["reports", "▤", "Reports"],
  ["services", "✳", "Services"],
];

function Wordmark({ login = false }) {
  return (
    <a
      className={`wordmark${login ? " login-wordmark" : ""}`}
      href="/"
      data-page-link={login ? undefined : "home"}
      aria-label="Fanaka Beauty dashboard"
    >
      <span className="brand-mark" aria-hidden="true">f</span>
      <span><strong>fanaka</strong><small>BEAUTY STUDIO</small></span>
    </a>
  );
}

function LoginScreen({ onLogin, error, busy, hidden }) {
  return (
    <section className="login-screen" hidden={hidden}>
      <div className="login-card">
        <Wordmark login />
        <p className="eyebrow">YOUR STUDIO, IN GOOD HANDS</p>
        <h1>Welcome<br /><em>back.</em></h1>
        <p className="login-copy">A little order for the beautiful work you do.</p>
        <form className="form-stack" onSubmit={onLogin}>
          <label>
            Email address
            <input autoComplete="username" name="email" type="email" required />
          </label>
          <label>
            Password
            <input autoComplete="current-password" name="password" type="password" required />
          </label>
          <p className="form-error" role="alert">{error}</p>
          <button className="button button-primary button-wide" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"} <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p className="login-footnote">Your beauty business, beautifully organized.</p>
      </div>
      <div className="login-aside" aria-hidden="true">
        <span className="aside-caption">A softer way to do business</span>
        <p>Beauty is<br />in the details.</p>
        <span className="aside-rule"></span>
        <span className="aside-caption">FANAKA · EST. WITH CARE</span>
      </div>
    </section>
  );
}

function RecordDialog() {
  return (
    <dialog className="record-dialog" id="record-dialog">
      <form className="dialog-card" id="record-form" method="dialog">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow" id="dialog-eyebrow">STUDIO DETAILS</p>
            <h2 id="dialog-title">Add a record</h2>
          </div>
          <button className="icon-button close-dialog" type="button" aria-label="Close dialog">×</button>
        </div>
        <div id="dialog-fields" className="form-stack"></div>
        <p className="form-error" id="dialog-error" role="alert"></p>
        <div className="dialog-actions">
          <button className="button button-quiet close-dialog" type="button">Cancel</button>
          <button className="button button-primary" type="submit">
            Save changes <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}

function AppShell({ user, onLogout, hidden }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const today = new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <div className="app-shell" hidden={hidden}>
      <aside className={`sidebar${menuOpen ? " is-open" : ""}`}>
        <Wordmark />
        <div className="sidebar-label">YOUR STUDIO</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(([page, icon, label]) => (
            <button
              className={`nav-link${state.page === page ? " is-active" : ""}`}
              data-page={page}
              key={page}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="studio-note">
            <span className="note-spark">✳</span>
            <p>Made for your<br />kind of beautiful.</p>
          </div>
          <div className="user-row">
            <span className="avatar">{(user.email?.[0] || "F").toUpperCase()}</span>
            <span className="user-meta"><strong>{user.email}</strong><small>Studio owner</small></span>
            <button className="icon-button logout-button" onClick={onLogout} aria-label="Sign out" title="Sign out">↗</button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>FANAKA</span><i>/</i><strong id="section-name">HOME</strong>
          </div>
          <div className="topbar-right">
            <span className="today-label">{today}</span>
            <span className="status-dot" aria-hidden="true"></span>
            <span className="status-text">Your studio is open</span>
          </div>
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Open navigation"
          >
            ☰
          </button>
        </header>
        <section id="page-view" className="page-view" aria-live="polite"></section>
      </main>
      <RecordDialog />
      <div className="toast-region" id="toast-region" aria-live="polite" aria-atomic="true"></div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const authChecked = useRef(false);

  useEffect(() => {
    let active = true;
    const handleExpiredSession = () => {
      if (!authChecked.current) return;
      state.user = null;
      setUser(null);
      setLoginError("Your session has expired. Please sign in again.");
    };

    window.addEventListener("session-expired", handleExpiredSession);
    setUnauthorizedHandler(() => window.dispatchEvent(new Event("session-expired")));
    api("/auth/me")
      .then((authenticatedUser) => {
        if (!active) return;
        state.user = authenticatedUser;
        setUser(authenticatedUser);
      })
      .catch((error) => {
        if (!active) return;
        if (!["Authentication required.", "Invalid or expired session."].includes(error.message)) {
          setLoginError(error.message);
        }
      })
      .finally(() => {
        if (!active) return;
        authChecked.current = true;
        setAuthReady(true);
      });

    return () => {
      active = false;
      window.removeEventListener("session-expired", handleExpiredSession);
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    import("../js/pages.js").then(({ navigate }) => navigate(state.page));
  }, [user]);

  useEffect(() => {
    if (user) import("../js/app.js");
  }, [user]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const authenticatedUser = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      form.reset();
      state.user = authenticatedUser;
      setUser(authenticatedUser);
    } catch (error) {
      setLoginError(error.message || "We couldn’t sign you in.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await api("/auth/logout", { method: "POST" });
      state.user = null;
      setUser(null);
      setLoginError("");
    } catch (error) {
      toast(`Sign out failed: ${error.message}`, true);
    }
  }

  if (!authReady) {
    return <main className="loading-state">Taking a moment to gather your studio details…</main>;
  }

  return (
    <>
      <LoginScreen
        onLogin={handleLogin}
        error={loginError}
        busy={loginBusy}
        hidden={Boolean(user)}
      />
      <AppShell user={user || {}} onLogout={handleLogout} hidden={!user} />
    </>
  );
}

"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function HomePage() {
  const { login, loading } = useAuth();
  const { preferences, updatePreferences, speakText } = useAccessibility();
  
  const [role, setRole] = useState<"spectator" | "vendor" | "security">("spectator");
  const [ticketId, setTicketId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const handleRoleChange = (selected: "spectator" | "vendor" | "security") => {
    setRole(selected);
    setError("");
    speakText(`Selected ${selected} role entry`);
  };

  const handleScanMockQr = () => {
    speakText("Scanning ticket QR code");
    setShowScanner(true);
    // Simulate successful QR code scanning after 1.5 seconds
    setTimeout(() => {
      setTicketId("TICKET-123");
      setShowScanner(false);
      speakText("Ticket QR scanned successfully. Ticket ID loaded.");
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (role === "spectator") {
        if (!ticketId.trim()) {
          setError("Please enter a Ticket ID or scan a Ticket QR");
          speakText("Error: Please enter a Ticket ID");
          return;
        }
        await login("spectator", { ticketId, name: name.trim() });
      } else {
        if (!email.trim() || !password.trim()) {
          setError("Email and Password are required");
          speakText("Error: Credentials required");
          return;
        }
        await login(role, { email: email.trim(), password: password.trim(), name: name.trim() });
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify credentials.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-stadium-bg text-stadium-on-bg justify-between p-4 md:p-8 transition-colors duration-300">
      {/* Top Banner & Header */}
      <header className="flex flex-col items-center gap-2 text-center mt-6">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl border border-primary/20 animate-pulse">
          <span className="text-2xl font-bold text-primary">🏟️ STADIUM OS</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2">
          AI Stadium Operating System
        </h1>
        <p className="text-sm md:text-base text-stadium-on-surface-var max-w-md">
          Synchronized intelligence routing spectators, vendors, and security operations.
        </p>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center my-6">
        <Card variant="glass" className="w-full max-w-md p-8 rounded-3xl border border-stadium-outline/10 shadow-2xl relative overflow-hidden">
          {/* Decorative Gradient Background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -z-10" />

          {/* Role Tab Selector */}
          <div className="flex bg-stadium-surface-var/50 p-1 rounded-full mb-6 border border-stadium-outline/5">
            {(["spectator", "vendor", "security"] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
                className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-full transition-all duration-300 capitalize cursor-pointer ${
                  role === r
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-stadium-on-surface-var hover:text-stadium-on-surface"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-stadium-error/10 border border-stadium-error/20 text-xs md:text-sm text-stadium-error">
                {error}
              </div>
            )}

            {/* Simulated QR Scanner Card */}
            {role === "spectator" && showScanner && (
              <div className="p-6 rounded-2xl bg-black border border-stadium-outline/25 flex flex-col items-center justify-center gap-3 animate-fade-in">
                <div className="w-24 h-24 border-2 border-dashed border-primary rounded-xl flex items-center justify-center text-primary text-3xl animate-pulse">
                  📷
                </div>
                <p className="text-xs text-slate-400">Positioning Ticket QR code in center...</p>
                <Button variant="outlined" size="sm" type="button" onClick={() => setShowScanner(false)}>
                  Cancel Scan
                </Button>
              </div>
            )}

            {role === "spectator" && !showScanner && (
              <>
                <div className="flex gap-2">
                  <Input
                    label="Ticket ID"
                    placeholder="Enter Ticket ID (e.g. TICKET-123)"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    fullWidth
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="tonal"
                      className="h-11 px-3 rounded-xl cursor-pointer"
                      onClick={handleScanMockQr}
                    >
                      📷 Scan
                    </Button>
                  </div>
                </div>

                <Input
                  label="Name (Optional)"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                />
              </>
            )}

            {role !== "spectator" && (
              <>
                <Input
                  label="Official Email"
                  placeholder="Enter email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />
                <Input
                  label="Password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
              </>
            )}

            <Button
              type="submit"
              variant="filled"
              fullWidth
              className="mt-6 font-bold cursor-pointer"
              disabled={loading}
            >
              {loading ? "Authenticating Workspace..." : `Access ${role.toUpperCase()} Workspace`}
            </Button>
          </form>
        </Card>
      </main>

      {/* Accessibility Helper Panel */}
      <footer className="w-full max-w-xl mx-auto flex flex-col items-center gap-4 border-t border-stadium-outline/10 pt-6">
        <span className="text-xs text-stadium-on-surface-var font-semibold">
          ACCESSIBILITY PANEL
        </span>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant={preferences.largeText ? "tonal" : "outlined"}
            size="sm"
            onClick={() => updatePreferences({ largeText: !preferences.largeText })}
            className="cursor-pointer"
          >
            {preferences.largeText ? "✓ Large Text" : "A+ Text"}
          </Button>
          <Button
            variant={preferences.screenReader ? "tonal" : "outlined"}
            size="sm"
            onClick={() => updatePreferences({ screenReader: !preferences.screenReader })}
            className="cursor-pointer"
          >
            {preferences.screenReader ? "✓ Screen Reader" : "🔊 Audio Readout"}
          </Button>
          <Button
            variant={preferences.wheelchairRoute ? "tonal" : "outlined"}
            size="sm"
            onClick={() => updatePreferences({ wheelchairRoute: !preferences.wheelchairRoute })}
            className="cursor-pointer"
          >
            {preferences.wheelchairRoute ? "✓ Wheelchair Route" : "♿ Mobility Mode"}
          </Button>
        </div>
        <p className="text-xxs text-stadium-on-surface-var text-center">
          Material Design 3 Theme conforming to WCAG AA Accessibility.
        </p>
      </footer>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/services/api-client";

interface ExitStrategy {
  gate: string;
  allowedTiers: string[];
  estimatedTime: string;
}

interface TransportStatus {
  traffic: Record<string, string>;
  parking: { totalSpots: number; availableSpots: number; reservedSpots: number };
  exitPlan: Record<string, ExitStrategy>;
}

export default function OperationsPage() {
  const { user, logout } = useAuth();
  const { speakText } = useAccessibility();

  // Dashboard state
  const [metrics, setMetrics] = useState({
    activeIncidentsCount: 0,
    criticalIncidentsCount: 0,
    totalOrdersCount: 0,
    queueWaitTimesMinutes: {} as Record<string, number>,
    utilityStatuses: {} as Record<string, string>,
    geminiSummary: ""
  });

  // Transport state
  const [transport, setTransport] = useState<TransportStatus>({
    traffic: {},
    parking: { totalSpots: 0, availableSpots: 0, reservedSpots: 0 },
    exitPlan: {}
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Edit Transport plan form
  const [selectedTier, setSelectedTier] = useState("General");
  const [exitGate, setExitGate] = useState("");
  const [allowedTiersInput, setAllowedTiersInput] = useState("");
  const [estTime, setEstTime] = useState("");
  const [planSubmitState, setPlanSubmitState] = useState<string | null>(null);

  // Load telemetry metrics
  const loadMetrics = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Fetch dashboard summaries
      const summary = await apiClient.get<any>("/operations/dashboard-summary");
      setMetrics(summary);

      // 2. Fetch transport stats
      const transStatus = await apiClient.get<TransportStatus>("/transportation/status");
      setTransport(transStatus);

      // Pre-fill edit form
      if (transStatus.exitPlan && transStatus.exitPlan[selectedTier]) {
        const plan = transStatus.exitPlan[selectedTier];
        setExitGate(plan.gate);
        setAllowedTiersInput(plan.allowedTiers.join(", "));
        setEstTime(plan.estimatedTime);
      }
    } catch (err: any) {
      console.error("Operations telemetry sync failed", err);
      setErrorMsg("Degraded to offline local workspace. Showing simulated telemetry metrics.");
      
      // Fallback Seed Data
      setMetrics({
        activeIncidentsCount: 3,
        criticalIncidentsCount: 1,
        totalOrdersCount: 22,
        queueWaitTimesMinutes: { "Gate A": 5, "Gate B": 12, "Gate C": 24, "Food Concourse": 15 },
        utilityStatuses: { "Water Pressure": "nominal", "Power Grid": "nominal", "Waste Fill Rate": "38%" },
        geminiSummary: "[Offline Fallback Summary] Operations telemetry nominal. Elevated latency (24m) detected at Gate C entry checkpoint. Security incident INC-9214 has responders deployed. Waste and electricity utilities healthy."
      });
      setTransport({
        traffic: { "Main Access Road": "heavy", "Expressway Exit": "moderate", "Subway Line A": "light" },
        parking: { totalSpots: 2000, availableSpots: 740, reservedSpots: 200 },
        exitPlan: {
          VVIP: { gate: "Gate A VIP Bypass", allowedTiers: ["VVIP", "VIP"], estimatedTime: "10 mins" },
          General: { gate: "Gates B, C, D", allowedTiers: ["General"], estimatedTime: "35 mins" }
        }
      });
      
      // Seed form values
      setExitGate("Gates B, C, D");
      setAllowedTiersInput("General");
      setEstTime("35 mins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [selectedTier]);

  // Update Transport schedule
  const handleUpdateExitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitGate.trim() || !estTime.trim()) return;

    setPlanSubmitState("submitting");
    speakText(`Updating transportation exit plan for ${selectedTier} tier.`);

    const payload = {
      tier: selectedTier,
      strategy: {
        gate: exitGate,
        allowedTiers: allowedTiersInput.split(",").map((s) => s.trim()).filter(Boolean),
        estimatedTime: estTime
      }
    };

    try {
      await apiClient.put("/transportation/exit-plan", payload);
      setPlanSubmitState("success");
      speakText("Exit strategy schedule updated successfully.");
      
      // Update local state
      setTransport((prev) => ({
        ...prev,
        exitPlan: {
          ...prev.exitPlan,
          [selectedTier]: payload.strategy
        }
      }));
      
      setTimeout(() => setPlanSubmitState(null), 3000);
    } catch (err) {
      console.error("Exit plan update sync failed", err);
      setPlanSubmitState("failed");
      
      // Offline fallback simulation
      setTransport((prev) => ({
        ...prev,
        exitPlan: {
          ...prev.exitPlan,
          [selectedTier]: payload.strategy
        }
      }));
      
      setTimeout(() => setPlanSubmitState(null), 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-stadium-bg text-stadium-on-bg">
      {/* Header Banner */}
      <header className="glass-panel p-4 flex items-center justify-between border-b border-stadium-outline/10 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xl">📊</span>
          <div>
            <h1 className="text-md font-bold tracking-tight text-primary">Operations Command Panel</h1>
            <p className="text-xxs text-stadium-on-surface-var">System Workspace: Master Analytics Control</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outlined" size="sm" onClick={loadMetrics} className="h-8 text-xxs font-bold cursor-pointer">
            🔄 Refresh Telemetry
          </Button>
          <Button variant="text" size="sm" onClick={logout} className="text-xxs">
            Logout
          </Button>
        </div>
      </header>

      {/* Warning notifications */}
      {errorMsg && (
        <div className="bg-stadium-outline/10 text-center py-2 text-xxs border-b border-stadium-outline/5 text-stadium-on-surface-var">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Main Grid View */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6">
        
        {/* Left Side: Telemetry grid and AI Synopsis */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          
          {/* AI generated health synopsis */}
          <Card variant="glass" className="border border-primary/20 bg-primary/5 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">✨</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">AI Stadium Health Synopsis</h2>
            </div>
            {loading ? (
              <div className="h-12 flex items-center text-xs">Generating summary report...</div>
            ) : (
              <p className="text-xs text-stadium-on-surface leading-relaxed font-medium">
                {metrics.geminiSummary || "Operations running nominally. No anomalies detected."}
              </p>
            )}
          </Card>

          {/* Quick Metrics grid summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <Card variant="elevated" className="p-4 rounded-xl flex items-center gap-3">
              <div className="p-3.5 bg-stadium-error/10 rounded-xl text-stadium-error text-lg">🚨</div>
              <div>
                <span className="text-[10px] text-stadium-on-surface-var block">Active Incidents</span>
                <span className="text-lg font-black text-stadium-on-surface">{metrics.activeIncidentsCount}</span>
                <span className="text-[9px] block text-stadium-on-surface-var">({metrics.criticalIncidentsCount} critical)</span>
              </div>
            </Card>

            <Card variant="elevated" className="p-4 rounded-xl flex items-center gap-3">
              <div className="p-3.5 bg-primary/10 rounded-xl text-primary text-lg">🍔</div>
              <div>
                <span className="text-[10px] text-stadium-on-surface-var block">Total Orders Submitted</span>
                <span className="text-lg font-black text-stadium-on-surface">{metrics.totalOrdersCount}</span>
                <span className="text-[9px] block text-stadium-on-surface-var">Food & Beverages</span>
              </div>
            </Card>

            <Card variant="elevated" className="p-4 rounded-xl flex items-center gap-3">
              <div className="p-3.5 bg-secondary/10 rounded-xl text-secondary text-lg">🚗</div>
              <div>
                <span className="text-[10px] text-stadium-on-surface-var block">Parking Occupancy</span>
                <span className="text-lg font-black text-stadium-on-surface">
                  {transport.parking.totalSpots 
                    ? `${(100 - (transport.parking.availableSpots / transport.parking.totalSpots * 100)).toFixed(0)}%`
                    : "0%"
                  }
                </span>
                <span className="text-[9px] block text-stadium-on-surface-var">({transport.parking.availableSpots} spots left)</span>
              </div>
            </Card>

          </div>

          {/* Gate Latency and Utility Status panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <Card variant="elevated" className="rounded-xl p-4">
              <h3 className="text-xs font-bold text-stadium-on-surface uppercase tracking-wider mb-3">
                ⏱️ Checkpoint Queue Wait Times
              </h3>
              <div className="space-y-2">
                {Object.entries(metrics.queueWaitTimesMinutes).map(([gate, minutes], idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-stadium-surface-var/30 text-xxs">
                    <span className="text-stadium-on-surface-var font-semibold">{gate}</span>
                    <span className={`font-bold ${minutes > 20 ? "text-stadium-error" : "text-stadium-on-surface"}`}>
                      {minutes} minutes
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="elevated" className="rounded-xl p-4">
              <h3 className="text-xs font-bold text-stadium-on-surface uppercase tracking-wider mb-3">
                🚰 Utility Network Statuses
              </h3>
              <div className="space-y-2">
                {Object.entries(metrics.utilityStatuses).map(([util, status], idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-stadium-surface-var/30 text-xxs">
                    <span className="text-stadium-on-surface-var font-semibold">{util}</span>
                    <span className="font-bold text-emerald-500 uppercase">{status}</span>
                  </div>
                ))}
              </div>
            </Card>

          </div>

        </section>

        {/* Right Side: Exit schedules control panel and traffic metrics */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Update Exit plan strategy */}
          <div>
            <h2 className="text-sm font-bold text-stadium-on-surface tracking-wider uppercase px-1 mb-3">
              🚏 Egress Strategist
            </h2>
            <Card variant="glass" className="rounded-2xl border border-stadium-outline/10 p-5">
              <form onSubmit={handleUpdateExitPlan} className="space-y-4">
                
                {/* Select Tier */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-stadium-on-surface-var">Ticket Tier Class</label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-stadium-outline bg-transparent text-xs text-stadium-on-surface focus:border-primary focus:outline-none"
                  >
                    <option className="bg-stadium-surface" value="General">General Seating Tiers</option>
                    <option className="bg-stadium-surface" value="VVIP">VVIP / Premium VIP Lounge</option>
                  </select>
                </div>

                <Input label="Egress Gate Route" placeholder="e.g. Gates B, C, D" value={exitGate} onChange={(e) => setExitGate(e.target.value)} fullWidth className="text-xs" />
                <Input label="Allowed Tiers List" placeholder="e.g. General, Premium" value={allowedTiersInput} onChange={(e) => setAllowedTiersInput(e.target.value)} fullWidth className="text-xs" />
                <Input label="Est. Egress Latency" placeholder="e.g. 35 mins" value={estTime} onChange={(e) => setEstTime(e.target.value)} fullWidth className="text-xs" />

                {planSubmitState === "success" && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xxs text-center">
                    ✓ Egress strategy logs updated. Map highlights adjusted.
                  </div>
                )}

                <Button type="submit" variant="filled" fullWidth className="h-10 text-xs font-bold" disabled={planSubmitState === "submitting"}>
                  {planSubmitState === "submitting" ? "Syncing strategy..." : "Commit Egress Strategy"}
                </Button>
              </form>
            </Card>
          </div>

          {/* Traffic summary */}
          <div>
            <h2 className="text-sm font-bold text-stadium-on-surface tracking-wider uppercase px-1 mb-3">
              🚗 Surrounding Road Traffic
            </h2>
            <Card variant="glass" className="rounded-2xl border border-stadium-outline/10 p-4 space-y-3">
              {Object.entries(transport.traffic).map(([road, load], idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-stadium-surface-var/25 border border-stadium-outline/5">
                  <span className="text-xs font-bold text-stadium-on-surface">{road}</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    load === "heavy"
                      ? "bg-stadium-error/15 text-stadium-error animate-pulse"
                      : load === "moderate"
                      ? "bg-amber-500/15 text-amber-500"
                      : "bg-emerald-500/15 text-emerald-500"
                  }`}>
                    {load}
                  </span>
                </div>
              ))}
            </Card>
          </div>

        </section>

      </main>
    </div>
  );
}

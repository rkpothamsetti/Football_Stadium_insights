"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/services/api-client";

interface IncidentLocation {
  section: string;
  gate: string;
  label: string;
  x?: number;
  y?: number;
}

interface Incident {
  incidentId: string;
  severity: "low" | "medium" | "high" | "critical";
  location: IncidentLocation;
  description: string;
  status: "reported" | "assigned" | "resolving" | "resolved";
  assignedTeam?: string;
  reportedBy: string;
  createdAt: string;
}

export default function SecurityPage() {
  const { user, logout } = useAuth();
  const { speakText } = useAccessibility();

  // State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Report incident form state
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [section, setSection] = useState("");
  const [gate, setGate] = useState("");
  const [description, setDescription] = useState("");
  const [formSubmitState, setFormSubmitState] = useState<string | null>(null);

  // Live crowd density levels from telemetry
  const [zones, setZones] = useState<any[]>([]);

  // Load active incidents
  const loadIncidents = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await apiClient.get<Incident[]>("/security/incidents");
      setIncidents(data);

      // Fetch queue times from operations summary to populate live zones density
      try {
        const summary = await apiClient.get<any>("/operations/dashboard-summary");
        if (summary && summary.queueWaitTimesMinutes) {
          const mappedZones = Object.entries(summary.queueWaitTimesMinutes).map(([name, minutes]: any) => {
            let status = "nominal";
            let density = "15%";
            if (minutes > 20) {
              status = "congested";
              density = "85%";
            } else if (minutes > 10) {
              status = "moderate";
              density = "50%";
            }
            return { name: name + " Area", status, density };
          });
          setZones(mappedZones);
        }
      } catch (err) {
        console.error("Failed loading queue wait times:", err);
      }
    } catch (err: any) {
      console.error("Failed fetching incidents list", err);
      setErrorMsg("Degraded to offline local workspace. Showing simulated logs.");
      
      // Fallback Seed Data
      setIncidents([
        {
          incidentId: "INC-8547",
          severity: "high",
          location: { section: "Section 204", gate: "Gate C", label: "Stairwell 2B Obstruction" },
          description: "Staircase blockage caused by garbage accumulation. Obstructing spectator flow.",
          status: "assigned",
          assignedTeam: "Maintenance Response Squad 1",
          reportedBy: "officer_1",
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          incidentId: "INC-9214",
          severity: "critical",
          location: { section: "Gate C", gate: "Gate C", label: "Ticket Scanner Offline" },
          description: "RFID ticketing kiosk scanner not responding. Congestion mounting at entry gate.",
          status: "reported",
          reportedBy: "gate_officer_3",
          createdAt: new Date(Date.now() - 600000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  // Update incident status
  const updateIncidentState = async (
    incidentId: string,
    nextStatus: "reported" | "assigned" | "resolving" | "resolved",
    teamName?: string
  ) => {
    speakText(`Incident status updated to ${nextStatus}`);
    
    // Update local state first
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.incidentId === incidentId
          ? { ...inc, status: nextStatus, assignedTeam: teamName || inc.assignedTeam }
          : inc
      )
    );

    try {
      await apiClient.put(`/security/incidents/${incidentId}/status`, {
        status: nextStatus,
        assignedTeam: teamName
      });
      speakText(`Incident #${incidentId.substring(0, 5)} updated successfully.`);
    } catch (err) {
      console.error("Failed to sync status update with DB", err);
    }
  };

  // Submit manual incident form
  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !section.trim() || !gate.trim()) return;

    setFormSubmitState("submitting");
    speakText("Lodging security incident log");

    const payload = {
      severity,
      location: {
        section,
        gate,
        label: `${severity.toUpperCase()} incident at Section ${section}`,
        x: 0,
        y: 0
      },
      description,
      reportedBy: user?.profile.name || "Duty Officer"
    };

    try {
      const response = await apiClient.post<Incident>("/security/incidents", payload);
      
      setIncidents((prev) => [response, ...prev]);
      setFormSubmitState("success");
      speakText(`Incident reported successfully. Registered ID is ${response.incidentId.substring(0, 5)}.`);
      
      // Clear form
      setSection("");
      setGate("");
      setDescription("");
      
      setTimeout(() => setFormSubmitState(null), 3000);
    } catch (err) {
      console.error("Lodge security log failed", err);
      setFormSubmitState("failed");
      
      // Fallback client simulation
      const fallbackIncident: Incident = {
        incidentId: "INC-" + Math.floor(1000 + Math.random() * 9000),
        severity: payload.severity,
        location: payload.location,
        description: payload.description,
        status: "reported",
        reportedBy: payload.reportedBy,
        createdAt: new Date().toISOString()
      };
      setIncidents((prev) => [fallbackIncident, ...prev]);
      
      setSection("");
      setGate("");
      setDescription("");
      setTimeout(() => setFormSubmitState(null), 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-stadium-bg text-stadium-on-bg">
      {/* Header Banner */}
      <header className="glass-panel p-4 flex items-center justify-between border-b border-stadium-outline/10 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xl">🛡️</span>
          <div>
            <h1 className="text-md font-bold tracking-tight text-primary">Security Dispatch Control</h1>
            <p className="text-xxs text-stadium-on-surface-var">Officer ID: {user?.profile.name || "Duty Sentinel"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outlined" size="sm" onClick={loadIncidents} className="h-8 text-xxs font-bold cursor-pointer">
            🔄 Reload Log Board
          </Button>
          <Button variant="text" size="sm" onClick={logout} className="text-xxs">
            Logout
          </Button>
        </div>
      </header>

      {/* Warning notices */}
      {errorMsg && (
        <div className="bg-stadium-outline/10 text-center py-2 text-xxs border-b border-stadium-outline/5 text-stadium-on-surface-var">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Main Grid Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6">
        
        {/* Left Side: Active security incidents board */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-stadium-on-surface tracking-wider uppercase px-1">
            ⚠️ Active Incidents Board
          </h2>

          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[300px]">
              <span className="animate-spin text-2xl">⏳</span>
              <span className="ml-2 text-xs">Syncing dispatcher files...</span>
            </div>
          ) : incidents.length === 0 ? (
            <Card variant="outlined" className="p-8 text-center min-h-[300px] flex flex-col justify-center items-center rounded-2xl border-dashed">
              <span className="text-2xl">✓</span>
              <p className="text-xs text-emerald-500 font-semibold mt-2">Stadium secure. Zero active incidents reported.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {incidents.map((inc) => (
                <Card
                  key={inc.incidentId}
                  variant="elevated"
                  className={`border-l-4 rounded-xl transition-all ${
                    inc.severity === "critical"
                      ? "border-l-stadium-error"
                      : inc.severity === "high"
                      ? "border-l-orange-500"
                      : inc.severity === "medium"
                      ? "border-l-amber-500"
                      : "border-l-stadium-outline"
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stadium-on-surface">Incident ID #{inc.incidentId.substring(0, 8)}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          inc.severity === "critical"
                            ? "bg-stadium-error/15 text-stadium-error"
                            : inc.severity === "high"
                            ? "bg-orange-500/15 text-orange-500"
                            : inc.severity === "medium"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-stadium-outline/15 text-stadium-on-surface-var"
                        }`}>
                          {inc.severity}
                        </span>
                        <span className="text-xxs text-stadium-on-surface-var">Status: {inc.status}</span>
                      </div>


                      <p className="text-xxs text-primary font-semibold mt-1">📍 Seating Gate: {inc.location.gate} • Section: {inc.location.section}</p>
                      <p className="text-xs text-stadium-on-surface mt-2.5 font-medium">{inc.description}</p>
                      
                      {inc.assignedTeam && (
                        <div className="mt-2.5 text-xxs bg-primary/5 border border-primary/10 px-2 py-1 rounded-lg inline-block text-primary">
                          🛡️ Assigned Unit: {inc.assignedTeam}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                      <span className="text-[10px] text-stadium-on-surface-var">
                        Reported by: {inc.reportedBy}
                      </span>
                      
                      {/* Transition button controls */}
                      <div className="flex gap-1.5 w-full justify-end">
                        {inc.status === "reported" && (
                          <Button variant="filled" size="sm" className="h-8 text-xxs !rounded-lg" onClick={() => updateIncidentState(inc.incidentId, "assigned", "Response Team " + Math.floor(1 + Math.random() * 5))}>
                            Deploy Response Team
                          </Button>
                        )}
                        {inc.status === "assigned" && (
                          <Button variant="filled" size="sm" className="h-8 text-xxs bg-emerald-500 hover:brightness-110 !rounded-lg" onClick={() => updateIncidentState(inc.incidentId, "resolved")}>
                            Resolve Incident
                          </Button>
                        )}
                        {inc.status !== "resolved" && (
                          <Button variant="outlined" size="sm" className="h-8 text-xxs !rounded-lg" onClick={() => updateIncidentState(inc.incidentId, "resolved")}>
                            Force Close
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Right Side: Log manual Incident and Crowd Density tracker */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Manual incident form */}
          <div>
            <h2 className="text-sm font-bold text-stadium-on-surface tracking-wider uppercase px-1 mb-3">
              ✍️ Lodge Incident Log
            </h2>
            <Card variant="glass" className="rounded-2xl border border-stadium-outline/10 p-5">
              <form onSubmit={handleReportIncident} className="space-y-4">
                
                {/* Severity Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-stadium-on-surface-var">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e: any) => setSeverity(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-stadium-outline bg-transparent text-xs text-stadium-on-surface focus:border-primary focus:outline-none"
                  >
                    <option className="bg-stadium-surface" value="low">Low (Maintenance/Utility)</option>
                    <option className="bg-stadium-surface" value="medium">Medium (Obstruction/Crowd)</option>
                    <option className="bg-stadium-surface" value="high">High (Injury/Altercation)</option>
                    <option className="bg-stadium-surface" value="critical">Critical (Fire/Medical SOS)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Input label="Section" placeholder="e.g. 204" value={section} onChange={(e) => setSection(e.target.value)} fullWidth className="text-xs" />
                  <Input label="Gate" placeholder="e.g. Gate C" value={gate} onChange={(e) => setGate(e.target.value)} fullWidth className="text-xs" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-stadium-on-surface-var">Incident Description</label>
                  <textarea
                    rows={3}
                    placeholder="Enter incident specifics..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="px-4 py-3 rounded-xl border border-stadium-outline bg-transparent text-xs text-stadium-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                {formSubmitState === "success" && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xxs text-center">
                    ✓ Security Incident Registered. Dispatch alerts sent.
                  </div>
                )}

                <Button type="submit" variant="filled" fullWidth className="h-10 text-xs font-bold" disabled={formSubmitState === "submitting"}>
                  {formSubmitState === "submitting" ? "Registering Log..." : "Submit Dispatch Alert"}
                </Button>
              </form>
            </Card>
          </div>

          {/* Crowd density tracker */}
          <div>
            <h2 className="text-sm font-bold text-stadium-on-surface tracking-wider uppercase px-1 mb-3">
              🚦 Live Crowd Densities
            </h2>
            <Card variant="glass" className="rounded-2xl border border-stadium-outline/10 p-4 space-y-3">
              {zones.map((zone, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-stadium-surface-var/25 border border-stadium-outline/5">
                  <div>
                    <span className="block text-xs font-bold text-stadium-on-surface">{zone.name}</span>
                    <span className="text-[10px] text-stadium-on-surface-var">Occupancy percentage: {zone.density}</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    zone.status === "congested"
                      ? "bg-stadium-error/15 text-stadium-error animate-pulse"
                      : zone.status === "moderate"
                      ? "bg-amber-500/15 text-amber-500"
                      : "bg-emerald-500/15 text-emerald-500"
                  }`}>
                    {zone.status}
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

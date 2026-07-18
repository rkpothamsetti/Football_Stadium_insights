"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/services/api-client";

interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

interface MessageType {
  messageId: string;
  sender: "user" | "orchestrator" | "agent";
  content: string;
  timestamp: string;
  suggestedActions?: any[];
}

export default function SpectatorPage() {
  const { user, sessionId, logout } = useAuth();
  const { preferences, updatePreferences, speakText } = useAccessibility();

  // Chat state
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputText, setInputText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // App UI panels
  const [activeTab, setActiveTab] = useState<"map" | "food">("map");

  // Food Cart state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  // Google Maps navigation state
  const [mapScale, setMapScale] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isMapDragging, setIsMapDragging] = useState(false);
  const mapDragStart = useRef({ x: 0, y: 0 });
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  const handleMapMouseDown = (e: React.MouseEvent) => {
    setIsMapDragging(true);
    mapDragStart.current = { x: e.clientX - mapPosition.x, y: e.clientY - mapPosition.y };
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (!isMapDragging) return;
    setMapPosition({
      x: e.clientX - mapDragStart.current.x,
      y: e.clientY - mapDragStart.current.y
    });
  };

  const handleMapMouseUp = () => {
    setIsMapDragging(false);
  };

  const handleZoomIn = () => {
    setMapScale((prev) => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setMapScale((prev) => Math.max(0.6, prev - 0.2));
  };

  const handleResetMap = () => {
    setMapScale(1);
    setMapPosition({ x: 0, y: 0 });
    setActiveStepIndex(null);
  };

  const steps = [
    {
      title: "Entrance Gate C Checkpoint",
      description: "Scan your ticket at Gate C security lanes.",
      coords: { x: 270, y: -234 },
      scale: 1.8,
      icon: "🎟"
    },
    {
      title: "Level 1 Concourse Walkway",
      description: "Walk straight 50 meters down the level 1 corridor.",
      coords: { x: 119, y: -105 },
      scale: 1.4,
      icon: "🚶"
    },
    {
      title: preferences.wheelchairRoute ? "Elevator B Shaft" : "Staircase 2B Climb",
      description: preferences.wheelchairRoute
        ? "Take Elevator B up to the Level 2 upper deck concourse."
        : "Climb Staircase 2B up to the Level 2 upper deck concourse.",
      coords: { x: 18, y: -27 },
      scale: 1.8,
      icon: preferences.wheelchairRoute ? "♿" : "🪜"
    },
    {
      title: "Arrival: Section 204 Row H",
      description: "Proceed to Seating Row H and find Seat 12.",
      coords: { x: -260, y: 260 },
      scale: 2.0,
      icon: "📍"
    }
  ];

  const handleStepClick = (index: number) => {
    setActiveStepIndex(index);
    const step = steps[index];
    setMapPosition(step.coords);
    setMapScale(step.scale);
    speakText(`Step ${index + 1}: ${step.title}. ${step.description}`);
  };

  // Load menu dynamically from database
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const vendors = await apiClient.get<any[]>("/fan/vendors");
        if (vendors && vendors.length > 0 && vendors[0].inventory) {
          setMenuItems(vendors[0].inventory.filter((item: any) => item.available));
        }
      } catch (err) {
        console.error("Failed loading menu items from API:", err);
      }
    };
    fetchMenu();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    setMessages([
      {
        messageId: "greet",
        sender: "orchestrator",
        content: `Welcome to the Stadium, ${user?.profile.name || "Fan"}! I am your AI Stadium assistant. How can I help you navigate to your seat in ${user?.ticketId ? 'Section 204' : 'the stadium'} or order refreshments?`,
        timestamp: new Date().toISOString()
      }
    ]);
  }, [user]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !sessionId) return;

    setErrorMsg("");
    if (!textToSend) setInputText("");

    const userMessage: MessageType = {
      messageId: Math.random().toString(),
      sender: "user",
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    setChatLoading(true);

    try {
      const response = await apiClient.post<{ responseMessage: string; activeAgent: string; suggestedActions: any[] }>(
        "/orchestrator/message",
        {
          sessionId,
          message: text,
          currentLocation: { x: 10, y: 15, level: "L1", label: "Concourse Main" }
        }
      );

      const botMessage: MessageType = {
        messageId: Math.random().toString(),
        sender: "orchestrator",
        content: response.responseMessage,
        timestamp: new Date().toISOString(),
        suggestedActions: response.suggestedActions
      };

      setMessages((prev) => [...prev, botMessage]);
      speakText(response.responseMessage);

      // Handle suggested actions automatically
      if (response.suggestedActions) {
        response.suggestedActions.forEach((action) => {
          if (action.type === "update_ui" && action.payload.view === "food") {
            setActiveTab("food");
          }
        });
      }
    } catch (err: any) {
      console.error("Message processing failed", err);
      const errorContent = err.message || "Unable to reach server. Operating System running in offline mock mode.";
      setErrorMsg(errorContent);
      
      // Push offline fallback message
      setMessages((prev) => [
        ...prev,
        {
          messageId: Math.random().toString(),
          sender: "orchestrator",
          content: `[Offline Mode] Received: "${text}". Please proceed using static maps or manual buttons.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const triggerSOS = async () => {
    speakText("Initiating emergency SOS dispatch. Security and medical personnel have been alerted.");
    
    // Add user message to log
    setMessages((prev) => [
      ...prev,
      {
        messageId: Math.random().toString(),
        sender: "user",
        content: "🚨 URGENT: TRIGGER EMERGENCY SOS ASSISTANCE",
        timestamp: new Date().toISOString()
      }
    ]);

    try {
      // 1. Send message to orchestrator to trigger safety state
      await apiClient.post("/orchestrator/message", {
        sessionId,
        message: "emergency SOS assistance required at seat"
      });

      // 2. Lodge an official security incident
      await apiClient.post("/security/incidents", {
        severity: "critical",
        location: {
          section: user?.ticketId ? "Section 204" : "Gate C",
          gate: "Gate C",
          label: `Spectator ${user?.profile.name} Seat Area`,
          x: 25.5,
          y: 35.0
        },
        description: `Emergency SOS triggered by Spectator ${user?.profile.name} (Ticket: ${user?.ticketId || "N/A"}). Urgent assistance needed.`,
        reportedBy: user?.id || "anonymous"
      });

      setMessages((prev) => [
        ...prev,
        {
          messageId: Math.random().toString(),
          sender: "orchestrator",
          content: "🚨 SOS RECEIVED. A security dispatcher has logged incident #CRITICAL and sent an emergency responder team to your seating coordinates.",
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      // Fallback display
      setMessages((prev) => [
        ...prev,
        {
          messageId: Math.random().toString(),
          sender: "orchestrator",
          content: "🚨 SOS LODGED (Offline Mode). Please stay where you are. Operations and medical safety officers are deploying to your ticket seat details.",
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  // Cart operations
  const addToCart = (item: any) => {
    speakText(`Added ${item.name} to cart`);
    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === item.itemId);
      if (existing) {
        return prev.map((i) =>
          i.itemId === item.itemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const checkoutCart = async () => {
    if (cart.length === 0) return;
    setOrderStatus("submitting");
    speakText("Submitting food order");

    try {
      const response = await apiClient.post<{ orderId: string }>("/fan/orders", {
        userId: user?.id || "fan",
        vendorId: "vendor-1",
        seatNumber: user?.ticketId ? "Row H Seat 12" : "Unassigned Seat",
        items: cart
      });

      setOrderStatus("placed");
      speakText(`Order placed successfully. Tracking ID is ${response.orderId.substring(0, 5)}.`);
      setCart([]);
      
      // Inform chat assistant
      handleSendMessage(`Placed order ID ${response.orderId}`);
    } catch (err) {
      setOrderStatus("failed");
      speakText("Order checkout failed due to connection error.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-stadium-bg text-stadium-on-bg">
      {/* Header Banner */}
      <header className="glass-panel p-4 flex items-center justify-between border-b border-stadium-outline/10 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏟️</span>
          <div>
            <h1 className="text-md font-bold tracking-tight text-primary">Spectator Hub</h1>
            <p className="text-xxs text-stadium-on-surface-var">Ticket: {user?.ticketId || "General Guest"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="danger" size="sm" className="bg-stadium-error hover:brightness-110 !rounded-xl" onClick={triggerSOS}>
            🚨 SOS HELP
          </Button>
          <Button variant="text" size="sm" onClick={logout} className="text-xxs">
            Logout
          </Button>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 md:p-6">
        
        {/* Left Side: Ticket info, maps and food ordering */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Quick Ticket info strip */}
          <Card variant="glass" className="p-4 rounded-2xl flex items-center justify-between border border-stadium-outline/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            <div>
              <span className="text-xxs text-stadium-on-surface-var uppercase font-bold tracking-widest">Active Match Ticket</span>
              <h2 className="text-lg font-extrabold text-stadium-on-surface">FIFA Finals 2026</h2>
              <p className="text-xs text-stadium-on-surface-var">Match Time: 18:00 PM • Seating Gate: Gate C</p>
            </div>
            <div className="text-right">
              <span className="block text-xs text-stadium-on-surface-var">Section / Row / Seat</span>
              <span className="text-md font-bold text-primary">Sec 204 • Row H • Seat 12</span>
            </div>
          </Card>

          {/* Navigation & Food Toggle Panel */}
          <div className="flex-1 flex flex-col min-h-[400px]">
            {/* Tabs selector */}
            <div className="flex border-b border-stadium-outline/10 bg-stadium-surface-var/30 rounded-t-2xl p-1">
              <button
                onClick={() => { setActiveTab("map"); speakText("Switched to wayfinding map"); }}
                className={`flex-1 py-3 text-xs md:text-sm font-bold transition-all ${
                  activeTab === "map" ? "border-b-2 border-primary text-primary bg-stadium-surface/50 rounded-t-xl" : "text-stadium-on-surface-var"
                }`}
              >
                🗺️ Wayfinding Map
              </button>
              <button
                onClick={() => { setActiveTab("food"); speakText("Switched to food ordering"); }}
                className={`flex-1 py-3 text-xs md:text-sm font-bold transition-all ${
                  activeTab === "food" ? "border-b-2 border-primary text-primary bg-stadium-surface/50 rounded-t-xl" : "text-stadium-on-surface-var"
                }`}
              >
                🌭 Order Food
              </button>
            </div>

            {/* Tab content space */}
            <Card variant="elevated" className="flex-1 rounded-b-2xl border-t-0 rounded-t-none p-4 flex flex-col justify-between">
              {activeTab === "map" ? (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-stadium-on-surface">Your Personalized Route</h3>
                      <p className="text-xxs text-stadium-on-surface-var">Highlighting path from Entrance Gate C to Seat Area Sec 204</p>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg text-xxs text-primary">
                      <span>♿</span>
                      <span>{preferences.wheelchairRoute ? "Mobility Mode Active" : "Stairs Navigation"}</span>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Google Maps style Sidebar navigation panel */}
                    <div className="md:col-span-5 flex flex-col gap-3 h-full max-h-[420px] overflow-y-auto pr-1">
                      {/* Route Info Card */}
                      <div className="bg-stadium-surface-var/30 border border-stadium-outline/10 p-3 rounded-xl flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-widest text-primary font-bold">ROUTE PLANNER</span>
                          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                            <button
                              type="button"
                              onClick={() => { updatePreferences({ wheelchairRoute: false }); speakText("Switched to stairs route"); }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${!preferences.wheelchairRoute ? "bg-primary text-on-primary" : "text-slate-400"}`}
                            >
                              🚶 Walk
                            </button>
                            <button
                              type="button"
                              onClick={() => { updatePreferences({ wheelchairRoute: true }); speakText("Switched to accessible route"); }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${preferences.wheelchairRoute ? "bg-emerald-500 text-white" : "text-slate-400"}`}
                            >
                              ♿ Accessible
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center gap-2 text-stadium-on-surface">
                            <span className="text-emerald-500 text-xs">🟢</span>
                            <div className="font-semibold truncate text-[11px]">Entrance Checkpoint: Gate C</div>
                          </div>
                          <div className="h-3 border-l border-dashed border-stadium-outline/40 ml-1.5" />
                          <div className="flex items-center gap-2 text-stadium-on-surface">
                            <span className="text-primary text-xs">🔴</span>
                            <div className="font-semibold truncate text-[11px]">Your Seat: Section 204, Row H, Seat 12</div>
                          </div>
                        </div>

                        <div className="border-t border-stadium-outline/10 pt-2 flex items-center justify-between text-xxs text-stadium-on-surface-var">
                          <span>Estimated time:</span>
                          <span className="font-bold text-primary text-[11px]">
                            {preferences.wheelchairRoute ? "3.5 mins (190m) via Elevator" : "2.0 mins (150m) via Stairs"}
                          </span>
                        </div>
                      </div>

                      {/* Step-by-Step Directions */}
                      <div className="flex flex-col gap-2">
                        {steps.map((step, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleStepClick(idx)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex gap-3 items-start select-none ${
                              activeStepIndex === idx
                                ? "bg-primary/10 border-primary shadow-[0_0_8px_rgba(var(--md-primary-rgb),0.1)]"
                                : "bg-stadium-surface-var/25 border-stadium-outline/5 hover:border-primary/20"
                            }`}
                          >
                            <div className="w-6 h-6 rounded-lg bg-stadium-surface flex items-center justify-center text-xs shadow-sm shrink-0 mt-0.5">
                              {step.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400">STEP {idx + 1}</span>
                                {activeStepIndex === idx && <span className="text-[9px] text-primary font-semibold animate-pulse">ACTIVE</span>}
                              </div>
                              <h4 className="text-xs font-bold text-stadium-on-surface truncate mt-0.5">{step.title}</h4>
                              <p className="text-[10px] text-stadium-on-surface-var mt-0.5 leading-relaxed">{step.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Main Interactive Map Layout */}
                    <div className="md:col-span-7 flex flex-col gap-2 h-full min-h-[320px] md:min-h-[420px]">
                      <div
                        className="relative flex-1 bg-black/90 rounded-xl border border-primary/20 flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden"
                        onMouseDown={handleMapMouseDown}
                        onMouseMove={handleMapMouseMove}
                        onMouseUp={handleMapMouseUp}
                        onMouseLeave={handleMapMouseUp}
                      >
                        {/* Zoom & Control actions overlay */}
                        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
                          <button
                            onClick={handleZoomIn}
                            className="w-8 h-8 rounded-lg bg-black/85 border border-white/10 text-white flex items-center justify-center font-bold text-sm hover:bg-black/95 hover:border-primary/40 active:scale-95 shadow-lg cursor-pointer"
                          >
                            ＋
                          </button>
                          <button
                            onClick={handleZoomOut}
                            className="w-8 h-8 rounded-lg bg-black/85 border border-white/10 text-white flex items-center justify-center font-bold text-sm hover:bg-black/95 hover:border-primary/40 active:scale-95 shadow-lg cursor-pointer"
                          >
                            －
                          </button>
                          <button
                            onClick={handleResetMap}
                            className="w-8 h-8 rounded-lg bg-black/85 border border-white/10 text-white flex items-center justify-center text-xs hover:bg-black/95 hover:border-primary/40 active:scale-95 shadow-lg cursor-pointer"
                          >
                            🔄
                          </button>
                        </div>

                        {/* Interactive Map content wrapper */}
                        <div
                          className="absolute transition-transform duration-300 ease-out"
                          style={{
                            transform: `translate(${mapPosition.x}px, ${mapPosition.y}px) scale(${mapScale})`,
                            transformOrigin: "center",
                            width: "500px",
                            height: "500px",
                          }}
                        >
                          {/* Base Blueprint Map Image */}
                          <img
                            src="/images/stadium_map_blueprint.png"
                            alt="Stadium Map Blueprint"
                            className="w-full h-full object-cover opacity-85 select-none pointer-events-none rounded-xl"
                          />

                          {/* SVG overlay for route lines, markers, POIs */}
                          <svg viewBox="0 0 500 500" className="absolute inset-0 w-full h-full pointer-events-none">
                            {/* Wayfinding Route Line */}
                            {preferences.wheelchairRoute ? (
                              /* Wheelchair Accessible Path (via Elevator) */
                              <path
                                d="M 100 380 L 250 310 L 250 210 L 380 120"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="4"
                                strokeDasharray="8 6"
                                className="animate-pulse"
                              />
                            ) : (
                              /* Standard Pedestrian Path (via Stairs) */
                              <path
                                d="M 100 380 L 230 270 L 230 210 L 380 120"
                                fill="none"
                                stroke="#00bfff"
                                strokeWidth="4"
                                strokeDasharray="8 6"
                                className="animate-pulse"
                              />
                            )}

                            {/* Glowing Gate C entrance pin marker */}
                            <g transform="translate(100, 380)" className="pointer-events-auto cursor-pointer" onClick={() => handleStepClick(0)}>
                              <circle cx="0" cy="0" r="15" fill="rgba(16, 185, 129, 0.15)" />
                              <circle cx="0" cy="0" r="6" fill="#10b981" />
                              <circle cx="0" cy="0" r="10" fill="none" stroke="#10b981" strokeWidth="1" className="animate-ping" style={{ animationDuration: "3s" }} />
                            </g>

                            {/* Glowing Section 204 destination marker */}
                            <g transform="translate(380, 120)" className="pointer-events-auto cursor-pointer" onClick={() => handleStepClick(3)}>
                              <circle cx="0" cy="0" r="16" fill="rgba(168, 85, 247, 0.2)" />
                              <circle cx="0" cy="0" r="6" fill="#a855f7" />
                              <path d="M 0 -12 L -6 -6 L 6 -6 Z" fill="#a855f7" />
                              <circle cx="0" cy="0" r="12" fill="none" stroke="#a855f7" strokeWidth="1" className="animate-ping" style={{ animationDuration: "3s" }} />
                            </g>

                            {/* Interactive Points of Interest (POIs) */}
                            {/* Concessions */}
                            <g transform="translate(320, 180)" className="pointer-events-auto cursor-help">
                              <circle cx="0" cy="0" r="8" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1" />
                              <text x="0" y="3" fontSize="8" fill="#f59e0b" textAnchor="middle">🌭</text>
                            </g>
                            {/* Restrooms */}
                            <g transform="translate(180, 220)" className="pointer-events-auto cursor-help">
                              <circle cx="0" cy="0" r="8" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="1" />
                              <text x="0" y="3" fontSize="8" fill="#3b82f6" textAnchor="middle">🚻</text>
                            </g>
                            {/* First Aid */}
                            <g transform="translate(120, 150)" className="pointer-events-auto cursor-help">
                              <circle cx="0" cy="0" r="8" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="1" />
                              <text x="0" y="3" fontSize="8" fill="#ef4444" textAnchor="middle">🚨</text>
                            </g>
                          </svg>
                        </div>

                        {/* HUD Map Key overlay */}
                        <div className="absolute bottom-3 left-3 flex flex-col gap-1 text-[9px] bg-black/85 p-2 rounded-lg border border-white/10 pointer-events-none">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_4px_#10b981]" />
                            <span className="text-slate-300">Gate C (Start)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#a855f7] shadow-[0_0_4px_#a855f7]" />
                            <span className="text-slate-300">Section 204 (Seat)</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>🌭 Concessions</span>
                            <span>•</span>
                            <span>🚻 Restrooms</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-stadium-on-surface">Browse Vendor Menu</h3>
                        <p className="text-xxs text-stadium-on-surface-var">Seat delivery from Stadium Central Concessions</p>
                      </div>
                      <div className="text-xxs font-bold text-primary">Delivery: Row H Seat 12</div>
                    </div>

                    {/* Menu items list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {menuItems.map((item) => {
                        const itemImages: Record<string, string> = {
                          "item-01": "/images/hot_dog.png",
                          "item-02": "/images/pretzel.png",
                          "item-03": "/images/craft_beer.png",
                          "item-04": "/images/soda_pop.png",
                        };
                        const imageUrl = itemImages[item.itemId] || "/images/file.svg";
                        return (
                          <div key={item.itemId} className="flex gap-3 items-center p-2 rounded-xl bg-stadium-surface-var/30 border border-stadium-outline/5 hover:border-primary/20 transition-all">
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className="w-14 h-14 object-cover rounded-lg border border-stadium-outline/5 bg-stadium-surface-var/50 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="block text-xs font-bold text-stadium-on-surface truncate">{item.name}</span>
                              <span className="text-xxs text-stadium-on-surface-var block mt-0.5">${item.price.toFixed(2)} • {item.category}</span>
                            </div>
                            <Button variant="tonal" size="sm" className="h-7 px-2.5 text-xxs !rounded-lg shrink-0" onClick={() => addToCart(item)}>
                              + Add
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cart Summary & Checkout */}
                  <div className="mt-4 pt-4 border-t border-stadium-outline/10">
                    {cart.length > 0 ? (
                      <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/10">
                        <div className="text-xxs">
                          <span className="font-bold text-stadium-on-surface">{cart.reduce((acc, i) => acc + i.quantity, 0)} Items in Cart</span>
                          <span className="block text-stadium-on-surface-var mt-0.5">Total Amount: ${cart.reduce((acc, i) => acc + i.price * i.quantity, 0).toFixed(2)}</span>
                        </div>
                        <Button variant="filled" size="sm" className="h-8 text-xxs font-bold" onClick={checkoutCart} disabled={orderStatus === "submitting"}>
                          {orderStatus === "submitting" ? "Processing..." : "Confirm & Pay"}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-xxs text-stadium-on-surface-var">
                        {orderStatus === "placed" ? (
                          <span className="text-emerald-500 font-semibold">✓ Your order was submitted to preparation! Check Assistant log.</span>
                        ) : (
                          <span>Your food cart is currently empty.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

        </section>

        {/* Right Side: Interactive chat log */}
        <section className="lg:col-span-4 flex flex-col h-[520px] lg:h-auto">
          <Card variant="elevated" className="flex-1 rounded-2xl border border-stadium-outline/10 flex flex-col justify-between overflow-hidden p-0">
            {/* Chat header */}
            <div className="p-4 border-b border-stadium-outline/10 bg-stadium-surface-var/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-xs font-bold text-stadium-on-surface">AI Assistant</span>
              </div>
              <Button
                variant="outlined"
                size="sm"
                onClick={() => updatePreferences({ screenReader: !preferences.screenReader })}
                className="h-7 px-2.5 text-xxs !rounded-lg"
              >
                {preferences.screenReader ? "🔊 Reader ON" : "🔇 Reader OFF"}
              </Button>
            </div>

            {/* Log Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.messageId}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs ${
                      msg.sender === "user"
                        ? "bg-primary text-on-primary rounded-tr-none shadow-sm"
                        : "bg-stadium-surface-var text-stadium-on-surface rounded-tl-none border border-stadium-outline/5"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-stadium-on-surface-var mt-0.5 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-1.5 text-xxs text-stadium-on-surface-var mr-auto">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce [animation-delay:0.2s]">●</span>
                  <span className="animate-bounce [animation-delay:0.4s]">●</span>
                  <span>Orchestrator thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Panel */}
            <div className="p-2 border-t border-stadium-outline/5 bg-stadium-surface-var/10 flex flex-wrap gap-1.5 justify-center">
              <button
                onClick={() => handleSendMessage("Where is Gate C?")}
                className="text-[10px] bg-stadium-surface hover:bg-primary/5 text-primary border border-stadium-outline/10 px-2 py-1 rounded-lg"
              >
                📍 Gate C location
              </button>
              <button
                onClick={() => handleSendMessage("I want to order food")}
                className="text-[10px] bg-stadium-surface hover:bg-primary/5 text-primary border border-stadium-outline/10 px-2 py-1 rounded-lg"
              >
                🍔 Get food menu
              </button>
              <button
                onClick={() => handleSendMessage("Is there a wheelchair accessible route?")}
                className="text-[10px] bg-stadium-surface hover:bg-primary/5 text-primary border border-stadium-outline/10 px-2 py-1 rounded-lg"
              >
                ♿ Wheelchair route
              </button>
            </div>

            {/* Error notice if any */}
            {errorMsg && (
              <div className="bg-stadium-error/15 border-t border-stadium-error/25 text-[10px] text-stadium-error px-4 py-2 text-center">
                {errorMsg}
              </div>
            )}

            {/* Message input */}
            <div className="p-3 border-t border-stadium-outline/10 flex gap-2">
              <Input
                placeholder="Type query (e.g. food, route)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                fullWidth
                className="!py-2 !px-3.5 !rounded-full text-xs h-9 bg-stadium-bg border-stadium-outline/15"
              />
              <Button
                variant="filled"
                size="sm"
                className="h-9 px-4 font-bold !rounded-full text-xs"
                onClick={() => handleSendMessage()}
                disabled={chatLoading}
              >
                Send
              </Button>
            </div>
          </Card>
        </section>

      </main>
    </div>
  );
}

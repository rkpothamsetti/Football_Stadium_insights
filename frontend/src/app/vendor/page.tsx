"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiClient } from "@/services/api-client";

interface InventoryItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  available: boolean;
}

interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  orderId: string;
  userId: string;
  vendorId: string;
  seatNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "preparing" | "delivered" | "cancelled";
  createdAt: string;
}

export default function VendorPage() {
  const { user, logout } = useAuth();
  const { speakText } = useAccessibility();

  // State lists
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const VENDOR_ID = "vendor-1";

  // Load orders and inventory
  const loadData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Fetch vendor orders
      const ordersRes = await apiClient.get<Order[]>(`/vendor/orders/${VENDOR_ID}`);
      setOrders(ordersRes);

      // 2. Fetch vendor info (inventory)
      const vendors = await apiClient.get<any[]>("/fan/vendors");
      const currentVendor = vendors.find((v) => v.vendorId === VENDOR_ID);
      
      if (currentVendor && currentVendor.inventory) {
        setInventory(currentVendor.inventory);
      } else {
        // Mock seed inventory if not set in DB
        const mockInventory: InventoryItem[] = [
          { itemId: "food-1", name: "Premium Stadium Hotdog", price: 8.5, quantity: 150, category: "food", available: true },
          { itemId: "food-2", name: "Salted Bavarian Pretzel", price: 6.0, quantity: 80, category: "food", available: true },
          { itemId: "drink-1", name: "Craft Beverage / Soda", price: 4.5, quantity: 300, category: "beverage", available: true },
          { itemId: "merch-1", name: "Home Team Scarf", price: 25.0, quantity: 45, category: "merchandise", available: true },
        ];
        setInventory(mockInventory);
        
        // Save mock inventory back to initialize DB
        await apiClient.put(`/vendor/inventory/${VENDOR_ID}`, { inventory: mockInventory });
      }
    } catch (err: any) {
      console.error("Failed loading vendor workspaces details", err);
      setErrorMsg("Degraded to offline local workspace. Displaying simulated items.");
      
      // Fallback Seed Data
      setOrders([
        {
          orderId: "ORD-9854",
          userId: "fan-1",
          vendorId: VENDOR_ID,
          seatNumber: "Row H Seat 12",
          items: [{ itemId: "food-1", name: "Premium Stadium Hotdog", quantity: 2, price: 8.5 }],
          totalAmount: 17.0,
          status: "pending",
          createdAt: new Date().toISOString()
        },
        {
          orderId: "ORD-9821",
          userId: "fan-2",
          vendorId: VENDOR_ID,
          seatNumber: "Row M Seat 4",
          items: [
            { itemId: "food-2", name: "Salted Bavarian Pretzel", quantity: 1, price: 6.0 },
            { itemId: "drink-1", name: "Craft Beverage / Soda", quantity: 1, price: 4.5 }
          ],
          totalAmount: 10.5,
          status: "preparing",
          createdAt: new Date().toISOString()
        }
      ]);
      setInventory([
        { itemId: "food-1", name: "Premium Stadium Hotdog", price: 8.5, quantity: 120, category: "food", available: true },
        { itemId: "food-2", name: "Salted Bavarian Pretzel", price: 6.0, quantity: 50, category: "food", available: true },
        { itemId: "drink-1", name: "Craft Beverage / Soda", price: 4.5, quantity: 240, category: "beverage", available: true },
        { itemId: "merch-1", name: "Home Team Scarf", price: 25.0, quantity: 12, category: "merchandise", available: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update order status
  const changeOrderStatus = async (orderId: string, nextStatus: "pending" | "preparing" | "delivered" | "cancelled") => {
    speakText(`Transitioning order status to ${nextStatus}`);
    
    // Update local state first
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: nextStatus } : o))
    );

    try {
      await apiClient.put(`/vendor/orders/${orderId}/status`, { status: nextStatus });
      speakText(`Order ${orderId.substring(0, 5)} status updated successfully.`);
    } catch (err) {
      console.error("Order status synchronization failed", err);
    }
  };

  // Toggle item availability
  const toggleItemAvailability = async (itemId: string) => {
    const updatedInv = inventory.map((item) => {
      if (item.itemId === itemId) {
        const nextState = !item.available;
        speakText(`${item.name} is now ${nextState ? "available" : "sold out"}`);
        return { ...item, available: nextState };
      }
      return item;
    });
    setInventory(updatedInv);

    try {
      await apiClient.put(`/vendor/inventory/${VENDOR_ID}`, { inventory: updatedInv });
    } catch (err) {
      console.error("Inventory synchronization failed", err);
    }
  };

  // Adjust item quantities
  const adjustStock = async (itemId: string, amount: number) => {
    const updatedInv = inventory.map((item) => {
      if (item.itemId === itemId) {
        const nextQty = Math.max(0, item.quantity + amount);
        return { ...item, quantity: nextQty };
      }
      return item;
    });
    setInventory(updatedInv);

    try {
      await apiClient.put(`/vendor/inventory/${VENDOR_ID}`, { inventory: updatedInv });
    } catch (err) {
      console.error("Inventory stock quantity synchronization failed", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-stadium-bg text-stadium-on-bg">
      {/* Header Banner */}
      <header className="glass-panel p-4 flex items-center justify-between border-b border-stadium-outline/10 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌭</span>
          <div>
            <h1 className="text-md font-bold tracking-tight text-primary">Vendor Operations Panel</h1>
            <p className="text-xxs text-stadium-on-surface-var">Vendor: Stadium Central (ID: {VENDOR_ID})</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outlined" size="sm" onClick={loadData} className="h-8 text-xxs font-bold cursor-pointer">
            🔄 Refresh Logs
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

      {/* Main Grid Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6">
        
        {/* Left Side: Active Orders queue */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-stadium-on-surface tracking-wider uppercase px-1">
            📦 Active Order Pipeline
          </h2>

          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[300px]">
              <span className="animate-spin text-2xl">⏳</span>
              <span className="ml-2 text-xs">Syncing active stadium orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <Card variant="outlined" className="p-8 text-center min-h-[300px] flex flex-col justify-center items-center rounded-2xl border-dashed">
              <span className="text-2xl">📪</span>
              <p className="text-xs text-stadium-on-surface-var mt-2">No spectator orders received yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card
                  key={order.orderId}
                  variant="elevated"
                  className={`border-l-4 rounded-xl relative overflow-hidden transition-all ${
                    order.status === "pending"
                      ? "border-l-secondary"
                      : order.status === "preparing"
                      ? "border-l-primary"
                      : order.status === "delivered"
                      ? "border-l-emerald-500"
                      : "border-l-stadium-outline"
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stadium-on-surface">Order #{order.orderId.substring(0, 8)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          order.status === "pending"
                            ? "bg-secondary/15 text-secondary"
                            : order.status === "preparing"
                            ? "bg-primary/15 text-primary"
                            : order.status === "delivered"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-stadium-outline/15 text-stadium-on-surface-var"
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      
                      {/* Customer Seat coordinates */}
                      <p className="text-xxs text-primary font-semibold mt-1">📍 Delivery Destination: {order.seatNumber}</p>
                      
                      {/* Item list */}
                      <div className="mt-2.5 space-y-1 bg-stadium-surface-var/30 p-2.5 rounded-lg border border-stadium-outline/5">
                        {order.items.map((i, idx) => (
                          <div key={idx} className="text-xxs flex justify-between text-stadium-on-surface-var">
                            <span>{i.name} <strong className="text-stadium-on-surface">x{i.quantity}</strong></span>
                            <span>${(i.price * i.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto">
                      <div>
                        <span className="text-[10px] text-stadium-on-surface-var block">Order Total</span>
                        <span className="text-sm font-black text-stadium-on-surface">${order.totalAmount.toFixed(2)}</span>
                      </div>

                      {/* Transition button triggers */}
                      <div className="flex gap-1.5 w-full justify-end">
                        {order.status === "pending" && (
                          <Button variant="filled" size="sm" className="h-8 text-xxs !rounded-lg" onClick={() => changeOrderStatus(order.orderId, "preparing")}>
                            Prepare Order
                          </Button>
                        )}
                        {order.status === "preparing" && (
                          <Button variant="filled" size="sm" className="h-8 text-xxs bg-emerald-500 hover:brightness-110 !rounded-lg" onClick={() => changeOrderStatus(order.orderId, "delivered")}>
                            Mark Delivered
                          </Button>
                        )}
                        {order.status !== "delivered" && order.status !== "cancelled" && (
                          <Button variant="outlined" size="sm" className="h-8 text-xxs !rounded-lg text-stadium-error border-stadium-error hover:bg-stadium-error/5" onClick={() => changeOrderStatus(order.orderId, "cancelled")}>
                            Cancel
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

        {/* Right Side: Inventory management panel */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-stadium-on-surface tracking-wider uppercase px-1">
            🥬 Menu Stock & Inventory Controls
          </h2>

          <Card variant="glass" className="rounded-2xl border border-stadium-outline/10 p-4">
            {loading ? (
              <div className="py-12 text-center text-xs">Loading items...</div>
            ) : (
              <div className="space-y-4">
                {inventory.map((item) => (
                  <div key={item.itemId} className="p-3 bg-stadium-surface/40 rounded-xl border border-stadium-outline/5 hover:border-primary/10 transition-all flex justify-between items-center">
                    <div>
                      <span className={`block text-xs font-bold ${item.available ? "text-stadium-on-surface" : "text-stadium-on-surface-var line-through"}`}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-stadium-on-surface-var">
                        Price: ${item.price.toFixed(2)} • Category: {item.category}
                      </span>
                      
                      {/* Live availability badge */}
                      <span className={`block text-[9px] mt-1 font-semibold ${item.available ? "text-emerald-500" : "text-stadium-error"}`}>
                        {item.available ? "● In Stock" : "○ Sold Out"}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {/* Quantity adjustments */}
                      <div className="flex items-center bg-stadium-surface-var/50 px-2 py-1 rounded-lg border border-stadium-outline/5">
                        <button className="text-xs px-1 text-stadium-on-surface-var hover:text-primary font-bold" onClick={() => adjustStock(item.itemId, -10)} disabled={!item.available}>
                          -10
                        </button>
                        <span className="text-xs px-3 font-mono font-bold w-12 text-center text-stadium-on-surface">
                          {item.quantity}
                        </span>
                        <button className="text-xs px-1 text-stadium-on-surface-var hover:text-primary font-bold" onClick={() => adjustStock(item.itemId, 10)} disabled={!item.available}>
                          +10
                        </button>
                      </div>

                      {/* Switch Toggle availability */}
                      <Button variant="tonal" size="sm" className="h-7 text-xxs px-2.5 !rounded-lg" onClick={() => toggleItemAvailability(item.itemId)}>
                        {item.available ? "Mark Sold Out" : "Mark Available"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

      </main>
    </div>
  );
}

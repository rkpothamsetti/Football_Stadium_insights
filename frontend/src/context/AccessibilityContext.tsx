"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { apiClient } from "@/services/api-client";

interface UserPreferences {
  accessibilityMode: boolean;
  largeText: boolean;
  screenReader: boolean;
  wheelchairRoute: boolean;
  voiceInteraction: boolean;
}

interface AccessibilityContextType {
  preferences: UserPreferences;
  language: string;
  updatePreferences: (prefs: Partial<UserPreferences>, lang?: string) => Promise<void>;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const DEFAULT_PREFERENCES: UserPreferences = {
  accessibilityMode: false,
  largeText: false,
  screenReader: false,
  wheelchairRoute: false,
  voiceInteraction: false,
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [language, setLanguage] = useState("en");

  // Sync preferences on user login
  useEffect(() => {
    if (user?.preferences) {
      setPreferences(user.preferences);
      setLanguage(user.language || "en");
    } else {
      // Restore local settings if guest
      const localPrefs = localStorage.getItem("guest_preferences");
      const localLang = localStorage.getItem("guest_language");
      if (localPrefs) setPreferences(JSON.parse(localPrefs));
      if (localLang) setLanguage(localLang);
    }
  }, [user]);

  // Adjust DOM classes based on preferences
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Large Text (WCAG font scaling)
    if (preferences.largeText) {
      root.classList.add("text-lg");
      root.classList.remove("text-base");
    } else {
      root.classList.add("text-base");
      root.classList.remove("text-lg");
    }

    // High Contrast / Screen Reader overlay indicators
    if (preferences.accessibilityMode) {
      root.classList.add("accessibility-mode-active");
    } else {
      root.classList.remove("accessibility-mode-active");
    }
  }, [preferences]);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>, newLang?: string) => {
    const updated = { ...preferences, ...newPrefs };
    const lang = newLang || language;
    
    setPreferences(updated);
    if (newLang) setLanguage(newLang);

    if (user?.id) {
      try {
        await apiClient.put("/accessibility/preferences", {
          userId: user.id,
          preferences: updated,
          language: lang,
        });
      } catch (err) {
        console.error("Failed to sync accessibility preferences with database", err);
      }
    } else {
      // Save locally if guest
      localStorage.setItem("guest_preferences", JSON.stringify(updated));
      localStorage.setItem("guest_language", lang);
    }
  };

  // Web Speech Synthesis (Screen Reader Emulation)
  const speakText = (text: string) => {
    if (!preferences.screenReader) return;
    
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Stop active speaking
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "en" ? "en-US" : language;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        preferences,
        language,
        updatePreferences,
        speakText,
        stopSpeaking,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
};
export default AccessibilityProvider;

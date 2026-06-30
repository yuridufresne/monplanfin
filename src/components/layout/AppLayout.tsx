import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { appClient } from "@/api/usersClient";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BetaIndicator from "./BetaIndicator";
import BetaFeedbackButton from "@/components/feedback/BetaFeedbackButton";

export default function AppLayout() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    appClient.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#050810" }}>
      <Navbar />
      <BetaIndicator />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BetaFeedbackButton user={user} />
    </div>
  );
}
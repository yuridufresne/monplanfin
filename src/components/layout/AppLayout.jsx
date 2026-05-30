import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BetaIndicator from "./BetaIndicator";

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#050810" }}>
      <Navbar />
      <BetaIndicator />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
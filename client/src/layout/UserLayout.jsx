import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { userService } from "../services/userService";
import { LiveNotificationToast } from "../components/LiveNotificationToast";

export const UserLayout = () => {
  const { id } = userService();
  const [activeNotification, setActiveNotification] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  // Inactivity Auto-Logout (10 minutes)
  useEffect(() => {
    let timeoutId;
    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

    const performAutoLogout = () => {
      localStorage.removeItem("token");
      alert("Your session has expired due to inactivity. Please sign in again.");
      navigate("/signin");
    };

    const resetInactivityTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(performAutoLogout, INACTIVITY_TIMEOUT);
    };

    // Track user active states
    const activeEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    resetInactivityTimer();

    activeEvents.forEach((evName) => {
      window.addEventListener(evName, resetInactivityTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activeEvents.forEach((evName) => {
        window.removeEventListener(evName, resetInactivityTimer);
      });
    };
  }, [navigate]);

  useEffect(() => {
    if (!id) return;
    const socketUrl = apiUrl.replace("/api/v1", "");
    const socket = io(socketUrl);

    socket.emit("join", id);

    socket.on("notification:new", (data) => {
      console.log("Socket Notification received:", data);
      setActiveNotification(data);
    });

    return () => {
      socket.off("notification:new");
      socket.disconnect();
    };
  }, [id, apiUrl]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 font-sans">
      <Sidebar />
      <Header />
      <main className="pl-64 pt-16 min-h-screen bg-[#F0F2F5]">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
      <LiveNotificationToast
        notification={activeNotification}
        onClose={() => setActiveNotification(null)}
      />
    </div>
  );
};

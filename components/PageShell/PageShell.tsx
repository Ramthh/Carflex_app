"use client";
import { useEffect, useState } from "react";
import Sidebar from "../Sidebar/Sidebar";
import TopNav from "../TopNav/TopNav";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { BotMessageSquare } from "lucide-react";
import Chatbot from "../Chatbot/Chatbot";
import TimeTracker from "../TimeTracker/TimeTracker";
import WorkspaceSessionBoundary from './WorkspaceSessionBoundary';

export default function PageShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleBotClick = () => {
    setIsChatbotOpen(true);
  };

  const handleCloseChatbot = () => {
    setIsChatbotOpen(false);
  };

  return (
    <SessionProvider refetchInterval={15} refetchOnWindowFocus>
      <WorkspaceSessionBoundary>
      <TimeTracker />
      <div className="flex h-screen">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="flex flex-col flex-1 relative">
          {/* Bot Icon */}
          {/* <div
            className="absolute bottom-5 right-7 rounded-full bg-primary w-12 h-12 z-50 flex items-center justify-center cursor-pointer hover:shadow-xl transition-shadow duration-300 ease-in-out"
            onClick={isChatbotOpen ? handleCloseChatbot : handleBotClick}
          >
            <BotMessageSquare color="white" size={32} strokeWidth={2} />
          </div> */}

          <TopNav onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-auto ">{children}</main>

          {isChatbotOpen && (
            <div className="absolute bottom-18 right-14 w-64 sm:w-96 h-106 sm:h-4/6  bg-white  rounded-4xl rounded-br-none shadow-xl z-50">
              <Chatbot onClose={handleCloseChatbot} />
            </div>
          )}
        </div>
      </div>
      </WorkspaceSessionBoundary>
    </SessionProvider>
  );
}

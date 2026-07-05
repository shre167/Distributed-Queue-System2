/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Activity, 
  Settings, 
  Layers, 
  Play, 
  Cpu, 
  BookOpen, 
  User, 
  Clock,
  X 
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemHealth: "healthy" | "degraded" | "critical";
  lastPolled: Date;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  systemHealth, 
  lastPolled,
  isOpen = false,
  onClose
}) => {
  const menuItems = [
    { id: "overview", label: "Dashboard Overview", icon: Activity },
    { id: "queues", label: "Queue Configurations", icon: Settings },
    { id: "jobs", label: "Job Explorer", icon: Layers },
    { id: "playground", label: "Job Dispatcher", icon: Play },
    { id: "workers", label: "Worker Clusters", icon: Cpu },
    { id: "docs", label: "System Architecture", icon: BookOpen },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className={`w-64 bg-bg-sidebar border-r border-border-subtle flex flex-col justify-between h-screen shrink-0 ${
      isOpen 
        ? "fixed inset-y-0 left-0 z-50 animate-in slide-in-from-left duration-200" 
        : "hidden lg:flex sticky top-0"
    }`}>
      <div className="flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-brand rounded flex items-center justify-center shrink-0">
              <div className="w-3 h-3 bg-bg-deep rotate-45"></div>
            </div>
            <div>
              <h1 className="font-serif italic text-base text-slate-100 tracking-tight leading-none">
                Scheduler Core
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-brand block mt-1">
                v1.0.0 // Distributed
              </span>
            </div>
          </div>
          {/* Close button for mobile menu */}
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-1 rounded hover:bg-bg-deep text-slate-400 hover:text-slate-200 transition-all border border-transparent hover:border-border-subtle"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-brand/10 text-brand border border-brand/30"
                    : "text-slate-400 hover:bg-[#151515] hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand" : "text-slate-400"}`} />
                <span className="tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border-subtle space-y-3 bg-[#0a0a0a]/40">
        {/* System Health Badge */}
        <div className="p-3 bg-bg-deep/60 rounded-xl border border-border-subtle flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider">SYSTEM STATUS</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-semibold ${
              systemHealth === "healthy"
                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40"
                : systemHealth === "degraded"
                  ? "bg-amber-950/40 text-amber-400 border border-amber-900/40"
                  : "bg-rose-950/40 text-rose-400 border border-rose-900/40"
            }`}>
              {systemHealth}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Poll: {lastPolled.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center space-x-3 p-2 bg-bg-deep/20 rounded-lg border border-border-subtle">
          <div className="w-8 h-8 rounded-full bg-[#151515] flex items-center justify-center text-brand border border-border-accent">
            <User className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-slate-300 truncate">Dev Operator</h4>
            <p className="text-[10px] text-slate-500 font-mono truncate">admin@scheduler.io</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

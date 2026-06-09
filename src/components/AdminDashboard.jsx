"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Users } from "lucide-react";
import ActivityMonitor from "@/components/ActivityMonitor";
import UserManagement from "@/components/UserManagement";

const TABS = [
  { key: "activity", label: "Aktivitas", Icon: Activity },
  { key: "users",    label: "Pengguna",  Icon: Users },
];

export default function AdminDashboard({ onNotify }) {
  const [tab, setTab] = useState("activity");

  return (
    <div className="space-y-5">
      {/* ── Segmented control ── */}
      <div className="flex ds-bg-3 p-1.5 rounded-2xl border ds-border">
        {TABS.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-2xs font-black uppercase tracking-widest transition-colors"
              style={{ color: active ? "#fff" : "var(--text-3)" }}
            >
              {active && (
                <motion.div
                  layoutId="adminTab"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))", boxShadow: "0 6px 18px color-mix(in srgb, var(--a1) 28%, transparent)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={13} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Active panel ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "activity"
            ? <ActivityMonitor onNotify={onNotify} />
            : <UserManagement onNotify={onNotify} defaultExpanded />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

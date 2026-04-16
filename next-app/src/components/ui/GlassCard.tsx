"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glowColor?: "emerald" | "red" | "yellow" | "blue" | "none";
}

export function GlassCard({ children, className, glowColor = "none", ...props }: GlassCardProps) {
  const glowMap = {
    none: "",
    emerald: "border-b-2 border-b-status-green shadow-[inset_0_-10px_20px_-15px_rgba(16,185,129,0.3)]",
    red: "border-b-2 border-b-status-red shadow-[inset_0_-10px_20px_-15px_rgba(239,68,68,0.3)]",
    yellow: "border-b-2 border-b-status-yellow shadow-[inset_0_-10px_20px_-15px_rgba(245,158,11,0.3)]",
    blue: "border-b-2 border-b-blue-500 shadow-[inset_0_-10px_20px_-15px_rgba(59,130,246,0.3)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-panel-base backdrop-blur-xl border border-panel-border rounded-xl p-5 overflow-hidden flex flex-col gap-4 shadow-xl",
        glowMap[glowColor],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

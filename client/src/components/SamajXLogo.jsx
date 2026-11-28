
import React from "react";

export default function SamajXLogo() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "9px"
    }}>
      {/* SamajX Symbol */}
      <div style={{
        width: "40px",
        height: "40px",
        borderRadius: "11px",
        background: "linear-gradient(135deg, #2563EB, #4F46E5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 10px rgba(37,99,235,0.25)"
      }}>
        <svg
          width="27"
          height="27"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 16 L32 32 L48 16" />
            <path d="M16 48 L32 32 L48 48" />
            <path d="M16 16 L16 48" opacity=".6" />
            <path d="M48 16 L48 48" opacity=".6" />
          </g>

          <circle cx="16" cy="16" r="7" fill="white"/>
          <circle cx="48" cy="16" r="7" fill="white"/>
          <circle cx="16" cy="48" r="7" fill="white"/>
          <circle cx="48" cy="48" r="7" fill="white"/>
          <circle cx="32" cy="32" r="8" fill="#BFDBFE" stroke="white" strokeWidth="2"/>
        </svg>
      </div>

      {/* Brand Name */}
      <span style={{
        fontSize: "21px",
        fontWeight: 750,
        letterSpacing: "-0.8px",
        color: "#172033"
      }}>
        Samaj<span style={{color: "#2563EB"}}>X</span>
      </span>
    </div>
  );
}

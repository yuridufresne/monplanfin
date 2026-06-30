import React, { useState, useRef, useEffect } from "react";
import { appClient } from "@/api/usersClient";

/**
 * AddressAutocomplete
 * Props:
 *   value      — current address string
 *   onChange   — called with the full formatted address string on selection
 *   placeholder
 *   className / style
 */
export default function AddressAutocomplete({ value, onChange, placeholder = "123 rue des Érables, Montréal, QC", className, style }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external value changes
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = async (text, lastId = "") => {
    if (!text || text.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    const res = await appClient.functions.invoke("canadaPostAddress", { action: "find", searchTerm: text, ...(lastId ? { lastId } : {}) });
    setLoading(false);
    const json = res.data;
    if (json.Items && json.Items.length > 0 && !json.Items[0].Error) {
      setSuggestions(json.Items);
      setOpen(true);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  const retrieve = async (id) => {
    const res = await appClient.functions.invoke("canadaPostAddress", { action: "retrieve", id });
    const json = res.data;
    if (json.Items && json.Items.length > 0) {
      const addr = json.Items[0];
      const line = [addr.Line1, addr.City, addr.ProvinceCode, addr.PostalCode]
        .filter(Boolean).join(", ");
      setQuery(line);
      onChange(line);
      setSuggestions([]);
      setOpen(false);
    }
  };

  const updateDropdownPos = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX, width: rect.width });
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // keep parent in sync while typing
    updateDropdownPos();
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  };

  const handleSelect = (item) => {
    if (item.Next === "Retrieve") {
      retrieve(item.Id);
    } else {
      // Drill down with another Find
      search(item.Text, item.Id);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { updateDropdownPos(); suggestions.length > 0 && setOpen(true); }}
          placeholder={placeholder}
          className={className}
          style={{
            width: "100%", padding: "10px 40px 10px 16px",
            borderRadius: 12, fontSize: 13, outline: "none",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            ...style,
          }}
        />
        {loading && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
            <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#C9A063", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          </div>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: "fixed",
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          zIndex: 99999,
          background: "#0D1628", border: "1px solid rgba(201,160,99,0.25)",
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        }}>
          {suggestions.map((item, i) => (
            <button
              key={item.Id + i}
              type="button"
              onMouseDown={() => handleSelect(item)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", fontSize: 13, textAlign: "left", cursor: "pointer",
                background: "transparent", border: "none",
                borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                color: "#E5E7EB", transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(201,160,99,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span>
                <span style={{ color: "#fff", fontWeight: 500 }}>{item.Text}</span>
                {item.Description && (
                  <span style={{ color: "#94A3B8", marginLeft: 8, fontSize: 12 }}>{item.Description}</span>
                )}
              </span>
              {item.Next !== "Retrieve" && (
                <span style={{ fontSize: 11, color: "#C9A063", marginLeft: 8, flexShrink: 0 }}>▸</span>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}
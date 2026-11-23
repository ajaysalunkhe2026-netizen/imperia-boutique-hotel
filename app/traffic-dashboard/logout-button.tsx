"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <button type="button" className="traffic-logout" onClick={handleLogout}>
      <LogOut size={14} /> SIGN OUT
    </button>
  );
}

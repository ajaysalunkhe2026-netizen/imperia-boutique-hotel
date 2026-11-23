"use client";

import { ArrowLeft } from "lucide-react";

export default function TrafficBackButton() {
  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign("/");
    }
  }

  return (
    <button type="button" className="traffic-back" onClick={goBack}>
      <ArrowLeft size={15} /> BACK
    </button>
  );
}

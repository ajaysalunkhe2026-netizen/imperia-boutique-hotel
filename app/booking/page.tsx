"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ShieldCheck } from "lucide-react";
import "./booking.css";

type Result = { reference: string } | null;

export default function BookingPage() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState(tomorrow);
  const [checkOut, setCheckOut] = useState(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [rooms, setRooms] = useState("1");
  const [roomType, setRoomType] = useState("Any available room");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>(null);

  const nights = useMemo(() => {
    const start = new Date(checkIn + "T00:00:00");
    const end = new Date(checkOut + "T00:00:00");
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }, [checkIn, checkOut]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (website) return;
    if (nights < 1 || nights > 30) {
      setError("Please select a check-out date after check-in (maximum 30 nights).");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/reservation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn, checkOut, adults: Number(adults), children: Number(children),
          rooms: Number(rooms), roomType, name, phone, email, notes, website,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "We could not submit your request. Please try again.");
      setResult({ reference: payload.reference });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <main className="booking-page">
        <div className="booking-shell booking-success">
          <div className="booking-monogram">I<span>.</span></div>
          <CheckCircle2 size={42} />
          <p className="booking-eyebrow">REQUEST RECEIVED</p>
          <h1>Thank you.<br /><em>We’ll be in touch.</em></h1>
          <p>Your reservation enquiry has been received. This is a request only, not a confirmed booking. The hotel team must verify room availability and the applicable tariff before confirming your stay.</p>
          <div className="booking-reference"><span>REQUEST REFERENCE</span><strong>{result.reference}</strong></div>
          <a className="booking-call" href="tel:+918369011041">CALL THE HOTEL · +91 83690 11041</a>
          <Link className="booking-submit" href="/">RETURN TO HOTEL <ArrowRight size={16} /></Link>
        </div>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <div className="booking-shell">
        <Link href="/" className="booking-back"><ArrowLeft size={15} /> BACK TO IMPERIA</Link>
        <div className="booking-heading">
          <div className="booking-monogram">I<span>.</span></div>
          <p className="booking-eyebrow">IMPERIA BOUTIQUE HOTEL · RABALE</p>
          <h1>Plan your<br /><em>stay with us.</em></h1>
          <p>Share your preferred dates and details. Our team will check availability and contact you with the applicable room tariff and inclusions.</p>
        </div>

        <form className="booking-form" onSubmit={submit}>
          <section className="booking-section">
            <div className="booking-section-title"><CalendarDays size={18} /><h2>Your stay</h2><span>01</span></div>
            <div className="booking-fields two">
              <label>CHECK-IN DATE<input type="date" min={today} required value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(new Date(new Date(e.target.value + "T00:00:00").getTime() + 86400000).toISOString().slice(0, 10)); }} /></label>
              <label>CHECK-OUT DATE<input type="date" min={checkIn || today} required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></label>
            </div>
            <div className="booking-nights">{nights > 0 ? `${nights} night${nights === 1 ? "" : "s"} requested` : "Choose valid dates to continue"}</div>
            <div className="booking-fields three">
              <label>ADULTS<select value={adults} onChange={(e) => setAdults(e.target.value)}>{[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <label>CHILDREN<select value={children} onChange={(e) => setChildren(e.target.value)}>{[0,1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <label>ROOMS<select value={rooms} onChange={(e) => setRooms(e.target.value)}>{[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            </div>
            <label className="booking-full">PREFERRED ROOM CATEGORY<select value={roomType} onChange={(e) => setRoomType(e.target.value)}><option>Any available room</option><option>Amber Stone</option><option>Opal Suite</option></select></label>
          </section>

          <section className="booking-section">
            <div className="booking-section-title"><ShieldCheck size={18} /><h2>Your details</h2><span>02</span></div>
            <div className="booking-fields two">
              <label>FULL NAME<input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name of the lead guest" /></label>
              <label>MOBILE NUMBER<input autoComplete="tel" type="tel" required minLength={8} maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" /></label>
            </div>
            <label className="booking-full">EMAIL ADDRESS<input autoComplete="email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label className="booking-full">SPECIAL REQUESTS <span className="optional">(OPTIONAL)</span><textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Arrival time or any details that may help our team" /></label>
            <div className="booking-honeypot" aria-hidden="true"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
          </section>

          <div className="booking-notice"><ShieldCheck size={18} /><p><strong>Important:</strong> Submitting this form sends a reservation request only. Room availability, final tariff, taxes and inclusions will be confirmed by the hotel. No payment is collected on this page.</p></div>
          {error && <p className="booking-error" role="alert">{error}</p>}
          <button className="booking-submit" type="submit" disabled={busy || nights < 1 || nights > 30}>{busy ? "SENDING REQUEST…" : "SEND RESERVATION REQUEST"} <ArrowRight size={16} /></button>
          <div className="booking-call-panel">
            <strong>Prefer to speak with our team?</strong>
            <span>Call the hotel directly for assistance.</span>
            <a href="tel:+918369011041">+91 83690 11041</a>
            <a href="tel:+917700003843">+91 77000 03843</a>
          </div>
          <p className="booking-privacy">Your details will be used by the hotel to respond to this reservation enquiry.</p>
        </form>
      </div>
    </main>
  );
}

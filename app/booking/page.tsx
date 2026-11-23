"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import "./booking.css";

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
  const [customMessage, setCustomMessage] = useState("");
  const [messageEdited, setMessageEdited] = useState(false);

  const nights = useMemo(() => {
    const start = new Date(checkIn + "T00:00:00");
    const end = new Date(checkOut + "T00:00:00");
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }, [checkIn, checkOut]);

  const generatedMessage = useMemo(() => [
    "Hello IMPERIA BOUTIQUE HOTEL, I would like to enquire about a reservation.",
    "",
    `Guest name: ${name || "Not provided"}`,
    `Customer mobile: ${phone || "Not provided"}`,
    `Check-in: ${checkIn}`,
    `Check-out: ${checkOut}`,
    `Nights: ${nights > 0 ? nights : "To be confirmed"}`,
    `Adults: ${adults}`,
    `Children: ${children}`,
    `Rooms: ${rooms}`,
    `Preferred room: ${roomType}`,
    email ? `Email: ${email}` : "",
    notes ? `Special requests: ${notes}` : "",
    "",
    "Please confirm availability and share the applicable tariff, taxes and inclusions. I understand this is an enquiry, not a confirmed booking."
  ].filter(Boolean).join("\n"), [name, phone, checkIn, checkOut, nights, adults, children, rooms, roomType, email, notes]);

  const whatsappMessage = messageEdited ? customMessage : generatedMessage;
  const whatsappUrl = (number: string) => `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <main className="booking-page">
      <div className="booking-shell">
        <Link href="/" className="booking-back"><ArrowLeft size={15} /> BACK TO IMPERIA</Link>
        <div className="booking-heading">
          <div className="booking-monogram">I<span>.</span></div>
          <p className="booking-eyebrow">IMPERIA BOUTIQUE HOTEL · RABALE</p>
          <h1>Plan your<br /><em>stay with us.</em></h1>
          <p>Share your preferred dates and details. Review or edit your WhatsApp message, then send it to our hotel team. You can also call us directly.</p>
        </div>

        <form className="booking-form" onSubmit={(event) => event.preventDefault()}>
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
            <label className="booking-full">EMAIL ADDRESS <span className="optional">(OPTIONAL)</span><input autoComplete="email" type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label className="booking-full">SPECIAL REQUESTS <span className="optional">(OPTIONAL)</span><textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Arrival time or any details that may help our team" /></label>
          </section>

          <section className="booking-section">
            <div className="booking-section-title"><MessageCircle size={18} /><h2>Your WhatsApp message</h2><span>03</span></div>
            <p className="booking-message-help">We prepare a message from your booking details. You can freely edit it or write your own message before opening WhatsApp.</p>
            <label className="booking-full">EDIT YOUR MESSAGE<textarea className="booking-message-editor" rows={11} maxLength={3000} value={whatsappMessage} onChange={(e) => { setCustomMessage(e.target.value); setMessageEdited(true); }} /></label>
            <button className="booking-reset-message" type="button" onClick={() => { setMessageEdited(false); setCustomMessage(""); }}>Reset to booking details</button>
          </section>

          <div className="booking-notice"><ShieldCheck size={18} /><p><strong>Important:</strong> This sends an enquiry only. Room availability, final tariff, taxes and inclusions must be confirmed by the hotel. No payment is collected and no booking is confirmed on this page. WhatsApp opens with your editable message; you must press Send in WhatsApp.</p></div>

          <div className="booking-contact-actions">
            <strong>Send your enquiry on WhatsApp</strong>
            <span>Choose a hotel contact. Review the message in WhatsApp and press Send.</span>
            <a className="booking-whatsapp" href={whatsappUrl("918369011041")} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> WHATSAPP · +91 83690 11041</a>
            <a className="booking-whatsapp secondary" href={whatsappUrl("917700003843")} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> WHATSAPP · +91 77000 03843</a>
          </div>

          <div className="booking-call-panel">
            <strong>Prefer to speak with our team?</strong>
            <span>Call the hotel directly.</span>
            <a href="tel:+918369011041"><Phone size={15} /> CALL · +91 83690 11041</a>
            <a href="tel:+917700003843"><Phone size={15} /> CALL · +91 77000 03843</a>
          </div>
          <p className="booking-privacy">Your message is prepared in your browser. It is shared with the hotel only when you send it through WhatsApp or call the hotel.</p>
        </form>
      </div>
    </main>
  );
}

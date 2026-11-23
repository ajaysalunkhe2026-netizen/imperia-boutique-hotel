import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, MapPin, Phone, Mail, MessageCircle, BedDouble, Clock3 } from "lucide-react";

const address = "Plot No. P-52, TTC MIDC Industrial Area, Village Rabale, Thane–Belapur Road, Navi Mumbai, Maharashtra 400701";
const phone = "+918369011041";
const whatsapp = "https://wa.me/918369011041";
const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
const listingUrl = "https://www.makemytrip.com/hotels/hotel-details/?hotelId=202609221452583835";

const pages = {
  hotel: {
    eyebrow: "WELCOME TO IMPERIA",
    title: "A welcoming address in Rabale.",
    intro: "A considered place to stay in Navi Mumbai, whether your visit brings you to the city for work or a personal trip.",
    sections: [
      ["A place to pause", "Imperia Boutique Hotel is located in the TTC MIDC area of Rabale, with access to the Thane–Belapur Road corridor. Our aim is to make the essentials of your stay feel straightforward and welcoming."],
      ["Before you arrive", "For current room availability, inclusions, check-in arrangements and any special requests, please contact the hotel directly. Details can change and will be confirmed by the property."]
    ]
  },
  rooms: {
    eyebrow: "ROOMS & SUITES",
    title: "Find your place to unwind.",
    intro: "Explore room categories listed for Imperia Boutique Hotel. Room photographs and live availability are being confirmed with the property.",
    sections: [
      ["Amber Stone", "A room category listed with a king bed and city view. Published dimensions: 220 sq. ft. Please reconfirm the layout, occupancy and inclusions with the hotel."],
      ["Opal Suite", "A suite category listed with a city view and additional living space. Published dimensions: 350 sq. ft. Please reconfirm the layout, occupancy and inclusions with the hotel."],
      ["Rates & availability", "Rates, taxes, inclusions and availability vary by date. Contact the hotel for a current quote before making travel arrangements."]
    ]
  },
  dining: {
    eyebrow: "DINING",
    title: "Make time for a good meal.",
    intro: "Dining options and current service timings are not yet confirmed for publication.",
    sections: [
      ["Ask the hotel team", "Please contact the hotel directly to confirm whether breakfast or other dining services are available during your stay, along with timings, menu options and any applicable charges."],
      ["Dietary requests", "If you have dietary requirements, share them with the hotel team before arrival so they can confirm what can be accommodated."]
    ]
  },
  experiences: {
    eyebrow: "AROUND RABALE",
    title: "Your time in Navi Mumbai.",
    intro: "Use Imperia as your base while you attend to business, meet people or explore the city.",
    sections: [
      ["A practical location", "The hotel is in Rabale’s TTC MIDC area, close to the Thane–Belapur Road corridor. For directions, use the map link below."],
      ["Plan with the hotel", "For local travel guidance, transport arrangements or recommendations, contact the property. We do not publish unverified distances or travel times."]
    ]
  },
  offers: {
    eyebrow: "DIRECT ENQUIRIES",
    title: "Ask about your stay.",
    intro: "No promotional rates or packages are published here until the hotel confirms the details.",
    sections: [
      ["Current tariffs", "Contact the hotel for date-specific rates, taxes, inclusions and cancellation terms."],
      ["Group or longer stays", "For multiple rooms or an extended visit, send your dates and requirements directly to the hotel team. Any applicable offer will be confirmed by the property."]
    ]
  },
  contact: {
    eyebrow: "GET IN TOUCH",
    title: "We’re here to help.",
    intro: "For room availability, current tariffs, directions and reservation assistance, contact Imperia Boutique Hotel directly.",
    sections: [
      ["Visit us", address],
      ["Before booking", "Please confirm room availability, rates, check-in and check-out arrangements, and included services directly with the hotel."]
    ]
  },
  booking: {
    eyebrow: "BOOKING ENQUIRY",
    title: "Tell us about your stay.",
    intro: "Send the hotel a booking enquiry on WhatsApp. The hotel team will confirm availability and the final price directly.",
    sections: [
      ["What to include", "Share your check-in and check-out dates, number of guests, preferred room category and any special requests."],
      ["Please note", "This is an enquiry, not an instant reservation. Your booking is confirmed only after the hotel responds and confirms the details."]
    ]
  }
} as const;

type Slug = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  if (!(section in pages)) return { title: "Page not found" };
  const page = pages[section as Slug];
  return { title: page.eyebrow, description: page.intro };
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(section in pages)) notFound();
  const page = pages[section as Slug];
  const isBooking = section === "booking";
  return (
    <main className="hotel-subpage">
      <div className="subpage-topline"><span>RABALE · NAVI MUMBAI</span><span>IMPERIA BOUTIQUE HOTEL</span></div>
      <header className="subpage-header">
        <Link href="/" className="subpage-brand"><span>I.</span><b>IMPERIA<small>BOUTIQUE HOTEL</small></b></Link>
        <Link href="/" className="subpage-back"><ArrowLeft size={15}/> BACK TO HOME</Link>
      </header>
      <section className="subpage-hero">
        <div className="subpage-copy">
          <p className="subpage-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
          <div className="subpage-actions">
            <a className="subpage-primary" href={isBooking ? whatsapp : "tel:" + phone}>{isBooking ? "START WHATSAPP ENQUIRY" : "CALL THE HOTEL"} <ArrowUpRight size={15}/></a>
            <Link className="subpage-secondary" href="/contact">CONTACT DETAILS</Link>
          </div>
        </div>
        <div className="subpage-photo"><Image src="/images/imperia-hotel-exterior.jpg" alt="Exterior of Imperia Boutique Hotel in Rabale" fill priority sizes="(max-width: 800px) 100vw, 42vw" style={{objectFit:"cover"}}/><span>IMPERIA · RABALE</span></div>
      </section>
      <section className="subpage-content">
        <div className="subpage-content-heading"><span>01</span><p>THE DETAILS</p></div>
        <div className="subpage-panels">
          {page.sections.map(([heading, body]) => <article key={heading}><h2>{heading}</h2><p>{body}</p></article>)}
        </div>
        {section === "rooms" && <p className="subpage-note">Room names and dimensions shown here are based on the hotel’s existing travel listing and should be reconfirmed. <a href={listingUrl} target="_blank" rel="noreferrer">View listing <ArrowUpRight size={12}/></a></p>}
        <div className="subpage-contact">
          <div><p className="subpage-eyebrow">NEED A HAND?</p><h2>Speak with our team.</h2><p>For accurate, up-to-date information, please contact the hotel directly.</p></div>
          <div className="subpage-contact-links">
            <a href="tel:+918369011041"><Phone size={17}/> +91 83690 11041</a>
            <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={17}/> WhatsApp the hotel</a>
            <a href="mailto:imperiabotiquehotel@gmail.com"><Mail size={17}/> imperiabotiquehotel@gmail.com</a>
            <a href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={17}/> Open directions</a>
          </div>
        </div>
      </section>
      <footer className="subpage-footer"><span>© {new Date().getFullYear()} IMPERIA BOUTIQUE HOTEL</span><span>RABALE · NAVI MUMBAI · INDIA</span><Link href="/booking">MAKE AN ENQUIRY <ArrowUpRight size={13}/></Link></footer>
    </main>
  );
}

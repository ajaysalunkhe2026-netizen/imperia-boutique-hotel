import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown, ArrowRight, ArrowUpRight, BedDouble, Check, Clock3,
  Coffee, MapPin, Menu, Sparkles, Wifi, Wind, Droplets, ConciergeBell,
} from "lucide-react";

const hotelAddress =
  "Plot No. P-52, TTC MIDC Industrial Area, Village Rabale, Thane - Belapur Road, Navi Mumbai, Maharashtra 400701";
const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(hotelAddress);
const mmtUrl = "https://www.makemytrip.com/hotels/hotel-details/?hotelId=202609221452583835";

function PhotoPending({ number, title, wide = false }: { number: string; title: string; wide?: boolean }) {
  return (
    <div className={`photo-pending ${wide ? "photo-pending-wide" : ""}`} role="img" aria-label={`${title} — official hotel photograph pending`}>
      <span className="photo-index">{number}</span>
      <span className="photo-ornament" aria-hidden="true">I.</span>
      <div className="photo-caption">
        <span>IMPERIA BOUTIQUE HOTEL</span>
        <strong>{title}</strong>
        <small>Official property photograph to be added</small>
      </div>
    </div>
  );
}

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return <div className="section-label"><span>{number}</span><i />{children}</div>;
}

export default function Home() {
  return (
    <main id="top">
      <div className="topline">
        <span>RABALE · NAVI MUMBAI</span>
        <span className="topline-center">A WELCOMING ADDRESS IN THE CITY</span>
        <Link href="#location">FIND YOUR WAY <ArrowUpRight size={12} /></Link>
      </div>

      <header className="header">
        <Link href="#top" className="wordmark" aria-label="Imperia Boutique Hotel home">
          <span className="monogram">I<span>.</span></span>
          <span className="wordmark-text">IMPERIA<small>BOUTIQUE HOTEL</small></span>
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <Link href="/hotel">THE HOTEL</Link>
          <Link href="/rooms">ROOMS</Link>
          <Link href="/dining">DINING</Link>
          <Link href="/contact">CONTACT</Link>
        </nav>
        <Link className="header-cta" href="#enquire">ENQUIRE NOW <ArrowUpRight size={15} /></Link>
        <Link className="mobile-menu" href="#mobile-nav" aria-label="Open navigation"><Menu /></Link>
      </header>
      <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">
        <Link href="/hotel">The Hotel</Link><Link href="/rooms">Rooms & Suites</Link>
        <Link href="/dining">Dining</Link><Link href="/experiences">Experiences</Link>
        <Link href="/offers">Offers</Link><Link href="/contact">Contact</Link><Link href="/booking">Booking enquiry</Link>
      </nav>

      <section className="hero hero-reference">
        <div className="reference-photo">
          <Image src="/images/imperia-hotel-exterior.jpg" alt="Imperia Boutique Hotel in Rabale, Navi Mumbai" fill priority sizes="(max-width: 850px) 100vw, 58vw" style={{ objectFit: "cover", objectPosition: "center 55%" }} />
          <div className="reference-photo-shade" />
          <div className="reference-photo-caption"><span>IMPERIA BOUTIQUE HOTEL</span><strong>A welcoming address in Rabale.</strong></div>
        </div>
        <div className="reference-white-panel">
          <div className="reference-topline"><span>RABALE · NAVI MUMBAI</span><span>WELCOME TO IMPERIA</span></div>
          <div className="reference-nav">
            <Link href="#top" className="wordmark" aria-label="Imperia Boutique Hotel home">
              <span className="monogram">I<span>.</span></span>
              <span className="wordmark-text">IMPERIA<small>BOUTIQUE HOTEL</small></span>
            </Link>
            <nav className="reference-links" aria-label="Main navigation">
              <Link href="/hotel">THE HOTEL</Link><Link href="/rooms">ROOMS</Link><Link href="/dining">DINING</Link><Link href="/contact">CONTACT</Link>
            </nav>
            <Link className="reference-menu" href="#mobile-nav" aria-label="Open navigation"><Menu size={20}/></Link>
          </div>
          <div className="reference-copy">
            <p className="eyebrow eyebrow-dark"><span/> YOUR CITY, YOUR MOMENT</p>
            <h1>Arrive.<br/><em>Unwind.</em><br/>Feel at home.</h1>
            <p className="reference-intro">A considered stay in Rabale, Navi Mumbai. Find a welcoming place to pause, refresh and make the most of your time in the city.</p>
            <Link className="reference-cta" href="/booking">BOOK YOUR STAY <ArrowUpRight size={15}/></Link>
          </div>
          <div className="reference-bottom-note"><span>THOUGHTFULLY LOCATED IN RABALE</span><span>DISCOVER IMPERIA ↓</span></div>
        </div>
        <div className="reference-booking" id="booking-bar">
          <div className="reference-booking-heading">PLAN YOUR STAY</div>
          <div className="reference-booking-field"><span>CHECK-IN</span><strong>Choose your date</strong></div>
          <div className="reference-booking-field"><span>CHECK-OUT</span><strong>Choose your date</strong></div>
          <div className="reference-booking-field"><span>GUESTS</span><strong>Enquire with us</strong></div>
          <Link href="/booking" className="reference-availability">CHECK AVAILABILITY <ArrowUpRight size={14}/></Link>
        </div>
      </section>

      <section className="intro section" id="hotel">
        <SectionLabel number="01">A NOTE FROM IMPERIA</SectionLabel>
        <div className="intro-grid">
          <div><p className="eyebrow eyebrow-dark">A WARM WELCOME</p><h2>Make space<br />for <em>yourself.</em></h2></div>
          <div className="intro-text">
            <p className="intro-lead">Whether you are visiting for work or taking time to explore Navi Mumbai, your stay should feel easy from the moment you arrive.</p>
            <p>Imperia Boutique Hotel is located in the TTC MIDC area of Rabale, with convenient access to the Thane–Belapur Road corridor. We look forward to welcoming you.</p>
            <Link className="under-link" href="#rooms">GET TO KNOW THE ROOMS <ArrowRight size={15} /></Link>
          </div>
        </div>
        <PhotoPending number="02" title="The Imperia experience" wide />
      </section>

      <section className="rooms section" id="rooms">
        <SectionLabel number="02">ROOMS & SUITES</SectionLabel>
        <div className="section-heading">
          <div><p className="eyebrow">REST, RESET, RECHARGE</p><h2>Find your<br /><em>kind of stay.</em></h2></div>
          <p>Explore the room categories currently listed for Imperia Boutique Hotel. Please contact the hotel to confirm availability, inclusions and current rates before booking.</p>
        </div>
        <div className="room-grid">
          <article className="room-card">
            <PhotoPending number="A / 01" title="Amber Stone" />
            <div className="room-details"><span className="room-kicker">THE AMBER STONE ROOM</span><h3>Amber Stone</h3><p>A comfortable room category listed with a king bed and city view.</p>
              <div className="room-facts"><span><BedDouble size={15} /> King bed</span><span>220 sq. ft.</span><span>Up to 2 adults</span></div>
              <Link className="under-link" href="#enquire">ENQUIRE ABOUT THIS ROOM <ArrowUpRight size={14} /></Link>
            </div>
          </article>
          <article className="room-card room-card-offset">
            <PhotoPending number="B / 02" title="Opal Suite" />
            <div className="room-details"><span className="room-kicker">THE OPAL SUITE</span><h3>Opal Suite</h3><p>A larger suite category listed with a city view and additional living space.</p>
              <div className="room-facts"><span><BedDouble size={15} /> Suite</span><span>350 sq. ft.</span><span>City view</span></div>
              <Link className="under-link" href="#enquire">ENQUIRE ABOUT THIS SUITE <ArrowUpRight size={14} /></Link>
            </div>
          </article>
        </div>
        <p className="source-note">Room names and published dimensions are based on a third-party travel listing and should be reconfirmed with the hotel. <a href={mmtUrl} target="_blank" rel="noreferrer">View listing <ArrowUpRight size={12} /></a></p>
      </section>

      <section className="amenities section" id="amenities">
        <SectionLabel number="03">THE ESSENTIAL DETAILS</SectionLabel>
        <div className="amenities-grid">
          <div><p className="eyebrow">MADE FOR A COMFORTABLE STAY</p><h2>The little things<br />that <em>matter.</em></h2>
            <p className="amenities-copy">The following essentials appear in the hotel’s current travel listing. Please confirm specific services and availability directly with the property.</p>
          </div>
          <div className="amenity-list">
            <div><Wind /><span>Air conditioning</span><Check /></div>
            <div><Wifi /><span>Wi-Fi</span><Check /></div>
            <div><Droplets /><span>Mineral water</span><Check /></div>
            <div><ConciergeBell /><span>Room service</span><Check /></div>
            <div><Coffee /><span>Breakfast inclusion shown on listing</span><Check /></div>
          </div>
        </div>
        <div className="checkin-strip"><div><Clock3 /><span>CHECK-IN</span><strong>12:00 PM</strong></div><div><Clock3 /><span>CHECK-OUT</span><strong>11:00 AM</strong></div><small>Published timings; please reconfirm before arrival.</small></div>
      </section>

      <section className="location section" id="location">
        <SectionLabel number="04">FIND IMPERIA</SectionLabel>
        <div className="location-grid">
          <div><p className="eyebrow">RABALE · NAVI MUMBAI</p><h2>Well placed<br />for <em>what brings<br />you here.</em></h2></div>
          <div className="location-info"><MapPin size={22} /><p>{hotelAddress}</p><Link className="button button-gold" href={mapUrl} target="_blank">OPEN MAPS <ArrowUpRight size={15} /></Link></div>
        </div>
        <div className="map-panel"><div className="map-lines" /><div className="map-pin"><MapPin size={23} /><span>IMPERIA BOUTIQUE HOTEL</span></div><Link href={mapUrl} target="_blank" className="map-open">VIEW DIRECTIONS <ArrowUpRight size={14} /></Link></div>
      </section>

      <section className="enquire section" id="enquire">
        <div className="enquire-mark"><Sparkles /></div><p className="eyebrow eyebrow-dark">YOUR STAY STARTS WITH A HELLO</p>
        <h2>Let’s make your<br /><em>visit happen.</em></h2>
        <p>For room availability, current tariffs and reservation assistance, contact Imperia Boutique Hotel directly.</p>
        <div className="contact-details">
          <div className="contact-detail"><span>CALL / WHATSAPP</span><a href="tel:+918369011041">+91 83690 11041</a><a href="https://wa.me/918369011041" target="_blank" rel="noreferrer">Message on WhatsApp <ArrowUpRight size={13} /></a></div>
          <div className="contact-detail"><span>CALL / WHATSAPP</span><a href="tel:+917700003843">+91 77000 03843</a><a href="https://wa.me/917700003843" target="_blank" rel="noreferrer">Message on WhatsApp <ArrowUpRight size={13} /></a></div>
          <div className="contact-detail"><span>EMAIL</span><a href="mailto:imperiaboutiquehotel@gmail.com">imperiaboutiquehotel@gmail.com</a></div>
        </div>
        <Link className="button button-dark" href={mmtUrl} target="_blank">VIEW BOOKING LISTING <ArrowUpRight size={15} /></Link>
      </section>

      <footer className="footer">
        <div className="footer-main"><Link href="#top" className="wordmark footer-wordmark"><span className="monogram">I<span>.</span></span><span className="wordmark-text">IMPERIA<small>BOUTIQUE HOTEL</small></span></Link><p>A welcoming address<br />in Rabale, Navi Mumbai.</p><div className="footer-contact"><a href="tel:+918369011041">83690 11041</a><a href="tel:+917700003843">77000 03843</a><a href="mailto:imperiaboutiquehotel@gmail.com">Email the hotel</a></div><Link href="#top" className="back-top">BACK TO TOP ↑</Link></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} IMPERIA BOUTIQUE HOTEL</span><span>RABALE · NAVI MUMBAI · INDIA</span><span>MADE TO WELCOME</span></div>
      </footer>
    </main>
  );
}

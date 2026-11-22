import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "A Note from Raj Sir | Owner of Imperia Boutique Hotel",
  description: "A personal welcome from Raj Sir, Owner of Imperia Boutique Hotel in Rabale, Navi Mumbai.",
  alternates: { canonical: "/raj-sir" },
  openGraph: {
    title: "A Note from Raj Sir | Imperia Boutique Hotel",
    description: "A personal welcome from the owner of Imperia Boutique Hotel, Rabale, Navi Mumbai.",
    url: "https://imperiaboutiquehotel.in/raj-sir",
    type: "profile",
  },
};

export default function RajSirPage() {
  return (
    <main className="raj-page">
      <div className="raj-topline">
        <span>IMPERIA BOUTIQUE HOTEL</span>
        <span>RABALE · NAVI MUMBAI</span>
      </div>
      <header className="raj-header">
        <Link href="/" className="raj-brand" aria-label="Imperia Boutique Hotel home">
          <span className="raj-monogram">I<span>.</span></span>
          <span>IMPERIA<small>BOUTIQUE HOTEL</small></span>
        </Link>
        <Link href="/" className="raj-back"><ArrowLeft size={15}/> BACK TO HOTEL</Link>
      </header>

      <section className="raj-hero">
        <div className="raj-hero-glow"/>
        <div className="raj-kicker"><span/> A PERSONAL WELCOME</div>
        <div className="raj-layout">
          <div className="raj-copy">
            <p className="raj-overline">A NOTE FROM THE OWNER</p>
            <h1>Meet<br/><em>Raj Sir.</em></h1>
            <div className="raj-rule"/>
            <p className="raj-role">OWNER · IMPERIA BOUTIQUE HOTEL</p>
            <p className="raj-lead">“Hospitality begins with making people feel welcome.”</p>
            <p className="raj-body">At Imperia Boutique Hotel, our aim is to offer every guest a comfortable, thoughtful and welcoming place to stay in Rabale, Navi Mumbai. Whether you are visiting for business, work nearby or exploring the city, we want your time with us to feel easy from arrival to departure.</p>
            <p className="raj-body">Thank you for considering Imperia. We look forward to welcoming you.</p>
            <div className="raj-signoff">Warm regards,<strong>Raj Sir</strong><span>Owner, Imperia Boutique Hotel</span></div>
            <Link href="/#enquire" className="raj-cta">PLAN YOUR STAY <ArrowUpRight size={16}/></Link>
          </div>
          <aside className="raj-profile">
            <div className="raj-portrait" aria-label="Portrait photograph to be added">
              <div className="raj-portrait-ring"/>
              <div className="raj-initials">R<span>.</span></div>
              <div className="raj-portrait-note">A PORTRAIT OF RAJ SIR<br/>CAN BE ADDED HERE</div>
            </div>
            <div className="raj-profile-caption"><Sparkles size={15}/><span>PERSONAL WELCOME FROM THE OWNER</span></div>
            <div className="raj-address"><MapPin size={17}/><span>Plot No. P-52, TTC MIDC Industrial Area, Rabale, Navi Mumbai, Maharashtra 400701</span></div>
          </aside>
        </div>
        <div className="raj-bottomline"><span>IMPERIA · RABALE</span><span>A WELCOMING ADDRESS IN NAVI MUMBAI</span></div>
      </section>

      <footer className="raj-footer">
        <Link href="/" className="raj-footer-brand">IMPERIA <span>BOUTIQUE HOTEL</span></Link>
        <span>© {new Date().getFullYear()} IMPERIA BOUTIQUE HOTEL</span>
        <Link href="/#location">FIND US IN RABALE <ArrowUpRight size={13}/></Link>
      </footer>
    </main>
  );
}

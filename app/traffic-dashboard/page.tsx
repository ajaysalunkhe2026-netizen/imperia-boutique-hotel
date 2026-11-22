import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowUpRight, BarChart3, Globe2, MousePointerClick, Smartphone, ShieldCheck } from "lucide-react";
import { authorize } from "@/lib/authz/policy";
import { resolvePrincipal } from "@/lib/authz/resolve-principal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website Traffic Dashboard",
  description: "Internal traffic analytics access for Imperia Boutique Hotel website administrators.",
  robots: { index: false, follow: false },
};

const analyticsUrl = "https://vercel.com/ajaysalunkhepqc/imperia-boutique-hotel/analytics";

const metrics = [
  { icon: MousePointerClick, label: "Page views", note: "Total pages viewed" },
  { icon: Activity, label: "Visitors", note: "Unique visitors, where available" },
  { icon: Globe2, label: "Top locations", note: "Visitor countries and regions" },
  { icon: Smartphone, label: "Devices", note: "Mobile, desktop and tablet" },
  { icon: BarChart3, label: "Top pages", note: "Most viewed website pages" },
  { icon: ShieldCheck, label: "Referrers", note: "Search, social and other sources" },
];

export default async function TrafficDashboardPage() {
  const principal = await resolvePrincipal();
  if (!authorize({ principal, permission: "platform:diagnostics" }).allowed) {
    notFound();
  }

  return (
    <main className="traffic-dashboard">
      <header className="traffic-header">
        <Link href="/" className="traffic-brand"><span className="traffic-mark">I.</span><span>IMPERIA<small>BOUTIQUE HOTEL</small></span></Link>
        <Link href="/" className="traffic-back"><ArrowLeft size={15}/> BACK TO WEBSITE</Link>
      </header>
      <section className="traffic-main">
        <div className="traffic-eyebrow"><span/> WEBSITE PERFORMANCE</div>
        <div className="traffic-title-row">
          <div><p className="traffic-overline">INTERNAL VIEW</p><h1>Traffic <em>dashboard.</em></h1><p className="traffic-intro">Understand how people discover and use the Imperia Boutique Hotel website.</p></div>
          <div className="traffic-live"><i/> TRACKING SETUP</div>
        </div>
        <div className="traffic-status">
          <div className="traffic-status-icon"><Activity size={22}/></div>
          <div><strong>Analytics connection needs to be enabled</strong><p>Page-view collection has been added to the website. Vercel Web Analytics must be enabled for this project before real traffic reports can be displayed.</p></div>
          <span className="traffic-pending">PENDING</span>
        </div>
        <div className="traffic-section-heading"><div><span>01</span><h2>What you’ll be able to monitor</h2></div><p>Live reports become available after analytics is switched on and new visits are recorded.</p></div>
        <div className="traffic-metric-grid">
          {metrics.map(({icon: Icon,label,note}) => <article className="traffic-metric" key={label}><Icon size={19}/><strong>{label}</strong><span>{note}</span><small>AWAITING DATA</small></article>)}
        </div>
        <div className="traffic-steps">
          <div className="traffic-steps-heading"><span>02</span><h2>Activate traffic reports</h2></div>
          <ol>
            <li><b>Open the Vercel Analytics page</b><span>Use the secure project dashboard for Imperia Boutique Hotel.</span></li>
            <li><b>Enable Web Analytics</b><span>Choose the Enable button in the Web Analytics section.</span></li>
            <li><b>Wait for fresh visits</b><span>Traffic reports begin populating after the site receives new visits. Previous visits are not reconstructed retroactively.</span></li>
          </ol>
          <a className="traffic-open" href={analyticsUrl} target="_blank" rel="noopener noreferrer">OPEN VERCEL ANALYTICS <ArrowUpRight size={16}/></a>
        </div>
        <p className="traffic-footnote">Privacy note: analytics availability and visitor metrics depend on the Vercel plan, project settings and applicable privacy requirements.</p>
      </section>
      <footer className="traffic-footer"><span>© {new Date().getFullYear()} IMPERIA BOUTIQUE HOTEL</span><span>INTERNAL ANALYTICS ACCESS</span></footer>
    </main>
  );
}

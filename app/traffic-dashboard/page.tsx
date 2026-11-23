import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowUpRight, BarChart3, Globe2, MousePointerClick, Smartphone, ShieldCheck } from "lucide-react";
import TrafficBackButton from "./traffic-back-button";
import LogoutButton from "./logout-button";
import { createClient } from "@/lib/supabase/server";
import { getDashboardRole, getDashboardRoleLabel } from "@/lib/dashboard-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website Traffic Dashboard",
  description: "Private traffic analytics dashboard for authorised Imperia Boutique Hotel staff.",
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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?setup=required");
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const role = getDashboardRole(user.phone);
  if (!role) {
    redirect("/login?unauthorized=1");
  }

  const roleLabel = getDashboardRoleLabel(role);

  return (
    <main className="traffic-dashboard">
      <header className="traffic-header">
        <Link href="/" className="traffic-brand"><span className="traffic-mark">I.</span><span>IMPERIA<small>BOUTIQUE HOTEL</small></span></Link>
        <div className="traffic-header-actions">
          <div className="traffic-user-role"><span>SIGNED IN AS</span><strong>{roleLabel}</strong></div>
          <TrafficBackButton />
          <LogoutButton />
        </div>
      </header>
      <section className="traffic-main">
        <div className="traffic-eyebrow"><span/> AUTHORISED INTERNAL VIEW</div>
        <div className="traffic-title-row">
          <div><p className="traffic-overline">WEBSITE PERFORMANCE</p><h1>Traffic <em>dashboard.</em></h1><p className="traffic-intro">Understand how people discover and use the Imperia Boutique Hotel website.</p></div>
          <div className="traffic-live"><i/> TRACKING SETUP</div>
        </div>
        <div className="traffic-status">
          <div className="traffic-status-icon"><Activity size={22}/></div>
          <div><strong>Analytics connection needs to be enabled</strong><p>Vercel Web Analytics must be enabled for this project before real traffic reports can be displayed. No visitor figures are fabricated.</p></div>
          <span className="traffic-pending">PENDING</span>
        </div>
        {role === "technical_admin" && (
          <div className="traffic-admin-notice">
            <div><strong>Technical Admin access</strong><p>You are authorised to manage dashboard users, role assignments, security and analytics configuration. These controls remain server-restricted to the Technical Admin role.</p></div>
            <span>ADMIN ROLE</span>
          </div>
        )}
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
          {role === "technical_admin" && <a className="traffic-open" href={analyticsUrl} target="_blank" rel="noreferrer">OPEN VERCEL ANALYTICS <ArrowUpRight size={16}/></a>}
        </div>
        <p className="traffic-footnote">Privacy note: analytics availability and visitor metrics depend on the Vercel plan, project settings and consent/privacy requirements applicable to your website.</p>
      </section>
      <footer className="traffic-footer"><span>© {new Date().getFullYear()} IMPERIA BOUTIQUE HOTEL</span><span>PRIVATE INTERNAL ANALYTICS</span></footer>
    </main>
  );
}

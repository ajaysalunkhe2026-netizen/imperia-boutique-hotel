import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight, BedDouble, CalendarCheck, ClipboardList,
  CircleDollarSign, Clock3, LayoutDashboard, LogOut, Users,
} from "lucide-react";
import { resolvePrincipal } from "@/lib/authz/resolve-principal";
import { authorize } from "@/lib/authz/policy";

export const dynamic = "force-dynamic";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Reservations", href: "/dashboard/reservations", icon: CalendarCheck },
  { label: "Room inventory", href: "/dashboard/rooms", icon: BedDouble },
  { label: "Guest operations", href: "/dashboard/guests", icon: Users },
];

export default async function DashboardPage() {
  const principal = await resolvePrincipal();
  if (!principal) redirect("/");

  const membership = principal.memberships.find(
    (item) => item.active && (item.role === "hotel_owner" || item.role === "hotel_manager"),
  );
  if (!membership || !authorize({
    principal,
    permission: "hotel:read",
    propertyId: membership.propertyId,
  }).allowed) redirect("/");

  const isOwner = membership.role === "hotel_owner";
  const roleLabel = isOwner ? "HOTEL OWNER" : "HOTEL MANAGER";

  return (
    <main className="ops-shell">
      <aside className="ops-sidebar">
        <Link href="/" className="ops-brand" aria-label="Imperia home">
          <span className="ops-brand-mark">I<span>.</span></span>
          <span>IMPERIA<small>BOUTIQUE HOTEL</small></span>
        </Link>
        <div className="ops-property"><span>PROPERTY WORKSPACE</span><strong>Imperia Boutique Hotel</strong><small>Rabale · Navi Mumbai</small></div>
        <nav className="ops-nav" aria-label="Hotel workspace">
          <span className="ops-nav-label">WORKSPACE</span>
          {navigation.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={index === 0 ? "page" : undefined} className={index === 0 ? "active" : "disabled-link"} aria-disabled={index !== 0}>
                <Icon size={17} strokeWidth={1.7} />{item.label}
                {index === 0 ? <span className="ops-nav-current" /> : <span className="ops-nav-soon">SOON</span>}
              </Link>
            );
          })}
        </nav>
        <div className="ops-sidebar-bottom">
          <span className="ops-role-pill">{roleLabel}</span>
          <Link href="/" className="ops-back-link"><LogOut size={15}/> Back to public website</Link>
        </div>
      </aside>

      <section className="ops-main">
        <header className="ops-topbar">
          <div><span>HOTEL OPERATIONS</span><strong>Workspace overview</strong></div>
          <div className="ops-user"><span className="ops-avatar">{isOwner ? "O" : "M"}</span><span><strong>{roleLabel}</strong><small>Authenticated workspace</small></span></div>
        </header>
        <div className="ops-content">
          <div className="ops-welcome">
            <div><p className="ops-eyebrow">IMPERIA BOUTIQUE HOTEL · RABALE</p><h1>Good day.<br/><em>Your hotel, at a glance.</em></h1><p className="ops-intro">A single workspace for the daily rhythm of your property.</p></div>
            <div className="ops-date-card"><Clock3 size={17}/><span>LIVE WORKSPACE</span><strong>Connected identity</strong><small>Property access verified</small></div>
          </div>

          <div className="ops-section-title"><div><span>01</span><h2>Today at Imperia</h2></div><p>Live operational data will appear when the booking workflow is connected.</p></div>
          <div className="ops-metric-grid">
            <article className="ops-metric"><span><CalendarCheck size={18}/></span><small>ARRIVALS TODAY</small><strong>—</strong><p>Awaiting reservation data</p></article>
            <article className="ops-metric"><span><ClipboardList size={18}/></span><small>DEPARTURES TODAY</small><strong>—</strong><p>Awaiting reservation data</p></article>
            <article className="ops-metric"><span><BedDouble size={18}/></span><small>ROOMS IN SERVICE</small><strong>—</strong><p>Room inventory not yet seeded</p></article>
            {isOwner && <article className="ops-metric"><span><CircleDollarSign size={18}/></span><small>REVENUE OVERVIEW</small><strong>—</strong><p>Financial reporting not connected</p></article>}
          </div>

          <div className="ops-work-grid">
            <article className="ops-panel ops-panel-primary">
              <div className="ops-panel-heading"><div><span>02</span><h2>Operations workspace</h2></div><span className="ops-status">FOUNDATION READY</span></div>
              <p>Identity and property access are verified on the server. Reservation, room allocation and check-in/out actions will be enabled here after their transactional APIs are implemented.</p>
              <div className="ops-check-list"><div><span className="ops-check">✓</span><span><strong>Secure sign-in identity</strong><small>Resolved through Supabase Auth</small></span></div><div><span className="ops-check">✓</span><span><strong>Property role boundary</strong><small>{isOwner ? "Owner workspace permissions" : "Manager operational permissions"}</small></span></div><div><span className="ops-pending">○</span><span><strong>Live reservation feed</strong><small>Next implementation milestone</small></span></div></div>
              <Link href="/" className="ops-text-link">View public hotel website <ArrowUpRight size={15}/></Link>
            </article>
            <article className="ops-panel ops-panel-side">
              <div className="ops-panel-heading"><div><span>03</span><h2>Access scope</h2></div></div>
              <div className="ops-scope-row"><span>Property</span><strong>Imperia Boutique Hotel</strong></div>
              <div className="ops-scope-row"><span>Role</span><strong>{isOwner ? "Hotel Owner" : "Hotel Manager"}</strong></div>
              <div className="ops-scope-row"><span>Business reports</span><strong>{isOwner ? "Owner access" : "Restricted"}</strong></div>
              <div className="ops-scope-row"><span>Guest personal data</span><strong>Need-to-use only</strong></div>
              <p className="ops-scope-note">Access is determined by the authenticated account and active database membership, not by a role selected in the browser.</p>
            </article>
          </div>
          <footer className="ops-footer"><span>IMPERIA BOUTIQUE HOTEL · INTERNAL WORKSPACE</span><span>SECURE ACCESS · ROLE SCOPED</span></footer>
        </div>
      </section>
    </main>
  );
}

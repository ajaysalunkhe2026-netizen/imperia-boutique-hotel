import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Secure Dashboard Login",
  description: "Mobile OTP login for authorised Imperia Boutique Hotel dashboard users.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="dashboard-login">
      <div className="dashboard-login-card">
        <div className="dashboard-login-brand">
          <span className="traffic-mark">I.</span>
          <span>IMPERIA<small>BOUTIQUE HOTEL</small></span>
        </div>
        <p className="login-eyebrow">PRIVATE ACCESS</p>
        <h1>Dashboard <em>sign in.</em></h1>
        <p className="login-description">
          Enter your registered mobile number. A one-time code will be sent by SMS.
        </p>
        <LoginForm />
        <p className="login-security-note">
          Access is limited to registered hotel staff. Never share your OTP with anyone.
        </p>
      </div>
    </main>
  );
}

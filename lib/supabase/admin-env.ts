import "server-only";

function parseSupabaseUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Supabase URL is invalid.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const isLocalHttp = parsed.protocol === "http:" && localHosts.has(parsed.hostname);

  if (parsed.protocol !== "https:" && !isLocalHttp) {
    throw new Error("Supabase URL must use HTTPS; HTTP is allowed only for loopback development.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Supabase URL must not contain credentials, query parameters, or a fragment.");
  }

  return parsed;
}

export function getSupabaseAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Server Supabase configuration is missing.");
  }

  const parsedUrl = parseSupabaseUrl(url);
  return { url: parsedUrl.toString().replace(/\/$/, ""), secretKey };
}

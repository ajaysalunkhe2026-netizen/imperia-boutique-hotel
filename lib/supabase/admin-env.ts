import "server-only";

export function getSupabaseAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Server Supabase configuration is missing.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Supabase URL is invalid.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
    throw new Error("Supabase URL must use HTTPS outside localhost.");
  }

  return { url: parsedUrl.toString(), secretKey };
}

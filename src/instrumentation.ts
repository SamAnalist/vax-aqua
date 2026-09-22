export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const secret = process.env.AUTH_SECRET || "";
  if (secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or shorter than 16 characters");
  }
}

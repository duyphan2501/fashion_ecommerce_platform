const isProduction = process.env.NODE_ENV === "production";

const getCookieOptions = (options = {}) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  ...options,
});

export { getCookieOptions };

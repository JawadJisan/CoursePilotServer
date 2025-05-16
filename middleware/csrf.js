// middleware/csrf.js
import crypto from "crypto";

// Generate signed CSRF token
export const generateCSRFToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", process.env.CSRF_SECRET)
    .update(token)
    .digest("hex");
  return `${token}.${signature}`;
};

// Validate CSRF token
export const validateCSRFToken = (headerToken, cookieToken) => {
  if (!cookieToken) return false;
  const [token, signature] = cookieToken.split(".");
  if (!token || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.CSRF_SECRET)
    .update(token)
    .digest("hex");

  return headerToken === token && signature === expectedSignature;
};

// CSRF protection middleware factory
export const csrfProtection = () => {
  return (req, res, next) => {
    // Issue a new CSRF cookie on safe (GET) requests
    if (req.method === "GET") {
      const csrfToken = generateCSRFToken();
      res.cookie("_csrf", csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      });
      // Expose just the token (no signature) to the client
      res.setHeader("x-csrf-token", csrfToken.split(".")[0]);
    }

    // Validate on state-changing methods
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const headerToken = req.headers["x-csrf-token"];
      const cookieToken = req.cookies["_csrf"];

      if (!validateCSRFToken(headerToken, cookieToken)) {
        return res
          .status(403)
          .json({ success: false, error: "Invalid CSRF token" });
      }
    }

    next();
  };
};

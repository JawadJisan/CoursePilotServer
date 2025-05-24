import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import apiRouter from "./routes/api.js";
import { errorHandler } from "./middleware/errorHandler.js";
// import { csrfProtection } from "./middleware/csrf.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://your-frontend-site.com",
  process.env.NEXT_PUBLIC_BASE_URL,
];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api", apiRouter);

// Error handling
app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("Welcome to the Interview API");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

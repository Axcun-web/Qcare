import "./utils/bigintJson.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { config, isDevelopment } from "./config/index.js";
import { apiRoutes } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (config.NODE_ENV !== "test") {
  app.use(morgan(isDevelopment ? "dev" : "combined"));
}

app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import { corsOptions } from "./middleware/cors";
import chatRoutes from "./routes/chat";
import databaseRoutes from "./routes/database";
import logger from "./utils/logger";
import { testConnection, initializeDatabase } from "./database/connection";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(corsOptions);
app.use(express.json({ limit: "10mb" }));

app.use("/api/chat", chatRoutes);
app.use("/api/db", databaseRoutes);

app.get("/health", async (_req, res) => {
  try {
    // Test database connection
    await testConnection();
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    logger.error(
      `Health check failed: ${error instanceof Error ? error.message : String(error)}`
    );
    res.status(500).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(PORT, async () => {
  logger.info(
    `Server started successfully on port ${PORT} (${process.env.NODE_ENV || "development"})`
  );
  logger.info(`Health check available at: http://localhost:${PORT}/health`);
  logger.info(
    `Chat endpoint available at: http://localhost:${PORT}/api/chat/stream`
  );

  // Initialize database on startup
  // try {
  //   await initializeDatabase();
  // } catch (error) {
  //   logger.error('Failed to initialize database - server will continue but database features may not work');
  // }
});

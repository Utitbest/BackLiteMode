import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import siteRoutes from "./routes/site.routes.js";
import errorHandler from "./middleware/error.middleware.js";
import userRoutes from "./routes/user.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import workOrderRoutes from "./routes/workOrder.routes.js";
import materialRoutes from "./routes/material.routes.js";
import procurementRoutes from "./routes/procurement.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import utilityRoutes from "./routes/utility.routes.js";
import assetRoutes from "./routes/asset.routes.js";
import hrRoutes from "./routes/hr.routes.js";
import panicAlertRoutes from "./routes/panicAlert.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true, 
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));


// for check up
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "SERVO API is running" });
});


// APIs consume as yu can bro
app.use("/api/auth", authRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/users", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/work-orders", workOrderRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/utilities", utilityRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/panic-alerts", panicAlertRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/work-orders/:workOrderId/materials", materialRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

export default app;
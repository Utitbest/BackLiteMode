import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Site from "../models/Site.js";

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for seeding...");

  const existingAdmin = await User.findOne({ role: "SUPER_ADMIN_1" });
  if (existingAdmin) {
    console.log("A Super Admin 1 already exists:", existingAdmin.email);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash("ChangeMe123!", 10);

  const admin = await User.create({
    fullName: "Utitbest Owner",
    companyName: "Kaplan",
    email: "admin@sostein.ng",
    password: hashedPassword,
    role: "SUPER_ADMIN_1",
    siteStatus: "not_applicable",
    isEmailVerified: true,
  });
  console.log("Created Super Admin 1:", admin.email);

  const sites = await Site.insertMany([
    { name: "Bonny Island", code: "bonny-island", status: "active", createdBy: admin._id },
    { name: "Aso Rock - Abuja", code: "aso-rock-abuja", status: "active", createdBy: admin._id },
    { name: "Lekki Phase 1", code: "lekki-phase-1", status: "active", createdBy: admin._id },
  ]);
  console.log(`Created ${sites.length} sites`);

  await mongoose.disconnect();
  console.log("Seeding complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
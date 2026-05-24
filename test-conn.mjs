// Quick connectivity test - run with: node test-conn.mjs
import dns from "dns";
import { createRequire } from "module";
import { readFileSync } from "fs";

// Read .env.local manually
const env = readFileSync(".env.local", "utf-8");
const uri = env.match(/MONGODB_URI=(.+)/)?.[1]?.trim();
console.log("URI:", uri?.replace(/:([^:@]+)@/, ":***@"));

// Test 1: System DNS SRV lookup
console.log("\n[Test 1] System DNS SRV lookup...");
dns.resolveSrv("_mongodb._tcp.cluster0.1di9jc9.mongodb.net", (err, addrs) => {
  if (err) console.log("  FAILED:", err.code, err.message);
  else console.log("  OK:", addrs);
});

// Test 2: Google DNS SRV lookup
console.log("[Test 2] Google DNS (8.8.8.8) SRV lookup...");
const resolver = new dns.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);
resolver.resolveSrv("_mongodb._tcp.cluster0.1di9jc9.mongodb.net", (err, addrs) => {
  if (err) console.log("  FAILED:", err.code, err.message);
  else console.log("  OK:", addrs);
});

// Test 3: Try mongoose connect
console.log("[Test 3] Mongoose connect...");
const require = createRequire(import.meta.url);
const mongoose = require("mongoose");

// Patch DNS before connecting
dns.resolveSrv = resolver.resolveSrv.bind(resolver);
dns.resolveTxt = resolver.resolveTxt.bind(resolver);
dns.setDefaultResultOrder("ipv4first");

setTimeout(async () => {
  try {
    await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 10000 });
    console.log("  Connected to MongoDB!");
    await mongoose.disconnect();
  } catch (e) {
    console.log("  FAILED:", e.message);
  }
  process.exit(0);
}, 1000);

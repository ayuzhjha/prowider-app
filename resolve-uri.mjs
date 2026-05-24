/**
 * Resolves a mongodb+srv:// URI to a direct mongodb:// URI
 * by using Google DNS (8.8.8.8) for SRV + TXT record lookups.
 * Updates .env.local in place.
 *
 * Run: node resolve-uri.mjs
 */

import dns from "dns";
import { readFileSync, writeFileSync } from "fs";
import { promisify } from "util";

const resolver = new dns.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

const resolveSrv = promisify(resolver.resolveSrv.bind(resolver));
const resolveTxt = promisify(resolver.resolveTxt.bind(resolver));

const env = readFileSync(".env.local", "utf-8");
const srvUri = env.match(/MONGODB_URI=(.+)/)?.[1]?.trim();

console.log("Input URI:", srvUri.replace(/:([^:@]+)@/, ":***@"));

// Parse srv URI parts
const m = srvUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?/);
if (!m) { console.error("Could not parse URI"); process.exit(1); }
const [, user, pass, host, dbPath, queryStr] = m;
const dbName = (dbPath || "/prowider").replace("/", "") || "prowider";

console.log("\nResolving SRV records via Google DNS...");
const srvRecords = await resolveSrv(`_mongodb._tcp.${host}`);
console.log("SRV hosts:", srvRecords.map(r => `${r.name}:${r.port}`));

console.log("\nResolving TXT records...");
let txtOptions = "authSource=admin";
try {
  const txtRecords = await resolveTxt(host);
  const txt = txtRecords.flat().join("&");
  console.log("TXT:", txt);
  // TXT usually contains: authSource=admin&replicaSet=atlas-xxx-shard-0
  if (txt) txtOptions = txt;
} catch (e) {
  console.log("TXT failed (using defaults):", e.message);
}

const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(",");
const directUri = `mongodb://${user}:${pass}@${hosts}/${dbName}?ssl=true&${txtOptions}&retryWrites=true&w=majority&appName=Cluster0`;

console.log("\nDirect URI:", directUri.replace(/:([^:@]+)@/, ":***@"));

const newEnv = env.replace(/MONGODB_URI=.+/, `MONGODB_URI=${directUri}`);
writeFileSync(".env.local", newEnv);
console.log("\n✅ .env.local updated with direct connection string!");

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const zipPath = "C:\\Users\\Rakesh Rajput\\Downloads\\developer-portfolio-final.zip";

if (fs.existsSync(zipPath)) {
  try { fs.unlinkSync(zipPath); } catch (_) {}
}

console.log("Packaging clean source files into ZIP archive...");
const cmd = `powershell -Command "Compress-Archive -Path 'backend\\controllers', 'backend\\models', 'backend\\routes', 'backend\\services', 'backend\\utils', 'backend\\package.json', 'backend\\server.js', 'frontend\\src', 'frontend\\public', 'frontend\\index.html', 'frontend\\package.json', 'frontend\\vite.config.js', 'README.md' -DestinationPath '${zipPath}' -Force"`;
execSync(cmd, { stdio: "inherit" });

if (fs.existsSync(zipPath)) {
  const sizeKB = (fs.statSync(zipPath).size / 1024).toFixed(2);
  console.log(`✅ Complete ZIP Archive Created: ${zipPath} (${sizeKB} KB)`);
}

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "public");
const sourceHtml = path.join(root, "outputs", "moke-crm-mvp.html");
const sourceData = path.join(root, "outputs", "moke-crm-imported-data.js");

if (!fs.existsSync(sourceHtml)) {
  throw new Error(`Missing source file: ${sourceHtml}`);
}

fs.mkdirSync(outputDir, { recursive: true });

fs.copyFileSync(sourceHtml, path.join(outputDir, "index.html"));
fs.copyFileSync(sourceHtml, path.join(outputDir, "moke-crm-mvp.html"));

if (fs.existsSync(sourceData)) {
  fs.copyFileSync(sourceData, path.join(outputDir, "moke-crm-imported-data.js"));
}

console.log("MOKE CRM static build complete.");
console.log(`Output: ${outputDir}`);

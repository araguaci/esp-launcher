import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(process.argv[2] || "build");
const buildId = process.env.PWA_BUILD_ID || new Date().toISOString();

if (!existsSync(buildDir)) {
  console.error(`Build directory not found: ${buildDir}`);
  process.exit(1);
}

const iconsDir = path.join(buildDir, "icons");
mkdirSync(iconsDir, { recursive: true });
cpSync(path.join(here, "pwa", "icons"), iconsDir, { recursive: true });
cpSync(path.join(here, "pwa", "manifest.webmanifest"), path.join(buildDir, "manifest.webmanifest"));

const worker = readFileSync(path.join(here, "pwa", "sw.mjs"), "utf8").replaceAll("__BUILD_ID__", buildId);
writeFileSync(path.join(buildDir, "sw.js"), worker);

const headTags = `
    <link rel="manifest" href="manifest.webmanifest" />
    <meta name="theme-color" content="#111417" />
    <link rel="icon" href="icons/icon-192.png" sizes="192x192" />
    <link rel="apple-touch-icon" href="icons/icon-192.png" />`;

const boot = `
    <script>
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js");
      }
    </script>`;

for (const name of readdirSync(buildDir)) {
  if (!name.endsWith(".html")) {
    continue;
  }
  const file = path.join(buildDir, name);
  let html = readFileSync(file, "utf8");
  if (!html.includes('rel="manifest"')) {
    html = html.replace("</head>", `${headTags}\n  </head>`);
  }
  if (!html.includes('serviceWorker.register')) {
    html = html.replace("</body>", `${boot}\n  </body>`);
  }
  writeFileSync(file, html);
}

console.log(`PWA injected into ${buildDir} (build ${buildId})`);

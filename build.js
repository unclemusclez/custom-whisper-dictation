const fs = require("fs-extra");
const archiver = require("archiver");
const path = require("path");

const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist");
const browsers = ["chrome", "firefox", "edge", "brave"];

// Ensure dist directory exists and is empty
fs.emptyDirSync(distDir);

async function buildExtension() {
  for (const browser of browsers) {
    const browserDir = path.join(distDir, browser);
    fs.ensureDirSync(browserDir);

    // Copy all source files
    await fs.copy(srcDir, browserDir);

    // Modify manifest.json for each browser
    const manifestPath = path.join(browserDir, "manifest.json");
    const manifest = await fs.readJson(manifestPath);

    if (browser === "firefox") {
      manifest.background = { scripts: ["background.js"] }; // Firefox prefers scripts
      manifest.browser_specific_settings = {
        gecko: {
          id: "{550e8400-e29b-41d4-a716-446655440000}", // Replace with your UUID
          strict_min_version: "91.0",
        },
      };
    } else if (browser === "edge") {
      manifest.minimum_edge_version = "90.0"; // Optional
    } else if (browser === "brave") {
      // Brave uses Chrome’s manifest as-is
    }

    // Write updated manifest
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });

    // Package the extension
    await packageExtension(browser, browserDir);
  }

  console.log("Build complete! Check the dist folder.");
}

async function packageExtension(browser, browserDir) {
  const outputPath = path.join(
    distDir,
    `${browser}-extension${browser === "firefox" ? ".xpi" : ".zip"}`
  );
  const output = fs.createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.directory(browserDir, false);
    archive.finalize();
  });
}

buildExtension().catch((err) => console.error("Build failed:", err));

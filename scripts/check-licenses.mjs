const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

const raw = Buffer.concat(chunks).toString("utf8");
const data = JSON.parse(raw);
const groups = Array.isArray(data) ? { UNKNOWN: data } : data;

const blocked = [
  /^GPL/i,
  /^AGPL/i,
  /^SSPL/i,
  /^BUSL/i,
  /Proprietary/i,
  /No license/i,
];
const weakCopyleftNeedsException = [/^LGPL/i];
const exceptions = new Set([
  "@img/sharp-libvips-darwin-x64",
  "@img/sharp-libvips-linux-x64",
  "@img/sharp-libvips-linuxmusl-x64",
]);

const issues = [];
for (const [license, packages] of Object.entries(groups)) {
  for (const pkg of packages) {
    const name = pkg.name ?? "unknown";
    const isBlocked = blocked.some((pattern) => pattern.test(license));
    const needsException = weakCopyleftNeedsException.some((pattern) =>
      pattern.test(license),
    );
    if (isBlocked || (needsException && !exceptions.has(name))) {
      issues.push({ name, license, versions: pkg.versions ?? [] });
    }
  }
}

if (issues.length > 0) {
  console.error("BLOCKED LICENSE FOUND");
  console.error(JSON.stringify(issues, null, 2));
  process.exit(1);
}

console.log("No blocked licenses found");

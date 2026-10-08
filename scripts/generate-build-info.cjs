const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkgPath = path.join(__dirname, '../package.json');
let version = '5.8.25';
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const parts = (pkg.version || '5.8.24').split('.');
  if (parts.length === 3) {
    parts[2] = String(parseInt(parts[2], 10) + 1);
    version = parts.join('.');
  } else {
    version = pkg.version;
  }
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`🚀 [Version Bump] Version incremented to v${version}`);
} catch (err) {
  console.warn('⚠️ Version bump warning:', err.message);
}

function getBuildInfo() {
  const timestamp = new Date().toLocaleString('fa-IR', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  let commitHash = '';
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    commitHash = 'dev-' + Math.random().toString(36).substring(2, 9);
  }

  return {
    timestamp,
    commitHash
  };
}

const buildInfo = getBuildInfo();

// 1. Write src/config/build-info.ts
const buildInfoPath = path.join(__dirname, '../src/config/build-info.ts');
const buildInfoContent = `// Auto-generated during build. Do not modify manually.
export const BUILD_TIMESTAMP = '${buildInfo.timestamp}';
export const BUILD_HASH = '${buildInfo.commitHash}';
export const APP_VERSION = 'v${version}';
`;
fs.writeFileSync(buildInfoPath, buildInfoContent);

// 2. Synchronize src/config/version.ts immediately to eliminate any version mismatch
const versionFilePath = path.join(__dirname, '../src/config/version.ts');
const versionContent = `export const APP_VERSION = '${version}';\nexport const APP_VERSION_TAG = \`v\${APP_VERSION}\`;\n`;
fs.writeFileSync(versionFilePath, versionContent);

console.log(`✅ Generated build-info & version.ts: Version="v${version}", Timestamp="${buildInfo.timestamp}", Hash="${buildInfo.commitHash}"`);


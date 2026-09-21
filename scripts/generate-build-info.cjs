const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    // Fallback if git is not initialized or available in sandbox
    commitHash = 'dev-' + Math.random().toString(36).substring(2, 9);
  }

  return {
    timestamp,
    commitHash
  };
}

const buildInfo = getBuildInfo();
const filePath = path.join(__dirname, '../src/config/build-info.ts');

const content = `// Auto-generated during build. Do not modify manually.
export const BUILD_TIMESTAMP = '${buildInfo.timestamp}';
export const BUILD_HASH = '${buildInfo.commitHash}';
`;

fs.writeFileSync(filePath, content);
console.log(`✅ Generated build-info: Timestamp="${buildInfo.timestamp}", Hash="${buildInfo.commitHash}"`);

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkgPath = path.join(__dirname, '../package.json');
let version = '5.9.40';
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  // فقط در صورت درخواست صریح با فلگ --bump یا متغیر BUMP_VERSION نسخه پچ ارتقا می‌یابد
  const shouldBump = process.argv.includes('--bump') || process.env.BUMP_VERSION === 'true';
  if (shouldBump) {
    const parts = (pkg.version || '5.9.40').split('.');
    if (parts.length === 3) {
      parts[2] = String(parseInt(parts[2], 10) + 1);
      version = parts.join('.');
    } else {
      version = pkg.version;
    }
    pkg.version = version;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`🚀 [Version Bump] Version incremented to v${version}`);
  } else {
    version = pkg.version || '5.9.40';
    console.log(`📌 [Version Policy] Single Source of Truth version from package.json: v${version}`);
  }
} catch (err) {
  console.warn('⚠️ Version sync warning:', err.message);
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

// 3. Synchronize src/services/unifiedVerificationService.js
const verificationServicePath = path.join(__dirname, '../src/services/unifiedVerificationService.js');
if (fs.existsSync(verificationServicePath)) {
  let content = fs.readFileSync(verificationServicePath, 'utf8');
  content = content.replace(/export const VERIFICATION_ENGINE_VERSION = '.*?';/, `export const VERIFICATION_ENGINE_VERSION = '${version}';`);
  fs.writeFileSync(verificationServicePath, content);
}

// 4. Synchronize local-agent/package.json
const localAgentPkgPath = path.join(__dirname, '../local-agent/package.json');
if (fs.existsSync(localAgentPkgPath)) {
  try {
    const laPkg = JSON.parse(fs.readFileSync(localAgentPkgPath, 'utf8'));
    laPkg.version = version;
    fs.writeFileSync(localAgentPkgPath, JSON.stringify(laPkg, null, 2) + '\n');
  } catch (_) {}
}

// 5. Synchronize public/extension/manifest.json
const extManifestPath = path.join(__dirname, '../public/extension/manifest.json');
if (fs.existsSync(extManifestPath)) {
  try {
    const extManifest = JSON.parse(fs.readFileSync(extManifestPath, 'utf8'));
    extManifest.version = version;
    fs.writeFileSync(extManifestPath, JSON.stringify(extManifest, null, 2) + '\n');
  } catch (_) {}
}

// 6. Synchronize local-agent/index.js
const localAgentIndexPath = path.join(__dirname, '../local-agent/index.js');
if (fs.existsSync(localAgentIndexPath)) {
  try {
    let agentIndexContent = fs.readFileSync(localAgentIndexPath, 'utf8');
    agentIndexContent = agentIndexContent.replace(/let AGENT_VERSION = '.*?';/, `let AGENT_VERSION = '${version}';`);
    fs.writeFileSync(localAgentIndexPath, agentIndexContent);
  } catch (_) {}
}

// 7. Synchronize test scripts
const acceptanceScriptPath = path.join(__dirname, 'test-acceptance-scenarios.cjs');
if (fs.existsSync(acceptanceScriptPath)) {
  try {
    let acceptContent = fs.readFileSync(acceptanceScriptPath, 'utf8');
    acceptContent = acceptContent.replace(/let activeVersion = '.*?';/, `let activeVersion = '${version}';`);
    fs.writeFileSync(acceptanceScriptPath, acceptContent);
  } catch (_) {}
}

const e2eScriptPath = path.join(__dirname, 'test-e2e-workflow.cjs');
if (fs.existsSync(e2eScriptPath)) {
  try {
    let e2eContent = fs.readFileSync(e2eScriptPath, 'utf8');
    e2eContent = e2eContent.replace(/let activeVersion = '.*?';/, `let activeVersion = '${version}';`);
    fs.writeFileSync(e2eScriptPath, e2eContent);
  } catch (_) {}
}

console.log(`✅ Synchronized all components from single source of truth: Version="v${version}", Timestamp="${buildInfo.timestamp}", Hash="${buildInfo.commitHash}"`);


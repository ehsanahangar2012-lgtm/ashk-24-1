const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function packageExtensionAndAgent() {
  const rootDir = path.resolve(__dirname, '..');
  const extDir = path.join(rootDir, 'public', 'extension');
  const agentDir = path.join(rootDir, 'local-agent');
  const outDir = path.join(rootDir, 'public', 'downloads');
  const distOutDir = path.join(rootDir, 'dist', 'downloads');

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = pkg.version || '5.8.12';

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  if (!fs.existsSync(distOutDir)) {
    fs.mkdirSync(distOutDir, { recursive: true });
  }

  // 1. Ensure manifest.json version is synced with package.json
  const manifestPath = path.join(extDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = version;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }

  // 2. Build Extension JSZip package
  const extZip = new JSZip();
  const extFiles = fs.readdirSync(extDir);

  for (const file of extFiles) {
    const filePath = path.join(extDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const content = fs.readFileSync(filePath);
      extZip.file(file, content);
    }
  }

  const extZipBuffer = await extZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  // 3. Build Local Agent JSZip package
  const agentZip = new JSZip();
  if (fs.existsSync(agentDir)) {
    function addAgentFolder(dirPath, zipFolder) {
      const entries = fs.readdirSync(dirPath);
      for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'sessions' || entry === 'evidence' || entry === 'local-agent') continue;
        const fullPath = path.join(dirPath, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          addAgentFolder(fullPath, zipFolder.folder(entry));
        } else if (stat.isFile()) {
          zipFolder.file(entry, fs.readFileSync(fullPath));
        }
      }
    }
    addAgentFolder(agentDir, agentZip);
  }

  const agentZipBuffer = await agentZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  // 4. Purge older and non-versioned archives
  const syncDirs = [outDir, distOutDir];
  syncDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        if (file === '.gitkeep' || file === 'Ashk24_MacroDroid_Relay.json') return;
        const isArtifact = file.endsWith('.zip') || file.endsWith('.bat') || file.endsWith('.sh') || file.endsWith('.tar.gz');
        if (isArtifact && !file.includes(`v${version}`)) {
          try {
            fs.unlinkSync(path.join(dir, file));
            console.log(`  🗑️ Purged old/unversioned file: ${file}`);
          } catch (e) {}
        }
      });
    }
  });

  // 5. Save strictly version-named packages to public/downloads and dist/downloads
  syncDirs.forEach(dir => {
    // Extension
    fs.writeFileSync(path.join(dir, `ashk24-extension-v${version}.zip`), extZipBuffer);

    // Local Agent
    fs.writeFileSync(path.join(dir, `ashk24-local-agent-v${version}.zip`), agentZipBuffer);

    // Standalone Runner Scripts (Strictly version-named)
    const batContent = fs.readFileSync(path.join(agentDir, 'start_agent.bat'));
    const shContent = fs.readFileSync(path.join(agentDir, 'start_agent.sh'));
    fs.writeFileSync(path.join(dir, `start_agent_v${version}.bat`), batContent);
    fs.writeFileSync(path.join(dir, `start_agent_v${version}.sh`), shContent);
  });

  console.log(`📦 [Extension Package] Successfully packaged extension v${version} (${(extZipBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`📦 [Local Agent Package] Successfully packaged local-agent v${version} (${(agentZipBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`📦 [Runner Scripts] Successfully synced start_agent_v${version}.bat and .sh to downloads`);
}

packageExtensionAndAgent().catch(console.error);

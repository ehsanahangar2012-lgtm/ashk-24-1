const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  if (!exists) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. Copy .htaccess to dist/
const rootHtaccess = path.join(rootDir, '.htaccess');
if (fs.existsSync(rootHtaccess)) {
  fs.copyFileSync(rootHtaccess, path.join(distDir, '.htaccess'));
  console.log('✅ Copied .htaccess to dist/.htaccess');
}

// 1.1 Copy post_view.php to dist/
const rootPostView = path.join(rootDir, 'post_view.php');
if (fs.existsSync(rootPostView)) {
  fs.copyFileSync(rootPostView, path.join(distDir, 'post_view.php'));
  console.log('✅ Copied post_view.php to dist/post_view.php');
}

// 2. Copy cpanel-backend folder to dist/cpanel-backend
const cpanelBackendSrc = path.join(rootDir, 'cpanel-backend');
const cpanelBackendDest = path.join(distDir, 'cpanel-backend');
if (fs.existsSync(cpanelBackendSrc)) {
  copyRecursiveSync(cpanelBackendSrc, cpanelBackendDest);
  console.log('✅ Copied cpanel-backend to dist/cpanel-backend');
}

// 2.1 Copy local-agent folder to dist/local-agent
const localAgentSrc = path.join(rootDir, 'local-agent');
const localAgentDest = path.join(distDir, 'local-agent');
if (fs.existsSync(localAgentSrc)) {
  copyRecursiveSync(localAgentSrc, localAgentDest);
  console.log('✅ Copied local-agent to dist/local-agent');
}

// 3. Copy downloads folder to dist/downloads
const downloadsSrc = path.join(rootDir, 'public', 'downloads');
const downloadsDest = path.join(distDir, 'downloads');
if (fs.existsSync(downloadsSrc)) {
  copyRecursiveSync(downloadsSrc, downloadsDest);
  console.log('✅ Copied downloads folder to dist/downloads');
}

// 4. Copy data folder to dist/data
const dataSrc = path.join(rootDir, 'data');
const dataDest = path.join(distDir, 'data');
if (fs.existsSync(dataSrc)) {
  copyRecursiveSync(dataSrc, dataDest);
  console.log('✅ Copied data folder to dist/data');
}

// Ensure uploads directories exist in dist
const distUploads = path.join(distDir, 'uploads');
if (!fs.existsSync(distUploads)) {
  fs.mkdirSync(distUploads, { recursive: true });
  console.log('✅ Created dist/uploads');
}
const backendUploads = path.join(cpanelBackendDest, 'uploads');
if (!fs.existsSync(backendUploads)) {
  fs.mkdirSync(backendUploads, { recursive: true });
}
const backendData = path.join(cpanelBackendDest, 'data');
if (!fs.existsSync(backendData)) {
  fs.mkdirSync(backendData, { recursive: true });
}

// 5. Copy README_CPANEL.md to dist/
const readmeSrc = path.join(rootDir, 'README_CPANEL.md');
if (fs.existsSync(readmeSrc)) {
  fs.copyFileSync(readmeSrc, path.join(distDir, 'README_CPANEL.md'));
  console.log('✅ Copied README_CPANEL.md to dist/');
}

// 6. Generate ashk24-cpanel-FINAL.zip and ashk24-cpanel-3.9.3.zip
async function generateFinalPackages() {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = pkg.version || '3.9.3';
  
  // CPANEL PRODUCTION PACKAGE (ashk24-cpanel-FINAL.zip and versioned)
  const prodZip = new JSZip();

  function addFolderToZip(folderPath, zipFolder, baseDir) {
    const items = fs.readdirSync(folderPath);
    for (const item of items) {
      // Do not include the cpanel package itself inside the zip to prevent recursion, but DO include extension zips
      if ((item.startsWith('ashk24-cpanel') && item.endsWith('.zip')) || item.endsWith('.map') || item.endsWith('.apk') || item === 'server.cjs' || item === 'server.cjs.map' || item === 'ashk24-agent.tar.gz' || item === 'local-agent') continue;
      const fullPath = path.join(folderPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (item === 'node_modules' || item === '.git' || item === 'local-agent' || item === 'evidence') continue;
        addFolderToZip(fullPath, zipFolder.folder(item), baseDir);
      } else {
        zipFolder.file(item, fs.readFileSync(fullPath));
      }
    }
  }

  addFolderToZip(distDir, prodZip, distDir);

  const prodZipBuffer = await prodZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  // Clean up any zip files in root directory unconditionally
  fs.readdirSync(rootDir).forEach(file => {
    if (file.endsWith('.zip') || file.endsWith('.tar.gz') || file.endsWith('.apk')) {
      try { fs.unlinkSync(path.join(rootDir, file)); } catch (e) {}
    }
  });

  const prodDistVersionedPath = path.join(distDir, `ashk24-cpanel-v${version}.zip`);
  fs.writeFileSync(prodDistVersionedPath, prodZipBuffer);

  // Sync official versioned zip to public/downloads and dist/downloads
  const targetSyncDirs = [
    path.join(rootDir, 'public', 'downloads'),
    path.join(distDir, 'downloads'),
  ];

  // Purge any older version zip archives from all targets
  targetSyncDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        if ((file.endsWith('.zip') || file.endsWith('.apk')) && file.startsWith('ashk24-cpanel-')) {
          if (!file.includes(`v${version}`)) {
            try { fs.unlinkSync(path.join(dir, file)); } catch (e) {}
          }
        }
      });
    }
  });

  targetSyncDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `ashk24-cpanel-v${version}.zip`), prodZipBuffer);
  });

  console.log(`📦 [Production cPanel] Created production package: ${prodDistVersionedPath} (${(prodZipBuffer.length / 1024).toFixed(1)} KB / ${(prodZipBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`✨ Versioned cPanel Production Package v${version} generated and synced!`);
}

generateFinalPackages().catch(console.error);

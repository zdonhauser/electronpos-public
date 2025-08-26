console.log('Electron Forge configuration loaded.');
const path = require('path');


module.exports = {
  packagerConfig: {
    icon: path.resolve(__dirname, 'assets/icon.ico'),
    asar: {
      unpack: '**/posdashboard/**',
    },
    extraResource: [
      path.join(__dirname, '.env'),
    ],

    ignore: (file) => {
      const relativePath = path.relative(__dirname, file).replace(/\\/g, '/');

      const ignoredPatterns = [
        /\.vscode\//,
        /(^|\/)\.git(\/|$)/,
        /\.log$/,
        /\.md$/,
        /^posdashboard\/client\/(?!build\/).*/,
        /^posdashboard\/client\/public\//,
        /^posdashboard\/client\/src\//,
      ];

      const shouldIgnore = ignoredPatterns.some((pattern) => pattern.test(relativePath));

      return shouldIgnore;
    },

  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: (arch) => {
        // Convert relative path to absolute file URL
        const iconPath = path.resolve(__dirname, 'assets/icon.ico');
        const fileUrl = `file:///${iconPath.replace(/\\/g, '/')}`;
        
        return {
          name: 'zdt_pos',
          setupIcon: iconPath,
          iconUrl: fileUrl,
          setupExe: `ZDT_POS_Setup-${new Date().toISOString().replace(/[:.]/g, '-')}.exe`,
          noMsi: true,
          createDesktopShortcut: true,
          shortcutName: 'ZDT POS',
          authors: 'ZDT',
          description: 'ZDT Point of Sale System',
          setupMsi: null,
          skipUpdateIcon: true,
          loadingGif: null
        };
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  hooks: {
    postMake: async (forgeConfig, results) => {
      const fs = require('fs');
      const path = require('path');
      
      // Define both target directories
      const dDriveDir = 'D:/POS';
      const downloadsDir = path.join(process.env.USERPROFILE, 'Downloads');
      
      // Create D:/POS directory if it doesn't exist and we can access D: drive
      let canAccessDDrive = false;
      try {
        fs.accessSync('D:', fs.constants.W_OK);
        canAccessDDrive = true;
        if (!fs.existsSync(dDriveDir)) {
          fs.mkdirSync(dDriveDir, { recursive: true });
          console.log(`Created directory: ${dDriveDir}`);
        }
      } catch (error) {
        console.warn('Could not access D: drive, will only save to Downloads');
      }
      
      // Ensure Downloads directory exists
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }
      
      for (const result of results) {
        for (const artifact of result.artifacts) {
          if (artifact.endsWith('.exe')) {
            const fileName = path.basename(artifact);
            
            // Save to D:/POS with original versioned filename if D: is accessible
            if (canAccessDDrive) {
              const dDrivePath = path.join(dDriveDir, fileName);
              fs.copyFileSync(artifact, dDrivePath);
              console.log(`Saved versioned copy to: ${dDrivePath}`);
            }
            
            // Always save to Downloads as zdt_latest.exe
            const latestPath = path.join(downloadsDir, 'zdt_latest.exe');
            fs.copyFileSync(artifact, latestPath);
            console.log(`Saved latest version to: ${latestPath}`);
          }
        }
      }
      return results;
    }
  }
};
#!/usr/bin/env node
/**
 * Publish the current code as an EAS Update.
 *
 *   npm run publish:go   → an update Expo Go can open (iPhone and Android, no app store needed)
 *   npm run publish:apk  → an update for the Android APK you built with `npm run build:apk`
 *
 * Add a message after `--` if you like:  npm run publish:go -- "New budget screen"
 */
import { spawnSync } from 'node:child_process';

const target = process.argv[2] === 'apk' ? 'apk' : 'go';
const message = process.argv.slice(3).join(' ').trim() || `Update ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

const env = { ...process.env };
if (target === 'go') env.EXPO_GO_UPDATE = '1';
else delete env.EXPO_GO_UPDATE;

console.log(`\nPublishing an update for ${target === 'go' ? 'Expo Go' : 'the Android APK'}: "${message}"\n`);

const result = spawnSync(
  'npx',
  ['--yes', 'eas-cli@latest', 'update', '--channel', 'main', '--environment', 'production', '--message', message],
  { stdio: 'inherit', env, shell: process.platform === 'win32' },
);

if (result.status === 0 && target === 'go') {
  console.log(
    '\nDone! To open it on your phone: sign in to Expo Go with the same Expo account,\n' +
      'then open the update link above (or your project on expo.dev → Updates → Preview)\n' +
      'and scan the QR code with the camera.\n',
  );
}
process.exit(result.status ?? 1);

import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Most settings live in app.json. This file only adds the parts that have to be
 * worked out when Expo reads the config:
 *
 * - runtimeVersion: Expo Go can only open updates whose runtime is its own SDK
 *   ("exposdk:57.0.0"). `npm run publish:go` sets EXPO_GO_UPDATE=1 so the update
 *   targets Expo Go. Builds you install yourself (the Android APK) use the app
 *   version instead, which is what `npm run publish:apk` targets.
 * - updates.url: filled in from the EAS project id once `eas init` has run.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const forExpoGo = process.env.EXPO_GO_UPDATE === '1';
  const extra = (config.extra ?? {}) as { eas?: { projectId?: string } };
  const projectId = extra.eas?.projectId;

  const runtimeVersion = (forExpoGo
    ? { policy: 'sdkVersion' }
    : { policy: 'appVersion' }) as unknown as ExpoConfig['runtimeVersion'];

  return {
    ...config,
    name: config.name ?? 'Hedgerow',
    slug: config.slug ?? 'hedgerow',
    runtimeVersion,
    updates: projectId
      ? { ...(config.updates ?? {}), url: `https://u.expo.dev/${projectId}` }
      : config.updates,
  };
};

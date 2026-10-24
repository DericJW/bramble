import { useState } from 'react';
import { ScrollView, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authErrorMessage, resetPassword, signIn, signInAsGuest, signUp } from '../data/auth';
import HomeDayScene from '../scenes/HomeDayScene';
import HomeNightScene from '../scenes/HomeNightScene';
import { sceneHeight } from '../scenes/SceneSvg';
import { usePalette, useTheme } from '../theme/theme';
import { Bramble } from '../ui/Bramble';
import { LinkButton, PxButton } from '../ui/Buttons';
import { Frame } from '../ui/Frame';
import { Field, Segmented } from '../ui/Inputs';
import { useToast } from '../ui/Overlays';
import { Page, useStatusBar } from '../ui/Screen';
import { SceneKicker, SceneTitle, Txt } from '../ui/Txt';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const { width, night } = useTheme();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<null | 'main' | 'guest' | 'reset'>(null);
  const [error, setError] = useState<string | null>(null);
  useStatusBar(night);

  const submit = async () => {
    setBusy('main');
    setError(null);
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const guest = async () => {
    setBusy('guest');
    setError(null);
    try {
      await signInAsGuest();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError('Type your email above first, then tap “Forgot password?” again.');
      return;
    }
    setBusy('reset');
    setError(null);
    try {
      await resetPassword(email);
      toast.show('Check your inbox for a reset link.');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const sh = sceneHeight(width);

  return (
    <Page>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }} keyboardShouldPersistTaps="handled">
          <View style={{ height: sh }}>
            <View style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
              {night ? <HomeNightScene width={width} /> : <HomeDayScene width={width} />}
            </View>
            <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 20, gap: 4 }}>
              <SceneKicker>Money, miles and more</SceneKicker>
              <SceneTitle>Hedgerow</SceneTitle>
            </View>
          </View>
          <View style={{ marginTop: -24, paddingHorizontal: 17, gap: 20 }}>
            <Frame inset={c.cardInset} innerStyle={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Bramble size={56} accessory={night ? 'cap' : 'coin'} sleepy={night} />
              <Txt style={{ flex: 1 }} lh={21}>
                Hello! I’m Bramble. I help you keep count of your money, miles, spending and what you owe. Everything is keyed in by you.
              </Txt>
            </Frame>
            <Frame innerStyle={{ padding: 16, gap: 14 }}>
              <Segmented
                options={[
                  { value: 'signin', label: 'Sign in' },
                  { value: 'signup', label: 'New account' },
                ]}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setError(null);
                }}
              />
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                textContentType={mode === 'signin' ? 'password' : 'newPassword'}
                placeholder={mode === 'signin' ? 'Your password' : 'At least 6 characters'}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
              {error ? (
                <Txt size={14} weight="bold" color={c.warnStrong} lh={20}>
                  {error}
                </Txt>
              ) : null}
              <PxButton
                label={mode === 'signin' ? 'Sign in' : 'Create my farm'}
                height={52}
                busy={busy === 'main'}
                disabled={!email.trim() || password.length < 6 || busy !== null}
                onPress={submit}
              />
              {mode === 'signin' ? (
                <View style={{ alignItems: 'center' }}>
                  <LinkButton label={busy === 'reset' ? 'Sending…' : 'Forgot password?'} onPress={forgot} />
                </View>
              ) : null}
            </Frame>
            <View style={{ gap: 8 }}>
              <PxButton label="Try it without an account" kind="secondary" busy={busy === 'guest'} disabled={busy !== null} onPress={guest} />
              <Txt size={13} muted center lh={18}>
                A guest farm works straight away. You can save it to an email later in Settings.
              </Txt>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}

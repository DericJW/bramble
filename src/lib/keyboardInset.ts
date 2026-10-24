import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * How far the on-screen keyboard covers the bottom of the screen, so bottom sheets can sit
 * above it. Only needed on iPhone: Android resizes the app for the keyboard by itself.
 * (The web version is keyboardInset.web.ts.)
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

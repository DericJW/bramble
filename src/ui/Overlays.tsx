import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/theme';
import { IconButton, PxButton } from './Buttons';
import { Frame } from './Frame';
import { Txt } from './Txt';

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                         */
/* ------------------------------------------------------------------ */

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned under the scrolling content (e.g. a Done button). */
  footer?: ReactNode;
};

export function Sheet({ visible, onClose, title, children, footer }: SheetProps) {
  const { c, width } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.bottom}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ width, paddingHorizontal: 8 }}>
          <Frame drop={null} innerStyle={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
              <Txt face="pixel" weight="bold" size={20} lh={26} style={{ flex: 1 }} accessibilityRole="header">
                {title}
              </Txt>
              <IconButton icon="iClose" label="Close" size={36} onPress={onClose} />
            </View>
            <ScrollView
              style={{ flexGrow: 0, maxHeight: Math.round(winHeight * (footer ? 0.56 : 0.64)) }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>{footer}</View> : null}
          </Frame>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm / alert dialogs (Alert.alert does nothing on the web)       */
/* ------------------------------------------------------------------ */

type DialogOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  destructive?: boolean;
};

type DialogState = DialogOptions & { resolve: (ok: boolean) => void };

type DialogApi = {
  confirm: (o: DialogOptions) => Promise<boolean>;
  alert: (title: string, message?: string) => Promise<void>;
};

const DialogContext = createContext<DialogApi>({
  confirm: async () => false,
  alert: async () => undefined,
});

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const { c, width } = useTheme();

  const confirm = useCallback(
    (o: DialogOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({ ...o, resolve });
      }),
    [],
  );
  const alert = useCallback(
    (title: string, message?: string) =>
      new Promise<void>((resolve) => {
        setDialog({ title, message, confirmLabel: 'OK', cancelLabel: null, resolve: () => resolve() });
      }),
    [],
  );

  const close = (ok: boolean) => {
    dialog?.resolve(ok);
    setDialog(null);
  };

  const api = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
        <View style={[styles.center, { backgroundColor: c.scrim }]}>
          <View style={{ width: Math.min(width - 40, 360) }}>
            <Frame innerStyle={{ padding: 18, gap: 12 }} inset={c.cardInset}>
              <Txt face="pixel" weight="bold" size={20} lh={26} accessibilityRole="header">
                {dialog?.title ?? ''}
              </Txt>
              {dialog?.message ? <Txt lh={21}>{dialog.message}</Txt> : null}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                {dialog && dialog.cancelLabel !== null ? (
                  <PxButton kind="secondary" label={dialog.cancelLabel ?? 'Cancel'} onPress={() => close(false)} style={{ flex: 1 }} />
                ) : null}
                <PxButton
                  kind={dialog?.destructive ? 'danger' : 'primary'}
                  label={dialog?.confirmLabel ?? 'OK'}
                  onPress={() => close(true)}
                  style={{ flex: 1 }}
                />
              </View>
            </Frame>
          </View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  return useContext(DialogContext);
}

/* ------------------------------------------------------------------ */
/* Toasts                                                               */
/* ------------------------------------------------------------------ */

type ToastTone = 'good' | 'warn';
type ToastApi = { show: (text: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ text: string; tone: ToastTone; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { c, width } = useTheme();

  const show = useCallback((text: string, tone: ToastTone = 'good') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ text, tone, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), tone === 'warn' ? 4200 : 2400);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.toastWrap, { top: insets.top + 8 }]}>
          <Pressable onPress={() => setToast(null)} accessibilityRole="alert" style={{ width: Math.min(width - 32, 420) }}>
            <Frame
              bg={toast.tone === 'warn' ? c.warnBg : c.card}
              border={toast.tone === 'warn' ? c.warn : c.border}
              innerStyle={{ paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <Txt weight="bold" color={toast.tone === 'warn' ? c.warnStrong : c.ink}>
                {toast.text}
              </Txt>
            </Frame>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});

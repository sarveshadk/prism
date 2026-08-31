import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icon';
import { useStore } from './store';
import {
  CAN_BLUR,
  PRESS_TRANSITION,
  ROW_INSET,
  TAB_BAR_HEIGHT,
  THEME_TRANSITION,
  hairline,
  radius,
  space,
  tabular,
  type,
  useTheme,
} from './theme';

export { useTheme } from './theme';
export { space, radius, type, tabular, hairline, CAN_BLUR } from './theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export function Screen({
  children,
  onRefresh,
  refreshing,
  style,
  contentContainerStyle,
  scrollable = true,
}: {
  children?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  scrollable?: boolean;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 44) + 12;

  if (!scrollable) {
    return (
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: c.bg,
            paddingTop: topPadding,
            paddingBottom: TAB_BAR_HEIGHT + insets.bottom,
          },
          THEME_TRANSITION,
          style,
        ]}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.ScrollView
      style={[{ flex: 1, backgroundColor: c.bg }, THEME_TRANSITION, style]}
      contentContainerStyle={[
        {
          paddingTop: topPadding,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.lg,
          gap: space.md,
        },
        contentContainerStyle,
      ]}
      indicatorStyle={c.indicator}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={c.coral}
            colors={[c.coral]}
          />
        ) : undefined
      }
    >
      {children}
    </Animated.ScrollView>
  );
}

/** Header matching Figma ce */
export function Header({
  title,
  subtitle,
  onBack,
  right,
  showToggle = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  showToggle?: boolean;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: space.lg,
        paddingTop: space.sm,
        paddingBottom: space.md,
      }}
    >
      {onBack ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
          hitSlop={12}
          style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' }}
        >
          <Icon name="chevronLeft" size={22} color={c.textSub} />
        </Pressable>
      ) : subtitle ? (
        <View>
          <Text style={[type.overline, { color: c.textMuted }]}>{subtitle}</Text>
          <Text style={[type.displaySmall, { color: c.text, marginTop: 2 }]}>{title}</Text>
        </View>
      ) : (
        <Text style={[type.displaySmall, { color: c.text }]}>{title}</Text>
      )}

      {onBack && <Text style={[type.displaySmall, { color: c.text }]}>{title}</Text>}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {showToggle && <ThemeToggle />}
        {right}
        {!showToggle && !right && onBack && <View style={{ width: 36 }} />}
      </View>
    </View>
  );
}

/** Card / Surface matching Figma 16px/20px radius cards */
export function Card({
  children,
  style,
  variant = 'card',
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'card' | 'cardLg' | 'elevated';
}) {
  const c = useTheme();
  const cardRadius = variant === 'cardLg' ? radius.cardLg : radius.card;
  const bg = variant === 'elevated' ? c.elevated : c.surface;

  return (
    <Animated.View
      style={[
        THEME_TRANSITION,
        {
          backgroundColor: bg,
          borderRadius: cardRadius,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function Surface({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <Card style={style}>{children}</Card>;
}

/** Badge / Pill Status (e.g. "Device ready · No network required") */
export function StatusPill({
  text,
  status = 'success',
  dotOnly = false,
}: {
  text: string;
  status?: 'success' | 'warning' | 'coral' | 'muted';
  dotOnly?: boolean;
}) {
  const c = useTheme();
  const dotColor =
    status === 'success'
      ? c.success
      : status === 'warning'
        ? c.warning
        : status === 'coral'
          ? c.coral
          : c.textMuted;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radius.badge,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        marginHorizontal: space.lg,
      }}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: dotColor,
        }}
      />
      {!dotOnly && (
        <Text style={[type.callout, { color: c.textSub, fontWeight: '400' }]}>{text}</Text>
      )}
    </View>
  );
}

/** Pill Segment Control matching Figma le */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly { id: T; label: string }[] | readonly T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const c = useTheme();

  const formatted = options.map((opt) =>
    typeof opt === 'string' ? { id: opt as T, label: opt } : opt
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: space.sm,
        paddingHorizontal: space.lg,
      }}
    >
      {formatted.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            disabled={disabled}
            onPress={() => {
              if (!active) {
                Haptics.selectionAsync();
                onChange(opt.id);
              }
            }}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 7,
              borderRadius: radius.pill,
              backgroundColor: active ? c.coral : c.surface,
              borderWidth: 1,
              borderColor: active ? c.coral : c.border,
            }}
          >
            <Text
              style={[
                type.footnote,
                {
                  color: active ? '#FFFFFF' : c.textSub,
                  fontWeight: active ? '500' : '400',
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Primary Action Button matching Figma */
export function Btn({
  label,
  onPress,
  tone = 'primary',
  disabled,
  loading,
  haptic = 'light',
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'plain' | 'warm' | 'elevated' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  haptic?: 'light' | 'none' | 'success';
  style?: ViewStyle;
  icon?: IconName;
}) {
  const c = useTheme();
  const [pressed, setPressed] = useState(false);

  const bg =
    tone === 'primary' || tone === 'warm'
      ? c.coral
      : tone === 'danger'
        ? c.error
        : tone === 'elevated'
          ? c.elevated
          : 'transparent';

  const fg = tone === 'plain' || tone === 'elevated' ? c.text : '#FFFFFF';

  return (
    <Pressable
      onPress={() => {
        if (haptic === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (haptic === 'light') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled || loading}
      style={[{ alignSelf: 'stretch' }, style]}
    >
      <Animated.View
        style={[
          PRESS_TRANSITION,
          {
            height: 48,
            borderRadius: radius.pill,
            backgroundColor: bg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            opacity: disabled ? 0.4 : 1,
            transform: [{ scale: pressed && !disabled && !loading ? 0.98 : 1 }],
          },
        ]}
      >
        {icon && !loading && <Icon name={icon} size={18} color={fg} />}
        <Text style={[type.subheadBold, { color: fg, opacity: loading ? 0 : 1 }]}>{label}</Text>
        {loading && (
          <ActivityIndicator
            style={StyleSheet.absoluteFill}
            color={fg}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

/** ThemeToggle matching Figma ae */
export function ThemeToggle({
  dark,
  onChange,
}: {
  dark?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const c = useTheme();
  const isDark = dark ?? c.scheme === 'dark';
  const patch = useStore((s) => s.patch);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onChange) {
      onChange(!isDark);
    } else {
      patch({ themePref: isDark ? 'Light' : 'Dark' });
    }
  };

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel="Toggle light/dark mode"
      style={{
        width: 50,
        height: 26,
        borderRadius: radius.pill,
        backgroundColor: c.surface,
        borderWidth: 1.5,
        borderColor: c.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        position: 'relative',
      }}
    >
      <View style={{ position: 'absolute', left: 6 }}>
        <Icon name="sun" size={12} color={isDark ? c.textMuted : c.coral} />
      </View>
      <View style={{ position: 'absolute', right: 6 }}>
        <Icon name="moon" size={11} color={isDark ? c.coral : c.textMuted} />
      </View>
      <Animated.View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: c.coral,
          transform: [{ translateX: isDark ? 22 : 0 }],
        }}
      />
    </Pressable>
  );
}

/** Progress Bar matching Figma */
export function ProgressBar({ value, done }: { value: number; done?: boolean }) {
  const c = useTheme();
  const clamped = Math.min(100, Math.max(0, value * 100));

  return (
    <View
      style={{
        height: 5,
        borderRadius: radius.pill,
        backgroundColor: c.elevated,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: done ? c.success : c.coral,
        }}
      />
    </View>
  );
}

/** List container with rows */
export function List({
  header,
  footer,
  children,
}: {
  header?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const c = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={{ gap: space.xs, marginHorizontal: space.lg }}>
      {header ? (
        <Text
          style={[
            type.overline,
            {
              color: c.textMuted,
              paddingLeft: 4,
              marginBottom: 4,
            },
          ]}
        >
          {header}
        </Text>
      ) : null}
      <Card>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? (
              <View style={{ height: 1, backgroundColor: c.border, marginLeft: ROW_INSET }} />
            ) : null}
            {row}
          </View>
        ))}
      </Card>
      {footer ? (
        <Text style={[type.caption, { color: c.textMuted, paddingLeft: 4, marginTop: 4 }]}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function Row({
  label,
  value,
  detail,
  icon,
  accessory,
  onPress,
  tone,
  last,
}: {
  label: string;
  value?: string;
  detail?: string;
  icon?: IconName;
  accessory?: React.ReactNode;
  onPress?: () => void;
  tone?: string;
  last?: boolean;
}) {
  const c = useTheme();

  const body = (
    <View
      style={{
        minHeight: 48,
        paddingHorizontal: space.base,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
      }}
    >
      {icon ? <Icon name={icon} size={20} color={tone ?? c.coral} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.bodyMedium, { color: tone ?? c.text }]}>{label}</Text>
        {detail ? <Text style={[type.caption, { color: c.textMuted }]}>{detail}</Text> : null}
      </View>
      {value ? (
        <Text style={[type.callout, tabular, { color: c.textSub }]}>{value}</Text>
      ) : null}
      {accessory}
      {onPress && !accessory ? <Icon name="chevron" size={16} color={c.textMuted} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  );
}

export function ToggleRow({
  label,
  detail,
  value,
  onChange,
  disabled,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        minHeight: 48,
        paddingHorizontal: space.base,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.md,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.bodyMedium, { color: c.text }]}>{label}</Text>
        {detail ? <Text style={[type.caption, { color: c.textMuted }]}>{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        trackColor={{ true: c.coral, false: c.elevated }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={c.elevated}
        onValueChange={(v) => {
          Haptics.selectionAsync();
          onChange(v);
        }}
      />
    </View>
  );
}

export function StepperRow({
  label,
  value,
  step,
  min,
  max,
  suffix = '',
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const c = useTheme();
  const bump = (d: number) => {
    const next = Math.max(min, Math.min(max, value + d));
    if (next === value) return;
    Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View
      style={{
        minHeight: 48,
        paddingHorizontal: space.base,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.md,
      }}
    >
      <Text style={[type.bodyMedium, { color: c.text, flex: 1 }]}>{label}</Text>
      <Text style={[type.callout, tabular, { color: c.textSub, marginRight: 8 }]}>
        {value}
        {suffix}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: c.elevated,
          borderRadius: radius.pill,
          overflow: 'hidden',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Pressable
          onPress={() => bump(-step)}
          disabled={disabled || value <= min}
          style={{ width: 36, height: 30, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 16, color: c.text, fontWeight: '600' }}>−</Text>
        </Pressable>
        <View style={{ width: 1, backgroundColor: c.border }} />
        <Pressable
          onPress={() => bump(step)}
          disabled={disabled || value >= max}
          style={{ width: 36, height: 30, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 16, color: c.text, fontWeight: '600' }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Metric({
  value,
  label,
  sub,
  tone,
}: {
  value: string;
  label: string;
  sub?: string;
  tone?: string;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: radius.card,
        paddingHorizontal: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={[type.headline, tabular, { color: tone ?? c.coral, fontSize: 16, textAlign: 'center' }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {value}
      </Text>
      <Text
        style={[type.caption, { color: c.textSub, marginTop: 3, textAlign: 'center', fontSize: 11 }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {sub ? (
        <Text
          style={[type.caption, { color: c.textMuted, fontSize: 10, textAlign: 'center', marginTop: 1 }]}
          numberOfLines={1}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function Metrics({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: space.sm,
        marginHorizontal: space.lg,
      }}
    >
      {children}
    </View>
  );
}

export function Note({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const c = useTheme();
  return (
    <Text style={[type.caption, { color: tone ?? c.textMuted, marginHorizontal: space.lg, lineHeight: 18 }]}>
      {children}
    </Text>
  );
}

export function Field({ children }: { children: React.ReactNode }) {
  return <View style={{ marginHorizontal: space.lg, gap: space.md }}>{children}</View>;
}

export function Cluster({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {React.Children.map(children, (ch, i) => (
        <View key={i} style={{ flex: 1 }}>
          {ch}
        </View>
      ))}
    </View>
  );
}

export function Pending({ label }: { label?: string }) {
  const c = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.md,
      }}
    >
      <ActivityIndicator color={c.coral} size="large" />
      {label ? <Text style={[type.footnote, { color: c.textSub }]}>{label}</Text> : null}
    </View>
  );
}

export const fmtBytes = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(2)} MB`;

export const fmtRate = (bps: number) =>
  bps < 1024 ? `${bps.toFixed(0)} B/s` : `${(bps / 1024).toFixed(1)} KB/s`;


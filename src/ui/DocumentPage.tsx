import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const STATUS_BAR_HEIGHT = StatusBar.currentHeight ?? 24;

export function Section({
  header,
  isFirst,
  children,
}: {
  header: string;
  isFirst?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, isFirst && styles.sectionFirst]}>
      <Text style={styles.sectionHeader}>{header}</Text>
      {children}
    </View>
  );
}

export function Para({ children }: { children: string }) {
  return <Text style={styles.para}>{children}</Text>;
}

export function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  children: React.ReactNode;
}

export function DocumentPage({ visible, onDismiss, title, children }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const isDismissing = useRef(false);

  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      translateY.setValue(SCREEN_HEIGHT);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const dismiss = () => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(onDismiss);
  };

  // PanResponder captures dismiss from initial render. dismiss() only accesses
  // refs (isDismissing, translateY) and onDismiss — a stable setState wrapper.
  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && g.dy > 0,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          dismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View
          style={[styles.handleArea, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}
          {...handlePan.panHandlers}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
          <View style={styles.bottomPad} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0d1117',
  },
  handleArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    minHeight: 56,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(201, 209, 217, 0.25)',
    marginBottom: 16,
  },
  title: {
    alignSelf: 'flex-start',
    color: '#c9d1d9',
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  section: {
    marginTop: 28,
  },
  sectionFirst: {
    marginTop: 8,
  },
  sectionHeader: {
    color: '#D97757',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  para: {
    color: '#c9d1d9',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 4,
  },
  bulletDot: {
    color: '#D97757',
    fontSize: 14,
    lineHeight: 22,
    marginRight: 10,
    width: 12,
  },
  bulletText: {
    color: '#c9d1d9',
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  bottomPad: {
    height: 40,
  },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DistanceUnitSection } from './settings/DistanceUnitSection';
import { NotificationsSection } from './settings/NotificationsSection';
import { CategoryFiltersSection } from './settings/CategoryFiltersSection';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const HALF_HEIGHT = SCREEN_HEIGHT * 0.5;
const EXPAND_SCROLL_THRESHOLD = 130; // scrollY ~40% into half-sheet triggers expansion
const STATUS_BAR_HEIGHT = StatusBar.currentHeight ?? 24;

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function SettingsSheet({ visible, onDismiss }: Props) {
  const sheetHeight = useRef(new Animated.Value(HALF_HEIGHT)).current;
  const translateY = useRef(new Animated.Value(HALF_HEIGHT)).current;
  const isExpandedRef = useRef(false);
  const isDismissing = useRef(false);
  // Mirrors isExpandedRef for rendering — ref drives scroll logic, state drives layout
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      isExpandedRef.current = false;
      setIsExpanded(false);
      sheetHeight.setValue(HALF_HEIGHT);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    } else {
      sheetHeight.setValue(HALF_HEIGHT);
    }
  }, [visible, translateY, sheetHeight]);

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

  // Expansion is one-way: scroll past threshold → full-screen. There is no
  // auto-collapse back to half-height. The height animation itself generates
  // synthetic scroll events (the ScrollView reports near-zero contentOffset
  // when its container grows) that would immediately trigger spurious collapse —
  // a feedback loop. Auto-collapse is also unusual UX for a bottom sheet.
  // Dismissal is exclusively via swipe-down on the drag handle.
  // If round-trip behavior is reintroduced in the future, it must use
  // onScrollEndDrag with velocity checks to distinguish user-initiated scrolls
  // from layout-triggered events — not a timing hack.
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (!isExpandedRef.current && y > EXPAND_SCROLL_THRESHOLD) {
      isExpandedRef.current = true;
      setIsExpanded(true);
      Animated.timing(sheetHeight, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  };

  // PanResponder only on the drag handle — swipe-down to dismiss
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
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={dismiss} />

      {/*
        Outer sheet: transform: translateY animations only (slide-in, swipe-dismiss,
        pan gesture spring-back). All animations on this view use useNativeDriver: true.
        Do NOT add JS-driven animations here — once a view runs a native-driver animation
        the entire view node is native-owned, and any JS-driven animation targeting it
        will crash with "node has been moved to native."
      */}
      <Animated.View
        style={[styles.sheetOuter, { transform: [{ translateY }] }]}
      >
        {/*
          Inner sheet: height animation only (50% → full-screen expansion on scroll).
          Uses useNativeDriver: false because height is a layout property that cannot
          be animated on the native thread. Kept in a separate view node from the outer
          sheet to avoid the native-vs-JS driver conflict documented above.
        */}
        <Animated.View style={[styles.sheetInner, { height: sheetHeight }]}>
        {/*
          Touch zone is intentionally larger than the visible drag handle pill.
          Users should be able to initiate swipe-down dismiss from anywhere in the
          top region of the sheet, not just on the small visible pill. When the sheet
          is full-screen, paddingTop is increased by STATUS_BAR_HEIGHT to push the
          handle below Android's swipe-from-top notification shade gesture region —
          preventing conflict between dismiss and system gesture.
        */}
        <View
          style={[styles.handleArea, isExpanded && { paddingTop: STATUS_BAR_HEIGHT }]}
          {...handlePan.panHandlers}
        >
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Settings</Text>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <DistanceUnitSection />
          <NotificationsSection />
          <CategoryFiltersSection />
          {/* Future sections added here */}
          <View style={styles.bottomPadding} />
        </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheetOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetInner: {
    backgroundColor: 'rgba(13, 17, 23, 0.97)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleArea: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
    minHeight: 56,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(201, 209, 217, 0.25)',
    marginBottom: 12,
  },
  sheetTitle: {
    alignSelf: 'flex-start',
    color: '#c9d1d9',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  bottomPadding: {
    height: 24, // home-bar clearance
  },
});

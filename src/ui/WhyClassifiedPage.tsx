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

function Section({
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

function Para({ children }: { children: string }) {
  return <Text style={styles.para}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
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
}

export function WhyClassifiedPage({ visible, onDismiss }: Props) {
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
  // refs (isDismissing, translateY) and onDismiss — the latter is always
  // () => setWhyClassifiedOpen(false), a stable setState wrapper.
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
        {/* Handle area — touch zone is full-width and tall; STATUS_BAR_HEIGHT
            inset pushes handle below Android's swipe-from-top gesture region */}
        <View
          style={[styles.handleArea, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}
          {...handlePan.panHandlers}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>How Periphery classifies devices</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Section isFirst header="What Periphery sees">
            <Para>
              Every Bluetooth-capable device near you announces itself with brief wireless
              broadcasts. These broadcasts include manufacturer data, device names, service
              identifiers, and signal strength. Periphery reads these public broadcasts —
              the same ones any phone or laptop in your space can read.
            </Para>
            <Para>
              Periphery does NOT decrypt private communication, access device contents,
              intercept network traffic, or do anything beyond what your phone's Bluetooth
              radio is already listening to.
            </Para>
          </Section>

          <Section header="How Periphery classifies what it sees">
            <Para>Different categories of devices broadcast in different ways:</Para>
            <Bullet>
              Phones broadcast Apple Continuity packets, Google Fast Pair identifiers, or
              platform-specific manufacturer codes that identify them as iPhones, Android
              phones, or specific models.
            </Bullet>
            <Bullet>
              Earbuds broadcast their own discoverable signatures — AirPods, Galaxy Buds,
              and similar products advertise their model number and connection state.
            </Bullet>
            <Bullet>
              Camera-equipped wearables (smart glasses, body cameras, certain earbuds with
              cameras) broadcast manufacturer data containing camera-model bytes that
              identify their recording capability.
            </Bullet>
            <Bullet>
              Smart speakers and home assistants advertise their hardware model through
              service UUIDs and manufacturer codes specific to each brand.
            </Bullet>
            <Bullet>
              Trackers (AirTags, Tile, Chipolo, SmartThings tags) broadcast identifiers
              specific to their tracking ecosystem.
            </Bullet>
          </Section>

          <Section header="What Periphery is honest about">
            <Para>
              Bluetooth signals can travel through walls. Periphery cannot reliably tell
              you whether a device is in your space or in a neighbor's space. Future
              versions will add wall-detection logic that uses signal attenuation patterns
              to estimate this — but v1 reports devices it can hear, not devices it can
              prove are with you.
            </Para>
            <Para>
              Distance estimates from Bluetooth signal strength are approximate by physics.
              Walls, bodies, and electromagnetic noise all affect signal strength. The
              detection radius and device positions on Periphery's map are best estimates,
              not measurements. Bearings shown on the map are not measured — they are
              illustrative placement within the detection radius.
            </Para>
            <Para>
              Modern devices rotate their Bluetooth identifiers frequently for privacy.
              Periphery sometimes counts the same device twice if its identifier changes
              during the observation window. Device counts are honest summaries of what the
              radio heard, not exact device counts.
            </Para>
            <Para>
              Camera-equipped wearables are emphasized in Periphery's interface because
              they are the most consequential category for bystander awareness. The other
              categories are surfaced for completeness, not to suggest they pose equivalent
              recording risk.
            </Para>
          </Section>

          <Section header="Why this matters">
            <Para>
              The case Periphery makes is simple: you have always had the right to know
              what is recording you in physical space. That right is older than recording
              technology itself. Periphery uses public information already broadcast by
              devices around you to honor that right calmly and accurately.
            </Para>
          </Section>

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

import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const REPO_COPY =
  'The Periphery source code is published under the AGPL-3.0 license and will be available at github.com/periphery-scanner/periphery before public launch. Inspect, modify, and contribute.';

interface NavigationRowProps {
  label: string;
  onPress: () => void;
}

function NavigationRow({ label, onPress }: NavigationRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowDimmed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={styles.linkLabel}>{label}</Text>
      <Text style={styles.linkChevron}>›</Text>
    </Pressable>
  );
}

interface PlaceholderRowProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onCollapse: () => void;
  copy: string;
}

function PlaceholderRow({ label, isOpen, onToggle, onCollapse, copy }: PlaceholderRowProps) {
  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.linkRow,
          (isOpen || pressed) && styles.linkRowDimmed,
        ]}
        onPress={onToggle}
        accessibilityRole="button"
      >
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkChevron}>{isOpen ? '‹' : '›'}</Text>
      </Pressable>
      {isOpen && (
        <View style={styles.expandedContent}>
          <Text style={styles.comingSoonText}>{copy}</Text>
          <Pressable onPress={onCollapse} style={styles.gotItButton}>
            <Text style={styles.gotItLabel}>Got it</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

interface Props {
  onOpenPrivacy: () => void;
  onOpenTos: () => void;
}

export function AboutSection({ onOpenPrivacy, onOpenTos }: Props) {
  const [repoOpen, setRepoOpen] = useState(false);
  const [showEmailFallback, setShowEmailFallback] = useState(false);

  // "Send feedback" diverges from the other rows intentionally.
  // Those rows navigate to document pages or expand inline — consistent UX for
  // their content type. This row attempts immediate action (mailto: link)
  // because single-tap feedback is the goal. The inline email fallback only
  // surfaces when no mail client is configured.
  const handleFeedback = async () => {
    try {
      // Update this address when Periphery has a permanent domain.
      // Currently routes to peripheryapp@gmail.com (created May 2026).
      await Linking.openURL('mailto:peripheryapp@gmail.com');
    } catch {
      setShowEmailFallback(true);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.header}>ABOUT</Text>

      <View style={styles.brandBlock}>
        <Text style={styles.wordmark}>PERIPHERY</Text>
        <Text style={styles.tagline}>Restoring the right to know.</Text>
        <Text style={styles.taglineSecondary}>What's around you, made visible.</Text>
        <Text style={styles.mission}>
          Periphery surfaces the recording-capable devices around you — smart glasses,
          camera wearables, and connected devices — so you're never without context
          about your environment.
        </Text>
        <Text style={styles.versionLine}>© 2026 Periphery · v1.0.0</Text>
      </View>

      <View style={styles.separator} />

      <NavigationRow label="Privacy Policy" onPress={onOpenPrivacy} />
      <NavigationRow label="Terms of Service" onPress={onOpenTos} />

      <PlaceholderRow
        label="Open-Source Repository"
        isOpen={repoOpen}
        onToggle={() => setRepoOpen((prev) => !prev)}
        onCollapse={() => setRepoOpen(false)}
        copy={REPO_COPY}
      />

      <Pressable
        style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowDimmed]}
        onPress={handleFeedback}
        accessibilityRole="button"
        accessibilityLabel="Send feedback"
      >
        <Text style={styles.linkLabel}>Send feedback</Text>
        <Text style={styles.linkChevron}>›</Text>
      </Pressable>

      {showEmailFallback && (
        <Text selectable style={styles.emailFallback}>
          Email us: peripheryapp@gmail.com
        </Text>
      )}

      <View style={styles.bottomPadding} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    color: '#6a7480',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  brandBlock: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  wordmark: {
    color: '#D97757',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 5,
    marginBottom: 8,
  },
  tagline: {
    color: '#8b949e',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  taglineSecondary: {
    color: '#6a7480',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  mission: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 14,
  },
  versionLine: {
    color: '#4a5260',
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 4,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  linkRowDimmed: {
    opacity: 0.5,
  },
  linkLabel: {
    color: '#c9d1d9',
    fontSize: 14,
    flex: 1,
  },
  linkChevron: {
    color: '#6a7480',
    fontSize: 16,
  },
  expandedContent: {
    paddingBottom: 14,
    paddingTop: 4,
  },
  comingSoonText: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 19,
  },
  gotItButton: {
    paddingTop: 10,
    alignSelf: 'flex-start',
  },
  gotItLabel: {
    color: '#6a7480',
    fontSize: 12,
  },
  emailFallback: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  bottomPadding: {
    height: 24,
  },
});

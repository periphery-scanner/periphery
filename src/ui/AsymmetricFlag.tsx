import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  onPress: () => void;
}

export function AsymmetricFlag({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Smart glasses detected nearby. Tap for details."
    >
      <Text style={styles.text}>
        Smart glasses detected nearby — you may be being recorded.
      </Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1515',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  pressed: {
    opacity: 0.65,
  },
  text: {
    color: '#e87070',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  chevron: {
    color: '#e87070',
    fontSize: 20,
    opacity: 0.6,
    marginLeft: 8,
  },
});

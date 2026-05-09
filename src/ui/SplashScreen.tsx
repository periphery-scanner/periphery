import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  onDone: () => void;
}

export function SplashScreen({ onDone }: Props) {
  useEffect(() => {
    const id = setTimeout(onDone, 1500);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <View style={styles.screen}>
      <View>
        <Text style={styles.wordmark}>PERIPHERY</Text>
        <Text style={styles.tagline}>Restoring the right to know.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 10,
  },
  wordmark: {
    color: '#D97757',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    color: '#8b949e',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

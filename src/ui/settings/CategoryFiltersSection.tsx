import React, { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';

interface CategoryMeta {
  label: string;
  color: string;
}

const CATEGORIES: Array<{ key: string } & CategoryMeta> = [
  { key: 'wearable_high', label: 'Camera wearables', color: '#D97757' },
  { key: 'home_camera',   label: 'Home cameras',     color: '#B07060' },
  { key: 'doorbell',      label: 'Smart doorbells',  color: '#B07060' },
  { key: 'speaker_mic',   label: 'Smart speakers',   color: '#B08848' },
  { key: 'vehicle',       label: 'Vehicles',         color: '#8B949E' },
  { key: 'phone',         label: 'Phones',           color: '#7CBFB0' },
  { key: 'wearable_low',  label: 'Wearables',        color: '#B8A868' },
  { key: 'tracker',       label: 'Trackers',         color: '#6080A8' },
  { key: 'earbud',        label: 'Earbuds',          color: '#7AAAC0' },
  { key: 'unknown',       label: 'Unknown',          color: '#6A7480' },
];

export function CategoryFiltersSection() {
  const disabledCategories = useSettingsStore((s) => s.disabledCategories);
  const toggleCategoryDisabled = useSettingsStore((s) => s.toggleCategoryDisabled);

  const disabledSet = useMemo(() => new Set(disabledCategories), [disabledCategories]);

  return (
    <View style={styles.section}>
      <Text style={styles.header}>DEVICE CATEGORIES</Text>
      <Text style={styles.description}>
        Hide categories you're not interested in. Hidden categories still affect the
        score — they're just not shown on the map.
      </Text>

      {CATEGORIES.map((cat) => {
        const isEnabled = !disabledSet.has(cat.key);
        return (
          <View key={cat.key} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: isEnabled ? cat.color : '#4A5260' }]} />
            <Text style={[styles.label, !isEnabled && styles.labelDisabled]}>
              {cat.label}
            </Text>
            <Switch
              value={isEnabled}
              onValueChange={() => toggleCategoryDisabled(cat.key)}
              trackColor={{ false: 'rgba(255,255,255,0.08)', true: cat.color + '88' }}
              thumbColor={isEnabled ? cat.color : '#6a7480'}
            />
          </View>
        );
      })}

      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  header: {
    color: '#6a7480',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  description: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  label: {
    flex: 1,
    color: '#c9d1d9',
    fontSize: 14,
  },
  labelDisabled: {
    color: '#4a5260',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 8,
  },
});

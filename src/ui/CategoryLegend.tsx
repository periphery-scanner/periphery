import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeviceCategory } from '../ble/types';

const LEGEND_LABELS: Record<DeviceCategory, string> = {
  phone:         'Phones',
  earbud:        'Earbuds',
  wearable_low:  'Wearables',
  wearable_high: 'Camera wearables',
  doorbell:      'Doorbells',
  home_camera:   'Cameras',
  speaker_mic:   'Speakers',
  vehicle:       'Vehicles',
  tracker:       'Trackers',
  unknown:       'Unknown',
};

const CATEGORY_COLORS: Record<DeviceCategory, string> = {
  phone:         '#7CBFB0',
  earbud:        '#7AAAC0',
  wearable_low:  '#B8A868',
  wearable_high: '#D97757',
  doorbell:      '#B07060',
  home_camera:   '#B07060',
  speaker_mic:   '#B08848',
  vehicle:       '#8B949E',
  tracker:       '#6080A8',
  unknown:       '#6A7480',
};

const DESATURATED_DOT = '#4A5260';

interface Props {
  detectedCategories: DeviceCategory[];
  desaturated: Set<DeviceCategory>;
  onToggle: (category: DeviceCategory) => void;
}

export function CategoryLegend({ detectedCategories, desaturated, onToggle }: Props) {
  if (detectedCategories.length === 0) return null;

  return (
    <View style={styles.container}>
      {detectedCategories.map((cat) => {
        const isDim = desaturated.has(cat);
        return (
          <Pressable
            key={cat}
            style={styles.row}
            onPress={() => onToggle(cat)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !isDim }}
            accessibilityLabel={`${LEGEND_LABELS[cat]}, ${isDim ? 'hidden on map' : 'visible on map'}`}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: isDim ? DESATURATED_DOT : CATEGORY_COLORS[cat] },
              ]}
            />
            <Text style={[styles.label, isDim && styles.labelDim]}>
              {LEGEND_LABELS[cat]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(13, 17, 23, 0.78)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  label: {
    color: '#c9d1d9',
    fontSize: 12,
  },
  labelDim: {
    color: '#5a6270',
  },
});

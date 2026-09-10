import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  type?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

export const Badge: React.FC<BadgeProps> = ({ label, type = 'default' }) => {
  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ADE80' };
      case 'warning':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#FACC15' };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171' };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' };
      case 'purple':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#C084FC' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#CBD5E1' };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

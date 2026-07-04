import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from '../common';
import theme from '../../theme';

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  location: string;
  price: string;
  image?: string;
  category?: string;
  onPress?: () => void;
  variant?: 'horizontal' | 'vertical';
}

const EventCard: React.FC<EventCardProps> = ({
  title,
  date,
  location,
  price,
  image = '🎪',
  category,
  onPress,
  variant = 'vertical',
}) => {
  if (variant === 'horizontal') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card style={styles.horizontalCard}>
          <View style={styles.horizontalContent}>
            <View style={styles.horizontalImage}>
              <Text style={styles.horizontalEmoji}>{image}</Text>
            </View>
            <View style={styles.horizontalInfo}>
              <Text variant="h4" style={styles.horizontalTitle} numberOfLines={2}>
                {title}
              </Text>
              <Text variant="caption" color="textSecondary" style={styles.horizontalDate}>
                {date}
              </Text>
              <Text variant="caption" color="textSecondary" style={styles.horizontalLocation}>
                {location}
              </Text>
              <View style={styles.horizontalMeta}>
                {category && (
                  <Text variant="caption" style={styles.categoryBadge}>
                    {category}
                  </Text>
                )}
                <Text variant="label" color="primary" style={styles.horizontalPrice}>
                  {price}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.verticalCard}>
        <View style={styles.verticalImage}>
          <Text style={styles.verticalEmoji}>{image}</Text>
        </View>
        <View style={styles.verticalInfo}>
          <Text variant="h4" style={styles.verticalTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.verticalDate}>
            {date}
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.verticalLocation}>
            {location}
          </Text>
          <View style={styles.verticalMeta}>
            {category && (
              <Text variant="caption" style={styles.categoryBadge}>
                {category}
              </Text>
            )}
            <Text variant="label" color="primary" style={styles.verticalPrice}>
              {price}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  horizontalCard: {
    marginBottom: theme.spacing.md,
  },
  horizontalContent: {
    flexDirection: 'row',
  },
  horizontalImage: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  horizontalEmoji: {
    fontSize: 36,
  },
  horizontalInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  horizontalTitle: {
    marginBottom: theme.spacing.xs,
  },
  horizontalDate: {
    marginBottom: theme.spacing.xs,
  },
  horizontalLocation: {
    marginBottom: theme.spacing.sm,
  },
  horizontalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horizontalPrice: {
    fontWeight: '600',
  },
  verticalCard: {
    marginRight: theme.spacing.md,
    width: 200,
  },
  verticalImage: {
    height: 120,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  verticalEmoji: {
    fontSize: 48,
  },
  verticalInfo: {
    flex: 1,
  },
  verticalTitle: {
    marginBottom: theme.spacing.xs,
  },
  verticalDate: {
    marginBottom: theme.spacing.xs,
  },
  verticalLocation: {
    marginBottom: theme.spacing.sm,
  },
  verticalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verticalPrice: {
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
});

export default EventCard;

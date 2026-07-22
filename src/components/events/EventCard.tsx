import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from '../common';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useTheme } from '../../theme/ThemeContext';
import { EventBusyIcon } from '../common/Icons';

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
  image,
  category,
  onPress,
  variant = 'vertical',
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (variant === 'horizontal') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card style={styles.horizontalCard}>
          <View style={styles.horizontalContent}>
            <View style={styles.horizontalImage}>
              {image ? (
                <Text style={styles.horizontalEmoji}>{image}</Text>
              ) : (
                <EventBusyIcon color={colors.textSecondary} size={36} />
              )}
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
          {image ? (
            <Text style={styles.verticalEmoji}>{image}</Text>
          ) : (
            <EventBusyIcon color={colors.textSecondary} size={48} />
          )}
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

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  horizontalCard: {
    marginBottom: spacing.md,
  },
  horizontalContent: {
    flexDirection: 'row',
  },
  horizontalImage: {
    width: 80,
    height: 80,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  horizontalEmoji: {
    fontSize: 36,
  },
  horizontalInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  horizontalTitle: {
    marginBottom: spacing.xs,
  },
  horizontalDate: {
    marginBottom: spacing.xs,
  },
  horizontalLocation: {
    marginBottom: spacing.sm,
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
    marginRight: spacing.md,
    width: 200,
  },
  verticalImage: {
    height: 120,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  verticalEmoji: {
    fontSize: 48,
  },
  verticalInfo: {
    flex: 1,
  },
  verticalTitle: {
    marginBottom: spacing.xs,
  },
  verticalDate: {
    marginBottom: spacing.xs,
  },
  verticalLocation: {
    marginBottom: spacing.sm,
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
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
});

export default EventCard;

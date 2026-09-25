import React from 'react';
import { View, StyleSheet } from 'react-native';
import Card from './Card';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';

const EventCardSkeleton: React.FC = () => {
  return (
    <Card style={styles.card}>
      <Skeleton width="100%" height={120} variant="rect" style={styles.image} />
      <Skeleton width="80%" height={20} style={styles.title} />
      <Skeleton width="60%" height={16} style={styles.date} />
      <Skeleton width="50%" height={16} style={styles.location} />
      <View style={styles.footer}>
        <Skeleton width={60} height={16} style={styles.price} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  image: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  date: {
    marginBottom: spacing.xs,
  },
  location: {
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  price: {
    alignSelf: 'flex-end',
  },
});

export default EventCardSkeleton;

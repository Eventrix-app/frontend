import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { MOCK_NOTIFICATIONS } from '../../data/mockEvents';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const TYPE_ICONS: Record<string, string> = {
  reminder: '⏰',
  booking: '🎫',
  reel: '🎬',
  update: '📢',
};

const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markRead}>Mark all</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 32 }} />
          )
        }
      />

      {unreadCount > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, !item.read && styles.cardUnread]}
            activeOpacity={0.8}
            onPress={() =>
              setItems((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
              )
            }
          >
            <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
              <Text style={styles.icon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !item.read && styles.titleUnread]}>
                  {item.title}
                </Text>
                {!item.read ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  markRead: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandPink,
  },
  banner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(244,51,98,0.08)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.brandPink,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardUnread: {
    borderColor: 'rgba(244,51,98,0.2)',
    backgroundColor: '#FFFAFB',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: 'rgba(244,51,98,0.1)',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandPink,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: colors.placeholder,
    marginTop: spacing.sm,
  },
});

export default NotificationsScreen;

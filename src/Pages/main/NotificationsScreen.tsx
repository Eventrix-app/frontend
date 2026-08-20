import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  type NotificationRecord,
} from '../../store/services/notificationsApi';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import SimpleListSkeleton from '../../components/common/SimpleListSkeleton';
import { MegaphoneIcon, TicketIcon, WalletIcon, NotificationBell, HeartIcon, ChatIcon, IconProps } from '../../components/common/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const TYPE_ICONS: Record<string, React.FC<IconProps>> = {
  event_changed: MegaphoneIcon,
  waitlist_promoted: TicketIcon,
  refund_status: WalletIcon,
  short_liked: HeartIcon,
  short_commented: ChatIcon,
};

function formatTimeAgo(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { data: items = [], isLoading } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const markAllRead = () => {
    markAllReadMutation();
  };

  const unreadCount = items.filter((n) => !n.readAt).length;

  // Rows carry the same payload the push does, so tapping one lands where the push tap
  // would. Only the reel kinds route today — the rest still just mark read, as before.
  const openNotification = (item: NotificationRecord) => {
    const shortId = typeof item.payload?.shortId === 'string' ? item.payload.shortId : undefined;
    if ((item.type === 'short_liked' || item.type === 'short_commented') && shortId) {
      navigation.navigate('Main', {
        screen: 'Shorts',
        params: { shortId, openComments: item.type === 'short_commented' },
      });
    }
  };

  // Reachable directly via a push-notification tap with no data payload (see
  // navigateForPushData in RootNavigator.tsx), which can land here as the first screen in
  // the stack — goBack() throws "GO_BACK was not handled" with nothing to pop to.
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Notifications"
        onBack={handleGoBack}
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

      {isLoading ? (
        <SimpleListSkeleton showLeadingCircle />
      ) : (
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>No notifications yet.</Text>
        ) : null}
        {items.map((item) => {
          const isRead = !!item.readAt;
          return (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, !isRead && styles.cardUnread]}
            activeOpacity={0.8}
            onPress={() => {
              if (!isRead) markRead(item.id);
              openNotification(item);
            }}
          >
            <View style={[styles.iconWrap, !isRead && styles.iconWrapUnread]}>
              {(() => {
                const TypeIcon = TYPE_ICONS[item.type];
                return TypeIcon ? (
                  <TypeIcon color={colors.brandPink} size={20} />
                ) : (
                  <NotificationBell color={colors.brandPink} size={20} />
                );
              })()}
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !isRead && styles.titleUnread]}>
                  {item.title}
                </Text>
                {!isRead ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  markRead: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandPink,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xxl,
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
    fontSize: 13,
    color: colors.text,
    flex: 1,
      fontFamily: 'ZalandoSansExpanded_500Medium'
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

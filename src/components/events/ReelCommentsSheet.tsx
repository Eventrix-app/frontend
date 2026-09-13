import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useKeyboardShift } from '../../hooks/useKeyboardShift';
import { useSelector } from 'react-redux';
import HalfScreenModal from '../common/halfscreenmodal';
import { Text } from '../common/Text';
import { PersonIcon } from '../common/Icons';
import SimpleListSkeleton from '../common/SimpleListSkeleton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import type { RootState } from '../../store';
import {
  ShortComment,
  useGetShortCommentsQuery,
  useAddShortCommentMutation,
  useDeleteShortCommentMutation,
} from '../../store/services/shortsApi';
import { showConfirm } from '../../utils/crossPlatformAlert';

type Props = {
  visible: boolean;
  shortId: string | null;
  /** The reel's uploader — they can remove comments on their own reel, not just their own. */
  uploaderUserId?: string;
  onClose: () => void;
};

const MAX_LENGTH = 1000;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

/**
 * The comment thread for a reel.
 *
 * Reads oldest-first, matching the server's ordering — a thread reads top to bottom, and a
 * reply posted after the comment it answers has to appear below it.
 */
export const ReelCommentsSheet: React.FC<Props> = ({ visible, shortId, uploaderUserId, onClose }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [draft, setDraft] = useState('');
  // Only need the boolean here — HalfScreenModal already handles the actual keyboard-clearing
  // shift. This just adds a bit of extra breathing room above the keyboard once it's up, so
  // the composer isn't sitting flush against it.
  const { keyboardVisible } = useKeyboardShift();

  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // skip while closed, and while there is no reel selected — opening the Shorts tab must not
  // fire a comments request for a sheet the user has not asked for.
  const { data, isLoading, isError, refetch } = useGetShortCommentsQuery(
    { shortId: shortId ?? '' },
    { skip: !visible || !shortId },
  );
  const [addComment, { isLoading: isPosting }] = useAddShortCommentMutation();
  const [deleteComment] = useDeleteShortCommentMutation();

  const comments = data?.comments ?? [];

  const handlePost = useCallback(async () => {
    const body = draft.trim();
    if (!body || !shortId || isPosting) return;
    // Cleared optimistically so the field is ready for the next comment immediately. On
    // failure the text is put back rather than lost — retyping a comment you already wrote
    // is the worst possible outcome of a flaky connection.
    setDraft('');
    try {
      await addComment({ shortId, body }).unwrap();
    } catch {
      setDraft(body);
    }
  }, [addComment, draft, isPosting, shortId]);

  const handleDelete = useCallback(
    (comment: ShortComment) => {
      if (!shortId) return;
      showConfirm('Delete comment?', 'This cannot be undone.', () => {
        deleteComment({ commentId: comment.id, shortId });
      });
    },
    [deleteComment, shortId],
  );

  const renderItem = useCallback(
    ({ item }: { item: ShortComment }) => {
      // Shown for your own comments, and to the reel's owner for anyone's — a creator needs
      // to be able to clear abuse off their own reel without waiting on moderation.
      const canDelete = item.userId === currentUserId || uploaderUserId === currentUserId;

      return (
        <View style={styles.row}>
          {item.user?.profilePictureUrl ? (
            <Image source={{ uri: item.user.profilePictureUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <PersonIcon color={colors.textSecondary} size={16} />
            </View>
          )}

          <View style={styles.rowBody}>
            <View style={styles.rowHeader}>
              <Text style={styles.author} numberOfLines={1}>
                {item.user?.fullName ?? 'Eventrix user'}
              </Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
          </View>

          {canDelete ? (
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={10}>
              <Text style={styles.delete}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    },
    [colors.textSecondary, currentUserId, handleDelete, styles, uploaderUserId],
  );

  return (
    <HalfScreenModal visible={visible} onClose={onClose} heightPercent={0.75}>
      <View style={styles.root}>
        <Text style={styles.title}>
          {data ? `${data.total} comment${data.total === 1 ? '' : 's'}` : 'Comments'}
        </Text>

        {isLoading ? (
          <SimpleListSkeleton count={5} showLeadingCircle />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Couldn't load comments.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No comments yet. Be the first.</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.listContainer}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        {isAuthenticated ? (
          // No transform here — HalfScreenModal lifts the whole sheet clear of the keyboard
          // (its default liftOnKeyboard behavior) now, so the composer just sits in its
          // normal flex position. The composer-only-shift approach this used to have relied
          // on a second, independent keyboard listener that didn't reliably fire for an input
          // living inside this Modal, leaving the composer stuck under the keyboard with no
          // shift ever applied — invisible, not just clipped.
          <View style={[styles.composer, keyboardVisible && styles.composerRaised]}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a comment..."
              placeholderTextColor={colors.placeholder}
              maxLength={MAX_LENGTH}
              multiline
            />
            <TouchableOpacity
              onPress={handlePost}
              disabled={!draft.trim() || isPosting}
              style={[styles.postBtn, (!draft.trim() || isPosting) && styles.postBtnDisabled]}
            >
              {isPosting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.postLabel}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.signedOut}>Sign in to join the conversation.</Text>
        )}
      </View>
    </HalfScreenModal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.md },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  // Without an explicit flex, the FlatList doesn't reliably claim the space between the
  // title and the composer — it can end up far shorter than the sheet, leaving the composer
  // sitting much higher than intended instead of pinned to the bottom.
  listContainer: { flex: 1 },
  list: { paddingBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, alignItems: 'flex-start' },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1 },
  time: { fontSize: 11, color: colors.textSecondary },
  body: { fontSize: 14, color: colors.text },
  delete: { fontSize: 12, fontWeight: '600', color: colors.error },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  // Extra clearance above the keyboard so the composer doesn't sit flush against it.
  composerRaised: { marginBottom: spacing.xxl },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  postBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.4 },
  postLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  signedOut: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});

export default ReelCommentsSheet;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import HalfScreenModal from './halfscreenmodal';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { listDriveImages, type DriveImage } from '../../services/googleDriveService';
import { extractErrorMessage } from '../../utils/apiError';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (file: DriveImage) => void;
}

const COLUMNS = 3;

/**
 * Grid of the signed-in account's Drive images.
 *
 * Deliberately a first-class picker rather than a hand-off to the OS file browser: the app
 * has no document-picker dependency, and routing through one would land the user in a
 * generic "Files" UI where Drive is only one of several providers. This opens straight onto
 * their Drive photos, which is what the option promises.
 *
 * The list is fetched only while the sheet is open — the Drive scope prompt must never
 * appear because a screen mounted.
 */
const GoogleDrivePickerModal: React.FC<Props> = ({ visible, onClose, onSelect }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [files, setFiles] = useState<DriveImage[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pageToken?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await listDriveImages(pageToken);
      // Appending vs replacing is decided by whether this is a paged call, so the same
      // function serves the first load, a retry, and "load more".
      setFiles((prev) => (pageToken ? [...prev, ...page.files] : page.files));
      setNextPageToken(page.nextPageToken);
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Could not read your Google Drive.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Reset on every open: a stale grid from a previous session would be showing thumbnails
    // whose Google-signed URLs have since expired.
    setFiles([]);
    setNextPageToken(undefined);
    load();
  }, [visible, load]);

  const handleEndReached = useCallback(() => {
    if (isLoading || !nextPageToken) return;
    load(nextPageToken);
  }, [isLoading, load, nextPageToken]);

  const renderItem = useCallback(
    ({ item }: { item: DriveImage }) => (
      <TouchableOpacity style={styles.tile} onPress={() => onSelect(item)} activeOpacity={0.75}>
        {item.thumbnailLink ? (
          <Image source={{ uri: item.thumbnailLink }} style={styles.thumb} contentFit="cover" transition={120} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Feather name="image" size={20} color={colors.textSecondary} />
          </View>
        )}
        <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.tileName}>
          {item.name}
        </Text>
      </TouchableOpacity>
    ),
    [colors.textSecondary, onSelect, styles],
  );

  return (
    <HalfScreenModal visible={visible} onClose={onClose} heightPercent={0.75}>
      <View style={styles.header}>
        <Text variant="h4" color="text">Google Drive</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Feather name="x" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text variant="body" color="textSecondary" style={styles.centeredText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text variant="button" color="white">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading && files.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brandPink} />
        </View>
      ) : files.length === 0 ? (
        <View style={styles.centered}>
          <Text variant="body" color="textSecondary" style={styles.centeredText}>
            No images found in your Google Drive.
          </Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          renderItem={renderItem}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoading && files.length > 0 ? <ActivityIndicator color={colors.brandPink} style={styles.footerLoader} /> : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </HalfScreenModal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  centeredText: { textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  grid: { padding: spacing.md, gap: spacing.sm },
  row: { gap: spacing.sm },
  tile: { flex: 1 / COLUMNS, gap: 4 },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: borderRadius.md, backgroundColor: colors.muted },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  tileName: { fontSize: 11 },
  footerLoader: { marginVertical: spacing.md },
});

export default GoogleDrivePickerModal;

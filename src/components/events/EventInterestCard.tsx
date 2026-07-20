import React, { useRef, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAddFavoriteMutation, useGetMyFavoritesQuery, useRemoveFavoriteMutation } from '../../store/services/eventsApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';

// Extend your real event type/mock data with these optional fields as the
// API/schema fills them in. Falls back to placeholder copy until then.
export interface InterestEvent {
  id: string;
  title: string;
  image: any;
  price: number | string;
  venue: string;
  category?: string;
  organizer?: string;
  time?: string;
  date?: string;
  distanceKm?: string;
  attendeesAvailable?: number;
}

interface Props {
  event: InterestEvent;
  width?: number;
  onPress: () => void;
  // Called instead of the save mutation when a logged-out user taps the bookmark — the
  // card doesn't own navigation (every screen that renders it does), so it hands the
  // "go to login" decision back up rather than reaching for useNavigation() itself.
  onRequireAuth?: () => void;
}

// event.image may be a require()'d local asset (number) or a real backend URL (string) —
// <Image source> needs a {uri} wrapper for the latter, a bare string isn't a valid source.
const resolveImageSource = (image: unknown) => {
  if (!image) return undefined;
  if (typeof image === 'string') return { uri: image };
  return image as any;
};

// react-native-svg's <Image>/require() can't decode a real vector SVG on native platforms
// (Android/iOS) — only SvgXml renders these correctly, so the markup is inlined as raw
// strings rather than require()'d from assets/events/*.svg.
const AVAILABLE_SEATS_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.70954 9.17032C7.74644 9.2269 7.76737 9.2924 7.77012 9.35989C7.77287 9.42738 7.75734 9.49437 7.72517 9.55376C7.693 9.61316 7.64538 9.66276 7.58735 9.69733C7.52932 9.7319 7.46302 9.75016 7.39548 9.75016H0.479538C0.411989 9.75016 0.345697 9.7319 0.287665 9.69733C0.229632 9.66276 0.182015 9.61316 0.149845 9.55376C0.117674 9.49437 0.102144 9.42738 0.104895 9.35989C0.107646 9.2924 0.128577 9.2269 0.165475 9.17032C0.693338 8.3578 1.46977 7.73774 2.37891 7.40266C1.87632 7.06807 1.49474 6.58061 1.29062 6.01238C1.08649 5.44414 1.07064 4.8253 1.24542 4.24737C1.42021 3.66943 1.77634 3.16309 2.26115 2.80321C2.74596 2.44333 3.33372 2.24902 3.93751 2.24902C4.54129 2.24902 5.12905 2.44333 5.61386 2.80321C6.09868 3.16309 6.45481 3.66943 6.62959 4.24737C6.80437 4.8253 6.78853 5.44414 6.5844 6.01238C6.38027 6.58061 5.99869 7.06807 5.4961 7.40266C6.40524 7.73774 7.18168 8.3578 7.70954 9.17032ZM11.8303 9.16329C11.3023 8.35419 10.5276 7.7368 9.6211 7.40266C10.2144 7.00299 10.6332 6.39223 10.7921 5.6947C10.951 4.99718 10.8381 4.26531 10.4764 3.64808C10.1147 3.03085 9.53139 2.57465 8.8452 2.37233C8.15901 2.17002 7.42151 2.23679 6.78282 2.55907C6.7584 2.57168 6.73705 2.58951 6.72028 2.61128C6.70351 2.63306 6.69173 2.65826 6.68578 2.6851C6.67984 2.71193 6.67986 2.73975 6.68585 2.76657C6.69185 2.79339 6.70367 2.81857 6.72048 2.84032C7.1954 3.43273 7.46815 4.16165 7.49876 4.92031C7.52939 5.67897 7.31627 6.4275 6.89063 7.05626C6.86312 7.09735 6.85296 7.14764 6.86235 7.19619C6.87174 7.24474 6.89994 7.28761 6.94079 7.31548C7.49574 7.70279 7.97081 8.19347 8.34001 8.76063C8.4889 8.98866 8.54972 9.26308 8.5111 9.53266C8.50675 9.55948 8.50829 9.58692 8.51559 9.61309C8.5229 9.63925 8.5358 9.66352 8.55341 9.68421C8.57102 9.70489 8.59292 9.7215 8.61758 9.73289C8.64225 9.74428 8.66909 9.75018 8.69626 9.75016H11.5228C11.6054 9.75019 11.6857 9.72296 11.7512 9.6727C11.8167 9.62244 11.8638 9.55196 11.8852 9.4722C11.8982 9.41974 11.9001 9.36513 11.8906 9.31191C11.8812 9.25869 11.8606 9.20805 11.8303 9.16329Z" fill="white"/></svg>`;
const DISTANCE_BADGE_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 0.75C4.90636 0.751241 3.85787 1.18624 3.08455 1.95955C2.31124 2.73287 1.87624 3.78136 1.875 4.875C1.875 8.40469 5.625 11.0705 5.78484 11.182C5.8479 11.2262 5.92302 11.2499 6 11.2499C6.07698 11.2499 6.1521 11.2262 6.21516 11.182C6.375 11.0705 10.125 8.40469 10.125 4.875C10.1238 3.78136 9.68876 2.73287 8.91545 1.95955C8.14213 1.18624 7.09364 0.751241 6 0.75ZM6 3.375C6.29667 3.375 6.58668 3.46297 6.83335 3.6278C7.08003 3.79262 7.27229 4.02689 7.38582 4.30097C7.49935 4.57506 7.52906 4.87666 7.47118 5.16764C7.4133 5.45861 7.27044 5.72588 7.06066 5.93566C6.85088 6.14544 6.58361 6.2883 6.29264 6.34618C6.00166 6.40406 5.70006 6.37435 5.42597 6.26082C5.15189 6.14729 4.91762 5.95503 4.7528 5.70835C4.58797 5.46168 4.5 5.17167 4.5 4.875C4.5 4.47718 4.65804 4.09564 4.93934 3.81434C5.22064 3.53304 5.60218 3.375 6 3.375Z" fill="white"/></svg>`;
const VENUE_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1C6.54182 1.00165 5.14383 1.58165 4.11274 2.61274C3.08165 3.64383 2.50165 5.04182 2.5 6.5C2.5 11.2063 7.5 14.7606 7.71313 14.9094C7.7972 14.9683 7.89735 14.9999 8 14.9999C8.10265 14.9999 8.2028 14.9683 8.28687 14.9094C8.5 14.7606 13.5 11.2063 13.5 6.5C13.4983 5.04182 12.9184 3.64383 11.8873 2.61274C10.8562 1.58165 9.45818 1.00165 8 1ZM8 4.5C8.39556 4.5 8.78224 4.6173 9.11114 4.83706C9.44004 5.05682 9.69638 5.36918 9.84776 5.73463C9.99913 6.10009 10.0387 6.50222 9.96157 6.89018C9.8844 7.27814 9.69392 7.63451 9.41421 7.91421C9.13451 8.19392 8.77814 8.3844 8.39018 8.46157C8.00222 8.53874 7.60009 8.49913 7.23463 8.34776C6.86918 8.19638 6.55682 7.94004 6.33706 7.61114C6.1173 7.28224 6 6.89556 6 6.5C6 5.96957 6.21071 5.46086 6.58579 5.08579C6.96086 4.71071 7.46957 4.5 8 4.5Z" fill="#F43362"/></svg>`;
const EVENT_DATE_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2H11.5V1.5C11.5 1.36739 11.4473 1.24021 11.3536 1.14645C11.2598 1.05268 11.1326 1 11 1C10.8674 1 10.7402 1.05268 10.6464 1.14645C10.5527 1.24021 10.5 1.36739 10.5 1.5V2H5.5V1.5C5.5 1.36739 5.44732 1.24021 5.35355 1.14645C5.25979 1.05268 5.13261 1 5 1C4.86739 1 4.74021 1.05268 4.64645 1.14645C4.55268 1.24021 4.5 1.36739 4.5 1.5V2H3C2.73478 2 2.48043 2.10536 2.29289 2.29289C2.10536 2.48043 2 2.73478 2 3V13C2 13.2652 2.10536 13.5196 2.29289 13.7071C2.48043 13.8946 2.73478 14 3 14H13C13.2652 14 13.5196 13.8946 13.7071 13.7071C13.8946 13.5196 14 13.2652 14 13V3C14 2.73478 13.8946 2.48043 13.7071 2.29289C13.5196 2.10536 13.2652 2 13 2ZM8 10.5C7.80222 10.5 7.60888 10.4414 7.44443 10.3315C7.27998 10.2216 7.15181 10.0654 7.07612 9.88268C7.00043 9.69996 6.98063 9.49889 7.01921 9.30491C7.0578 9.11093 7.15304 8.93275 7.29289 8.79289C7.43275 8.65304 7.61093 8.5578 7.80491 8.51921C7.99889 8.48063 8.19996 8.50043 8.38268 8.57612C8.56541 8.65181 8.72159 8.77998 8.83147 8.94443C8.94135 9.10888 9 9.30222 9 9.5C9 9.76522 8.89464 10.0196 8.70711 10.2071C8.51957 10.3946 8.26522 10.5 8 10.5ZM13 5H3V3H4.5V3.5C4.5 3.63261 4.55268 3.75979 4.64645 3.85355C4.74021 3.94732 4.86739 4 5 4C5.13261 4 5.25979 3.94732 5.35355 3.85355C5.44732 3.75979 5.5 3.63261 5.5 3.5V3H10.5V3.5C10.5 3.63261 10.5527 3.75979 10.6464 3.85355C10.7402 3.94732 10.8674 4 11 4C11.1326 4 11.2598 3.94732 11.3536 3.85355C11.4473 3.75979 11.5 3.63261 11.5 3.5V3H13V5Z" fill="#F43362"/></svg>`;
const EVENT_TIME_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5C6.71442 1.5 5.45772 1.88122 4.3888 2.59545C3.31988 3.30968 2.48676 4.32484 1.99479 5.51256C1.50282 6.70028 1.37409 8.00721 1.6249 9.26809C1.8757 10.529 2.49477 11.6872 3.40381 12.5962C4.31285 13.5052 5.47104 14.1243 6.73192 14.3751C7.99279 14.6259 9.29973 14.4972 10.4874 14.0052C11.6752 13.5132 12.6903 12.6801 13.4046 11.6112C14.1188 10.5423 14.5 9.28558 14.5 8C14.4982 6.27665 13.8128 4.62441 12.5942 3.40582C11.3756 2.18722 9.72335 1.50182 8 1.5ZM11.5 8.5H8C7.86739 8.5 7.74022 8.44732 7.64645 8.35355C7.55268 8.25979 7.5 8.13261 7.5 8V4.5C7.5 4.36739 7.55268 4.24021 7.64645 4.14645C7.74022 4.05268 7.86739 4 8 4C8.13261 4 8.25979 4.05268 8.35356 4.14645C8.44732 4.24021 8.5 4.36739 8.5 4.5V7.5H11.5C11.6326 7.5 11.7598 7.55268 11.8536 7.64645C11.9473 7.74021 12 7.86739 12 8C12 8.13261 11.9473 8.25979 11.8536 8.35355C11.7598 8.44732 11.6326 8.5 11.5 8.5Z" fill="#F43362"/></svg>`;
const ORGANIZER_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.75 7.5C10.75 8.0439 10.5887 8.57558 10.2865 9.02782C9.98437 9.48005 9.55488 9.83253 9.05238 10.0407C8.54989 10.2488 7.99695 10.3033 7.4635 10.1972C6.93006 10.0911 6.44005 9.82914 6.05546 9.44454C5.67086 9.05995 5.40895 8.56995 5.30284 8.0365C5.19673 7.50305 5.25119 6.95012 5.45933 6.44762C5.66748 5.94512 6.01995 5.51563 6.47218 5.21346C6.92442 4.91128 7.4561 4.75 8 4.75C8.72909 4.75083 9.42809 5.04082 9.94363 5.55637C10.4592 6.07192 10.7492 6.77091 10.75 7.5ZM14.5 8C14.5 9.28558 14.1188 10.5423 13.4046 11.6112C12.6903 12.6801 11.6752 13.5132 10.4874 14.0052C9.29973 14.4972 7.99279 14.6259 6.73192 14.3751C5.47104 14.1243 4.31285 13.5052 3.40381 12.5962C2.49477 11.6872 1.8757 10.529 1.6249 9.26809C1.37409 8.00721 1.50282 6.70028 1.99479 5.51256C2.48676 4.32484 3.31988 3.30968 4.3888 2.59545C5.45772 1.88122 6.71442 1.5 8 1.5C9.72335 1.50182 11.3756 2.18722 12.5942 3.40582C13.8128 4.62441 14.4982 6.27665 14.5 8ZM13.5 8C13.4992 7.25971 13.3491 6.52718 13.0587 5.84622C12.7683 5.16527 12.3436 4.54987 11.8099 4.03683C11.2762 3.5238 10.6445 3.12366 9.95264 2.86035C9.26075 2.59704 8.52287 2.47597 7.78313 2.50437C4.83938 2.61812 2.49188 5.07 2.5 8.01562C2.50283 9.35658 2.99739 10.6499 3.89 11.6506C4.25352 11.1234 4.71528 10.6712 5.25 10.3188C5.29559 10.2886 5.34979 10.2743 5.40431 10.2779C5.45883 10.2815 5.51066 10.3029 5.55188 10.3387C6.23136 10.9265 7.09973 11.2499 7.99813 11.2499C8.89652 11.2499 9.76489 10.9265 10.4444 10.3387C10.4856 10.3029 10.5374 10.2815 10.5919 10.2779C10.6465 10.2743 10.7007 10.2886 10.7463 10.3188C11.2817 10.671 11.7441 11.1232 12.1081 11.6506C13.0052 10.6463 13.5007 9.34662 13.5 8Z" fill="#F43362"/></svg>`;
// Sourced from assets/events/bookmark.svg / bookmark-check.svg, re-filled to match this
// card's existing icon accent (#F43362, same as VENUE/ORGANIZER/etc. above) for the saved
// state, and a neutral gray for the unsaved state — the original files' own fills
// (#e3e3e3 / #D3E2F1) are near-invisible against this button's white circular background.
const BOOKMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#9CA3AF"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>`;
const BOOKMARK_CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#F43362"><path d="m438-400 198-198-57-56-141 141-57-57-57 57 114 113ZM200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>`;

export const EventInterestCard: React.FC<Props> = ({ event, width, onPress, onRequireAuth }) => {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { data: favorites = [] } = useGetMyFavoritesQuery(undefined, { skip: !authUser });
  const [addFavorite] = useAddFavoriteMutation();
  const [removeFavorite] = useRemoveFavoriteMutation();

  // getMyFavorites only refetches after addFavorite/removeFavorite invalidates it — a
  // round trip that would otherwise flash the bookmark back to its old state for a moment
  // after the request finishes (the same flicker fixed for follow/unfollow). Since
  // getMyFavorites returns full Event objects we don't have here (event is the lighter
  // card-shaped InterestEvent), a local override is simpler and safer than optimistically
  // splicing an incomplete object into that shared cache — SavedEventsScreen depends on
  // every field being real. Cleared once the server-confirmed value matches our guess.
  const [pendingSaved, setPendingSaved] = useState<boolean | null>(null);
  const serverSaved = favorites.some((f) => f.id === event.id);
  const saved = pendingSaved ?? serverSaved;
  if (pendingSaved !== null && serverSaved === pendingSaved) {
    setPendingSaved(null);
  }

  const isTogglingRef = useRef(false);

  const handleToggleSave = async () => {
    if (!authUser) {
      onRequireAuth?.();
      return;
    }
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    const next = !saved;
    setPendingSaved(next);
    try {
      if (next) {
        await addFavorite(event.id).unwrap();
      } else {
        await removeFavorite(event.id).unwrap();
      }
    } catch (e: any) {
      setPendingSaved(!next);
      showAlert('Error', extractErrorMessage(e, 'Failed to update saved events'));
    } finally {
      isTogglingRef.current = false;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : undefined]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.imageWrap}>
        <Image source={resolveImageSource(event.image)} style={styles.image} resizeMode="cover" />

        <View style={styles.topLeftCol}>
          {event.attendeesAvailable != null && (
            <View style={styles.badge}>
              <SvgXml xml={AVAILABLE_SEATS_SVG} width={12} height={12} />
              <Text style={styles.badgeText}>{event.attendeesAvailable} seats available</Text>
            </View>
          )}
          {event.distanceKm ? (
            <View style={styles.badge}>
              <SvgXml xml={DISTANCE_BADGE_SVG} width={12} height={12} />
              <Text style={styles.badgeText}>{event.distanceKm}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.heartBtn} onPress={handleToggleSave} hitSlop={8}>
          <SvgXml xml={saved ? BOOKMARK_CHECK_SVG : BOOKMARK_SVG} width={14} height={14} />
        </TouchableOpacity>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceText}>{event.price}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.category}>{event.category ?? 'Category Name'}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <SvgXml xml={VENUE_SVG} width={14} height={14} />
            <Text style={styles.metaText} numberOfLines={1}>{event.venue}</Text>
          </View>
          <View style={styles.metaItem}>
            <SvgXml xml={ORGANIZER_SVG} width={14} height={14} />
            <Text style={styles.metaText} numberOfLines={1}>{event.organizer ?? 'Organizer name'}</Text>
          </View>
        </View>
        {event.date ? (
          <View style={styles.metaItem}>
            <SvgXml xml={EVENT_DATE_SVG} width={14} height={14} />
            <Text style={styles.timeText}>{event.date}</Text>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <SvgXml xml={EVENT_TIME_SVG} width={14} height={14} />
          <Text style={styles.timeText}>{event.time ?? '1:30 - 14:30 (IST)'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 18,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topLeftCol: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  heartBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  priceText: {
    color: colors.brandPink,
    fontWeight: '700',
    fontSize: 15,
  },
  info: {
    padding: spacing.md,
    paddingTop: spacing.xs,
  },
  category: {
    color: colors.brandPink,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: spacing.sm,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    flexShrink: 1,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary ?? '#777',
    flexShrink: 1,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary ?? '#777',
  },
});

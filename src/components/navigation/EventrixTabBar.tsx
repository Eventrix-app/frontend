import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';

// Inlined as raw markup (same pattern as the icons in HomeScreen.tsx) instead of importing
// the .svg files directly: RN's Image can't decode raw SVG on Android/iOS (only a browser's
// <img> renders it natively), which was making these tab icons invisible on real devices.
const HOUSE_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5603 10.189L13.0603 2.68899C12.779 2.4079 12.3977 2.25 12 2.25C11.6023 2.25 11.221 2.4079 10.9397 2.68899L3.43969 10.189C3.29972 10.3279 3.18878 10.4933 3.11329 10.6755C3.03781 10.8577 2.9993 11.053 3 11.2502V20.2502C3 20.4492 3.07902 20.6399 3.21967 20.7806C3.36032 20.9212 3.55109 21.0002 3.75 21.0002H9.75C9.94891 21.0002 10.1397 20.9212 10.2803 20.7806C10.421 20.6399 10.5 20.4492 10.5 20.2502V15.0002H13.5V20.2502C13.5 20.4492 13.579 20.6399 13.7197 20.7806C13.8603 20.9212 14.0511 21.0002 14.25 21.0002H20.25C20.4489 21.0002 20.6397 20.9212 20.7803 20.7806C20.921 20.6399 21 20.4492 21 20.2502V11.2502C21.0007 11.053 20.9622 10.8577 20.8867 10.6755C20.8112 10.4933 20.7003 10.3279 20.5603 10.189ZM19.5 19.5002H15V14.2502C15 14.0513 14.921 13.8606 14.7803 13.7199C14.6397 13.5793 14.4489 13.5002 14.25 13.5002H9.75C9.55109 13.5002 9.36032 13.5793 9.21967 13.7199C9.07902 13.8606 9 14.0513 9 14.2502V19.5002H4.5V11.2502L12 3.75024L19.5 11.2502V19.5002Z" fill="#57534E"/></svg>';
const SHAPES_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.71156 5.76281C6.6618 5.61344 6.5663 5.48352 6.43859 5.39145C6.31088 5.29938 6.15743 5.24984 5.99999 5.24984C5.84256 5.24984 5.68911 5.29938 5.5614 5.39145C5.43369 5.48352 5.33819 5.61344 5.28843 5.76281L1.53843 17.0128C1.50085 17.1256 1.49059 17.2456 1.50852 17.3631C1.52644 17.4806 1.57203 17.5921 1.64152 17.6886C1.71101 17.785 1.80242 17.8635 1.90821 17.9176C2.014 17.9718 2.13115 18 2.24999 18H9.74999C9.86884 18 9.98599 17.9718 10.0918 17.9176C10.1976 17.8635 10.289 17.785 10.3585 17.6886C10.428 17.5921 10.4735 17.4806 10.4915 17.3631C10.5094 17.2456 10.4991 17.1256 10.4616 17.0128L6.71156 5.76281ZM3.29062 16.5L5.99999 8.37188L8.70937 16.5H3.29062ZM19.5 7.125C19.5 6.16082 19.2141 5.21829 18.6784 4.4166C18.1427 3.61491 17.3814 2.99007 16.4906 2.62109C15.5998 2.25211 14.6196 2.15557 13.6739 2.34367C12.7283 2.53178 11.8596 2.99608 11.1778 3.67786C10.4961 4.35964 10.0318 5.22828 9.84367 6.17394C9.65556 7.11959 9.7521 8.09979 10.1211 8.99058C10.4901 9.88137 11.1149 10.6427 11.9166 11.1784C12.7183 11.7141 13.6608 12 14.625 12C15.9175 11.9985 17.1566 11.4844 18.0705 10.5705C18.9844 9.65659 19.4985 8.41748 19.5 7.125ZM11.25 7.125C11.25 6.45749 11.4479 5.80497 11.8188 5.24995C12.1896 4.69494 12.7167 4.26235 13.3334 4.00691C13.9501 3.75146 14.6287 3.68463 15.2834 3.81485C15.9381 3.94508 16.5395 4.26651 17.0115 4.73852C17.4835 5.21052 17.8049 5.81189 17.9351 6.46657C18.0654 7.12126 17.9985 7.79986 17.7431 8.41656C17.4876 9.03326 17.0551 9.56036 16.5 9.93121C15.945 10.3021 15.2925 10.5 14.625 10.5C13.7299 10.5 12.8714 10.1444 12.2385 9.51149C11.6056 8.87855 11.25 8.02011 11.25 7.125ZM21 13.5H12.75C12.5511 13.5 12.3603 13.579 12.2197 13.7197C12.079 13.8603 12 14.0511 12 14.25V19.5C12 19.6989 12.079 19.8897 12.2197 20.0303C12.3603 20.171 12.5511 20.25 12.75 20.25H21C21.1989 20.25 21.3897 20.171 21.5303 20.0303C21.671 19.8897 21.75 19.6989 21.75 19.5V14.25C21.75 14.0511 21.671 13.8603 21.5303 13.7197C21.3897 13.579 21.1989 13.5 21 13.5ZM20.25 18.75H13.5V15H20.25V18.75Z" fill="#57534E"/></svg>';
const PLAY_CIRCLE_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.25C10.0716 2.25 8.18657 2.82183 6.58319 3.89317C4.97982 4.96451 3.73013 6.48726 2.99218 8.26884C2.25422 10.0504 2.06114 12.0108 2.43735 13.9021C2.81355 15.7934 3.74215 17.5307 5.10571 18.8943C6.46928 20.2579 8.20656 21.1865 10.0979 21.5627C11.9892 21.9389 13.9496 21.7458 15.7312 21.0078C17.5127 20.2699 19.0355 19.0202 20.1068 17.4168C21.1782 15.8134 21.75 13.9284 21.75 12C21.7473 9.41498 20.7192 6.93661 18.8913 5.10872C17.0634 3.28084 14.585 2.25273 12 2.25ZM12 20.25C10.3683 20.25 8.77326 19.7661 7.41655 18.8596C6.05984 17.9531 5.00242 16.6646 4.378 15.1571C3.75358 13.6496 3.5902 11.9908 3.90853 10.3905C4.22685 8.79016 5.01259 7.32015 6.16637 6.16637C7.32016 5.01259 8.79017 4.22685 10.3905 3.90852C11.9909 3.59019 13.6497 3.75357 15.1571 4.37799C16.6646 5.00242 17.9531 6.05984 18.8596 7.41655C19.7661 8.77325 20.25 10.3683 20.25 12C20.2475 14.1873 19.3775 16.2843 17.8309 17.8309C16.2843 19.3775 14.1873 20.2475 12 20.25ZM16.5225 11.3644L10.5225 7.61438C10.409 7.54344 10.2786 7.50416 10.1448 7.50063C10.011 7.4971 9.87868 7.52945 9.76159 7.5943C9.64451 7.65916 9.54691 7.75416 9.47893 7.86946C9.41096 7.98476 9.37507 8.11615 9.375 8.25V15.75C9.37507 15.8838 9.41096 16.0152 9.47893 16.1305C9.54691 16.2458 9.64451 16.3408 9.76159 16.4057C9.87868 16.4706 10.011 16.5029 10.1448 16.4994C10.2786 16.4958 10.409 16.4566 10.5225 16.3856L16.5225 12.6356C16.6302 12.5682 16.719 12.4745 16.7806 12.3633C16.8421 12.2521 16.8744 12.1271 16.8744 12C16.8744 11.8729 16.8421 11.7479 16.7806 11.6367C16.719 11.5255 16.6302 11.4318 16.5225 11.3644ZM10.875 14.3972V9.60281L14.7103 12L10.875 14.3972Z" fill="#57534E"/></svg>';
const TICKET_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.75 9.75C21.9489 9.75 22.1397 9.67098 22.2803 9.53033C22.421 9.38968 22.5 9.19891 22.5 9V6C22.5 5.60218 22.342 5.22064 22.0607 4.93934C21.7794 4.65804 21.3978 4.5 21 4.5H3C2.60218 4.5 2.22064 4.65804 1.93934 4.93934C1.65804 5.22064 1.5 5.60218 1.5 6V9C1.5 9.19891 1.57902 9.38968 1.71967 9.53033C1.86032 9.67098 2.05109 9.75 2.25 9.75C2.84674 9.75 3.41903 9.98705 3.84099 10.409C4.26295 10.831 4.5 11.4033 4.5 12C4.5 12.5967 4.26295 13.169 3.84099 13.591C3.41903 14.0129 2.84674 14.25 2.25 14.25C2.05109 14.25 1.86032 14.329 1.71967 14.4697C1.57902 14.6103 1.5 14.8011 1.5 15V18C1.5 18.3978 1.65804 18.7794 1.93934 19.0607C2.22064 19.342 2.60218 19.5 3 19.5H21C21.3978 19.5 21.7794 19.342 22.0607 19.0607C22.342 18.7794 22.5 18.3978 22.5 18V15C22.5 14.8011 22.421 14.6103 22.2803 14.4697C22.1397 14.329 21.9489 14.25 21.75 14.25C21.1533 14.25 20.581 14.0129 20.159 13.591C19.7371 13.169 19.5 12.5967 19.5 12C19.5 11.4033 19.7371 10.831 20.159 10.409C20.581 9.98705 21.1533 9.75 21.75 9.75ZM3 15.675C3.84772 15.5029 4.60986 15.043 5.15728 14.3732C5.70471 13.7034 6.00376 12.865 6.00376 12C6.00376 11.135 5.70471 10.2966 5.15728 9.62681C4.60986 8.95705 3.84772 8.49714 3 8.325V6H8.25V18H3V15.675ZM21 15.675V18H9.75V6H21V8.325C20.1523 8.49714 19.3901 8.95705 18.8427 9.62681C18.2953 10.2966 17.9962 11.135 17.9962 12C17.9962 12.865 18.2953 13.7034 18.8427 14.3732C19.3901 15.043 20.1523 15.5029 21 15.675Z" fill="#57534E"/></svg>';

// Swaps the SVG's baked-in fill color for the active/inactive tint — react-native-svg's
// SvgXml `color` prop only overrides elements using fill="currentColor", not a literal hex
// value like these files have, so the color has to be substituted into the markup itself.
const withFill = (xml: string, color: string) => xml.replace(/fill="#[0-9A-Fa-f]{6}"/, `fill="${color}"`);

const TABS: { name: string; label: string; icon: string }[] = [
  { name: 'Home', label: 'Home', icon: HOUSE_SVG },
  { name: 'Explore', label: 'Explore', icon: SHAPES_SVG },
  { name: 'Shorts', label: 'Shorts', icon: PLAY_CIRCLE_SVG },
  { name: 'Bookings', label: 'Bookings', icon: TICKET_SVG },
];

export const EventrixTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <View style={[styles.glass, styles.bar]}>
        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.name === route.name) ?? {
            label: route.name,
            icon: HOUSE_SVG,
          };
          const active = state.index === index;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              {active ? <View style={styles.indicator} /> : null}
              <SvgXml
                xml={withFill(tab.icon, active ? colors.brandPink : colors.stone600)}
                width={styles.icon.width}
                height={styles.icon.height}
              />
              <Text
                style={[styles.label, active ? styles.labelActive : styles.labelMuted]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  glass: {
    borderRadius: 28,
    overflow: 'hidden',
    width: '100%',
  },
  bar: {
  flexDirection: 'row',
  height: 60,
  backgroundColor: colors.white,
  // paddingTop removed — that gap now lives per-tab instead (see `tab` below)
},
tab: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  paddingHorizontal: 2,
  paddingTop: spacing.sm,   // was on `bar` — moved here so it doesn't affect the indicator's own top:0 positioning
},
indicator: {
  position: 'absolute',
  top: 0.6,               // was: 6 — a bit higher, closer to the top edge
  alignSelf: 'center',
  width: '62%',         // was: '55%' — slightly wider/more visible
  height: 4,
  backgroundColor: colors.brandPink,
  borderBottomLeftRadius: 1000,
  borderBottomRightRadius: 1000,
},
  icon: {
    width: 22,
    height: 22,
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.brandPink,
    fontWeight: '500',
  },
  labelMuted: {
    color: colors.stone600,
    fontWeight: '400',
  },
});
import React, { useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Text } from '../../components/common/Text';
import { RootStackParamList } from '../../navigation/types';
import { ColorPalette } from '../../theme/colors.light';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { SUPPORT_EMAIL, SUPPORT_PHONE, supportMailtoUrl, supportTelUrl } from '../../config/contact';
import { GRIEVANCE_OFFICER_NAME, GRIEVANCE_OFFICER_EMAIL, GRIEVANCE_ACK_SLA_HOURS, GRIEVANCE_RESOLUTION_SLA_DAYS } from '../../config/legalInfo';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpCenter'>;

type FaqItem = { question: string; answer: string };
type FaqSection = { title: string; items: FaqItem[] };

// Grounded only in behavior the app actually implements today — no invented features
// (e.g. no fixed refund SLA, no ticket-transfer claim) so this never needs walking back.
const FAQ_SECTIONS: FaqSection[] = [
  {
    title: 'Account & Login',
    items: [
      {
        question: 'How do I verify my email address?',
        answer:
          'Go to Settings → Verify Email, tap "Send Verification Code," and enter the 6-digit code sent to your email address.',
      },
      {
        question: 'I forgot my password. How do I reset it?',
        answer:
          'On the Login screen, tap "Forgot Password" and follow the steps to receive a one-time code by email and set a new password.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Go to Settings → Delete Account. This deactivates your account and signs you out immediately. Some records, such as booking and payment history, may be retained where required by law. See our Account Deletion Policy for details.',
      },
      {
        question: 'How do I permanently erase my personal data?',
        answer:
          "Go to Settings → Delete My Data. Unlike Delete Account, this erases your profile, interests, saved events, follows, and linked sign-in methods outright, not just deactivates them. You'll be asked to confirm your current password (or re-authenticate with Google/Apple/Facebook if you signed up that way) before anything is erased. Records we're legally required to keep, like completed bookings and payments, are kept but with your personal details removed from them. See our Account Deletion Policy and Data Retention Policy for the full details.",
      },
    ],
  },
  {
    title: 'Bookings & Tickets',
    items: [
      {
        question: 'Where can I find my tickets?',
        answer: 'Open the Bookings tab from the main navigation to see all your upcoming and past bookings.',
      },
      {
        question: 'Can I transfer my ticket to someone else?',
        answer: 'Ticket transfers are not currently supported. A ticket remains tied to the account that booked it.',
      },
      {
        question: 'What happens if an organizer cancels an event I booked?',
        answer:
          "You'll be notified by email and push notification. If you paid for the booking, you can request a refund from your ticket details.",
      },
    ],
  },
  {
    title: 'Payments & Refunds',
    items: [
      {
        question: 'How is my payment information handled?',
        answer:
          'Payments are processed through a secure third-party payment gateway. Eventrix never stores your full card, bank, or UPI details.',
      },
      {
        question: 'How do I request a refund?',
        answer:
          "Open the booking from My Bookings and tap \"Request Refund,\" if the event is still within its refund window. The event organizer or our team will review your request.",
      },
      {
        question: 'How will I know if my refund was approved?',
        answer:
          "You'll get a notification as soon as your refund request is approved, rejected, or processed.",
      },
    ],
  },
  {
    title: 'For Organizers',
    items: [
      {
        question: 'How do I become a verified organizer?',
        answer:
          'Go to Organizer Verification and submit your company details along with identity proof, address proof, and a PAN or Aadhaar document. Our team reviews submissions before granting verified status.',
      },
      {
        question: 'My verification was rejected. What now?',
        answer:
          "You'll see the reason for rejection in the app. Update the relevant details or documents and resubmit for review.",
      },
      {
        question: 'When do I receive payouts for my event?',
        answer:
          "Payouts are released to your registered UPI ID a few days after your event ends, minus Eventrix's platform commission. You can preview the exact commission before publishing an event.",
      },
    ],
  },
  {
    title: 'Privacy & Notifications',
    items: [
      {
        question: 'How do I control what notifications I receive?',
        answer:
          'Go to Settings to turn push and email notifications on or off, and to choose which categories of updates you want to receive.',
      },
      {
        question: 'How do I control location access?',
        answer:
          "You can grant or revoke Eventrix's access to your device's location at any time from your device's system settings.",
      },
      {
        question: 'What data does Eventrix collect about me?',
        answer: 'See our Privacy Policy, available from Settings, for a full breakdown of what we collect and why.',
      },
    ],
  },
];

const HelpCenterScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const toggle = (key: string) => setExpandedKey((prev) => (prev === key ? null : key));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Help & Support" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.groupTitle}>Contact Us</Text>
        <View style={styles.groupGlass}>
          <View style={styles.group}>
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(supportMailtoUrl())}>
              <View style={styles.contactRowText}>
                <Text style={styles.label}>Email Support</Text>
                <Text style={styles.subtitle}>{SUPPORT_EMAIL}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(supportTelUrl())}>
              <View style={styles.contactRowText}>
                <Text style={styles.label}>Call Us</Text>
                <Text style={styles.subtitle}>{SUPPORT_PHONE}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactRowLast}
              onPress={() => Linking.openURL(`mailto:${GRIEVANCE_OFFICER_EMAIL}?subject=${encodeURIComponent('Grievance')}`)}
            >
              <View style={styles.contactRowText}>
                <Text style={styles.label}>Grievance Officer</Text>
                <Text style={styles.subtitle}>{GRIEVANCE_OFFICER_NAME} · {GRIEVANCE_OFFICER_EMAIL}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.footerNote}>
          Grievances are acknowledged within {GRIEVANCE_ACK_SLA_HOURS} hours and resolved within {GRIEVANCE_RESOLUTION_SLA_DAYS} days, in line with the IT Rules, 2021.
        </Text>

        {FAQ_SECTIONS.map((section) => (
          <React.Fragment key={section.title}>
            <Text style={styles.groupTitle}>{section.title}</Text>
            <View style={styles.groupGlass}>
              <View style={styles.group}>
                {section.items.map((item, index) => {
                  const key = `${section.title}-${index}`;
                  const isOpen = expandedKey === key;
                  const isLast = index === section.items.length - 1;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.faqRow, isLast && styles.faqRowLast]}
                      onPress={() => toggle(key)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.faqQuestionRow}>
                        <Text style={styles.faqQuestion}>{item.question}</Text>
                        <Text style={[styles.chevron, isOpen && styles.chevronOpen]}>›</Text>
                      </View>
                      {isOpen ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </React.Fragment>
        ))}

        <Text style={styles.footerNote}>
          Can't find what you're looking for? Reach out to {SUPPORT_EMAIL} and we'll get back to you.
        </Text>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  groupTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    fontFamily: 'ZalandoSansExpanded_600SemiBold',
  },
  groupGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  group: {
    paddingVertical: 0,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  contactRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  contactRowText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: 'ZalandoSansExpanded_700Bold',
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
    color: colors.brandPink,
  },
  faqRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  faqRowLast: {
    borderBottomWidth: 0,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    paddingRight: spacing.md,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  faqAnswer: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  footerNote: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
  },
});

export default HelpCenterScreen;

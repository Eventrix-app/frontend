import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetInvoiceDataQuery, TaxInvoice } from '../../store/services/paymentsApi';
import { extractErrorMessage } from '../../utils/apiError';
import { formatEventDate } from '../../utils/eventCardAdapter';
import { Text } from '../../components/common/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'InvoiceDetail'>;

interface LineItem {
  label: string;
  amount: number;
}

// The server already applies the feePayer rule: under feePayer=organizer the buyer paid
// exactly the ticket price, so platformFeeAmount and gstAmount come back as 0 — they were
// genuinely not charged, not merely hidden. Rendering only non-zero lines therefore shows
// the buyer precisely what they paid for, with no client-side pricing logic of its own.
function buildLineItems(invoice: TaxInvoice): LineItem[] {
  const items: LineItem[] = [
    { label: `Ticket price (${invoice.quantity} × ₹${invoice.unitPrice.toFixed(2)})`, amount: invoice.subtotalBeforeTax - invoice.platformFeeAmount },
  ];
  if (invoice.platformFeeAmount > 0) {
    items.push({ label: 'Platform & processing fee', amount: invoice.platformFeeAmount });
  }
  if (invoice.gstAmount > 0) {
    items.push({ label: `GST (${invoice.gstRate}% on platform fee)`, amount: invoice.gstAmount });
  }
  return items;
}

const InvoiceDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { enrollmentId } = route.params;

  const { data: invoice, isLoading, isError, error, refetch } = useGetInvoiceDataQuery(enrollmentId);

  const lineItems = invoice ? buildLineItems(invoice) : [];
  const money = (amount: number) => `₹${amount.toFixed(2)}`;

  // No PDF generation yet — sharing as text keeps this useful for the common case
  // (forwarding to an employer or accountant) without a print/PDF dependency.
  const handleShare = async () => {
    if (!invoice) return;
    const body = [
      `Invoice ${invoice.invoiceNumber}`,
      invoice.eventTitle,
      `Booking ${invoice.bookingReference}`,
      '',
      ...lineItems.map((item) => `${item.label}: ${money(item.amount)}`),
      `Total paid: ${money(invoice.totalAmountPaid)}`,
    ].join('\n');
    try {
      await Share.share({ message: body });
    } catch {
      // User dismissed the share sheet, or the platform refused it — nothing to recover.
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.brandPink} />
      </View>
    );
  }

  if (isError || !invoice) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Invoice" onBack={() => navigation.goBack()} />
        <View style={[styles.center, styles.errorWrap]}>
          <Text style={styles.errorText}>{extractErrorMessage(error, "We couldn't load this invoice.")}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Invoice"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity style={styles.shareIconBtn} onPress={handleShare} hitSlop={8}>
            <Text style={styles.shareIconText}>⤴</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.invoiceHead}>
            <View style={styles.invoiceHeadCol}>
              <Text style={styles.invoiceNumberLabel}>INVOICE</Text>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.invoiceHeadColRight}>
              <Text style={styles.metaLabel}>Issued</Text>
              <Text style={styles.metaValue}>{formatEventDate(invoice.invoiceDate)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Billed To</Text>
          <Text style={styles.partyName}>{invoice.buyerName}</Text>
          <Text style={styles.partySub}>{invoice.buyerEmail}</Text>

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>From</Text>
          <Text style={styles.partyName}>{invoice.organizerName}</Text>
          {/* Omitted entirely for organizers below the GST registration threshold, rather
              than rendered as an empty field. */}
          {invoice.organizerGstin ? <Text style={styles.partySub}>GSTIN: {invoice.organizerGstin}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Booking</Text>
          <Row label="Event" value={invoice.eventTitle} styles={styles} />
          <Row label="Date" value={formatEventDate(invoice.eventDate)} styles={styles} />
          <Row label="Venue" value={invoice.venueName} styles={styles} />
          <Row label="Ticket type" value={invoice.ticketTypeName} styles={styles} />
          <Row label="Quantity" value={`${invoice.quantity}`} styles={styles} />
          <Row label="Reference" value={invoice.bookingReference} styles={styles} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Payment Breakdown</Text>

          {lineItems.map((item) => (
            <View key={item.label} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{item.label}</Text>
              <Text style={styles.lineAmount}>{money(item.amount)}</Text>
            </View>
          ))}

          {invoice.gstAmount > 0 ? (
            <>
              <View style={styles.divider} />
              <View style={styles.lineRow}>
                <Text style={styles.lineLabel}>Subtotal before tax</Text>
                <Text style={styles.lineAmount}>{money(invoice.subtotalBeforeTax)}</Text>
              </View>
            </>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total paid</Text>
            <Text style={styles.totalValue}>{money(invoice.totalAmountPaid)}</Text>
          </View>

          {invoice.platformFeeAmount === 0 ? (
            <Text style={styles.footnote}>
              Platform and payment processing fees for this booking were covered by the organizer.
            </Text>
          ) : null}
        </View>

        <Text style={styles.disclaimer}>
          This is a computer-generated invoice and does not require a signature.
        </Text>
      </ScrollView>
    </View>
  );
};

const Row: React.FC<{ label: string; value: string; styles: ReturnType<typeof createStyles> }> = ({
  label,
  value,
  styles,
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.neutralBg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.md },

    errorWrap: { paddingHorizontal: spacing.xl, gap: spacing.md },
    errorText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    retryBtn: {
      backgroundColor: colors.brandPink,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    retryText: { color: colors.white, fontSize: 14, fontWeight: '700' },

    shareIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    shareIconText: { fontSize: 18, color: colors.brandPink },

    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      ...Platform.select({
        android: { elevation: 2 },
        default: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
      }),
    },

    invoiceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    invoiceHeadCol: { flexShrink: 1 },
    invoiceHeadColRight: { alignItems: 'flex-end' },
    invoiceNumberLabel: { fontSize: 11, fontWeight: '700', color: colors.brandPink, letterSpacing: 1 },
    invoiceNumber: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 2 },
    metaLabel: { fontSize: 11, color: colors.textSecondary },
    metaValue: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 2 },

    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    sectionLabelSpaced: { marginTop: spacing.md },
    partyName: { fontSize: 14, fontWeight: '600', color: colors.text },
    partySub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: spacing.md },
    rowLabel: { fontSize: 13, color: colors.textSecondary },
    rowValue: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right' },

    lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: spacing.md },
    lineLabel: { fontSize: 13, color: colors.textSecondary, flexShrink: 1 },
    lineAmount: { fontSize: 13, fontWeight: '600', color: colors.text },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginVertical: spacing.sm,
    },

    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 15, fontWeight: '700', color: colors.brandPink },
    totalValue: { fontSize: 18, fontWeight: '700', color: colors.brandPink },

    footnote: { fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginTop: spacing.sm },
    disclaimer: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
  });

export default InvoiceDetailScreen;

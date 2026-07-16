import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthInput } from '../../components/auth/AuthInput';
import GlassSurface from '../../components/common/GlassSurface';
import { MOCK_EVENTS } from '../../data/mockEvents';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const PAYMENT_METHODS = ['UPI', 'Card', 'Wallet'];

const CheckoutScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const event = MOCK_EVENTS.find((e) => e.id === route.params.eventId) ?? MOCK_EVENTS[0];
  const [qty, setQty] = useState(1);
  const [payment, setPayment] = useState('UPI');
  const priceNum = event.price === 'Free' ? 0 : parseInt(event.price.replace(/\D/g, ''), 10) || 499;
  const total = priceNum * qty;

  const handlePay = () => {
    const totalStr = total === 0 ? 'Free' : `₹${total}`;
    navigation.navigate('PaymentConfirmation', {
      eventId: event.id,
      quantity: qty,
      total: totalStr,
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GlassSurface style={styles.headerGlass} contentStyle={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 32 }} />
      </GlassSurface>

      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassSurface style={styles.summaryGlass} contentStyle={styles.summary}>
          <Text style={styles.eventEmoji}>{event.image}</Text>
          <View style={styles.summaryText}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventMeta}>{event.date} · {event.time}</Text>
          </View>
        </GlassSurface>

        <Text style={styles.label}>Quantity</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{qty}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((q) => q + 1)}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Payment method</Text>
        <View style={styles.payRow}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              style={styles.payPillWrap}
              onPress={() => setPayment(method)}
            >
              <GlassSurface
                style={[styles.payPill, payment === method && styles.payPillActive]}
                contentStyle={styles.payPillContent}
              >
                <Text style={[styles.payPillText, payment === method && styles.payPillTextActive]}>
                  {method}
                </Text>
              </GlassSurface>
            </TouchableOpacity>
          ))}
        </View>

        {payment === 'Card' ? (
          <>
            <AuthInput placeholder="Card number" keyboardType="number-pad" />
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <AuthInput placeholder="MM/YY" />
              </View>
              <View style={{ flex: 1 }}>
                <AuthInput placeholder="CVV" secureTextEntry />
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {total === 0 ? 'Free' : `₹${total}`}
          </Text>
        </View>
      </ScrollView>

      <GlassSurface style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]} contentStyle={styles.footerContent}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
          <Text style={styles.payBtnText}>
            {total === 0 ? 'Confirm Booking' : `Pay ₹${total}`}
          </Text>
        </TouchableOpacity>
      </GlassSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  headerGlass: {
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  back: {
    fontSize: 24,
    color: colors.brandPink,
  },
  headerTitle: {
    fontSize: 18,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  scroll: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  summaryGlass: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  summary: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  eventEmoji: {
    fontSize: 40,
  },
  summaryText: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 16,
    color: colors.text,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  eventMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 20,
    color: colors.brandPink,
    fontWeight: '600',
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  payRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  payPill: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  payPillWrap: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  payPillContent: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  payPillActive: {
    borderColor: colors.brandPink,
    backgroundColor: 'rgba(244,51,98,0.14)',
  },
  payPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  payPillTextActive: {
    color: colors.brandPink,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.brandPink,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
  },
  footerContent: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  payBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CheckoutScreen;

// Ticket prices are organizer-entered, GST-exclusive amounts (TicketTypeRecord.price / DB
// column ticket_types.price). Every buyer-facing surface shows the GST-inclusive figure
// instead — the exclusive amount is never displayed on its own, so a price never appears to
// change between the ticket tab and checkout.
export const GST_RATE = 0.18;

// Flat, not a percentage — applied once per order in CheckoutScreen, not per ticket.
export const PLATFORM_FEE_INR = 9;

export function getGstInclusivePrice(basePrice: number): number {
  return Math.round(basePrice * (1 + GST_RATE));
}

// The GST portion embedded in an inclusive amount — for the breakdown line in Order
// Summary. Purely informational: it is already inside the inclusive price above and must
// never also be added to a total.
export function getGstPortion(basePrice: number): number {
  return Math.round(basePrice * GST_RATE);
}

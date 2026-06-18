// =============================================================================
//  Booking / payment reconciliation.
//
//  Shared by both payment entry points:
//    * C2B confirmation  (Safaricom posts a paybill payment)
//    * portal reconcile  (an operator records a payment manually)
//
//  Order status machine (the column names are legacy; semantics preserved):
//    full_amount   = deposit threshold that confirms ("books") the provider
//    amount_to_pay = full price that completes the job
//    status: 0 = new, 1 = deposit paid (booked), 2 = fully paid (complete)
// =============================================================================
import userRepository from "../repositories/userRepository.ts";
import { sendSms } from "./smsService.ts";

type PaymentSource = "c2b" | "portal";

interface ApplyPaymentInput {
  idNumber: string;
  userId: number | string;
  amount: number | string;
  transactionId: string;
  source: PaymentSource;
}

/**
 * Apply a payment to a customer's open booking, advancing its status and
 * notifying the relevant parties by SMS.
 * Returns `{ found: false }` when there is no open order to settle.
 */
export async function applyPayment(
  { idNumber, userId, amount, transactionId, source }: ApplyPaymentInput,
): Promise<{ found: boolean }> {
  const record = await userRepository.getOpenOrderRecord({
    id_number: idNumber,
    user_id: Number(userId),
  });
  if (!record) return { found: false };

  const paidAfter = Number(record.amount_paid) + Number(amount);
  let status = 0;
  let providerStatus = 0;
  let bookingState = "available";

  // Deposit threshold met -> provider is booked.
  if (paidAfter >= Number(record.full_amount)) {
    if (paidAfter < Number(record.amount_to_pay)) {
      const provider = await userRepository.getProviderName({ user_id: Number(userId) });
      const customer = await userRepository.getCustomerByIdNumber({ id_number: idNumber });
      if (provider && customer) {
        bookingState = "booked";
        await sendSms({
          to: provider.msisdn,
          text: `Hi ${provider.name} You have been successfully booked by ${customer.name}. You can call ${customer.msisdn} for the site directions.`,
        });
        if (source === "portal") {
          await sendSms({
            to: customer.msisdn,
            text: `Dear Customer. You have successfully booked ${provider.name}. To track their movements, please click https://play.google.com/store/apps/details?id=com.spartons.antonis or contact Smart Drill for any enquiries.`,
          });
        }
      }
    }
    status = 1;
    providerStatus = 1;
  }

  // Full price met -> job complete, provider free again.
  if (paidAfter >= Number(record.amount_to_pay)) {
    status = 2;
    providerStatus = 0;
    bookingState = "available";
    if (source === "c2b") {
      const provider = await userRepository.getProviderName({ user_id: Number(userId) });
      if (provider) {
        await sendSms({
          to: provider.msisdn,
          text: `Dear ${provider.name} Payment of KES ${amount} has been received for booking number ${record.id}. Transaction code ${transactionId}.\nThank you.`,
        });
      }
    }
  }

  await userRepository.insertDeposit({
    transaction_id: transactionId,
    msisdn: record.msisdn,
    amount: Number(amount),
    reference: idNumber,
  });
  await userRepository.updateOrderRequest({ status, amount: Number(amount), id: record.id });
  await userRepository.updateBookingAndStatus({
    status: providerStatus,
    available: bookingState,
    id: record.user_id,
  });

  return { found: true };
}

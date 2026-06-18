// =============================================================================
//  Shared domain types.
// =============================================================================

/** A row from / params for the `users` table and related lookups. */
export default interface User {
  id?: number;
  msisdn?: string;
  name?: string;
  email?: string;
  id_number?: string;
  location?: string;
  lat?: string;
  long?: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
  referred_id?: number;
  url?: string;
  available?: string;
  customer_type?: string;
  active_status?: string;
  user_id?: number;
  internal_name?: string;
  message?: string;
  status?: number;
  reference?: string;
  order_number?: string;
  transaction_id?: string;
  amount_to_pay?: number;
  amount_paid?: number;
  balance_payable?: string;
  role?: string;
  type?: string;
  password?: string;
}

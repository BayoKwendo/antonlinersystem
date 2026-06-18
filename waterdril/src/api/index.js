// =============================================================================
//  Typed-ish API surface for the AntonLiner portal.
//  Every backend endpoint is wrapped in a named function here so screens never
//  hand-build URLs or repeat axios boilerplate. Paths mirror the Deno/Oak
//  routes in waterdril_back/routes/.
// =============================================================================
import client from './client';

/** Build a query string from a params object, skipping empty values. */
const query = (params = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

// --- Authentication ----------------------------------------------------------
export const authApi = {
  login: (credentials) => client.post('login', credentials),
  resetPassword: (payload) => client.post('password_reset', payload),
};

// --- Users / providers / customers ------------------------------------------
export const usersApi = {
  listByRole: (role, params = {}) => client.get(`users?${query({ role, ...params })}`),
  listByReferredId: (referred_id, params = {}) =>
    client.get(`users?${query({ referred_id, ...params })}`),
  listByIdNumber: (id_number, params = {}) =>
    client.get(`users?${query({ id_number, ...params })}`),
  getById: (id) => client.get(`users?${query({ id })}`),

  providers: () => client.post('user_driver', {}),
  providersByRole: (role) => client.get(`user_driver_all?${query({ role })}`),
  providersByOwner: (referred_id) => client.get(`user_driver_one?${query({ referred_id })}`),
  nearby: (payload) => client.post('nearby', payload),

  create: (payload) => client.post('user', payload),
  update: (payload) => client.post('user_edit', payload),
  uploadPhoto: (formData) =>
    client.post('user_edit_photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deactivate: (payload) => client.post('deactivate_user', payload),
  deactivateCustomer: (payload) => client.post('update_customer', payload),
  updateLocation: (payload) => client.post('update_location', payload),
};

// --- Services ----------------------------------------------------------------
export const servicesApi = {
  listPortal: () => client.get('service_portal'),
  list: () => client.get('service'),
  activeForApp: (payload = {}) => client.post('service_url', payload),
  add: (payload) => client.post('service_add', payload),
  update: (payload) => client.post('service', payload),
  setStatus: (payload) => client.post('deactivate_service', payload),
};

// --- Bookings & reporting ----------------------------------------------------
export const bookingsApi = {
  serviceRequests: ({ startDate, endDate }) =>
    client.get(`service_request?${query({ startDate, endDate })}`),
  serviceRequestsByDriver: ({ id, startDate, endDate }) =>
    client.get(`service_request_driver?${query({ id, startDate, endDate })}`),
  updateStatus: (payload) => client.post('booking_status', payload),
  makeReport: (payload) => client.post('make_report', payload),
};

// --- Payments ----------------------------------------------------------------
export const paymentsApi = {
  transactions: ({ startDate, endDate }) =>
    client.get(`transaction?${query({ startDate, endDate })}`),
  reconcile: (payload) => client.post('reconcile', payload),
  stkPush: (payload) => client.post('stk', payload),
  stkInitiate: (payload) => client.post('stk_t', payload),
  checkStk: (payload) => client.post('checkStk', payload),
};

// --- Misc --------------------------------------------------------------------
export const smsApi = {
  send: (payload) => client.post('send_sms', payload),
};

export { default as client } from './client';

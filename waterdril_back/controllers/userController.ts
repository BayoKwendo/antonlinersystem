// =============================================================================
//  HTTP controllers for the user/booking/payment API.
//  Controllers stay thin: validate input, delegate to repository/services,
//  shape the response. All DB access is parameterised in the repository layer.
// =============================================================================
import { type Context, bcrypt, PutObjectCommand, S3Client } from "../deps.ts";

const BCRYPT_ROUNDS = 10;
import { AWS } from "../config/config.ts";
import { readJson, ok, fail } from "../utils/http.ts";
import userRepository from "../repositories/userRepository.ts";
import { signToken } from "../services/tokenService.ts";
import { sendSms } from "../services/smsService.ts";
import { initiateStkPush } from "../services/mpesaService.ts";
import { applyPayment } from "../services/bookingService.ts";

/** Generate a numeric login PIN. */
function generatePin(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

const userController = {
  // ---------------------------------------------------------------------------
  //  Auth
  // ---------------------------------------------------------------------------
  loginUser: async (ctx: Context) => {
    const { username, password, role } = await readJson(ctx);
    const user = await userRepository.loginByMsisdn({ msisdn: username });

    if (!user) {
      ctx.response.status = 202;
      ctx.response.body = { success: false, message: "Phone number not found" };
      return;
    }
    if (!(await bcrypt.compare(password, user.password))) {
      ctx.response.status = 202;
      ctx.response.body = { success: false, message: "Password Incorrect" };
      return;
    }
    if (role === "drive" && user.role === "admin") {
      ctx.response.status = 202;
      ctx.response.body = { success: false, message: "Invalid credentials for this role" };
      return;
    }

    const access_token = await signToken({ id: user.id, msisdn: user.msisdn, role: user.role });
    ctx.response.status = 200;
    ctx.response.body = { success: true, access_token, user, message: "Success!!" };
  },

  /** Reset a user's PIN to a new random value and SMS it to them. */
  userPwd: async (ctx: Context) => {
    const { username } = await readJson(ctx);
    const user = await userRepository.loginByMsisdn({ msisdn: username });
    if (!user) {
      ctx.response.status = 202;
      ctx.response.body = { success: false, message: "Phone number not found" };
      return;
    }

    const pin = generatePin();
    await userRepository.editUserPwd({ password: await bcrypt.hash(String(pin), BCRYPT_ROUNDS), id: user.id });
    await sendSms({ to: username, text: `Hi ${user.name} new login PIN is ${pin}.` });

    ctx.response.body = { success: true, user, message: "Success!!" };
  },

  // ---------------------------------------------------------------------------
  //  Users
  // ---------------------------------------------------------------------------
  createUser: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.createUser({
      msisdn: v.msisdn,
      name: v.name,
      customer_type: v.customer_type,
      internal_name: v.internal_name,
      id_number: v.id_number,
      location: v.location,
      lat: v.lat || "0",
      long: v.long || "0",
      role: v.role,
      referred_id: v.onwer_id,
      amount: v.amount,
      password: await bcrypt.hash(v.password, BCRYPT_ROUNDS),
    });
    ctx.response.body = { success: true, message: "Success" };
  },

  editUser: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.editUser({
      msisdn: v.msisdn,
      name: v.name,
      id_number: v.id_number,
      internal_name: v.internal_name,
      id: v.id,
      referred_id: v.onwer_id,
      amount: v.amount,
      password: await bcrypt.hash(v.password, BCRYPT_ROUNDS),
    });
    ctx.response.body = { success: true, message: "Success" };
  },

  /** Upload a profile photo to S3 and store its URL. */
  updateUser: async (ctx: Context) => {
    const form = await ctx.request.body.formData();
    const file = form.get("applicantion_form");
    const id = form.get("id");
    if (!(file instanceof File)) return fail(ctx, "No file provided");

    const s3 = new S3Client({
      region: AWS.S3_REGION,
      credentials: {
        accessKeyId: AWS.ACCESS_KEY_ID,
        secretAccessKey: AWS.SECRET_ACCESS_KEY,
      },
    });
    const key = `${Date.now()}${file.name}`;
    await s3.send(new PutObjectCommand({
      Bucket: AWS.S3_BUCKET,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type,
    }));
    const url = `https://${AWS.S3_BUCKET}.s3.amazonaws.com/${key}`;

    await userRepository.updateUserPhoto({ id: Number(id), url });
    ctx.response.body = { success: true, message: "Success" };
  },

  updateCurrentLocation: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.updateLocation({
      id: v.id, lat: v.lat, location: v.location, long: v.longitude,
    });
    ok(ctx);
  },

  /** Deactivate / activate a user (active_status). */
  updateStatus: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.updateUserStatus({ id: v.id, active_status: v.status });
    ok(ctx);
  },

  /** Update a provider's booking status and notify the customer on milestones. */
  updateBookingUser: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.updateBookingStatus({ id: v.id, status: v.status });
    const provider = await userRepository.getProviderName({ user_id: v.id });

    if (v.status === "arrived") {
      await sendSms({ to: v.customer_number, text: `Dear Customer. ${provider.name} has arrived` });
    } else if (v.status === "finished") {
      await sendSms({
        to: v.customer_number,
        text: `Dear Customer. ${provider.name} has completed the job. You will be prompted to make payment shortly. Kindly rate the service you received.`,
      });
    }
    ok(ctx);
  },

  /** File a post-job report/complaint and settle the booking. */
  makeReport: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.updateOrderRequest({ status: 2, amount: v.amount, id: v.book_id });
    await userRepository.updateBookingAndStatus({ status: 0, available: "available", id: v.user_id });
    await userRepository.insertComplaint({
      id_number: v.id_number, msisdn: v.msisdn, user_id: v.user_id,
      order_number: v.book_id, message: v.notes, amount: v.amount,
    });
    ok(ctx);
  },

  updateCustomerProfile: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.deactivateCustomer({ id: v.id });
    ctx.response.body = { success: true, message: "Success" };
  },

  getUser: async (ctx: Context) => {
    const url = ctx.request.url.searchParams;
    const id = url.get("id");
    const id_number = url.get("id_number");
    const referred_id = url.get("referred_id");
    const role = url.get("role");
    let customer_type = url.get("customer_type");

    let data;
    if (!id && !id_number && role) {
      data = await userRepository.getUsersByRole({ role, customer_type: customer_type || "agent" });
    } else if (referred_id) {
      data = await userRepository.getUsersReferred({ referred_id: Number(referred_id) });
    } else if (!id && !role) {
      data = await userRepository.getCustomersByIdNumber({ id_number: id_number || "" });
    } else {
      data = await userRepository.getUserById({ id: Number(id) });
    }
    ok(ctx, data);
  },

  getUserDriver: async (ctx: Context) => ok(ctx, await userRepository.getProviders()),

  getUserDriverAll: async (ctx: Context) => {
    const role = ctx.request.url.searchParams.get("role") || "";
    ok(ctx, await userRepository.getProvidersByRole({ role }));
  },

  getUserDriverOne: async (ctx: Context) => {
    const referred_id = Number(ctx.request.url.searchParams.get("referred_id"));
    ok(ctx, await userRepository.getProvidersByOwner({ referred_id }));
  },

  /**
   * Nearby available providers. When the client sends real coordinates we sort
   * by true distance (haversine) and return `distance_km`; otherwise we fall
   * back to the legacy behaviour (location-prefix filter, or all of the role)
   * so older clients keep working.
   */
  getUserOneLat: async (ctx: Context) => {
    const v = await readJson(ctx);
    const lat = Number(v.lat);
    const long = Number(v.long);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(long) && lat !== 0 && long !== 0;

    let data;
    if (hasCoords) {
      const radiusKm = Number(v.radius) > 0 ? Number(v.radius) : 100000;
      data = await userRepository.getProvidersByDistance({ role: v.role, lat, long, radiusKm });
    } else if (v.location) {
      data = await userRepository.getProvidersByLocation({ role: v.role, location: v.location });
    } else {
      data = await userRepository.getProvidersByLatLong({ role: v.role });
    }
    ok(ctx, data);
  },

  // ---------------------------------------------------------------------------
  //  Services
  // ---------------------------------------------------------------------------
  getServices: async (ctx: Context) => ok(ctx, await userRepository.getServices()),

  getServicesApp: async (ctx: Context) => ok(ctx, await userRepository.getActiveServices()),

  addService: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.addService({ name: v.name, type: v.type });
    ctx.response.body = { success: true, message: "Success" };
  },

  updateService: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.updateServiceName({ name: v.name, id: v.id });
    ctx.response.body = { success: true, message: "Success" };
  },

  updateStatusActive: async (ctx: Context) => {
    const v = await readJson(ctx);
    await userRepository.updateServiceStatus({ id: v.id, active_status: v.status });
    ok(ctx);
  },

  // ---------------------------------------------------------------------------
  //  Reporting
  // ---------------------------------------------------------------------------
  getServiceRequest: async (ctx: Context) => {
    const url = ctx.request.url.searchParams;
    ok(ctx, await userRepository.getOrderRequestsAll({
      startDate: url.get("startDate") ?? "", endDate: url.get("endDate") ?? "",
    }));
  },

  getServiceRequestDriver: async (ctx: Context) => {
    const url = ctx.request.url.searchParams;
    ok(ctx, await userRepository.getOrderRequestsByOwner({
      id: Number(url.get("id")),
      startDate: url.get("startDate") ?? "", endDate: url.get("endDate") ?? "",
    }));
  },

  getTransaction: async (ctx: Context) => {
    const url = ctx.request.url.searchParams;
    ok(ctx, await userRepository.getDeposits({
      startDate: url.get("startDate") ?? "", endDate: url.get("endDate") ?? "",
    }));
  },

  // ---------------------------------------------------------------------------
  //  Payments — STK push
  // ---------------------------------------------------------------------------
  /** Reject if the customer already has an open request for this provider. */
  checkSTKTest: async (ctx: Context) => {
    const v = await readJson(ctx);
    const open = await userRepository.getOpenOrderRequest({ user_id: v.id_record, id_number: v.id_number });
    if (open.length > 0) {
      ctx.response.status = 202;
      ctx.response.body = { ResultCode: 1, Data: open, ResultDesc: "Already requested this section" };
    } else {
      ctx.response.status = 200;
      ctx.response.body = { ResultCode: 0, ResultDesc: "Success" };
    }
  },

  /** Create the order (if new) then trigger an STK push. */
  stkTest: async (ctx: Context) => {
    const v = await readJson(ctx);
    const open = await userRepository.getOpenOrderRequest({ user_id: v.id_record, id_number: v.id_number });
    if (open.length === 0) {
      await userRepository.createOrderRequest({
        user_id: v.id_record, amount_to_pay: v.amount_required, amount_paid: 0,
        balance_payable: v.amount, msisdn: v.msisdn, id_number: v.id_number,
      });
    }
    const accepted = await initiateStkPush({
      amount: v.amount, msisdn: v.msisdn, accountReference: `drill${v.id_number}:${v.id_record}`,
    });
    ctx.response.status = accepted ? 200 : 202;
    ctx.response.body = { ResultCode: accepted ? 0 : 1, ResultDesc: accepted ? "Accepted" : "Rejected" };
  },

  /** Trigger an STK push without touching orders. */
  stkTestInitiate: async (ctx: Context) => {
    const v = await readJson(ctx);
    const accepted = await initiateStkPush({
      amount: v.amount, msisdn: v.msisdn, accountReference: `drill${v.id_number}:${v.id_record}`,
    });
    ctx.response.status = accepted ? 200 : 202;
    ctx.response.body = { ResultCode: accepted ? 0 : 1, ResultDesc: accepted ? "Accepted" : "Rejected" };
  },

  // ---------------------------------------------------------------------------
  //  Payments — confirmation
  // ---------------------------------------------------------------------------
  /** Safaricom C2B confirmation callback (posts a form-encoded JSON blob). */
  mpesaConfirmation: async (ctx: Context) => {
    const form = await ctx.request.body.form();
    let payload: Record<string, string> | null = null;
    for (const [key] of form) {
      try { payload = JSON.parse(key); } catch { /* not JSON */ }
      break;
    }
    if (!payload) return fail(ctx, "No record found");

    const reference = String(payload.BillRefNumber ?? "").replace("drill", "");
    const idNumber = reference.substring(0, reference.indexOf(":")).replace(/\D/g, "");
    const recordId = reference.substring(reference.lastIndexOf(":")).replace(/\D/g, "");

    const result = await applyPayment({
      idNumber, userId: recordId, amount: payload.TransAmount,
      transactionId: payload.TransID, source: "c2b",
    });
    if (!result.found) return fail(ctx, "No record found");
    ctx.response.body = { success: true, message: "Success" };
  },

  /** Operator-driven reconciliation from the portal. */
  mpesaConfirmationPortal: async (ctx: Context) => {
    const v = await readJson(ctx);
    const result = await applyPayment({
      idNumber: v.id_number, userId: v.user_id, amount: v.amount,
      transactionId: v.transaction_id, source: "portal",
    });
    if (!result.found) return fail(ctx, "No record found");
    ok(ctx);
  },

  // ---------------------------------------------------------------------------
  //  Misc
  // ---------------------------------------------------------------------------
  sendSMS: async (ctx: Context) => {
    const v = await readJson(ctx);
    const sent = await sendSms({ to: v.msisdn, text: String(v.text), asciiOnly: true });
    ctx.response.status = sent ? 200 : 202;
    ctx.response.body = { ResultCode: sent ? 0 : 1, ResultDesc: sent ? "Success" : "Failed" };
  },
};

export default userController;

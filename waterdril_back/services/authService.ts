// =============================================================================
//  Authentication orchestration.
//    * Customers  -> phone + SMS OTP (passwordless).
//    * Providers / staff -> phone + password (accounts created via the portal).
//  Issues a short-lived JWT access token + an opaque, rotating refresh token.
// =============================================================================
import { bcrypt } from "../deps.ts";
import { AUTH } from "../config/config.ts";
import accountRepo, { type UserRow } from "../repositories/accountRepo.ts";
import { signAccessToken } from "./tokenService.ts";
import { sendSms } from "./smsService.ts";
import { randomOtp, randomToken, sha256hex } from "../utils/crypto.ts";
import { normalizePhone } from "../utils/phone.ts";
import { badRequest, forbidden, unauthorized } from "../utils/errors.ts";

const BCRYPT_ROUNDS = 10;
const MAX_OTP_ATTEMPTS = 5;

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    uuid: string;
    phone: string;
    display_name: string;
    avatar_url: string | null;
    roles: string[];
    must_change_password: boolean;
  };
}

async function issueTokens(user: UserRow): Promise<AuthResult> {
  const roles = await accountRepo.rolesOf(user.id);
  const access_token = await signAccessToken(user.id, roles);
  const refresh_token = randomToken(32);
  await accountRepo.insertRefresh(user.id, await sha256hex(refresh_token), AUTH.REFRESH_TTL_SECONDS);
  return {
    access_token,
    refresh_token,
    user: {
      id: user.id,
      uuid: user.uuid,
      phone: user.phone,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      roles,
      must_change_password: Number(user.must_change_password) === 1,
    },
  };
}

export const authService = {
  /** Generate + SMS an OTP. Always succeeds silently (no account enumeration). */
  async requestOtp(rawPhone: string): Promise<void> {
    const phone = normalizePhone(rawPhone);
    const code = randomOtp(AUTH.OTP_LENGTH);
    await accountRepo.insertOtp(phone, await sha256hex(code), AUTH.OTP_TTL_SECONDS);
    await sendSms({ to: phone, text: `Your AntonLiner verification code is ${code}.`, asciiOnly: true });
  },

  /** Verify an OTP and log in, creating a customer account on first use. */
  async verifyOtp(rawPhone: string, code: string, name?: string): Promise<AuthResult> {
    const phone = normalizePhone(rawPhone);
    const otp = await accountRepo.latestValidOtp(phone);
    if (!otp) throw badRequest("Code expired or not found. Request a new one.");
    if (otp.attempts >= MAX_OTP_ATTEMPTS) throw badRequest("Too many attempts. Request a new code.");

    if (otp.code_hash !== await sha256hex(code)) {
      await accountRepo.bumpOtpAttempts(otp.id);
      throw badRequest("Incorrect code");
    }
    await accountRepo.consumeOtp(otp.id);

    let user = await accountRepo.findByPhone(phone);
    if (!user) {
      const id = await accountRepo.createWithRole({
        phone,
        displayName: name?.trim() || `Customer ${phone.slice(-4)}`,
        passwordHash: null,
        roleKey: "customer",
        verified: true,
      });
      await accountRepo.ensureCustomerProfile(id);
      user = await accountRepo.findById(id);
    } else {
      // An existing user (e.g. admin/provider) signing in via the passenger app
      // also becomes a customer so they can book — one phone, many roles.
      await accountRepo.ensureRole(user.id, "customer");
      await accountRepo.ensureCustomerProfile(user.id);
      if (!user.phone_verified_at) await accountRepo.markPhoneVerified(user.id);
      user = await accountRepo.findById(user.id) ?? user;
    }
    if (!user) throw badRequest("Could not create account");
    if (user.status === "suspended") throw forbidden("Account suspended");
    return issueTokens(user);
  },

  /** Password login for providers / portal staff. */
  async loginPassword(rawPhone: string, password: string): Promise<AuthResult> {
    const phone = normalizePhone(rawPhone);
    const user = await accountRepo.findByPhone(phone);
    if (!user || !user.password_hash) throw unauthorized("Invalid credentials");
    if (!(await bcrypt.compare(password, user.password_hash))) throw unauthorized("Invalid credentials");
    if (user.status === "suspended") throw forbidden("Account suspended");
    return issueTokens(user);
  },

  /** Rotate a refresh token: revoke the old, issue a fresh pair. */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const hash = await sha256hex(refreshToken);
    const row = await accountRepo.findRefresh(hash);
    if (!row) throw unauthorized("Invalid refresh token");
    await accountRepo.revokeRefresh(hash);
    const user = await accountRepo.findById(row.user_id);
    if (!user) throw unauthorized("Invalid refresh token");
    return issueTokens(user);
  },

  async logout(refreshToken: string): Promise<void> {
    await accountRepo.revokeRefresh(await sha256hex(refreshToken));
  },

  /** Hash a password for provider/staff account creation (used by the portal). */
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },

  /**
   * Reset a staff/provider password: generate a temporary password, store its
   * hash and SMS it. Silent (no account enumeration).
   */
  async resetPassword(rawPhone: string): Promise<void> {
    const phone = normalizePhone(rawPhone);
    const user = await accountRepo.findByPhone(phone);
    if (!user || !user.password_hash) return; // only password accounts; stay silent
    const temp = randomToken(4); // 8 hex chars
    await accountRepo.setPassword(user.id, await bcrypt.hash(temp, BCRYPT_ROUNDS));
    await accountRepo.setMustChangePassword(user.id, true);
    await sendSms({
      to: phone,
      text: `Your AntonLiner portal temporary password is ${temp}. Please change it after signing in.`,
      asciiOnly: true,
    });
  },

  /** Change the signed-in user's own password (verifies the current one). */
  async changePassword(userId: number, current: string, next: string): Promise<void> {
    const user = await accountRepo.findById(userId);
    if (!user || !user.password_hash) throw badRequest("Password change not available for this account");
    if (!(await bcrypt.compare(current, user.password_hash))) throw unauthorized("Current password is incorrect");
    await accountRepo.setPassword(userId, await bcrypt.hash(next, BCRYPT_ROUNDS));
    await accountRepo.setMustChangePassword(userId, false);
  },

  /** Update the signed-in user's own profile. */
  async updateProfile(userId: number, displayName?: string, email?: string | null): Promise<void> {
    await accountRepo.updateProfile(userId, { displayName, email });
  },
};

export default authService;

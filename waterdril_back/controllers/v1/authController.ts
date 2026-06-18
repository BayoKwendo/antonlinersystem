// =============================================================================
//  v1 auth controller — OTP (customers), password (providers/staff), refresh.
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { parseBody } from "../../utils/validate.ts";
import { currentUser } from "../../middlewares/auth.ts";
import authService from "../../services/authService.ts";
import accountRepo from "../../repositories/accountRepo.ts";
import {
  passwordLoginSchema,
  refreshSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from "../../validators/schemas.ts";

const authController = {
  requestOtp: async (ctx: Context) => {
    const { phone } = await parseBody(ctx, requestOtpSchema);
    await authService.requestOtp(phone);
    ok(ctx, null, "If the number is valid, a code has been sent");
  },

  verifyOtp: async (ctx: Context) => {
    const { phone, code, name } = await parseBody(ctx, verifyOtpSchema);
    ok(ctx, await authService.verifyOtp(phone, code, name), "Logged in");
  },

  login: async (ctx: Context) => {
    const { phone, password } = await parseBody(ctx, passwordLoginSchema);
    ok(ctx, await authService.loginPassword(phone, password), "Logged in");
  },

  refresh: async (ctx: Context) => {
    const { refresh_token } = await parseBody(ctx, refreshSchema);
    ok(ctx, await authService.refresh(refresh_token), "Refreshed");
  },

  logout: async (ctx: Context) => {
    const { refresh_token } = await parseBody(ctx, refreshSchema);
    await authService.logout(refresh_token);
    ok(ctx, null, "Logged out");
  },

  me: async (ctx: Context) => {
    const { userId } = currentUser(ctx);
    const user = await accountRepo.findById(userId);
    const roles = await accountRepo.rolesOf(userId);
    ok(ctx, user ? { ...user, password_hash: undefined, roles } : null);
  },
};

export default authController;

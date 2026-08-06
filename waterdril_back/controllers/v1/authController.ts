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
  changePasswordSchema,
  passwordLoginSchema,
  refreshSchema,
  requestOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from "../../validators/schemas.ts";

const authController = {
  requestOtp: async (ctx: Context) => {
    const { phone } = await parseBody(ctx, requestOtpSchema);
    const { expiresIn } = await authService.requestOtp(phone);
    ok(ctx, { expires_in: expiresIn }, "If the number is valid, a code has been sent");
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
    if (!user) return ok(ctx, null);
    const roles = await accountRepo.rolesOf(userId);
    // Return the same clean shape as login (AuthUser) — notably must_change_password
    // as a real boolean, not the raw 0/1 int, and no password_hash leak.
    ok(ctx, {
      id: user.id,
      uuid: user.uuid,
      phone: user.phone,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      email: user.email ?? null,
      roles,
      must_change_password: Number(user.must_change_password) === 1,
    });
  },

  resetPassword: async (ctx: Context) => {
    const { phone } = await parseBody(ctx, resetPasswordSchema);
    await authService.resetPassword(phone);
    ok(ctx, null, "If the number is registered, a temporary password has been sent");
  },

  updateMe: async (ctx: Context) => {
    const { userId } = currentUser(ctx);
    const v = await parseBody(ctx, updateProfileSchema);
    await authService.updateProfile(userId, v.display_name, v.email === "" ? null : v.email);
    ok(ctx, null, "Profile updated");
  },

  changePassword: async (ctx: Context) => {
    const { userId } = currentUser(ctx);
    const v = await parseBody(ctx, changePasswordSchema);
    await authService.changePassword(userId, v.current, v.next);
    ok(ctx, null, "Password changed");
  },
};

export default authController;

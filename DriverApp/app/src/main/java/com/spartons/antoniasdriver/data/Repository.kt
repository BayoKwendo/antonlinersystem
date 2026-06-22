package com.spartons.antoniasdriver.data

/** Thin domain layer over the provider API; unwraps envelopes and persists the session. */
class Repository(private val api: ApiService, val session: SessionStore) {

    suspend fun login(phone: String, password: String): AuthResult {
        val result = api.login(LoginReq(phone, password)).unwrap()
        session.save(result)
        return result
    }

    /** Request a temporary password by SMS (forgot-password). */
    suspend fun resetPassword(phone: String) {
        api.resetPassword(ResetPasswordReq(phone))
    }

    /** Set a new password (used for the forced change after a reset). */
    suspend fun changePassword(current: String, next: String) {
        // This endpoint returns an empty body on success ({success:true, data:null}),
        // so check the flag rather than unwrap() (which would treat null data as failure).
        val res = api.changePassword(ChangePasswordReq(current, next))
        if (!res.success) throw ApiException(res.message ?: "Could not set password")
    }

    suspend fun logout() = session.clear()

    suspend fun me(): ProviderProfile = api.providerMe().unwrap()

    /** Toggle availability. Returns the resulting online flag. */
    suspend fun setOnline(online: Boolean): Boolean =
        api.setOnline(OnlineReq(online)).data?.online ?: online

    /** Push the current GPS fix for "nearby" persistence (fire-and-forget). */
    suspend fun updateLocation(lat: Double, lng: Double) {
        api.updateLocation(LocationReq(lat, lng))
    }

    suspend fun bookings(): List<Booking> = api.bookings().unwrap()

    suspend fun booking(id: Long): Booking = api.booking(id).unwrap()

    /** Advance a job: en_route -> arrived -> in_progress -> completed. */
    suspend fun transition(id: Long, status: String, note: String? = null): Booking =
        api.transition(id, TransitionReq(status, note)).unwrap()

    suspend fun notifications(): NotificationsPage = api.notifications().unwrap()

    suspend fun markNotificationRead(id: Long) {
        api.markNotificationRead(id)
    }

    suspend fun markAllNotificationsRead() {
        api.markAllNotificationsRead()
    }

    /** Register this device's FCM token for push (fire-and-forget at call sites). */
    suspend fun registerDevice(token: String) {
        api.registerDevice(DeviceTokenReq(token))
    }
}

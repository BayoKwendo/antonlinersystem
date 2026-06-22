package com.spartons.antonis.data

/** Thin domain layer over the API; unwraps envelopes and persists the session. */
class Repository(private val api: ApiService, val session: SessionStore) {

    suspend fun requestOtp(phone: String) {
        api.requestOtp(PhoneReq(phone))
    }

    suspend fun verifyOtp(phone: String, code: String, name: String?): AuthResult {
        val result = api.verifyOtp(VerifyReq(phone, code, name?.ifBlank { null })).unwrap()
        session.save(result)
        return result
    }

    suspend fun logout() = session.clear()

    suspend fun categories(): List<Category> = api.services().unwrap()

    suspend fun nearby(category: String, lat: Double, lng: Double): List<Provider> =
        api.nearby(NearbyReq(category, lat, lng)).unwrap()

    suspend fun createBooking(providerId: Long, category: String, address: String?, lat: Double?, lng: Double?): Booking =
        api.createBooking(CreateBookingReq(providerId, category, address, lat, lng)).unwrap()

    suspend fun bookings(): List<Booking> = api.bookings().unwrap()

    suspend fun booking(id: Long): Booking = api.booking(id).unwrap()

    suspend fun pay(id: Long, phone: String): PayResult = api.pay(id, PayReq(phone)).unwrap()

    /** Customer confirms the provider has arrived. */
    suspend fun confirmArrived(id: Long): Booking =
        api.transition(id, TransitionReq("arrived")).unwrap()

    suspend fun review(id: Long, rating: Int, comment: String?) {
        // Empty body on success ({success:true, data:null}) — check the flag, don't unwrap().
        val res = api.review(id, ReviewReq(rating, comment?.ifBlank { null }))
        if (!res.success) throw ApiException(res.message ?: "Could not submit review")
    }

    suspend fun notifications(): NotificationsPage = api.notifications().unwrap()

    suspend fun markNotificationRead(id: Long) {
        api.markNotificationRead(id)
    }

    suspend fun markAllNotificationsRead() {
        api.markAllNotificationsRead()
    }
}

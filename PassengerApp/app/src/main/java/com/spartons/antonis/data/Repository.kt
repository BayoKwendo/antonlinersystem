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

    suspend fun createBooking(providerId: Long, address: String?, lat: Double?, lng: Double?): Booking =
        api.createBooking(CreateBookingReq(providerId, address, lat, lng)).unwrap()

    suspend fun bookings(): List<Booking> = api.bookings().unwrap()

    suspend fun booking(id: Long): Booking = api.booking(id).unwrap()

    suspend fun pay(id: Long, phone: String): PayResult = api.pay(id, PayReq(phone)).unwrap()

    suspend fun review(id: Long, rating: Int, comment: String?) {
        api.review(id, ReviewReq(rating, comment?.ifBlank { null })).unwrap()
    }

    suspend fun notifications(): NotificationsPage = api.notifications().unwrap()

    suspend fun markNotificationRead(id: Long) {
        api.markNotificationRead(id)
    }

    suspend fun markAllNotificationsRead() {
        api.markAllNotificationsRead()
    }
}

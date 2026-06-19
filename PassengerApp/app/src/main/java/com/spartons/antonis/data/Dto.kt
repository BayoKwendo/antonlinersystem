package com.spartons.antonis.data

import com.google.gson.annotations.SerializedName

/** Standard API envelope: { success, message, data }. */
data class ApiResponse<T>(
    val success: Boolean = false,
    val message: String? = null,
    val data: T? = null,
)

data class AuthUser(
    val id: Long,
    val uuid: String,
    val phone: String,
    @SerializedName("display_name") val displayName: String,
    @SerializedName("avatar_url") val avatarUrl: String?,
    val roles: List<String> = emptyList(),
)

data class AuthResult(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    val user: AuthUser,
)

data class Category(
    val id: Long,
    val key: String,
    val name: String,
    val description: String?,
)

data class Provider(
    val id: Long,
    @SerializedName("display_name") val displayName: String,
    val phone: String,
    @SerializedName("avatar_url") val avatarUrl: String?,
    @SerializedName("base_price") val basePrice: String,
    @SerializedName("rating_avg") val ratingAvg: String,
    @SerializedName("rating_count") val ratingCount: Int,
    val availability: String,
    val lat: String?,
    val lng: String?,
    @SerializedName("distance_km") val distanceKm: Double?,
)

data class BookingEvent(
    val status: String,
    val note: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class Payment(
    val id: Long,
    @SerializedName("mpesa_receipt") val mpesaReceipt: String?,
    val amount: String,
    val kind: String,
    val status: String,
)

data class Booking(
    val id: Long,
    val uuid: String?,
    val status: String,
    @SerializedName("deposit_amount") val depositAmount: String,
    @SerializedName("total_amount") val totalAmount: String,
    @SerializedName("amount_paid") val amountPaid: String,
    val address: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("provider_name") val providerName: String?,
    @SerializedName("provider_phone") val providerPhone: String?,
    @SerializedName("provider_lat") val providerLat: String?,
    @SerializedName("provider_lng") val providerLng: String?,
    val category: String?,
    val events: List<BookingEvent>? = null,
    val payments: List<Payment>? = null,
)

data class AppNotification(
    val id: Long,
    val title: String,
    val body: String,
    @SerializedName("read_at") val readAt: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class NotificationsPage(
    val items: List<AppNotification> = emptyList(),
    val total: Int = 0,
    val unread: Int = 0,
)

data class PayResult(
    @SerializedName("checkout_id") val checkoutId: String?,
    val amount: Double?,
    val kind: String?,
)

// --- request bodies ---
data class PhoneReq(val phone: String)
data class VerifyReq(val phone: String, val code: String, val name: String?)
data class RefreshReq(@SerializedName("refresh_token") val refreshToken: String)
data class NearbyReq(
    val category: String,
    val lat: Double,
    val lng: Double,
    @SerializedName("radius_km") val radiusKm: Double? = null,
)
data class CreateBookingReq(
    @SerializedName("provider_id") val providerId: Long,
    val address: String?,
    val lat: Double?,
    val lng: Double?,
)
data class PayReq(val phone: String)
data class ReviewReq(val rating: Int, val comment: String?)

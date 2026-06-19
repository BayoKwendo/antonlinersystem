package com.spartons.antoniasdriver.data

import com.google.gson.annotations.SerializedName

/** Standard API envelope: { success, message, data }. */
data class ApiResponse<T>(
    val success: Boolean = false,
    val message: String? = null,
    val data: T? = null,
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

data class AuthUser(
    val id: Long,
    val uuid: String?,
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

/** Provider self-profile from GET /providers/me. */
data class ProviderProfile(
    @SerializedName("user_id") val userId: Long,
    @SerializedName("display_name") val displayName: String?,
    val phone: String?,
    val category: String?,
    val availability: String?,
    @SerializedName("movement_status") val movementStatus: String?,
    @SerializedName("base_price") val basePrice: String?,
    @SerializedName("rating_avg") val ratingAvg: String?,
    @SerializedName("rating_count") val ratingCount: Int?,
    val lat: String?,
    val lng: String?,
)

/** Result of POST /providers/me/online. */
data class OnlineState(val online: Boolean)

data class BookingEvent(
    val status: String,
    val note: String?,
    @SerializedName("created_at") val createdAt: String?,
)

/**
 * A job from the provider's perspective. The list endpoint supplies customer
 * name/phone + amounts; the detail endpoint additionally carries the customer
 * drop-off coordinates (lat/lng) and the event history.
 */
data class Booking(
    val id: Long,
    val uuid: String?,
    val status: String,
    @SerializedName("deposit_amount") val depositAmount: String?,
    @SerializedName("total_amount") val totalAmount: String?,
    @SerializedName("amount_paid") val amountPaid: String?,
    val address: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("customer_name") val customerName: String?,
    @SerializedName("customer_phone") val customerPhone: String?,
    val category: String?,
    val lat: String?,
    val lng: String?,
    val events: List<BookingEvent>? = null,
)

// --- request bodies ---
data class LoginReq(val phone: String, val password: String)
data class RefreshReq(@SerializedName("refresh_token") val refreshToken: String)
data class OnlineReq(val online: Boolean)
data class LocationReq(val lat: Double, val lng: Double)
data class TransitionReq(val status: String, val note: String? = null)

package com.spartons.antonis.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @POST("auth/otp/request")
    suspend fun requestOtp(@Body body: PhoneReq): ApiResponse<Unit>

    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body body: VerifyReq): ApiResponse<AuthResult>

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshReq): ApiResponse<AuthResult>

    @GET("services")
    suspend fun services(): ApiResponse<List<Category>>

    @POST("providers/nearby")
    suspend fun nearby(@Body body: NearbyReq): ApiResponse<List<Provider>>

    @POST("bookings")
    suspend fun createBooking(@Body body: CreateBookingReq): ApiResponse<Booking>

    // scope=customer → only this customer's own bookings, even for multi-role accounts.
    @GET("bookings")
    suspend fun bookings(@Query("scope") scope: String = "customer"): ApiResponse<List<Booking>>

    @GET("bookings/{id}")
    suspend fun booking(@Path("id") id: Long): ApiResponse<Booking>

    @POST("bookings/{id}/pay")
    suspend fun pay(@Path("id") id: Long, @Body body: PayReq): ApiResponse<PayResult>

    // The customer confirms the provider has arrived (en_route → arrived).
    @PATCH("bookings/{id}/status")
    suspend fun transition(@Path("id") id: Long, @Body body: TransitionReq): ApiResponse<Booking>

    @POST("bookings/{id}/review")
    suspend fun review(@Path("id") id: Long, @Body body: ReviewReq): ApiResponse<Unit>

    @GET("notifications")
    suspend fun notifications(): ApiResponse<NotificationsPage>

    @POST("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: Long): ApiResponse<Unit>

    @POST("notifications/read-all")
    suspend fun markAllNotificationsRead(): ApiResponse<Unit>
}

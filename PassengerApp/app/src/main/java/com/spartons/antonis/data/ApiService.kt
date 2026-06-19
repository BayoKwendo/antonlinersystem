package com.spartons.antonis.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

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

    @GET("bookings")
    suspend fun bookings(): ApiResponse<List<Booking>>

    @GET("bookings/{id}")
    suspend fun booking(@Path("id") id: Long): ApiResponse<Booking>

    @POST("bookings/{id}/pay")
    suspend fun pay(@Path("id") id: Long, @Body body: PayReq): ApiResponse<PayResult>

    @POST("bookings/{id}/review")
    suspend fun review(@Path("id") id: Long, @Body body: ReviewReq): ApiResponse<Unit>

    @GET("notifications")
    suspend fun notifications(): ApiResponse<NotificationsPage>

    @POST("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: Long): ApiResponse<Unit>

    @POST("notifications/read-all")
    suspend fun markAllNotificationsRead(): ApiResponse<Unit>
}

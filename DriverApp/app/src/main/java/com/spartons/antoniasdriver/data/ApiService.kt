package com.spartons.antoniasdriver.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {
    // --- auth (providers authenticate with phone + password) ---
    @POST("auth/login")
    suspend fun login(@Body body: LoginReq): ApiResponse<AuthResult>

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshReq): ApiResponse<AuthResult>

    @GET("auth/me")
    suspend fun me(): ApiResponse<AuthUser>

    // --- provider self-service ---
    @GET("providers/me")
    suspend fun providerMe(): ApiResponse<ProviderProfile>

    @POST("providers/me/online")
    suspend fun setOnline(@Body body: OnlineReq): ApiResponse<OnlineState>

    @POST("providers/me/location")
    suspend fun updateLocation(@Body body: LocationReq): ApiResponse<Unit>

    // --- jobs ---
    @GET("bookings")
    suspend fun bookings(): ApiResponse<List<Booking>>

    @GET("bookings/{id}")
    suspend fun booking(@Path("id") id: Long): ApiResponse<Booking>

    @PATCH("bookings/{id}/status")
    suspend fun transition(@Path("id") id: Long, @Body body: TransitionReq): ApiResponse<Booking>

    // --- in-app notifications ---
    @GET("notifications")
    suspend fun notifications(): ApiResponse<NotificationsPage>

    @POST("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: Long): ApiResponse<Unit>

    @POST("notifications/read-all")
    suspend fun markAllNotificationsRead(): ApiResponse<Unit>
}

package com.spartons.antoniasdriver.data

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

/** Retrofit surface for the SMART Drill v1 API (provider / driver app). */
interface ApiService {

    // --- auth ---------------------------------------------------------------
    @POST("auth/login")
    suspend fun login(@Body body: LoginReq): ApiResponse<AuthResult>

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshReq): ApiResponse<AuthResult>

    @POST("auth/password/reset")
    suspend fun resetPassword(@Body body: ResetPasswordReq): ApiResponse<Unit>

    @POST("auth/password")
    suspend fun changePassword(@Body body: ChangePasswordReq): ApiResponse<Unit>

    @GET("auth/me")
    suspend fun me(): ApiResponse<AuthUser>

    // --- provider onboarding + self-service ---------------------------------
    @POST("providers/signup")
    suspend fun signup(@Body body: ProviderSignupReq): ApiResponse<AuthResult>

    @GET("providers/dashboard")
    suspend fun dashboard(): ApiResponse<ProviderDashboard>

    @GET("providers/me")
    suspend fun providerMe(): ApiResponse<ProviderProfile>

    @GET("providers/earnings")
    suspend fun earnings(): ApiResponse<ProviderEarnings>

    @GET("providers/kpi")
    suspend fun providerKpi(): ApiResponse<ProviderKpi>

    @POST("providers/me/online")
    suspend fun setOnline(@Body body: OnlineReq): ApiResponse<OnlineState>

    @POST("providers/me/location")
    suspend fun updateLocation(@Body body: LocationReq): ApiResponse<Unit>

    // --- jobs (marketplace + delivery) --------------------------------------
    @GET("jobs")
    suspend fun availableJobs(): ApiResponse<List<Job>>

    @GET("jobs/mine")
    suspend fun myJobs(): ApiResponse<List<Job>>

    @POST("jobs/{id}/accept")
    suspend fun acceptJob(@Path("id") id: Long, @Body body: AcceptJobReq): ApiResponse<Unit>

    @POST("jobs/{id}/decline")
    suspend fun declineJob(@Path("id") id: Long): ApiResponse<Unit>

    @POST("jobs/{id}/contacted")
    suspend fun markContacted(@Path("id") id: Long): ApiResponse<Unit>

    @POST("jobs/{id}/prompt-payment")
    suspend fun promptPayment(@Path("id") id: Long): ApiResponse<PromptPaymentResult>

    @POST("jobs/{id}/status")
    suspend fun jobStatus(@Path("id") id: Long, @Body body: JobStatusReq): ApiResponse<Unit>

    @GET("jobs/{id}/documents")
    suspend fun jobDocuments(@Path("id") id: Long): ApiResponse<List<JobDocument>>

    @POST("jobs/{id}/documents")
    suspend fun addJobDocument(@Path("id") id: Long, @Body body: JobDocumentReq): ApiResponse<JobDocument>

    // --- uploads (statutory documents; multipart → backend local disk) ------
    @Multipart
    @POST("uploads")
    suspend fun uploadFile(
        @Part file: MultipartBody.Part,
        @Part("context") context: RequestBody,
        @Part("purpose") purpose: RequestBody,
    ): ApiResponse<UploadResult>

    // --- notifications + devices --------------------------------------------
    @GET("notifications")
    suspend fun notifications(@Query("limit") limit: Int? = null): ApiResponse<NotificationsPage>

    @POST("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: Long): ApiResponse<Unit>

    @POST("notifications/read-all")
    suspend fun markAllNotificationsRead(): ApiResponse<Unit>

    @POST("devices")
    suspend fun registerDevice(@Body body: DeviceTokenReq): ApiResponse<Unit>
}

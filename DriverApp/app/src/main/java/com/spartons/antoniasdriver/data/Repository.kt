package com.spartons.antoniasdriver.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/** Thin domain layer over the SMART Drill provider API; unwraps envelopes + persists the session. */
class Repository(private val api: ApiService, val session: SessionStore) {

    /** Bare client (no auth header) for direct-to-S3 presigned PUT uploads. */
    private val uploadClient = OkHttpClient()

    // --- auth ---------------------------------------------------------------
    suspend fun login(phone: String, password: String): AuthResult {
        val result = api.login(LoginReq(phone, password)).unwrap()
        session.save(result)
        return result
    }

    suspend fun resetPassword(phone: String) {
        api.resetPassword(ResetPasswordReq(phone))
    }

    suspend fun changePassword(current: String, next: String) {
        val res = api.changePassword(ChangePasswordReq(current, next))
        if (!res.success) throw ApiException(res.message ?: "Could not set password")
    }

    suspend fun logout() = session.clear()

    // --- provider onboarding ------------------------------------------------
    /**
     * Self-service provider registration. Uploads any selected statutory documents
     * to S3 (best-effort — skipped if uploads aren't configured), then submits the
     * JSON signup and signs the new (pending) provider in.
     */
    suspend fun signup(
        fullName: String,
        businessName: String,
        phone: String,
        email: String,
        kraPin: String,
        password: String,
        bankDetails: String?,
        services: List<String>,
        documents: List<DocumentUpload>,
    ): AuthResult {
        val uploaded = documents.mapNotNull { d -> uploadDocument(d)?.let { key -> SignupDoc(d.kind, key) } }
        val result = api.signup(
            ProviderSignupReq(
                fullName = fullName,
                businessName = businessName,
                phone = phone,
                email = email,
                kraPin = kraPin,
                password = password,
                bankDetails = bankDetails,
                services = services,
                documents = uploaded,
            ),
        ).unwrap()
        session.save(result)
        return result
    }

    /** Presign + PUT a document to S3; returns the object key, or null on any failure. */
    private suspend fun uploadDocument(doc: DocumentUpload): String? = runCatching {
        val signed = api.signUpload(UploadSignReq(doc.filename, doc.mime, doc.bytes.size.toLong())).unwrap()
        withContext(Dispatchers.IO) {
            val req = Request.Builder()
                .url(signed.url)
                .put(doc.bytes.toRequestBody(doc.mime.toMediaTypeOrNull()))
                .build()
            uploadClient.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) throw ApiException("upload failed ${resp.code}")
            }
        }
        signed.key
    }.getOrNull()

    // --- provider self-service ----------------------------------------------
    suspend fun dashboard(): ProviderDashboard = api.dashboard().unwrap()

    suspend fun providerMe(): ProviderProfile = api.providerMe().unwrap()

    suspend fun earnings(): ProviderEarnings = api.earnings().unwrap()

    /** Toggle availability (Accepting New Requests). Returns the resulting online flag. */
    suspend fun setOnline(online: Boolean): Boolean =
        api.setOnline(OnlineReq(online)).data?.online ?: online

    /** Push the current GPS fix while a job is being delivered (fire-and-forget). */
    suspend fun updateLocation(lat: Double, lng: Double) {
        api.updateLocation(LocationReq(lat, lng))
    }

    // --- jobs ---------------------------------------------------------------
    /** New, unassigned broadcast jobs this provider can accept. */
    suspend fun availableJobs(): List<Job> = api.availableJobs().unwrap()

    /** A single available job (the API has no per-id endpoint pre-accept). */
    suspend fun availableJob(id: Long): Job? = availableJobs().firstOrNull { it.id == id }

    /** The provider's own job cards (any state). */
    suspend fun myJobs(): List<Job> = api.myJobs().unwrap()

    suspend fun myJob(id: Long): Job? = myJobs().firstOrNull { it.id == id }

    /** Accept & propose availability (first-come). [scheduledAt] is an ISO datetime. */
    suspend fun acceptJob(id: Long, scheduledAt: String, note: String?) {
        val res = api.acceptJob(id, AcceptJobReq(scheduledAt, note?.takeIf { it.isNotBlank() }))
        if (!res.success) throw ApiException(res.message ?: "Could not accept this job")
    }

    suspend fun declineJob(id: Long) {
        api.declineJob(id)
    }

    /** Generate the two proforma invoices; returns the amount breakdown. */
    suspend fun promptPayment(id: Long): PromptPaymentResult = api.promptPayment(id).unwrap()

    /** Advance a job: en_route → arrived → in_progress → completed. */
    suspend fun jobStatus(id: Long, to: String, note: String? = null) {
        val res = api.jobStatus(id, JobStatusReq(to, note))
        if (!res.success) throw ApiException(res.message ?: "Could not update the job")
    }

    // --- notifications ------------------------------------------------------
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

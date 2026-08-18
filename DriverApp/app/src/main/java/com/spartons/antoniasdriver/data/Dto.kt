package com.spartons.antoniasdriver.data

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

/** Standard API envelope: { status, status_code, success, message, data }. */
data class ApiResponse<T>(
    val success: Boolean = false,
    val message: String? = null,
    val data: T? = null,
)

// --- notifications ----------------------------------------------------------
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

// --- auth -------------------------------------------------------------------
data class AuthUser(
    val id: Long,
    val uuid: String?,
    val phone: String,
    @SerializedName("display_name") val displayName: String,
    @SerializedName("avatar_url") val avatarUrl: String?,
    val roles: List<String> = emptyList(),
    @SerializedName("must_change_password") val mustChangePassword: Boolean = false,
)

data class AuthResult(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    val user: AuthUser,
)

// --- provider dashboard (GET /providers/dashboard) --------------------------

/** One approved service line: category [key], display [name], per-service provider [code]. */
data class ProviderService(
    val key: String?,                                   // geologist, drillers, ...
    val name: String?,                                  // Hydrogeological Survey
    val code: String?,                                  // SDGEO00001 (null until verified)
    val active: Boolean = false,
    val rating: Double? = null,
)

data class ProviderMetrics(
    @SerializedName("services_registered") val servicesRegistered: Int = 0,
    @SerializedName("active_requests") val activeRequests: Int = 0,
    @SerializedName("completed_jobs") val completedJobs: Int = 0,
    @SerializedName("average_rating") val averageRating: Double = 0.0,
)

data class ProviderReadiness(
    @SerializedName("profile_complete") val profileComplete: Boolean = false,
    @SerializedName("documents_verified") val documentsVerified: Boolean = false,
    @SerializedName("bank_verified") val bankVerified: Boolean = false,
    @SerializedName("accepting_requests") val acceptingRequests: Boolean = false,
    val ready: Boolean = false,
) {
    /** Readiness percentage from the four verification checks. */
    val percent: Int
        get() = (listOf(profileComplete, documentsVerified, bankVerified, acceptingRequests)
            .count { it } * 100) / 4
}

/** Earnings totals (numbers server-side; Gson coerces to String for formatting). */
data class EarningsTotals(
    @SerializedName("this_month") val thisMonth: String? = null,
    val lifetime: String? = null,
    val pending: String? = null,
)

data class ProviderDashboard(
    val name: String? = null,
    @SerializedName("business_name") val businessName: String? = null,
    val phone: String? = null,
    @SerializedName("verification_status") val verificationStatus: String? = null,
    @SerializedName("accepting_requests") val acceptingRequests: Boolean = false,
    val services: List<ProviderService> = emptyList(),
    val metrics: ProviderMetrics? = null,
    val earnings: EarningsTotals? = null,
    val readiness: ProviderReadiness? = null,
)

/** Provider self-profile (GET /providers/me) — one listing row; used for contact details. */
data class ProviderProfile(
    @SerializedName("user_id") val userId: Long? = null,
    @SerializedName("display_name") val displayName: String? = null,
    val phone: String? = null,
    val category: String? = null,
    val availability: String? = null,
    @SerializedName("rating_avg") val ratingAvg: String? = null,
)

// --- earnings tab (GET /providers/earnings) ---------------------------------
data class Payout(
    val id: Long,
    @SerializedName("booking_id") val bookingId: Long?,
    @SerializedName("request_no") val requestNo: String?,
    val service: String?,
    val kind: String?,                                  // advance / balance / ...
    val amount: String?,
    val status: String?,                                // held / released / paid
    val ref: String?,
    val date: String?,
)

data class ProviderEarnings(
    val totals: EarningsTotals? = null,
    val payouts: List<Payout> = emptyList(),
)

// --- jobs (GET /jobs available, GET /jobs/mine) -----------------------------

/**
 * A job from the provider's perspective. The available (broadcast) list hides the
 * customer phone until the job is accepted; /jobs/mine includes it. Amounts arrive
 * as decimal strings; [details] is the customer's per-service form blob.
 */
data class Job(
    val id: Long,
    @SerializedName("request_no") val requestNo: String?,
    val status: String,
    val category: String?,                              // service key
    @SerializedName("service_name") val serviceName: String?,
    @SerializedName("customer_name") val customerName: String?,
    @SerializedName("customer_phone") val customerPhone: String?,
    val address: String?,
    val lat: String?,
    val lng: String?,
    @SerializedName("scheduled_at") val scheduledAt: String?,   // ISO datetime
    @SerializedName("contacted_at") val contactedAt: String?,   // set when provider marked customer contacted
    @SerializedName("pricing_mode") val pricingMode: String?,   // fixed / quote
    @SerializedName("total_amount") val totalAmount: String?,
    @SerializedName("quoted_amount") val quotedAmount: String?,
    @SerializedName("amount_paid") val amountPaid: String?,
    @SerializedName("created_at") val createdAt: String?,
    val details: JsonElement? = null,
) {
    /** Service fee to charge the customer: a quote overrides the catalog rate. */
    val feeAmount: String? get() = quotedAmount?.takeIf { it.isNotBlank() && it != "0" && it != "0.00" } ?: totalAmount

    /** Provider earnings after the 10% SMART Drill commission. */
    val earningsAmount: Double get() = (feeAmount?.toDoubleOrNull() ?: 0.0) * 0.90
    val commissionAmount: Double get() = (feeAmount?.toDoubleOrNull() ?: 0.0) * 0.10
}

/** A deliverable uploaded against a job (report, etims_invoice, photos, ...). */
data class JobDocument(
    val id: Long = 0,
    val kind: String,
    val url: String,
    @SerializedName("created_at") val createdAt: String? = null,
)

/** Result of POST /jobs/:id/prompt-payment (numbers → String via Gson). */
data class PromptPaymentResult(
    @SerializedName("customer_amount") val customerAmount: String? = null,
    @SerializedName("provider_amount") val providerAmount: String? = null,
    val commission: String? = null,
)

data class OnlineState(val online: Boolean = false)

// --- provider KPI rating (GET /providers/kpi) -------------------------------
data class KpiWeights(
    val acceptance: Int = 10, val contact: Int = 20, val arrival: Int = 40,
    val completion: Int = 10, val feedback: Int = 20,
)
data class KpiSummary(
    @SerializedName("kpi_avg") val kpiAvg: String? = null,
    val jobs: Int = 0,
    val acceptance: String? = null, val contact: String? = null, val arrival: String? = null,
    val completion: String? = null, val feedback: String? = null,
)
data class KpiJob(
    @SerializedName("booking_id") val bookingId: Long = 0,
    @SerializedName("request_no") val requestNo: String? = null,
    val service: String? = null,
    val overall: String? = null,
    @SerializedName("acceptance_pct") val acceptancePct: String? = null,
    @SerializedName("contact_pct") val contactPct: String? = null,
    @SerializedName("arrival_pct") val arrivalPct: String? = null,
    @SerializedName("completion_pct") val completionPct: String? = null,
    @SerializedName("feedback_pct") val feedbackPct: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
)
data class ProviderKpi(
    val weights: KpiWeights = KpiWeights(),
    val summary: KpiSummary? = null,
    val jobs: List<KpiJob> = emptyList(),
)

// --- uploads (local-disk upload result) -------------------------------------
data class UploadResult(
    val url: String,
    val filename: String? = null,
)

/** One statutory document selected for upload during sign-up. */
data class DocumentUpload(
    val kind: String,                                   // certificate_of_incorporation, cr12, ...
    val filename: String,
    val mime: String,
    val bytes: ByteArray,
)

// --- request bodies ---------------------------------------------------------
data class LoginReq(val phone: String, val password: String)
data class RefreshReq(@SerializedName("refresh_token") val refreshToken: String)
data class OnlineReq(val online: Boolean)
data class LocationReq(val lat: Double, val lng: Double)
data class DeviceTokenReq(val token: String, val platform: String = "android")
data class ResetPasswordReq(val phone: String)
data class ChangePasswordReq(val current: String, val next: String)

data class AcceptJobReq(
    @SerializedName("scheduled_at") val scheduledAt: String,
    val note: String? = null,
)
data class JobStatusReq(val to: String, val note: String? = null)
data class JobDocumentReq(val kind: String, val url: String)

data class SignupDoc(val kind: String, val url: String)

data class ProviderSignupReq(
    @SerializedName("full_name") val fullName: String,
    @SerializedName("business_name") val businessName: String,
    val phone: String,
    val email: String,
    @SerializedName("kra_pin") val kraPin: String,
    val password: String,
    @SerializedName("bank_details") val bankDetails: String? = null,
    val services: List<String>,
    val documents: List<SignupDoc> = emptyList(),
)


package com.spartons.antoniasdriver.ui.components

import androidx.compose.ui.graphics.Color
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.DangerRed
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.WarningAmber

/**
 * Provider-side booking lifecycle (backend vocabulary):
 * submitted (broadcast) → pending_payment (accepted, awaiting customer payment) →
 * booked (customer paid → Confirmed) → en_route → arrived → in_progress →
 * completed (submitted for Ops QA) → confirmed (verified). Terminal: cancelled.
 */
object JobStatus {
    const val SUBMITTED = "submitted"        // broadcast, unassigned
    const val PENDING_PAYMENT = "pending_payment"
    const val BOOKED = "booked"              // customer paid → "Confirmed"
    const val EN_ROUTE = "en_route"
    const val ARRIVED = "arrived"
    const val IN_PROGRESS = "in_progress"
    const val COMPLETED = "completed"        // work submitted, awaiting Ops verification
    const val CONFIRMED = "confirmed"        // Ops-verified, closed
    const val CANCELLED = "cancelled"

    /** Jobs still needing provider attention (Upcoming tab + active counters). */
    val UPCOMING = setOf(PENDING_PAYMENT, BOOKED, EN_ROUTE, ARRIVED, IN_PROGRESS)
    val DONE = setOf(COMPLETED, CONFIRMED)

    /** Statuses that carry a live countdown to the scheduled service datetime. */
    val COUNTDOWN = setOf(BOOKED, EN_ROUTE, ARRIVED, IN_PROGRESS)
}

/** Human label for a status pill. */
fun statusLabel(status: String?): String = when (status) {
    JobStatus.SUBMITTED -> "New Request"
    JobStatus.PENDING_PAYMENT -> "Awaiting Payment"
    JobStatus.BOOKED -> "Confirmed"
    JobStatus.EN_ROUTE -> "On the Way"
    JobStatus.ARRIVED -> "On Site"
    JobStatus.IN_PROGRESS -> "In Progress"
    JobStatus.COMPLETED -> "Under Review"
    JobStatus.CONFIRMED -> "Completed"
    JobStatus.CANCELLED -> "Cancelled"
    else -> (status ?: "").replace('_', ' ').split(' ')
        .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
}

/** Accent colour for a status pill / chip. */
fun statusColor(status: String?): Color = when (status) {
    JobStatus.SUBMITTED, JobStatus.BOOKED, JobStatus.ARRIVED, JobStatus.IN_PROGRESS -> BrandBlue
    JobStatus.PENDING_PAYMENT, JobStatus.EN_ROUTE, JobStatus.COMPLETED -> WarningAmber
    JobStatus.CONFIRMED -> SuccessGreen
    JobStatus.CANCELLED -> DangerRed
    else -> MutedGrey
}

/** The five-milestone JOB PROGRESS stepper labels. */
val JOB_PROGRESS_STEPS = listOf("Matched", "Payment Received", "On the Way", "Completed", "Verified")

/** How far along the 5-step progress stepper a status is (highest reached milestone). */
fun jobProgressIndex(status: String?): Int = when (status) {
    JobStatus.SUBMITTED, JobStatus.PENDING_PAYMENT -> 0
    JobStatus.BOOKED -> 1
    JobStatus.EN_ROUTE, JobStatus.ARRIVED, JobStatus.IN_PROGRESS -> 2
    JobStatus.COMPLETED -> 3
    JobStatus.CONFIRMED -> 4
    else -> 0
}

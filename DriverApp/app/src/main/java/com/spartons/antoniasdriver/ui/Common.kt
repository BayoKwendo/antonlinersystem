package com.spartons.antoniasdriver.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

fun money(value: String?): String {
    val n = value?.toDoubleOrNull() ?: 0.0
    return "KES " + moneyPlain(n)
}

/** Amount with thousands separators, no currency prefix (e.g. 55,000). */
fun moneyPlain(value: String?): String = moneyPlain(value?.toDoubleOrNull() ?: 0.0)

private fun moneyPlain(n: Double): String =
    if (n % 1.0 == 0.0) String.format("%,d", n.toLong()) else String.format("%,.2f", n)

fun titleCase(s: String): String =
    s.replace('_', ' ').split(' ').joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }

/** Coarse relative time ("just now", "5m ago", "3h ago", "2d ago") from an ISO instant. */
fun timeAgo(iso: String?): String {
    val millis = com.spartons.antoniasdriver.ui.components.parseIsoToMillis(iso) ?: return ""
    val diff = System.currentTimeMillis() - millis
    if (diff < 0) return "soon"
    val mins = diff / 60_000
    val hrs = mins / 60
    val days = hrs / 24
    return when {
        mins < 1 -> "just now"
        mins < 60 -> "${mins}m ago"
        hrs < 24 -> "${hrs}h ago"
        days < 7 -> "${days}d ago"
        else -> "${days / 7}w ago"
    }
}

/** Up to two uppercase initials from a display name (falls back to "?"). */
fun initials(name: String?): String {
    val parts = name?.trim()?.split(Regex("\\s+"))?.filter { it.isNotBlank() }.orEmpty()
    return when {
        parts.isEmpty() -> "?"
        parts.size == 1 -> parts[0].take(2).uppercase()
        else -> (parts[0].take(1) + parts[1].take(1)).uppercase()
    }
}

// --- date/time helpers (shared by the availability + schedule pickers) --------
private val DISPLAY_DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy")
private val API_DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd")

private fun localDate(millis: Long) = Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()

/** Epoch millis → "yyyy-MM-dd" for the API. */
fun apiDate(millis: Long): String = localDate(millis).format(API_DATE_FMT)

/** Epoch millis → "09 Aug 2026" for display. */
fun displayDate(millis: Long): String = localDate(millis).format(DISPLAY_DATE_FMT)

/** 24h hour/minute → "10:00 AM". */
fun clockLabel(hour: Int, minute: Int): String {
    val h12 = when { hour == 0 -> 12; hour > 12 -> hour - 12; else -> hour }
    val ampm = if (hour < 12) "AM" else "PM"
    return "%d:%02d %s".format(h12, minute, ampm)
}

private val PRETTY_DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy")
private val PRETTY_TIME_FMT = DateTimeFormatter.ofPattern("h:mm a")

private fun zoned(iso: String?) =
    com.spartons.antoniasdriver.ui.components.parseIsoToMillis(iso)?.let {
        Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault())
    }

/** ISO datetime → "09 Aug 2026" (or null). */
fun prettyDate(iso: String?): String? = zoned(iso)?.format(PRETTY_DATE_FMT)

/** ISO datetime → "10:00 AM" (or null). */
fun prettyTime(iso: String?): String? = zoned(iso)?.format(PRETTY_TIME_FMT)

/**
 * Build a readable "customer requirements" string from a job's per-service
 * details blob: joins non-empty string values, skipping internal (`__…`) keys.
 */
fun requirementsText(details: com.google.gson.JsonElement?): String? {
    val obj = details?.takeIf { it.isJsonObject }?.asJsonObject ?: return null
    val parts = obj.entrySet()
        .filterNot { it.key.startsWith("__") }
        .mapNotNull { e ->
            val v = e.value
            val s = if (v != null && v.isJsonPrimitive) v.asString else null
            s?.takeIf { it.isNotBlank() }
        }
    return parts.joinToString(" · ").takeIf { it.isNotBlank() }
}

/** Open the dialer pre-filled with [phone]. */
fun dial(context: Context, phone: String) {
    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
}

/** Open the SMS app addressed to [phone]. */
fun sms(context: Context, phone: String) {
    context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:$phone")))
}

/** Open Google Maps at the given coordinates. */
fun openMap(context: Context, lat: Double, lng: Double, label: String? = null) {
    val q = if (label != null) "$lat,$lng($label)" else "$lat,$lng"
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:$lat,$lng?q=${Uri.encode(q)}"))
    context.startActivity(intent)
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
}

@Composable
fun MessageBox(text: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) { Text(text) }
}

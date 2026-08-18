package com.spartons.antoniasdriver.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import java.time.Instant
import java.time.format.DateTimeFormatter

/**
 * Best-effort parse to epoch millis of an ISO-8601 instant, an ISO local datetime,
 * or MySQL's "yyyy-MM-dd HH:mm:ss" (space-separated) datetime.
 */
fun parseIsoToMillis(iso: String?): Long? {
    if (iso.isNullOrBlank()) return null
    val normalized = if (iso.length > 10 && iso[10] == ' ') iso.replaceFirst(' ', 'T') else iso
    return runCatching { Instant.parse(normalized).toEpochMilli() }
        .recoverCatching {
            java.time.LocalDateTime.parse(normalized, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                .atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        }
        .recoverCatching {
            java.time.LocalDate.parse(normalized.take(10), DateTimeFormatter.ISO_LOCAL_DATE)
                .atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        }
        .getOrNull()
}

/**
 * Live countdown to a service date, rendered as Days · Hrs · Mins · Secs.
 * Ticks every second; shows a "Due" message once the target has passed.
 */
@Composable
fun CountdownTimer(targetMillis: Long?, modifier: Modifier = Modifier, compact: Boolean = false) {
    if (targetMillis == null) {
        Text("Scheduled", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = modifier)
        return
    }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(targetMillis) {
        while (true) {
            now = System.currentTimeMillis()
            delay(1000)
        }
    }
    val remaining = targetMillis - now
    if (remaining <= 0) {
        Text("Due now", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = modifier, fontWeight = FontWeight.SemiBold)
        return
    }
    val totalSecs = remaining / 1000
    val days = totalSecs / 86_400
    val hrs = (totalSecs % 86_400) / 3_600
    val mins = (totalSecs % 3_600) / 60
    val secs = totalSecs % 60

    Row(modifier, horizontalArrangement = Arrangement.spacedBy(if (compact) 6.dp else 10.dp)) {
        CountUnit(days, "Days", compact)
        CountUnit(hrs, "Hrs", compact)
        CountUnit(mins, "Mins", compact)
        CountUnit(secs, "Secs", compact)
    }
}

@Composable
private fun CountUnit(value: Long, label: String, compact: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            value.toString().padStart(2, '0'),
            style = if (compact) MaterialTheme.typography.titleSmall else MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

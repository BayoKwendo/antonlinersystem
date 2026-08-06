package com.spartons.antoniasdriver.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spartons.antoniasdriver.ui.theme.HairlineGrey
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey

/** White rounded card used as the base surface across the redesign. */
@Composable
fun SmartCard(
    modifier: Modifier = Modifier,
    padding: Int = 16,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, HairlineGrey),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(padding.dp), content = content)
    }
}

/** Section title with an optional trailing action (e.g. "View All"). */
@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        action?.invoke()
    }
}

/** Circular tinted badge holding an icon. */
@Composable
fun IconCircle(icon: ImageVector, tint: Color, modifier: Modifier = Modifier, diameter: Int = 40) {
    Box(
        modifier
            .size(diameter.dp)
            .clip(CircleShape)
            .background(tint.copy(alpha = 0.12f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size((diameter * 0.55).dp))
    }
}

/** One of the four headline dashboard counters (icon + value + label). */
@Composable
fun RowScope.MetricTile(icon: ImageVector, value: String, label: String, tint: Color) {
    SmartCard(modifier = Modifier.weight(1f), padding = 12) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        Spacer(Modifier.height(6.dp))
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = InkBlack)
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MutedGrey,
            textAlign = TextAlign.Start,
        )
    }
}

/** A small coloured status/label pill. */
@Composable
fun Pill(text: String, color: Color, modifier: Modifier = Modifier) {
    Box(
        modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.14f))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(text, color = color, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
    }
}

/** Status pill driven by the booking status vocabulary. */
@Composable
fun StatusChip(status: String?, modifier: Modifier = Modifier) =
    Pill(statusLabel(status), statusColor(status), modifier)

/** label (left, muted) + value (right, ink) row used in summaries. */
@Composable
fun InfoRow(
    label: String,
    value: String,
    valueColor: Color = InkBlack,
    valueWeight: FontWeight = FontWeight.Medium,
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MutedGrey)
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = valueColor,
            fontWeight = valueWeight,
            textAlign = TextAlign.End,
        )
    }
}

/** Small stacked label + value block (used in horizontal summary strips). */
@Composable
fun LabeledValue(label: String, value: String, modifier: Modifier = Modifier, valueColor: Color = InkBlack) {
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MutedGrey)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = valueColor)
    }
}

/** Muted uppercase mini-heading (e.g. "JOB PROGRESS", "JOB SUMMARY"). */
@Composable
fun MiniHeading(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier,
        style = MaterialTheme.typography.labelMedium,
        color = MutedGrey,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
    )
}

package com.spartons.antoniasdriver.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.WorkOutline
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
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.HairlineGrey
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.SuccessGreen

private val STEP_ICONS = listOf(
    Icons.Filled.Check,        // Matched
    Icons.Filled.Payments,     // Payment Received
    Icons.Filled.DirectionsCar,// On the Way
    Icons.Filled.WorkOutline,  // Completed
    Icons.Filled.Star,         // Verified
)

/**
 * The five-milestone JOB PROGRESS stepper. Nodes before [currentIndex] read as
 * done (green check), the node at [currentIndex] is the active step (blue), and
 * later nodes are upcoming (grey).
 */
@Composable
fun ProgressStepper(currentIndex: Int, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        JOB_PROGRESS_STEPS.forEachIndexed { i, label ->
            val done = i < currentIndex
            val current = i == currentIndex
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Connector(visible = i != 0, active = i <= currentIndex, modifier = Modifier.weight(1f))
                    StepNode(icon = if (done) Icons.Filled.Check else STEP_ICONS[i], done = done, current = current)
                    Connector(visible = i != JOB_PROGRESS_STEPS.lastIndex, active = i < currentIndex, modifier = Modifier.weight(1f))
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (i <= currentIndex) InkBlack else MutedGrey,
                    fontWeight = if (current) FontWeight.SemiBold else FontWeight.Normal,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun Connector(visible: Boolean, active: Boolean, modifier: Modifier) {
    Box(
        modifier
            .height(2.dp)
            .background(
                when {
                    !visible -> Color.Transparent
                    active -> SuccessGreen
                    else -> HairlineGrey
                },
            ),
    )
}

@Composable
private fun StepNode(icon: ImageVector, done: Boolean, current: Boolean) {
    val bg = when {
        done -> SuccessGreen
        current -> BrandBlue
        else -> Color.White
    }
    val fg = if (done || current) Color.White else MutedGrey
    Box(
        Modifier
            .size(34.dp)
            .clip(CircleShape)
            .background(bg)
            .then(if (!done && !current) Modifier.border(1.5.dp, HairlineGrey, CircleShape) else Modifier),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = fg, modifier = Modifier.size(18.dp))
    }
}

package com.spartons.antoniasdriver.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.HairlineGrey
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.SuccessGreen

/** A statutory-document upload row for the sign-up screen. */
@Composable
fun DocumentUploadRow(
    title: String,
    icon: ImageVector,
    selectedName: String?,
    onPick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val picked = selectedName != null
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, if (picked) SuccessGreen else HairlineGrey),
    ) {
        Row(
            Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconCircle(icon = if (picked) Icons.Filled.CheckCircle else icon, tint = if (picked) SuccessGreen else BrandBlue, diameter = 38)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = InkBlack)
                Text(
                    selectedName ?: "PDF, PNG or JPG (Max 5MB)",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (picked) SuccessGreen else MutedGrey,
                )
            }
            TextButton(onClick = onPick) {
                Icon(Icons.Filled.CloudUpload, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(4.dp))
                Text(if (picked) "Change" else "Upload")
            }
        }
    }
}

/** A selectable service row for the sign-up "Services Offered" picker. */
@Composable
fun ServiceCheckbox(
    service: ServiceDef,
    checked: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.clickable(onClick = onToggle),
        shape = RoundedCornerShape(12.dp),
        color = if (checked) BrandBlue.copy(alpha = 0.06f) else MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, if (checked) BrandBlue else HairlineGrey),
    ) {
        Row(
            Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(service.icon, null, tint = BrandBlue, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(8.dp))
            Text(
                service.label,
                style = MaterialTheme.typography.labelLarge,
                color = InkBlack,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
            )
            Checkbox(checked = checked, onCheckedChange = { onToggle() })
        }
    }
}

/** One row of the "Provider Readiness" checklist. */
@Composable
fun ReadinessRow(label: String, done: Boolean, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(20.dp),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                if (done) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                null,
                tint = if (done) SuccessGreen else MutedGrey,
                modifier = Modifier.size(20.dp),
            )
        }
        Spacer(Modifier.width(10.dp))
        Text(label, style = MaterialTheme.typography.bodyMedium, color = if (done) InkBlack else MutedGrey)
    }
}

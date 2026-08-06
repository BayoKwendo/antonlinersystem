package com.spartons.antoniasdriver.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Construction
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Handyman
import androidx.compose.material.icons.filled.Plumbing
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Terrain
import androidx.compose.material.icons.filled.Work
import androidx.compose.ui.graphics.vector.ImageVector

/** A SmartDrill service line: catalog [code] (the backend service key), label and icon. */
data class ServiceDef(val code: String, val label: String, val icon: ImageVector)

/**
 * The seven services a provider can offer. [code] is the backend service-category
 * key sent at sign-up (e.g. "geologist"); the per-service provider ID (SDGEO00001)
 * is minted on verification and shown separately. Used by the sign-up picker, the
 * dashboard "My Services" cards, and request/job service labels.
 */
object ServiceCatalog {
    val all = listOf(
        ServiceDef("geologist", "Hydrogeological Survey", Icons.Filled.Terrain),
        ServiceDef("drillers", "Borehole Drilling", Icons.Filled.Construction),
        ServiceDef("test_pump", "Test Pumping", Icons.Filled.Speed),
        ServiceDef("surveys", "Water Quality Analysis", Icons.Filled.Science),
        ServiceDef("pump_installer", "Borehole Equipping", Icons.Filled.Plumbing),
        ServiceDef("tank_installation", "Borehole Maintenance", Icons.Filled.Handyman),
        ServiceDef("other_services", "Consultancy in Borehole", Icons.Filled.Groups),
    )

    fun byCode(code: String?): ServiceDef? =
        code?.let { c -> all.firstOrNull { it.code.equals(c, ignoreCase = true) } }

    fun label(code: String?, fallback: String? = null): String =
        byCode(code)?.label ?: fallback?.takeIf { it.isNotBlank() } ?: (code ?: "Service")

    fun icon(code: String?): ImageVector = byCode(code)?.icon ?: Icons.Filled.Work
}

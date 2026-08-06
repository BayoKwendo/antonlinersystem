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

/**
 * A SmartDrill service line: catalog [code] (the backend service key), display
 * [label], [icon], and a short [badge] (e.g. GEO) shown on the sign-up picker.
 */
data class ServiceDef(val code: String, val label: String, val icon: ImageVector, val badge: String = "")

/**
 * The seven services a provider can offer. [code] is the backend service-category
 * key sent at sign-up (e.g. "geologist"); [badge] is the friendly short code shown
 * to users (GEO); the per-service provider ID (SDGEO00001) is minted on
 * verification. Used by the sign-up picker, the dashboard "My Services" cards, and
 * request/job service labels.
 */
object ServiceCatalog {
    val all = listOf(
        ServiceDef("geologist", "Hydrogeological Survey", Icons.Filled.Terrain, "GEO"),
        ServiceDef("drillers", "Borehole Drilling", Icons.Filled.Construction, "BD"),
        ServiceDef("test_pump", "Test Pumping", Icons.Filled.Speed, "TPU"),
        ServiceDef("surveys", "Water Quality Analysis", Icons.Filled.Science, "WQC"),
        ServiceDef("pump_installer", "Borehole Equipping", Icons.Filled.Plumbing, "BEQ"),
        ServiceDef("tank_installation", "Borehole Maintenance", Icons.Filled.Handyman, "BM"),
        ServiceDef("other_services", "Borehole Consultancy", Icons.Filled.Groups, "BCONS"),
    )

    fun byCode(code: String?): ServiceDef? =
        code?.let { c -> all.firstOrNull { it.code.equals(c, ignoreCase = true) } }

    fun label(code: String?, fallback: String? = null): String =
        byCode(code)?.label ?: fallback?.takeIf { it.isNotBlank() } ?: (code ?: "Service")

    fun icon(code: String?): ImageVector = byCode(code)?.icon ?: Icons.Filled.Work
}

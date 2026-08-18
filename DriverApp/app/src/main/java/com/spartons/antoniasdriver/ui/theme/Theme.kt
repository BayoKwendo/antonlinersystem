package com.spartons.antoniasdriver.ui.theme

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// --- SmartDrill Service Provider brand palette (navy) -------------------------
// The redesign moves the app from the old brand red to the SmartDrill navy/blue
// system used across the new Service Provider journey designs. These constants
// are referenced directly by screens for hero sections, status chips and CTAs.
val Navy = Color(0xFF0B2A5B)        // deep navy — headers, hero sections, top bars
val NavyDark = Color(0xFF071E42)    // darker navy — gradient bottom / status bar
val BrandBlue = Color(0xFF1E5BC6)   // primary CTA / links / active accents
val BrandBlueLight = Color(0xFFE8F0FE)
val SuccessGreen = Color(0xFF1E9E5A)
val SuccessGreenLight = Color(0xFFE6F6EC)
val WarningAmber = Color(0xFFF5A623)
val WarningAmberLight = Color(0xFFFDF1DD)
val DangerRed = Color(0xFFE23B3B)
val DangerRedLight = Color(0xFFFDE8E8)
// Neutral roles are theme-aware: screens reference these names directly and they
// now resolve to the ACTIVE color scheme, so body text, secondary text, dividers
// and screen backgrounds stay legible in dark mode. (Raw light/dark hex values
// live in the two schemes below.)
val InkBlack: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.onSurface
val MutedGrey: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.onSurfaceVariant
val HairlineGrey: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.outlineVariant
val CanvasGrey: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.background

// Fixed-dark text for content that sits on a *Light pastel banner/badge. Those
// pastels stay light in BOTH themes (they double as icon-holder tints), so text
// placed on them must stay dark in both themes rather than follow the scheme.
val InkOnTint = Color(0xFF0F1B2D)
val MutedOnTint = Color(0xFF5B6472)

private val LightColors = lightColorScheme(
    primary = BrandBlue,
    onPrimary = Color.White,
    primaryContainer = BrandBlueLight,
    onPrimaryContainer = Navy,
    secondary = Navy,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFDCE6F7),
    onSecondaryContainer = NavyDark,
    tertiary = SuccessGreen,
    onTertiary = Color.White,
    background = Color(0xFFF4F6FA),
    onBackground = Color(0xFF0F1B2D),
    surface = Color.White,
    onSurface = Color(0xFF0F1B2D),
    surfaceVariant = Color(0xFFF0F3F8),
    onSurfaceVariant = Color(0xFF6B7280),
    outline = Color(0xFFE5E9F0),
    outlineVariant = Color(0xFFE5E9F0),
    error = DangerRed,
    onError = Color.White,
)

// Dark mode: keep the brand blue legible on navy-tinted dark surfaces.
private val DarkColors = darkColorScheme(
    primary = Color(0xFF7FA8F0),
    onPrimary = NavyDark,
    primaryContainer = Navy,
    onPrimaryContainer = Color(0xFFDCE6F7),
    secondary = Color(0xFFAFC6EE),
    onSecondary = NavyDark,
    secondaryContainer = Navy,
    onSecondaryContainer = Color(0xFFDCE6F7),
    tertiary = Color(0xFF7FD6A2),
    onTertiary = Color(0xFF04371C),
    background = Color(0xFF0C1420),
    onBackground = Color(0xFFE6EAF1),
    surface = Color(0xFF121C2B),
    onSurface = Color(0xFFE6EAF1),
    surfaceVariant = Color(0xFF1B2636),
    onSurfaceVariant = Color(0xFF9AA6B8),
    outline = Color(0xFF2A374B),
    outlineVariant = Color(0xFF2A374B),
    error = Color(0xFFFF9A9A),
    onError = Color(0xFF4A0A0A),
)

@Composable
fun AntonLinerDriverTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors

    // Brand the status bar: the bars are transparent under edge-to-edge, so we
    // paint a navy scrim behind the status-bar inset (below) and force the
    // status-bar icons white for contrast on navy, in both light and dark mode.
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colors,
        typography = MaterialTheme.typography,
    ) {
        Box(Modifier.fillMaxSize()) {
            content()
            // Navy scrim sized exactly to the status-bar inset, drawn on top so the
            // status bar reads brand-navy on every screen (with or without an app bar).
            Spacer(
                Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .windowInsetsTopHeight(WindowInsets.statusBars)
                    .background(Navy),
            )
        }
    }
}

package com.spartons.antoniasdriver.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Driver app shares the AntonLiner teal but leans on a warm "on duty" accent to
// distinguish it from the customer app at a glance.
private val Brand = Color(0xFF007A7C)
private val Accent = Color(0xFFF59E0B)
private val AccentDark = Color(0xFFFBBF24)

private val LightColors = lightColorScheme(
    primary = Brand,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD3F1F1),
    onPrimaryContainer = Color(0xFF00201F),
    secondary = Accent,
    onSecondary = Color(0xFF3A2A00),
    background = Color(0xFFF6FBFB),
    surface = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF46B8B9),
    onPrimary = Color(0xFF00201F),
    secondary = AccentDark,
)

@Composable
fun AntonLinerDriverTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        typography = MaterialTheme.typography,
        content = content,
    )
}

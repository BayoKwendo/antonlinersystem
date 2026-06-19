package com.spartons.antonis.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Brand = Color(0xFF007A7C)
private val BrandDark = Color(0xFF0C8D8E)
private val Accent = Color(0xFF46B8B9)

private val LightColors = lightColorScheme(
    primary = Brand,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD3F1F1),
    onPrimaryContainer = Color(0xFF00201F),
    secondary = Accent,
    background = Color(0xFFF6FBFB),
    surface = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = Accent,
    onPrimary = Color(0xFF00201F),
    secondary = BrandDark,
)

@Composable
fun AntonLinerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        typography = MaterialTheme.typography,
        content = content,
    )
}

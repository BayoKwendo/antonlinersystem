package com.spartons.antonis.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

data class Country(val name: String, val dial: String, val flag: String)

/** Common dial codes (East/Central/West Africa first); Kenya is the default. */
val COUNTRIES = listOf(
    Country("Kenya", "254", "🇰🇪"),
    Country("Uganda", "256", "🇺🇬"),
    Country("Tanzania", "255", "🇹🇿"),
    Country("Rwanda", "250", "🇷🇼"),
    Country("Burundi", "257", "🇧🇮"),
    Country("South Sudan", "211", "🇸🇸"),
    Country("Ethiopia", "251", "🇪🇹"),
    Country("Somalia", "252", "🇸🇴"),
    Country("DR Congo", "243", "🇨🇩"),
    Country("Nigeria", "234", "🇳🇬"),
    Country("Ghana", "233", "🇬🇭"),
    Country("South Africa", "27", "🇿🇦"),
    Country("United Kingdom", "44", "🇬🇧"),
    Country("United States", "1", "🇺🇸"),
)

/**
 * Phone input with a country-code dropdown. Emits the full international MSISDN
 * (digits only, e.g. "254712345678") via [onPhoneChange] — the local part's
 * leading zero is dropped automatically.
 */
@Composable
fun PhoneField(
    onPhoneChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "Phone number",
    initialDial: String = "254",
) {
    var country by remember { mutableStateOf(COUNTRIES.firstOrNull { it.dial == initialDial } ?: COUNTRIES[0]) }
    var local by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }

    // Full MSISDN is capped at 12 digits (e.g. 254 + 9 local digits).
    val maxLocal = (12 - country.dial.length).coerceAtLeast(0)
    fun emit() = onPhoneChange(country.dial + local.trimStart('0'))

    Row(verticalAlignment = Alignment.CenterVertically, modifier = modifier) {
        Box {
            OutlinedButton(
                onClick = { expanded = true },
                contentPadding = PaddingValues(horizontal = 12.dp),
                modifier = Modifier.height(56.dp),
            ) {
                Text("${country.flag} +${country.dial}")
                Icon(Icons.Default.ArrowDropDown, contentDescription = "Choose country")
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                COUNTRIES.forEach { c ->
                    DropdownMenuItem(
                        text = { Text("${c.flag}  ${c.name}  +${c.dial}") },
                        onClick = {
                            country = c
                            local = local.take((12 - c.dial.length).coerceAtLeast(0))
                            expanded = false
                            emit()
                        },
                    )
                }
            }
        }
        Spacer(Modifier.width(8.dp))
        OutlinedTextField(
            value = local,
            onValueChange = { local = it.filter(Char::isDigit).take(maxLocal); emit() },
            label = { Text(label) },
            placeholder = { Text("7XX XXX XXX") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.weight(1f),
        )
    }
}

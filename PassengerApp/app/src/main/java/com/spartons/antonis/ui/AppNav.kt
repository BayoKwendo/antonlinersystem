package com.spartons.antonis.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.spartons.antonis.ui.auth.AuthScreen
import com.spartons.antonis.ui.booking.BookScreen
import com.spartons.antonis.ui.booking.BookingsScreen
import com.spartons.antonis.ui.booking.TrackScreen
import com.spartons.antonis.ui.home.HomeScreen
import com.spartons.antonis.ui.notifications.NotificationsScreen

@Composable
fun AppNav(startLoggedIn: Boolean) {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = if (startLoggedIn) "home" else "auth") {
        composable("auth") {
            AuthScreen(onLoggedIn = {
                nav.navigate("home") { popUpTo("auth") { inclusive = true } }
            })
        }
        composable("home") {
            HomeScreen(
                onProvider = { nav.navigate("book/$it") },
                onBookings = { nav.navigate("bookings") },
                onNotifications = { nav.navigate("notifications") },
                onLoggedOut = { nav.navigate("auth") { popUpTo(0) } },
            )
        }
        composable(
            "book/{providerId}",
            arguments = listOf(navArgument("providerId") { type = NavType.LongType }),
        ) { entry ->
            val id = entry.arguments!!.getLong("providerId")
            BookScreen(
                providerId = id,
                onBooked = { bookingId -> nav.navigate("track/$bookingId") { popUpTo("home") } },
                onBack = { nav.popBackStack() },
            )
        }
        composable("bookings") {
            BookingsScreen(onBooking = { nav.navigate("track/$it") }, onBack = { nav.popBackStack() })
        }
        composable("notifications") {
            NotificationsScreen(onBack = { nav.popBackStack() })
        }
        composable(
            "track/{bookingId}",
            arguments = listOf(navArgument("bookingId") { type = NavType.LongType }),
        ) { entry ->
            TrackScreen(bookingId = entry.arguments!!.getLong("bookingId"), onBack = { nav.popBackStack() })
        }
    }
}

package com.spartons.antoniasdriver.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.spartons.antoniasdriver.ui.auth.LoginScreen
import com.spartons.antoniasdriver.ui.home.HomeScreen
import com.spartons.antoniasdriver.ui.job.JobScreen
import com.spartons.antoniasdriver.ui.notifications.NotificationsScreen

@Composable
fun AppNav(startLoggedIn: Boolean) {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = if (startLoggedIn) "home" else "auth") {
        composable("auth") {
            LoginScreen(onLoggedIn = {
                nav.navigate("home") { popUpTo("auth") { inclusive = true } }
            })
        }
        composable("home") {
            HomeScreen(
                onJob = { nav.navigate("job/$it") },
                onNotifications = { nav.navigate("notifications") },
                onLoggedOut = { nav.navigate("auth") { popUpTo(0) } },
            )
        }
        composable("notifications") {
            NotificationsScreen(onBack = { nav.popBackStack() })
        }
        composable(
            "job/{bookingId}",
            arguments = listOf(navArgument("bookingId") { type = NavType.LongType }),
        ) { entry ->
            JobScreen(
                bookingId = entry.arguments!!.getLong("bookingId"),
                onBack = { nav.popBackStack() },
            )
        }
    }
}

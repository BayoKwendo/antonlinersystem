package com.spartons.antoniasdriver.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.spartons.antoniasdriver.ui.auth.LoginScreen
import com.spartons.antoniasdriver.ui.auth.SignUpScreen
import com.spartons.antoniasdriver.ui.chat.ChatScreen
import com.spartons.antoniasdriver.ui.jobs.JobDetailScreen
import com.spartons.antoniasdriver.ui.jobs.PaymentRequestedScreen
import com.spartons.antoniasdriver.ui.main.MainScaffold
import com.spartons.antoniasdriver.ui.notifications.NotificationsScreen
import com.spartons.antoniasdriver.ui.requests.IncomingRequestScreen
import com.spartons.antoniasdriver.ui.requests.RequestAcceptedScreen
import com.spartons.antoniasdriver.ui.requests.RequestDetailScreen

private object Routes {
    const val LOGIN = "login"
    const val SIGNUP = "signup"
    const val MAIN = "main"
    const val NOTIFICATIONS = "notifications"
    const val REQUEST = "request"          // request/{requestId}
    const val INCOMING = "incoming"        // incoming/{requestId}
    const val REQUEST_ACCEPTED = "request_accepted" // request_accepted/{bookingId}
    const val JOB = "job"                  // job/{bookingId}
    const val PAYMENT_REQUESTED = "payment_requested" // payment_requested/{bookingId}
    const val CHAT = "chat"                // chat/{bookingId}
}

@Composable
fun AppNav(startLoggedIn: Boolean) {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = if (startLoggedIn) Routes.MAIN else Routes.LOGIN) {

        composable(Routes.LOGIN) {
            LoginScreen(
                onLoggedIn = { nav.navigate(Routes.MAIN) { popUpTo(Routes.LOGIN) { inclusive = true } } },
                onSignUp = { nav.navigate(Routes.SIGNUP) },
            )
        }

        composable(Routes.SIGNUP) {
            SignUpScreen(
                onRegistered = { nav.navigate(Routes.MAIN) { popUpTo(0) } },
                onBackToLogin = { nav.popBackStack() },
            )
        }

        composable(Routes.MAIN) {
            MainScaffold(
                onOpenRequest = { nav.navigate("${Routes.REQUEST}/$it") },
                onOpenJob = { nav.navigate("${Routes.JOB}/$it") },
                onNotifications = { nav.navigate(Routes.NOTIFICATIONS) },
                onLoggedOut = { nav.navigate(Routes.LOGIN) { popUpTo(0) } },
            )
        }

        composable(Routes.NOTIFICATIONS) {
            NotificationsScreen(onBack = { nav.popBackStack() })
        }

        composable(
            "${Routes.REQUEST}/{id}",
            arguments = listOf(navArgument("id") { type = NavType.LongType }),
        ) { entry ->
            RequestDetailScreen(
                requestId = entry.arguments!!.getLong("id"),
                onBack = { nav.popBackStack() },
                onAccepted = { bookingId ->
                    nav.navigate("${Routes.REQUEST_ACCEPTED}/$bookingId") { popUpTo(Routes.MAIN) }
                },
            )
        }

        composable(
            "${Routes.INCOMING}/{id}",
            arguments = listOf(navArgument("id") { type = NavType.LongType }),
        ) { entry ->
            IncomingRequestScreen(
                requestId = entry.arguments!!.getLong("id"),
                onReview = { requestId -> nav.navigate("${Routes.REQUEST}/$requestId") { popUpTo(Routes.MAIN) } },
                onDismiss = { nav.popBackStack() },
            )
        }

        composable(
            "${Routes.REQUEST_ACCEPTED}/{id}",
            arguments = listOf(navArgument("id") { type = NavType.LongType }),
        ) { entry ->
            RequestAcceptedScreen(
                bookingId = entry.arguments!!.getLong("id"),
                onViewJob = { jobId -> nav.navigate("${Routes.JOB}/$jobId") { popUpTo(Routes.MAIN) } },
                onDone = { nav.popBackStack(Routes.MAIN, inclusive = false) },
            )
        }

        composable(
            "${Routes.JOB}/{id}",
            arguments = listOf(navArgument("id") { type = NavType.LongType }),
        ) { entry ->
            val id = entry.arguments!!.getLong("id")
            JobDetailScreen(
                bookingId = id,
                onBack = { nav.popBackStack() },
                onPromptPayment = { jobId -> nav.navigate("${Routes.PAYMENT_REQUESTED}/$jobId") },
                onChat = { jobId -> nav.navigate("${Routes.CHAT}/$jobId") },
            )
        }

        composable(
            "${Routes.PAYMENT_REQUESTED}/{id}",
            arguments = listOf(navArgument("id") { type = NavType.LongType }),
        ) { entry ->
            PaymentRequestedScreen(
                bookingId = entry.arguments!!.getLong("id"),
                onViewJob = { jobId -> nav.navigate("${Routes.JOB}/$jobId") { popUpTo(Routes.MAIN) } },
                onDone = { nav.popBackStack(Routes.MAIN, inclusive = false) },
            )
        }

        composable(
            "${Routes.CHAT}/{id}",
            arguments = listOf(navArgument("id") { type = NavType.LongType }),
        ) { entry ->
            ChatScreen(
                bookingId = entry.arguments!!.getLong("id"),
                onBack = { nav.popBackStack() },
            )
        }
    }
}

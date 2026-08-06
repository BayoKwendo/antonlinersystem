package com.spartons.antoniasdriver.ui.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.spartons.antoniasdriver.ui.earnings.EarningsScreen
import com.spartons.antoniasdriver.ui.home.DashboardScreen
import com.spartons.antoniasdriver.ui.jobs.JobsScreen
import com.spartons.antoniasdriver.ui.notifications.NotificationBell
import com.spartons.antoniasdriver.ui.profile.ProfileScreen
import com.spartons.antoniasdriver.ui.requests.RequestsScreen
import com.spartons.antoniasdriver.ui.theme.Navy

private enum class Tab(val route: String, val label: String, val icon: ImageVector) {
    Home("home", "Home", Icons.Filled.Home),
    Requests("requests", "Requests", Icons.Filled.Inbox),
    Jobs("jobs", "Jobs", Icons.Filled.Work),
    Earnings("earnings", "Earnings", Icons.Filled.Payments),
    Profile("profile", "Profile", Icons.Filled.Person),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScaffold(
    onOpenRequest: (Long) -> Unit,
    onOpenJob: (Long) -> Unit,
    onNotifications: () -> Unit,
    onLoggedOut: () -> Unit,
) {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.hierarchy?.firstOrNull()?.route

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("SMART DRILL", fontWeight = FontWeight.Bold, color = Navy, style = MaterialTheme.typography.titleLarge)
                },
                actions = { NotificationBell(onClick = onNotifications) },
            )
        },
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { tab ->
                    val selected = currentRoute == tab.route
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            if (!selected) nav.navigate(tab.route) {
                                popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { pad ->
        NavHost(
            navController = nav,
            startDestination = Tab.Home.route,
            modifier = Modifier.padding(pad),
        ) {
            composable(Tab.Home.route) {
                DashboardScreen(
                    onSeeAllServices = { nav.navigate(Tab.Profile.route) { launchSingleTop = true } },
                    onSeeEarnings = { nav.navigate(Tab.Earnings.route) { launchSingleTop = true } },
                )
            }
            composable(Tab.Requests.route) { RequestsScreen(onOpenRequest = onOpenRequest) }
            composable(Tab.Jobs.route) { JobsScreen(onOpenJob = onOpenJob) }
            composable(Tab.Earnings.route) { EarningsScreen() }
            composable(Tab.Profile.route) { ProfileScreen(onLoggedOut = onLoggedOut) }
        }
    }
}

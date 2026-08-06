package com.spartons.antoniasdriver.ui.main

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.spartons.antoniasdriver.R
import com.spartons.antoniasdriver.ui.earnings.EarningsScreen
import com.spartons.antoniasdriver.ui.home.DashboardScreen
import com.spartons.antoniasdriver.ui.jobs.JobsScreen
import com.spartons.antoniasdriver.ui.notifications.NotificationBell
import com.spartons.antoniasdriver.ui.profile.ProfileScreen
import com.spartons.antoniasdriver.ui.requests.RequestsScreen
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.Navy

private enum class Tab(val route: String, val label: String, val icon: ImageVector) {
    Home("home", "Home", Icons.Filled.Home),
    Requests("requests", "Requests", Icons.AutoMirrored.Filled.Assignment),
    Jobs("jobs", "Jobs", Icons.Filled.Work),
    Earnings("earnings", "Earnings", Icons.Filled.AccountBalanceWallet),
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
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = Navy,
                    navigationIconContentColor = Color.White,
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White,
                ),
                navigationIcon = {
                    IconButton(onClick = { nav.navigate(Tab.Profile.route) { launchSingleTop = true } }) {
                        Icon(Icons.Filled.Menu, contentDescription = "Menu")
                    }
                },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(painterResource(R.drawable.ic_logo), contentDescription = null, modifier = Modifier.size(30.dp))
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text("SMART DRILL", fontWeight = FontWeight.Bold, color = Color.White, style = MaterialTheme.typography.titleMedium)
                            Text("Service Provider", color = Color.White.copy(alpha = 0.85f), style = MaterialTheme.typography.labelSmall)
                        }
                    }
                },
                actions = { NotificationBell(onClick = onNotifications) },
            )
        },
        bottomBar = {
            NavigationBar(containerColor = Color.White) {
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
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = BrandBlue,
                            selectedTextColor = BrandBlue,
                            unselectedIconColor = MutedGrey,
                            unselectedTextColor = MutedGrey,
                            indicatorColor = Color.Transparent,
                        ),
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

package com.spartons.antoniasdriver

import android.app.Application
import android.content.Context
import com.spartons.antoniasdriver.data.Network
import com.spartons.antoniasdriver.data.Repository
import com.spartons.antoniasdriver.data.SessionStore

/** Minimal manual DI: a single graph created at app startup. */
object ServiceLocator {
    lateinit var session: SessionStore
        private set
    lateinit var repo: Repository
        private set

    /**
     * The job the driver is actively servicing, if any. The foreground location
     * service reads this to know which booking to publish coordinates to over
     * the tracking WebSocket. Set when a job screen is opened, cleared on leave.
     */
    @Volatile
    var activeBookingId: Long? = null

    fun init(context: Context) {
        session = SessionStore(context.applicationContext)
        repo = Repository(Network.create(session), session)
    }
}

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
    }
}

package com.spartons.antonis

import android.app.Application
import android.content.Context
import com.spartons.antonis.data.Network
import com.spartons.antonis.data.Repository
import com.spartons.antonis.data.SessionStore

/** Minimal manual DI: a single graph created at app startup. */
object ServiceLocator {
    lateinit var session: SessionStore
        private set
    lateinit var repo: Repository
        private set

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

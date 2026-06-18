package com.spartons.antoniasdriver

import android.app.AlertDialog
import android.app.ProgressDialog
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.fredporciuncula.phonemoji.PhonemojiTextInputEditText
import com.spartons.antoniasdriver.helper.RetrofitClient.Companion.instance
import okhttp3.ResponseBody
import org.json.JSONObject
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.util.Timer
import java.util.TimerTask
import kotlin.jvm.internal.Intrinsics

class Login : AppCompatActivity() {
    var alert: AlertDialog? = null
    private val binding: Login? = null
    var check = 1
    var doubleBackToExitPressedOnce = false
    var mProgress: ProgressDialog? = null
    var mbutton: Button? = null
    var mpassword: EditText? = null
    var mphone_nuber: PhonemojiTextInputEditText? = null
    var pref: SharedPreferences? = null

    /* access modifiers changed from: protected */
    public override fun onCreate(bundle: Bundle?) {
        super.onCreate(bundle)
        setContentView(R.layout.login)
        mphone_nuber = findViewById<View>(R.id.phone_login) as PhonemojiTextInputEditText
        mpassword = findViewById<View>(R.id.password_login) as EditText
        val context: Context = this
        mProgress = ProgressDialog(context)
        val sharedPreferences = getSharedPreferences("Onfon", 0)
        pref = sharedPreferences
        if (sharedPreferences.getBoolean("isLogin", false)) {
            startActivity(Intent(context, MainActivity::class.java))
            finish()
        }
        val progressDialog = mProgress
        progressDialog!!.setMessage("Please wait...")
        val button = findViewById<View>(R.id.continue_button) as Button
        mbutton = button
        Intrinsics.checkNotNull(button)
        button.setOnClickListener {
            logIn()
        }
    }

    override fun onBackPressed() {
        finishAffinity()
    }

    fun logIn() {
        val phonemojiTextInputEditText = mphone_nuber
        Intrinsics.checkNotNull(phonemojiTextInputEditText)


        val msisdn = phonemojiTextInputEditText!!.text.toString().replace("+", "").replace(" ", "")

        if (msisdn.length < 10) {
            Toast.makeText(this, "Invalid Phone Number", Toast.LENGTH_SHORT).show()
            return
        }
        val editText = mpassword
        if (editText!!.text.toString().length < 4) {
            Toast.makeText(this, "Invalid Password", Toast.LENGTH_SHORT).show()
            return
        }
        val progressDialog = mProgress
        Intrinsics.checkNotNull(progressDialog)
        progressDialog!!.show()

        val params: java.util.HashMap<String, String> = java.util.HashMap()
        params["username"] = msisdn
        params["role"] = "drive"
        params["password"] = editText.text.toString()


        instance!!.api.login(params)!!.enqueue(object :
            Callback<ResponseBody?> {
            override fun onResponse(
                call: Call<ResponseBody?>,
                response: Response<ResponseBody?>
            ) {

                val jSONObject = JSONObject(response.body()!!.string())
                if (!response.isSuccessful || response.code() !== 200) {
                    Toast.makeText(this@Login, jSONObject.getString("message"), Toast.LENGTH_SHORT)
                        .show()
                    mProgress!!.dismiss()
                    return
                } else {

                    val jSONObject2 = JSONObject(jSONObject.getString("user"))

                    Toast.makeText(this@Login, "Success", Toast.LENGTH_SHORT).show()
                    mProgress!!.dismiss()
                    pref =
                        applicationContext.getSharedPreferences(
                            "Onfon",
                            0
                        ) // 0 - for private mode
                    // The backend returns the JWT as `access_token` (older builds used
                    // `token`). Read both so a successful login always persists.
                    val token = jSONObject.optString(
                        "access_token",
                        jSONObject.optString("token", "")
                    )
                    val edit: SharedPreferences.Editor = pref!!.edit()
                    // Editor applies clear() before any put(), so start the session from
                    // a clean slate and the values below still survive.
                    edit.clear()
                    edit.putBoolean("isLogin", true)
                    edit.putString("token", token)
                    edit.putString("user_id", jSONObject2.getString("id"))
                    edit.putString("role", jSONObject2.getString("role"))
                    edit.apply()

                    Timer().schedule(object : TimerTask() {
                        override fun run() {
                            val i =
                                Intent(this@Login, MainActivity::class.java)
                            startActivity(i)
                            finish()
                        }
                    }, 2000)
                }
            }
            override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                Log.i("onEmptyvvResponse", "" + t) //
                Toast.makeText(this@Login, "Error Login", Toast.LENGTH_SHORT).show()

                mProgress!!.dismiss()

            }
        })


    }

    companion object {
        /* access modifiers changed from: private */ /* renamed from: onCreate$lambda-0  reason: not valid java name */
        fun `m3onCreate$lambda0`(login: Login, view: View?) {
            Intrinsics.checkNotNullParameter(login, "this$0")
            login.logIn()
        }
    }
}
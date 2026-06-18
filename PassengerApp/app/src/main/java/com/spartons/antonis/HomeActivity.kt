package com.spartons.antonis

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.app.ProgressDialog
import android.content.ContentValues
import android.content.Intent
import android.content.SharedPreferences
import android.location.Location
import android.net.Uri
import android.os.Bundle
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.model.LatLng
import com.rengwuxian.materialedittext.MaterialEditText
import com.spartons.antonis.helpers.RecyleviewPayAdapter
import com.spartons.antonis.helpers.RetrofitClient
import com.spartons.antonis.helpers.UiHelper
import com.spartons.antonis.interfaces.IPositiveNegativeListener
import com.spartons.antonis.model.ServiceModel
import com.thecode.aestheticdialogs.AestheticDialog
import com.thecode.aestheticdialogs.DialogAnimation
import com.thecode.aestheticdialogs.DialogStyle
import com.thecode.aestheticdialogs.DialogType
import com.thecode.aestheticdialogs.OnDialogClickListener
import okhttp3.ResponseBody
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.IOException

/* compiled from: HomeActivity.kt */


class HomeActivity : AppCompatActivity() {
    var alert: AlertDialog? = null
    private val uiHelper = UiHelper()
    var alert3: AlertDialog? = null

    var alert2: AlertDialog? = null
    private lateinit var locationProviderClient: FusedLocationProviderClient

    var mlat: String? = ""
    var mlong: String? = ""


    // FusedLocationProviderClient - Main class for receiving location updates.
    private lateinit var fusedLocationProviderClient: FusedLocationProviderClient

    // LocationRequest - Requirements for the location updates, i.e.,
    // how often you should receive updates, the priority, etc.
    private lateinit var locationRequest: LocationRequest

    // LocationCallback - Called when FusedLocationProviderClient
    // has a new Location
    private lateinit var locationCallback: LocationCallback

    // This will store current location info
    private var currentLocation: Location? = null
    /* access modifiers changed from: private */
    var layoutManager: RecyclerView.LayoutManager? = null

    /* access modifiers changed from: private */
    var mAdapter: RecyclerView.Adapter<*>? = null
    private var mProgress: ProgressDialog? = null

    /* access modifiers changed from: private */
    var mRecyclerView: RecyclerView? = null
    private var pref: SharedPreferences? = null
    private val viewItems: ArrayList<ServiceModel> = ArrayList<ServiceModel>()

    /* access modifiers changed from: protected */
    @SuppressLint("SuspiciousIndentation")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN
        setContentView(R.layout.activity_home)
        supportActionBar!!.hide()
        createLocationCallback()

        locationProviderClient = LocationServices.getFusedLocationProviderClient(this)
        locationRequest = uiHelper.getLocationRequest()
        if (!uiHelper.isPlayServicesAvailable(this)) {
            Toast.makeText(this, "Play Services did not installed!", Toast.LENGTH_SHORT).show()
            finish()
        } else requestLocationUpdate()

        mProgress = ProgressDialog(this)

        mProgress!!.setMessage("Please wait...")
        pref =
            this.getSharedPreferences("Onfon", 0)
        if (!pref!!.all.containsKey("id_number")) {
            buyAirtime()
            return
        } else {
//            selectService()
            showService(pref!!.getString("id_number", "").toString())
        }


    }

//    open fun dismiss() {
//        var window: Window? = getWindow()
//        if (window == null) {
//            return
//        }
//        var decor: View? = window.getDecorView()
//        if (decor != null && decor.getParent() != null) {
//            super.dismiss()
//        }
//    }

    fun selectService() {

        val alertDialog = AlertDialog.Builder(this)
        val inflater: LayoutInflater =
            getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        val layout_pwd: View =
            inflater.inflate(R.layout.activity_service, null)
        alertDialog.setView(layout_pwd)

        mRecyclerView =
            layout_pwd.findViewById<View>(R.id.recycleview) as RecyclerView

        var mtextView =
            layout_pwd.findViewById<View>(R.id.title) as TextView

        val mimageView =
            layout_pwd.findViewById<View>(R.id.whataspp) as ImageView

        mtextView!!.text = "Select Service\nNeed help? 0718765936"


        mimageView!!.setOnClickListener(View.OnClickListener {

            var url: kotlin.String? = "https://api.whatsapp.com/send?phone=" + 254700000099
            var i: Intent? = Intent(Intent.ACTION_VIEW)
            i?.setData(Uri.parse(url))
            startActivity(i)
        })

        mRecyclerView!!.setHasFixedSize(true)
        mRecyclerView!!.adapter = null;
        layoutManager = LinearLayoutManager(this)

        alert = alertDialog.create()
        viewItems.clear()
        val mProgressLayoutPay: LinearLayout =
            layout_pwd.findViewById<View>(R.id.layout_discussions_progress) as LinearLayout
        val errorNullPay =
            layout_pwd.findViewById<View>(R.id.texterror) as TextView
        val params: java.util.HashMap<String, String> = java.util.HashMap()
        params["msisdn"] = ""
        RetrofitClient.instance!!.api.Service(params)!!.enqueue(object :
            Callback<ResponseBody?> {
            override fun onResponse(
                call: Call<ResponseBody?>,
                response: Response<ResponseBody?>
            ) {
//                Log.d("addItemsFromJSON: ", response.body()!!.string())
                if (response.isSuccessful && response.code() == 200) {
                    try {
                        val jsonDataString = JSONObject(response.body()!!.string())
                        val jsonArray = JSONArray(jsonDataString.getString("data"))
                        if (jsonArray.length() > 0) {
//                            Log.d("stfffring", jsonDataString.toString())
                            // use a linear layout manager
                            mRecyclerView!!.layoutManager = layoutManager
                            // specify an adapter (see also next example)
                            mAdapter = RecyleviewPayAdapter(this@HomeActivity, viewItems)

                            mRecyclerView!!.adapter = mAdapter
                            // specify an adapter (see also next example)
                            mProgressLayoutPay!!.visibility = View.GONE
                            errorNullPay!!.visibility = View.GONE
                            for (i in 0 until jsonArray.length()) {
                                val itemObj = jsonArray.getJSONObject(i)
                                val name = itemObj.getString("name")
                                val type = itemObj.getString("type")

                                val maccount = ServiceModel(name, type)
                                viewItems.add(maccount)
                            }
                        } else {
                            mProgressLayoutPay!!.visibility = View.GONE
                            errorNullPay!!.visibility = View.VISIBLE
                        }
//                        viewItems.clear()
                    } catch (e: JSONException) {
                        Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                    } catch (e: IOException) {
                        Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                    }
                } else {
                    mProgressLayoutPay!!.visibility = View.GONE
                    errorNullPay!!.visibility = View.VISIBLE
                    Log.d("string", response.errorBody()!!.string())

                }
            }

            override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                mProgressLayoutPay!!.visibility = View.GONE
                errorNullPay!!.visibility = View.VISIBLE
                errorNullPay!!.text = "System updating!\n\nFor Help: 0111051033"
                Log.i("onEmptyvvResponse", "" + t) //
            }
        })

        val dismissButton: Button =
            layout_pwd.findViewById<View>(R.id.change) as Button
        dismissButton.setOnClickListener(View.OnClickListener {
            val malert: android.app.AlertDialog.Builder =
                android.app.AlertDialog.Builder(this)
//                malert.setTitle("Confirm")
            malert.setMessage("\nAre you sure?")
            malert.setPositiveButton("Yes") { dialog, which ->
                finish()
            }
            malert.setNeutralButton("No") { dialog, which ->
                dialog.dismiss()
            }
            malert.show()
        })


        alertDialog.setView(layout_pwd)
        alert!!.setCancelable(false)
        alert!!.show()
    }

    fun hideKeyboardFrom() {
        val imm = getSystemService(
            Activity.INPUT_METHOD_SERVICE
        ) as InputMethodManager?
        imm!!.toggleSoftInput(InputMethodManager.HIDE_IMPLICIT_ONLY, 0)
    }


    @SuppressLint("MissingPermission")
    private fun requestLocationUpdate() {
        if (!uiHelper.isHaveLocationPermission(this)) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                MainActivity.MY_PERMISSIONS_REQUEST_ACCESS_FINE_LOCATION
            )
            return
        }
        if (uiHelper.isLocationProviderEnabled(this))
            uiHelper.showPositiveDialogWithListener(
                this,
                resources.getString(R.string.need_location),
                resources.getString(R.string.location_content),
                object : IPositiveNegativeListener {
                    override fun onPositive() {
                        startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
                    }
                },
                "Turn On",
                false
            )
        locationProviderClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.myLooper()
        )
    }

    //

    @SuppressLint("SuspiciousIndentation")
    fun buyAirtime() {
        val alertDialog = AlertDialog.Builder(this)
        alertDialog.setTitle("Enter Your ID Number")
        val inflater: LayoutInflater =
            getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        val layout_pwd: View =
            inflater.inflate(R.layout.layout_order, null)
        alertDialog.setView(layout_pwd)
        alert2 = alertDialog.create()

        val mid_number =
            layout_pwd.findViewById<View>(R.id.amount) as MaterialEditText

        val mid_cancel =
            layout_pwd.findViewById<View>(R.id.cancel) as Button

        val mid_view =
            layout_pwd.findViewById<View>(R.id.mview) as View

        val mid_submit =
            layout_pwd.findViewById<View>(R.id.update) as View
        mid_view.visibility = View.GONE
        mid_cancel.visibility = View.GONE
        mid_number.visibility = View.VISIBLE

        mid_submit.setOnClickListener {
            var id_number = mid_number.text

            if (id_number!!.length in 7..8) {
                showService(id_number.toString())
            } else {
                Toast.makeText(this, "Enter a valid ID Number", Toast.LENGTH_SHORT).show();
            }
        }
        alert2!!.setCancelable(false)
        alert2!!.show()
    }


    @SuppressLint("SuspiciousIndentation")
    fun register(mid_number: String) {
        val alertDialog = AlertDialog.Builder(this)
        alertDialog.setTitle("Enter Your Details")
        val inflater: LayoutInflater =
            getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        val layout_pwd: View =
            inflater.inflate(R.layout.layout_register, null)
        alertDialog.setView(layout_pwd)
        alert3 = alertDialog.create()

        val mfdullname =
            layout_pwd.findViewById<View>(R.id.mfullname) as MaterialEditText
        val mphone =
            layout_pwd.findViewById<View>(R.id.mphone) as MaterialEditText
        val mid_cancel =
            layout_pwd.findViewById<View>(R.id.cancel) as Button
        val mid_view =
            layout_pwd.findViewById<View>(R.id.mview) as View
        val mid_submit =
            layout_pwd.findViewById<View>(R.id.update) as View
        mid_view.visibility = View.VISIBLE
        mid_cancel.visibility = View.VISIBLE

        mid_cancel.setOnClickListener {
            alert3!!.dismiss()
            buyAirtime()
        }
        mid_submit.setOnClickListener {
            val phone = mphone.text.toString()
            val nmfullname = mfdullname.text
            if (mphone.length() > 11 && mphone.length() < 13) {
                mProgress!!.show()
                val params: java.util.HashMap<String, String> = java.util.HashMap()
                params["name"] = nmfullname.toString()
                params["internal_name"] = nmfullname.toString()
                params["id_number"] = mid_number
                params["role"] = "customer"
                params["customer_type"] = "customer"
                params["amount"] = "0"
                params["onwer_id"] = "0"
                params["lat"] =mlat.toString()
                params["long"] = mlong.toString()
                params["location"] = "unnamed"
                params["msisdn"] = phone.toString()

                RetrofitClient.instance!!.api.CreateUser(params)!!.enqueue(object :
                    Callback<ResponseBody?> {
                    override fun onResponse(
                        call: Call<ResponseBody?>,
                        response: Response<ResponseBody?>
                    ) {
                        if (response.isSuccessful && response.code() == 200) {
                            try {
//                                val jsonDataString = JSONObject(response.body()!!.string())
                                Toast.makeText(this@HomeActivity, "Success", Toast.LENGTH_SHORT)
                                    .show();
                                mProgress!!.dismiss()
                                showService(mid_number)
                            } catch (e: JSONException) {
                                mProgress!!.dismiss()
                                Toast.makeText(this@HomeActivity, "Error: "+e, Toast.LENGTH_SHORT)
                                    .show();
                                Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                            } catch (e: IOException) {
                                mProgress!!.dismiss()
                                Toast.makeText(this@HomeActivity, "Error: "+e, Toast.LENGTH_SHORT)
                                    .show();
                                Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                            }
                        } else {
                            mProgress!!.dismiss()
                            Toast.makeText(this@HomeActivity, "Error: "+ response.errorBody()!!.string(), Toast.LENGTH_SHORT)
                                .show();
                            Log.d("string", response.errorBody()!!.string())

                        }
                    }
                    override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                        mProgress!!.dismiss()
                        Toast.makeText(this@HomeActivity, "Error: "+t, Toast.LENGTH_SHORT)
                            .show();
                        Log.i("onEmptyvvResponse", "" + t) //
                    }
                })
            } else {
                Toast.makeText(this, "Enter a valid Phone number 25477xxx", Toast.LENGTH_SHORT)
                    .show();
            }
        }
        alert3!!.setCancelable(false)
        alert3!!.show()
    }


    private fun showService(mid_number: String) {
        mProgress!!.show()

        RetrofitClient.instance!!.api.getFetch(mid_number)!!
            .enqueue(object : Callback<ResponseBody?> {
                override fun onResponse(
                    call: Call<ResponseBody?>, response: Response<ResponseBody?>
                ) {
//                Log.d("addItemsFromJSON: ", response.body()!!.string())
                    if (response.isSuccessful && response.code() == 200) {
                        try {
                            val jsonDataString = JSONObject(response.body()!!.string())
                            val jsonArray = JSONArray(jsonDataString.getString("data"))
                            if (jsonArray.length() > 0) {
                                mProgress!!.dismiss()
                                selectService()

                                pref =
                                    applicationContext.getSharedPreferences(
                                        "Onfon",
                                        0
                                    ) // 0 - for private mode
                                val editor: SharedPreferences.Editor = pref!!.edit()
                                editor.putString("id_number", mid_number)
                                editor.clear()
                                editor.apply()  // shared preference
//                                hideKeyboardFrom()
                            } else {
                                mProgress!!.dismiss()
                                register(mid_number)
//                                successDialogue()
                            }
                        } catch (e: JSONException) {
                            successDialogue()
                            mProgress!!.dismiss()
                            Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                        } catch (e: IOException) {
                            successDialogue()
                            Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                        }
                    } else {
                        successDialogue()
                        mProgress!!.dismiss()
                    }
                }

                override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                    successDialogue()
                    mProgress!!.dismiss()

                    Log.i("onEmptyvvResponse", "" + t) //
                }
            })

    }

    private fun createLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)
                val lastLocation = locationResult.lastLocation ?: return
                val latLng = LatLng(
                    lastLocation.latitude,
                    lastLocation.longitude
                )

                mlong = latLng.longitude.toString()
                mlat = latLng.latitude.toString()
//                Log.e("LocationLocation", locationResult.)

                Log.e("LocationLocation", latLng.latitude.toString() + " , " + latLng.longitude)
            }
        }
    }

    fun successDialogue() {
        mProgress!!.dismiss()
        AestheticDialog.Builder(this, DialogStyle.FLAT, DialogType.ERROR)
            .setTitle("User Not Found").setMessage("Try again").setCancelable(false)
            .setDarkMode(true).setGravity(Gravity.CENTER).setAnimation(DialogAnimation.SHRINK)
            .setOnClickListener(object : OnDialogClickListener {
                override fun onClick(dialog: AestheticDialog.Builder) {
                    dialog.dismiss()
                    buyAirtime()

                }
            }).show()
    }

}
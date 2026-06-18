package com.spartons.antonis

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.ProgressDialog
import android.content.ContentValues
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.content.ContextCompat
import com.fredporciuncula.phonemoji.PhonemojiTextInputEditText
import com.rengwuxian.materialedittext.MaterialEditText
import com.spartons.antonis.helpers.RetrofitClient
import com.squareup.picasso.Picasso
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

class DetailsActivity : AppCompatActivity() {
    var alert: AlertDialog? = null
    var alert2: AlertDialog? = null
    var btnCall: Button? = null
    private var errorNullPay: TextView? = null
    var finalstatus: String? = null
    var imageView2: ImageView? = null
    var let_amount: String? = null
    private var mDesc: TextView? = null
    var mPayNow: Button? = null
    private var mPrice: TextView? = null
    private var mProgress: ProgressDialog? = null
    private var mProgressLayoutPay: LinearLayout? = null
    private var mStatus: TextView? = null
    var mdetails: String? = null
    var mdirection: Button? = null
    var mlocation: String? = null
    private var mphone_nuber: TextView? = null
    private var mphone_number: PhonemojiTextInputEditText? = null
    private var mrole: TextView? = null
    var mtrack: Button? = null
    private var mvIdNumber: TextView? = null
    var paid_amount = "0"
    private var pref: SharedPreferences? = null
    var service_id: String? = null
    var service_type: String? = null
    var handler: Handler = Handler()
    var refresh: Runnable? = null
    var mcontent: LinearLayout? = null


    /* access modifiers changed from: protected */
    @SuppressLint("CutPasteId")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        setContentView(R.layout.activity_detail)
        val supportActionBar = supportActionBar
        supportActionBar!!.setDisplayHomeAsUpEnabled(true)
        supportActionBar.setDisplayShowHomeEnabled(true)
        supportActionBar.title = "Detail Page"

        mcontent = findViewById<View>(R.id.mcontent) as LinearLayout?

        mphone_nuber = findViewById<View>(R.id.tvPhone) as TextView?
        mrole = findViewById<View>(R.id.tvAddress) as TextView?
        mvIdNumber = findViewById<View>(R.id.tv_id_number) as TextView?
        mDesc = findViewById<View>(R.id.tvDesc) as TextView?
        mPrice = findViewById<View>(R.id.tvPrice) as TextView?
        mStatus = findViewById<View>(R.id.tvStatus) as TextView?
        mdirection = findViewById<View>(R.id.btnDirections) as Button?
        mtrack = findViewById<View>(R.id.track) as Button?
        imageView2 = findViewById<View>(R.id.imageView2) as ImageView?
        findViewById<View>(R.id.on_refresh).setOnClickListener {
            mProgressLayoutPay!!.visibility = View.VISIBLE
            selectService()
        }

        mcontent!!.visibility =View.VISIBLE
        mdirection!!.visibility = View.GONE
        service_type = intent.getStringExtra("service_type")
        service_id = intent.getStringExtra("item_id")
        mProgress = ProgressDialog(this)
        mProgress!!.setMessage("Please wait...")
        pref = getSharedPreferences("Onfon", 0)
        mProgressLayoutPay = findViewById<View>(R.id.layout_discussions_progress) as LinearLayout?
        errorNullPay = findViewById<View>(R.id.texterror) as TextView?




        refresh = Runnable { // Do something
            selectService()
            handler.postDelayed(refresh!!, 5000)
        }
        handler.post(refresh!!)

        errorNullPay!!.visibility = View.GONE
        errorNullPay!!.text = "No Internet!\n\nFor Help: 0718765936"
        mPayNow = findViewById<View>(R.id.pay_now) as Button

        mPayNow!!.visibility = View.GONE
        btnCall = findViewById<View>(R.id.btnCall) as Button?

       btnCall!!.setOnClickListener {


           val phone: String = ""
           val phoneIntent = Intent(
               Intent.ACTION_DIAL, Uri.fromParts(
                   "tel", phone, null
               )
           )
           startActivity(phoneIntent)
       }
        selectService()
    }
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
    override fun onBackPressed() {
        finish()
    }

    private fun selectService() {
        val str = service_type
        val str2 = service_id

        RetrofitClient.instance!!.api.getSpecific(str, str2.toString())!!
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
                                val itemObj = jsonArray.getJSONObject(0)
                                mcontent!!.visibility =View.VISIBLE
                                mphone_nuber!!.text = itemObj.getString("msisdn")
                                mrole!!.text = itemObj.getString("name")
                                mvIdNumber!!.text = itemObj.getString("id_number")
                                mPrice!!.text = itemObj.getString("amount")
                                val mmStatus = itemObj.getString("status")

                                mdetails =itemObj.getString("name") +"\nPhone. "+itemObj.getString("msisdn_m")
                                mStatus!!.setTextColor(
                                    ContextCompat.getColor(
                                        this@DetailsActivity, R.color.colorPrimaryDark
                                    )
                                )
                                var mpaid_amount = itemObj.getString("amount")
                                var mpay = itemObj.getString("paid_amount")
                                var mstatus_name: String? = null
                                mstatus_name = "Available"
                                if (mmStatus.toString() == "0") {
                                    mPayNow!!.visibility = View.GONE
                                    mDesc!!.text =
                                        "Pay Ksh $mpay now to complete booking\nTo pay via PayBill 272888 account no drill{youridnumber} e.g drill12333"
                                    mtrack!!.visibility = View.GONE
                                    mdirection!!.visibility = View.VISIBLE
                                }
                                if (mmStatus.toString() == "1") {
                                    var bal = mpaid_amount.toInt()-mpay.toInt()
                                    val b = itemObj.getString("name")
                                    mrole!!.text = b
                                    mPayNow!!.visibility = View.GONE

//                                    mDesc!!.text =
//                                        "Amount Paid Ksh$mpay, Balance Ksh$bal"
                                    mcontent!!.visibility =View.GONE
                                    mDesc!!.text = "YOU HAVE SUCCESSFULLY BOOKED $b. TRACK THEIR MOVEMENT HERE"
                                    mstatus_name = "Booked"
                                    mStatus!!.setTextColor(ContextCompat.getColor(
                                            this@DetailsActivity, R.color.colourCall))
                                    mtrack!!.visibility = View.VISIBLE
//                                    mPayNow!!.visibility = View.VISIBLE
                                    mdirection!!.visibility = View.GONE
                                    mtrack!!.setOnClickListener {
                                        val i = Intent(this@DetailsActivity, MainActivity::class.java)
                                        i.putExtra("mdetails", mdetails.toString())
                                        i.putExtra("service_type_id", service_id.toString())
                                        startActivity(i)
                                    }
//
//
                                    mPayNow?.visibility = View.GONE
                                    mPayNow!!.setOnClickListener {

                                        val id_record = itemObj.getString("id")
                                        payNow(id_record.toString(), bal.toString())
                                    }
                                }
                                paid_amount = itemObj.getString("paid_amount")
                                var id_record = itemObj.getString("id")
                                mdirection!!.setOnClickListener {
                                    buyAirtime(id_record, itemObj.getString("amount"), paid_amount)
                                }
                                mStatus!!.text = mstatus_name
//                            mdirection!!.text = itemObj.getString("id")
                                if (itemObj.getString("url") != "null") {
                                    Picasso.get().load(itemObj.getString("url")).into(imageView2);
                                }
                                mProgressLayoutPay!!.visibility = View.GONE
                                errorNullPay!!.visibility = View.GONE
                            } else {
                                mProgressLayoutPay!!.visibility = View.GONE
                                errorNullPay!!.visibility = View.VISIBLE
                            }
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
    }


    fun buyAirtime(id_record: String?, amount: String?, paid_amount: String?) {
        val alertDialog = AlertDialog.Builder(this)
        alertDialog.setTitle("Confirm Booking")
        val inflater: LayoutInflater = getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        val layout_pwd: View = inflater.inflate(R.layout.layout_order, null)
        alertDialog.setView(layout_pwd)
        alert = alertDialog.create()

        val mid_number = layout_pwd.findViewById<View>(R.id.amount) as MaterialEditText
        mid_number.visibility = View.GONE

        val mphone_LAY = layout_pwd.findViewById<View>(R.id.mphone) as MaterialEditText
        mphone_LAY.visibility = View.VISIBLE

        val mphone = mphone_LAY!!.text
        val mid_cancel = layout_pwd.findViewById<View>(R.id.cancel) as Button

        val mid_view = layout_pwd.findViewById<View>(R.id.mview) as View

        val mid_submit = layout_pwd.findViewById<View>(R.id.update) as View
        mid_view.visibility = View.VISIBLE
        mid_cancel.visibility = View.VISIBLE
        mid_submit.setOnClickListener {
            if (mphone!!.length in 12..12) {
                stkTest(
                    id_record.toString(),
                    amount.toString(),
                    mphone.toString(),
                    paid_amount.toString()
                )
            } else {
                Toast.makeText(this, "Enter valid Phone Number", Toast.LENGTH_SHORT).show();
            }
        }

        mid_cancel.setOnClickListener {
            mProgress!!.dismiss()
            alert!!.dismiss()
        }
        alert!!.setCancelable(false)
        alert!!.show()
    }


    private fun stkTest(id_record: String, amount: String, msisdn: String, paid_amount2: String) {
        mProgressLayoutPay!!.visibility = View.VISIBLE
        errorNullPay!!.visibility = View.VISIBLE

        mProgress!!.show()
        val pref2: SharedPreferences = getSharedPreferences("Onfon", 0)
        val params: java.util.HashMap<String, String> = java.util.HashMap()
        params["id_record"] = id_record
        params["id_number"] = pref2.getString("id_number", "").toString()
        params["amount_required"] = amount
        params["msisdn"] = msisdn
        params["amount"] = paid_amount2
        params["paid_amount"] = paid_amount2.toString()
        RetrofitClient.instance!!.api.StK(params)!!.enqueue(object : Callback<ResponseBody?> {
            override fun onResponse(
                call: Call<ResponseBody?>, response: Response<ResponseBody?>
            ) {
                if (response.isSuccessful && response.code() == 200) {
                    try {
                        mProgressLayoutPay!!.visibility = View.GONE
                        errorNullPay!!.visibility = View.GONE
                        mProgress!!.dismiss()
                        successDialogue(alert)
                    } catch (e: JSONException) {
                        Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                    } catch (e: IOException) {
                        Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                    }
                } else {
                    mProgress!!.dismiss()
                    mProgressLayoutPay!!.visibility = View.GONE
                    errorNullPay!!.visibility = View.VISIBLE
                    Toast.makeText(this@DetailsActivity, "Try again", Toast.LENGTH_SHORT).show();

                }
            }

            override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {

                mProgress!!.dismiss()
                mProgressLayoutPay!!.visibility = View.GONE
                errorNullPay!!.visibility = View.VISIBLE
                errorNullPay!!.text = "System updating!\n\nFor Help: 0111051033"
                Log.i("onEmptyvvResponse", "" + t) //
            }
        })
    }

    fun successDialogue(alertm: AlertDialog?) {
        mProgress!!.dismiss()
        AestheticDialog.Builder(this, DialogStyle.FLAT, DialogType.SUCCESS)
            .setTitle("MAKE PAYMENT, MPESA prompt initiated").setMessage("").setCancelable(false)
            .setDarkMode(true).setGravity(Gravity.CENTER).setAnimation(DialogAnimation.SHRINK)
            .setOnClickListener(object : OnDialogClickListener {
                override fun onClick(dialog: AestheticDialog.Builder) {
                    dialog.dismiss()
                    selectService()
                    alertm!!.dismiss()
                }
            }).show()
    }

    fun errorDialogue(alertm: AlertDialog?) {
        mProgress!!.dismiss()
        AestheticDialog.Builder(this, DialogStyle.FLAT, DialogType.ERROR)
            .setTitle("Success! check your phone").setMessage("").setCancelable(false)
            .setDarkMode(true).setGravity(Gravity.CENTER).setAnimation(DialogAnimation.SHRINK)
            .setOnClickListener(object : OnDialogClickListener {
                override fun onClick(dialog: AestheticDialog.Builder) {
                    dialog.dismiss()
                    selectService()
                    alertm!!.dismiss()
                }
            }).show()
    }


    private fun payNow(id_record: String, mamount: String) {

        val alertDialog = AlertDialog.Builder(this)
        alertDialog.setTitle("Complete Payment Of Ksh $mamount")

        val inflater: LayoutInflater = getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        val layout_pwd: View = inflater.inflate(R.layout.layout_order, null)
        alertDialog.setView(layout_pwd)
        alert2 = alertDialog.create()
        val mid_number = layout_pwd.findViewById<View>(R.id.amount) as MaterialEditText
        mid_number.visibility = View.GONE
        val mphone_LAY = layout_pwd.findViewById<View>(R.id.mphone) as MaterialEditText
        mphone_LAY.visibility = View.VISIBLE
        val mphone = mphone_LAY.text
        val mid_cancel = layout_pwd.findViewById<View>(R.id.cancel) as Button
        val mid_view = layout_pwd.findViewById<View>(R.id.mview) as View
        val mid_submit = layout_pwd.findViewById<View>(R.id.update) as View

        mid_view.visibility = View.VISIBLE
        mid_cancel.visibility = View.VISIBLE

        mid_submit.setOnClickListener {

            mProgress!!.show()
            if (mphone!!.length in 12..12) {
                val pref2: SharedPreferences = getSharedPreferences("Onfon", 0)
                val params: java.util.HashMap<String, String> = java.util.HashMap()
                params["id_number"] = pref2.getString("id_number", "").toString()
                params["msisdn"] = mphone.toString()
                params["id_record"] = id_record
                params["amount"] = mamount
                RetrofitClient.instance!!.api.StK2(params)!!
                    .enqueue(object : Callback<ResponseBody?> {
                        override fun onResponse(
                            call: Call<ResponseBody?>, response: Response<ResponseBody?>
                        ) {
                            if (response.isSuccessful && response.code() == 200) {
                                try {
                                    mProgressLayoutPay!!.visibility = View.GONE
                                    errorNullPay!!.visibility = View.GONE
                                    successDialogue(alert2)
                                    mProgress!!.dismiss()

                                } catch (e: JSONException) {
                                    mProgress!!.dismiss()
                                    Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                                } catch (e: IOException) {
                                    mProgress!!.dismiss()
                                    Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                                }
                            } else {
                                mProgress!!.dismiss()
                                mProgressLayoutPay!!.visibility = View.GONE
                                errorNullPay!!.visibility = View.VISIBLE
                                Log.d("string", response.errorBody()!!.string())
                            }
                        }

                        override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                            mProgress!!.dismiss()
                            mProgressLayoutPay!!.visibility = View.GONE
                            errorNullPay!!.visibility = View.VISIBLE
                            errorNullPay!!.text = "System updating!\n\nFor Help: 0111051033"
                            Log.i("onEmptyvvResponse", "" + t) //
                        }
                    })
            } else {
                mProgress!!.dismiss()
                Toast.makeText(this, "Enter valid Phone Number", Toast.LENGTH_SHORT).show();
            }
        }
        mid_cancel.setOnClickListener {
            mProgress!!.dismiss()
            alert2!!.dismiss()
        }
        alert2!!.setCancelable(false)
        alert2!!.show()
    }

}
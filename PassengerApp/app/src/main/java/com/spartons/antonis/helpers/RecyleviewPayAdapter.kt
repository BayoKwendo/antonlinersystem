package com.spartons.antonis.helpers

import android.app.Activity
import android.app.ProgressDialog
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView
import com.spartons.antonis.ActionActivity
import com.spartons.antonis.R
import com.spartons.antonis.model.ServiceModel
import com.thecode.aestheticdialogs.AestheticDialog
import com.thecode.aestheticdialogs.DialogAnimation
import com.thecode.aestheticdialogs.DialogStyle
import com.thecode.aestheticdialogs.DialogType
import com.thecode.aestheticdialogs.OnDialogClickListener


class RecyleviewPayAdapter(private val context: Context, private val listRecyclerItem: List<Any>) :
    RecyclerView.Adapter<RecyclerView.ViewHolder>() {
    var mProgress: ProgressDialog? = null

    inner class ItemViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val name: TextView = itemView.findViewById<View>(R.id.name) as TextView
//        val amount: TextView = itemView.findViewById<View>(R.id.amount) as TextView
        val paybtn: Button = itemView.findViewById<View>(R.id.pay) as Button


    }

    override fun onCreateViewHolder(viewGroup: ViewGroup, i: Int): RecyclerView.ViewHolder {
        return when (i) {
            TYPE -> {
                val layoutView: View = LayoutInflater.from(viewGroup.context).inflate(
                    R.layout.service_item, viewGroup, false)
                ItemViewHolder(layoutView)
            }
            else -> {
                val layoutView: View = LayoutInflater.from(viewGroup.context).inflate(
                    R.layout.service_item, viewGroup, false)
                ItemViewHolder(layoutView)
            }
        }
    }

    override fun onBindViewHolder(viewHolder: RecyclerView.ViewHolder, i: Int) {
        val viewType = getItemViewType(i)
        when (viewType) {
            TYPE -> {
                val itemViewHolder = viewHolder as ItemViewHolder
                val account = listRecyclerItem[i] as ServiceModel
                itemViewHolder.name.text = account.name
//                itemViewHolder.amount.text = account.amount
                itemViewHolder.paybtn.setOnClickListener {
                    Toast.makeText( context, account.name, Toast.LENGTH_SHORT ).show()
                }
            }
            else -> {
                val itemViewHolder = viewHolder as ItemViewHolder
                val account = listRecyclerItem[i] as ServiceModel
                itemViewHolder.name.text = account.name
                itemViewHolder.paybtn.setOnClickListener {
                    otherDeposits(viewHolder, account.name.toString(),  account.type.toString())

                }
            }
        }
    }
    fun otherDeposits(viewHolder: RecyclerView.ViewHolder, name: String, service_id: String) {
        var pref: SharedPreferences? = null
        pref = context.getSharedPreferences("Onfon", 0)

        if (pref!!.all.containsKey("id_number")) {
            val i = Intent(context, ActionActivity::class.java)
            i.putExtra("service_id", service_id)
            i.putExtra("service_name", name)
            context.startActivity(i)
            return
        }else{
            Toast.makeText(context, "Please add your id number", Toast.LENGTH_SHORT).show()

        }
    }



    fun successDialogue(viewHolder: RecyclerView.ViewHolder, message: String) {
        mProgress!!.dismiss()
        AestheticDialog.Builder(context as Activity, DialogStyle.FLAT, DialogType.SUCCESS)
        .setTitle("Success!")
            .setMessage(message)
            .setCancelable(false)
            .setDarkMode(true)
            .setGravity(Gravity.CENTER)
            .setAnimation(DialogAnimation.SHRINK)
            .setOnClickListener(object : OnDialogClickListener {
                override fun onClick(dialog: AestheticDialog.Builder) {
                    dialog.dismiss()
                    val itemViewHolder = viewHolder as ItemViewHolder
//                    itemViewHolder.goBack()
                    //actions...
                }
            }).show()
    }


    fun errorDialogue(message: String) {
        mProgress!!.dismiss()
        AestheticDialog.Builder(context as Activity, DialogStyle.FLAT, DialogType.ERROR)
            .setTitle("Error")
            .setMessage(message)
            .setCancelable(false)
            .setDarkMode(true)
            .setGravity(Gravity.CENTER)
            .setAnimation(DialogAnimation.SHRINK)
            .setOnClickListener(object : OnDialogClickListener {
                override fun onClick(dialog: AestheticDialog.Builder) {
                    dialog.dismiss()
                    //actions...
                }
            })
            .show()
    }


    override fun getItemCount(): Int {
        return listRecyclerItem.size
    }

    companion object {
        private const val TYPE = 1
    }
}

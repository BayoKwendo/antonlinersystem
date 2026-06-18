package com.spartons.antonis.helpers

import android.annotation.SuppressLint
import android.app.Activity
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.spartons.antonis.R

/* compiled from: MyListAdapter.kt */
class MyListAdapter(
    context2: Activity,
    itemId2: ArrayList<String>,
    title2: ArrayList<String>,
    description2: ArrayList<String>,
    mdistance2: ArrayList<String>,
    status2: ArrayList<String>
) : ArrayAdapter<String?>(context2, R.layout.action_item, itemId2 as List<String?>) {
    private val context: Activity
    private val description: ArrayList<String>
    private val itemId: ArrayList<String>
    private val status: ArrayList<String>
    private val distance: ArrayList<String>
    private val title: ArrayList<String>

    init {
        context = context2
        itemId = itemId2
        title = title2
        description = description2
        distance = mdistance2
        status = status2
    }
    @SuppressLint("ViewHolder")
    override fun getView(position: Int, view: View?, parent: ViewGroup): View {
        val inflater = context.layoutInflater
        val rowView: View = inflater.inflate(R.layout.action_item, null as ViewGroup?, true)
        val titleText = rowView.findViewById<TextView>(R.id.title)
        val subtitleText = rowView.findViewById<TextView>(R.id.description)
        val itemid = rowView.findViewById<TextView>(R.id.itemid)
        val mdistance = rowView.findViewById<TextView>(R.id.mdistance)
        val mstatus = rowView.findViewById<TextView>(R.id.mstatus)

        mstatus.setTextColor(
            ContextCompat.getColor(
                context,
                R.color.colorPrimaryDark
            )
        )
       var mstatus_name: String? = null
        mstatus_name = "Available"
        if (status[position].toString() == "1") {
            mstatus_name = "Booked"
            mstatus.setTextColor(
                ContextCompat.getColor(
                    context,
                    R.color.colourCall
                )
            )
        }
        titleText.text = title[position]
        subtitleText.text = description[position]
        itemid.text = itemId[position]
        mdistance.text = distance[position]
        mstatus.text = mstatus_name

//        return
        return rowView
    }

//    operator fun compareTo(p: Person): Int {
//        return -Integer.valueOf(mRating).compareTo(p.mRating)
//    }
}
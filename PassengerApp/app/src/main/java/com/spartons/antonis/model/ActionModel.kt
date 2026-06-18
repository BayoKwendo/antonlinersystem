package com.spartons.antonis.model


class ActionModel internal constructor(

    private val description: String,
    private val itemId: String,
    private val status: String,
    private val distance: String,
    private val title: String
) :
    Comparable<ActionModel?> {
    override operator fun compareTo(other: ActionModel?): Int {
        return -other?.distance?.toInt()?.let { Integer.valueOf(distance.toInt()).compareTo(it) }!!

    }
}


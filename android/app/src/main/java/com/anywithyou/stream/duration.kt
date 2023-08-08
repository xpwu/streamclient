@file:JvmName("Duration_Kt")

package com.anywithyou.stream

class DurationKt(internal val d: Long) {
	companion object {
		const val MicroSecond = 1L
		const val MilliSecond = 1000 * MicroSecond
		const val Second = 1000 * MilliSecond
		const val Minute = 60 * Second
		const val Hour = 60 * Minute
	}
}

val DurationKt.Second
	get() = d/DurationKt.Second

val DurationKt.MilliSecond
	get() = d/DurationKt.MilliSecond

val DurationKt.Minute
	get() = d/DurationKt.Minute

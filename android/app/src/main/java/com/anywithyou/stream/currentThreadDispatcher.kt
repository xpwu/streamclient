package com.anywithyou.stream

import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Runnable
import kotlin.coroutines.CoroutineContext

class CurrentThreadDispatcher : CoroutineDispatcher() {
	private val thread = Thread.currentThread()
	private val handler = Handler(Looper.myLooper()!!)

	override fun dispatch(context: CoroutineContext, block: Runnable) {
		if (thread == Thread.currentThread()) {
			block.run()
		} else {
			handler.post(block)
		}
	}

}
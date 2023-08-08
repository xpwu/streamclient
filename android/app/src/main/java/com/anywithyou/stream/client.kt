@file:JvmName("Client_Kt")

package com.anywithyou.stream

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainCoroutineDispatcher
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class ClientKt(vararg options: OptionKt) {
	internal var client: Client
	internal val dispatcher = CurrentThreadDispatcher()

	init {
		client = Client(*options.toOptions())
	}
}

class StError(internal val err: Error, internal val isConnError: Boolean)

val StError.RawError
	get() = err

val StError.IsConnError
	get() = isConnError


typealias Response = ByteArray

suspend fun ClientKt.Send(data: ByteArray, headers: Map<String, String>): Pair<Response, StError?> {
	return withContext(dispatcher) {
		suspendCoroutine {
			client.Send(data, headers, object : Client.ResponseHandler {
				override fun onFailed(error: java.lang.Error, isConnError: Boolean) {
					it.resume(Pair<Response, StError?>(ByteArray(0), StError(error, isConnError)))
				}

				override fun onSuccess(response: ByteArray) {
					it.resume(Pair<Response, StError?>(response, null))
				}

			})
		}
	}
}

fun ClientKt.UpdateOptions(vararg options: OptionKt) {
	client.updateOptions(*options.toOptions())
}

fun ClientKt.OnPush(block: (ByteArray) -> Unit) {
	client.setPushCallback { data -> block(data) }
}

fun ClientKt.OnPeerClosed(block: () -> UInt) {
	client.setPeerClosedCallback { block() }
}

suspend fun ClientKt.Recover(): StError? {
	return withContext(dispatcher) {
		suspendCoroutine {
			client.Recover(object : Client.RecoverHandler {
				override fun onFailed(error: Error, isConnError: Boolean) {
					it.resume(StError(error, isConnError))
				}

				override fun onSuccess() {
					it.resume(null)
				}

			})
		}
	}

}

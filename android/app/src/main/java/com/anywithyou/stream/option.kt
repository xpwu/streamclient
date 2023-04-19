package com.anywithyou.stream

class OptionKt (internal val o : Option)

fun Host(host: String): OptionKt {
	return OptionKt(Option.Host(host))
}

fun Port(port: Int): OptionKt {
	return OptionKt(Option.Port(port))
}

fun TLS(): OptionKt {
	return OptionKt(Option.TLS())
}

fun ConnectTimeout(duration: DurationKt): OptionKt {
	return OptionKt(Option.ConnectTimeout(Duration(duration.d)))
}

fun RequestTimeout(duration: DurationKt): OptionKt {
	return OptionKt(Option.RequestTimeout(Duration(duration.d)))
}

internal fun Array<out OptionKt>.toOptions(): Array<Option> {
	val l = this.map { return@map it.o }
	return l.toTypedArray()
}
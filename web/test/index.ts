

// client: Client
import {Client, ConnError} from "../stream"


let client: Client|null = null
let url = ""

function headers(cache: Cache): Map<string, string> {
  let ret:Map<string, string> = new Map()
  let key: string = ""

  key = ($("#key1").val() as string).trim()
  if (key !== "") {
    cache.key1 = key
    cache.value1 = ($("#value1").val() as string).trim()
    ret.set(key, cache.value1)
  } else {
    cache.key1 = ""
    cache.value1 = ""
  }

  key = ($("#key2").val() as string).trim()
  if (key !== "") {
    cache.key2 = key
    cache.value2 = ($("#value2").val() as string).trim()
    ret.set(key, cache.value2)
  } else {
    cache.key2 = ""
    cache.value2 = ""
  }

  key = ($("#key3").val() as string).trim()
  if (key !== "") {
    cache.key3 = key
    cache.value3 = ($("#value3").val() as string).trim()
    ret.set(key, cache.value3)
  } else {
    cache.key3 = ""
    cache.value3 = ""
  }

  return ret
}

function print(string: string) {
  let body = $('body');
  body.append("<p>"+string+"</p>");
}
function printPush(string: string) {
  let body = $('body');
  body.append("<p style='color: cadetblue'>"+string+"</p>");
}
function printError(string: string) {
  let body = $('body');
  body.append("<p style='color: red'>"+string+"</p>");
}

export async function send() {
  let wss = $("#wss").val()
  if (client === null || url != wss) {
    url = wss as string
    client = new Client(url)
    client.setPushCallback((data)=>{
      printPush("push: " + data.toString())
    })
    client.setPeerClosedCallback(()=>{
      printError("conn: closed by peer")
    })
  }

  let cache = new Cache()
  cache.wss = url

  cache.data = $("#post").val() as string

  let [ret, err] = await client.send(cache.data, headers(cache))
  localStorage.setItem("last", JSON.stringify(cache))

  if (err !== null) {
    if (err instanceof ConnError) {
      client = null
      printError("conn-error: " + err.message)
    } else {
      printError("resp-error: " + err.message)
    }
  } else {
    print("resp: " + ret.toString() + "\n ---> json: see the 'console'")
    console.log("resp---json: ")
    console.log(JSON.parse(ret.toString()))
  }
}

$("#send").on("click", async ()=>{
  await send()
})

class Cache {
  wss: string = ""
  key1: string = ""
  value1: string = ""
  key2: string = ""
  value2: string = ""
  key3: string = ""
  value3: string = ""
  data: string = ""
}

$(()=>{
  let cacheS = localStorage.getItem("last")
  let cache: Cache
  if (cacheS === null) {
    cache = new Cache()
  } else {
    cache = JSON.parse(cacheS) as Cache
  }

  $("#key1").attr("value", cache.key1)
  $("#value1").attr("value", cache.value1)
  $("#key2").attr("value", cache.key2)
  $("#value2").attr("value", cache.value2)
  $("#key3").attr("value", cache.key3)
  $("#value3").attr("value", cache.value3)
  $("#wss").attr("value", cache.wss)
  $("#post").attr("value", cache.data)
})

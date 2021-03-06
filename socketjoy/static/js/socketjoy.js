var DBL_TAP_THRESH = 200; //ms 
var CONNECTED = false;

function isLocalNetwork(hostname = window.location.hostname) {
  return (
    (['localhost', '127.0.0.1', '', '::1'].includes(hostname))
    || (hostname.startsWith('192.168.'))
    || (hostname.startsWith('10.0.'))
    || (hostname.endsWith('.local'))
  )
}
var isLocal = isLocalNetwork();
// var isLocal = false;

var sock;
var lat;
if (isLocal) {
  sock = io();

  // Start measuring connection latency
  lat = setInterval(() => {
    const start = Date.now();

    // volatile, so the packet will be discarded if the socket is not connected
    sock.volatile.emit("ping", () => {
      const latency = Date.now() - start;
      document.getElementById("stats").innerHTML = "latency: " + latency + "ms";
      // document.getElementById("stats").style.display = "block";
    });
  }, 10000);


  sock.emit("fetch_lobby");
  sock.on("qrcode", (data) => {
      document.getElementById("qrcode").innerHTML = data.qr
  });
} else {
  // Notify user that this is a demo only
  var demo = document.getElementById('demo');
  demo.style.display = 'block';
  document.title = "socketJoy Demo";

  document.getElementById('alias').style.display = "none";
  setTimeout(() => {
    document.getElementById("icon-logo").style.filter = "invert(0)";
  }, 5000);
}

var conf = document.getElementsByClassName('configure')

// Rewrite this method to a propper modal-based config menu
function toggleConfig() {
  // Toggle class for config
  var opt = document.getElementsByClassName("options-menu")[0];
  opt.classList.toggle("visible")
}

function toggleStats(ev){
  if (ev.checked){
    document.getElementById('stats').style.display = "block";
  } else {
    document.getElementById('stats').style.display = "none";
  }
}

function send_input(key, value) {
  sock.emit("input", { key: key, value: value });
}
function createButton(id, dblClick = false) {
  var button = document.getElementById(id);

  button.setAttribute('btn-locked', 0);

  button.addEventListener(
    "touchstart",
    function (e) {
      if (dblClick) {
        // Double tap to latch
        if (button.getAttribute('data-dblclick') == null) {
          button.setAttribute('data-dblclick', 1);
          setTimeout(function () {
            if (button.getAttribute("data-dblclick") == 1) {
              // Default 1 click behavior
              if (button.getAttribute("btn-locked") == 1) {
                send_input(id, 0)
              }
              button.setAttribute('btn-locked', 0)
              button.style.border = 'none'
            }
            button.removeAttribute("data-dblclick");
          }, DBL_TAP_THRESH);
        } else {
          button.removeAttribute("data-dblclick");
          // Action for double click
          button.style.border = '1px solid white'
          button.setAttribute('btn-locked', 1)
        }
      }
      send_input(id, 1);
      e.preventDefault();
    },
    false
  );
  button.addEventListener(
    "touchend",
    function (e) {
      if (dblClick) {
        if (button.getAttribute('btn-locked') == 1) {
          // Prevent button unpress if button is locked
          return;
        }
      }
      send_input(id, 0);
      e.preventDefault();
    },
    false
  );
}

// Buttons
createButton("y-button");
createButton("x-button");
createButton("a-button");
createButton("b-button");

createButton("main-button");
createButton("back-button");
createButton("start-button");

createButton("left-bumper", true);
createButton("right-bumper", true);

// DPAD
// Use JoyDiv with 8 direction input, and emit them accordingly. So instead of sending the x and y values, send button 0 or 1
var dpad = document.getElementById("dpad");
var dpadjdiv = new JoydivModule.Joydiv({ element: dpad });
var dpad_down = {
  up: 0,
  down: 0,
  left: 0,
  right: 0,
};
dpad.addEventListener("joydiv-changed", function (e) {
  var input = dpadjdiv.getOneOf8Directions();
  var dname = input.name;
  if (dname !== "none") {
    var dirs = dname.split("-");
    for (const [key, value] of Object.entries(dpad_down)) {
      if (dirs.includes(key)) {
        send_input(key + "-button", 1);
        dpad_down[key] = 1;
      } else if (value == 1) {
        send_input(key + "-button", 0);
        dpad_down[key] = 0;
      }
    }
  }
});
// DPAD Reset
dpad.addEventListener("touchend", function (e) {
  for (var key in dpad_down) {
    dpad_down[key] = 0;
    send_input(key + "-button", 0);
  }
});

// Triggers

var tl = document.getElementById('left-trigger')

var leftTrig = new JoydivModule.Trigger({
  element: tl,
  topHome: '10px',
  clampY: 1,
  positiveOnly: true,
  flipY: true
})

tl.addEventListener('trigger-changed', function (e) {
  var tVal = leftTrig.getOneDirection().offset.y;
  sock.emit("input", { key: "left-trigger", value: tVal });
});

var tr = document.getElementById('right-trigger')

var rightTrig = new JoydivModule.Trigger({
  element: tr,
  topHome: '10px',
  clampY: 1,
  positiveOnly: true,
  flipY: true
})

tr.addEventListener('trigger-changed', function (e) {
  var tVal = rightTrig.getOneDirection().offset.y;
  sock.emit("input", { key: "right-trigger", value: tVal });
});

// Joysticks
var j1 = document.getElementById("joystick1");
var j2 = document.getElementById("joystick2");
var joydiv1 = new JoydivModule.Joydiv({
  element: j1,
  clampX: 1,
  clampY: 1,
  flipY: true,
});
var joydiv2 = new JoydivModule.Joydiv({
  element: j2,
  clampX: 1,
  clampY: 1,
  flipY: true,
});
j1.addEventListener("joydiv-changed", function (e) {
  var offset = joydiv1.getOneDirection().offset;
  sock.emit("input", { key: "left-stick-X", value: offset.x });
  sock.emit("input", { key: "left-stick-Y", value: offset.y });
});
j2.addEventListener("joydiv-changed", function (e) {
  var offset = joydiv2.getOneDirection().offset;
  sock.emit("input", { key: "right-stick-X", value: offset.x });
  sock.emit("input", { key: "right-stick-Y", value: offset.y });
});


function send_intro() {
  sock.emit("intro", { device: "x360", id: "x360", type: "x360", alias: localStorage.getItem('username')});
  document.getElementById("icon-logo").style.filter =
    "invert(18%) sepia(88%) saturate(5119%) hue-rotate(112deg) brightness(93%) contrast(90%)";
  setTimeout(() => {
    document.getElementById("icon-logo").style.filter = "invert(0)";
  }, 5000);
    document.getElementById('alias').style.display = "none";
}

function savecbState(e){
  localStorage.setItem('prompt-cb-val', e.checked | 0)
}

function stoppedTyping(e) {
  document.getElementById('connect').disabled = !(e.value.length > 0)  // Only enable the connect button if textbox isn't empty
  localStorage.setItem('username', document.getElementById('username').value)
}

// Initialize virtual controller
if (isLocal) {
  // Press the xbox button to initialize the controller!

  sock.on("disconnect", () => {
    document.getElementById("icon-logo").style.filter =
      "invert(29%) sepia(57%) saturate(7093%) hue-rotate(349deg) brightness(102%) contrast(70%)";
    CONNECTED = false;
  });
  sock.on("connect", () => {
    CONNECTED = true;
    // Enable connect button, if the username is already stored (Maybe autoconnect in this case?)
    document.getElementById('username').value = localStorage.getItem('username')
    document.getElementsByClassName('username')[0].value = localStorage.getItem('username')
    document.getElementById('connect').disabled = !(document.getElementById('username').value.length > 0)
  });

  // Prevent conext menu from popping up on long press
  window.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
}


window.onload = (ev) =>{
  if (localStorage.getItem('prompt-cb-val')){
    console.log(localStorage.getItem('prompt-cb-val'))
    document.getElementsByClassName('prompt-cb')[0].checked = true
    send_intro()
  }
}
var apiKey = 'ce16d9aa-4119-4097-a8a5-3a5016c6a81c';
var token = Math.random().toString(36).substr(2);
var socket, pc, myId, devices, deviceIdx = 0;
fetch(`https://skyway.io/${apiKey}/id?ts=${Date.now()}${Math.random()}`).then(res => res.text()).then(id => {
  myIdDisp.textContent = myId = id;
  socket = new WebSocket(`wss://skyway.io/peerjs?key=${apiKey}&id=${myId}&token=${token}`);
  socketSetup(socket);

  navigator.mediaDevices.enumerateDevices().then(devs => {
    var videoDevices = devs.filter(device => device.kind === 'videoinput');
    if (videoDevices.length > 0) {
      devices = videoDevices;
      btnStart.style.display = '';
    }
  });
});

btnStart.onclick = evt => {
  pcSetup(callTo.value);
}

btnGetStatsTargetLocalStream.onclick = evt => {
  getStats(selfView.srcObject.getVideoTracks()[0], localStreamStatsContainer);
}

btnGetStatsTargetRemoteStream.onclick = evt => {
  getStats(remoteView.srcObject.getVideoTracks()[0], remoteStreamStatsContainer);
}


function socketSetup() {
  socket.onopen = function () {
    console.log('socket on open');
  }
  socket.onmessage = function (evt) {
    var msg = JSON.parse(evt.data);
    console.log('%cRecieve message', 'color: white; background: #f89e41; padding: 1px', 'type:' + msg.type, msg);
    if (!pc && msg.src) {
      console.log('pcSetup', 'remoteId:' + msg.src, msg);
      pcSetup(msg.src);
    }
    if (msg.type === 'OFFER') {
      console.log('%cRecieve offer', 'color: #229933', msg.ofr);
      pc.setRemoteDescription(new RTCSessionDescription(msg.ofr))
        .then(_ => {
          console.log('%cCreate answer', 'color: #229933');
          return pc.createAnswer();
        })
        .then(answer => {
          console.log('%csetLocalDescription(answer)', 'color: #229933', answer);
          return pc.setLocalDescription(answer);
        })
        .then(_ => {
          console.log('%cSend answer', 'color:white; background: red; padding: 1px', 'dst:' + pc.remoteId, pc.localDescription);
          socket.send(JSON.stringify({
            type: 'ANSWER',
            ans: pc.localDescription,
            dst: pc.remoteId
          }));
        })
        .catch(ex => {
          console.log('Recieve Offer error.', ex);
        });
    } else if (msg.type === 'ANSWER') {
      console.log('%cRecieve answer', msg.ans);
      pc.setRemoteDescription(new RTCSessionDescription(msg.ans))
        .catch(ex => {
          console.log('Recieve Answer error.', ex);
        });
    } else if (msg.type === 'CANDIDATE' && msg.cnd) {
      console.log('%cRecieve candidate', 'color: red', msg.cnd);
      pc.addIceCandidate(new RTCIceCandidate(msg.cnd))
        .catch(ex => {
          console.log('Recieve Candidate error.', ex);
        });
    } else if (msg.type === 'PING') {
      console.log('%cSend ping', 'color:white; background: red; padding: 1px;');
      socket.send(JSON.stringify({ type: 'PONG' }));
    }
  }
  socket.onclose = function (evt) {
    console.log('socket onclose', JSON.stringify(evt));
  }
}

function pcSetup(remoteId) {
  pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.skyway.io:3478' }] });
  pc.remoteId = remoteId;
  pc.onicecandidate = function (evt) {
    console.log('%cpc onicecandidate', 'background: #79b74a; font-weight: bold; padding: 1px;');
    console.log('%cSend candidate', 'color:white; background: red; padding: 1px;', 'dst:' + pc.remoteId, evt.candidate);
    socket.send(JSON.stringify({
      type: 'CANDIDATE',
      cnd: evt.candidate,
      dst: pc.remoteId
    }));
  }
  pc.onnegotiationneeded = function (evt) {
    console.log('%cpc onnegotiationneeded', 'background: #5d76a7; color: white; font-weight: bold; padding: 1px;');
    console.log('creaate offer');
    pc.createOffer()
      .then(offer => {
        console.log('setLocalDescription(offer)', offer)
        return pc.setLocalDescription(offer);
      })
      .then(_ => {
        console.log('%cSend offer', 'color:white; background: red; padding: 1px', 'dst:' + pc.remoteId, pc.localDescription);
        socket.send(JSON.stringify({
          type: 'OFFER',
          ofr: pc.localDescription,
          dst: pc.remoteId
        }));
      });
  }
  if ('ontrack' in pc) {
    pc.ontrack = function (evt) {
      console.log('%cpc ontrack', 'background: #ea4335, font-weight: bold; padding: 1px;');
      if (!remoteView.srcObject) {
        remoteView.srcObject = evt.streams[0];
      }
    }
  } else {
    pc.onaddstream = function (evt) {
      console.log('%cpc onaddstream', 'background: #ea4335, font-weight: bold; padding: 1px;');
      if (!remoteView.srcObject) {
        remoteView.srcObject = evt.stream;
      }
    }
  }

  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    selfView.srcObject = stream;
    if ('addTrack' in pc) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    } else {
      pc.addStream(stream);
    }
  });
}

function getStats(track, container) {
  pc.getStats(track).then(reports => {
    reports.forEach(report => {
      Object.keys(report).forEach(key => {
        var reportMemberDiv = window['rpt' + key];
        if (!reportMemberDiv) {
          reportMemberDiv = document.createElement('div');
          div.id = 'rpt' + key;
          container.appenndChild(div);
        }
        reportMemberDiv.textContent = report[key];
      })
    })
  })
}
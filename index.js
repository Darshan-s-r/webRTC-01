
let peerConnection;

let APP_ID = "24d0087127ce468ba68f169a7772821a"

let uid = String(Math.floor(Math.random() * 100000))
let token = null;
let client;

let servers = {
  iceServers : [
    {urls : 'stun:stun1.1.google.com:19302'}, 
    {urls : 'stun:stun2.1.google.com:19302'}
  ]
}

let localStream;

let init =async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({uid, token})
  const channel = client.createChannel('main')
  channel.join()

  channel.on('MemberJoined', handlePeerJoin)

  client.on('MessageFromPeer', handleMessageFromPeer)

  localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})

  document.getElementById('user-1').srcObject = localStream;

}

let handlePeerJoin = async (memberId) => {
  console.log("a new peer joined", memberId)
  // client.sendMessageToPeer({text: 'Hey'}, memberId)
  createOffer(memberId)
}

let handleMessageFromPeer = async(message, memberId)=>{
   message = JSON.parse(message.text);

  if(message.type === 'offer'){
    if(!localStream){
      localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
      document.getElementById('user-1').srcObject = localStream;
    }
    document.getElementById('offer-sdp').value = JSON.stringify(message.offer)
    createAnswer(memberId)
  }

  if(message.type === 'candidate'){
    if(peerConnection){
      peerConnection.addIceCandidate(message.candidate)
    }
  }
  

  if(message.type === 'answer'){
    document.getElementById('answer-sdp').value = JSON.stringify(message.answer)
    addAnswer()
  }

}

let createPeerConnection = async (sdpType, memberId)=>{
  peerConnection = new RTCPeerConnection(servers)

  remoteStream = new MediaStream()
  document.getElementById('user-2').srcObject = remoteStream;

  localStream.getTracks().forEach((track)=>{
    peerConnection.addTrack(track, localStream)
  }) 

  peerConnection.ontrack = async (event) => {
    event.streams[0].getTracks().forEach((track)=>{
      remoteStream.addTrack(track)
    })
  }

  peerConnection.onicecandidate = async (event) => {
    if(event.candidate){
      document.getElementById(sdpType).value = JSON.stringify(peerConnection.localDescription)       // hear we can't use offer variable
      client.sendMessageToPeer({text : JSON.stringify({'type' : 'candidate', 'candidate' : event.candidate})}, memberId)

    }
  }
}

let createOffer = async (memberId) => {
 createPeerConnection('offer-sdp', memberId)
   
  let offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)
  document.getElementById('offer-sdp').value = JSON.stringify(offer)
  client.sendMessageToPeer({text : JSON.stringify({'type' : 'offer', 'offer' : offer})}, memberId)

}

let createAnswer = async (memberId) => {
  createPeerConnection('answer-sdp', memberId)

  let offer = document.getElementById('offer-sdp').value;
  if(!offer){
    return alert("Retrive offer from peer first...")
  }

  offer = JSON.parse(offer)
  await peerConnection.setRemoteDescription(offer)

  let answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)

  document.getElementById('answer-sdp').value = JSON.stringify(answer)
  client.sendMessageToPeer({text : JSON.stringify({'type' : 'answer', 'answer' : answer})}, memberId)

}

let addAnswer = async () =>{
  let answer = document.getElementById('answer-sdp').value;
  if(!answer) return alert("Retrive answer from peer first...")
  answer = JSON.parse(answer)
  if(!peerConnection.currentRemoteDescription){
    await peerConnection.setRemoteDescription(answer)
  }
}

init()

// document.getElementById('create-offer').addEventListener('click', createOffer)

// document.getElementById('create-answer').addEventListener('click', createAnswer)

// document.getElementById('add-answer').addEventListener('click', addAnswer)

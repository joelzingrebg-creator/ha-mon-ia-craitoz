// ---------------------------
// Craitoz AI - Interactive UI
// ---------------------------

// DOM elements
const micBtn = document.getElementById('micBtn');
const textInput = document.getElementById('textInput');
const searchBtn = document.getElementById('searchBtn');
const responseText = document.getElementById('responseText');
const liquidOrb = document.getElementById('liquidOrb');

let recognition = null;
let isRecording = false;
let isSpeaking = false;

// ---------- Helpers ----------
function showResponse(text, timeout = 7000) {
    responseText.textContent = text;
    responseText.classList.add('visible');
    if (showResponse._timeout) clearTimeout(showResponse._timeout);
    showResponse._timeout = setTimeout(() => {
        responseText.classList.remove('visible');
    }, timeout);
}

// ---------- Speech Recognition ----------
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
        isRecording = true;
        micBtn.setAttribute('aria-pressed', 'true');
        micBtn.classList.add('speaking');
        showResponse("J'écoute...");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        textInput.value = transcript;
        processQuery(transcript);
    };

    recognition.onerror = () => { stopRecognition(); showResponse("Erreur de reconnaissance vocale."); };
    recognition.onend = () => stopRecognition();
}

async function startRecognition() {
    if (!recognition) initSpeechRecognition();
    if (!recognition || isRecording) return;
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {}
    recognition.start();
}

function stopRecognition() {
    if (!recognition) { micBtn.classList.remove('speaking'); micBtn.setAttribute('aria-pressed', 'false'); isRecording = false; return; }
    try { recognition.stop(); } catch {}
    isRecording = false;
    micBtn.classList.remove('speaking');
    micBtn.setAttribute('aria-pressed', 'false');
}

micBtn.addEventListener('click', () => { if (!recognition) initSpeechRecognition(); if (!isRecording) startRecognition(); else stopRecognition(); });
searchBtn.addEventListener('click', () => { const q = textInput.value.trim(); if (q) processQuery(q); else showResponse("Écris ou dis quelque chose pour commencer."); });
textInput.addEventListener('keydown', e => { if (e.key==='Enter') { const q=textInput.value.trim(); if(q)processQuery(q); } });

// ---------- TTS ----------
function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang='fr-FR'; utt.rate=1.0; utt.pitch=1.05; utt.volume=1.0;
    utt.onstart=()=>{ isSpeaking=true; liquidOrb.classList.add('speaking'); micBtn.classList.add('speaking'); };
    utt.onend=()=>{ isSpeaking=false; liquidOrb.classList.remove('speaking'); micBtn.classList.remove('speaking'); };
    utt.onerror=()=>{ isSpeaking=false; liquidOrb.classList.remove('speaking'); micBtn.classList.remove('speaking'); };
    window.speechSynthesis.speak(utt);
}

// ---------- Call backend (Netlify Functions) ----------
async function callReplicateAPI(query) {
    try {
        const resp = awaitfetch("/api/chat", {

            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: query })
        });
        const data = await resp.json();
        return data.text;
    } catch (err) { console.error(err); return fallbackResponse(query); }
}

// fallback responses
function fallbackResponse(query) { return `J'ai bien reçu votre demande : "${query}". Je suis temporairement hors-ligne.`; }

// ---------- Main processing ----------
async function processQuery(query) {
    if (!query) return;
    liquidOrb.classList.add('speaking'); micBtn.classList.add('speaking');
    showResponse("Réflexion en cours...");
    try {
        const apiResponse = await callReplicateAPI(query);
        showResponse(apiResponse, 12000);
        speakText(apiResponse);
    } catch { const fallback = fallbackResponse(query); showResponse(fallback,9000); speakText(fallback); }
    finally { textInput.value=''; if(!isSpeaking){ liquidOrb.classList.remove('speaking'); micBtn.classList.remove('speaking'); } }
}

// Init
window.addEventListener('load', ()=>initSpeechRecognition());document.getElementById("askBtn").onclick = async () => {
  const question = document.getElementById("input").value;
  document.getElementById("response").innerText = "⏳ Réflexion en cours...";

  // --- TEXTE ---
  const res = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const data = await res.json();
  const answer = data.answer;
  document.getElementById("response").innerText = answer;
  parler(answer); // 🔊 parle la réponse

  // --- IMAGE ---
  const imgRes = await fetch("/.netlify/functions/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: question }),
  });
  const imgData = await imgRes.json();

  if (imgData.image) {
    const img = document.createElement("img");
    img.src = imgData.image;
    img.style.width = "300px";
    document.getElementById("imgDiv").innerHTML = "";
    document.getElementById("imgDiv").appendChild(img);
  }
};

// --- VOIX ---
function parler(texte) {
  const utterance = new SpeechSynthesisUtterance(texte);
  utterance.lang = "fr-FR";
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
}


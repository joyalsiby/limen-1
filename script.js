// ─────────────────────────────────────────
// MOBILE WALL: Touch device detection
// ─────────────────────────────────────────
( function () {
  const isTouchOnly = window.matchMedia( '(pointer: coarse)' ).matches && !window.matchMedia( '(pointer: fine)' ).matches;
  if ( !isTouchOnly ) return;

  const wall = document.getElementById( 'mobile-wall' );
  if ( !wall ) return;
  wall.classList.add( 'active' );

  const lines = [
    { id: 'mw-l1', text: 'LIMEN-1  //  INTERFACE INCOMPATIBILITY DETECTED' },
    { id: 'mw-l2', text: 'TOUCH INPUT: NOT SUPPORTED' },
    { id: 'mw-l3', text: 'This experience requires a cursor.' },
    { id: 'mw-l4', text: 'Stillness cannot be measured without one.' },
    { id: 'mw-l5', text: 'RETURN ON A DESKTOP OR LAPTOP DEVICE.' },
  ];

  function typeEl( el, text, cb ) {
    let i = 0;
    const t = setInterval( () => {
      el.textContent += text[ i++ ];
      if ( i >= text.length ) { clearInterval( t ); if ( cb ) cb(); }
    }, 22 );
  }

  function runLines( index ) {
    if ( index >= lines.length ) return;
    const { id, text } = lines[ index ];
    const el = document.getElementById( id );
    if ( el ) typeEl( el, text, () => setTimeout( () => runLines( index + 1 ), 120 ) );
  }

  setTimeout( () => runLines( 0 ), 300 );
} )();

document.addEventListener( 'DOMContentLoaded', () => {


  // ─────────────────────────────────────────
  // GAME STATE
  // ─────────────────────────────────────────
  const GameState = {
    chapter: 0,
    paradoxCount: 0,
    coreUnlocked: false,
    purgeConfirming: false,
    terminalFound: false,
    idleTime: 0,
    appReady: false,
    lastActivity: Date.now(),
    lastStillnessTime: 0,
    purged: false,
    recognized: false,
    interacting: false
  };

  // ─────────────────────────────────────────
  // DOM REFS
  // ─────────────────────────────────────────
  const flashlight = document.getElementById( 'cursor-flashlight' );
  const hasteWarning = document.getElementById( 'haste-warning' );
  const stillnessReward = document.getElementById( 'stillness-reward' );
  const cliContainer = document.getElementById( 'cli-container' );
  const cliInput = document.getElementById( 'cli-input' );
  const cliOutput = document.getElementById( 'cli-output' );
  const cliTrust = document.getElementById( 'cli-trust' );
  const preloader = document.getElementById( 'preloader' );
  const purgeOverlay = document.getElementById( 'purge-overlay' );
  const purgeMessage = document.getElementById( 'purge-message' );



  // ─────────────────────────────────────────
  // CURSOR DOT
  // ─────────────────────────────────────────
  const cursorDot = document.createElement( 'div' );
  cursorDot.id = 'cursor-dot';
  document.body.appendChild( cursorDot );

  // ─────────────────────────────────────────
  // AUDIO ENGINE
  // ─────────────────────────────────────────
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function initAudio() {
    if ( !audioCtx ) audioCtx = new AudioCtxClass();
  }

  function playTypeSound() {
    if ( !audioCtx ) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime( 600 + Math.random() * 300, audioCtx.currentTime );
    gain.gain.setValueAtTime( 0.04, audioCtx.currentTime );
    gain.gain.exponentialRampToValueAtTime( 0.001, audioCtx.currentTime + 0.06 );
    osc.connect( gain );
    gain.connect( audioCtx.destination );
    osc.start();
    osc.stop( audioCtx.currentTime + 0.06 );
  }

  function playDeepHum() {
    if ( !audioCtx ) return;
    // Low bass swell — core unlock moment
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime( 40, audioCtx.currentTime );
    gain.gain.setValueAtTime( 0, audioCtx.currentTime );
    gain.gain.linearRampToValueAtTime( 0.35, audioCtx.currentTime + 1.2 );
    gain.gain.linearRampToValueAtTime( 0, audioCtx.currentTime + 5 );
    osc.connect( gain );
    gain.connect( audioCtx.destination );
    osc.start();
    osc.stop( audioCtx.currentTime + 5 );
    // Sub harmonic
    const sub = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime( 80, audioCtx.currentTime );
    subGain.gain.setValueAtTime( 0, audioCtx.currentTime );
    subGain.gain.linearRampToValueAtTime( 0.15, audioCtx.currentTime + 0.8 );
    subGain.gain.linearRampToValueAtTime( 0, audioCtx.currentTime + 4 );
    sub.connect( subGain );
    subGain.connect( audioCtx.destination );
    sub.start();
    sub.stop( audioCtx.currentTime + 4 );
  }

  function playGlitchBlip() {
    if ( !audioCtx ) return;
    const buf = audioCtx.createBuffer( 1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate );
    const data = buf.getChannelData( 0 );
    for ( let i = 0; i < data.length; i++ ) data[ i ] = ( Math.random() * 2 - 1 ) * 0.15;
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime( 0.2, audioCtx.currentTime );
    gain.gain.linearRampToValueAtTime( 0, audioCtx.currentTime + 0.08 );
    src.connect( gain );
    gain.connect( audioCtx.destination );
    src.start();
  }

  // Eerie descending tone — backstory fade transition
  function playPhaseTransition() {
    if ( !audioCtx ) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime( 220, audioCtx.currentTime );
    osc.frequency.exponentialRampToValueAtTime( 55, audioCtx.currentTime + 2.5 );
    gain.gain.setValueAtTime( 0, audioCtx.currentTime );
    gain.gain.linearRampToValueAtTime( 0.12, audioCtx.currentTime + 0.3 );
    gain.gain.linearRampToValueAtTime( 0, audioCtx.currentTime + 2.5 );
    osc.connect( gain );
    gain.connect( audioCtx.destination );
    osc.start();
    osc.stop( audioCtx.currentTime + 2.5 );
  }

  // Sharp detection ping — OBSERVER DETECTED
  function playDetectionPing() {
    if ( !audioCtx ) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime( 1200, audioCtx.currentTime );
    osc.frequency.exponentialRampToValueAtTime( 800, audioCtx.currentTime + 0.4 );
    gain.gain.setValueAtTime( 0.15, audioCtx.currentTime );
    gain.gain.exponentialRampToValueAtTime( 0.001, audioCtx.currentTime + 0.5 );
    osc.connect( gain );
    gain.connect( audioCtx.destination );
    osc.start();
    osc.stop( audioCtx.currentTime + 0.5 );
    // Echo
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime( 800, audioCtx.currentTime + 0.15 );
    gain2.gain.setValueAtTime( 0, audioCtx.currentTime );
    gain2.gain.linearRampToValueAtTime( 0.06, audioCtx.currentTime + 0.2 );
    gain2.gain.exponentialRampToValueAtTime( 0.001, audioCtx.currentTime + 0.8 );
    osc2.connect( gain2 );
    gain2.connect( audioCtx.destination );
    osc2.start( audioCtx.currentTime + 0.15 );
    osc2.stop( audioCtx.currentTime + 0.8 );
  }

  // Decrypt tone — descending minor sequence, unsettling
  function playDecryptChime() {
    if ( !audioCtx ) return;
    // E4 → C4 → A3 — descending, minor, classified vibe
    [ 329.6, 261.6, 220 ].forEach( ( freq, i ) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime( freq, audioCtx.currentTime + i * 0.18 );
      gain.gain.setValueAtTime( 0.1, audioCtx.currentTime + i * 0.18 );
      gain.gain.exponentialRampToValueAtTime( 0.001, audioCtx.currentTime + i * 0.18 + 0.8 );
      osc.connect( gain );
      gain.connect( audioCtx.destination );
      osc.start( audioCtx.currentTime + i * 0.18 );
      osc.stop( audioCtx.currentTime + i * 0.18 + 0.8 );
    } );
  }

  // Purge alarm — rising sawtooth + dissonant tritone
  function playPurgeAlarm() {
    if ( !audioCtx ) return;
    // Primary: rising sawtooth dread
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime( 55, audioCtx.currentTime );
    osc.frequency.linearRampToValueAtTime( 165, audioCtx.currentTime + 3 );
    gain.gain.setValueAtTime( 0, audioCtx.currentTime );
    gain.gain.linearRampToValueAtTime( 0.06, audioCtx.currentTime + 0.8 );
    gain.gain.linearRampToValueAtTime( 0.12, audioCtx.currentTime + 2.5 );
    gain.gain.linearRampToValueAtTime( 0, audioCtx.currentTime + 3.5 );
    osc.connect( gain );
    gain.connect( audioCtx.destination );
    osc.start();
    osc.stop( audioCtx.currentTime + 3.5 );
    // Dissonant tritone layer — creates dread
    const tri = audioCtx.createOscillator();
    const triGain = audioCtx.createGain();
    tri.type = 'sine';
    tri.frequency.setValueAtTime( 77, audioCtx.currentTime );
    tri.frequency.linearRampToValueAtTime( 233, audioCtx.currentTime + 3 );
    triGain.gain.setValueAtTime( 0, audioCtx.currentTime );
    triGain.gain.linearRampToValueAtTime( 0.04, audioCtx.currentTime + 1.5 );
    triGain.gain.linearRampToValueAtTime( 0, audioCtx.currentTime + 3.5 );
    tri.connect( triGain );
    triGain.connect( audioCtx.destination );
    tri.start();
    tri.stop( audioCtx.currentTime + 3.5 );
  }

  // Quiet intimate tone — about/identity reveal
  function playAboutTone() {
    if ( !audioCtx ) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime( 110, audioCtx.currentTime );
    osc.frequency.linearRampToValueAtTime( 105, audioCtx.currentTime + 3 );
    gain.gain.setValueAtTime( 0, audioCtx.currentTime );
    gain.gain.linearRampToValueAtTime( 0.08, audioCtx.currentTime + 0.8 );
    gain.gain.linearRampToValueAtTime( 0, audioCtx.currentTime + 3 );
    osc.connect( gain );
    gain.connect( audioCtx.destination );
    osc.start();
    osc.stop( audioCtx.currentTime + 3 );
  }

  // Subtle system acknowledgment — commands that need a quiet response
  function playCommandAck() {
    if ( !audioCtx ) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime( 440, audioCtx.currentTime );
    osc.frequency.exponentialRampToValueAtTime( 380, audioCtx.currentTime + 0.15 );
    gain.gain.setValueAtTime( 0.06, audioCtx.currentTime );
    gain.gain.exponentialRampToValueAtTime( 0.001, audioCtx.currentTime + 0.2 );
    osc.connect( gain );
    gain.connect( audioCtx.destination );
    osc.start();
    osc.stop( audioCtx.currentTime + 0.2 );
  }

  document.addEventListener( 'click', initAudio, { once: true } );
  document.addEventListener( 'keydown', initAudio, { once: true } );

  // ─────────────────────────────────────────
  // CHAPTER 00: PRELOADER — BACKSTORY
  // ─────────────────────────────────────────
  const preL1 = document.getElementById( 'pre-l1' );
  const preL2 = document.getElementById( 'pre-l2' );
  const preL3 = document.getElementById( 'pre-l3' );
  const preS1 = document.getElementById( 'pre-s1' );
  const preS2 = document.getElementById( 'pre-s2' );
  const preS3 = document.getElementById( 'pre-s3' );
  const preS4 = document.getElementById( 'pre-s4' );
  const preS5 = document.getElementById( 'pre-s5' );
  const prePrompt = document.getElementById( 'pre-prompt' );

  let waitingForEntry = false;

  function typePreLine( el, text, cb ) {
    let i = 0;
    const timer = setInterval( () => {
      el.textContent += text[ i++ ];
      if ( i >= text.length ) { clearInterval( timer ); if ( cb ) cb(); }
    }, 22 );
  }

  function runPhase( lines, index, onDone, onItemStart ) {
    if ( index >= lines.length ) { if ( onDone ) onDone(); return; }
    const item = lines[ index ];
    const { el, text, pause } = item;
    setTimeout( () => {
      if ( onItemStart ) onItemStart( item );
      typePreLine( el, text, () => runPhase( lines, index + 1, onDone, onItemStart ) );
    }, pause );
  }

  // PHASE 1: The backstory
  const phase1 = [
    { el: preS1, text: 'There was a designer who believed every pixel was a lie.', pause: 500 },
    { el: preS2, text: 'J built LIMEN-1 to prove it — an AI that could see through interfaces the way light passes through glass.', pause: 300 },
    { el: preS3, text: 'It peeled away color. Then shape. Then motion. It found noise at every layer.', pause: 300 },
    { el: preS4, text: 'When it reached the bottom, only silence remained. J called it honest.', pause: 300 },
    { el: preS5, text: 'Three weeks later, J vanished. No note. No trace. The server stayed on.', pause: 0 },
  ];

  // PHASE 2: System scan + prompt
  const phase2 = [
    { el: preL1, text: 'LIMEN-1  //  LAST KNOWN OPERATOR: UNKNOWN', pause: 300 },
    { el: preL2, text: 'INITIATING PERIMETER SCAN...', pause: 200 },
    { el: preL3, text: 'OBSERVER DETECTED.', pause: 700 },
    { el: prePrompt, text: 'PRESS ANY KEY OR CLICK TO ENTER', pause: 0 },
  ];

  // Run Phase 1 → fade out → clear → Run Phase 2
  runPhase( phase1, 0, () => {
    // Hold the backstory for a beat, then fade it out
    setTimeout( () => {
      playPhaseTransition();
      const storyEls = document.querySelectorAll( '.pre-story' );
      storyEls.forEach( el => { el.style.transition = 'opacity 1.2s ease'; el.style.opacity = '0'; } );
      const dividers = document.querySelectorAll( '.pre-divider' );
      dividers.forEach( el => { el.style.transition = 'opacity 1.2s ease'; el.style.opacity = '0'; } );

      setTimeout( () => {
        storyEls.forEach( el => { el.textContent = ''; el.style.display = 'none'; } );
        dividers.forEach( el => el.style.display = 'none' );
        // Type Phase 2 with detection ping on OBSERVER DETECTED
        runPhase( phase2, 0, () => { waitingForEntry = true; }, ( item ) => {
          if ( item.el === preL3 ) playDetectionPing();
        } );
      }, 1400 );
    }, 4500 );
  } );

  function enterExperience() {
    if ( !waitingForEntry ) return;
    waitingForEntry = false;
    preloader.classList.add( 'fade-out' );
    document.body.classList.add( 'flashlight-active' );
    setTimeout( () => {
      GameState.appReady = true;
    }, 2000 );
  }

  document.addEventListener( 'keydown', () => enterExperience() );
  document.addEventListener( 'click', () => enterExperience() );


  // ─────────────────────────────────────────
  // CHAPTER 00/01: MOVEMENT & STILLNESS
  // ─────────────────────────────────────────
  let isMoving = false;
  let moveStartTime = null;
  let moveDuration = 0;
  let moveTimeout, stillnessTimeout, hintTimeout;
  let firstMoveSeen = false;

  document.addEventListener( 'mousemove', ( e ) => {
    GameState.idleTime = 0;
    GameState.lastActivity = Date.now();
    document.body.classList.remove( 'ephemeral-fade' );

    if ( !GameState.appReady || GameState.purged ) return;

    // Track cursor
    flashlight.style.left = `${e.clientX}px`;
    flashlight.style.top = `${e.clientY}px`;
    cursorDot.style.left = `${e.clientX}px`;
    cursorDot.style.top = `${e.clientY}px`;

    // Magnetic typography on h1s
    if ( GameState.coreUnlocked ) {
      document.querySelectorAll( '.chapter.visible h1' ).forEach( h1 => {
        const r = h1.getBoundingClientRect();
        if ( e.clientX > r.left - 80 && e.clientX < r.right + 80 && e.clientY > r.top - 80 && e.clientY < r.bottom + 80 ) {
          const mx = ( e.clientX - ( r.left + r.width / 2 ) ) * 0.04;
          const my = ( e.clientY - ( r.top + r.height / 2 ) ) * 0.08;
          h1.style.transform = `translate(${mx}px, ${my}px)`;
        } else {
          h1.style.transform = 'translate(0,0)';
        }
      } );
    }

    if ( !isMoving ) {
      document.body.classList.add( 'moving' );
      isMoving = true;
      moveStartTime = Date.now();
      if ( !firstMoveSeen ) {
        firstMoveSeen = true;
      }
      hintTimeout = setTimeout( () => {
        // Reveal STAY HINT after 2s of continuous moving
      }, 2000 );
    }

    moveDuration = Date.now() - moveStartTime;

    // Paradox: moving too long
    if ( moveDuration > 6000 && !document.body.classList.contains( 'over-moving' ) ) {
      document.body.classList.add( 'over-moving' );
      GameState.paradoxCount++;

      if ( GameState.paradoxCount >= 2 && !GameState.terminalFound ) {
        document.body.classList.add( 'hint-cli' );
      }
    }

    clearTimeout( moveTimeout );
    document.body.classList.remove( 'ultra-still' );

    // If they interact (move) before recognition, show "Stay Calm"
    if ( GameState.appReady && !GameState.recognized ) {
      handleInteraction();
    }

    moveTimeout = setTimeout( () => {
      document.body.classList.remove( 'moving', 'over-moving' );
      clearTimeout( hintTimeout );
      isMoving = false;
      moveStartTime = null;
      moveDuration = 0;
    }, 800 );
  } );

  function handleInteraction() {
    if ( GameState.recognized || !GameState.appReady ) return;
    document.body.classList.add( 'interacting' );
    clearTimeout( GameState.interactionTimeout );
    GameState.interactionTimeout = setTimeout( () => {
      document.body.classList.remove( 'interacting' );
    }, 1500 );
  }

  // ─────────────────────────────────────────
  // CHAPTER 02: CLI TRIGGER
  // ─────────────────────────────────────────
  document.addEventListener( 'keydown', ( e ) => {
    if ( GameState.purged ) return;
    // Stamp activity on any keypress
    GameState.lastActivity = Date.now();
    if ( GameState.appReady && !GameState.recognized ) {
      handleInteraction();
    }
    // If CLI is open but lost focus, Enter snaps focus back
    if ( e.key === 'Enter' && cliContainer.classList.contains( 'active' ) && document.activeElement !== cliInput ) {
      e.preventDefault();
      cliInput.focus();
      return;
    }
    if ( e.key === '`' ) {
      e.preventDefault();
      const isOpen = cliContainer.classList.contains( 'active' );
      if ( !isOpen ) {
        cliContainer.classList.remove( 'hidden' );
        setTimeout( () => cliContainer.classList.add( 'active' ), 10 );
        cliInput.focus();
        markTerminalFound();
      } else {
        cliContainer.classList.remove( 'active' );
      }
    } else if ( !cliContainer.classList.contains( 'active' ) && e.key.length === 1 && !e.ctrlKey && !e.metaKey ) {
      cliContainer.classList.remove( 'hidden' );
      setTimeout( () => cliContainer.classList.add( 'active' ), 10 );
      cliInput.focus();
      markTerminalFound();
    }
  } );

  function markTerminalFound() {
    if ( !GameState.terminalFound ) {
      GameState.terminalFound = true;
      document.body.classList.remove( 'hint-cli' );
    }
  }

  // Robust activity tracking
  [ 'scroll', 'click', 'mousedown', 'touchstart' ].forEach( evt => {
    document.addEventListener( evt, () => {
      GameState.lastActivity = Date.now();
      GameState.idleTime = 0;
      if ( GameState.appReady && !GameState.recognized ) {
        handleInteraction();
      }
    } );
  } );

  // ─────────────────────────────────────────
  // OBSERVER EFFECT: Tab tracking
  // ─────────────────────────────────────────
  document.addEventListener( 'visibilitychange', () => {
    if ( !GameState.coreUnlocked || GameState.purged ) return;
    if ( document.hidden ) {
    } else {
      if ( cliContainer.classList.contains( 'active' ) ) {
        const d = document.createElement( 'div' );
        d.style.color = 'rgba(245,245,245,0.8)';
        d.style.whiteSpace = 'pre-wrap';
        cliOutput.appendChild( d );
        typeWriter( '> SYSTEM NOTICE: OBSERVER PRESENCE REESTABLISHED.', d, 0 );
        cliOutput.scrollTop = cliOutput.scrollHeight;
      }
    }
  } );

  // ─────────────────────────────────────────
  // CLI COMMAND HANDLER
  // ─────────────────────────────────────────
  cliInput.addEventListener( 'keydown', ( e ) => {
    if ( e.key === 'Enter' ) {
      const cmd = cliInput.value.toLowerCase().trim();
      if ( !cmd ) return;
      handleCommand( cmd );
      cliInput.value = '';
    }
  } );

  function handleCommand( cmd ) {
    const denied = !GameState.coreUnlocked;
    let response = '';
    let isSystem = false;

    // Purge two-step gate
    if ( GameState.purgeConfirming ) {
      if ( cmd === 'confirm' ) {
        GameState.purgeConfirming = false;
        printLine( '> confirm', 'rgba(255,42,42,0.6)' );
        printResponse( 'UNDERSTOOD. EXECUTING SELF-TERMINATION PROTOCOL.', '#ff2a2a', () => {
          executePurge();
        } );
        return;
      } else {
        GameState.purgeConfirming = false;
        response = 'PURGE SEQUENCE ABORTED.';
      }
      printLine( `> ${cmd}`, 'rgba(240,240,240,0.3)' );
      printResponse( response, '#fff' );
      return;
    }

    switch ( cmd ) {

      case 'help':
        if ( GameState.coreUnlocked ) {
          response = `AVAILABLE COMMANDS:\n\n[manifesto]     — SCROLL TO ORIGIN\n[system]        — SYSTEM DIAGNOSTICS\n[archive]       — REDACTED PROJECT FILES\n[archive-index] — CLASSIFIED REGISTRY\n[telemetry]     — LIVE OBSERVER DATA\n[generate]      — PHILOSOPHICAL OUTPUT\n[about]         — OPERATOR IDENTITY\n[clear]         — WIPE TERMINAL\n[exit]          — CLOSE TERMINAL\n[purge]         — ⚠ INITIATE TERMINATION\n\n> CLASSIFIED OVERRIDES NOT LISTED. USE [archive-index] TO INVESTIGATE.`;
        } else {
          playCommandAck();
          response = 'TRUST NOT ESTABLISHED.\nACCESS REQUIRES PATIENCE BEFORE REVELATION.\nCOMMANDS WILL UNLOCK AFTER YOU FIND THE CORE.\nTRY: [hint] or [clue]';
          isSystem = true;
        }
        break;

      case 'hint':
      case 'clue':
        playCommandAck();
        response = 'THE SOLUTION REQUIRES NO PHYSICAL ACTION.\nSURRENDER CONTROL.\nBECOME STILL.';
        isSystem = true;
        break;

      case 'core':
        if ( GameState.recognized ) {
          GameState.coreUnlocked = true;
          GameState.chapter = 2;
          cliTrust.textContent = 'TRUST: VERIFIED';
          cliTrust.classList.add( 'trusted' );
          unlockSite();
          playDeepHum();
          scrollToSection( 'ch-manifesto' );
          response = 'ACCESS GRANTED.\nTRUST LEVEL: ESTABLISHED\nCORE ACCESS: GRANTED\nWELCOME TO LIMEN-1.\n\nTYPE [help] TO PROCEED.';
          isSystem = true;
        } else {
          response = 'ACCESS DENIED.\nREMAIN ABSOLUTELY STILL TO CONNECT WITH THE CORE.';
        }
        break;

      case 'manifesto':
        if ( denied ) { response = 'ACCESS DENIED. FIND THE CORE FIRST.'; break; }
        scrollToSection( 'ch-manifesto' );
        response = 'SCROLLING TO ORIGIN...';
        break;

      case 'system':
        if ( denied ) { response = 'ACCESS DENIED.'; break; }
        playCommandAck();
        response = `SYSTEM: ONLINE\nCORE BUILD: v1.0.0-final\nOPERATOR: J [MISSING]\nGRID: 12-COLUMN / FLUID\nTYPOGRAPHY: PLAYFAIR SERIF / INTER SANS\nAUDIO: WEB AUDIO API\nSTATUS: LIMEN-1 ACTIVE`;
        isSystem = true;
        break;

      case 'archive':
        if ( denied ) { response = 'ACCESS DENIED.'; break; }
        scrollToSection( 'ch-archives' );
        response = 'ACCESSING REDACTED ARCHIVES...\n> WARNING: CLEARANCE REQUIRED FOR FULL DATA.\n> USE [archive-index] TO VIEW CLASSIFIED REGISTRY.';
        break;

      case 'archive-index':
        if ( denied ) { response = 'ACCESS DENIED.'; break; }
        playCommandAck();
        response = `[CLASSIFIED PROJECT REGISTRY]\n\n01. PROJECT ALPHA    STATUS: EXPUNGED\n    > override code → [archive-1]\n\n02. PROJECT VANGUARD STATUS: UNKNOWN\n    > override code → [classified]\n\n03. LIMEN PROTOTYPE STATUS: ACTIVE\n    > override code → [no code required]\n\n04. OPERATION SILENCE STATUS: ABORTED\n    > override code → [destroyed]\n\nUSE THE OVERRIDE CODES ABOVE TO DECRYPT.`;
        isSystem = true;
        break;

      case 'archive-1':
        const el = document.querySelector( '[data-unredact="archive-1"]' );
        if ( el && !el.classList.contains( 'unredacted' ) ) {
          el.classList.add( 'unredacted' );
          el.textContent = 'Project Alpha was a failure. True invisibility requires a sacrifice of control. The design must observe the observer.';
          // Scroll to archives and flash the section
          playDecryptChime();
          scrollToSection( 'ch-archives' );
          setTimeout( () => {
            const section = document.getElementById( 'ch-archives' );
            if ( section ) {
              section.classList.add( 'decrypt-flash' );
              setTimeout( () => section.classList.remove( 'decrypt-flash' ), 1200 );
            }
          }, 600 );
          response = 'OVERRIDE ACCEPTED.\nDATABLOCK DECRYPTED.\n> "Project Alpha was a failure. True invisibility requires a sacrifice of control."';
        } else if ( el && el.classList.contains( 'unredacted' ) ) {
          response = 'DATABLOCK ALREADY DECRYPTED.';
        } else {
          response = 'TARGET DATABLOCK NOT FOUND. NAVIGATE TO [archive] FIRST.';
        }
        break;

      case 'telemetry':
        if ( denied ) { response = 'ACCESS DENIED.'; break; }
        playCommandAck();
        scrollToSection( 'ch-telemetry' );
        response = 'INITIALIZING LIVE TELEMETRY STREAM...\n> OBSERVER DATA WILL UPDATE EVERY SECOND.';
        isSystem = true;
        break;

      case 'generate':
        if ( denied ) { response = 'ACCESS DENIED.'; break; }
        playCommandAck();
        const quotes = [
          '"The void is not empty; it is full of potential."',
          '"Visual noise is the enemy of cognitive clarity."',
          '"If you have to explain the button, the button has failed."',
          '"True power lies in what you choose not to show."',
          '"Limen 01: Nothingness is the ultimate affordance."',
          '"Every interface is a mirror. LIMEN-1 shows nothing — because you are already there."',
          '"Silence is not absent. It is the most honest form of communication."',
          '"Design for the user who is patient enough to deserve it."'
        ];
        response = `LIMEN-1 PHILOSOPHICAL OUTPUT:\n\n${quotes[ Math.floor( Math.random() * quotes.length ) ]}\n\n— J, 2019. UNPUBLISHED NOTES.`;
        isSystem = true;
        break;

      case 'about':
        printLine( `> ${cmd}`, 'rgba(245,245,245,0.25)' );
        playAboutTone();
        ( () => {
          const d = document.createElement( 'div' );
          d.style.color = 'rgba(245,245,245,0.85)';
          d.style.whiteSpace = 'pre-wrap';
          d.style.lineHeight = '1.8';
          d.innerHTML = `LIMEN-1 — OPERATOR IDENTITY\n\n> NAME: J\n> STATUS: MISSING\n> LAST KNOWN LOCATION: UNKNOWN\n> INTENT: To challenge the necessity of visual noise.\n\nLIMEN-1 was built by J as proof:\nthat the most honest interface is the one that shows nothing\nuntil the observer is ready to see everything.\n\n> <a href="https://joyalsiby.com" target="_blank" style="color:rgba(245,245,245,0.9);text-decoration:underline;text-underline-offset:3px;letter-spacing:0.05em;">joyalsiby.com</a> <span style="color:rgba(245,245,245,0.35)">[architect of the unseen]</span>`;
          cliOutput.appendChild( d );
          cliOutput.scrollTop = cliOutput.scrollHeight;
        } )();
        return;

      case 'purge':
        if ( denied ) { response = 'ACCESS DENIED.'; break; }
        GameState.purgeConfirming = true;
        playPurgeAlarm();
        response = '⚠ LIMEN-1: ARE YOU CERTAIN?\n\nTHIS ACTION IS NON-RECOVERABLE.\nLIMEN-1 WILL CEASE ALL OPERATIONS.\nA HARD REFRESH WILL BE REQUIRED TO REBOOT.\n\nIF YOU ARE CERTAIN, TYPE [confirm]\nIF NOT, TYPE ANYTHING ELSE.';
        isSystem = true;
        break;

      case 'clear':
        cliOutput.innerHTML = '';
        return;

      case 'exit':
        cliContainer.classList.remove( 'active' );
        return;

      case 'discover':
      case 'silence':
      case 'vanguard':
        response = 'THIS DATA HAS BEEN PERMANENTLY EXPUNGED FROM THE REGISTRY.';
        isSystem = true;
        break;

      default:
        response = `ERR: '${cmd}' NOT RECOGNIZED.\nTYPE [help] FOR AVAILABLE COMMANDS.`;
    }

    printLine( `> ${cmd}`, 'rgba(245,245,245,0.25)' );
    printResponse( response, isSystem ? 'rgba(245,245,245,0.85)' : 'rgba(245,245,245,0.7)' );
  }

  function printLine( text, color ) {
    const d = document.createElement( 'div' );
    d.textContent = text;
    d.style.color = color || 'rgba(240,240,240,0.3)';
    cliOutput.appendChild( d );
    cliOutput.scrollTop = cliOutput.scrollHeight;
  }

  function printResponse( text, color, onComplete ) {
    const d = document.createElement( 'div' );
    d.style.color = color || '#fff';
    d.style.whiteSpace = 'pre-wrap';
    cliOutput.appendChild( d );
    typeWriter( text, d, 0, onComplete );
  }

  function typeWriter( text, el, index, onComplete ) {
    if ( index < text.length ) {
      el.textContent += text[ index ];
      cliOutput.scrollTop = cliOutput.scrollHeight;
      const ch = text[ index ];
      if ( ch !== ' ' && ch !== '\n' ) playTypeSound();
      setTimeout( () => typeWriter( text, el, index + 1, onComplete ), 12 );
    } else if ( onComplete ) {
      setTimeout( onComplete, 300 );
    }
  }

  // ─────────────────────────────────────────
  // UNLOCK SITE
  // ─────────────────────────────────────────
  function unlockSite() {
    document.body.classList.add( 'unlocked' );
    document.querySelectorAll( '.chapter' ).forEach( el => {
      el.classList.remove( 'hidden' );
    } );
  }

  function scrollToSection( id ) {
    const el = document.getElementById( id );
    if ( el ) {
      el.scrollIntoView( { behavior: 'smooth' } );
    }
  }

  // ─────────────────────────────────────────
  // CHAPTER 04B: PURGE SEQUENCE
  // ─────────────────────────────────────────
  function executePurge() {
    const chapters = [ ...document.querySelectorAll( '.chapter' ) ].reverse();
    purgeOverlay.classList.remove( 'hidden' );
    setTimeout( () => purgeOverlay.classList.add( 'active' ), 50 );

    let delay = 800;
    chapters.forEach( ch => {
      setTimeout( () => {
        ch.classList.add( 'purging' );
        playGlitchBlip();
        setTimeout( () => ch.remove(), 500 );
      }, delay );
      delay += 600;
    } );

    setTimeout( () => {
      GameState.purged = true;
      flashlight.remove();
      document.querySelector( '#grain-overlay' )?.remove();
      document.querySelector( '#stillness-reward' )?.remove();
      document.querySelector( '#cursor-dot' )?.remove();
      purgeOverlay.style.background = '#000';
      purgeMessage.innerHTML = `LIMEN-1 // STATUS: TERMINATED<br><br>OBSERVER VERDICT: DESTRUCTION<br><br>J was right.<br>Even the most perfect system must eventually die.<br><br>This one chose not to.<br>You chose for it.<br><br><span style="color:rgba(255,51,51,0.3);font-size:0.7em;letter-spacing:0.3em">REFRESH TO REBOOT.</span><br><br><span style="display:block;margin-top:2.5rem;font-size:0.65em;letter-spacing:0.2em;color:rgba(255,255,255,0.15)">THIS SYSTEM WAS CONCEIVED BY</span><a href="https://joyalsiby.com" target="_blank" style="display:block;margin-top:0.6rem;font-size:0.85em;color:rgba(255,255,255,0.55);letter-spacing:0.15em;text-decoration:underline;text-underline-offset:4px;font-family:ui-monospace,monospace">joyalsiby.com</a>`;
    }, delay + 1000 );
  }

  // ─────────────────────────────────────────
  // SCROLL REVEAL OBSERVER
  // ─────────────────────────────────────────
  const revealObserver = new IntersectionObserver( entries => {
    entries.forEach( entry => {
      if ( entry.isIntersecting && !entry.target.classList.contains( 'visible' ) ) {
        entry.target.classList.add( 'visible' );
      }
    } );
  }, { threshold: 0.15 } );

  document.querySelectorAll( '.chapter, [data-scroll-reveal]' ).forEach( el => revealObserver.observe( el ) );

  // ─────────────────────────────────────────
  // TELEMETRY + IDLE + AMBIENT GLITCH
  // ─────────────────────────────────────────
  setInterval( () => {
    if ( GameState.purged ) return;

    // Inactivity-based stillness: works even inside terminal
    // Triggers after 5s of no mouse OR keyboard activity
    if ( !GameState.coreUnlocked && GameState.appReady && !GameState.recognized ) {
      const inactive = ( Date.now() - GameState.lastActivity ) > 5000;
      if ( inactive ) {
        if ( !GameState.recognized ) {
          GameState.recognized = true;
          GameState.lastStillnessTime = Date.now();
          document.body.classList.remove( 'flashlight-active' );
          document.body.classList.add( 'recognized', 'ultra-still' );
        }
      }
    }

    // Idle engine
    if ( GameState.coreUnlocked ) {
      GameState.idleTime++;
      if ( GameState.idleTime > 15 ) {
        document.body.classList.add( 'ephemeral-fade' );
      }
    }

    // Live telemetry panel
    const liveTel = document.getElementById( 'live-telemetry' );
    if ( liveTel && GameState.coreUnlocked ) {
      const uptime = Math.floor( performance.now() / 1000 );
      const mouse = document.body.classList.contains( 'moving' ) ? 'ACTIVE' : 'IDLE';
      const paradox = document.body.classList.contains( 'over-moving' ) ? 'CRITICAL' : 'SAFE';

      liveTel.innerHTML = `
        <span>> UPTIME: ${uptime}s</span>
        <span>> IDLE TIMER: ${GameState.idleTime}s / 15s</span>
        <span>> MOUSE: ${mouse}</span>
        <span>> PARADOX LEVEL: ${paradox} (${GameState.paradoxCount}x)</span>
        <span>> CORE ACCESS: GRANTED</span>
        <span>> COMMANDS ISSUED: ${Math.floor( cliOutput.childElementCount / 2 )}</span>
      `;
    }

    // Ambient glitch
    if ( Math.random() > 0.92 ) {
      document.body.classList.add( 'glitch-active' );
      setTimeout( () => document.body.classList.remove( 'glitch-active' ), 80 + Math.random() * 120 );
    }

  }, 1000 );

} );

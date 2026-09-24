(() => {
  "use strict";

  const app = document.getElementById("app");
  const STATES = ["0", "1", "+", "-", "+i", "-i"];
  const GATES = ["X", "Z", "Y", "H"];
  const labels = { "0": "|0⟩", "1": "|1⟩", "+": "|+⟩", "-": "|−⟩", "+i": "|+i⟩", "-i": "|−i⟩" };
  const positions = {
    "0": [180, 72], "1": [180, 244], "+": [264, 181],
    "-": [96, 135], "+i": [130, 198], "-i": [230, 118]
  };
  const gateInfo = {
    X: ["Bit flip", "Swaps zero and one"],
    Z: ["Phase flip", "Changes a hidden sign"],
    Y: ["Flip + phase", "Combines both effects"],
    H: ["Hadamard", "Changes the view"]
  };
  const rounds = [
    {
      title: "Flip the bit",
      note: "Use X to swap the two familiar states.",
      options: [
        { start: "0", target: "1", allowed: ["X"], max: 1 },
        { start: "1", target: "0", allowed: ["X"], max: 1 }
      ]
    },
    {
      title: "A new view",
      note: "Hadamard links a definite state with a 50/50 state.",
      options: [
        { start: "0", target: "+", allowed: ["X", "H"], max: 2 },
        { start: "1", target: "-", allowed: ["X", "H"], max: 2 },
        { start: "+", target: "0", allowed: ["X", "H"], max: 2 },
        { start: "-", target: "1", allowed: ["X", "H"], max: 2 }
      ]
    },
    {
      title: "A hidden sign",
      note: "Use Z at least once. Watch how it acts on a 50/50 state.",
      options: [
        { start: "+", target: "-", allowed: ["X", "Z", "H"], required: "Z", max: 2 },
        { start: "-", target: "+", allowed: ["X", "Z", "H"], required: "Z", max: 2 },
        { start: "0", target: "-", allowed: ["X", "Z", "H"], required: "Z", max: 3 }
      ]
    },
    {
      title: "The Y twist",
      note: "Use Y at least once. Compare its result with X and Z.",
      options: [
        { start: "+", target: "-", allowed: GATES, required: "Y", max: 2 },
        { start: "-", target: "+", allowed: GATES, required: "Y", max: 2 },
        { start: "0", target: "1", allowed: GATES, required: "Y", max: 2 }
      ]
    },
    {
      title: "Make phase visible",
      note: "Use H at least once. Two states with the same 50/50 readout can lead to different answers.",
      options: [
        { start: "-", target: "1", allowed: GATES, required: "H", max: 2 },
        { start: "+", target: "0", allowed: GATES, required: "H", max: 2 },
        { start: "1", target: "+", allowed: GATES, required: "H", max: 3 }
      ]
    }
  ];

  function applyGate(gate, state) {
    const maps = {
      X: { "0": "1", "1": "0", "+": "+", "-": "-", "+i": "-i", "-i": "+i" },
      Z: { "0": "0", "1": "1", "+": "-", "-": "+", "+i": "-i", "-i": "+i" },
      Y: { "0": "1", "1": "0", "+": "-", "-": "+", "+i": "+i", "-i": "-i" },
      H: { "0": "+", "1": "-", "+": "0", "-": "1", "+i": "-i", "-i": "+i" }
    };
    return maps[gate][state];
  }
  function randomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(6);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, b => chars[b % chars.length]).join("");
  }
  function hashCode(code) {
    let n = 2166136261;
    for (const char of code) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
    return n >>> 0;
  }
  function puzzleAt(index) {
    const family = rounds[index];
    const value = (hashCode(game.code + "-" + index) >>> 0) % family.options.length;
    return { ...family, ...family.options[value] };
  }
  function mysteryGate() {
    return GATES[(hashCode(game.code + "-m-" + game.mysteryIndex) >>> 0) % 4];
  }
  const rawCode = new URLSearchParams(location.search).get("code");
  const initialCode = rawCode && /^[A-Z2-9]{6}$/.test(rawCode.toUpperCase()) ? rawCode.toUpperCase() : randomCode();
  const game = {
    mode: "quest", group: false, code: initialCode, round: 0, current: "0",
    history: [], pending: null, feedback: null, predictions: 0, correct: 0,
    codeEntry: false, selectedLab: "0", mysteryIndex: 0,
    probeInput: "0", probes: [], guesses: 0, mysteryDone: false,
    questSnapshot: null, labSnapshot: null
  };
  game.current = puzzleAt(0).start;

  function stateNote(state) {
    if (state === "0") return "A 0/1 measurement gives 0 every time.";
    if (state === "1") return "A 0/1 measurement gives 1 every time.";
    if (state === "+" || state === "-")
      return "This is a 50/50 readout. The + and − states differ in phase; H can reveal the difference.";
    return "This is a 50/50 readout. Its phase points along the Y axis, which this basic 0/1 readout does not show.";
  }
  function explanation(gate, before) {
    if (gate === "X") {
      if (before === "0" || before === "1") return "X swaps zero and one, so it acts like a bit flip here.";
      if (before === "+" || before === "-") return "X leaves this point unchanged. Try X on a zero or one to see its bit flip.";
      return "X swaps the two Y-axis points. Their 0/1 odds still look the same.";
    }
    if (gate === "Z") {
      if (before === "0" || before === "1") return "Z does not change the visible state here. A phase sign matters when zero and one are combined.";
      if (before === "+" || before === "-") return "Z swaps + and −. Both still read 50/50, but H can turn them into different definite outcomes.";
      return "Z swaps the two Y-axis points, although a simple 0/1 measurement remains 50/50.";
    }
    if (gate === "Y") {
      if (before === "0" || before === "1") return "Y flips zero and one, like X does here. Its different phase effect shows up on other states.";
      if (before === "+" || before === "-") return "Y swaps + and −, while X would leave this point unchanged. Y combines a flip with a phase change.";
      return "Y leaves this Y-axis point unchanged as a physical state; an overall phase cannot be measured.";
    }
    if (before === "0" || before === "1") return "H turns a definite 0/1 answer into a state with 50/50 odds.";
    if (before === "+" || before === "-") return "H makes the difference between + and − visible: + becomes zero, while − becomes one.";
    return "H moves this Y-axis point to the other Y-axis point. A 0/1 readout remains 50/50.";
  }
  function readout(state) {
    const zero = state === "0" ? 100 : state === "1" ? 0 : 50;
    const one = 100 - zero;
    return '<div class="readout"><div class="readout-head"><span>If you measure in the 0/1 basis</span><span>Chance</span></div>' +
      '<div class="bar-row"><span>0</span><div class="bar-track"><div class="bar-fill" style="width:' + zero + '%"></div></div><span>' + zero + '%</span></div>' +
      '<div class="bar-row"><span>1</span><div class="bar-track"><div class="bar-fill" style="width:' + one + '%"></div></div><span>' + one + '%</span></div>' +
      '<p class="readout-note">' + stateNote(state) + '</p></div>';
  }
  function sphere(current, target) {
    const c = positions[current];
    const t = target ? positions[target] : null;
    const points = STATES.map(s => '<circle class="ghost-dot" cx="' + positions[s][0] + '" cy="' + positions[s][1] + '" r="4"></circle>').join("");
    return '<div class="sphere-wrap"><svg viewBox="0 0 360 290" role="img" aria-label="Bloch sphere landmark map. Current state ' + labels[current] + (target ? ', target state ' + labels[target] : "") + '">' +
      '<defs><radialGradient id="sphereFill" cx="35%" cy="25%"><stop stop-color="#315470" stop-opacity=".9"/><stop offset="1" stop-color="#122b43" stop-opacity=".4"/></radialGradient></defs>' +
      '<circle class="sphere-ring" cx="180" cy="158" r="88"></circle>' +
      '<ellipse class="orbit" cx="180" cy="158" rx="88" ry="34" transform="rotate(16 180 158)"></ellipse>' +
      '<ellipse class="orbit" cx="180" cy="158" rx="36" ry="88" transform="rotate(-30 180 158)"></ellipse>' +
      '<line class="axis" x1="180" y1="72" x2="180" y2="244"></line>' +
      '<line class="axis back" x1="96" y1="135" x2="264" y2="181"></line>' +
      '<line class="axis back" x1="130" y1="198" x2="230" y2="118"></line>' +
      points +
      '<text class="axislabel" x="180" y="56" text-anchor="middle">|0⟩</text>' +
      '<text class="axislabel" x="180" y="267" text-anchor="middle">|1⟩</text>' +
      '<text class="axislabel" x="282" y="187">|+⟩</text>' +
      '<text class="axislabel" x="55" y="139">|−⟩</text>' +
      '<text class="axislabel" x="93" y="218">|+i⟩</text>' +
      '<text class="axislabel" x="238" y="111">|−i⟩</text>' +
      (t ? '<circle class="target-ring" cx="' + t[0] + '" cy="' + t[1] + '" r="12"></circle>' : "") +
      '<line class="state-ray" x1="180" y1="158" x2="' + c[0] + '" y2="' + c[1] + '"></line>' +
      '<circle class="state-dot" cx="' + c[0] + '" cy="' + c[1] + '" r="9"></circle>' +
      '<circle class="state-dot-inner" cx="' + c[0] + '" cy="' + c[1] + '" r="2.5"></circle>' +
      '</svg><div class="sphere-caption">Six landmark states · mint is your qubit' +
      (target ? ' · gold ring is the goal' : '') + '</div></div>';
  }
  function gateButtons(allowed, disabled) {
    return '<div class="gate-grid" aria-label="Choose a gate">' + GATES.map(g =>
      '<button class="gate" data-action="gate" data-value="' + g + '" data-gate="' + g + '"' +
      (disabled || !allowed.includes(g) ? ' disabled' : '') +
      ' aria-label="Apply ' + g + ', ' + gateInfo[g][0] + '">' +
      '<span class="gate-symbol">' + g + '</span><span class="gate-name">' + gateInfo[g][0] + '</span>' +
      '<span class="gate-desc">' + gateInfo[g][1] + '</span></button>'
    ).join("") + '</div>';
  }
  function stateChoices(action, selected) {
    return '<div class="' + (action === "predict" ? "predict-grid" : "statechoices") + '">' +
      STATES.map(s => '<button class="choice" data-action="' + action + '" data-value="' + s + '"' +
        (selected === s ? ' aria-pressed="true"' : ' aria-pressed="false"') +
        ' aria-label="' + labels[s] + '">' + labels[s] + '</button>').join("") + '</div>';
  }
  function stateBox(label, value, target) {
    return '<div class="statebox' + (target ? ' target' : '') + '"><span class="statelabel">' +
      label + '</span><strong>' + labels[value] + '</strong></div>';
  }
  function reaction() {
    if (!game.feedback) return "";
    return '<div class="reaction' + (game.feedback.good === false ? " wrong" : "") +
      '" role="status"><strong id="message-heading">' + game.feedback.title + '</strong><p>' + game.feedback.body + '</p></div>';
  }
  function questView() {
    const p = puzzleAt(game.round);
    const done = game.current === p.target && (!p.required || game.history.some(m => m.gate === p.required));
    const out = game.history.length >= p.max && !done;
    const title = game.round === 4 ? "Final challenge" : "Mission " + (game.round + 1);
    const arena = '<div class="missionline"><div><span class="eyebrow">' + title + ' / ' + rounds.length +
      '</span><h2>' + p.title + '</h2><p>' + p.note + '</p></div><span class="roundbadge">' +
      game.history.length + ' / ' + p.max + ' moves</span></div>' +
      '<div class="states">' + stateBox('Start', p.start, false) + '<span class="statearrow" aria-hidden="true">→</span>' +
      stateBox('Goal', p.target, true) + '</div>' + sphere(game.current, p.target) + readout(game.current);
    let side = '<div class="sidehead"><h3>Choose your next gate</h3><span class="eyebrow">X · Z · Y · H</span></div>';
    if (game.pending) {
      side += '<div class="stepbox"><h3>Predict before you run ' + game.pending + '</h3><p>Where will ' +
        labels[game.current] + ' move? ' + (game.group ? 'Discuss as a team, then choose one answer.' : 'Make your best guess.') +
        '</p>' + stateChoices("predict") + '<button class="smallbtn" data-action="cancel" style="margin-top:11px">Choose a different gate</button></div>';
    } else if (done) {
      const final = game.round === rounds.length - 1;
      side += '<div class="success" role="status"><h3>' + (final ? 'Challenge complete!' : 'Goal reached!') +
        '</h3><p>' + (final ? 'You cleared all five missions. Share your challenge code and describe one move that surprised you.' :
          'Nice work. You used ' + game.history.length + ' move' + (game.history.length === 1 ? '' : 's') +
          '. Explain why the last gate worked before you continue.') + '</p>' +
        '<button class="primary" data-action="' + (final ? 'new' : 'next') + '">' +
        (final ? 'Play a new challenge' : 'Next mission →') + '</button></div>';
    } else {
      side += '<p class="sidehint">' + (game.group ?
        'Take turns: one person picks a gate, another predicts, and a third explains the result.' :
        'Tap a gate, predict the new state, then compare your answer with the result.') + '</p>';
      side += gateButtons(p.allowed, out);
      if (out) side += '<div class="reaction wrong" role="status"><strong>Out of moves</strong><p>Reset this mission and try a different route.</p></div>';
    }
    side += reaction();
    side += '<div class="movebox"><div class="movehead"><span>Your moves' +
      (p.required ? ' · must include ' + p.required : '') + '</span><span>' + game.correct + '/' +
      game.predictions + ' predictions right</span></div><div class="movechips">' +
      (game.history.length ? game.history.map(m => '<span class="chip" title="' + labels[m.before] + ' to ' +
        labels[m.after] + '">' + m.gate + '</span>').join("") : '<span class="emptychip">No moves yet</span>') +
      '</div><div class="actions"><button class="smallbtn" data-action="undo"' +
      (!game.history.length || game.pending ? ' disabled' : '') + '>Undo move</button>' +
      '<button class="smallbtn" data-action="reset">Reset mission</button></div></div>';
    return { arena, side };
  }
  function labView() {
    const arena = '<div class="missionline"><div><span class="eyebrow">Free exploration</span><h2>Gate lab</h2>' +
      '<p>Pick a starting point, apply any gate, and compare the marker with the measurement odds.</p></div></div>' +
      '<div class="states">' + stateBox('Current qubit', game.current, false) + '</div>' +
      sphere(game.current) + readout(game.current);
    const side = '<div class="sidehead"><h3>Choose a gate</h3></div>' +
      '<p class="sidehint">What do you think will happen? Try the same gate twice, or test X and Y from the same state.</p>' +
      gateButtons(GATES, false) + reaction() +
      '<div class="lab-state-picker"><p>Start from another state</p>' + stateChoices("labstart", game.selectedLab) +
      '</div><div class="movebox"><div class="movehead"><span>Experiment trail</span></div><div class="movechips">' +
      (game.history.length ? game.history.map(m => '<span class="chip">' + m.gate + '</span>').join("") :
        '<span class="emptychip">Choose a gate to begin</span>') +
      '</div><div class="actions"><button class="smallbtn" data-action="undo"' +
      (!game.history.length ? ' disabled' : '') + '>Undo move</button>' +
      '<button class="smallbtn" data-action="labreset">Reset state</button></div></div>';
    return { arena, side };
  }
  function mysteryView() {
    const last = game.probes[game.probes.length - 1];
    const shown = last ? last.output : game.probeInput;
    const arena = '<div class="missionline"><div><span class="eyebrow">Deduction game</span><h2>Find the mystery gate</h2>' +
      '<p>One of X, Z, Y or H is hidden. Choose inputs, observe outputs, then name the gate.</p></div>' +
      '<span class="roundbadge">' + game.probes.length + ' / 2 probes</span></div>' +
      '<div class="states">' + stateBox('Input', last ? last.input : game.probeInput, false) +
      '<span class="statearrow" aria-hidden="true">→</span>' +
      (last ? stateBox('Output', last.output, true) : '<div class="statebox target"><span class="statelabel">Output</span><strong>?</strong></div>') +
      '</div>' + sphere(shown) + readout(shown);
    let side = '<div class="sidehead"><h3>Test the hidden gate</h3></div>' +
      '<p class="sidehint">' + (game.group ?
        'Ask your team which input would separate the remaining possibilities before probing.' :
        'Choose an input that will help distinguish the gates. You have two probes.') + '</p>' +
      '<div class="lab-state-picker" style="margin-top:0"><p>Input state</p>' +
      stateChoices("probeinput", game.probeInput) + '</div>' +
      '<button class="primary" data-action="probe" style="margin-top:11px;align-self:flex-start"' +
      (game.probes.length >= 2 || game.mysteryDone ? ' disabled' : '') + '>Run probe</button>';
    if (game.probes.length) {
      side += '<div class="probe-list" aria-label="Observed results">' +
        game.probes.map((p, i) => '<div class="probe-row"><span>Probe ' + (i + 1) + '</span><span>' +
          labels[p.input] + ' → ' + labels[p.output] + '</span></div>').join("") + '</div>' +
        '<p class="sidehint" style="margin:7px 0">Which gate matches the evidence?</p>' +
        '<div class="guess-grid">' + GATES.map(g =>
          '<button class="choice" data-action="guess" data-value="' + g + '"' +
          (game.mysteryDone ? ' disabled' : '') + ' aria-label="Guess gate ' + g + '">' + g + '</button>'
        ).join("") + '</div>';
    } else side += '<p class="small-note">Tip: Some gates look identical on |0⟩. A second input can reveal the difference.</p>';
    side += reaction();
    if (game.mysteryDone) side += '<div class="success"><button class="primary" data-action="nextmystery">Another mystery →</button></div>';
    return { arena, side };
  }
  function render() {
    const content = game.mode === "quest" ? questView() : game.mode === "lab" ? labView() : mysteryView();
    const title = game.mode === "quest" ? "Your challenge" : game.mode === "lab" ? "Practice space" : "Investigate";
    app.innerHTML = '<div class="shell"><header class="topbar"><a class="brand" href="./" aria-label="Quantum Gate Arcade home">' +
      '<span class="brandmark" aria-hidden="true"><span>H</span></span><span>QUANTUM GATE ARCADE</span></a>' +
      '<div class="topright"><span class="topnote">Learn by trying</span><button class="helpbtn" data-action="help">How to play</button></div></header>' +
      '<section class="intro"><div><h1>Make a move. See what changes.</h1>' +
      '<p>Learn X, Z, Y and H without equations.</p></div>' +
      '<div class="mode-tabs" role="group" aria-label="Game mode">' +
      [['quest', 'Gate quest'], ['lab', 'Gate lab'], ['mystery', 'Mystery gate']].map(pair =>
        '<button aria-pressed="' + (game.mode === pair[0]) + '" data-action="mode" data-value="' +
        pair[0] + '">' + pair[1] + '</button>').join("") + '</div></section>' +
      '<div class="activitybar"><div class="activityleft"><span class="eyebrow">' + title + '</span>' +
      '<span class="divider"></span><span class="activitytitle">' +
      (game.mode === "quest" ? 'Round ' + (game.round + 1) + ' of ' + rounds.length :
        game.mode === "lab" ? "Try any starting state" : "Case " + (game.mysteryIndex + 1)) +
      '</span></div><div class="activityright"><span class="muted">Challenge code</span>' +
      '<span class="code">' + game.code + '</span>' +
      '<button class="smallbtn" data-action="copy">Copy</button>' +
      '<button class="smallbtn" data-action="togglecode">' + (game.codeEntry ? "Cancel" : "Use a code") + '</button>' +
      '<button class="smallbtn" data-action="new">New</button></div></div>' +
      (game.codeEntry ? '<form id="code-form" style="background:#20344a;padding:12px 18px;border:1px solid #30465d">' +
        '<label for="code-input">Enter a six-character challenge code</label> ' +
        '<input id="code-input" name="code" maxlength="6" pattern="[A-Za-z2-9]{6}" required autocomplete="off" ' +
        'style="font:inherit;padding:7px;border-radius:6px;border:1px solid #6e92aa;width:115px;text-transform:uppercase" ' +
        'aria-describedby="code-help"> <button class="primary" type="submit">Load</button>' +
        '<span id="code-help" class="micro" style="margin-left:8px">The same code gives the same missions.</span></form>' : '') +
      '<div class="playgrid"><section class="arena" aria-label="Qubit state">' + content.arena +
      '</section><section class="side" aria-label="Game controls">' + content.side + '</section></div>' +
      '<div class="info-strip"><p><strong>Quick idea:</strong> X flips a bit; Z changes phase; Y combines a flip and phase; H changes how those differences show up.</p>' +
      '<label class="toggle"><input id="group-toggle" type="checkbox"' + (game.group ? ' checked' : '') +
      '> Breakout-room prompts</label></div>' +
      '<details class="howto" id="howto"><summary>What do these symbols mean?</summary><div class="helpbody">' +
      '<p><strong>|0⟩ and |1⟩</strong> are names for two basic states. Read |0⟩ as “zero.” ' +
      '<strong>|+⟩ and |−⟩</strong> each give 0 or 1 with a 50% chance in the simple readout, but their phase differs. ' +
      '<strong>|+i⟩ and |−i⟩</strong> are two more 50/50 states whose phase points along a different direction.</p>' +
      '<p>The sphere is a visual map of six landmarks, not a measurement of where a particle is. ' +
      'The mint marker shows the current state. A gate moves it; the bars show only the chance of getting 0 or 1 if you measure now. ' +
      'Different states can have identical bars.</p>' +
      '<p><strong>Class idea:</strong> share one challenge code with a breakout room, nominate a gate chooser, a predictor and an explainer, and rotate roles each mission. ' +
      'For independent work, students can generate their own code and report one surprising move and why it worked.</p>' +
      '</div></details><p class="status-line" id="announcement" aria-live="polite"></p></div>';
  }
  function resetQuest() {
    game.current = puzzleAt(game.round).start;
    game.history = [];
    game.pending = null;
    game.feedback = null;
  }
  function resetMystery() {
    game.probeInput = "0";
    game.probes = [];
    game.guesses = 0;
    game.mysteryDone = false;
    game.feedback = null;
  }
  function setCode(code) {
    game.mode = "quest";
    game.code = code;
    game.round = 0;
    game.predictions = 0;
    game.correct = 0;
    game.mysteryIndex = 0;
    game.selectedLab = "0";
    game.codeEntry = false;
    game.questSnapshot = null;
    game.labSnapshot = null;
    resetQuest();
    resetMystery();
    const url = new URL(location.href);
    url.searchParams.set("code", code);
    history.replaceState(null, "", url);
  }
  function announce(text) {
    const node = document.getElementById("announcement");
    if (node) node.textContent = text;
  }
  function act(action, value) {
    if (action === "mode") {
      if (game.mode === value) return;
      if (game.mode === "quest") {
        game.questSnapshot = {
          current: game.current, history: game.history, pending: game.pending,
          feedback: game.feedback, round: game.round, predictions: game.predictions,
          correct: game.correct
        };
      }
      if (game.mode === "lab") {
        game.labSnapshot = { current: game.current, history: game.history, feedback: game.feedback };
      }
      game.mode = value;
      if (value === "quest") {
        if (game.questSnapshot) Object.assign(game, game.questSnapshot);
        else resetQuest();
      }
      if (value === "lab") {
        if (game.labSnapshot) Object.assign(game, game.labSnapshot);
        else {
          game.current = game.selectedLab;
          game.history = [];
          game.feedback = null;
        }
      }
      render();
      return;
    }
    if (action === "help") {
      const details = document.getElementById("howto");
      details.open = !details.open;
      if (details.open) details.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (action === "togglecode") {
      game.codeEntry = !game.codeEntry;
      render();
      if (game.codeEntry) document.getElementById("code-input").focus();
      return;
    }
    if (action === "copy") {
      const code = game.code;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => announce("Challenge code copied: " + code))
          .catch(() => announce("Challenge code: " + code));
      } else announce("Challenge code: " + code);
      return;
    }
    if (action === "new") {
      setCode(randomCode());
      render();
      announce("New challenge code: " + game.code);
      return;
    }
    if (action === "next") {
      if (game.round < rounds.length - 1) game.round++;
      resetQuest();
      render();
      return;
    }
    if (action === "nextmystery") {
      game.mysteryIndex++;
      resetMystery();
      render();
      return;
    }
    if (action === "gate") {
      if (!GATES.includes(value)) return;
      if (game.mode === "quest") {
        const p = puzzleAt(game.round);
        const done = game.current === p.target && (!p.required || game.history.some(m => m.gate === p.required));
        if (game.pending || game.history.length >= p.max || done || !p.allowed.includes(value)) return;
        game.pending = value;
        game.feedback = null;
        render();
        const first = document.querySelector('[data-action="predict"]');
        if (first) first.focus();
        return;
      }
      if (game.mode === "lab") {
        const before = game.current;
        game.current = applyGate(value, before);
        game.history.push({ gate: value, before, after: game.current });
        game.feedback = { good: true, title: labels[before] + " → " + labels[game.current],
          body: explanation(value, before) };
        render();
      }
      return;
    }
    if (action === "predict" && game.mode === "quest" && game.pending && STATES.includes(value)) {
      const gate = game.pending;
      const before = game.current;
      const after = applyGate(gate, before);
      const correct = value === after;
      game.predictions++;
      if (correct) game.correct++;
      game.history.push({ gate, before, after, predicted: value });
      game.current = after;
      game.pending = null;
      game.feedback = { good: correct, title: correct ? "Correct prediction!" :
        "It moved to " + labels[after] + " (you chose " + labels[value] + ")",
        body: explanation(gate, before) };
      render();
      return;
    }
    if (action === "cancel") {
      game.pending = null;
      render();
      return;
    }
    if (action === "undo" && game.history.length && !game.pending) {
      const move = game.history.pop();
      game.current = move.before;
      if (game.mode === "quest") {
        game.predictions--;
        if (move.predicted === move.after) game.correct--;
      }
      game.feedback = null;
      render();
      return;
    }
    if (action === "reset") {
      const removed = game.history;
      game.predictions -= removed.length;
      game.correct -= removed.filter(m => m.predicted === m.after).length;
      resetQuest();
      render();
      return;
    }
    if (action === "labstart" && STATES.includes(value)) {
      game.selectedLab = value;
      game.current = value;
      game.history = [];
      game.feedback = null;
      render();
      return;
    }
    if (action === "labreset") {
      game.current = game.selectedLab;
      game.history = [];
      game.feedback = null;
      render();
      return;
    }
    if (action === "probeinput" && STATES.includes(value) && !game.mysteryDone) {
      game.probeInput = value;
      render();
      return;
    }
    if (action === "probe" && game.mode === "mystery" && game.probes.length < 2 && !game.mysteryDone) {
      const input = game.probeInput;
      game.probes.push({ input, output: applyGate(mysteryGate(), input) });
      game.feedback = { good: true, title: "Probe complete",
        body: "From " + labels[input] + ", the hidden gate gave " + labels[game.probes[game.probes.length - 1].output] +
          ". Which gates could still fit?" };
      render();
      return;
    }
    if (action === "guess" && game.mode === "mystery" && game.probes.length && !game.mysteryDone &&
      GATES.includes(value)) {
      const actual = mysteryGate();
      if (value === actual) {
        game.mysteryDone = true;
        game.feedback = { good: true, title: "You found it: " + actual + "!",
          body: "Check each observation against " + actual + ". Which probe was most useful?" };
      } else {
        game.guesses++;
        const mismatch = game.probes.find(p => applyGate(value, p.input) !== p.output);
        const clue = mismatch
          ? value + " would send " + labels[mismatch.input] + " to " +
            labels[applyGate(value, mismatch.input)] + ", but you observed " + labels[mismatch.output] + "."
          : "Your probes have not separated " + value + " from the hidden gate. Try a different input.";
        if (game.guesses >= 2) {
          game.mysteryDone = true;
          game.feedback = { good: false, title: "The hidden gate was " + actual,
            body: clue + " Try another mystery and test two different kinds of state." };
        } else game.feedback = { good: false, title: "Not " + value + " yet", body: clue };
      }
      render();
    }
  }
  app.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (button && !button.disabled) act(button.dataset.action, button.dataset.value);
  });
  app.addEventListener("change", event => {
    if (event.target.id === "group-toggle") {
      game.group = event.target.checked;
      render();
    }
  });
  app.addEventListener("submit", event => {
    if (event.target.id !== "code-form") return;
    event.preventDefault();
    const input = document.getElementById("code-input");
    const code = input.value.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(code)) {
      input.setCustomValidity("Enter six letters or digits from 2 to 9.");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
    setCode(code);
    render();
    announce("Loaded challenge " + code);
  });
  document.addEventListener("keydown", event => {
    const target = event.target;
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
    const gate = event.key.toUpperCase();
    if (GATES.includes(gate) && (game.mode === "lab" || game.mode === "quest")) {
      event.preventDefault();
      act("gate", gate);
    }
  });
  if (document.modelContext && document.modelContext.registerTool) {
    const register = tool => {
      try { Promise.resolve(document.modelContext.registerTool(tool)).catch(() => {}); } catch (_) {}
    };
    register({
      name: "read_quantum_gate_game", title: "Read quantum gate game",
      description: "Read the visible mode, current state, challenge and observations.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute() {
        return { mode: game.mode, code: game.code, state: game.current,
          round: game.mode === "quest" ? game.round + 1 : null,
          goal: game.mode === "quest" ? puzzleAt(game.round).target : null,
          probes: game.probes.map(p => ({ ...p })) };
      }
    });
    register({
      name: "start_quantum_gate_challenge", title: "Start a challenge",
      description: "Load a valid six-character challenge code and show its first mission.",
      inputSchema: { type: "object", properties: { code: { type: "string", pattern: "^[A-Za-z2-9]{6}$" } },
        required: ["code"], additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute(input) {
        if (!input || typeof input.code !== "string" || !/^[A-Za-z2-9]{6}$/.test(input.code))
          throw new Error("A six-character challenge code is required.");
        game.mode = "quest";
        setCode(input.code.toUpperCase());
        render();
        return { code: game.code, round: 1, state: game.current, goal: puzzleAt(0).target };
      }
    });
  }
  render();
})();

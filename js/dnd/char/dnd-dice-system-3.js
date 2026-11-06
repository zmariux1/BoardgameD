(function (global) {
  "use strict";

  // Defaults are immutable. Every roll resolves its own settings and never changes these values.
  const DEFAULT_PER_DIE_MODIFIER = 0;
  const DEFAULT_TOTAL_MODIFIER = 0;
  const SUPPORTED_DICE = Object.freeze([4, 6, 8, 10, 12, 20, 100]);
  const MAX_DICE_PER_ROLL = 100;
  const DEFAULT_ANIMATION = Object.freeze({
    minSpinMs: 900,
    maxSpinMs: 1850,
    staggerMs: 35,
    tickMs: 68,
    holdMs: 5000,
    fadeMs: 850,
    discardFadeMs: 280
  });

  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  let rollerInstance = null;
  let demoBound = false;

  function randomInt(min, max) {
    const range = max - min + 1;
    const cryptoApi = global.crypto;

    if (cryptoApi && typeof cryptoApi.getRandomValues === "function" && range > 0 && range <= 0x100000000) {
      const limit = Math.floor(0x100000000 / range) * range;
      const buffer = new Uint32Array(1);
      let value;
      do {
        cryptoApi.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);
      return min + (value % range);
    }

    return min + Math.floor(Math.random() * range);
  }

  function formatSigned(value) {
    if (value > 0) return "+" + value;
    if (value < 0) return "−" + Math.abs(value);
    return "";
  }

  function readInteger(value, name, min, max) {
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(number) || !Number.isInteger(number)) {
      throw new TypeError(name + " trebuie să fie un număr întreg.");
    }
    if (number < min || number > max) {
      throw new RangeError(name + " trebuie să fie între " + min + " și " + max + ".");
    }
    return number;
  }

  function parseNotation(notation) {
    if (typeof notation !== "string") {
      throw new TypeError("Notația zarurilor trebuie să fie un text, de exemplu '2d4+1;+2'.");
    }

    const match = notation.trim().match(/^(\d+)\s*d\s*(100|20|12|10|8|6|4)([+-]\d+)?(?:;([+-]\d+))?$/i);
    if (!match) {
      throw new Error("Notație invalidă: '" + notation + "'. Format acceptat: NdS[±modificator-per-zar][;±modificator-total].");
    }

    const count = readInteger(Number(match[1]), "Numărul de zaruri", 1, MAX_DICE_PER_ROLL);
    const sides = readInteger(Number(match[2]), "Tipul zarului", 1, 100);
    if (!SUPPORTED_DICE.includes(sides)) {
      throw new Error("Zarul d" + sides + " nu este suportat.");
    }
    const perDieModifier = readInteger(Number(match[3] || 0), "Modificator per zar", -9999, 9999);
    const totalModifier = readInteger(Number(match[4] || 0), "Modificator total", -9999, 9999);
    return { dice: [{ sides, count }], perDieModifier, totalModifier };
  }

  function parseTotalNotation(notation) {
    if (typeof notation !== "string") {
      throw new TypeError("Notația damage-ului trebuie să fie un text.");
    }

    const expression = notation.trim();
    if (!expression) {
      throw new Error("Notația damage-ului este goală.");
    }

    const dice = [];
    let totalModifier = 0;
    let cursor = 0;

    while (cursor < expression.length) {
      while (/\s/.test(expression[cursor] || "")) cursor += 1;
      let sign = 1;
      if (expression[cursor] === "+" || expression[cursor] === "-") {
        sign = expression[cursor] === "-" ? -1 : 1;
        cursor += 1;
        while (/\s/.test(expression[cursor] || "")) cursor += 1;
      } else if (cursor > 0) {
        throw new Error("Termenii damage-ului trebuie separați prin + sau -.");
      }

      const remaining = expression.slice(cursor);
      const diceMatch = remaining.match(/^(\d+)\s*d\s*(100|20|12|10|8|6|4)/i);
      const numberMatch = remaining.match(/^(\d+)/);

      if (diceMatch) {
        if (sign < 0) {
          throw new Error("Zarurile damage-ului nu pot avea un semn negativ.");
        }
        const count = readInteger(Number(diceMatch[1]), "Numărul de zaruri", 1, MAX_DICE_PER_ROLL);
        const sides = readInteger(Number(diceMatch[2]), "Tipul zarului", 1, 100);
        if (!SUPPORTED_DICE.includes(sides)) {
          throw new Error("Zarul d" + sides + " nu este suportat.");
        }
        dice.push({ sides, count, modifier: 0 });
        cursor += diceMatch[0].length;
      } else if (numberMatch) {
        totalModifier += sign * Number(numberMatch[1]);
        cursor += numberMatch[0].length;
      } else {
        throw new Error("Termenul '" + remaining.trim() + "' nu poate fi interpretat ca zar sau modificator numeric.");
      }

      while (/\s/.test(expression[cursor] || "")) cursor += 1;
      if (cursor < expression.length && expression[cursor] !== "+" && expression[cursor] !== "-") {
        throw new Error("Termenii damage-ului trebuie separați prin + sau -.");
      }
    }

    if (dice.length === 0) {
      throw new Error("Notația damage-ului trebuie să conțină cel puțin un zar.");
    }

    return { dice, perDieModifier: 0, totalModifier };
  }

  function validateTiming(settings) {
    const minSpinMs = readInteger(settings.minSpinMs, "minSpinMs", 100, 10000);
    const maxSpinMs = readInteger(settings.maxSpinMs, "maxSpinMs", minSpinMs, 10000);
    const staggerMs = readInteger(settings.staggerMs, "staggerMs", 0, 2000);
    const tickMs = readInteger(settings.tickMs, "tickMs", 25, 500);
    const holdMs = readInteger(settings.holdMs, "holdMs", 0, 60000);
    const fadeMs = readInteger(settings.fadeMs, "fadeMs", 100, 5000);
    const discardFadeMs = readInteger(
      settings.discardFadeMs == null ? DEFAULT_ANIMATION.discardFadeMs : settings.discardFadeMs,
      "discardFadeMs", 100, 2000
    );
    return { minSpinMs, maxSpinMs, staggerMs, tickMs, holdMs, fadeMs, discardFadeMs };
  }

  function normaliseMode(settings) {
    let mode;

    if (settings.mode != null) {
      mode = settings.mode;
    } else if (settings.rollMode != null) {
      mode = settings.rollMode;
    } else if (settings.advantage === true && settings.disadvantage === true) {
      throw new Error("Alege fie avantaj, fie dezavantaj, nu ambele simultan.");
    } else if (settings.advantage === true) {
      mode = "advantage";
    } else if (settings.disadvantage === true) {
      mode = "disadvantage";
    } else {
      mode = "normal";
    }

    mode = String(mode).trim().toLowerCase();
    const aliases = {
      normal: "normal",
      none: "normal",
      advantage: "advantage",
      adv: "advantage",
      disadvantage: "disadvantage",
      disadv: "disadvantage"
    };

    if (!hasOwn(aliases, mode)) {
      throw new Error("Mod de aruncare invalid. Valorile acceptate sunt 'normal', 'advantage' și 'disadvantage'.");
    }
    return aliases[mode];
  }

  function normaliseInput(input, overrides) {
    let source;

    if (typeof input === "string") {
      source = parseNotation(input);
    } else if (Array.isArray(input)) {
      source = { dice: input };
    } else if (input && typeof input === "object") {
      source = Object.assign({}, input);
      if (!source.dice && source.count == null && source.sides == null && source.notation) {
        source = Object.assign({}, parseNotation(source.notation), source);
      }
    } else {
      throw new TypeError("Transmite o notație, de exemplu '2d4', sau un obiect de configurare.");
    }

    const settings = Object.assign({}, source, overrides || {});
    const mode = normaliseMode(settings);
    const globalPerDieModifier = readInteger(
      settings.perDieModifier == null ? DEFAULT_PER_DIE_MODIFIER : settings.perDieModifier,
      "perDieModifier", -9999, 9999
    );
    const totalModifier = readInteger(
      settings.totalModifier == null ? DEFAULT_TOTAL_MODIFIER : settings.totalModifier,
      "totalModifier", -9999, 9999
    );

    let rawSpecs = settings.dice;
    if (!rawSpecs && settings.count != null && settings.sides != null) {
      rawSpecs = [{ count: settings.count, sides: settings.sides }];
    }
    if (!Array.isArray(rawSpecs) || rawSpecs.length === 0) {
      throw new Error("Configurația trebuie să conțină cel puțin un zar.");
    }

    const specs = [];
    for (const rawSpec of rawSpecs) {
      let spec;
      if (typeof rawSpec === "number") {
        spec = { sides: rawSpec, count: 1 };
      } else if (typeof rawSpec === "string") {
        const parsed = parseNotation(rawSpec);
        for (const parsedSpec of parsed.dice) {
          for (let i = 0; i < parsedSpec.count; i += 1) {
            specs.push({ sides: parsedSpec.sides, modifier: globalPerDieModifier });
            if (specs.length > MAX_DICE_PER_ROLL) {
              throw new RangeError("O aruncare poate conține maximum " + MAX_DICE_PER_ROLL + " de zaruri.");
            }
          }
        }
        continue;
      } else if (rawSpec && typeof rawSpec === "object") {
        spec = rawSpec;
      } else {
        throw new TypeError("Fiecare zar trebuie să fie un număr de laturi sau un obiect { sides, count }.");
      }

      const sides = readInteger(spec.sides, "sides", 1, 100);
      if (!SUPPORTED_DICE.includes(sides)) {
        throw new Error("Zarul d" + sides + " nu este suportat. Tipuri acceptate: " + SUPPORTED_DICE.map((n) => "d" + n).join(", ") + ".");
      }
      const count = readInteger(spec.count == null ? 1 : spec.count, "count", 1, MAX_DICE_PER_ROLL);
      const hasCustomModifier = hasOwn(spec, "modifier") || hasOwn(spec, "perDieModifier");
      const rawModifier = hasOwn(spec, "modifier") ? spec.modifier : spec.perDieModifier;
      const modifier = hasCustomModifier
        ? readInteger(rawModifier, "modifier", -9999, 9999)
        : globalPerDieModifier;
      const durationMs = spec.durationMs == null
        ? null
        : readInteger(spec.durationMs, "durationMs", 100, 15000);

      for (let i = 0; i < count; i += 1) {
        specs.push({ sides, modifier, durationMs });
      }
      if (specs.length > MAX_DICE_PER_ROLL) {
        throw new RangeError("O aruncare poate conține maximum " + MAX_DICE_PER_ROLL + " de zaruri.");
      }
    }

    if (specs.length < 1 || specs.length > MAX_DICE_PER_ROLL) {
      throw new RangeError("O aruncare trebuie să conțină între 1 și " + MAX_DICE_PER_ROLL + " de zaruri.");
    }

    const timings = validateTiming(Object.assign({}, DEFAULT_ANIMATION, settings));
    const label = settings.label == null ? "" : String(settings.label).trim().slice(0, 100);

    return { specs, totalModifier, label, mode, timings };
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  class DiceRoller {
    constructor() {
      this.runId = 0;
      this.timeouts = new Set();
      this.intervals = new Set();
      this.pendingResolve = null;
      this.lastResult = null;
      this._createOverlay();
    }

    _createOverlay() {
      let root = document.querySelector("[data-dnd-dice-overlay]");
      if (!root) {
        root = createElement("div", "dnd-dice-overlay");
        root.setAttribute("data-dnd-dice-overlay", "");
        root.hidden = true;
        root.setAttribute("aria-label", "Rezultatele aruncării de zaruri");
        document.body.appendChild(root);
      }

      root.classList.add("dnd-dice-overlay");
      root.hidden = true;
      root.replaceChildren();
      this.root = root;
      this.panelsWrap = createElement("div", "dnd-dice-panels");
      root.appendChild(this.panelsWrap);
      this.panelRefs = [];
      this._buildPanels(false);
    }

    _buildPanels(paired) {
      this.panelsWrap.replaceChildren();
      this.panelsWrap.className = "dnd-dice-panels" + (paired ? " is-paired" : " is-single");
      this.panelsWrap.removeAttribute("data-kept-candidate");
      this.panelRefs = [];

      const panelCount = paired ? 2 : 1;
      for (let index = 0; index < panelCount; index += 1) {
        const candidate = index === 0 ? "A" : "B";
        const panel = createElement("section", "dnd-dice-panel" + (paired ? " dnd-dice-panel--candidate-" + candidate.toLowerCase() : " dnd-dice-panel--single"));
        panel.dataset.candidate = candidate;
        panel.setAttribute("aria-label", paired ? "Aruncarea candidat " + candidate : "Rezultatul aruncării");

        let heading = null;
        if (paired) {
          heading = createElement("div", "dnd-dice-panel-heading");
          const indexMark = createElement("span", "dnd-dice-panel-index", candidate);
          const title = createElement("span", "dnd-dice-panel-title", "Candidat " + candidate);
          heading.append(indexMark, title);
        }

        const totalBox = createElement("section", "dnd-dice-total-box");
        totalBox.setAttribute("aria-label", "Totalul aruncării " + (paired ? candidate : "curente"));
        const totalCopy = createElement("div", "dnd-dice-total-copy");
        const totalLabel = createElement("span", "dnd-dice-total-label", paired ? "Total curent" : "Total în timp real");
        const totalValue = createElement("strong", "dnd-dice-total-value", "—");
        const totalModifier = createElement("span", "dnd-dice-total-modifier", "");
        totalModifier.hidden = true;
        totalValue.appendChild(totalModifier);
        totalCopy.append(totalLabel, totalValue);
        const status = createElement("span", "dnd-dice-status", paired ? "În curs…" : "");
        status.setAttribute("aria-live", "off");
        totalBox.append(totalCopy, status);

        const results = createElement("div", "dnd-dice-results");
        results.setAttribute("aria-label", "Zarurile rezultatului " + (paired ? candidate : "curent"));
        panel.append(...(heading ? [heading, totalBox, results] : [totalBox, results]));
        this.panelsWrap.appendChild(panel);

        this.panelRefs.push({
          candidate,
          element: panel,
          heading,
          totalBox,
          totalLabel,
          totalValue,
          totalModifier,
          status,
          results
        });
      }

      // Retain aliases used by the single-roll mode and by cleanup.
      const firstPanel = this.panelRefs[0];
      this.results = firstPanel.results;
      this.totalLabel = firstPanel.totalLabel;
      this.totalValue = firstPanel.totalValue;
      this.totalModifier = firstPanel.totalModifier;
      this.status = firstPanel.status;
    }

    _clearTimers() {
      for (const timer of this.timeouts) global.clearTimeout(timer);
      for (const timer of this.intervals) global.clearInterval(timer);
      this.timeouts.clear();
      this.intervals.clear();
    }

    _cancelCurrentRun() {
      this._clearTimers();
      this.runId += 1;
      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve({ cancelled: true });
      }
    }

    _setTimeout(callback, delay, runId) {
      const timer = global.setTimeout(() => {
        this.timeouts.delete(timer);
        if (runId !== this.runId) return;
        callback();
      }, delay);
      this.timeouts.add(timer);
      return timer;
    }

    _setInterval(callback, delay, runId) {
      const timer = global.setInterval(() => {
        if (runId !== this.runId) {
          global.clearInterval(timer);
          this.intervals.delete(timer);
          return;
        }
        callback();
      }, delay);
      this.intervals.add(timer);
      return timer;
    }

    _renderDie(die, index, faceIndex) {
      const item = createElement("div", "dnd-die-result is-rolling");
      item.dataset.dieIndex = String(index);
      item.dataset.faceIndex = String(faceIndex);
      item.dataset.sides = String(die.sides);

      const line = createElement("div", "dnd-die-result__line");
      const glyph = createElement("div", "dnd-die-glyph dnd-die-glyph--d" + die.sides);
      glyph.setAttribute("role", "img");
      glyph.setAttribute("aria-label", "Zar d" + die.sides + ", în curs de aruncare");
      const face = createElement("span", "dnd-die-face", String(die.faces[faceIndex].currentFace));
      glyph.appendChild(face);
      line.appendChild(glyph);

      let modifierElement = null;
      if (die.modifier !== 0) {
        modifierElement = createElement("span", "dnd-die-modifier", formatSigned(die.modifier));
        modifierElement.setAttribute("aria-label", "Modificator per zar " + formatSigned(die.modifier));
        line.appendChild(modifierElement);
      }

      // Candidate A/B is identified by its surrounding panel, so the die label stays compact.
      const labelText = "D" + die.sides;
      const label = createElement("span", "dnd-die-label", labelText);
      item.append(line, label);

      return { item, glyph, face, modifierElement, label };
    }

    _candidateTotal(dice, candidateIndex, useCurrentValues, totalModifier) {
      return dice.reduce((sum, die) => {
        const face = die.faces[candidateIndex];
        const value = useCurrentValues ? face.currentFace : face.finalFace;
        return sum + value + die.modifier;
      }, 0) + totalModifier;
    }

    _updateTotals(dice, totalModifier, mode) {
      const paired = mode !== "normal";
      const totals = [];
      const candidateCount = paired ? 2 : 1;

      for (let index = 0; index < candidateCount; index += 1) {
        const panel = this.panelRefs[index];
        const total = this._candidateTotal(dice, index, true, totalModifier);
        panel.totalValue.firstChild.nodeValue = String(total);
        panel.totalModifier.textContent = totalModifier === 0 ? "" : formatSigned(totalModifier) + " total";
        panel.totalModifier.hidden = totalModifier === 0;
        totals.push(total);
      }

      return totals;
    }

    _finalizePanels(mode, totals, dice, totalModifier) {
      if (mode === "normal") return 0;

      // Pick the shell to retain by comparing the two candidate totals. The retained
      // shell then becomes the final result surface, containing each die's chosen face.
      const keepPanelIndex = mode === "advantage"
        ? (totals[0] >= totals[1] ? 0 : 1)
        : (totals[0] <= totals[1] ? 0 : 1);
      const discardPanelIndex = keepPanelIndex === 0 ? 1 : 0;
      const keepPanel = this.panelRefs[keepPanelIndex];
      const discardPanel = this.panelRefs[discardPanelIndex];

      this.panelsWrap.dataset.keptCandidate = keepPanel.candidate;
      this.panelsWrap.classList.add("has-selection");
      keepPanel.element.classList.add("is-kept-panel");
      discardPanel.element.classList.add("is-discarded-panel");
      discardPanel.element.setAttribute("aria-hidden", "true");

      // Preserve the engine's existing D&D logic: choose the higher/lower face per die,
      // then consolidate those selected faces in the one panel that remains visible.
      const selectedItems = [];
      dice.forEach((die) => {
        const first = die.faces[0].finalFace;
        const second = die.faces[1].finalFace;
        die.chosenFaceIndex = mode === "advantage"
          ? (first >= second ? 0 : 1)
          : (first <= second ? 0 : 1);

        die.faces.forEach((face, faceIndex) => {
          if (faceIndex === die.chosenFaceIndex) {
            face.view.item.classList.add("is-kept");
            face.view.item.removeAttribute("aria-hidden");
            selectedItems.push(face.view.item);
          } else {
            face.view.item.classList.add("is-discarded");
            face.view.item.setAttribute("aria-hidden", "true");
          }
        });
      });
      // Reappend in die order so selected results remain in the original expression order.
      selectedItems.forEach((item) => keepPanel.results.appendChild(item));

      const selectedTotal = dice.reduce((sum, die) => {
        return sum + die.faces[die.chosenFaceIndex].finalFace + die.modifier;
      }, 0) + totalModifier;
      keepPanel.totalLabel.textContent = "Rezultat final";
      keepPanel.totalValue.firstChild.nodeValue = String(selectedTotal);
      keepPanel.totalModifier.textContent = totalModifier === 0 ? "" : formatSigned(totalModifier) + " total";
      keepPanel.totalModifier.hidden = totalModifier === 0;
      keepPanel.status.textContent = mode === "advantage"
        ? "Avantaj · valorile mai mari păstrate"
        : "Dezavantaj · valorile mai mici păstrate";
      discardPanel.status.textContent = "Rezultat eliminat";

      const keepTitle = keepPanel.heading && keepPanel.heading.querySelector(".dnd-dice-panel-title");
      const keepMark = keepPanel.heading && keepPanel.heading.querySelector(".dnd-dice-panel-index");
      const discardTitle = discardPanel.heading && discardPanel.heading.querySelector(".dnd-dice-panel-title");
      const discardMark = discardPanel.heading && discardPanel.heading.querySelector(".dnd-dice-panel-index");
      if (keepTitle) keepTitle.textContent = "Rezultat păstrat";
      if (keepMark) keepMark.textContent = "✓";
      if (discardTitle) discardTitle.textContent = "Rezultat eliminat";
      if (discardMark) discardMark.textContent = "×";

      return keepPanelIndex;
    }

    roll(input, overrides) {
      // Validate first: an invalid new request will not interrupt an animation already in progress.
      const config = normaliseInput(input, overrides);
      this._cancelCurrentRun();
      const runId = this.runId;
      const usedDurations = new Set();
      const paired = config.mode !== "normal";
      let faceSequence = 0;

      this._buildPanels(paired);
      this.root.hidden = false;
      this.root.classList.remove("is-fading");
      this.root.style.transitionDuration = config.timings.fadeMs + "ms";
      this.panelsWrap.style.setProperty("--dice-discard-fade", config.timings.discardFadeMs + "ms");
      this.root.dataset.state = "rolling";
      this.root.dataset.mode = config.mode;
      this.root.dataset.label = config.label || "";
      this.panelRefs.forEach((panel) => {
        panel.element.classList.remove("is-kept-panel", "is-discarded-panel");
        panel.element.removeAttribute("aria-hidden");
        panel.element.style.setProperty("--dice-discard-fade", config.timings.discardFadeMs + "ms");
        panel.status.textContent = paired ? "În curs…" : "";
        panel.totalLabel.textContent = paired ? "Total în timp real" : (config.label || "Total în timp real");
        panel.results.replaceChildren();
      });
      this.lastResult = null;

      const dice = config.specs.map((spec, index) => {
        const faceCount = paired ? 2 : 1;
        const faces = Array.from({ length: faceCount }, (_, faceIndex) => {
          let durationMs;
          if (spec.durationMs != null) {
            durationMs = spec.durationMs + (paired && faceIndex === 1 ? randomInt(140, 360) : 0);
          } else {
            durationMs = randomInt(config.timings.minSpinMs, config.timings.maxSpinMs)
              + Math.min(faceSequence * config.timings.staggerMs, 900);
          }
          faceSequence += 1;
          while (usedDurations.has(durationMs)) durationMs += 7;
          usedDurations.add(durationMs);

          return {
            durationMs,
            finalFace: randomInt(1, spec.sides),
            currentFace: randomInt(1, spec.sides),
            settled: false,
            view: null
          };
        });

        const die = {
          sides: spec.sides,
          modifier: spec.modifier,
          mode: config.mode,
          faces,
          chosenFaceIndex: 0
        };

        faces.forEach((face, faceIndex) => {
          face.view = this._renderDie(die, index, faceIndex);
          face.view.item.style.setProperty("--dice-discard-fade", config.timings.discardFadeMs + "ms");
          face.view.glyph.setAttribute("aria-label", "Zar d" + die.sides + ", valoare animată " + face.currentFace);
          const targetPanel = this.panelRefs[paired ? faceIndex : 0];
          targetPanel.results.appendChild(face.view.item);
        });

        return die;
      });

      this._updateTotals(dice, config.totalModifier, config.mode);

      return new Promise((resolve) => {
        let settledFaceCount = 0;
        let resolved = false;
        const totalFaces = dice.reduce((sum, die) => sum + die.faces.length, 0);

        const resolveRun = (result) => {
          if (resolved) return;
          resolved = true;
          if (this.pendingResolve === resolveRun) this.pendingResolve = null;
          resolve(result);
        };
        this.pendingResolve = resolveRun;

        const finish = () => {
          if (runId !== this.runId) return;
          dice.forEach((die) => {
            die.faces.forEach((face) => {
              face.currentFace = face.finalFace;
              face.view.face.textContent = String(face.finalFace);
              face.view.item.classList.remove("is-rolling");
              face.view.item.classList.add("is-settled");
              face.view.glyph.setAttribute("aria-label", "Zar d" + die.sides + ", rezultat " + face.finalFace);
            });
          });

          const candidateTotals = this._updateTotals(dice, config.totalModifier, config.mode);
          const keptPanelIndex = this._finalizePanels(config.mode, candidateTotals, dice, config.totalModifier);
          const total = dice.reduce((sum, die) => {
            return sum + die.faces[die.chosenFaceIndex].finalFace + die.modifier;
          }, 0) + config.totalModifier;

          this.root.dataset.state = "complete";
          this.panelRefs.forEach((panel) => {
            panel.totalLabel.textContent = "Rezultat final";
            if (config.mode === "normal") {
              panel.status.textContent = config.label || "Aruncare stabilizată";
            }
          });

          const result = {
            cancelled: false,
            label: config.label,
            mode: config.mode,
            dice: dice.map((die) => {
              const selectedFace = die.faces[die.chosenFaceIndex];
              const rolls = die.faces.map((face) => face.finalFace);
              const entry = {
                sides: die.sides,
                roll: selectedFace.finalFace,
                modifier: die.modifier,
                subtotal: selectedFace.finalFace + die.modifier
              };
              if (die.mode !== "normal") {
                entry.rolls = rolls;
                entry.discardedRoll = rolls[die.chosenFaceIndex === 0 ? 1 : 0];
                entry.keptRoll = selectedFace.finalFace;
              }
              return entry;
            }),
            totalModifier: config.totalModifier,
            total
          };
          this.lastResult = result;
          resolveRun(result);

          this._setTimeout(() => {
            if (runId !== this.runId) return;
            this.root.classList.add("is-fading");
            this._setTimeout(() => {
              if (runId !== this.runId) return;
              this.root.hidden = true;
              this.root.classList.remove("is-fading");
              this.root.dataset.state = "idle";
              this.root.dataset.mode = "normal";
            }, config.timings.fadeMs, runId);
          }, config.timings.holdMs, runId);
        };

        const settleFace = (die, face) => {
          if (runId !== this.runId || face.settled) return;
          face.currentFace = face.finalFace;
          face.settled = true;
          face.view.face.textContent = String(face.finalFace);
          face.view.item.classList.remove("is-rolling");
          face.view.item.classList.add("is-settled");
          face.view.glyph.setAttribute("aria-label", "Zar d" + die.sides + ", rezultat " + face.finalFace);

          this._updateTotals(dice, config.totalModifier, config.mode);
          settledFaceCount += 1;
          if (settledFaceCount === totalFaces) finish();
        };

        dice.forEach((die) => {
          die.faces.forEach((face) => {
            const interval = this._setInterval(() => {
              if (face.settled) return;
              face.currentFace = randomInt(1, die.sides);
              face.view.face.textContent = String(face.currentFace);
              face.view.glyph.setAttribute("aria-label", "Zar d" + die.sides + ", valoare animată " + face.currentFace);
              this._updateTotals(dice, config.totalModifier, config.mode);
            }, config.timings.tickMs, runId);

            this._setTimeout(() => {
              global.clearInterval(interval);
              this.intervals.delete(interval);
              settleFace(die, face);
            }, face.durationMs, runId);
          });
        });
      });
    }

    clear() {
      this._cancelCurrentRun();
      this.root.hidden = true;
      this.root.classList.remove("is-fading");
      this.root.style.transitionDuration = "";
      this.root.dataset.state = "idle";
      this.root.dataset.mode = "normal";
      this.root.removeAttribute("data-label");
      this._buildPanels(false);
      this.lastResult = null;
    }
  }

  function getRoller() {
    if (!rollerInstance) {
      if (!document.body) {
        throw new Error("DNDice trebuie apelat după ce documentul HTML are un element body.");
      }
      rollerInstance = new DiceRoller();
    }
    return rollerInstance;
  }

  function bindDeclarativeTriggers() {
    if (demoBound) return;
    demoBound = true;
    document.addEventListener("click", (event) => {
      const button = event.target && event.target.closest
        ? event.target.closest(".diceRoller_JS, .diceRollerTotal_JS, [data-dnd-roll]")
        : null;
      if (!button || button.disabled) return;

      const options = {};
      if (hasOwn(button.dataset, "dndPerDieModifier")) options.perDieModifier = Number(button.dataset.dndPerDieModifier);
      if (hasOwn(button.dataset, "dndTotalModifier")) options.totalModifier = Number(button.dataset.dndTotalModifier);
      if (hasOwn(button.dataset, "dndLabel")) options.label = button.dataset.dndLabel;
      if (hasOwn(button.dataset, "dndMode")) options.mode = button.dataset.dndMode;

      try {
        const isTotalOnlyTrigger = button.classList.contains("diceRollerTotal_JS");
        const isSkillTrigger = button.classList.contains("diceRoller_JS");
        const notation = isTotalOnlyTrigger
          ? parseTotalNotation(button.value)
          : isSkillTrigger
            ? button.value
            : button.dataset.dndRoll;
        if ((isSkillTrigger || isTotalOnlyTrigger) && !hasOwn(button.dataset, "dndLabel")) {
          options.label = button.closest(".skill-row")?.querySelector(".skill-row__name")?.textContent.trim()
            || button.closest(".spell-row")?.dataset.spellName
            || "Aruncare skill";
        }
        getRoller().roll(notation, options).catch((error) => console.error("DNDice:", error));
      } catch (error) {
        console.error("DNDice:", error);
      }
    });

    document.querySelectorAll(".diceRollerTotal_JS").forEach((button) => {
      try {
        parseTotalNotation(button.value);
      } catch (error) {
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
        button.title = "Formula damage-ului nu poate fi rulată automat.";
      }
    });
  }

  function bindDemoBuilder() {
    const builder = document.querySelector(".dice-builder");
    if (!builder || builder.dataset.diceBound === "true") return;
    builder.dataset.diceBound = "true";

    const counts = Object.fromEntries(SUPPORTED_DICE.map((sides) => [sides, 0]));
    const notationOutput = builder.querySelector("[data-dice-notation]");
    const countOutput = builder.querySelector("[data-dice-count]");
    const message = builder.querySelector("[data-dice-builder-message]");
    const confirmButton = builder.querySelector("[data-confirm-dice]");
    const perDieInput = builder.querySelector("#dice-per-die-modifier");
    const totalInput = builder.querySelector("#dice-total-modifier");
    const modeButtons = Array.from(builder.querySelectorAll("[data-roll-mode]"));
    const modeDescription = builder.querySelector("[data-mode-description]");
    let selectedMode = "normal";

    const updateModeButtons = () => {
      modeButtons.forEach((button) => {
        const active = button.dataset.rollMode === selectedMode;
        button.setAttribute("aria-pressed", String(active));
        button.classList.toggle("is-active", active);
      });
      if (modeDescription) {
        modeDescription.textContent = selectedMode === "advantage"
          ? "Advantage · se păstrează valoarea mai mare"
          : selectedMode === "disadvantage"
            ? "Disadvantage · se păstrează valoarea mai mică"
            : "Normal roll · un singur set de zaruri";
      }
    };

    const totalSelected = () => SUPPORTED_DICE.reduce((sum, sides) => sum + counts[sides], 0);
    const currentNotation = () => SUPPORTED_DICE
      .filter((sides) => counts[sides] > 0)
      .map((sides) => counts[sides] + "d" + sides)
      .join(" + ");

    const update = () => {
      const total = totalSelected();
      notationOutput.textContent = currentNotation() || "—";
      countOutput.textContent = total + " / " + MAX_DICE_PER_ROLL;
      confirmButton.disabled = total === 0;

      builder.querySelectorAll("[data-count-for]").forEach((counter) => {
        const sides = Number(counter.dataset.countFor);
        counter.textContent = String(counts[sides] || 0);
      });
      builder.querySelectorAll("[data-add-die]").forEach((button) => {
        button.disabled = total >= MAX_DICE_PER_ROLL;
      });

      if (total >= MAX_DICE_PER_ROLL) {
        message.textContent = "Limita de " + MAX_DICE_PER_ROLL + " de zaruri a fost atinsă.";
      } else if (total === 0) {
        message.textContent = "Apasă un tip de zar pentru a-l adăuga în aruncare.";
      } else {
        message.textContent = "Selectate: " + currentNotation() + ". Poți combina tipuri diferite de zaruri.";
      }
    };

    builder.addEventListener("click", (event) => {
      const modeButton = event.target.closest("[data-roll-mode]");
      if (modeButton) {
        const requestedMode = modeButton.dataset.rollMode;
        selectedMode = selectedMode === requestedMode ? "normal" : requestedMode;
        updateModeButtons();
        return;
      }

      const addButton = event.target.closest("[data-add-die]");
      if (addButton) {
        const sides = Number(addButton.dataset.addDie);
        if (SUPPORTED_DICE.includes(sides) && totalSelected() < MAX_DICE_PER_ROLL) {
          counts[sides] += 1;
          update();
        }
        return;
      }

      const clearButton = event.target.closest("[data-clear-dice]");
      if (clearButton) {
        SUPPORTED_DICE.forEach((sides) => { counts[sides] = 0; });
        perDieInput.value = "0";
        totalInput.value = "0";
        selectedMode = "normal";
        updateModeButtons();
        getRoller().clear();
        update();
        return;
      }

      const rollButton = event.target.closest("[data-confirm-dice]");
      if (rollButton && !rollButton.disabled) {
        const dice = SUPPORTED_DICE
          .filter((sides) => counts[sides] > 0)
          .map((sides) => ({ sides, count: counts[sides] }));

        let perDieModifier;
        let totalModifier;
        try {
          perDieModifier = readInteger(perDieInput.value || 0, "Modifier / die", -99, 99);
          totalModifier = readInteger(totalInput.value || 0, "Total modifier", -99, 99);
        } catch (error) {
          message.textContent = error.message;
          return;
        }

        getRoller().roll({
          dice,
          perDieModifier,
          totalModifier,
          mode: selectedMode,
          label: "Aruncare personalizată"
        }).catch((error) => console.error("DNDice:", error));
      }
    });

    update();
    updateModeButtons();
  }

  // Stable public API for inline event handlers and other page modules.
  global.DNDice = Object.freeze({
    roll(input, options) {
      return getRoller().roll(input, options);
    },
    clear() {
      getRoller().clear();
    },
    getLastResult() {
      return getRoller().lastResult;
    },
    getConfig() {
      return Object.freeze({
        defaultPerDieModifier: DEFAULT_PER_DIE_MODIFIER,
        defaultTotalModifier: DEFAULT_TOTAL_MODIFIER,
        supportedDice: SUPPORTED_DICE.slice(),
        maxDicePerRoll: MAX_DICE_PER_ROLL,
        animation: Object.assign({}, DEFAULT_ANIMATION)
      });
    }
  });

  function initialise() {
    getRoller();
    bindDeclarativeTriggers();
    bindDemoBuilder();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})(window);

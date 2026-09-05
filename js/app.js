const i18n = window.signedNumbersI18n;

const firstNumberInput = document.getElementById("firstNumber");
const operatorInput = document.getElementById("operator");
const secondNumberInput = document.getElementById("secondNumber");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const randomButton = document.getElementById("randomButton");
const soundToggleButton = document.getElementById("soundToggleButton");
const messageBox = document.getElementById("message");
const boardExercise = document.getElementById("boardExercise");
const board = document.querySelector(".board");
const speechBubble = document.getElementById("speechBubble");
const studentSpeechBubble = document.getElementById(
  "studentSpeechBubble"
);
const classroom = document.querySelector(".classroom");
const teacher = document.querySelector(".teacher");
const standingStudent = document.getElementById("standingStudent");
const movingStudent = document.getElementById("movingStudent");
const numberLine = document.getElementById("numberLine");
const numberLineArea = document.querySelector(".number-line-area");
const studentDesks = document.getElementById("studentDesks");
const previousStepButton = document.getElementById(
  "previousStepButton"
);
const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");
const nextStepButton = document.getElementById("nextStepButton");
const playbackProgress = document.getElementById("playbackProgress");
const playbackCounter = document.getElementById("playbackCounter");
const completionActions = document.getElementById("completionActions");
const newExerciseButton = document.getElementById("newExerciseButton");
const completionRandomButton = document.getElementById(
  "completionRandomButton"
);
const replayButton = document.getElementById("replayButton");
const turnIndicator = document.getElementById("turnIndicator");
const stepCounter = document.getElementById("stepCounter");
const playbackModeButtons = Array.from(
  document.querySelectorAll("[data-playback-mode]")
);
const languageButtons = Array.from(
  document.querySelectorAll(".language-option")
);
const numberStepperButtons = Array.from(
  document.querySelectorAll(".number-stepper-button")
);

const LAST_TIMELINE_STEP = 9;
const leftToRightIsolate = value => `\u2066${value}\u2069`;

let tiles = [];
let minimumTile = -10;
let currentPosition = 0;
let currentTimelineStep = 0;
let playbackGeneration = 0;
let isPlaying = false;
let isPaused = false;
let isTransitioning = false;
let playbackMode = "auto";
let soundEnabled = false;
let audioContext = null;
let randomPatternIndex = 0;
let exerciseConfig = null;
let messageState = null;
let teacherSpeechState = null;
let studentSpeechState = null;

// Optional so blocked analytics never prevents use of the app.
const analytics = window.signedNumbersAnalytics;
const exerciseValues = () => JSON.stringify([
  firstNumberInput.value, operatorInput.value, secondNumberInput.value
]);
let lastExerciseValues = exerciseValues();

function sleep(milliseconds) {
  return new Promise(resolve => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isValidInteger(number) {
  return Number.isInteger(number) && Math.abs(number) <= 30;
}

function formatNumber(number) {
  return number < 0 ? `(${number})` : `${number}`;
}

function formatSpeechNumber(number) {
  return leftToRightIsolate(String(number));
}

function formatExercise(firstNumber, operator, secondNumber) {
  return `${firstNumber} ${operator} ${formatNumber(secondNumber)}`;
}

function formatSpokenNumber(number) {
  if (number < 0) {
    return `${i18n.t("number.minus")} ${formatSpeechNumber(
      Math.abs(number)
    )}`;
  }

  return formatSpeechNumber(number);
}

function formatSpokenExercise(config) {
  return `${formatSpokenNumber(config.firstNumber)} ${i18n.t(
    config.operationName.i18n
  )} ${formatSpokenNumber(config.secondNumber)}`;
}

function calculateResult(firstNumber, operator, secondNumber) {
  return operator === "+"
    ? firstNumber + secondNumber
    : firstNumber - secondNumber;
}

function randomInteger(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function createRandomExercise() {
  const patterns = [
    { operator: "+", secondSign: 1 },
    { operator: "+", secondSign: -1 },
    { operator: "-", secondSign: 1 },
    { operator: "-", secondSign: -1 }
  ];
  const pattern = patterns[randomPatternIndex % patterns.length];
  randomPatternIndex += 1;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const firstNumber = randomInteger(-10, 10);
    const magnitude =
      randomPatternIndex % 9 === 0 ? 0 : randomInteger(1, 10);
    const secondNumber = magnitude * pattern.secondSign;
    const result = calculateResult(
      firstNumber,
      pattern.operator,
      secondNumber
    );

    if (Math.abs(result) <= 10) {
      return {
        firstNumber,
        operator: pattern.operator,
        secondNumber
      };
    }
  }

  return { firstNumber: 0, operator: pattern.operator, secondNumber: 0 };
}

function getAudioContext() {
  if (!soundEnabled) {
    return null;
  }

  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = AudioContext ? new AudioContext() : null;
  }

  if (audioContext?.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playTone({ frequency = 440, duration = 0.08, volume = 0.025 }) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function updateSoundControl() {
  soundToggleButton.textContent = i18n.t(
    soundEnabled ? "sound.on" : "sound.off"
  );
  soundToggleButton.setAttribute("aria-pressed", String(soundEnabled));
}

function resolveReplacements(replacements = {}) {
  return Object.fromEntries(
    Object.entries(replacements).map(([key, value]) => {
      if (value && typeof value === "object" && value.spokenExercise) {
        return [key, formatSpokenExercise(value.spokenExercise)];
      }

      if (value && typeof value === "object" && value.i18n) {
        return [key, i18n.t(value.i18n)];
      }

      return [key, value];
    })
  );
}

function renderState(element, state) {
  if (!state) {
    element.textContent = "";
    return;
  }

  element.textContent = i18n.t(
    state.key,
    resolveReplacements(state.replacements)
  );
}

function setMessage(key, replacements = {}) {
  messageState = key ? { key, replacements } : null;
  renderState(messageBox, messageState);
}

function setTeacherSpeech(key, replacements = {}) {
  teacherSpeechState = key ? { key, replacements } : null;
  renderState(speechBubble, teacherSpeechState);

  if (teacherSpeechState) {
    speechBubble.classList.add("is-positioning");
    window.requestAnimationFrame(updateTeacherBubblePosition);
  }
}

function setStudentSpeech(key, replacements = {}) {
  if (key) {
    setTeacherSpeech(null);
  }

  studentSpeechState = key ? { key, replacements } : null;
  renderState(studentSpeechBubble, studentSpeechState);
  studentSpeechBubble.hidden = !studentSpeechState;

  if (studentSpeechState) {
    studentSpeechBubble.classList.add("is-positioning");
    window.requestAnimationFrame(updateStudentBubblePosition);
  }
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = i18n.t(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    element.setAttribute(
      "aria-label",
      i18n.t(element.dataset.i18nAriaLabel)
    );
  });

  document.title = i18n.t("document.title");

  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute("content", i18n.t("document.description"));
  }

  languageButtons.forEach(button => {
    const isActive = button.dataset.locale === i18n.locale;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  renderState(messageBox, messageState);
  renderState(speechBubble, teacherSpeechState);
  renderState(studentSpeechBubble, studentSpeechState);
  updateSoundControl();
  updatePlaybackControls();
  updateStudentBubblePosition();
  window.requestAnimationFrame(updateTeacherBubblePosition);
}

function updateBoardExercise() {
  const firstNumber = Number(firstNumberInput.value);
  const operator = operatorInput.value;
  const secondNumber = Number(secondNumberInput.value);

  renderBoardExpression({ firstNumber, operator, secondNumber });
}

function updateNumberStepperButtons() {
  numberStepperButtons.forEach(button => {
    const input = document.getElementById(button.dataset.stepInput);
    const value = input.valueAsNumber;
    const minimum = Number(input.min);
    const maximum = Number(input.max);
    const isDecrement = button.dataset.stepDirection === "decrement";
    const isAtLimit = Number.isFinite(value) && (
      isDecrement ? value <= minimum : value >= maximum
    );

    button.disabled = input.disabled || isAtLimit;
  });
}

function stepNumberInput(button) {
  const input = document.getElementById(button.dataset.stepInput);

  if (!input || input.disabled) {
    return;
  }

  const direction = button.dataset.stepDirection === "decrement" ? -1 : 1;
  const minimum = Number(input.min);
  const maximum = Number(input.max);
  const currentValue = Number.isFinite(input.valueAsNumber)
    ? input.valueAsNumber
    : 0;
  input.value = clamp(currentValue + direction, minimum, maximum);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderBoardExpression(
  { firstNumber, operator, secondNumber, result = null },
  focusedPart = null
) {
  const parts = {
    first: String(firstNumber),
    operator,
    second: formatNumber(secondNumber),
    result: result === null ? "" : `= ${result}`
  };

  Object.entries(parts).forEach(([part, value]) => {
    const element = boardExercise.querySelector(
      `[data-expression-part="${part}"]`
    );

    element.textContent = value;
    element.hidden = part === "result" && result === null;
    element.classList.toggle("is-focused", part === focusedPart);
  });
}

function setBoardFocus(part = null, showResult = false) {
  if (!exerciseConfig) {
    return;
  }

  renderBoardExpression(
    {
      ...exerciseConfig,
      result: showResult ? exerciseConfig.result : null
    },
    part
  );
}

function createClassroomStudents() {
  const deskMarkup = `
    <div class="desk-unit">
      <div class="seated-student">
        <div class="head"><div class="hair"></div></div>
        <div class="body"></div>
      </div>
      <div class="desk"></div>
    </div>
  `;

  studentDesks.innerHTML = deskMarkup.repeat(12);
}

function createNumberLine(firstNumber, finalNumber) {
  minimumTile = Math.min(-10, firstNumber - 4, finalNumber - 4);
  const maximumTile = Math.max(10, firstNumber + 4, finalNumber + 4);

  numberLine
    .querySelectorAll(".tile")
    .forEach(tile => tile.remove());

  tiles = [];

  for (
    let number = minimumTile;
    number <= maximumTile;
    number += 1
  ) {
    const tile = document.createElement("div");

    tile.className = "tile";
    tile.dataset.number = number;
    tile.textContent = number;

    if (number === 0) {
      tile.classList.add("zero");
    }

    numberLine.appendChild(tile);
    tiles.push(tile);
  }

  numberLine.appendChild(movingStudent);

  window.requestAnimationFrame(() => {
    const startingTile = getTile(firstNumber);

    if (startingTile && numberLineArea) {
      numberLineArea.scrollLeft =
        startingTile.offsetLeft +
        startingTile.offsetWidth / 2 -
        numberLineArea.clientWidth / 2;
    }
  });
}

function getTile(number) {
  return tiles.find(tile => Number(tile.dataset.number) === number);
}

function getStudentLeft(number) {
  const tile = getTile(number);

  if (!tile) {
    return 0;
  }

  return tile.offsetLeft + tile.offsetWidth / 2;
}

function clearHighlights() {
  tiles.forEach(tile => {
    tile.classList.remove("active", "visited");
  });
}

function highlightTile(number) {
  const tile = getTile(number);

  if (!tile) {
    return;
  }

  tile.classList.add("active");
  tile.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest"
  });
}

function markPath(firstNumber, finalNumber) {
  clearHighlights();

  const direction = Math.sign(finalNumber - firstNumber);
  let position = firstNumber;

  while (direction !== 0 && position !== finalNumber) {
    const tile = getTile(position);
    if (tile) {
      tile.classList.add("visited");
    }
    position += direction;
  }

  highlightTile(finalNumber);
}

function clearStudentMotion() {
  movingStudent.classList.remove(
    "is-arriving",
    "is-turning",
    "is-walking",
    "is-walking-backward",
    "is-paused"
  );
  turnIndicator.hidden = true;
  stepCounter.hidden = true;
}

function setStudentFacing(facing) {
  movingStudent.dataset.facing = facing;
}

function placeStudentOnTile(number, facing = "front") {
  currentPosition = number;
  movingStudent.style.left = `${getStudentLeft(number)}px`;
  clearStudentMotion();
  setStudentFacing(facing);
  window.requestAnimationFrame(updateStudentBubblePosition);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function isCompactClassroom() {
  return classroom.clientWidth <= 650;
}

function positionDockedBubble(bubble) {
  const classroomRect = classroom.getBoundingClientRect();
  const numberLineRect = numberLineArea.getBoundingClientRect();
  const bubbleWidth = bubble.offsetWidth;
  const bubbleHeight = bubble.offsetHeight;
  const horizontalPadding = 14;
  const maximumLeft = Math.max(
    horizontalPadding,
    classroomRect.width - bubbleWidth - horizontalPadding
  );
  const left = clamp(
    (classroomRect.width - bubbleWidth) / 2,
    horizontalPadding,
    maximumLeft
  );
  const top =
    numberLineRect.bottom -
    classroomRect.top -
    bubbleHeight -
    16;

  bubble.dataset.side = "docked";
  if (bubble === studentSpeechBubble) {
    movingStudent.dataset.bubbleSide = "docked";
  }
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
}

function finishBubblePositioning(bubble) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      bubble.classList.remove("is-positioning");
    });
  });
}

function updateStudentBubblePosition() {
  if (studentSpeechBubble.hidden || !movingStudent.getBoundingClientRect) {
    return;
  }

  const classroomRect = classroom.getBoundingClientRect();
  const studentRect = movingStudent.getBoundingClientRect();
  const occupiedRect = combineRects(
    studentRect,
    getVisibleRect(turnIndicator),
    getVisibleRect(stepCounter)
  );
  studentSpeechBubble.style.width = "";

  if (isCompactClassroom()) {
    positionDockedBubble(studentSpeechBubble);
    finishBubblePositioning(studentSpeechBubble);
    return;
  }

  const horizontalGap = 18;
  const padding = 10;
  const naturalWidth = studentSpeechBubble.offsetWidth;
  const naturalHeight = studentSpeechBubble.offsetHeight;
  const leftSpace =
    occupiedRect.left - classroomRect.left - horizontalGap - padding;
  const rightStart =
    occupiedRect.right - classroomRect.left + horizontalGap;
  const rightSpace = classroomRect.width - padding - rightStart;
  const naturalLeft = leftSpace - naturalWidth + padding;
  const teacherRect = teacher.getBoundingClientRect();
  const naturalTop =
    studentRect.top - classroomRect.top - naturalHeight + 8;
  const leftViewportRect = {
    left: classroomRect.left + naturalLeft,
    right: classroomRect.left + naturalLeft + naturalWidth,
    top: classroomRect.top + naturalTop,
    bottom: classroomRect.top + naturalTop + naturalHeight
  };
  const rightViewportRect = {
    left: classroomRect.left + rightStart,
    right: classroomRect.left + rightStart + naturalWidth,
    top: classroomRect.top + naturalTop,
    bottom: classroomRect.top + naturalTop + naturalHeight
  };
  const leftBlocked = rectanglesOverlap(
    leftViewportRect,
    teacherRect,
    10
  );
  const rightBlocked = rectanglesOverlap(
    rightViewportRect,
    teacherRect,
    10
  );
  const canUseLeft =
    leftSpace >= naturalWidth && !leftBlocked;
  const canUseRight =
    rightSpace >= naturalWidth && !rightBlocked;
  const bubbleSide = canUseLeft
    ? "left"
    : canUseRight || (leftBlocked && !rightBlocked)
      ? "right"
      : rightBlocked && !leftBlocked
        ? "left"
        : leftSpace >= rightSpace
          ? "left"
          : "right";
  const availableWidth = bubbleSide === "left" ? leftSpace : rightSpace;
  studentSpeechBubble.style.width = `${Math.min(
    naturalWidth,
    Math.max(180, availableWidth)
  )}px`;

  const bubbleWidth = studentSpeechBubble.offsetWidth;
  const bubbleHeight = studentSpeechBubble.offsetHeight;
  const leftCandidate =
    occupiedRect.left - classroomRect.left - horizontalGap - bubbleWidth;
  const rightCandidate = rightStart;
  const maximumLeft = classroomRect.width - bubbleWidth - padding;
  const chosenLeft = bubbleSide === "left"
    ? leftCandidate
    : rightCandidate;
  const boardRect = board.getBoundingClientRect();
  const minimumTop = Math.max(
    padding,
    boardRect.bottom - classroomRect.top + 8
  );
  const topCandidate = Math.max(
    studentRect.top - classroomRect.top - bubbleHeight + 8,
    minimumTop
  );

  studentSpeechBubble.dataset.side = bubbleSide;
  movingStudent.dataset.bubbleSide = bubbleSide;
  studentSpeechBubble.style.left = `${clamp(
    chosenLeft,
    padding,
    maximumLeft
  )}px`;
  studentSpeechBubble.style.top = `${clamp(
    topCandidate,
    padding,
    classroomRect.height - bubbleHeight - padding
  )}px`;
  finishBubblePositioning(studentSpeechBubble);
}

function rectanglesOverlap(firstRect, secondRect, padding = 0) {
  if (!firstRect || !secondRect) {
    return false;
  }

  return !(
    firstRect.right + padding <= secondRect.left ||
    firstRect.left >= secondRect.right + padding ||
    firstRect.bottom + padding <= secondRect.top ||
    firstRect.top >= secondRect.bottom + padding
  );
}

function combineRects(...rects) {
  const visibleRects = rects.filter(Boolean);

  if (!visibleRects.length) {
    return null;
  }

  return {
    left: Math.min(...visibleRects.map(rect => rect.left)),
    right: Math.max(...visibleRects.map(rect => rect.right)),
    top: Math.min(...visibleRects.map(rect => rect.top)),
    bottom: Math.max(...visibleRects.map(rect => rect.bottom))
  };
}

function getVisibleRect(element) {
  if (!element || element.hidden) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? rect : null;
}

function getStudentOccupiedRect() {
  return combineRects(
    getVisibleStudentRect(),
    getVisibleRect(turnIndicator),
    getVisibleRect(stepCounter)
  );
}

function getVisibleStudentRect() {
  const standingOpacity = Number.parseFloat(
    window.getComputedStyle(standingStudent).opacity
  );
  const movingOpacity = Number.parseFloat(
    window.getComputedStyle(movingStudent).opacity
  );

  if (movingOpacity > 0.1) {
    return movingStudent.getBoundingClientRect();
  }

  if (standingOpacity > 0.1) {
    return standingStudent.getBoundingClientRect();
  }

  return null;
}

function updateTeacherBubblePosition() {
  if (!teacherSpeechState || !speechBubble.textContent) {
    return;
  }

  if (isCompactClassroom()) {
    positionDockedBubble(speechBubble);
    finishBubblePositioning(speechBubble);
    return;
  }

  const classroomRect = classroom.getBoundingClientRect();
  const teacherRect = teacher.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const studentRect = getStudentOccupiedRect();
  const bubbleWidth = speechBubble.offsetWidth;
  const bubbleHeight = speechBubble.offsetHeight;
  const horizontalGap = 15;
  const padding = 10;
  const rightCandidate =
    teacherRect.right - classroomRect.left + horizontalGap;
  const leftCandidate =
    teacherRect.left - classroomRect.left - bubbleWidth - horizontalGap;
  const rightViewportRect = {
    left: classroomRect.left + rightCandidate,
    right: classroomRect.left + rightCandidate + bubbleWidth,
    top: teacherRect.bottom - bubbleHeight - 12,
    bottom: teacherRect.bottom - 12
  };
  const canUseRight =
    rightCandidate + bubbleWidth <= classroomRect.width - padding &&
    !rectanglesOverlap(rightViewportRect, studentRect, 10);
  const maximumLeft = classroomRect.width - bubbleWidth - padding;
  const chosenLeft = canUseRight ? rightCandidate : leftCandidate;
  const minimumTop = Math.max(
    padding,
    boardRect.bottom - classroomRect.top + 8
  );

  speechBubble.dataset.side = canUseRight ? "right" : "left";
  speechBubble.style.left = `${clamp(
    chosenLeft,
    padding,
    maximumLeft
  )}px`;
  speechBubble.style.top = `${clamp(
    teacherRect.bottom - classroomRect.top - bubbleHeight - 12,
    minimumTop,
    classroomRect.height - bubbleHeight - padding
  )}px`;
  finishBubblePositioning(speechBubble);
}

async function animateStudentArrival(generation) {
  movingStudent.classList.add("is-arriving");
  movingStudent.style.opacity = "1";
  const completed = await waitForPlayback(750, generation);
  movingStudent.classList.remove("is-arriving");
  updateStudentBubblePosition();
  return completed;
}

async function animateStudentTurn(facing, generation, config) {
  movingStudent.classList.add("is-turning");
  turnIndicator.textContent = i18n.t("turn.indicator", {
    direction: i18n.t(config.turnDirection.i18n)
  });
  turnIndicator.hidden = false;
  window.requestAnimationFrame(() => {
    updateStudentBubblePosition();
    updateTeacherBubblePosition();
  });
  setStudentFacing(facing);
  const completed = await waitForPlayback(1050, generation);
  movingStudent.classList.remove("is-turning");
  updateStudentBubblePosition();
  return completed;
}

async function animateStudentStep(
  nextPosition,
  isBackward,
  movementStep,
  totalSteps,
  generation
) {
  movingStudent.classList.add("is-walking");
  movingStudent.classList.toggle("is-walking-backward", isBackward);
  stepCounter.textContent = i18n.t("walk.counter", {
    current: movementStep,
    total: totalSteps
  });
  stepCounter.hidden = false;

  currentPosition = nextPosition;
  movingStudent.style.left = `${getStudentLeft(currentPosition)}px`;
  window.requestAnimationFrame(updateStudentBubblePosition);
  playTone({ frequency: 190 + movementStep * 12, duration: 0.07 });

  const completed = await waitForPlayback(620, generation);

  movingStudent.classList.remove(
    "is-walking",
    "is-walking-backward"
  );

  if (!completed) {
    return false;
  }

  return waitForPlayback(90, generation);
}

function getExerciseConfig() {
  const firstNumber = Number(firstNumberInput.value);
  const operator = operatorInput.value;
  const secondNumber = Number(secondNumberInput.value);

  if (!isValidInteger(firstNumber) || !isValidInteger(secondNumber)) {
    setMessage("error.integer");
    return null;
  }

  const result = calculateResult(
    firstNumber,
    operator,
    secondNumber
  );

  if (Math.abs(result) > 60) {
    setMessage("error.range");
    return null;
  }

  return {
    firstNumber,
    operator,
    secondNumber,
    result,
    exercise: formatExercise(firstNumber, operator, secondNumber),
    operationName: {
      i18n: operator === "+" ? "operation.add" : "operation.subtract"
    },
    facing: operator === "+" ? "right" : "left",
    turnDirection: {
      i18n: operator === "+" ? "direction.right" : "direction.left"
    },
    walkingDirection: {
      i18n:
        secondNumber > 0
          ? "direction.forward"
          : secondNumber < 0
            ? "direction.backward"
            : "direction.still"
    },
    movementInstruction: {
      i18n:
        secondNumber > 0
          ? "movement.forward"
          : secondNumber < 0
            ? "movement.backward"
            : "movement.stay"
    },
    secondNumberKind: {
      i18n:
        secondNumber > 0
          ? "number.positive"
          : secondNumber < 0
            ? "number.negative"
            : "number.zero"
    },
    numberOfSteps: Math.abs(secondNumber)
  };
}

function prepareExercise() {
  const nextConfig = getExerciseConfig();

  if (!nextConfig) {
    return false;
  }

  exerciseConfig = nextConfig;
  updateBoardExercise();
  createNumberLine(
    exerciseConfig.firstNumber,
    exerciseConfig.result
  );
  return true;
}

function updatePlaybackControls() {
  const exerciseInProgress =
    currentTimelineStep > 0 &&
    currentTimelineStep < LAST_TIMELINE_STEP;
  playbackProgress.max = String(LAST_TIMELINE_STEP);
  playbackProgress.value = String(currentTimelineStep);
  playbackCounter.textContent =
    `${currentTimelineStep} / ${LAST_TIMELINE_STEP}`;

  previousStepButton.disabled = currentTimelineStep === 0;
  nextStepButton.disabled =
    currentTimelineStep === LAST_TIMELINE_STEP ||
    isPlaying ||
    isTransitioning;
  pauseButton.disabled = !isPlaying || isPaused;
  startButton.disabled = isPlaying || isTransitioning || exerciseInProgress;
  randomButton.disabled = isPlaying || isTransitioning || exerciseInProgress;
  previousStepButton.disabled =
    previousStepButton.disabled || isPlaying || isTransitioning;

  firstNumberInput.disabled =
    isPlaying || isTransitioning || exerciseInProgress;
  operatorInput.disabled =
    isPlaying || isTransitioning || exerciseInProgress;
  secondNumberInput.disabled =
    isPlaying || isTransitioning || exerciseInProgress;
  updateNumberStepperButtons();

  playButton.setAttribute("aria-pressed", String(isPlaying && !isPaused));
  pauseButton.setAttribute("aria-pressed", String(isPaused));
  playbackModeButtons.forEach(button => {
    const isActive = button.dataset.playbackMode === playbackMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.documentElement.dataset.playbackMode = playbackMode;
  playButton.textContent = i18n.t(
    isPaused ? "playback.resume" : "playback.autoStart"
  );
  nextStepButton.textContent = i18n.t("playback.continue");
  completionActions.hidden =
    currentTimelineStep !== LAST_TIMELINE_STEP;
  board.classList.toggle(
    "is-complete",
    currentTimelineStep === LAST_TIMELINE_STEP
  );
  movingStudent.classList.toggle("is-paused", isPaused);
}

function setPlaybackMode(mode) {
  if (!["auto", "manual"].includes(mode) || mode === playbackMode) {
    return;
  }

  cancelPlayback();
  playbackMode = mode;
  analytics?.firstInteraction("mode_select", playbackMode);
  updatePlaybackControls();
}

async function waitForPlayback(milliseconds, generation) {
  let elapsed = 0;

  while (elapsed < milliseconds) {
    if (generation !== playbackGeneration) {
      return false;
    }

    if (isPaused) {
      await sleep(80);
      continue;
    }

    const interval = Math.min(80, milliseconds - elapsed);
    await sleep(interval);
    elapsed += interval;
  }

  return generation === playbackGeneration;
}

function getSpeechReplacements(config) {
  return {
    first: formatSpeechNumber(config.firstNumber),
    operator: config.operationName,
    second: formatSpeechNumber(config.secondNumber),
    steps: formatSpeechNumber(config.numberOfSteps),
    position: formatSpeechNumber(config.result),
    direction: config.walkingDirection,
    numberKind: config.secondNumberKind,
    movement: config.movementInstruction
  };
}

async function renderTimelineStep(
  step,
  { animate = false, generation = playbackGeneration } = {}
) {
  if (!exerciseConfig) {
    return false;
  }

  const config = exerciseConfig;
  const speech = getSpeechReplacements(config);
  currentTimelineStep = Math.max(
    0,
    Math.min(LAST_TIMELINE_STEP, step)
  );
  setBoardFocus();
  clearStudentMotion();
  setStudentSpeech(null);

  if (currentTimelineStep <= 1) {
    standingStudent.style.opacity = "1";
    movingStudent.style.opacity = "0";
    placeStudentOnTile(config.firstNumber, "front");
    clearHighlights();
  } else {
    standingStudent.style.opacity = "0";
    movingStudent.style.opacity = "1";
  }

  switch (currentTimelineStep) {
    case 0:
      setTeacherSpeech("speech.initial");
      setMessage("message.initial");
      break;

    case 1:
      setBoardFocus("first");
      setTeacherSpeech("speech.exerciseQuestion", {
        exercise: { spokenExercise: config }
      });
      setMessage("message.exercise", {
        exercise: { spokenExercise: config }
      });
      break;

    case 2:
      placeStudentOnTile(config.firstNumber, "front");
      highlightTile(config.firstNumber);
      setTeacherSpeech("speech.position", {
        first: speech.first
      });
      setMessage("message.walkTo", {
        first: speech.first
      });
      if (animate) {
        setTeacherSpeech("speech.first", { first: speech.first });
        const arrived = await animateStudentArrival(generation);
        if (!arrived) {
          return false;
        }
        setTeacherSpeech("speech.position", { first: speech.first });
      }
      break;

    case 3:
      placeStudentOnTile(config.firstNumber, "front");
      highlightTile(config.firstNumber);
      setBoardFocus("operator");
      setTeacherSpeech("speech.operatorQuestion", {
        operator: speech.operator
      });
      setMessage("message.operatorFocus", {
        operator: speech.operator
      });
      break;

    case 4:
      placeStudentOnTile(config.firstNumber, "front");
      highlightTile(config.firstNumber);
      setBoardFocus("operator");
      setTeacherSpeech("speech.turn", {
        operator: speech.operator,
        direction: config.turnDirection
      });
      setStudentSpeech("student.turn", {
        operator: speech.operator,
        direction: config.turnDirection
      });
      setMessage("message.turn", {
        direction: config.turnDirection
      });
      if (animate) {
        const turned = await animateStudentTurn(
          config.facing,
          generation,
          config
        );
        if (!turned) {
          return false;
        }
      } else {
        setStudentFacing(config.facing);
        turnIndicator.textContent = i18n.t("turn.indicator", {
          direction: i18n.t(config.turnDirection.i18n)
        });
        turnIndicator.hidden = false;
        window.requestAnimationFrame(() => {
          updateStudentBubblePosition();
          updateTeacherBubblePosition();
        });
      }
      break;

    case 5:
      placeStudentOnTile(config.firstNumber, config.facing);
      highlightTile(config.firstNumber);
      setBoardFocus("second");
      setTeacherSpeech("speech.secondNumber", {
        second: speech.second,
        steps: speech.steps,
        direction: config.walkingDirection,
        numberKind: config.secondNumberKind,
        movement: config.movementInstruction
      });
      setMessage("message.secondNumber", {
        second: speech.second,
        steps: speech.steps,
        direction: config.walkingDirection,
        numberKind: config.secondNumberKind,
        movement: config.movementInstruction
      });
      break;

    case 6: {
      placeStudentOnTile(config.firstNumber, config.facing);
      highlightTile(config.firstNumber);
      setBoardFocus("second");
      setTeacherSpeech("speech.walk", {
        second: speech.second,
        steps: speech.steps,
        direction: config.walkingDirection
      });
      setStudentSpeech("student.walk", {
        steps: speech.steps,
        direction: config.walkingDirection
      });
      setMessage("message.walk", {
        steps: speech.steps,
        direction: config.walkingDirection
      });

      if (animate) {
        const directionOnLine =
          config.operator === "+"
            ? Math.sign(config.secondNumber)
            : -Math.sign(config.secondNumber);

        for (
          let movementStep = 0;
          movementStep < config.numberOfSteps;
          movementStep += 1
        ) {
          if (generation !== playbackGeneration) {
            return false;
          }

          const canContinue = await waitForPlayback(220, generation);
          if (!canContinue) {
            return false;
          }

          const oldTile = getTile(currentPosition);
          if (oldTile) {
            oldTile.classList.remove("active");
            oldTile.classList.add("visited");
          }

          await animateStudentStep(
            currentPosition + directionOnLine,
            config.secondNumber < 0,
            movementStep + 1,
            config.numberOfSteps,
            generation
          );

          if (generation !== playbackGeneration) {
            return false;
          }

          highlightTile(currentPosition);
        }
      } else {
        placeStudentOnTile(config.result, config.facing);
        markPath(config.firstNumber, config.result);
        stepCounter.textContent = i18n.t("walk.counter", {
          current: config.numberOfSteps,
          total: config.numberOfSteps
        });
        stepCounter.hidden = config.numberOfSteps === 0;
      }
      break;
    }

    case 7:
      placeStudentOnTile(config.result, config.facing);
      markPath(config.firstNumber, config.result);
      setTeacherSpeech("speech.question");
      setMessage("message.arrived", {
        position: speech.position
      });
      setBoardFocus();
      break;

    case 8:
      placeStudentOnTile(config.result, config.facing);
      markPath(config.firstNumber, config.result);
      setTeacherSpeech("speech.question");
      setStudentSpeech("student.answer", {
        position: speech.position
      });
      setMessage("message.arrived", {
        position: speech.position
      });
      setBoardFocus("result", true);
      break;

    case 9:
      placeStudentOnTile(config.result, config.facing);
      markPath(config.firstNumber, config.result);
      setTeacherSpeech("speech.answer", {
        position: speech.position
      });
      setMessage("message.answer", {
        position: speech.position
      });
      setBoardFocus("result", true);
      playTone({ frequency: 660, duration: 0.22, volume: 0.035 });
      break;

    default:
      break;
  }

  updatePlaybackControls();
  updateStudentBubblePosition();
  window.requestAnimationFrame(updateTeacherBubblePosition);
  if (generation === playbackGeneration) {
    analytics?.renderedStep(currentTimelineStep, animate, playbackMode);
  }
  return generation === playbackGeneration;
}

function cancelPlayback() {
  playbackGeneration += 1;
  isPlaying = false;
  isPaused = false;
  isTransitioning = false;
  updatePlaybackControls();
}

async function playTimeline() {
  if (isPaused) {
    isPaused = false;
    updatePlaybackControls();
    return;
  }

  if (isPlaying) {
    return;
  }

  if (!exerciseConfig && !prepareExercise()) {
    return;
  }

  if (currentTimelineStep >= LAST_TIMELINE_STEP) {
    await renderTimelineStep(0);
  }

  analytics?.firstInteraction("solve_start", playbackMode);
  isPlaying = true;
  const generation = ++playbackGeneration;
  updatePlaybackControls();

  while (
    generation === playbackGeneration &&
    currentTimelineStep < LAST_TIMELINE_STEP
  ) {
    const canContinue = await waitForPlayback(520, generation);
    if (!canContinue) {
      return;
    }

    const rendered = await renderTimelineStep(
      currentTimelineStep + 1,
      { animate: true, generation }
    );

    if (!rendered) {
      return;
    }

    const canAdvance = await waitForPlayback(1050, generation);
    if (!canAdvance) {
      return;
    }
  }

  if (generation === playbackGeneration) {
    isPlaying = false;
    isPaused = false;
    updatePlaybackControls();
  }
}

async function seekTimeline(step) {
  cancelPlayback();

  if (!exerciseConfig && !prepareExercise()) {
    return;
  }

  await renderTimelineStep(step);
}

async function advanceOneStep() {
  if (
    isPlaying ||
    isTransitioning ||
    currentTimelineStep >= LAST_TIMELINE_STEP
  ) {
    return;
  }

  if (!exerciseConfig && !prepareExercise()) {
    return;
  }

  analytics?.firstInteraction("solve_start", playbackMode);
  isTransitioning = true;
  const generation = ++playbackGeneration;
  updatePlaybackControls();

  try {
    await renderTimelineStep(currentTimelineStep + 1, {
      animate: true,
      generation
    });
  } finally {
    if (generation === playbackGeneration) {
      isTransitioning = false;
      updatePlaybackControls();
    }
  }
}

async function runSimulation() {
  cancelPlayback();

  if (!prepareExercise()) {
    return;
  }

  await renderTimelineStep(0);
  if (playbackMode === "auto") {
    playTone({ frequency: 340, duration: 0.09 });
    await playTimeline();
  } else {
    await advanceOneStep();
  }
}

async function resetSimulator() {
  cancelPlayback();
  analytics?.newExercise();

  firstNumberInput.value = 0;
  operatorInput.value = "+";
  secondNumberInput.value = 0;
  exerciseConfig = null;
  lastExerciseValues = exerciseValues();

  if (!prepareExercise()) {
    return;
  }

  await renderTimelineStep(0);
}

async function prepareNewExercise({ random = false } = {}) {
  cancelPlayback();
  analytics?.newExercise();
  if (random) analytics?.firstInteraction("random_exercise", playbackMode);

  if (random) {
    const generated = createRandomExercise();
    firstNumberInput.value = generated.firstNumber;
    operatorInput.value = generated.operator;
    secondNumberInput.value = generated.secondNumber;
  } else {
    firstNumberInput.value = 0;
    operatorInput.value = "+";
    secondNumberInput.value = 0;
  }

  exerciseConfig = null;
  lastExerciseValues = exerciseValues();
  if (!prepareExercise()) {
    return;
  }

  await renderTimelineStep(0);
}

async function replayExercise() {
  cancelPlayback();
  if (!prepareExercise()) {
    return;
  }

  await renderTimelineStep(0);
  if (playbackMode === "auto") {
    await playTimeline();
  } else {
    await advanceOneStep();
  }
}

function handleExerciseInput() {
  if (isPlaying) {
    return;
  }

  const values = exerciseValues();
  if (values !== lastExerciseValues) {
    lastExerciseValues = values;
    analytics?.newExercise();
    if (firstNumberInput.value !== "" && secondNumberInput.value !== "" &&
        isValidInteger(Number(firstNumberInput.value)) &&
        isValidInteger(Number(secondNumberInput.value))) {
      analytics?.firstInteraction("value_change", playbackMode);
    }
  }
  exerciseConfig = null;
  currentTimelineStep = 0;
  setStudentSpeech(null);
  updateBoardExercise();
  updatePlaybackControls();
}

firstNumberInput.addEventListener("input", handleExerciseInput);
operatorInput.addEventListener("change", handleExerciseInput);
secondNumberInput.addEventListener("input", handleExerciseInput);
numberStepperButtons.forEach(button => {
  button.addEventListener("click", () => stepNumberInput(button));
});
startButton.addEventListener("click", runSimulation);
resetButton.addEventListener("click", resetSimulator);
randomButton.addEventListener("click", () => {
  prepareNewExercise({ random: true });
});
playButton.addEventListener("click", playTimeline);
pauseButton.addEventListener("click", () => {
  if (!isPlaying) {
    return;
  }

  isPaused = true;
  updatePlaybackControls();
});
previousStepButton.addEventListener("click", () => {
  seekTimeline(currentTimelineStep - 1);
});
nextStepButton.addEventListener("click", () => {
  advanceOneStep();
});
playbackProgress.addEventListener("input", () => {
  seekTimeline(Number(playbackProgress.value));
});

playbackModeButtons.forEach(button => {
  button.addEventListener("click", () => {
    setPlaybackMode(button.dataset.playbackMode);
  });
});

languageButtons.forEach(button => {
  button.addEventListener("click", () => {
    i18n.setLocale(button.dataset.locale);
  });
});

soundToggleButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  updateSoundControl();
  if (soundEnabled) {
    playTone({ frequency: 520, duration: 0.12 });
  }
});
newExerciseButton.addEventListener("click", () => {
  prepareNewExercise();
});
completionRandomButton.addEventListener("click", () => {
  prepareNewExercise({ random: true });
});
replayButton.addEventListener("click", replayExercise);

numberLineArea.addEventListener("scroll", updateStudentBubblePosition);
window.addEventListener("resize", updateStudentBubblePosition);
window.addEventListener("resize", updateTeacherBubblePosition);
window.addEventListener("signed-numbers:localechange", applyTranslations);

classroom.appendChild(speechBubble);
createClassroomStudents();
resetSimulator();
applyTranslations();

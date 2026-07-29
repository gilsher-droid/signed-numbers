const i18n = window.signedNumbersI18n;

const firstNumberInput = document.getElementById("firstNumber");
const operatorInput = document.getElementById("operator");
const secondNumberInput = document.getElementById("secondNumber");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const messageBox = document.getElementById("message");
const boardExercise = document.getElementById("boardExercise");
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
const playbackModeButtons = Array.from(
  document.querySelectorAll("[data-playback-mode]")
);
const languageButtons = Array.from(
  document.querySelectorAll(".language-option")
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
let playbackMode = "auto";
let exerciseConfig = null;
let messageState = null;
let teacherSpeechState = null;
let studentSpeechState = null;

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

function calculateResult(firstNumber, operator, secondNumber) {
  return operator === "+"
    ? firstNumber + secondNumber
    : firstNumber - secondNumber;
}

function resolveReplacements(replacements = {}) {
  return Object.fromEntries(
    Object.entries(replacements).map(([key, value]) => {
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
  updateStudentBubblePosition();
  window.requestAnimationFrame(updateTeacherBubblePosition);
}

function updateBoardExercise() {
  const firstNumber = Number(firstNumberInput.value);
  const operator = operatorInput.value;
  const secondNumber = Number(secondNumberInput.value);

  boardExercise.textContent = formatExercise(
    firstNumber,
    operator,
    secondNumber
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

function updateStudentBubblePosition() {
  if (studentSpeechBubble.hidden || !movingStudent.getBoundingClientRect) {
    return;
  }

  const classroomRect = classroom.getBoundingClientRect();
  const studentRect = movingStudent.getBoundingClientRect();
  const centerX =
    studentRect.left - classroomRect.left + studentRect.width / 2;
  const topY = studentRect.top - classroomRect.top + 8;

  studentSpeechBubble.style.left = `${centerX}px`;
  studentSpeechBubble.style.top = `${topY}px`;
  studentSpeechBubble.dataset.side = "left";

  window.requestAnimationFrame(() => {
    const bubbleRect = studentSpeechBubble.getBoundingClientRect();
    const teacherRect = teacher.getBoundingClientRect();

    if (
      bubbleRect.left < classroomRect.left + 8 ||
      rectanglesOverlap(bubbleRect, teacherRect, 10)
    ) {
      studentSpeechBubble.dataset.side = "right";
    }
  });
}

function rectanglesOverlap(firstRect, secondRect, padding = 0) {
  return !(
    firstRect.right + padding <= secondRect.left ||
    firstRect.left >= secondRect.right + padding ||
    firstRect.bottom + padding <= secondRect.top ||
    firstRect.top >= secondRect.bottom + padding
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

  speechBubble.classList.remove("is-flipped");

  window.requestAnimationFrame(() => {
    const studentRect = getVisibleStudentRect();
    if (!studentRect) {
      return;
    }

    const bubbleRect = speechBubble.getBoundingClientRect();
    if (rectanglesOverlap(bubbleRect, studentRect, 10)) {
      speechBubble.classList.add("is-flipped");
    }
  });
}

async function animateStudentArrival() {
  movingStudent.classList.add("is-arriving");
  movingStudent.style.opacity = "1";
  await sleep(750);
  movingStudent.classList.remove("is-arriving");
  updateStudentBubblePosition();
}

async function animateStudentTurn(facing) {
  movingStudent.classList.add("is-turning");
  setStudentFacing(facing);
  await sleep(760);
  movingStudent.classList.remove("is-turning");
  updateStudentBubblePosition();
}

async function animateStudentStep(nextPosition, isBackward) {
  movingStudent.classList.add("is-walking");
  movingStudent.classList.toggle("is-walking-backward", isBackward);

  currentPosition = nextPosition;
  movingStudent.style.left = `${getStudentLeft(currentPosition)}px`;
  window.requestAnimationFrame(updateStudentBubblePosition);

  await sleep(620);

  movingStudent.classList.remove(
    "is-walking",
    "is-walking-backward"
  );

  await sleep(90);
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
    facing: operator === "+" ? "right" : "left",
    turnDirection: {
      i18n: operator === "+" ? "direction.right" : "direction.left"
    },
    walkingDirection: {
      i18n:
        secondNumber >= 0
          ? "direction.forward"
          : "direction.backward"
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
  playbackProgress.max = String(LAST_TIMELINE_STEP);
  playbackProgress.value = String(currentTimelineStep);
  playbackCounter.textContent =
    `${currentTimelineStep} / ${LAST_TIMELINE_STEP}`;

  previousStepButton.disabled = currentTimelineStep === 0;
  nextStepButton.disabled =
    currentTimelineStep === LAST_TIMELINE_STEP;
  pauseButton.disabled = !isPlaying || isPaused;
  startButton.disabled = isPlaying;

  firstNumberInput.disabled = isPlaying;
  operatorInput.disabled = isPlaying;
  secondNumberInput.disabled = isPlaying;

  playButton.setAttribute("aria-pressed", String(isPlaying && !isPaused));
  pauseButton.setAttribute("aria-pressed", String(isPaused));
  playbackModeButtons.forEach(button => {
    const isActive = button.dataset.playbackMode === playbackMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  movingStudent.classList.toggle("is-paused", isPaused);
}

function setPlaybackMode(mode) {
  if (!["auto", "manual"].includes(mode) || mode === playbackMode) {
    return;
  }

  cancelPlayback();
  playbackMode = mode;
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
    operator: leftToRightIsolate(config.operator),
    second: formatSpeechNumber(config.secondNumber),
    steps: formatSpeechNumber(config.numberOfSteps),
    position: formatSpeechNumber(config.result),
    direction: config.walkingDirection
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
  boardExercise.textContent = config.exercise;
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
      setTeacherSpeech("speech.first", {
        first: speech.first
      });
      setMessage("message.exercise", {
        exercise: leftToRightIsolate(config.exercise)
      });
      break;

    case 2:
      placeStudentOnTile(config.firstNumber, "front");
      highlightTile(config.firstNumber);
      setTeacherSpeech("speech.first", {
        first: speech.first
      });
      setStudentSpeech("student.go", {
        first: speech.first
      });
      setMessage("message.walkTo", {
        first: speech.first
      });
      if (animate) {
        await animateStudentArrival();
      }
      break;

    case 3:
      placeStudentOnTile(config.firstNumber, "front");
      highlightTile(config.firstNumber);
      setTeacherSpeech("speech.turn", {
        operator: speech.operator,
        direction: config.turnDirection
      });
      setMessage("message.turn", {
        direction: config.turnDirection
      });
      break;

    case 4:
      placeStudentOnTile(config.firstNumber, "front");
      highlightTile(config.firstNumber);
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
        await animateStudentTurn(config.facing);
      } else {
        setStudentFacing(config.facing);
      }
      break;

    case 5:
      placeStudentOnTile(config.firstNumber, config.facing);
      highlightTile(config.firstNumber);
      setTeacherSpeech("speech.walk", {
        second: speech.second,
        steps: speech.steps,
        direction: config.walkingDirection
      });
      setMessage("message.walk", {
        steps: speech.steps,
        direction: config.walkingDirection
      });
      break;

    case 6: {
      placeStudentOnTile(config.firstNumber, config.facing);
      highlightTile(config.firstNumber);
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
            config.secondNumber < 0
          );

          highlightTile(currentPosition);
        }
      } else {
        placeStudentOnTile(config.result, config.facing);
        markPath(config.firstNumber, config.result);
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
      boardExercise.textContent =
        `${config.exercise} = ${config.result}`;
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
      boardExercise.textContent =
        `${config.exercise} = ${config.result}`;
      break;

    default:
      break;
  }

  updatePlaybackControls();
  updateStudentBubblePosition();
  window.requestAnimationFrame(updateTeacherBubblePosition);
  return generation === playbackGeneration;
}

function cancelPlayback() {
  playbackGeneration += 1;
  isPlaying = false;
  isPaused = false;
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

async function runSimulation() {
  cancelPlayback();

  if (!prepareExercise()) {
    return;
  }

  await renderTimelineStep(0);
  if (playbackMode === "auto") {
    await playTimeline();
  }
}

async function resetSimulator() {
  cancelPlayback();

  firstNumberInput.value = 0;
  operatorInput.value = "+";
  secondNumberInput.value = 0;
  exerciseConfig = null;

  if (!prepareExercise()) {
    return;
  }

  await renderTimelineStep(0);
}

function handleExerciseInput() {
  if (isPlaying) {
    return;
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
startButton.addEventListener("click", runSimulation);
resetButton.addEventListener("click", resetSimulator);
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
  seekTimeline(currentTimelineStep + 1);
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

numberLineArea.addEventListener("scroll", updateStudentBubblePosition);
window.addEventListener("resize", updateStudentBubblePosition);
window.addEventListener("resize", updateTeacherBubblePosition);
window.addEventListener("signed-numbers:localechange", applyTranslations);

createClassroomStudents();
resetSimulator();
applyTranslations();

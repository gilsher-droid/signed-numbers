const i18n = window.signedNumbersI18n;

const firstNumberInput = document.getElementById("firstNumber");
const operatorInput = document.getElementById("operator");
const secondNumberInput = document.getElementById("secondNumber");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const messageBox = document.getElementById("message");
const boardExercise = document.getElementById("boardExercise");
const boardResult = document.getElementById("boardResult");
const speechBubble = document.getElementById("speechBubble");
const standingStudent = document.getElementById("standingStudent");
const movingStudent = document.getElementById("movingStudent");
const movingDirectionArrow = movingStudent.querySelector(".direction-arrow");
const numberLine = document.getElementById("numberLine");
const numberLineArea = document.querySelector(".number-line-area");
const studentDesks = document.getElementById("studentDesks");
const languageButtons = Array.from(
  document.querySelectorAll(".language-option")
);

const leftToRightIsolate = value => `\u2066${value}\u2069`;

let tiles = [];
let minimumTile = -10;
let currentPosition = 0;
let isRunning = false;
let messageState = null;
let speechState = null;

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
  messageState = { key, replacements };
  renderState(messageBox, messageState);
}

function setSpeech(key, replacements = {}) {
  speechState = { key, replacements };
  renderState(speechBubble, speechState);
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
  renderState(speechBubble, speechState);
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

function clearStudentMotion() {
  movingStudent.classList.remove(
    "is-arriving",
    "is-turning",
    "is-walking",
    "is-walking-backward"
  );
}

function setStudentFacing(facing) {
  movingStudent.dataset.facing = facing;

  const arrows = {
    front: "↑",
    right: "→",
    left: "←"
  };

  movingDirectionArrow.textContent = arrows[facing] || arrows.front;
}

function placeStudentOnTile(number) {
  currentPosition = number;

  movingStudent.style.left = `${getStudentLeft(number)}px`;
  clearStudentMotion();
  setStudentFacing("front");

  clearHighlights();
  highlightTile(number);
}

async function animateStudentArrival() {
  movingStudent.classList.add("is-arriving");
  movingStudent.style.opacity = "1";
  await sleep(750);
  movingStudent.classList.remove("is-arriving");
}

async function animateStudentTurn(facing) {
  movingStudent.classList.add("is-turning");
  setStudentFacing(facing);
  await sleep(760);
  movingStudent.classList.remove("is-turning");
}

async function animateStudentStep(nextPosition, isBackward) {
  movingStudent.classList.add("is-walking");
  movingStudent.classList.toggle("is-walking-backward", isBackward);

  currentPosition = nextPosition;
  movingStudent.style.left = `${getStudentLeft(currentPosition)}px`;

  await sleep(620);

  movingStudent.classList.remove(
    "is-walking",
    "is-walking-backward"
  );

  await sleep(90);
}

async function runSimulation() {
  if (isRunning) {
    return;
  }

  const firstNumber = Number(firstNumberInput.value);
  const operator = operatorInput.value;
  const secondNumber = Number(secondNumberInput.value);

  if (!isValidInteger(firstNumber) || !isValidInteger(secondNumber)) {
    setMessage("error.integer");
    return;
  }

  const result = calculateResult(firstNumber, operator, secondNumber);

  if (Math.abs(result) > 60) {
    setMessage("error.range");
    return;
  }

  const exercise = formatExercise(firstNumber, operator, secondNumber);

  isRunning = true;
  startButton.disabled = true;
  boardResult.textContent = "";

  updateBoardExercise();
  createNumberLine(firstNumber, result);

  setMessage("message.exercise", {
    exercise: leftToRightIsolate(exercise)
  });
  setSpeech("speech.first", { first: firstNumber });

  await sleep(1500);

  standingStudent.style.opacity = "0";
  placeStudentOnTile(firstNumber);
  setMessage("message.walkTo", { first: firstNumber });

  await animateStudentArrival();

  setSpeech("speech.position", { first: firstNumber });

  await sleep(900);

  const turnDirection = {
    i18n: operator === "+" ? "direction.right" : "direction.left"
  };
  const facing = operator === "+" ? "right" : "left";

  setSpeech("speech.turn", {
    operator,
    direction: turnDirection
  });
  setMessage("message.turn", { direction: turnDirection });

  await animateStudentTurn(facing);
  await sleep(600);

  const numberOfSteps = Math.abs(secondNumber);
  const walkingDirection = {
    i18n:
      secondNumber >= 0
        ? "direction.forward"
        : "direction.backward"
  };

  setSpeech("speech.walk", {
    second: secondNumber,
    steps: numberOfSteps,
    direction: walkingDirection
  });
  setMessage("message.walk", {
    steps: numberOfSteps,
    direction: walkingDirection
  });

  await sleep(1300);

  const directionOnLine =
    operator === "+"
      ? Math.sign(secondNumber)
      : -Math.sign(secondNumber);

  if (numberOfSteps === 0) {
    await sleep(700);
  }

  for (
    let step = 0;
    step < numberOfSteps;
    step += 1
  ) {
    const oldTile = getTile(currentPosition);

    if (oldTile) {
      oldTile.classList.remove("active");
      oldTile.classList.add("visited");
    }

    const nextPosition = currentPosition + directionOnLine;
    await animateStudentStep(nextPosition, secondNumber < 0);

    const currentTile = getTile(currentPosition);

    if (currentTile) {
      currentTile.classList.add("active");
      currentTile.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    }

    await sleep(180);
  }

  setSpeech("speech.question");
  setMessage("message.arrived", { position: currentPosition });

  await sleep(1300);

  const completedExercise = `${exercise} = ${currentPosition}`;
  boardResult.textContent = completedExercise;
  setSpeech("speech.answer", { position: currentPosition });

  isRunning = false;
  startButton.disabled = false;
}

function resetSimulator() {
  if (isRunning) {
    return;
  }

  firstNumberInput.value = 0;
  operatorInput.value = "+";
  secondNumberInput.value = 3;

  currentPosition = 0;

  standingStudent.style.opacity = "1";
  movingStudent.style.opacity = "0";
  boardResult.textContent = "";
  clearStudentMotion();
  setStudentFacing("front");

  setMessage("message.initial");
  setSpeech("speech.initial");

  updateBoardExercise();
  createNumberLine(0, 3);
  clearHighlights();
}

firstNumberInput.addEventListener("input", updateBoardExercise);
operatorInput.addEventListener("change", updateBoardExercise);
secondNumberInput.addEventListener("input", updateBoardExercise);
startButton.addEventListener("click", runSimulation);
resetButton.addEventListener("click", resetSimulator);

languageButtons.forEach(button => {
  button.addEventListener("click", () => {
    i18n.setLocale(button.dataset.locale);
  });
});

window.addEventListener("signed-numbers:localechange", applyTranslations);

createClassroomStudents();
resetSimulator();
applyTranslations();

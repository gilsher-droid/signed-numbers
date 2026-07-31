class I18n {
  constructor({
    defaultLocale = "he",
    storageKey = "signed-numbers.locale",
    messages = {}
  } = {}) {
    this.defaultLocale = defaultLocale;
    this.storageKey = storageKey;
    this.messages = messages;
    this.supportedLocales = Object.keys(messages);
    this.locale = this.getStoredLocale();
    this.applyDocumentLanguage();
  }

  getStoredLocale() {
    try {
      const storedLocale = window.localStorage.getItem(this.storageKey);

      if (this.supportedLocales.includes(storedLocale)) {
        return storedLocale;
      }
    } catch (error) {
      // The simulator still works when storage is unavailable.
    }

    return this.defaultLocale;
  }

  setLocale(locale) {
    if (!this.supportedLocales.includes(locale) || locale === this.locale) {
      return;
    }

    this.locale = locale;

    try {
      window.localStorage.setItem(this.storageKey, locale);
    } catch (error) {
      // Language switching does not depend on persistence.
    }

    this.applyDocumentLanguage();

    window.dispatchEvent(
      new CustomEvent("signed-numbers:localechange", {
        detail: { locale }
      })
    );
  }

  applyDocumentLanguage() {
    document.documentElement.lang = this.locale;
    document.documentElement.dir = this.locale === "he" ? "rtl" : "ltr";
  }

  t(key, replacements = {}) {
    const localeMessages = this.messages[this.locale] || {};
    const fallbackMessages = this.messages[this.defaultLocale] || {};
    const template = localeMessages[key] ?? fallbackMessages[key] ?? key;

    return Object.entries(replacements).reduce(
      (result, [replacementKey, value]) =>
        result.replaceAll(`{${replacementKey}}`, String(value)),
      template
    );
  }
}

const messages = {
  he: {
    "document.title":
      "מספרים מכוונים — להרגיש את התרגיל דרך הגוף — Fundamatics",
    "document.description":
      "סימולטור אינטראקטיבי ללימוד חיבור וחיסור של מספרים מכוונים",
    "header.aria": "מספרים מכוונים מבית Fundamatics",
    "header.title":
      "מספרים מכוונים — להרגיש את התרגיל דרך הגוף",
    "header.subtitle":
      "סימולטור גופני ללימוד חיבור וחיסור של מספרים מכוונים",
    "header.home": "חזרה ל־Fundamatics",
    "language.label": "בחירת שפה",
    "controls.aria": "הגדרת תרגיל",
    "controls.firstNumber": "הכניסו את המספר הראשון",
    "controls.operation": "בחרו את הפעולה",
    "controls.secondNumber": "הכניסו את המספר השני",
    "controls.start": "הפעלת התרגיל",
    "controls.reset": "איפוס",
    "controls.random": "תרגיל אקראי",
    "sound.off": "🔇 קול כבוי",
    "sound.on": "🔊 קול פעיל",
    "playback.aria": "בקרת הפעלה",
    "playback.mode.label": "אופן ההתקדמות בתרגיל",
    "playback.mode.auto": "הפעלה אוטומטית",
    "playback.mode.manual": "מצב מודרך",
    "playback.previous": "חזרה לשלב הקודם",
    "playback.play": "הפעלה",
    "playback.pause": "השהיה",
    "playback.next": "מעבר לשלב הבא",
    "playback.continue": "המשך",
    "playback.autoStart": "הפעל",
    "playback.resume": "המשך",
    "playback.progress": "התקדמות בתרגיל",
    "classroom.aria": "הדמיית כיתה אינטראקטיבית",
    "classroom.clock": "שעון קיר",
    "classroom.window": "חלון כיתה",
    "classroom.students": "תלמידים יושבים ליד שולחנות",
    "numberLine.aria": "ישר מספרים על רצפת הכיתה",
    "board.title": "כתבו את התרגיל",
    "people.teacher": "המורה",
    "people.student": "התלמיד",
    "message.initial":
      "המורה והתלמיד עומדים ליד הלוח. שאר התלמידים יושבים בכיתה.",
    "speech.initial": "בוא נבצע את התרגיל שמופיע על הלוח.",
    "error.integer": "יש להזין מספרים שלמים בין מינוס 30 ל־30.",
    "error.range": "התוצאה רחוקה מדי עבור רצפת הכיתה.",
    "message.exercise": "התרגיל על הלוח הוא {exercise}.",
    "speech.exerciseQuestion":
      "התרגיל שלנו הוא {exercise}. מהו המספר הראשון?",
    "speech.first":
      "המספר הראשון הוא {first}. לך לעמוד על האריח שמסומן {first}.",
    "student.go":
      "אוקיי, אני הולך לאריח שמסומן {first}.",
    "message.walkTo": "התלמיד הולך אל האריח {first}.",
    "speech.position": "עכשיו אתה עומד על {first}.",
    "speech.operatorQuestion":
      "עכשיו הסתכל על סימן הפעולה {operator}. מה הוא אומר לך לעשות?",
    "message.operatorFocus": "סימן הפעולה הוא {operator}.",
    "speech.turn":
      "הסימן {operator} אומר להסתובב 90 מעלות כך שהפנים פונות {direction}.",
    "student.turn":
      "אני מסתובב 90 מעלות עם הפנים {direction}, כי אמרת {operator}.",
    "message.turn":
      "התלמיד מסתובב 90 מעלות ופניו פונות {direction}.",
    "direction.right": "ימינה",
    "direction.left": "שמאלה",
    "speech.walk":
      "המספר השני הוא {second}. לך {steps} צעדים {direction}.",
    "student.walk":
      "עכשיו אני צועד {direction} {steps} צעדים.",
    "message.walk": "התלמיד הולך {steps} צעדים {direction}.",
    "direction.forward": "קדימה",
    "direction.backward": "אחורה",
    "direction.still": "ונשאר במקום",
    "movement.forward": "הולכים קדימה",
    "movement.backward": "הולכים אחורה",
    "movement.stay": "נשארים במקום",
    "number.positive": "חיובי",
    "number.negative": "שלילי",
    "number.zero": "אפס",
    "speech.secondNumber":
      "עכשיו הסתכל על המספר השני: {second}. הוא {numberKind}, לכן {movement}. כמה צעדים? {steps}.",
    "message.secondNumber":
      "המספר השני {second} הוא {numberKind}: {movement}, {steps} צעדים.",
    "turn.indicator": "90° {direction}",
    "walk.counter": "צעד {current} מתוך {total}",
    "speech.question": "על איזה אריח אתה עומד עכשיו?",
    "student.answer": "אני עומד על האריח {position}.",
    "message.arrived": "התלמיד הגיע לאריח {position}.",
    "speech.answer":
      "נכון, ולכן תוצאת התרגיל היא {position}.",
    "message.answer":
      "המורה מסכם: תוצאת התרגיל היא {position}.",
    "completion.new": "תרגיל חדש",
    "completion.replay": "הפעל שוב"
  },
  en: {
    "document.title":
      "Signed Numbers — Feel the Exercise Through Movement — Fundamatics",
    "document.description":
      "An interactive simulator for learning addition and subtraction with signed numbers",
    "header.aria": "Signed Numbers by Fundamatics",
    "header.title":
      "Signed Numbers — Feel the Exercise Through Movement",
    "header.subtitle":
      "A movement-based simulator for adding and subtracting signed numbers",
    "header.home": "Back to Fundamatics",
    "language.label": "Choose language",
    "controls.aria": "Exercise setup",
    "controls.firstNumber": "Enter the first number",
    "controls.operation": "Choose the operation",
    "controls.secondNumber": "Enter the second number",
    "controls.start": "Run exercise",
    "controls.reset": "Reset",
    "controls.random": "Random exercise",
    "sound.off": "🔇 Sound off",
    "sound.on": "🔊 Sound on",
    "playback.aria": "Playback controls",
    "playback.mode.label": "Choose how to move through the exercise",
    "playback.mode.auto": "Auto play",
    "playback.mode.manual": "Guided mode",
    "playback.previous": "Previous step",
    "playback.play": "Play",
    "playback.pause": "Pause",
    "playback.next": "Next step",
    "playback.continue": "Continue",
    "playback.autoStart": "Play",
    "playback.resume": "Resume",
    "playback.progress": "Exercise progress",
    "classroom.aria": "Interactive classroom simulation",
    "classroom.clock": "Wall clock",
    "classroom.window": "Classroom window",
    "classroom.students": "Students seated at desks",
    "numberLine.aria": "Number line on the classroom floor",
    "board.title": "Build the exercise",
    "people.teacher": "Teacher",
    "people.student": "Student",
    "message.initial":
      "The teacher and student are standing by the board. The other students are seated.",
    "speech.initial": "Let’s work through the exercise on the board.",
    "error.integer": "Enter whole numbers from −30 to 30.",
    "error.range": "The result is too far away for the classroom floor.",
    "message.exercise": "The exercise on the board is {exercise}.",
    "speech.exerciseQuestion":
      "Our exercise is {exercise}. What is the first number?",
    "speech.first":
      "The first number is {first}. Go and stand on tile {first}.",
    "student.go": "Okay, I’m going to tile {first}.",
    "message.walkTo": "The student walks to tile {first}.",
    "speech.position": "You are now standing on {first}.",
    "speech.operatorQuestion":
      "Now look at the operation sign {operator}. What does it tell you to do?",
    "message.operatorFocus": "The operation sign is {operator}.",
    "speech.turn":
      "The {operator} sign means turn 90 degrees so your face points {direction}.",
    "student.turn":
      "I turn 90 degrees with my face pointing {direction}, because you said {operator}.",
    "message.turn":
      "The student turns 90 degrees and faces {direction}.",
    "direction.right": "right",
    "direction.left": "left",
    "speech.walk":
      "The second number is {second}. Take {steps} steps {direction}.",
    "student.walk": "Now I take {steps} steps {direction}.",
    "message.walk": "The student takes {steps} steps {direction}.",
    "direction.forward": "forward",
    "direction.backward": "backward",
    "direction.still": "and stay in place",
    "movement.forward": "move forward",
    "movement.backward": "move backward",
    "movement.stay": "stay in place",
    "number.positive": "positive",
    "number.negative": "negative",
    "number.zero": "zero",
    "speech.secondNumber":
      "Now look at the second number: {second}. It is {numberKind}, so {movement}. How many steps? {steps}.",
    "message.secondNumber":
      "The second number {second} is {numberKind}: {movement}, {steps} steps.",
    "turn.indicator": "90° {direction}",
    "walk.counter": "Step {current} of {total}",
    "speech.question": "Which tile are you standing on now?",
    "student.answer": "I am standing on tile {position}.",
    "message.arrived": "The student arrived at tile {position}.",
    "speech.answer":
      "Correct, so the result of the exercise is {position}.",
    "message.answer":
      "The teacher concludes: the result of the exercise is {position}.",
    "completion.new": "New exercise",
    "completion.replay": "Play again"
  }
};

window.signedNumbersI18n = new I18n({
  defaultLocale: "he",
  storageKey: "signed-numbers.locale",
  messages
});

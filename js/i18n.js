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
    const requestedLocale = new URLSearchParams(window.location.search).get("lang");
    if (this.supportedLocales.includes(requestedLocale)) {
      try { window.localStorage.setItem(this.storageKey, requestedLocale); } catch (_) {}
      return requestedLocale;
    }

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
    const url = new URL(window.location.href);
    url.searchParams.set("lang", locale);
    window.history.replaceState(window.history.state, "", url);

    window.dispatchEvent(
      new CustomEvent("signed-numbers:localechange", {
        detail: { locale }
      })
    );
  }

  applyDocumentLanguage() {
    document.documentElement.lang = this.locale;
    document.documentElement.dir = ["he", "ar"].includes(this.locale) ? "rtl" : "ltr";
  }

  t(key, replacements = {}) {
    if (this.locale === "ar" && ["speech.walk", "student.walk", "message.walk"].includes(key)
        && Number(String(replacements.steps).replace(/[\u2066-\u2069]/g, "")) === 0) {
      key += ".zero";
    }
    const localeMessages = this.messages[this.locale] || {};
    const fallbackMessages = this.messages[this.defaultLocale] || {};
    const template = localeMessages[key] ?? fallbackMessages[key] ?? key;

    return Object.entries(replacements).reduce(
      (result, [replacementKey, value]) =>
        result.replaceAll(`{${replacementKey}}`, this.locale === "ar" && typeof value === "number" ? `\u2066${value}\u2069` : String(value)),
      template
    );
  }
}

const messages = {
  ar: {
    "speech.walk.zero": "العدد الثاني هو {second}، لذا ابقَ في مكانك. عدد الخطوات: {steps}.",
    "student.walk.zero": "أبقى في مكاني. عدد الخطوات: {steps}.",
    "message.walk.zero": "يبقى الطالب في مكانه. عدد الخطوات: {steps}.",

    "operation.spokenAdd": "زائد",
    "operation.spokenSubtract": "ناقص",
    "header.brandAria": "Fundamatics، رياضيات للحياة",
    "document.title": "الأعداد الموجبة والسالبة: افهم العملية بالحركة | Fundamatics",
    "document.description": "تطبيق تفاعلي لتعلّم جمع الأعداد الموجبة والسالبة وطرحها من خلال الاتجاه والحركة على خط الأعداد.",
    "header.aria": "الأعداد الموجبة والسالبة من Fundamatics",
    "header.title": "الأعداد الموجبة والسالبة: افهم العملية بالحركة",
    "header.subtitle": "تعلّم جمع الأعداد الموجبة والسالبة وطرحها من خلال الحركة",
    "header.home": "العودة إلى Fundamatics",
    "language.label": "اختيار اللغة",
    "controls.aria": "إعداد العملية الحسابية",
    "controls.firstNumber": "أدخل العدد الأول",
    "controls.operation": "العملية",
    "controls.secondNumber": "أدخل العدد الثاني",
    "controls.decrementFirst": "إنقاص العدد الأول بمقدار 1",
    "controls.incrementFirst": "زيادة العدد الأول بمقدار 1",
    "controls.decrementSecond": "إنقاص العدد الثاني بمقدار 1",
    "controls.incrementSecond": "زيادة العدد الثاني بمقدار 1",
    "controls.start": "حلّ العملية",
    "controls.reset": "إعادة الضبط",
    "controls.random": "عملية عشوائية",
    "sound.off": "🔇 الصوت متوقف",
    "sound.on": "🔊 الصوت مفعّل",
    "playback.aria": "أدوات التحكم في التشغيل",
    "playback.mode.label": "طريقة التقدم في العملية",
    "playback.mode.auto": "تشغيل تلقائي",
    "playback.mode.manual": "خطوة بخطوة",
    "playback.previous": "العودة إلى الخطوة السابقة",
    "playback.play": "تشغيل",
    "playback.pause": "إيقاف مؤقت",
    "playback.next": "الانتقال إلى الخطوة التالية",
    "playback.continue": "متابعة",
    "playback.autoStart": "تشغيل",
    "playback.resume": "استئناف",
    "playback.progress": "التقدم في العملية",
    "classroom.aria": "محاكاة تفاعلية لصف دراسي",
    "classroom.clock": "ساعة الحائط",
    "classroom.window": "نافذة الصف",
    "classroom.students": "طلاب يجلسون إلى طاولاتهم",
    "numberLine.aria": "خط الأعداد على أرضية الصف، تزداد القيم من اليسار إلى اليمين",
    "board.title": "اكتب العملية الحسابية",
    "people.teacher": "المعلّم",
    "people.student": "الطالب",
    "message.initial": "يقف المعلّم والطالب بجانب اللوح، ويجلس بقية الطلاب في الصف.",
    "speech.initial": "لنحلّ العملية المكتوبة على اللوح معًا.",
    "error.integer": "أدخل أعدادًا صحيحة من سالب 30 إلى 30.",
    "error.range": "الناتج خارج نطاق خط الأعداد في الصف.",
    "message.exercise": "العملية على اللوح هي {exercise}.",
    "speech.exerciseQuestion": "عمليتنا هي {exercise}. ما العدد الأول؟",
    "speech.first": "العدد الأول هو {first}. قف على البلاطة التي تحمل العدد {first}.",
    "student.go": "حسنًا، سأتجه إلى البلاطة التي تحمل العدد {first}.",
    "message.walkTo": "يتجه الطالب إلى البلاطة {first}.",
    "speech.position": "أنت الآن تقف على العدد {first}.",
    "speech.operatorQuestion": "انظر الآن إلى عملية {operator}. ماذا تطلب منك أن تفعل؟",
    "message.operatorFocus": "العملية هي {operator}.",
    "speech.turn": "عملية {operator} تعني أن تدور بزاوية 90 درجة حتى تتجه بوجهك {direction}.",
    "student.turn": "أدور بزاوية 90 درجة وأتجه بوجهي {direction} لأن العملية هي {operator}.",
    "message.turn": "يدور الطالب بزاوية 90 درجة ويتجه بوجهه {direction}.",
    "direction.right": "إلى اليمين",
    "direction.left": "إلى اليسار",
    "speech.walk": "العدد الثاني هو {second}. تحرّك {direction}، وعدد الخطوات {steps}.",
    "student.walk": "أتحرك الآن {direction}، وعدد الخطوات {steps}.",
    "message.walk": "يتحرك الطالب {direction}، وعدد الخطوات {steps}.",
    "direction.forward": "إلى الأمام",
    "direction.backward": "إلى الخلف",
    "direction.still": "دون تغيير المكان",
    "movement.forward": "نتحرك إلى الأمام",
    "movement.backward": "نتحرك إلى الخلف",
    "movement.stay": "نبقى في مكاننا",
    "number.positive": "موجب",
    "number.negative": "سالب",
    "number.zero": "صفر",
    "number.minus": "سالب",
    "operation.add": "الجمع",
    "operation.subtract": "الطرح",
    "speech.secondNumber": "انظر إلى العدد الثاني: {second}. إنه {numberKind}، لذلك {movement}. كم خطوة؟ {steps}.",
    "message.secondNumber": "العدد الثاني {second} هو {numberKind}: {movement}، وعدد الخطوات {steps}.",
    "turn.indicator": "⁦90°⁩ {direction}",
    "walk.counter": "الخطوة {current} من {total}",
    "speech.question": "على أي بلاطة تقف الآن؟",
    "student.answer": "أقف على البلاطة {position}.",
    "message.arrived": "وصل الطالب إلى البلاطة {position}.",
    "speech.answer": "صحيح، إذن ناتج العملية هو {position}.",
    "message.answer": "خلاصة المعلّم: ناتج العملية هو {position}.",
    "completion.new": "عملية جديدة",
    "completion.replay": "تشغيل من جديد"
},
  he: {
    "speech.walk.zero": "המספר השני הוא {second}, לכן נשארים במקום. מספר הצעדים: {steps}.",
    "student.walk.zero": "אני נשאר במקום. מספר הצעדים: {steps}.",
    "message.walk.zero": "התלמיד נשאר במקום. מספר הצעדים: {steps}.",

    "operation.spokenAdd": "ועוד",
    "operation.spokenSubtract": "פחות",
    "header.brandAria": "Fundamatics — Maths for life",
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
    "controls.decrementFirst": "הפחת 1 מהמספר הראשון",
    "controls.incrementFirst": "הוסף 1 למספר הראשון",
    "controls.decrementSecond": "הפחת 1 מהמספר השני",
    "controls.incrementSecond": "הוסף 1 למספר השני",
    "controls.start": "פתור תרגיל",
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
      "עכשיו הסתכל על הפעולה {operator}. מה היא אומרת לך לעשות?",
    "message.operatorFocus": "הפעולה היא {operator}.",
    "speech.turn":
      "הפעולה {operator} אומרת להסתובב 90 מעלות כך שהפנים פונות {direction}.",
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
    "number.minus": "מינוס",
    "operation.add": "ועוד",
    "operation.subtract": "פחות",
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
    "speech.walk.zero": "The second number is {second}, so stay in place. Number of steps: {steps}.",
    "student.walk.zero": "I stay in place. Number of steps: {steps}.",
    "message.walk.zero": "The student stays in place. Number of steps: {steps}.",

    "operation.spokenAdd": "add",
    "operation.spokenSubtract": "subtract",
    "header.brandAria": "Fundamatics — Maths for life",
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
    "controls.decrementFirst": "Decrease the first number by 1",
    "controls.incrementFirst": "Increase the first number by 1",
    "controls.decrementSecond": "Decrease the second number by 1",
    "controls.incrementSecond": "Increase the second number by 1",
    "controls.start": "Solve exercise",
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
      "Now look at the {operator} operation. What does it tell you to do?",
    "message.operatorFocus": "The operation is {operator}.",
    "speech.turn":
      "The {operator} operation means turn 90 degrees so your face points {direction}.",
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
    "number.minus": "negative",
    "operation.add": "add",
    "operation.subtract": "subtract",
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

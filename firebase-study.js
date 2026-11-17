/* Chronos Named NPC Study uploader.
 * Anonymous Authentication; one immutable record per completed session.
 * No participant name, email, or other direct identifier is uploaded.
 */
(function () {
  "use strict";
  const config = window.CHRONOS_FIREBASE_CONFIG;
  const validConfig = config && config.apiKey && !String(config.apiKey).includes("REPLACE_ME")
    && config.projectId && !String(config.projectId).includes("REPLACE_ME")
    && config.databaseURL && !String(config.databaseURL).includes("REPLACE_ME");

  window.ChronosStudyUpload = async function (payload) {
    if (!validConfig) throw new Error("firebase-config.js の設定が必要です");
    if (!window.firebase || !firebase.initializeApp) throw new Error("Firebase SDKを読み込めません");
    if (!firebase.apps.length) firebase.initializeApp(config);

    const auth = firebase.auth();
    if (!auth.currentUser) await auth.signInAnonymously();
    const user = auth.currentUser;
    if (!user) throw new Error("匿名認証に失敗しました");

    const answers = Array.isArray(payload.answers) ? payload.answers.slice(0, 50) : [];
    if (!answers.length) throw new Error("送信する回答がありません");

    const sanitized = answers.map((a) => ({
      questionId: String(a.questionId || "").slice(0, 80),
      level: String(a.level || "標準").slice(0, 30),
      period: String(a.period || "").slice(0, 30),
      band: Math.max(0, Math.min(4, Number(a.band) || 0)),
      guess: Math.max(-1999, Math.min(9999, Number(a.guess) || 0)),
      truth: Math.max(-1999, Math.min(9999, Number(a.truth) || 0)),
      error: Math.max(0, Math.min(11998, Number(a.error) || 0)),
      elapsedMs: Math.max(0, Math.min(3600000, Number(a.elapsedMs) || 0))
    }));

    if (sanitized.some(a => !a.questionId)) throw new Error("問題IDがない回答が含まれています");

    const record = {
      schemaVersion: 1,
      source: "chronos-answer-study",
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      questionCount: sanitized.length,
      answers: sanitized
    };
    const ref = firebase.database().ref("studySessions/" + user.uid).push();
    await ref.set(record);
    return { sessionId: ref.key };
  };
})();
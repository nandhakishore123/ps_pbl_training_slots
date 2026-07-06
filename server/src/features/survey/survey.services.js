import * as model from './survey.model.js';
// Reuse the canonical user_id → student_id resolver (single source of truth).
import { getStudentIdByUserId } from '../training/training.model.js';

const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const notFound = (message) => {
  const err = new Error(message);
  err.status = 404;
  return err;
};

const conflict = (message) => {
  const err = new Error(message);
  err.status = 409;
  return err;
};

// A survey is visible to a student when it is active and its (nullable) target
// course/year match the student's. NULL on a dimension = no filter. Mirrors the
// announcements targeting rule exactly.
const isVisibleToStudent = (survey, info) =>
  survey.status === 'active' &&
  (survey.target_course == null || survey.target_course === (info?.course ?? null)) &&
  (survey.target_year == null || Number(survey.target_year) === Number(info?.year_of_study ?? NaN));

// Normalize an incoming target value: '' / 'ALL' / null → null (no filter).
// Mirrors the announcements feature exactly.
const normalizeCourse = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.toUpperCase() === 'ALL') return null;
  return s;
};

const normalizeYear = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.toUpperCase() === 'ALL') return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
};

const QUESTION_TYPES = new Set(['single', 'multi']);
const SURVEY_STATUSES = new Set(['active', 'closed']);

// Validate + normalize the questions/options payload into clean rows.
const cleanQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw badRequest('At least one question is required');
  }

  return questions.map((q, idx) => {
    const text = String(q?.question_text ?? '').trim();
    if (!text) throw badRequest(`Question ${idx + 1}: text is required`);

    const type = String(q?.question_type ?? 'single').trim().toLowerCase();
    if (!QUESTION_TYPES.has(type)) {
      throw badRequest(`Question ${idx + 1}: type must be 'single' or 'multi'`);
    }

    const options = Array.isArray(q?.options)
      ? q.options.map((o) => String(o ?? '').trim()).filter(Boolean)
      : [];
    if (options.length < 2) {
      throw badRequest(`Question ${idx + 1}: at least 2 options are required`);
    }

    return { question_text: text, question_type: type, options };
  });
};

// ── Admin ────────────────────────────────────────────────────
export const createSurvey = async ({
  title,
  description,
  targetCourse,
  targetYear,
  createdBy,
  questions,
}) => {
  const cleanTitle = String(title ?? '').trim();
  if (!cleanTitle) throw badRequest('Title is required');
  if (!createdBy) throw badRequest('Missing creator');

  const cleanDescription = description == null ? null : String(description).trim() || null;
  const cleanQs = cleanQuestions(questions);

  const id = await model.insertSurvey({
    title: cleanTitle,
    description: cleanDescription,
    targetCourse: normalizeCourse(targetCourse),
    targetYear: normalizeYear(targetYear),
    createdBy,
    questions: cleanQs,
  });
  return { survey_id: id };
};

export const listSurveys = () => model.listAllSurveys();

// Survey + nested questions (each with its options) for admin review/preview.
export const getSurveyDetail = async (id) => {
  const survey = await model.getSurveyById(id);
  if (!survey) throw notFound('Survey not found');

  const [questions, options] = await Promise.all([
    model.getQuestionsForSurvey(id),
    model.getOptionsForSurvey(id),
  ]);

  const optionsByQuestion = new Map();
  for (const opt of options) {
    if (!optionsByQuestion.has(opt.question_id)) optionsByQuestion.set(opt.question_id, []);
    optionsByQuestion.get(opt.question_id).push(opt);
  }

  return {
    ...survey,
    questions: questions.map((q) => ({
      ...q,
      options: optionsByQuestion.get(q.question_id) ?? [],
    })),
  };
};

export const setStatus = async (id, status) => {
  const clean = String(status ?? '').trim().toLowerCase();
  if (!SURVEY_STATUSES.has(clean)) {
    throw badRequest("Status must be 'active' or 'closed'");
  }
  const existing = await model.getSurveyById(id);
  if (!existing) throw notFound('Survey not found');
  await model.setSurveyStatus(id, clean);
  return model.getSurveyById(id);
};

export const deleteSurvey = async (id) => {
  const existing = await model.getSurveyById(id);
  if (!existing) throw notFound('Survey not found');
  await model.deleteSurveyCascade(id);
  return true;
};

// ── Student ──────────────────────────────────────────────────
// Resolve user_id → student_id + course/year in one place.
const resolveStudent = async (userId) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');
  const info = await model.getStudentCourseYear(studentId);
  return { studentId, info };
};

// Active surveys matching this student's targeting, each with a submitted flag.
export const listForStudent = async (userId) => {
  const { studentId, info } = await resolveStudent(userId);
  const rows = await model.listSurveysForStudent({
    studentId,
    course: info?.course ?? null,
    year: info?.year_of_study ?? null,
  });
  return rows.map((r) => ({
    survey_id: r.survey_id,
    title: r.title,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    submitted: r.response_id != null,
    submitted_at: r.submitted_at ?? null,
  }));
};

// Survey + questions/options for a student, only if visible to them. If already
// submitted, attach the student's selected option_ids per question (read-only).
export const getDetailForStudent = async (userId, surveyId) => {
  const { studentId, info } = await resolveStudent(userId);

  const survey = await model.getSurveyById(surveyId);
  if (!survey || !isVisibleToStudent(survey, info)) throw notFound('Survey not found');

  const [questions, options] = await Promise.all([
    model.getQuestionsForSurvey(surveyId),
    model.getOptionsForSurvey(surveyId),
  ]);

  const optionsByQuestion = new Map();
  for (const opt of options) {
    if (!optionsByQuestion.has(opt.question_id)) optionsByQuestion.set(opt.question_id, []);
    optionsByQuestion.get(opt.question_id).push(opt);
  }

  // Prior submission → selected option_ids per question for read-only display.
  const response = await model.getStudentResponse(surveyId, studentId);
  const selectedByQuestion = new Map();
  if (response) {
    const answers = await model.getAnswersByResponse(response.response_id);
    for (const a of answers) {
      if (!selectedByQuestion.has(a.question_id)) selectedByQuestion.set(a.question_id, []);
      selectedByQuestion.get(a.question_id).push(a.option_id);
    }
  }

  return {
    survey_id: survey.survey_id,
    title: survey.title,
    description: survey.description,
    status: survey.status,
    target_course: survey.target_course,
    target_year: survey.target_year,
    submitted: response != null,
    submitted_at: response?.submitted_at ?? null,
    questions: questions.map((q) => ({
      question_id: q.question_id,
      question_text: q.question_text,
      question_type: q.question_type,
      display_order: q.display_order,
      options: optionsByQuestion.get(q.question_id) ?? [],
      selected_option_ids: selectedByQuestion.get(q.question_id) ?? [],
    })),
  };
};

export const submitForStudent = async (userId, surveyId, answers) => {
  const { studentId, info } = await resolveStudent(userId);

  const survey = await model.getSurveyById(surveyId);
  if (!survey || !isVisibleToStudent(survey, info)) throw notFound('Survey not found');

  // Explicit duplicate check (UNIQUE uq_sr is the final race guard).
  const existing = await model.getStudentResponse(surveyId, studentId);
  if (existing) throw conflict('You have already submitted this survey');

  if (!Array.isArray(answers) || answers.length === 0) {
    throw badRequest('Answers are required');
  }

  // Load this survey's questions + options to validate membership and arity.
  const [questions, options] = await Promise.all([
    model.getQuestionsForSurvey(surveyId),
    model.getOptionsForSurvey(surveyId),
  ]);

  const questionById = new Map(questions.map((q) => [Number(q.question_id), q]));
  const optionsByQuestion = new Map();
  for (const opt of options) {
    const qid = Number(opt.question_id);
    if (!optionsByQuestion.has(qid)) optionsByQuestion.set(qid, new Set());
    optionsByQuestion.get(qid).add(Number(opt.option_id));
  }

  // Build a flat, de-duplicated (question_id, option_id) list while validating.
  const flatAnswers = [];
  const seenQuestions = new Set();
  for (const a of answers) {
    const qid = Number(a?.question_id);
    const question = questionById.get(qid);
    if (!question) throw badRequest(`Invalid question for this survey: ${a?.question_id}`);
    if (seenQuestions.has(qid)) throw badRequest(`Duplicate answer for question ${qid}`);
    seenQuestions.add(qid);

    const optionIds = Array.isArray(a?.option_ids)
      ? [...new Set(a.option_ids.map((o) => Number(o)))]
      : [];
    if (optionIds.length === 0) throw badRequest(`Question ${qid}: at least one option is required`);

    if (question.question_type === 'single' && optionIds.length !== 1) {
      throw badRequest(`Question ${qid}: exactly one option must be selected`);
    }

    const validOptionIds = optionsByQuestion.get(qid) ?? new Set();
    for (const oid of optionIds) {
      if (!validOptionIds.has(oid)) {
        throw badRequest(`Question ${qid}: invalid option ${oid}`);
      }
      flatAnswers.push({ question_id: qid, option_id: oid });
    }
  }

  await model.insertResponseWithAnswers({ surveyId, studentId, answers: flatAnswers });
  return true;
};

// ── Admin: response aggregation + CSV export ─────────────────
// Aggregate a survey's responses into: summary, per-question option counts, and a
// per-respondent list with their selected options. Read-only; reuses the existing
// survey/question/option readers plus the new aggregation queries.
export const getSurveyResponses = async (surveyId) => {
  const survey = await model.getSurveyById(surveyId);
  if (!survey) throw notFound('Survey not found');

  const [questions, options, respondentRows, answerRows, optionCounts] = await Promise.all([
    model.getQuestionsForSurvey(surveyId),
    model.getOptionsForSurvey(surveyId),
    model.getSurveyRespondents(surveyId),
    model.getSurveyAnswerRows(surveyId),
    model.getSurveyOptionCounts(surveyId),
  ]);

  // option_id → response count.
  const countByOption = new Map();
  for (const c of optionCounts) countByOption.set(Number(c.option_id), Number(c.cnt) || 0);

  // question_id → its options (in display order) with counts attached.
  const optionsByQuestion = new Map();
  for (const opt of options) {
    const qid = Number(opt.question_id);
    if (!optionsByQuestion.has(qid)) optionsByQuestion.set(qid, []);
    optionsByQuestion.get(qid).push({
      option_id: opt.option_id,
      option_text: opt.option_text,
      count: countByOption.get(Number(opt.option_id)) || 0,
    });
  }

  // response_id → (question_id → { option_ids, option_texts }).
  const byResponse = new Map();
  for (const a of answerRows) {
    const rid = Number(a.response_id);
    if (!byResponse.has(rid)) byResponse.set(rid, new Map());
    const qMap = byResponse.get(rid);
    const qid = Number(a.question_id);
    if (!qMap.has(qid)) qMap.set(qid, { question_id: qid, option_ids: [], option_texts: [] });
    const entry = qMap.get(qid);
    entry.option_ids.push(a.option_id);
    entry.option_texts.push(a.option_text);
  }

  const respondents = respondentRows.map((r) => {
    const qMap = byResponse.get(Number(r.response_id)) ?? new Map();
    return {
      student_id: r.student_id,
      name: r.name,
      reg_num: r.reg_num,
      course: r.course,
      year_of_study: r.year_of_study,
      submitted_at: r.submitted_at ?? null,
      // Answers ordered by the survey's question display order.
      answers: questions
        .map((q) => qMap.get(Number(q.question_id)))
        .filter(Boolean),
    };
  });

  const distinctStudents = new Set(respondentRows.map((r) => Number(r.student_id)));

  return {
    summary: {
      survey_id: survey.survey_id,
      title: survey.title,
      total_respondents: distinctStudents.size,
    },
    questions: questions.map((q) => ({
      question_id: q.question_id,
      question_text: q.question_text,
      question_type: q.question_type,
      display_order: q.display_order,
      options: optionsByQuestion.get(Number(q.question_id)) ?? [],
    })),
    respondents,
  };
};

// ── CSV helpers (activity-points style) ──────────────────────
const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const buildCsv = (headerRow, dataRows) => {
  const lines = [headerRow.map(csvCell).join(',')];
  for (const row of dataRows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n');
};

// Wide CSV: one row per respondent; a column per question holding that student's
// selected option texts joined by "; ".
export const getSurveyResponsesCsv = async (surveyId) => {
  const data = await getSurveyResponses(surveyId);

  const header = ['Name', 'Reg No', 'Course', 'Year', 'Submitted At', ...data.questions.map((q) => q.question_text)];

  const rows = data.respondents.map((r) => {
    const answerByQuestion = new Map(r.answers.map((a) => [Number(a.question_id), a]));
    const cells = [
      r.name ?? '',
      r.reg_num ?? '',
      r.course ?? '',
      r.year_of_study ?? '',
      r.submitted_at ? new Date(r.submitted_at).toISOString() : '',
    ];
    for (const q of data.questions) {
      const a = answerByQuestion.get(Number(q.question_id));
      cells.push(a ? a.option_texts.join('; ') : '');
    }
    return cells;
  });

  return buildCsv(header, rows);
};

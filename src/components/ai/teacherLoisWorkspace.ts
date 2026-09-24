import type { LoisPageContext } from './LoisWorkspace';

export type TeacherLoisPrompt = {
  title: string;
  description: string;
  prompt: string;
};

export type TeacherLoisGroup = {
  label: string;
  href?: string;
  hrefLabel?: string;
  cards: TeacherLoisPrompt[];
};

export type TeacherLoisWorkspace = {
  subtitle: string;
  greetingTitle: string;
  greetingBody: string;
  groups: TeacherLoisGroup[];
  /** Class assignments are still loading. The heading stays put; prompt cards are placeholders. */
  loading?: boolean;
};

type Assignment = {
  teacherId?: string;
  subject?: string | null;
  isPrimary?: boolean;
  isFormTeacher?: boolean;
};

export type TeacherLoisClass = {
  id: string;
  name?: string;
  classArmId?: string;
  teachers?: Assignment[];
};

function className(row: TeacherLoisClass) {
  return row.name || 'this class';
}

function teachesThisClass(row: TeacherLoisClass, teacherId?: string) {
  if (!teacherId) return false;
  return (row.teachers || []).some((assignment) => {
    if (assignment.teacherId !== teacherId) return false;
    if (assignment.isPrimary) return true;
    return Boolean(assignment.subject && String(assignment.subject).trim());
  });
}

function reportCards(name: string, named: boolean): TeacherLoisPrompt[] {
  const label = named ? `${name} · ` : '';
  return [
    {
      title: `${label}This term`,
      description: 'Published grade averages',
      prompt: `How is ${name} performing this term? Use published grades only.`,
    },
    {
      title: `${label}Who is struggling`,
      description: 'Students under the line',
      prompt: `Who in ${name} is below the academic risk threshold this term? If the gradebook is empty, say so.`,
    },
    {
      title: `${label}Attendance`,
      description: 'Recent presence',
      prompt: `Summarise attendance for ${name}.`,
    },
    {
      title: `${label}Parent note`,
      description: 'Draft only — nothing is sent',
      prompt: `Draft a supportive parent update about how ${name} is doing this term. Do not send it.`,
    },
  ];
}

export function teacherLoisPageContext(
  schoolId: string,
  formClasses: TeacherLoisClass[],
  formNoun: string,
): LoisPageContext {
  if (formClasses.length === 1) {
    const formClass = formClasses[0];
    return {
      type: 'class',
      schoolId,
      classId: formClass.id,
      classArmId: formClass.classArmId || formClass.id,
      label: className(formClass),
      path: `/dashboard/teacher/classes/${formClass.id}`,
    };
  }

  const names = formClasses.map(className).join(', ');
  return {
    type: 'generic',
    schoolId,
    label: formClasses.length > 1 ? `${formNoun}: ${names}` : 'Teaching assistant',
    path: '/dashboard/teacher/plugins/agora-ai',
  };
}

export function buildTeacherLoisWorkspace(input: {
  teacherId?: string;
  classesReady: boolean;
  classes: TeacherLoisClass[];
  formClasses: TeacherLoisClass[];
  formNoun: string;
}): TeacherLoisWorkspace {
  const { teacherId, classesReady, classes, formClasses, formNoun } = input;

  if (!classesReady) {
    return {
      subtitle: '',
      greetingTitle: 'What should we work on?',
      greetingBody: 'Lesson plans and quizzes stay in this chat. A form briefing uses published grades, and parent notes are drafts until you send them yourself.',
      groups: [],
      loading: true,
    };
  }

  if (classes.length === 0) {
    return {
      subtitle: 'No classes assigned yet',
      greetingTitle: 'Assignments are not in yet',
      greetingBody: 'Lois can plan lessons, build assessments, and brief a form class once you are assigned to one.',
      groups: [],
    };
  }

  const canCurate = classes.some((row) => teachesThisClass(row, teacherId));
  const names = formClasses.map(className);
  const subtitle = names.length === 1
    ? `${formNoun} · ${names[0]}`
    : names.length > 1
      ? `${formNoun} · ${names.join(', ')}`
      : 'Teaching assistant';

  const teaching: TeacherLoisPrompt[] = [
    {
      title: 'Next period',
      description: 'Subject, class, and room',
      prompt: 'What is my next subject and in which class or room?',
    },
    {
      title: 'Lesson plan',
      description: 'A plan you can copy',
      prompt: 'Draft a lesson plan for my next class.',
    },
  ];

  if (canCurate) {
    teaching.push({
      title: 'Quiz or assessment',
      description: 'Opens the assessment editor',
      prompt: 'Help me build a quiz or assessment for one of my classes. Ask which class and subject if it is not clear, and use the weeks already taught before writing questions.',
    });
  }

  teaching.push({
    title: 'Grade an essay',
    description: 'Feedback you review first',
    prompt: "Help me grade this student's essay and give me feedback.",
  });

  const groups: TeacherLoisGroup[] = [
    { label: 'Teaching', cards: teaching },
  ];

  const nameEach = formClasses.length > 1;
  for (const formClass of formClasses) {
    const name = className(formClass);
    groups.push({
      label: `${formNoun} · ${name}`,
      href: `/dashboard/teacher/classes/${formClass.id}?tab=reports`,
      hrefLabel: 'Open class report',
      cards: reportCards(name, nameEach),
    });
  }

  return {
    subtitle,
    greetingTitle: 'What should we work on?',
    greetingBody: formClasses.length > 0
      ? 'Lesson plans and quizzes stay in this chat. A form briefing uses published grades, and parent notes are drafts until you send them yourself.'
      : 'Ask for the next period, a lesson plan, or an assessment. Nothing is published until you save it.',
    groups,
  };
}

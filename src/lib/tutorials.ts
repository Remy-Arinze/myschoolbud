export type TutorialId =
  | 'session-management'
  | 'class-detail'
  | 'timetables'
  | 'subjects'
  | 'subscription'
  | 'applications'
  | 'staff'
  | 'students';

export interface Tutorial {
  title: string;
  description: string;
  /** YouTube/Vimeo link or a direct video file (e.g. Cloudinary). Leave empty until recorded. */
  url: string;
  duration?: string;
}

export const TUTORIALS: Record<TutorialId, Tutorial> = {
  'session-management': {
    title: 'Managing academic sessions and terms',
    description: 'Start a session, set up terms, and end a term.',
    url: '',
  },
  'class-detail': {
    title: 'Working with a class',
    description: 'Assign teachers, view students and manage a class.',
    url: '',
  },
  timetables: {
    title: 'Building and editing timetables',
    description: 'Generate a timetable and adjust periods.',
    url: '',
  },
  subjects: {
    title: 'Adding and assigning subjects',
    description: 'Add subjects from the library or create your own, then assign teachers.',
    url: '',
  },
  subscription: {
    title: 'Plans, billing and subscriptions',
    description: 'Choose a plan, pay, and manage your subscription.',
    url: '',
  },
  applications: {
    title: 'Reviewing student applications',
    description: 'Review, approve or decline admission applications.',
    url: '',
  },
  staff: {
    title: 'Managing staff',
    description: 'Add staff, set their role and control what they can access.',
    url: '',
  },
  students: {
    title: 'Managing students',
    description: 'Admit students, track account status and find records.',
    url: '',
  },
};

export type TutorialEmbed = { kind: 'iframe' | 'video'; src: string };

export function resolveTutorialEmbed(url: string): TutorialEmbed | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?rel=0` };
    if (host.endsWith('youtube.com')) {
      const id = u.searchParams.get('v') ?? u.pathname.split('/').filter(Boolean).pop();
      return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : null;
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` } : null;
    }
    if (u.protocol === 'https:') return { kind: 'video', src: trimmed };
  } catch {
    return null;
  }
  return null;
}

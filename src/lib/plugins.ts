// Plugin configuration and utilities
// In a real app, this would fetch from the API based on the teacher's school

import { Sparkles, Smartphone, BookOpen } from 'lucide-react';

export interface Plugin {
  id: string;
  name: string;
  slug: string;
  icon: React.ElementType;
  description: string;
  category: string;
}

// Mock data - in production, this would come from an API call
// based on the teacher's current school's subscribed plugins
export const getActivePluginsForTeacher = (): Plugin[] => {
  // TODO: Replace with actual API call
  return [
    {
      id: '2',
      name: 'Myschoolbud AI',
      slug: 'agora-ai',
      icon: Sparkles,
      description: "The Teacher's Assistant",
      category: 'AI & Automation',
    },
  ];
};


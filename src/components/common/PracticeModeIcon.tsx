import React from 'react';
import {
  BookOpen,
  Layers,
  Target,
  History,
  ShieldCheck,
  Landmark,
  Trees,
  Compass,
  MapPin,
  BrainCircuit,
  Calculator,
  Languages,
  PenTool,
  Award,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  FileCheck2,
  GraduationCap,
  Briefcase,
  Building2,
  FlaskConical,
  Atom,
  Globe,
  TrainFront,
  Scale,
  Stethoscope,
  Flame,
  BadgeCheck
} from 'lucide-react';
import { PracticeMode } from '../../types';

interface PracticeModeIconProps {
  mode: PracticeMode | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'gradient' | 'subtle' | 'bare';
  className?: string;
}

export const PracticeModeIcon: React.FC<PracticeModeIconProps> = ({
  mode,
  size = 'md',
  variant = 'gradient',
  className = ''
}) => {
  const getIconElement = () => {
    switch (mode) {
      case 'topic_wise':
        return <BookOpen className={getIconSizeClass(size)} />;
      case 'subject_wise':
        return <Layers className={getIconSizeClass(size)} />;
      case 'full_mock':
        return <Target className={getIconSizeClass(size)} />;
      case 'pyq':
        return <History className={getIconSizeClass(size)} />;
      default:
        return <Award className={getIconSizeClass(size)} />;
    }
  };

  const getIconSizeClass = (s: string) => {
    switch (s) {
      case 'xs':
        return 'w-3 h-3 stroke-[2.4]';
      case 'sm':
        return 'w-3.5 h-3.5 stroke-[2.2]';
      case 'md':
        return 'w-5 h-5 stroke-[2.2]';
      case 'lg':
        return 'w-6 h-6 stroke-[2.2]';
      case 'xl':
        return 'w-7 h-7 stroke-[2.2]';
      default:
        return 'w-5 h-5 stroke-[2.2]';
    }
  };

  const getContainerSizeClass = (s: string) => {
    switch (s) {
      case 'xs':
        return 'w-5 h-5 rounded-md';
      case 'sm':
        return 'w-7 h-7 rounded-lg';
      case 'md':
        return 'w-10 h-10 rounded-xl';
      case 'lg':
        return 'w-12 h-12 rounded-2xl';
      case 'xl':
        return 'w-14 h-14 rounded-2xl';
      default:
        return 'w-10 h-10 rounded-xl';
    }
  };

  if (variant === 'bare') {
    return <span className={`inline-flex items-center justify-center ${className}`}>{getIconElement()}</span>;
  }

  // Variant configs
  const getVariantStyles = () => {
    if (variant === 'gradient') {
      switch (mode) {
        case 'topic_wise':
          return 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/25 ring-1 ring-white/20';
        case 'subject_wise':
          return 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20';
        case 'full_mock':
          return 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/25 ring-1 ring-white/20';
        case 'pyq':
          return 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 text-white shadow-md shadow-amber-500/25 ring-1 ring-white/20';
        default:
          return 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md shadow-slate-500/25 ring-1 ring-white/20';
      }
    } else {
      // subtle
      switch (mode) {
        case 'topic_wise':
          return 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
        case 'subject_wise':
          return 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
        case 'full_mock':
          return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
        case 'pyq':
          return 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
        default:
          return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
      }
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 transition-transform duration-200 ${getContainerSizeClass(
        size
      )} ${getVariantStyles()} ${className}`}
    >
      {getIconElement()}
    </div>
  );
};

export const CategoryBadgeIcon: React.FC<{ category?: string; className?: string }> = ({
  category = '',
  className = 'w-3.5 h-3.5'
}) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('police') || cat.includes('defence') || cat.includes('constable') || cat.includes('sub inspector') || cat.includes('si')) {
    return <ShieldCheck className={className} />;
  }
  if (cat.includes('revenue') || cat.includes('patwari') || cat.includes('kanungo')) {
    return <Landmark className={className} />;
  }
  if (cat.includes('forest') || cat.includes('environment') || cat.includes('wildlife')) {
    return <Trees className={className} />;
  }
  if (cat.includes('ssc') || cat.includes('cgl') || cat.includes('chsl') || cat.includes('mts') || cat.includes('clerk')) {
    return <Building2 className={className} />;
  }
  if (cat.includes('bank') || cat.includes('ibps') || cat.includes('sbi') || cat.includes('po')) {
    return <Briefcase className={className} />;
  }
  if (cat.includes('teach') || cat.includes('tet') || cat.includes('tgt') || cat.includes('pgt') || cat.includes('jbt')) {
    return <GraduationCap className={className} />;
  }
  if (cat.includes('railway') || cat.includes('rrb') || cat.includes('ntpc')) {
    return <TrainFront className={className} />;
  }
  if (cat.includes('court') || cat.includes('judiciary') || cat.includes('law')) {
    return <Scale className={className} />;
  }
  if (cat.includes('medical') || cat.includes('health') || cat.includes('nursing')) {
    return <Stethoscope className={className} />;
  }
  if (cat.includes('science') || cat.includes('technical')) {
    return <FlaskConical className={className} />;
  }
  if (cat.includes('gk') || cat.includes('himachal') || cat.includes('state') || cat.includes('static')) {
    return <MapPin className={className} />;
  }
  if (cat.includes('subject') || cat.includes('section')) {
    return <Layers className={className} />;
  }
  if (cat.includes('full length') || cat.includes('grand')) {
    return <Target className={className} />;
  }
  if (cat.includes('pyq') || cat.includes('previous')) {
    return <History className={className} />;
  }
  return <BadgeCheck className={className} />;
};

export const SubjectBadgeIcon: React.FC<{ subject?: string; className?: string }> = ({
  subject = '',
  className = 'w-3.5 h-3.5'
}) => {
  const sub = (subject || '').toLowerCase();
  if (sub.includes('reasoning') || sub.includes('logic') || sub.includes('mental')) {
    return <BrainCircuit className={className} />;
  }
  if (sub.includes('math') || sub.includes('aptitude') || sub.includes('arithmetic') || sub.includes('quant')) {
    return <Calculator className={className} />;
  }
  if (sub.includes('science') || sub.includes('physics') || sub.includes('chemistry') || sub.includes('biology')) {
    return <FlaskConical className={className} />;
  }
  if (sub.includes('english')) {
    return <Languages className={className} />;
  }
  if (sub.includes('hindi')) {
    return <PenTool className={className} />;
  }
  if (sub.includes('gk') || sub.includes('awareness') || sub.includes('geography') || sub.includes('polity') || sub.includes('history')) {
    return <Compass className={className} />;
  }
  if (sub.includes('current') || sub.includes('affair')) {
    return <Globe className={className} />;
  }
  return <BookOpen className={className} />;
};


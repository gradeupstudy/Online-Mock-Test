import React from 'react';
import { 
  Shield, 
  Landmark, 
  Train, 
  Award, 
  Compass, 
  GraduationCap, 
  Briefcase, 
  BookOpen, 
  Target, 
  FileText,
  Flame,
  Zap,
  Sparkles,
  Layers,
  LucideIcon
} from 'lucide-react';

interface TargetExamIconProps {
  icon?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Landmark,
  Train,
  Award,
  Compass,
  GraduationCap,
  Briefcase,
  BookOpen,
  Target,
  FileText,
  Flame,
  Zap,
  Sparkles,
  Layers
};

export const TargetExamIcon: React.FC<TargetExamIconProps> = ({ 
  icon = 'Target', 
  className = '',
  size = 'md'
}) => {
  const IconComponent = (icon && ICON_MAP[icon]) ? ICON_MAP[icon] : Target;

  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  }[size] || 'w-5 h-5';

  return <IconComponent className={`${sizeClasses} ${className}`} />;
};

import { ThumbsUp, Award, Heart, Smile, Lightbulb } from 'lucide-react';

export const REACTIONS = [
  { type: 'like', icon: ThumbsUp, label: 'Like', color: '#0a66c2' },
  { type: 'celebrate', icon: Award, label: 'Celebrate', color: '#6dae4f' },
  { type: 'support', icon: Heart, label: 'Support', color: '#df704d' },
  { type: 'love', icon: Smile, label: 'Love', color: '#c37cbb' },
  { type: 'insightful', icon: Lightbulb, label: 'Insightful', color: '#f09849' }
];

export const getInitials = (name) => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
};

export const renderHashtags = (content) => {
  const parts = content.split(/(#\w+)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('#')) {
      return <span key={idx} className="hashtag">{part}</span>;
    }
    return part;
  });
};

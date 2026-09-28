export const UniversityConfig = {
  name: process.env.UNIVERSITY_NAME || 'CHARUSAT',
  fullName: process.env.UNIVERSITY_FULL_NAME || 'Charotar University of Science and Technology',
  emailDomain: process.env.UNIVERSITY_EMAIL_DOMAIN || 'charusat.edu.in',
  portalTitle: process.env.UNIVERSITY_PORTAL_TITLE || 'CLIAS — Learning Intelligence & Assessment Platform',
  tagline: 'Student Learning Intelligence, Adaptive Practice & Assessment System',
  supportEmail: 'support@charusat.edu.in',
};

export const MasteryWeights = {
  EASY: 1.0,
  MEDIUM: 1.25,
  HARD: 1.5,
};

export const EwmaAlpha = 0.25; // EWMA decay factor for mastery calculation

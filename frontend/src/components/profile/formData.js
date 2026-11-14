/** Answer lists for the profile form. Every dropdown also lets people type their own answer ("Other"). */

export const CREATED_BY = ['Self', 'Parents', 'Brother', 'Sister', 'Relative', 'Friend'];
export const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'Don’t know'];
export const MOTHER_TONGUES = ['Marathi', 'Hindi', 'Gujarati', 'Konkani', 'Kannada', 'Telugu', 'English'];
export const LANGUAGES = ['Marathi', 'Hindi', 'English', 'Gujarati', 'Konkani', 'Kannada', 'Telugu', 'Urdu'];

export const RELIGIONS = ['Hindu', 'Buddhist', 'Jain', 'Sikh', 'Christian', 'Muslim'];
export const COMMUNITIES = ['Vanjari'];

export const STATES = ['Maharashtra', 'Gujarat', 'Karnataka', 'Goa', 'Madhya Pradesh', 'Rajasthan', 'Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Uttar Pradesh', 'Delhi', 'Other (India)', 'Outside India'];
export const DISTRICTS = [
  'Ahilyanagar (Ahmednagar)', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Chhatrapati Sambhajinagar (Aurangabad)', 'Dharashiv (Osmanabad)', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
];

export const BODY_TYPES = ['Slim', 'Average', 'Athletic', 'Heavy'];
export const FIT = 'Fully fit';
export const PHYSICAL_STATUS = [FIT, 'Differently abled', 'Had a health issue in the past (now fine)'];

export const QUALIFICATIONS = [
  'SSC (10th)',
  'HSC (12th)',
  'ITI / Diploma',
  'Graduate (B.A. / B.Com. / B.Sc. / BBA)',
  'Engineering (B.E. / B.Tech)',
  'Medical (MBBS / BAMS / BHMS / BDS / Nursing)',
  'Post-graduate (M.A. / M.Com. / M.Sc. / MBA)',
  'Doctorate (PhD)',
];

export const EMPLOYMENT_TYPES = ['Private job', 'Government job', 'Own business', 'Job + own business', 'Self-employed / Freelance', 'Farming / Agriculture', 'Student', 'Not working'];
/** What to ask for each employment type — so nobody answers questions that do not apply to them. */
export const employmentGroups = (type) => {
  const t = (type || '').toLowerCase();
  if (!t) return { job: false, business: false };
  if (/student|not working/.test(t)) return { job: false, business: false };
  const job = /job/.test(t);
  const business = /business|self|freelance|farm/.test(t);
  if (!job && !business) return { job: true, business: false }; // a typed answer: ask the common questions
  return { job, business };
};
export const OCCUPATIONS = [
  'Software engineer', 'Engineer', 'Doctor', 'Nurse', 'Teacher / Professor', 'Government employee', 'Police / Army', 'Accountant / CA', 'Bank employee', 'Business owner', 'Shopkeeper', 'Farmer', 'Contractor / Construction', 'Driver / Transport', 'Lawyer', 'Designer / Artist', 'Student', 'Homemaker',
];
export const INCOMES = ['Below ₹3 L', '₹3–6 L', '₹6–10 L', '₹10–20 L', '₹20–35 L', '₹35 L+'];
export const BUSINESS_TYPES = ['Shop / Retail', 'Trading', 'Manufacturing', 'Dairy / Poultry', 'Farming', 'Construction', 'Transport', 'Hotel / Food', 'Services', 'IT / Online'];

export const PARENT_OCCUPATIONS = ['Farmer', 'Business', 'Government service', 'Private service', 'Teacher', 'Retired', 'Homemaker', 'Passed away'];
export const FAMILY_VALUES = ['Traditional', 'Moderate', 'Liberal'];

export const DIETS = ['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Vegan', 'Jain'];
export const HABITS = ['Never', 'Occasionally', 'Regularly'];
export const HOBBIES = ['Reading', 'Cooking', 'Travelling', 'Music', 'Dancing', 'Cricket', 'Gardening', 'Photography', 'Yoga / Fitness', 'Movies', 'Farming', 'Social service'];
export const INTERESTS = ['Spirituality', 'Technology', 'Business', 'Politics', 'Fashion', 'Sports', 'Art & crafts', 'Nature', 'Education', 'Community work'];

/** 4'0" … 7'0" as { cm, label } for the height dropdown */
export const HEIGHTS = Array.from({ length: 37 }, (_, i) => {
  const inches = 48 + i;
  return { cm: Math.round(inches * 2.54), label: `${Math.floor(inches / 12)} ft ${inches % 12} in (${Math.round(inches * 2.54)} cm)` };
});

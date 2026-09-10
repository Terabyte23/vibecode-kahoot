// src/mockData.js
export const INITIAL_QUIZZES = [
  {
    id: 'quiz_1',
    title: 'Eesti Geograafia Kutsung',
    questions: [
      {
        id: 'q1',
        text: 'Mis on Eesti pealinn?',
        timeLimit: 15,
        options: ['Tartu', 'Tallinn', 'Pärnu', 'Narva'],
        correctIndex: 1
      },
      {
        id: 'q2',
        text: 'Milline on Eesti suurim saar?',
        timeLimit: 15,
        options: ['Hiiumaa', 'Muhu', 'Saaremaa', 'Vormsi'],
        correctIndex: 2
      }
    ]
  }
];
// One place that decides the progress shown on the dashboard, token and vote pages.
export const buildSteps = ({ tokenIssued, hasVoted }) => [
  { label: 'Signed in', status: 'done' },
  { label: 'Voting token', status: tokenIssued || hasVoted ? 'done' : 'current' },
  { label: 'Cast vote', status: hasVoted ? 'done' : tokenIssued ? 'current' : 'todo' },
  { label: 'Receipt', status: hasVoted ? 'done' : 'todo' },
  { label: 'Verify', status: hasVoted ? 'current' : 'todo' },
];
